// Portfolio Analytics Hook - Comprehensive portfolio tracking and analysis
import { useState, useEffect, useCallback, useMemo } from 'react';

export interface PortfolioPosition {
  id: number;
  amount: number;
  unlockHeight: number;
  status: 'locked' | 'unlocked' | 'claimed';
  createdAt: number;
  estimatedValue: number;
}

export interface PortfolioMetrics {
  totalLocked: number;
  totalUnlocked: number;
  totalClaimed: number;
  totalPositions: number;
  activePositions: number;
  claimedPositions: number;
  averageLockDuration: number;
  longestLock: number;
  shortestLock: number;
  portfolioHealth: number; // 0-100 score
  diversificationScore: number; // 0-100 score
  riskScore: number; // 0-100 score
}

export interface TimeSeriesDataPoint {
  timestamp: number;
  value: number;
  label: string;
}

export interface PortfolioTimeSeries {
  totalValueOverTime: TimeSeriesDataPoint[];
  lockedValueOverTime: TimeSeriesDataPoint[];
  positionCountOverTime: TimeSeriesDataPoint[];
  unlockSchedule: TimeSeriesDataPoint[];
}

export interface PortfolioInsight {
  type: 'info' | 'warning' | 'success' | 'tip';
  title: string;
  message: string;
  actionLabel?: string;
  actionHandler?: () => void;
}

export interface PortfolioProjection {
  period: '1w' | '1m' | '3m' | '6m' | '1y';
  projectedUnlocks: number;
  projectedValue: number;
  unlockingPositions: number[];
}

interface UsePortfolioAnalyticsOptions {
  userAddress?: string;
  includeProjections?: boolean;
  includeInsights?: boolean;
  refreshInterval?: number;
}

interface UsePortfolioAnalyticsReturn {
  positions: PortfolioPosition[];
  metrics: PortfolioMetrics;
  timeSeries: PortfolioTimeSeries;
  insights: PortfolioInsight[];
  projections: PortfolioProjection[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  calculateProjection: (period: PortfolioProjection['period']) => PortfolioProjection;
  getPositionsByStatus: (status: PortfolioPosition['status']) => PortfolioPosition[];
  getUpcomingUnlocks: (days: number) => PortfolioPosition[];
}

export function usePortfolioAnalytics(
  options: UsePortfolioAnalyticsOptions = {}
): UsePortfolioAnalyticsReturn {
  const {
    userAddress,
    includeProjections = true,
    includeInsights = true,
    refreshInterval = 60000,
  } = options;

  const [positions, setPositions] = useState<PortfolioPosition[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Fetch portfolio data
  const fetchPortfolio = useCallback(async () => {
    if (!userAddress) {
      setPositions([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/portfolio/${userAddress}`);
      if (!response.ok) throw new Error('Failed to fetch portfolio');
      const data = await response.json();
      setPositions(data.positions || []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      // Mock data for development
      if (process.env.NODE_ENV === 'development') {
        setPositions(generateMockPositions());
      }
    } finally {
      setIsLoading(false);
    }
  }, [userAddress]);

  // Calculate metrics
  const metrics = useMemo((): PortfolioMetrics => {
    const locked = positions.filter(p => p.status === 'locked');
    const unlocked = positions.filter(p => p.status === 'unlocked');
    const claimed = positions.filter(p => p.status === 'claimed');

    const totalLocked = locked.reduce((sum, p) => sum + p.amount, 0);
    const totalUnlocked = unlocked.reduce((sum, p) => sum + p.amount, 0);
    const totalClaimed = claimed.reduce((sum, p) => sum + p.amount, 0);

    // Calculate lock durations (in blocks, convert to hours)
    const lockDurations = positions
      .filter(p => p.status !== 'claimed')
      .map(p => p.unlockHeight - Math.floor(Date.now() / 600000)); // Approximate block height

    const avgDuration = lockDurations.length > 0
      ? lockDurations.reduce((a, b) => a + b, 0) / lockDurations.length
      : 0;

    // Portfolio health based on diversification and lock distribution
    const amountVariance = calculateVariance(positions.map(p => p.amount));
    const portfolioHealth = Math.min(100, Math.max(0, 100 - (amountVariance / 1000000)));

    // Diversification score based on number of positions and amount distribution
    const diversificationScore = Math.min(100, positions.length * 10 + (100 - amountVariance / 10000));

    // Risk score based on unlock timing concentration
    const riskScore = calculateRiskScore(positions);

    return {
      totalLocked,
      totalUnlocked,
      totalClaimed,
      totalPositions: positions.length,
      activePositions: locked.length + unlocked.length,
      claimedPositions: claimed.length,
      averageLockDuration: avgDuration,
      longestLock: lockDurations.length > 0 ? Math.max(...lockDurations) : 0,
      shortestLock: lockDurations.length > 0 ? Math.min(...lockDurations) : 0,
      portfolioHealth,
      diversificationScore,
      riskScore,
    };
  }, [positions]);

  // Generate time series data
  const timeSeries = useMemo((): PortfolioTimeSeries => {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    // Generate historical data (last 30 days)
    const totalValueOverTime: TimeSeriesDataPoint[] = [];
    const lockedValueOverTime: TimeSeriesDataPoint[] = [];
    const positionCountOverTime: TimeSeriesDataPoint[] = [];

    for (let i = 30; i >= 0; i--) {
      const timestamp = now - i * dayMs;
      const date = new Date(timestamp);
      const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      // Simulated historical values (in production, this would come from indexed data)
      const historicalPositions = positions.filter(p => p.createdAt <= timestamp);
      const lockedValue = historicalPositions
        .filter(p => p.status === 'locked')
        .reduce((sum, p) => sum + p.amount, 0);

      totalValueOverTime.push({
        timestamp,
        value: lockedValue * (1 + Math.random() * 0.1),
        label,
      });

      lockedValueOverTime.push({
        timestamp,
        value: lockedValue,
        label,
      });

      positionCountOverTime.push({
        timestamp,
        value: historicalPositions.length,
        label,
      });
    }

    // Generate unlock schedule (next 90 days)
    const unlockSchedule: TimeSeriesDataPoint[] = [];
    const lockedPositions = positions.filter(p => p.status === 'locked');

    for (let i = 0; i <= 90; i++) {
      const targetDate = now + i * dayMs;
      const targetBlockHeight = Math.floor(targetDate / 600000); // Approximate

      const unlockingValue = lockedPositions
        .filter(p => {
          const unlockDate = p.unlockHeight * 600000;
          return unlockDate >= targetDate - dayMs && unlockDate < targetDate;
        })
        .reduce((sum, p) => sum + p.amount, 0);

      if (unlockingValue > 0 || i % 7 === 0) {
        const date = new Date(targetDate);
        unlockSchedule.push({
          timestamp: targetDate,
          value: unlockingValue,
          label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        });
      }
    }

    return {
      totalValueOverTime,
      lockedValueOverTime,
      positionCountOverTime,
      unlockSchedule,
    };
  }, [positions]);

  // Generate insights
  const insights = useMemo((): PortfolioInsight[] => {
    if (!includeInsights) return [];

    const result: PortfolioInsight[] = [];

    // Check for positions unlocking soon
    const soonUnlocking = positions.filter(p => {
      if (p.status !== 'locked') return false;
      const blocksUntilUnlock = p.unlockHeight - Math.floor(Date.now() / 600000);
      return blocksUntilUnlock < 144 * 7; // ~7 days
    });

    if (soonUnlocking.length > 0) {
      result.push({
        type: 'info',
        title: 'Upcoming Unlocks',
        message: `${soonUnlocking.length} position(s) will unlock within the next 7 days`,
        actionLabel: 'View Positions',
      });
    }

    // Check diversification
    if (metrics.diversificationScore < 40) {
      result.push({
        type: 'warning',
        title: 'Low Diversification',
        message: 'Consider creating more positions with varied lock durations to improve portfolio health',
        actionLabel: 'Create Position',
      });
    }

    // Check for large single positions
    const largePositions = positions.filter(p => p.amount > metrics.totalLocked * 0.5);
    if (largePositions.length > 0) {
      result.push({
        type: 'warning',
        title: 'Concentration Risk',
        message: 'You have positions that represent over 50% of your portfolio',
      });
    }

    // Success insights
    if (metrics.portfolioHealth > 80) {
      result.push({
        type: 'success',
        title: 'Healthy Portfolio',
        message: 'Your portfolio is well-diversified and balanced',
      });
    }

    // Tips
    if (positions.length < 3) {
      result.push({
        type: 'tip',
        title: 'Maximize Your Strategy',
        message: 'Consider creating multiple positions with staggered unlock dates for better liquidity management',
      });
    }

    return result;
  }, [positions, metrics, includeInsights]);

  // Calculate projection for a specific period
  const calculateProjection = useCallback(
    (period: PortfolioProjection['period']): PortfolioProjection => {
      const now = Date.now();
      const periodDays: Record<PortfolioProjection['period'], number> = {
        '1w': 7,
        '1m': 30,
        '3m': 90,
        '6m': 180,
        '1y': 365,
      };

      const days = periodDays[period];
      const endTime = now + days * 24 * 60 * 60 * 1000;
      const endBlockHeight = Math.floor(endTime / 600000);

      const unlockingPositions = positions
        .filter(p => p.status === 'locked' && p.unlockHeight <= endBlockHeight)
        .map(p => p.id);

      const projectedUnlocks = positions
        .filter(p => unlockingPositions.includes(p.id))
        .reduce((sum, p) => sum + p.amount, 0);

      return {
        period,
        projectedUnlocks,
        projectedValue: metrics.totalLocked - projectedUnlocks,
        unlockingPositions,
      };
    },
    [positions, metrics.totalLocked]
  );

  // Generate projections for all periods
  const projections = useMemo((): PortfolioProjection[] => {
    if (!includeProjections) return [];
    const periods: PortfolioProjection['period'][] = ['1w', '1m', '3m', '6m', '1y'];
    return periods.map(calculateProjection);
  }, [calculateProjection, includeProjections]);

  // Utility functions
  const getPositionsByStatus = useCallback(
    (status: PortfolioPosition['status']) => {
      return positions.filter(p => p.status === status);
    },
    [positions]
  );

  const getUpcomingUnlocks = useCallback(
    (days: number) => {
      const now = Date.now();
      const endTime = now + days * 24 * 60 * 60 * 1000;
      const endBlockHeight = Math.floor(endTime / 600000);
      const currentBlockHeight = Math.floor(now / 600000);

      return positions.filter(
        p => p.status === 'locked' && p.unlockHeight > currentBlockHeight && p.unlockHeight <= endBlockHeight
      );
    },
    [positions]
  );

  // Initial fetch
  useEffect(() => {
    fetchPortfolio();
  }, [fetchPortfolio]);

  // Auto-refresh
  useEffect(() => {
    if (refreshInterval <= 0) return;
    const interval = setInterval(fetchPortfolio, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchPortfolio, refreshInterval]);

  return {
    positions,
    metrics,
    timeSeries,
    insights,
    projections,
    isLoading,
    error,
    refresh: fetchPortfolio,
    calculateProjection,
    getPositionsByStatus,
    getUpcomingUnlocks,
  };
}

// Helper functions
function calculateVariance(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
}

function calculateRiskScore(positions: PortfolioPosition[]): number {
  if (positions.length === 0) return 0;
  
  const locked = positions.filter(p => p.status === 'locked');
  if (locked.length === 0) return 0;

  // Group by unlock height (week buckets)
  const unlockBuckets: Record<number, number> = {};
  locked.forEach(p => {
    const weekBucket = Math.floor(p.unlockHeight / (144 * 7));
    unlockBuckets[weekBucket] = (unlockBuckets[weekBucket] || 0) + p.amount;
  });

  // High concentration in single week = higher risk
  const totalLocked = locked.reduce((sum, p) => sum + p.amount, 0);
  const maxBucketAmount = Math.max(...Object.values(unlockBuckets));
  const concentration = maxBucketAmount / totalLocked;

  return Math.round(concentration * 100);
}

function generateMockPositions(): PortfolioPosition[] {
  const positions: PortfolioPosition[] = [];
  const now = Date.now();
  const currentBlockHeight = Math.floor(now / 600000);

  for (let i = 1; i <= 8; i++) {
    const status: PortfolioPosition['status'] = 
      i <= 5 ? 'locked' : i <= 7 ? 'unlocked' : 'claimed';
    
    const amount = Math.floor(Math.random() * 900000) + 100000;
    const unlockOffset = Math.floor(Math.random() * 100000);

    positions.push({
      id: i,
      amount,
      unlockHeight: currentBlockHeight + unlockOffset,
      status,
      createdAt: now - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000,
      estimatedValue: amount * (1 + Math.random() * 0.05),
    });
  }

  return positions;
}

export default usePortfolioAnalytics;
