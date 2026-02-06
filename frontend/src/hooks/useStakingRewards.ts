/**
 * useStakingRewards - React hook for staking rewards distribution contract
 * 
 * This hook provides functions for claiming staking rewards, viewing pending
 * rewards, and interacting with the staking rewards distribution system.
 * Uses @stacks/connect for transaction signing and @stacks/transactions for building calls.
 * 
 * Contract: SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT.staking-rewards-v2
 * Note: This contract references timelock-token-v11-1 for TLX token operations
 */

'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useWallet } from '@/lib/wallet-context';
import {
  callReadOnlyFunction,
  cvToValue,
  uintCV,
  principalCV,
  PostConditionMode,
  makeStandardFungiblePostCondition,
  FungibleConditionCode,
  createAssetInfo,
} from '@stacks/transactions';
import { openContractCall } from '@stacks/connect';
import { getNetwork } from '@/lib/contracts';
import { CONTRACTS, parseContractId, MICRO_STX, BLOCKS_PER_YEAR, DEPLOYER_ADDRESS } from '@/lib/constants';

// ============================================================================
// Types
// ============================================================================

export interface RewardsPosition {
  stakedAmount: bigint;
  rewardsEarned: bigint;
  lastClaimBlock: number;
  stakingStartBlock: number;
  lockMultiplier: number;
}

export interface RewardsPool {
  totalStaked: bigint;
  rewardsPerBlock: bigint;
  totalDistributed: bigint;
  lastUpdateBlock: number;
  accRewardsPerShare: bigint;
}

export interface PendingRewards {
  amount: bigint;
  estimatedUsd: number;
  blocksUntilNextReward: number;
  apr: number;
}

export interface ClaimHistory {
  txId: string;
  amount: bigint;
  blockHeight: number;
  timestamp: Date;
}

export interface UseStakingRewardsReturn {
  // State
  isLoading: boolean;
  isClaiming: boolean;
  error: string | null;
  
  // Data
  position: RewardsPosition | null;
  pool: RewardsPool | null;
  pendingRewards: PendingRewards | null;
  claimHistory: ClaimHistory[];
  currentApr: number;
  
  // Actions
  claimRewards: () => Promise<string | null>;
  compoundRewards: () => Promise<string | null>;
  refresh: () => Promise<void>;
  
  // Computed
  canClaim: boolean;
  hasPosition: boolean;
  formattedPending: string;
}

// ============================================================================
// Constants - Using Mainnet Contract Addresses
// ============================================================================

/**
 * Staking Rewards contract deployed on mainnet (v2 due to retry after fix)
 * This contract references timelock-token-v11-1 for TLX token operations
 */
const { address: CONTRACT_ADDRESS, name: CONTRACT_NAME } = parseContractId(CONTRACTS.stakingRewards);
const STAKING_REWARDS_CONTRACT = CONTRACTS.stakingRewards; // SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT.staking-rewards-v2

// Token contract for post conditions
const { address: TOKEN_ADDRESS, name: TOKEN_NAME } = parseContractId(CONTRACTS.timelockToken);
const TLX_TOKEN = CONTRACTS.timelockToken; // SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT.timelock-token-v11-1

// Minimum rewards to claim (1 TLX)
const MIN_CLAIM_AMOUNT = BigInt(1_000_000);

// ============================================================================
// Hook Implementation
// ============================================================================

export function useStakingRewards(): UseStakingRewardsReturn {
  const { stxAddress, isConnected } = useWallet();
  const [position, setPosition] = useState<RewardsPosition | null>(null);
  const [pool, setPool] = useState<RewardsPool | null>(null);
  const [pendingRewards, setPendingRewards] = useState<PendingRewards | null>(null);
  const [claimHistory, setClaimHistory] = useState<ClaimHistory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const network = useMemo(() => getNetwork(), []);

  // Computed values
  const hasPosition = useMemo(() => {
    return position !== null && position.stakedAmount > BigInt(0);
  }, [position]);

  const canClaim = useMemo(() => {
    return hasPosition && pendingRewards !== null && pendingRewards.amount >= MIN_CLAIM_AMOUNT;
  }, [hasPosition, pendingRewards]);

  const currentApr = useMemo(() => {
    if (!pool || pool.totalStaked === BigInt(0)) return 0;
    const yearlyRewards = pool.rewardsPerBlock * BigInt(BLOCKS_PER_YEAR);
    return Number((yearlyRewards * BigInt(10000)) / pool.totalStaked) / 100;
  }, [pool]);

  const formattedPending = useMemo(() => {
    if (!pendingRewards) return '0';
    return (Number(pendingRewards.amount) / MICRO_STX).toFixed(6);
  }, [pendingRewards]);

  // ============================================================================
  // Read Functions
  // ============================================================================

  const fetchPosition = useCallback(async (user: string): Promise<RewardsPosition | null> => {
    try {
      const result = await callReadOnlyFunction({
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: 'get-staker-info',
        functionArgs: [principalCV(user)],
        network,
        senderAddress: CONTRACT_ADDRESS,
      });

      const data = cvToValue(result);
      if (!data) return null;

      return {
        stakedAmount: BigInt(data['staked-amount']?.value || 0),
        rewardsEarned: BigInt(data['rewards-earned']?.value || 0),
        lastClaimBlock: data['last-claim-block']?.value || 0,
        stakingStartBlock: data['staking-start-block']?.value || 0,
        lockMultiplier: data['lock-multiplier']?.value || 100,
      };
    } catch (err) {
      console.error('Failed to fetch rewards position:', err);
      return null;
    }
  }, [network]);

  const fetchPool = useCallback(async (): Promise<RewardsPool | null> => {
    try {
      const result = await callReadOnlyFunction({
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: 'get-pool-info',
        functionArgs: [],
        network,
        senderAddress: CONTRACT_ADDRESS,
      });

      const data = cvToValue(result);
      if (!data) return null;

      return {
        totalStaked: BigInt(data['total-staked']?.value || 0),
        rewardsPerBlock: BigInt(data['rewards-per-block']?.value || 0),
        totalDistributed: BigInt(data['total-distributed']?.value || 0),
        lastUpdateBlock: data['last-update-block']?.value || 0,
        accRewardsPerShare: BigInt(data['acc-rewards-per-share']?.value || 0),
      };
    } catch (err) {
      console.error('Failed to fetch pool info:', err);
      return null;
    }
  }, [network]);

  const fetchPendingRewards = useCallback(async (user: string): Promise<PendingRewards | null> => {
    try {
      const result = await callReadOnlyFunction({
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: 'get-pending-rewards',
        functionArgs: [principalCV(user)],
        network,
        senderAddress: CONTRACT_ADDRESS,
      });

      const data = cvToValue(result);
      const amount = BigInt(data?.value || 0);

      return {
        amount,
        estimatedUsd: 0, // Would need price oracle integration
        blocksUntilNextReward: 1,
        apr: currentApr,
      };
    } catch (err) {
      console.error('Failed to fetch pending rewards:', err);
      return null;
    }
  }, [network, currentApr]);

  // ============================================================================
  // Refresh Data
  // ============================================================================

  const refresh = useCallback(async () => {
    if (!isConnected || !stxAddress) return;

    setIsLoading(true);
    setError(null);

    try {
      const [positionData, poolData, pendingData] = await Promise.all([
        fetchPosition(stxAddress),
        fetchPool(),
        fetchPendingRewards(stxAddress),
      ]);

      setPosition(positionData);
      setPool(poolData);
      setPendingRewards(pendingData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch rewards data');
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, stxAddress, fetchPosition, fetchPool, fetchPendingRewards]);

  // ============================================================================
  // Write Functions
  // ============================================================================

  /**
   * Claim pending staking rewards
   */
  const claimRewards = useCallback(async (): Promise<string | null> => {
    if (!isConnected || !stxAddress) {
      setError('Wallet not connected');
      return null;
    }

    if (!canClaim) {
      setError('No rewards available to claim');
      return null;
    }

    setIsClaiming(true);
    setError(null);

    // Create post conditions to ensure user receives rewards
    const postConditions = pendingRewards ? [
      makeStandardFungiblePostCondition(
        CONTRACT_ADDRESS,
        FungibleConditionCode.GreaterEqual,
        pendingRewards.amount,
        createAssetInfo(TOKEN_ADDRESS, TOKEN_NAME, 'timelock-token')
      ),
    ] : [];

    return new Promise((resolve) => {
      openContractCall({
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: 'claim-rewards',
        functionArgs: [],
        postConditionMode: PostConditionMode.Deny,
        postConditions,
        onFinish: (data) => {
          setIsClaiming(false);
          // Add to claim history
          setClaimHistory(prev => [{
            txId: data.txId,
            amount: pendingRewards?.amount || BigInt(0),
            blockHeight: 0, // Will be updated after confirmation
            timestamp: new Date(),
          }, ...prev]);
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
  }, [isConnected, stxAddress, canClaim, pendingRewards, refresh]);

  /**
   * Compound rewards back into staking
   */
  const compoundRewards = useCallback(async (): Promise<string | null> => {
    if (!isConnected || !stxAddress) {
      setError('Wallet not connected');
      return null;
    }

    if (!canClaim) {
      setError('No rewards available to compound');
      return null;
    }

    setIsClaiming(true);
    setError(null);

    return new Promise((resolve) => {
      openContractCall({
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: 'compound-rewards',
        functionArgs: [],
        postConditionMode: PostConditionMode.Deny,
        postConditions: [],
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
  }, [isConnected, stxAddress, canClaim, refresh]);

  // ============================================================================
  // Effects
  // ============================================================================

  // Load data on mount if connected
  useEffect(() => {
    if (isConnected && stxAddress) {
      refresh();
    }
  }, [isConnected, stxAddress, refresh]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!isConnected) return;

    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [isConnected, refresh]);

  // ============================================================================
  // Return
  // ============================================================================

  return {
    isLoading,
    isClaiming,
    error,
    position,
    pool,
    pendingRewards,
    claimHistory,
    currentApr,
    claimRewards,
    compoundRewards,
    refresh,
    canClaim,
    hasPosition,
    formattedPending,
  };
}

export default useStakingRewards;
