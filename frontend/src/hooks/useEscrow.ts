/**
 * useEscrow - React hook for escrow contract interactions
 * Manages P2P trades with milestone releases and dispute resolution
 */

'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useWallet } from '@/lib/wallet-context';
import { callReadOnlyFunction, cvToValue, uintCV, principalCV, stringAsciiCV, PostConditionMode, makeStandardSTXPostCondition, FungibleConditionCode } from '@stacks/transactions';
import { openContractCall } from '@stacks/connect';
import { getNetwork } from '@/lib/contracts';
import { CONTRACTS, parseContractId } from '@/lib/constants';

// ============================================================================
// Types
// ============================================================================

export interface Escrow {
  id: number;
  buyer: string;
  seller: string;
  amount: number;
  fee: number;
  state: EscrowState;
  createdAt: number;
  deadline: number;
  description: string;
  milestoneCount: number;
  milestonesReleased: number;
}

export type EscrowState = 'pending' | 'funded' | 'released' | 'refunded' | 'disputed' | 'resolved';

export interface Milestone {
  escrowId: number;
  milestoneId: number;
  amount: number;
  description: string;
  isReleased: boolean;
  releasedAt: number;
}

export interface Dispute {
  id: number;
  escrowId: number;
  initiatedBy: string;
  reason: string;
  createdAt: number;
  resolved: boolean;
  resolution: string;
  buyerRefund: number;
  sellerPayment: number;
}

export interface UserStats {
  escrowsCreated: number;
  escrowsCompleted: number;
  totalVolume: number;
  disputesInitiated: number;
  disputesWon: number;
}

export interface UseEscrowReturn {
  escrows: Escrow[];
  selectedEscrow: Escrow | null;
  milestones: Milestone[];
  userStats: UserStats;
  platformStats: { totalEscrows: number; totalVolume: number; totalDisputes: number };
  isLoading: boolean;
  error: string | null;
  
  // Actions
  createEscrow: (seller: string, amount: number, deadline: number, description: string) => Promise<string | null>;
  fundEscrow: (escrowId: number) => Promise<string | null>;
  releaseFunds: (escrowId: number) => Promise<string | null>;
  refundBuyer: (escrowId: number) => Promise<string | null>;
  releaseMilestone: (escrowId: number, milestoneId: number) => Promise<string | null>;
  initiateDispute: (escrowId: number, reason: string) => Promise<string | null>;
  
  // Queries
  selectEscrow: (escrowId: number) => void;
  refreshEscrows: () => Promise<void>;
}

// ============================================================================
// State Mapping
// ============================================================================

const STATE_MAP: Record<number, EscrowState> = {
  0: 'pending',
  1: 'funded',
  2: 'released',
  3: 'refunded',
  4: 'disputed',
  5: 'resolved',
};

const MICRO_STX = 1_000_000;

// ============================================================================
// Hook Implementation
// ============================================================================

export function useEscrow(): UseEscrowReturn {
  const { stxAddress, isConnected } = useWallet();
  const [escrows, setEscrows] = useState<Escrow[]>([]);
  const [selectedEscrow, setSelectedEscrow] = useState<Escrow | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [userStats, setUserStats] = useState<UserStats>({
    escrowsCreated: 0, escrowsCompleted: 0, totalVolume: 0, disputesInitiated: 0, disputesWon: 0
  });
  const [platformStats, setPlatformStats] = useState({ totalEscrows: 0, totalVolume: 0, totalDisputes: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const network = useMemo(() => getNetwork(), []);
  const { address: contractAddress } = parseContractId(CONTRACTS.timelockExchange);
  const contractName = 'escrow';

  // ============================================================================
  // Read Functions
  // ============================================================================

  const fetchEscrow = useCallback(async (escrowId: number): Promise<Escrow | null> => {
    try {
      const result = await callReadOnlyFunction({
        contractAddress, contractName, functionName: 'get-escrow',
        functionArgs: [uintCV(escrowId)], network, senderAddress: contractAddress,
      });
      const data = cvToValue(result);
      if (!data) return null;
      return {
        id: escrowId,
        buyer: data.buyer,
        seller: data.seller,
        amount: data.amount.value / MICRO_STX,
        fee: data.fee.value / MICRO_STX,
        state: STATE_MAP[data.state.value] || 'pending',
        createdAt: data['created-at'].value,
        deadline: data.deadline.value,
        description: data.description,
        milestoneCount: data['milestone-count'].value,
        milestonesReleased: data['milestones-released'].value,
      };
    } catch { return null; }
  }, [contractAddress, contractName, network]);

  const fetchUserStats = useCallback(async (user: string): Promise<UserStats> => {
    try {
      const result = await callReadOnlyFunction({
        contractAddress, contractName, functionName: 'get-user-stats',
        functionArgs: [principalCV(user)], network, senderAddress: contractAddress,
      });
      const data = cvToValue(result);
      return {
        escrowsCreated: data['escrows-created'].value,
        escrowsCompleted: data['escrows-completed'].value,
        totalVolume: data['total-volume'].value / MICRO_STX,
        disputesInitiated: data['disputes-initiated'].value,
        disputesWon: data['disputes-won'].value,
      };
    } catch {
      return { escrowsCreated: 0, escrowsCompleted: 0, totalVolume: 0, disputesInitiated: 0, disputesWon: 0 };
    }
  }, [contractAddress, contractName, network]);

  const fetchPlatformStats = useCallback(async () => {
    try {
      const result = await callReadOnlyFunction({
        contractAddress, contractName, functionName: 'get-platform-stats',
        functionArgs: [], network, senderAddress: contractAddress,
      });
      const data = cvToValue(result);
      setPlatformStats({
        totalEscrows: data['total-escrows'].value,
        totalVolume: data['total-volume'].value / MICRO_STX,
        totalDisputes: data['total-disputes'].value,
      });
    } catch { /* ignore */ }
  }, [contractAddress, contractName, network]);

  const fetchEscrowCount = useCallback(async (): Promise<number> => {
    try {
      const result = await callReadOnlyFunction({
        contractAddress, contractName, functionName: 'get-escrow-count',
        functionArgs: [], network, senderAddress: contractAddress,
      });
      return cvToValue(result).value || 0;
    } catch { return 0; }
  }, [contractAddress, contractName, network]);

  // ============================================================================
  // Refresh
  // ============================================================================

  const refreshEscrows = useCallback(async () => {
    if (!stxAddress) return;
    setIsLoading(true);
    setError(null);

    try {
      const count = await fetchEscrowCount();
      const userEscrows: Escrow[] = [];

      for (let i = 1; i <= count; i++) {
        const escrow = await fetchEscrow(i);
        if (escrow && (escrow.buyer === stxAddress || escrow.seller === stxAddress)) {
          userEscrows.push(escrow);
        }
      }

      setEscrows(userEscrows);
      const stats = await fetchUserStats(stxAddress);
      setUserStats(stats);
      await fetchPlatformStats();
    } catch (err) {
      setError('Failed to fetch escrows');
    } finally {
      setIsLoading(false);
    }
  }, [stxAddress, fetchEscrowCount, fetchEscrow, fetchUserStats, fetchPlatformStats]);

  const selectEscrow = useCallback(async (escrowId: number) => {
    const escrow = escrows.find(e => e.id === escrowId) || await fetchEscrow(escrowId);
    setSelectedEscrow(escrow);
  }, [escrows, fetchEscrow]);

  // ============================================================================
  // Write Functions
  // ============================================================================

  const createEscrow = useCallback(async (
    seller: string, amount: number, deadline: number, description: string
  ): Promise<string | null> => {
    if (!stxAddress) return null;
    const amountMicro = Math.floor(amount * MICRO_STX);

    return new Promise((resolve) => {
      openContractCall({
        contractAddress, contractName, functionName: 'create-escrow',
        functionArgs: [principalCV(seller), uintCV(amountMicro), uintCV(deadline), stringAsciiCV(description)],
        postConditionMode: PostConditionMode.Allow,
        onFinish: (data) => { refreshEscrows(); resolve(data.txId); },
        onCancel: () => resolve(null),
      });
    });
  }, [stxAddress, contractAddress, contractName, refreshEscrows]);

  const fundEscrow = useCallback(async (escrowId: number): Promise<string | null> => {
    if (!stxAddress) return null;
    const escrow = escrows.find(e => e.id === escrowId);
    if (!escrow) return null;

    const totalAmount = Math.floor((escrow.amount + escrow.fee) * MICRO_STX);

    return new Promise((resolve) => {
      openContractCall({
        contractAddress, contractName, functionName: 'fund-escrow',
        functionArgs: [uintCV(escrowId)],
        postConditionMode: PostConditionMode.Deny,
        postConditions: [makeStandardSTXPostCondition(stxAddress, FungibleConditionCode.LessEqual, BigInt(totalAmount))],
        onFinish: (data) => { refreshEscrows(); resolve(data.txId); },
        onCancel: () => resolve(null),
      });
    });
  }, [stxAddress, contractAddress, contractName, escrows, refreshEscrows]);

  const releaseFunds = useCallback(async (escrowId: number): Promise<string | null> => {
    if (!stxAddress) return null;
    return new Promise((resolve) => {
      openContractCall({
        contractAddress, contractName, functionName: 'release-funds',
        functionArgs: [uintCV(escrowId)],
        postConditionMode: PostConditionMode.Allow,
        onFinish: (data) => { refreshEscrows(); resolve(data.txId); },
        onCancel: () => resolve(null),
      });
    });
  }, [stxAddress, contractAddress, contractName, refreshEscrows]);

  const refundBuyer = useCallback(async (escrowId: number): Promise<string | null> => {
    if (!stxAddress) return null;
    return new Promise((resolve) => {
      openContractCall({
        contractAddress, contractName, functionName: 'refund-buyer',
        functionArgs: [uintCV(escrowId)],
        postConditionMode: PostConditionMode.Allow,
        onFinish: (data) => { refreshEscrows(); resolve(data.txId); },
        onCancel: () => resolve(null),
      });
    });
  }, [stxAddress, contractAddress, contractName, refreshEscrows]);

  const releaseMilestone = useCallback(async (escrowId: number, milestoneId: number): Promise<string | null> => {
    if (!stxAddress) return null;
    return new Promise((resolve) => {
      openContractCall({
        contractAddress, contractName, functionName: 'release-milestone',
        functionArgs: [uintCV(escrowId), uintCV(milestoneId)],
        postConditionMode: PostConditionMode.Allow,
        onFinish: (data) => { refreshEscrows(); resolve(data.txId); },
        onCancel: () => resolve(null),
      });
    });
  }, [stxAddress, contractAddress, contractName, refreshEscrows]);

  const initiateDispute = useCallback(async (escrowId: number, reason: string): Promise<string | null> => {
    if (!stxAddress) return null;
    return new Promise((resolve) => {
      openContractCall({
        contractAddress, contractName, functionName: 'initiate-dispute',
        functionArgs: [uintCV(escrowId), stringAsciiCV(reason)],
        postConditionMode: PostConditionMode.Allow,
        onFinish: (data) => { refreshEscrows(); resolve(data.txId); },
        onCancel: () => resolve(null),
      });
    });
  }, [stxAddress, contractAddress, contractName, refreshEscrows]);

  // ============================================================================
  // Effects
  // ============================================================================

  useEffect(() => {
    if (isConnected && stxAddress) {
      refreshEscrows();
    }
  }, [isConnected, stxAddress, refreshEscrows]);

  return {
    escrows, selectedEscrow, milestones, userStats, platformStats, isLoading, error,
    createEscrow, fundEscrow, releaseFunds, refundBuyer, releaseMilestone, initiateDispute,
    selectEscrow, refreshEscrows,
  };
}

export default useEscrow;
