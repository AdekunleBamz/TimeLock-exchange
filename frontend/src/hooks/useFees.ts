import { useState, useEffect, useCallback, useMemo } from 'react';
import { useWallet } from '../lib/wallet-context';
import { calculateFee, FEE_COLLECTOR_CONTRACT } from '../lib/contracts';
import type { FeeTierInfo, FeeStats } from '../lib/types';
import { callReadOnlyFunction, cvToValue, uintCV } from '@stacks/transactions';

// Fee tier definitions matching contract
const FEE_TIERS: FeeTierInfo[] = [
  { minDays: 7, maxDays: 29, feePercent: 100, name: '7-Day Lock', description: '1% fee for short-term locks' },
  { minDays: 30, maxDays: 89, feePercent: 75, name: '30-Day Lock', description: '0.75% fee for monthly locks' },
  { minDays: 90, maxDays: 179, feePercent: 50, name: '90-Day Lock', description: '0.5% fee for quarterly locks' },
  { minDays: 180, maxDays: 364, feePercent: 25, name: '180-Day Lock', description: '0.25% fee for semi-annual locks' },
  { minDays: 365, maxDays: Infinity, feePercent: 10, name: '365-Day Lock', description: '0.1% fee for annual+ locks' },
];

interface UseFeesReturn {
  tiers: FeeTierInfo[];
  stats: FeeStats | null;
  isLoading: boolean;
  error: string | null;
  calculateFeeForAmount: (amount: bigint, lockDays: number) => Promise<bigint>;
  getTierForDuration: (lockDays: number) => FeeTierInfo;
  getNetReturn: (amount: bigint, lockDays: number) => Promise<bigint>;
  refetch: () => Promise<void>;
}

export function useFees(): UseFeesReturn {
  const { address, network } = useWallet();
  const [stats, setStats] = useState<FeeStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch fee statistics from contract
      const totalFeesResult = await callReadOnlyFunction({
        contractAddress: FEE_COLLECTOR_CONTRACT.address,
        contractName: FEE_COLLECTOR_CONTRACT.name,
        functionName: 'get-total-fees-collected',
        functionArgs: [],
        network,
        senderAddress: address || FEE_COLLECTOR_CONTRACT.address,
      });

      const totalFees = BigInt(cvToValue(totalFeesResult) || 0);

      // Get tier counts
      const tierCounts: Record<string, number> = {};
      for (let i = 1; i <= 5; i++) {
        try {
          const countResult = await callReadOnlyFunction({
            contractAddress: FEE_COLLECTOR_CONTRACT.address,
            contractName: FEE_COLLECTOR_CONTRACT.name,
            functionName: 'get-tier-count',
            functionArgs: [uintCV(i)],
            network,
            senderAddress: address || FEE_COLLECTOR_CONTRACT.address,
          });
          tierCounts[`tier${i}`] = Number(cvToValue(countResult) || 0);
        } catch {
          tierCounts[`tier${i}`] = 0;
        }
      }

      // Calculate fee breakdown per tier
      const feeBreakdown = FEE_TIERS.map((tier, index) => {
        const count = tierCounts[`tier${index + 1}`] || 0;
        return {
          tier: tier.name,
          count,
          estimatedFees: totalFees / BigInt(FEE_TIERS.length), // Simplified estimate
        };
      });

      setStats({
        totalCollected: totalFees,
        totalPositions: Object.values(tierCounts).reduce((a, b) => a + b, 0),
        averageFeePercent: 50, // Average across tiers
        feeBreakdown,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch fee stats');
    } finally {
      setIsLoading(false);
    }
  }, [address, network]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const getTierForDuration = useCallback((lockDays: number): FeeTierInfo => {
    for (const tier of FEE_TIERS) {
      if (lockDays >= tier.minDays && lockDays <= tier.maxDays) {
        return tier;
      }
    }
    // Default to highest tier for very long locks
    return FEE_TIERS[FEE_TIERS.length - 1];
  }, []);

  const calculateFeeForAmount = useCallback(async (amount: bigint, lockDays: number): Promise<bigint> => {
    try {
      return await calculateFee(amount, lockDays);
    } catch {
      // Fallback to local calculation
      const tier = getTierForDuration(lockDays);
      return (amount * BigInt(tier.feePercent)) / BigInt(10000);
    }
  }, [getTierForDuration]);

  const getNetReturn = useCallback(async (amount: bigint, lockDays: number): Promise<bigint> => {
    const fee = await calculateFeeForAmount(amount, lockDays);
    return amount - fee;
  }, [calculateFeeForAmount]);

  return {
    tiers: FEE_TIERS,
    stats,
    isLoading,
    error,
    calculateFeeForAmount,
    getTierForDuration,
    getNetReturn,
    refetch: fetchStats,
  };
}

// Hook for fee calculator preview
export function useFeeCalculator(amount: bigint, lockDays: number) {
  const { getTierForDuration, calculateFeeForAmount, getNetReturn } = useFees();
  const [fee, setFee] = useState<bigint>(BigInt(0));
  const [netReturn, setNetReturn] = useState<bigint>(BigInt(0));
  const [isCalculating, setIsCalculating] = useState(false);

  const tier = useMemo(() => getTierForDuration(lockDays), [getTierForDuration, lockDays]);

  useEffect(() => {
    const calculate = async () => {
      if (amount <= BigInt(0) || lockDays <= 0) {
        setFee(BigInt(0));
        setNetReturn(BigInt(0));
        return;
      }

      setIsCalculating(true);
      try {
        const [calculatedFee, calculatedNet] = await Promise.all([
          calculateFeeForAmount(amount, lockDays),
          getNetReturn(amount, lockDays),
        ]);
        setFee(calculatedFee);
        setNetReturn(calculatedNet);
      } catch {
        // Fallback calculation
        const tierFee = (amount * BigInt(tier.feePercent)) / BigInt(10000);
        setFee(tierFee);
        setNetReturn(amount - tierFee);
      } finally {
        setIsCalculating(false);
      }
    };

    calculate();
  }, [amount, lockDays, tier, calculateFeeForAmount, getNetReturn]);

  return {
    tier,
    fee,
    netReturn,
    feePercent: tier.feePercent / 100,
    isCalculating,
  };
}

// Format functions for display
export function formatFeePercent(basisPoints: number): string {
  return `${(basisPoints / 100).toFixed(2)}%`;
}

export function formatSTX(microSTX: bigint): string {
  const stx = Number(microSTX) / 1_000_000;
  return stx.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 });
}
