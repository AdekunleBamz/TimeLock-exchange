import { useState, useEffect, useCallback, useMemo } from 'react';
import { useWallet } from '../lib/wallet-context';

// ============================================================================
// Types
// ============================================================================

export interface StakingPosition {
  amount: bigint;
  startBlock: number;
  lastRewardBlock: number;
  lockEndBlock: number;
  isLocked: boolean;
  tier: StakingTier;
}

export interface StakingTier {
  name: string;
  multiplier: number;
  minAmount: bigint;
}

export interface StakingStats {
  totalStaked: bigint;
  totalRewards: bigint;
  apr: number;
  totalStakers: number;
  minStakeAmount: bigint;
  lockPeriod: number;
  cooldownPeriod: number;
}

export interface PendingRewards {
  amount: bigint;
  lastCalculated: number;
  estimatedDaily: bigint;
  estimatedMonthly: bigint;
}

export interface StakingTransaction {
  type: 'stake' | 'unstake' | 'claim' | 'compound';
  amount: bigint;
  timestamp: Date;
  txId: string;
  status: 'pending' | 'confirmed' | 'failed';
  blockHeight?: number;
}

export interface UseStakingOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  onStakeSuccess?: (txId: string, amount: bigint) => void;
  onUnstakeSuccess?: (txId: string, amount: bigint) => void;
  onClaimSuccess?: (txId: string, amount: bigint) => void;
  onError?: (error: Error) => void;
}

export interface UseStakingReturn {
  // State
  isLoading: boolean;
  isStaking: boolean;
  isUnstaking: boolean;
  isClaiming: boolean;
  isCompounding: boolean;
  error: Error | null;
  
  // Data
  position: StakingPosition | null;
  stats: StakingStats | null;
  pendingRewards: PendingRewards | null;
  transactions: StakingTransaction[];
  currentTier: StakingTier | null;
  nextTier: StakingTier | null;
  progressToNextTier: number;
  
  // Computed
  effectiveApr: number;
  canStake: boolean;
  canUnstake: boolean;
  canClaim: boolean;
  
  // Actions
  stake: (amount: bigint) => Promise<string>;
  unstake: (amount: bigint) => Promise<string>;
  claimRewards: () => Promise<string>;
  compoundRewards: () => Promise<string>;
  refresh: () => Promise<void>;
}

// ============================================================================
// Constants
// ============================================================================

const STAKING_CONTRACT = 'SP000000000000000000002Q6VF78.staking-rewards';

const TIERS: StakingTier[] = [
  { name: 'Bronze', multiplier: 1.0, minAmount: BigInt(1000) * BigInt(1e6) },
  { name: 'Silver', multiplier: 1.25, minAmount: BigInt(10000) * BigInt(1e6) },
  { name: 'Gold', multiplier: 1.5, minAmount: BigInt(50000) * BigInt(1e6) },
  { name: 'Platinum', multiplier: 2.0, minAmount: BigInt(100000) * BigInt(1e6) }
];

const DEFAULT_OPTIONS: UseStakingOptions = {
  autoRefresh: true,
  refreshInterval: 30000 // 30 seconds
};

// ============================================================================
// Helper Functions
// ============================================================================

function getTierForAmount(amount: bigint): StakingTier | null {
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (amount >= TIERS[i].minAmount) {
      return TIERS[i];
    }
  }
  return null;
}

function getNextTier(amount: bigint): StakingTier | null {
  for (const tier of TIERS) {
    if (amount < tier.minAmount) {
      return tier;
    }
  }
  return null;
}

function calculateProgressToNextTier(amount: bigint, currentTier: StakingTier | null, nextTier: StakingTier | null): number {
  if (!nextTier) return 100;
  const min = currentTier?.minAmount || BigInt(0);
  const max = nextTier.minAmount;
  const current = amount;
  
  if (current <= min) return 0;
  if (current >= max) return 100;
  
  return Number(((current - min) * BigInt(100)) / (max - min));
}

function calculatePendingRewards(
  stakedAmount: bigint,
  lastRewardBlock: number,
  currentBlock: number,
  apr: number,
  multiplier: number
): bigint {
  const blocksElapsed = currentBlock - lastRewardBlock;
  const blocksPerYear = 52560; // ~144 blocks/day * 365
  const baseReward = (stakedAmount * BigInt(Math.floor(apr * 100))) / BigInt(10000);
  const periodReward = (baseReward * BigInt(blocksElapsed)) / BigInt(blocksPerYear);
  return BigInt(Math.floor(Number(periodReward) * multiplier));
}

// ============================================================================
// Main Hook
// ============================================================================

export function useStaking(options: UseStakingOptions = {}): UseStakingReturn {
  const { isConnected, stxAddress, openContractCall } = useWallet();
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  
  // State
  const [isLoading, setIsLoading] = useState(true);
  const [isStaking, setIsStaking] = useState(false);
  const [isUnstaking, setIsUnstaking] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [isCompounding, setIsCompounding] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const [position, setPosition] = useState<StakingPosition | null>(null);
  const [stats, setStats] = useState<StakingStats | null>(null);
  const [pendingRewards, setPendingRewards] = useState<PendingRewards | null>(null);
  const [transactions, setTransactions] = useState<StakingTransaction[]>([]);
  const [currentBlock, setCurrentBlock] = useState(0);
  
  // Computed values
  const currentTier = useMemo(() => {
    if (!position) return null;
    return getTierForAmount(position.amount);
  }, [position]);
  
  const nextTier = useMemo(() => {
    if (!position) return TIERS[0];
    return getNextTier(position.amount);
  }, [position]);
  
  const progressToNextTier = useMemo(() => {
    if (!position) return 0;
    return calculateProgressToNextTier(position.amount, currentTier, nextTier);
  }, [position, currentTier, nextTier]);
  
  const effectiveApr = useMemo(() => {
    if (!stats || !currentTier) return stats?.apr || 0;
    return stats.apr * currentTier.multiplier;
  }, [stats, currentTier]);
  
  const canStake = useMemo(() => {
    return isConnected && !isStaking && !isUnstaking;
  }, [isConnected, isStaking, isUnstaking]);
  
  const canUnstake = useMemo(() => {
    if (!isConnected || !position || isStaking || isUnstaking) return false;
    if (position.isLocked) return false;
    return position.amount > BigInt(0);
  }, [isConnected, position, isStaking, isUnstaking]);
  
  const canClaim = useMemo(() => {
    if (!isConnected || !pendingRewards || isClaiming) return false;
    return pendingRewards.amount > BigInt(0);
  }, [isConnected, pendingRewards, isClaiming]);
  
  // Fetch staking data
  const fetchStakingData = useCallback(async () => {
    if (!isConnected || !stxAddress) {
      setIsLoading(false);
      return;
    }
    
    try {
      setError(null);
      
      // Fetch current block height
      const blockResponse = await fetch('https://api.mainnet.hiro.so/extended/v1/block?limit=1');
      const blockData = await blockResponse.json();
      const latestBlock = blockData.results?.[0]?.height || 115000;
      setCurrentBlock(latestBlock);
      
      // TODO: Replace with actual contract calls
      // Simulated data for now
      const simulatedStats: StakingStats = {
        totalStaked: BigInt(5000000) * BigInt(1e6),
        totalRewards: BigInt(250000) * BigInt(1e6),
        apr: 12.5,
        totalStakers: 1247,
        minStakeAmount: BigInt(100) * BigInt(1e6),
        lockPeriod: 4320,
        cooldownPeriod: 144
      };
      
      const simulatedPosition: StakingPosition = {
        amount: BigInt(25000) * BigInt(1e6),
        startBlock: latestBlock - 15000,
        lastRewardBlock: latestBlock - 1000,
        lockEndBlock: latestBlock + 2000,
        isLocked: true,
        tier: TIERS[1] // Silver
      };
      
      setStats(simulatedStats);
      setPosition(simulatedPosition);
      
      // Calculate pending rewards
      const pending = calculatePendingRewards(
        simulatedPosition.amount,
        simulatedPosition.lastRewardBlock,
        latestBlock,
        simulatedStats.apr,
        simulatedPosition.tier.multiplier
      );
      
      const dailyReward = calculatePendingRewards(
        simulatedPosition.amount,
        0,
        144,
        simulatedStats.apr,
        simulatedPosition.tier.multiplier
      );
      
      setPendingRewards({
        amount: pending,
        lastCalculated: latestBlock,
        estimatedDaily: dailyReward,
        estimatedMonthly: dailyReward * BigInt(30)
      });
      
      // Simulated transactions
      setTransactions([
        {
          type: 'stake',
          amount: BigInt(20000) * BigInt(1e6),
          timestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          txId: '0x123abc',
          status: 'confirmed',
          blockHeight: latestBlock - 15000
        },
        {
          type: 'stake',
          amount: BigInt(5000) * BigInt(1e6),
          timestamp: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
          txId: '0x456def',
          status: 'confirmed',
          blockHeight: latestBlock - 7500
        },
        {
          type: 'claim',
          amount: BigInt(156) * BigInt(1e6),
          timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          txId: '0x789ghi',
          status: 'confirmed',
          blockHeight: latestBlock - 2500
        }
      ]);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch staking data');
      setError(error);
      mergedOptions.onError?.(error);
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, stxAddress, mergedOptions]);
  
  // Initial load and auto-refresh
  useEffect(() => {
    fetchStakingData();
    
    if (mergedOptions.autoRefresh && mergedOptions.refreshInterval) {
      const interval = setInterval(fetchStakingData, mergedOptions.refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchStakingData, mergedOptions.autoRefresh, mergedOptions.refreshInterval]);
  
  // Stake tokens
  const stake = useCallback(async (amount: bigint): Promise<string> => {
    if (!canStake) throw new Error('Cannot stake at this time');
    if (stats && amount < stats.minStakeAmount) {
      throw new Error(`Minimum stake amount is ${Number(stats.minStakeAmount) / 1e6} STX`);
    }
    
    setIsStaking(true);
    setError(null);
    
    try {
      // TODO: Replace with actual contract call
      const txId = await openContractCall({
        contractAddress: STAKING_CONTRACT.split('.')[0],
        contractName: STAKING_CONTRACT.split('.')[1],
        functionName: 'stake',
        functionArgs: [amount.toString()]
      });
      
      // Optimistic update
      setPosition(prev => ({
        ...(prev || {
          startBlock: currentBlock,
          lastRewardBlock: currentBlock,
          lockEndBlock: currentBlock + (stats?.lockPeriod || 4320),
          isLocked: true,
          tier: getTierForAmount(amount) || TIERS[0]
        }),
        amount: (prev?.amount || BigInt(0)) + amount,
        tier: getTierForAmount((prev?.amount || BigInt(0)) + amount) || TIERS[0]
      }));
      
      setTransactions(prev => [{
        type: 'stake',
        amount,
        timestamp: new Date(),
        txId,
        status: 'pending'
      }, ...prev]);
      
      mergedOptions.onStakeSuccess?.(txId, amount);
      return txId;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Stake failed');
      setError(error);
      mergedOptions.onError?.(error);
      throw error;
    } finally {
      setIsStaking(false);
    }
  }, [canStake, stats, openContractCall, currentBlock, mergedOptions]);
  
  // Unstake tokens
  const unstake = useCallback(async (amount: bigint): Promise<string> => {
    if (!canUnstake) throw new Error('Cannot unstake at this time');
    if (!position || amount > position.amount) {
      throw new Error('Insufficient staked balance');
    }
    
    setIsUnstaking(true);
    setError(null);
    
    try {
      const txId = await openContractCall({
        contractAddress: STAKING_CONTRACT.split('.')[0],
        contractName: STAKING_CONTRACT.split('.')[1],
        functionName: 'unstake',
        functionArgs: [amount.toString()]
      });
      
      // Optimistic update
      setPosition(prev => {
        if (!prev) return null;
        const newAmount = prev.amount - amount;
        return {
          ...prev,
          amount: newAmount,
          tier: getTierForAmount(newAmount) || TIERS[0]
        };
      });
      
      setTransactions(prev => [{
        type: 'unstake',
        amount,
        timestamp: new Date(),
        txId,
        status: 'pending'
      }, ...prev]);
      
      mergedOptions.onUnstakeSuccess?.(txId, amount);
      return txId;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unstake failed');
      setError(error);
      mergedOptions.onError?.(error);
      throw error;
    } finally {
      setIsUnstaking(false);
    }
  }, [canUnstake, position, openContractCall, mergedOptions]);
  
  // Claim rewards
  const claimRewards = useCallback(async (): Promise<string> => {
    if (!canClaim) throw new Error('No rewards to claim');
    
    setIsClaiming(true);
    setError(null);
    
    try {
      const txId = await openContractCall({
        contractAddress: STAKING_CONTRACT.split('.')[0],
        contractName: STAKING_CONTRACT.split('.')[1],
        functionName: 'claim-rewards',
        functionArgs: []
      });
      
      const claimedAmount = pendingRewards?.amount || BigInt(0);
      
      // Optimistic update
      setPendingRewards(prev => prev ? {
        ...prev,
        amount: BigInt(0),
        lastCalculated: currentBlock
      } : null);
      
      setPosition(prev => prev ? {
        ...prev,
        lastRewardBlock: currentBlock
      } : null);
      
      setTransactions(prev => [{
        type: 'claim',
        amount: claimedAmount,
        timestamp: new Date(),
        txId,
        status: 'pending'
      }, ...prev]);
      
      mergedOptions.onClaimSuccess?.(txId, claimedAmount);
      return txId;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Claim failed');
      setError(error);
      mergedOptions.onError?.(error);
      throw error;
    } finally {
      setIsClaiming(false);
    }
  }, [canClaim, pendingRewards, openContractCall, currentBlock, mergedOptions]);
  
  // Compound rewards (claim and restake)
  const compoundRewards = useCallback(async (): Promise<string> => {
    if (!canClaim) throw new Error('No rewards to compound');
    
    setIsCompounding(true);
    setError(null);
    
    try {
      const txId = await openContractCall({
        contractAddress: STAKING_CONTRACT.split('.')[0],
        contractName: STAKING_CONTRACT.split('.')[1],
        functionName: 'compound',
        functionArgs: []
      });
      
      const compoundedAmount = pendingRewards?.amount || BigInt(0);
      
      // Optimistic update
      setPendingRewards(prev => prev ? {
        ...prev,
        amount: BigInt(0),
        lastCalculated: currentBlock
      } : null);
      
      setPosition(prev => {
        if (!prev) return null;
        const newAmount = prev.amount + compoundedAmount;
        return {
          ...prev,
          amount: newAmount,
          lastRewardBlock: currentBlock,
          tier: getTierForAmount(newAmount) || TIERS[0]
        };
      });
      
      setTransactions(prev => [{
        type: 'compound',
        amount: compoundedAmount,
        timestamp: new Date(),
        txId,
        status: 'pending'
      }, ...prev]);
      
      return txId;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Compound failed');
      setError(error);
      mergedOptions.onError?.(error);
      throw error;
    } finally {
      setIsCompounding(false);
    }
  }, [canClaim, pendingRewards, openContractCall, currentBlock, mergedOptions]);
  
  // Refresh data
  const refresh = useCallback(async () => {
    await fetchStakingData();
  }, [fetchStakingData]);
  
  return {
    // State
    isLoading,
    isStaking,
    isUnstaking,
    isClaiming,
    isCompounding,
    error,
    
    // Data
    position,
    stats,
    pendingRewards,
    transactions,
    currentTier,
    nextTier,
    progressToNextTier,
    
    // Computed
    effectiveApr,
    canStake,
    canUnstake,
    canClaim,
    
    // Actions
    stake,
    unstake,
    claimRewards,
    compoundRewards,
    refresh
  };
}

// ============================================================================
// Additional Hooks
// ============================================================================

/**
 * Hook for staking stats only (no user data)
 */
export function useStakingStats() {
  const [stats, setStats] = useState<StakingStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    const fetchStats = async () => {
      try {
        // TODO: Replace with actual contract call
        setStats({
          totalStaked: BigInt(5000000) * BigInt(1e6),
          totalRewards: BigInt(250000) * BigInt(1e6),
          apr: 12.5,
          totalStakers: 1247,
          minStakeAmount: BigInt(100) * BigInt(1e6),
          lockPeriod: 4320,
          cooldownPeriod: 144
        });
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch stats'));
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchStats();
  }, []);
  
  return { stats, isLoading, error };
}

/**
 * Hook for calculating APR with different tier multipliers
 */
export function useAprCalculator(baseApr: number) {
  return useMemo(() => ({
    bronze: baseApr * TIERS[0].multiplier,
    silver: baseApr * TIERS[1].multiplier,
    gold: baseApr * TIERS[2].multiplier,
    platinum: baseApr * TIERS[3].multiplier,
    tiers: TIERS.map(t => ({
      ...t,
      effectiveApr: baseApr * t.multiplier
    }))
  }), [baseApr]);
}

/**
 * Hook for estimating rewards
 */
export function useRewardEstimator(amount: bigint, apr: number, multiplier: number = 1) {
  return useMemo(() => {
    const yearlyReward = (amount * BigInt(Math.floor(apr * multiplier * 100))) / BigInt(10000);
    const monthlyReward = yearlyReward / BigInt(12);
    const weeklyReward = yearlyReward / BigInt(52);
    const dailyReward = yearlyReward / BigInt(365);
    
    return {
      yearly: yearlyReward,
      monthly: monthlyReward,
      weekly: weeklyReward,
      daily: dailyReward
    };
  }, [amount, apr, multiplier]);
}

export default useStaking;
