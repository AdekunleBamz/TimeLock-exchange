/**
 * useNetworkStatus - React hook for monitoring Stacks network health
 * 
 * Provides real-time network status updates including:
 * - Network health status (healthy, degraded, down)
 * - Current block height
 * - Mempool statistics
 * - Block time estimates
 * 
 * @example
 * ```tsx
 * import { useNetworkStatus } from '@/hooks/useNetworkStatus';
 * 
 * function NetworkIndicator() {
 *   const { health, blockHeight, isLoading } = useNetworkStatus();
 *   
 *   return (
 *     <div className={`status-${health}`}>
 *       Block: {blockHeight}
 *     </div>
 *   );
 * }
 * ```
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getNetworkStatus,
  getCurrentBlockHeight,
  getMempoolStats,
  estimateTimeAtBlock,
  isNetworkReachable,
  subscribeToNetworkStatus,
  formatBlocksAsTime,
  type NetworkStatus,
  type NetworkHealth,
  type MempoolStats,
} from '@/lib/network-status';
import { ACTIVE_NETWORK } from '@/lib/constants';

// ============================================================================
// Types
// ============================================================================

export interface UseNetworkStatusReturn {
  // Status
  status: NetworkStatus | null;
  health: NetworkHealth;
  isLoading: boolean;
  error: string | null;
  isOnline: boolean;
  
  // Chain info
  blockHeight: number;
  blockTime: number;
  networkId: string;
  
  // Mempool
  mempoolStats: MempoolStats | null;
  isCongested: boolean;
  recommendedFee: number;
  
  // Actions
  refresh: () => Promise<void>;
  
  // Utilities
  estimateTimeToBlock: (targetBlock: number) => Promise<{
    estimatedTime: Date;
    blocksRemaining: number;
    formattedTime: string;
  } | null>;
}

export interface UseNetworkStatusOptions {
  /** Auto-refresh interval in ms (0 to disable) */
  refreshInterval?: number;
  /** Start fetching immediately */
  autoFetch?: boolean;
  /** Subscribe to real-time updates */
  subscribe?: boolean;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useNetworkStatus(
  options: UseNetworkStatusOptions = {}
): UseNetworkStatusReturn {
  const {
    refreshInterval = 30000, // 30 seconds default
    autoFetch = true,
    subscribe = true,
  } = options;

  // State
  const [status, setStatus] = useState<NetworkStatus | null>(null);
  const [mempoolStats, setMempoolStats] = useState<MempoolStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  // Refs
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const isMountedRef = useRef(true);

  // Fetch network status
  const fetchStatus = useCallback(async (forceRefresh = false) => {
    if (!isMountedRef.current) return;
    
    setIsLoading(true);
    setError(null);

    try {
      // Check connectivity first
      const reachable = await isNetworkReachable();
      setIsOnline(reachable);

      if (!reachable) {
        setError('Network unreachable');
        return;
      }

      // Fetch status and mempool in parallel
      const [networkStatus, mempool] = await Promise.all([
        getNetworkStatus(forceRefresh),
        getMempoolStats(),
      ]);

      if (isMountedRef.current) {
        setStatus(networkStatus);
        setMempoolStats(mempool);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to fetch network status');
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  // Refresh function exposed to consumers
  const refresh = useCallback(async () => {
    await fetchStatus(true);
  }, [fetchStatus]);

  // Estimate time to reach a block
  const estimateTimeToBlock = useCallback(async (targetBlock: number) => {
    try {
      const estimate = await estimateTimeAtBlock(targetBlock);
      return {
        ...estimate,
        formattedTime: formatBlocksAsTime(estimate.blocksRemaining),
      };
    } catch {
      return null;
    }
  }, []);

  // Setup subscription and auto-fetch
  useEffect(() => {
    isMountedRef.current = true;

    // Initial fetch
    if (autoFetch) {
      fetchStatus();
    }

    // Subscribe to updates
    if (subscribe && refreshInterval > 0) {
      unsubscribeRef.current = subscribeToNetworkStatus(
        (newStatus) => {
          if (isMountedRef.current) {
            setStatus(newStatus);
          }
        },
        refreshInterval
      );
    }

    // Cleanup
    return () => {
      isMountedRef.current = false;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [autoFetch, subscribe, refreshInterval, fetchStatus]);

  // Handle browser online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      fetchStatus(true);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [fetchStatus]);

  // Computed values
  const health = status?.health || 'unknown';
  const blockHeight = status?.chainTip.blockHeight || 0;
  const blockTime = status?.chainTip.blockTime || 0;
  const networkId = status?.api.chainId || '';
  const isCongested = status?.mempool.congested || false;
  const recommendedFee = mempoolStats?.feePriorities.contractCall.median || 250;

  return {
    // Status
    status,
    health,
    isLoading,
    error,
    isOnline,
    
    // Chain info
    blockHeight,
    blockTime,
    networkId,
    
    // Mempool
    mempoolStats,
    isCongested,
    recommendedFee,
    
    // Actions
    refresh,
    
    // Utilities
    estimateTimeToBlock,
  };
}

// ============================================================================
// Additional Hooks
// ============================================================================

/**
 * Simple hook for just block height
 * Useful for components that only need current block
 */
export function useBlockHeight(): {
  blockHeight: number;
  isLoading: boolean;
  refresh: () => Promise<void>;
} {
  const [blockHeight, setBlockHeight] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const height = await getCurrentBlockHeight();
      setBlockHeight(height);
    } catch (error) {
      console.error('Failed to fetch block height:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 60000); // Every minute
    return () => clearInterval(interval);
  }, [refresh]);

  return { blockHeight, isLoading, refresh };
}

/**
 * Hook for checking if we're on mainnet
 */
export function useIsMainnet(): boolean {
  return ACTIVE_NETWORK === 'mainnet';
}

/**
 * Hook for network name
 */
export function useNetworkName(): 'mainnet' | 'testnet' {
  return ACTIVE_NETWORK as 'mainnet' | 'testnet';
}

// Default export
export default useNetworkStatus;
