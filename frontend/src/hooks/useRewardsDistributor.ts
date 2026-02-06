/**
 * useRewardsDistributor - React hook for Merkle proof rewards distribution
 * 
 * This hook provides functions for claiming rewards using Merkle proofs,
 * typically used for airdrops and periodic reward distributions.
 * Uses @stacks/connect for transaction signing and @stacks/transactions for building calls.
 * 
 * Contract: SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT.rewards-distributor-v1
 */

'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useWallet } from '@/lib/wallet-context';
import {
  callReadOnlyFunction,
  cvToValue,
  uintCV,
  principalCV,
  bufferCV,
  listCV,
  PostConditionMode,
  makeStandardSTXPostCondition,
  makeStandardFungiblePostCondition,
  FungibleConditionCode,
  createAssetInfo,
} from '@stacks/transactions';
import { openContractCall } from '@stacks/connect';
import { getNetwork } from '@/lib/contracts';
import { CONTRACTS, parseContractId, MICRO_STX } from '@/lib/constants';

// ============================================================================
// Types
// ============================================================================

export interface Distribution {
  id: number;
  merkleRoot: string;
  totalAmount: bigint;
  claimedAmount: bigint;
  startBlock: number;
  endBlock: number;
  tokenType: 'stx' | 'ft';
  tokenContract?: string;
  isActive: boolean;
}

export interface ClaimInfo {
  distributionId: number;
  amount: bigint;
  proof: string[];
  claimed: boolean;
  claimedAt?: number;
  txId?: string;
}

export interface UserClaims {
  totalClaimed: bigint;
  totalPending: bigint;
  claims: ClaimInfo[];
}

export interface UseRewardsDistributorReturn {
  // State
  isLoading: boolean;
  isClaiming: boolean;
  error: string | null;
  
  // Data
  distributions: Distribution[];
  activeDistributions: Distribution[];
  userClaims: UserClaims | null;
  
  // Actions
  claimReward: (distributionId: number, amount: bigint, proof: string[]) => Promise<string | null>;
  refresh: () => Promise<void>;
  
  // Queries
  checkEligibility: (distributionId: number, proof: string[]) => Promise<boolean>;
  getDistribution: (distributionId: number) => Promise<Distribution | null>;
  
  // Computed
  hasPendingClaims: boolean;
  totalPendingAmount: bigint;
}

// ============================================================================
// Constants - Using Mainnet Contract Address
// ============================================================================

const { address: CONTRACT_ADDRESS, name: CONTRACT_NAME } = parseContractId(CONTRACTS.rewardsDistributor);
const REWARDS_DISTRIBUTOR_CONTRACT = CONTRACTS.rewardsDistributor; // SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT.rewards-distributor-v1

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert hex string to buffer for Merkle proof
 */
function hexToBuffer(hex: string): Uint8Array {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleanHex.substr(i * 2, 2), 16);
  }
  return bytes;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useRewardsDistributor(): UseRewardsDistributorReturn {
  const { stxAddress, isConnected } = useWallet();
  const [distributions, setDistributions] = useState<Distribution[]>([]);
  const [userClaims, setUserClaims] = useState<UserClaims | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const network = useMemo(() => getNetwork(), []);

  // Filter active distributions
  const activeDistributions = useMemo(() => {
    return distributions.filter(d => d.isActive);
  }, [distributions]);

  // Computed values
  const hasPendingClaims = useMemo(() => {
    return userClaims !== null && userClaims.totalPending > BigInt(0);
  }, [userClaims]);

  const totalPendingAmount = useMemo(() => {
    return userClaims?.totalPending || BigInt(0);
  }, [userClaims]);

  // ============================================================================
  // Read Functions
  // ============================================================================

  const fetchDistribution = useCallback(async (distributionId: number): Promise<Distribution | null> => {
    try {
      const result = await callReadOnlyFunction({
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: 'get-distribution',
        functionArgs: [uintCV(distributionId)],
        network,
        senderAddress: CONTRACT_ADDRESS,
      });

      const data = cvToValue(result);
      if (!data) return null;

      return {
        id: distributionId,
        merkleRoot: data['merkle-root'],
        totalAmount: BigInt(data['total-amount']?.value || 0),
        claimedAmount: BigInt(data['claimed-amount']?.value || 0),
        startBlock: data['start-block']?.value || 0,
        endBlock: data['end-block']?.value || 0,
        tokenType: data['token-type'] === 'stx' ? 'stx' : 'ft',
        tokenContract: data['token-contract'] || undefined,
        isActive: data['is-active'] || false,
      };
    } catch (err) {
      console.error('Failed to fetch distribution:', err);
      return null;
    }
  }, [network]);

  const fetchDistributionCount = useCallback(async (): Promise<number> => {
    try {
      const result = await callReadOnlyFunction({
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: 'get-distribution-count',
        functionArgs: [],
        network,
        senderAddress: CONTRACT_ADDRESS,
      });

      const data = cvToValue(result);
      return data?.value || 0;
    } catch (err) {
      console.error('Failed to fetch distribution count:', err);
      return 0;
    }
  }, [network]);

  const checkHasClaimed = useCallback(async (
    distributionId: number,
    user: string
  ): Promise<boolean> => {
    try {
      const result = await callReadOnlyFunction({
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: 'has-claimed',
        functionArgs: [uintCV(distributionId), principalCV(user)],
        network,
        senderAddress: CONTRACT_ADDRESS,
      });

      return cvToValue(result) === true;
    } catch (err) {
      console.error('Failed to check claim status:', err);
      return false;
    }
  }, [network]);

  /**
   * Check if user is eligible to claim from a distribution
   */
  const checkEligibility = useCallback(async (
    distributionId: number,
    proof: string[]
  ): Promise<boolean> => {
    if (!stxAddress) return false;

    try {
      // First check if already claimed
      const hasClaimed = await checkHasClaimed(distributionId, stxAddress);
      if (hasClaimed) return false;

      // Check distribution is active
      const distribution = await fetchDistribution(distributionId);
      if (!distribution?.isActive) return false;

      // Verify proof would be done in the claim transaction
      return true;
    } catch (err) {
      console.error('Failed to check eligibility:', err);
      return false;
    }
  }, [stxAddress, checkHasClaimed, fetchDistribution]);

  // ============================================================================
  // Refresh Data
  // ============================================================================

  const refresh = useCallback(async () => {
    if (!isConnected) return;

    setIsLoading(true);
    setError(null);

    try {
      // Fetch distribution count
      const count = await fetchDistributionCount();
      
      // Fetch all distributions
      const fetchedDistributions: Distribution[] = [];
      for (let i = 1; i <= count; i++) {
        const distribution = await fetchDistribution(i);
        if (distribution) {
          fetchedDistributions.push(distribution);
        }
      }
      
      setDistributions(fetchedDistributions);

      // If user is connected, check their claims
      if (stxAddress) {
        const claims: ClaimInfo[] = [];
        let totalClaimed = BigInt(0);
        let totalPending = BigInt(0);

        for (const dist of fetchedDistributions) {
          const hasClaimed = await checkHasClaimed(dist.id, stxAddress);
          if (hasClaimed) {
            totalClaimed += dist.totalAmount; // This is an approximation
          }
        }

        setUserClaims({
          totalClaimed,
          totalPending,
          claims,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch distributions');
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, stxAddress, fetchDistributionCount, fetchDistribution, checkHasClaimed]);

  // ============================================================================
  // Write Functions
  // ============================================================================

  /**
   * Claim reward from a distribution using Merkle proof
   */
  const claimReward = useCallback(async (
    distributionId: number,
    amount: bigint,
    proof: string[]
  ): Promise<string | null> => {
    if (!isConnected || !stxAddress) {
      setError('Wallet not connected');
      return null;
    }

    setIsClaiming(true);
    setError(null);

    // Convert proof strings to buffer CVs
    const proofBuffers = proof.map(p => bufferCV(hexToBuffer(p)));

    // Create post conditions based on distribution type
    const distribution = await fetchDistribution(distributionId);
    const postConditions = distribution?.tokenType === 'stx' ? [
      makeStandardSTXPostCondition(
        CONTRACT_ADDRESS,
        FungibleConditionCode.GreaterEqual,
        amount
      ),
    ] : [];

    return new Promise((resolve) => {
      openContractCall({
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: 'claim',
        functionArgs: [
          uintCV(distributionId),
          uintCV(Number(amount)),
          listCV(proofBuffers),
        ],
        postConditionMode: PostConditionMode.Deny,
        postConditions,
        onFinish: (data) => {
          setIsClaiming(false);
          refresh();
          resolve(data.txId);
        },
        onCancel: () => {
          setIsClaiming(false);
          setError('Transaction cancelled');
          resolve(null);
        },
      });
    });
  }, [isConnected, stxAddress, fetchDistribution, refresh]);

  // ============================================================================
  // Effects
  // ============================================================================

  // Load data on mount if connected
  useEffect(() => {
    if (isConnected) {
      refresh();
    }
  }, [isConnected, refresh]);

  // ============================================================================
  // Return
  // ============================================================================

  return {
    isLoading,
    isClaiming,
    error,
    distributions,
    activeDistributions,
    userClaims,
    claimReward,
    refresh,
    checkEligibility,
    getDistribution: fetchDistribution,
    hasPendingClaims,
    totalPendingAmount,
  };
}

export default useRewardsDistributor;
