// Position History Hook - Track all position activities
import { useState, useEffect, useCallback, useMemo } from 'react';

export interface PositionHistoryEvent {
  id: string;
  positionId: number;
  eventType: 'created' | 'extended' | 'topped-up' | 'claimed' | 'transferred' | 'emergency-claimed';
  timestamp: number;
  blockHeight: number;
  txId: string;
  details: {
    amount?: number;
    previousAmount?: number;
    newAmount?: number;
    previousUnlockHeight?: number;
    newUnlockHeight?: number;
    from?: string;
    to?: string;
    feesPaid?: number;
    penaltyPaid?: number;
  };
}

export interface PositionHistoryFilters {
  positionId?: number;
  eventTypes?: PositionHistoryEvent['eventType'][];
  startDate?: Date;
  endDate?: Date;
  minAmount?: number;
  maxAmount?: number;
}

export interface PositionHistoryStats {
  totalEvents: number;
  totalCreated: number;
  totalClaimed: number;
  totalExtended: number;
  totalToppedUp: number;
  totalTransferred: number;
  totalEmergencyClaimed: number;
  totalVolumeCreated: number;
  totalVolumeClaimed: number;
  averageHoldDuration: number;
  mostActiveDay: string;
}

interface UsePositionHistoryOptions {
  userAddress?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
  pageSize?: number;
}

interface UsePositionHistoryReturn {
  history: PositionHistoryEvent[];
  isLoading: boolean;
  error: Error | null;
  filters: PositionHistoryFilters;
  setFilters: (filters: PositionHistoryFilters) => void;
  stats: PositionHistoryStats;
  pagination: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalItems: number;
    hasNext: boolean;
    hasPrevious: boolean;
    goToPage: (page: number) => void;
    nextPage: () => void;
    previousPage: () => void;
  };
  refresh: () => Promise<void>;
  exportToCSV: () => string;
  exportToJSON: () => string;
}

export function usePositionHistory(
  options: UsePositionHistoryOptions = {}
): UsePositionHistoryReturn {
  const {
    userAddress,
    autoRefresh = false,
    refreshInterval = 30000,
    pageSize = 20,
  } = options;

  const [allHistory, setAllHistory] = useState<PositionHistoryEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [filters, setFilters] = useState<PositionHistoryFilters>({});
  const [page, setPage] = useState(1);

  // Fetch history from API/blockchain
  const fetchHistory = useCallback(async () => {
    if (!userAddress) {
      setAllHistory([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Simulated API call - replace with actual blockchain indexer
      const response = await fetch(
        `/api/positions/history?address=${userAddress}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch position history');
      }

      const data = await response.json();
      setAllHistory(data.events || []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      
      // For development, generate mock data
      if (process.env.NODE_ENV === 'development') {
        setAllHistory(generateMockHistory(userAddress));
      }
    } finally {
      setIsLoading(false);
    }
  }, [userAddress]);

  // Apply filters to history
  const filteredHistory = useMemo(() => {
    let result = [...allHistory];

    if (filters.positionId !== undefined) {
      result = result.filter(e => e.positionId === filters.positionId);
    }

    if (filters.eventTypes && filters.eventTypes.length > 0) {
      result = result.filter(e => filters.eventTypes!.includes(e.eventType));
    }

    if (filters.startDate) {
      const startTime = filters.startDate.getTime();
      result = result.filter(e => e.timestamp >= startTime);
    }

    if (filters.endDate) {
      const endTime = filters.endDate.getTime();
      result = result.filter(e => e.timestamp <= endTime);
    }

    if (filters.minAmount !== undefined) {
      result = result.filter(e => {
        const amount = e.details.amount || e.details.newAmount || 0;
        return amount >= filters.minAmount!;
      });
    }

    if (filters.maxAmount !== undefined) {
      result = result.filter(e => {
        const amount = e.details.amount || e.details.newAmount || 0;
        return amount <= filters.maxAmount!;
      });
    }

    // Sort by timestamp descending (most recent first)
    result.sort((a, b) => b.timestamp - a.timestamp);

    return result;
  }, [allHistory, filters]);

  // Calculate statistics
  const stats = useMemo((): PositionHistoryStats => {
    const eventCounts = {
      created: 0,
      claimed: 0,
      extended: 0,
      'topped-up': 0,
      transferred: 0,
      'emergency-claimed': 0,
    };

    let totalVolumeCreated = 0;
    let totalVolumeClaimed = 0;
    let totalHoldDuration = 0;
    let holdDurationCount = 0;
    const eventsByDay: Record<string, number> = {};

    filteredHistory.forEach(event => {
      eventCounts[event.eventType]++;

      if (event.eventType === 'created' && event.details.amount) {
        totalVolumeCreated += event.details.amount;
      }

      if (
        (event.eventType === 'claimed' || event.eventType === 'emergency-claimed') &&
        event.details.amount
      ) {
        totalVolumeClaimed += event.details.amount;
      }

      // Calculate hold duration for claimed positions
      if (event.eventType === 'claimed' && event.details.previousUnlockHeight) {
        // Approximate duration based on block height difference
        const duration =
          (event.blockHeight - (event.details.previousUnlockHeight || event.blockHeight)) * 10 * 60 * 1000;
        if (duration > 0) {
          totalHoldDuration += duration;
          holdDurationCount++;
        }
      }

      // Track events by day
      const day = new Date(event.timestamp).toISOString().split('T')[0];
      eventsByDay[day] = (eventsByDay[day] || 0) + 1;
    });

    // Find most active day
    let mostActiveDay = '';
    let maxEvents = 0;
    Object.entries(eventsByDay).forEach(([day, count]) => {
      if (count > maxEvents) {
        maxEvents = count;
        mostActiveDay = day;
      }
    });

    return {
      totalEvents: filteredHistory.length,
      totalCreated: eventCounts.created,
      totalClaimed: eventCounts.claimed,
      totalExtended: eventCounts.extended,
      totalToppedUp: eventCounts['topped-up'],
      totalTransferred: eventCounts.transferred,
      totalEmergencyClaimed: eventCounts['emergency-claimed'],
      totalVolumeCreated,
      totalVolumeClaimed,
      averageHoldDuration: holdDurationCount > 0 ? totalHoldDuration / holdDurationCount : 0,
      mostActiveDay,
    };
  }, [filteredHistory]);

  // Pagination
  const totalPages = Math.ceil(filteredHistory.length / pageSize);
  const paginatedHistory = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredHistory.slice(start, start + pageSize);
  }, [filteredHistory, page, pageSize]);

  const pagination = {
    page,
    pageSize,
    totalPages,
    totalItems: filteredHistory.length,
    hasNext: page < totalPages,
    hasPrevious: page > 1,
    goToPage: (newPage: number) => {
      if (newPage >= 1 && newPage <= totalPages) {
        setPage(newPage);
      }
    },
    nextPage: () => {
      if (page < totalPages) {
        setPage(p => p + 1);
      }
    },
    previousPage: () => {
      if (page > 1) {
        setPage(p => p - 1);
      }
    },
  };

  // Export functions
  const exportToCSV = useCallback(() => {
    const headers = [
      'Event ID',
      'Position ID',
      'Event Type',
      'Timestamp',
      'Block Height',
      'TX ID',
      'Amount',
      'From',
      'To',
      'Fees Paid',
    ];

    const rows = filteredHistory.map(event => [
      event.id,
      event.positionId,
      event.eventType,
      new Date(event.timestamp).toISOString(),
      event.blockHeight,
      event.txId,
      event.details.amount || event.details.newAmount || '',
      event.details.from || '',
      event.details.to || '',
      event.details.feesPaid || '',
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }, [filteredHistory]);

  const exportToJSON = useCallback(() => {
    return JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        filters,
        stats,
        events: filteredHistory,
      },
      null,
      2
    );
  }, [filteredHistory, filters, stats]);

  // Initial fetch
  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchHistory, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchHistory]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [filters]);

  return {
    history: paginatedHistory,
    isLoading,
    error,
    filters,
    setFilters,
    stats,
    pagination,
    refresh: fetchHistory,
    exportToCSV,
    exportToJSON,
  };
}

// Generate mock history for development
function generateMockHistory(userAddress: string): PositionHistoryEvent[] {
  const events: PositionHistoryEvent[] = [];
  const eventTypes: PositionHistoryEvent['eventType'][] = [
    'created',
    'extended',
    'topped-up',
    'claimed',
    'transferred',
  ];

  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  for (let i = 0; i < 50; i++) {
    const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
    const positionId = Math.floor(Math.random() * 10) + 1;
    const timestamp = now - Math.floor(Math.random() * 30) * dayMs;
    const blockHeight = 150000 + Math.floor(Math.random() * 10000);

    events.push({
      id: `event-${i}`,
      positionId,
      eventType,
      timestamp,
      blockHeight,
      txId: `0x${Math.random().toString(16).slice(2, 66)}`,
      details: {
        amount: Math.floor(Math.random() * 1000000) + 100000,
        previousAmount: eventType === 'topped-up' ? Math.floor(Math.random() * 500000) + 100000 : undefined,
        newAmount: eventType === 'topped-up' ? Math.floor(Math.random() * 1500000) + 200000 : undefined,
        previousUnlockHeight: eventType === 'extended' ? blockHeight - 1000 : undefined,
        newUnlockHeight: eventType === 'extended' ? blockHeight + 10000 : undefined,
        from: eventType === 'transferred' ? userAddress : undefined,
        to: eventType === 'transferred' ? `ST${Math.random().toString(36).slice(2, 10).toUpperCase()}` : undefined,
        feesPaid: Math.floor(Math.random() * 10000),
      },
    });
  }

  return events.sort((a, b) => b.timestamp - a.timestamp);
}

export default usePositionHistory;
