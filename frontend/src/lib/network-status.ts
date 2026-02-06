/**
 * Network Status Utilities for TimeLock Exchange
 * 
 * Provides utilities for monitoring Stacks network health:
 * - Network status checks
 * - Block height tracking
 * - API health monitoring
 * - Mempool status
 * 
 * @module network-status
 * @see https://docs.hiro.so/api
 */

import { ACTIVE_NETWORK } from './constants';

// ============================================================================
// Types
// ============================================================================

export type NetworkHealth = 'healthy' | 'degraded' | 'down' | 'unknown';

export interface NetworkStatus {
  health: NetworkHealth;
  chainTip: {
    blockHeight: number;
    blockHash: string;
    blockTime: number;
    microblockHash?: string;
  };
  api: {
    status: string;
    version: string;
    chainId: string;
  };
  mempool: {
    pendingCount: number;
    averageFee: number;
    congested: boolean;
  };
  lastChecked: Date;
}

export interface BlockInfo {
  height: number;
  hash: string;
  time: number;
  txCount: number;
  burnBlockHeight: number;
  burnBlockHash: string;
}

export interface MempoolStats {
  txCount: number;
  txAges: {
    median: number;
    p75: number;
    p95: number;
  };
  txSizes: {
    median: number;
    p75: number;
    p95: number;
  };
  feePriorities: {
    all: { minFee: number; maxFee: number; median: number };
    tokenTransfer: { minFee: number; maxFee: number; median: number };
    contractCall: { minFee: number; maxFee: number; median: number };
  };
}

// ============================================================================
// Constants
// ============================================================================

const API_URLS = {
  mainnet: 'https://api.mainnet.hiro.so',
  testnet: 'https://api.testnet.hiro.so',
} as const;

// Cache configuration
const CACHE_TTL_MS = 10000; // 10 seconds
let networkStatusCache: { data: NetworkStatus | null; timestamp: number } = {
  data: null,
  timestamp: 0,
};

// ============================================================================
// API Utilities
// ============================================================================

/**
 * Get the API URL for the current network
 */
export function getApiUrl(): string {
  return API_URLS[ACTIVE_NETWORK as keyof typeof API_URLS] || API_URLS.mainnet;
}

/**
 * Check if we're on mainnet
 */
export function isMainnet(): boolean {
  return ACTIVE_NETWORK === 'mainnet';
}

// ============================================================================
// Network Status Functions
// ============================================================================

/**
 * Get comprehensive network status
 * Uses caching to avoid excessive API calls
 * 
 * @example
 * ```typescript
 * import { getNetworkStatus } from '@/lib/network-status';
 * 
 * const status = await getNetworkStatus();
 * if (status.health === 'healthy') {
 *   console.log('Network is ready, block height:', status.chainTip.blockHeight);
 * }
 * ```
 */
export async function getNetworkStatus(forceRefresh = false): Promise<NetworkStatus> {
  const now = Date.now();
  
  // Return cached data if fresh
  if (!forceRefresh && networkStatusCache.data && 
      now - networkStatusCache.timestamp < CACHE_TTL_MS) {
    return networkStatusCache.data;
  }
  
  const apiUrl = getApiUrl();
  
  try {
    // Fetch all status data in parallel
    const [infoResponse, chainTipResponse, mempoolResponse] = await Promise.all([
      fetch(`${apiUrl}/v2/info`).catch(() => null),
      fetch(`${apiUrl}/extended/v1/block`).catch(() => null),
      fetch(`${apiUrl}/extended/v1/tx/mempool/stats`).catch(() => null),
    ]);
    
    // Parse API info
    const apiInfo = infoResponse?.ok ? await infoResponse.json() : null;
    
    // Parse chain tip
    const chainTipData = chainTipResponse?.ok ? await chainTipResponse.json() : null;
    const latestBlock = chainTipData?.results?.[0];
    
    // Parse mempool stats
    const mempoolData = mempoolResponse?.ok ? await mempoolResponse.json() : null;
    
    // Determine health status
    const health = determineNetworkHealth(apiInfo, latestBlock);
    
    const status: NetworkStatus = {
      health,
      chainTip: {
        blockHeight: apiInfo?.stacks_tip_height || latestBlock?.height || 0,
        blockHash: apiInfo?.stacks_tip || latestBlock?.hash || '',
        blockTime: latestBlock?.burn_block_time || 0,
        microblockHash: apiInfo?.unanchored_tip,
      },
      api: {
        status: apiInfo ? 'online' : 'offline',
        version: apiInfo?.server_version || 'unknown',
        chainId: apiInfo?.network_id?.toString(16) || '',
      },
      mempool: {
        pendingCount: mempoolData?.tx_count || 0,
        averageFee: mempoolData?.fee_priorities?.all?.median || 0,
        congested: (mempoolData?.tx_count || 0) > 1000,
      },
      lastChecked: new Date(),
    };
    
    // Update cache
    networkStatusCache = { data: status, timestamp: now };
    
    return status;
  } catch (error) {
    console.error('Failed to fetch network status:', error);
    
    return {
      health: 'unknown',
      chainTip: { blockHeight: 0, blockHash: '', blockTime: 0 },
      api: { status: 'error', version: 'unknown', chainId: '' },
      mempool: { pendingCount: 0, averageFee: 0, congested: false },
      lastChecked: new Date(),
    };
  }
}

/**
 * Determine network health based on API data
 */
function determineNetworkHealth(apiInfo: any, latestBlock: any): NetworkHealth {
  if (!apiInfo) {
    return 'down';
  }
  
  // Check if blocks are being produced (within last 30 minutes)
  if (latestBlock) {
    const blockAge = Date.now() / 1000 - latestBlock.burn_block_time;
    if (blockAge > 1800) { // 30 minutes
      return 'degraded';
    }
  }
  
  return 'healthy';
}

/**
 * Get current block height
 * 
 * @example
 * ```typescript
 * import { getCurrentBlockHeight } from '@/lib/network-status';
 * 
 * const height = await getCurrentBlockHeight();
 * console.log('Current block:', height);
 * ```
 */
export async function getCurrentBlockHeight(): Promise<number> {
  const status = await getNetworkStatus();
  return status.chainTip.blockHeight;
}

/**
 * Get block info by height
 */
export async function getBlockByHeight(height: number): Promise<BlockInfo | null> {
  const apiUrl = getApiUrl();
  
  try {
    const response = await fetch(`${apiUrl}/extended/v1/block/by_height/${height}`);
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    
    return {
      height: data.height,
      hash: data.hash,
      time: data.burn_block_time,
      txCount: data.txs?.length || 0,
      burnBlockHeight: data.burn_block_height,
      burnBlockHash: data.burn_block_hash,
    };
  } catch (error) {
    console.error('Failed to fetch block:', error);
    return null;
  }
}

/**
 * Get detailed mempool statistics
 * 
 * @example
 * ```typescript
 * import { getMempoolStats } from '@/lib/network-status';
 * 
 * const mempool = await getMempoolStats();
 * console.log('Pending transactions:', mempool.txCount);
 * console.log('Recommended fee:', mempool.feePriorities.contractCall.median);
 * ```
 */
export async function getMempoolStats(): Promise<MempoolStats | null> {
  const apiUrl = getApiUrl();
  
  try {
    const response = await fetch(`${apiUrl}/extended/v1/tx/mempool/stats`);
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    
    return {
      txCount: data.tx_count || 0,
      txAges: data.tx_ages || { median: 0, p75: 0, p95: 0 },
      txSizes: data.tx_sizes || { median: 0, p75: 0, p95: 0 },
      feePriorities: {
        all: data.fee_priorities?.all || { minFee: 0, maxFee: 0, median: 0 },
        tokenTransfer: data.fee_priorities?.token_transfer || { minFee: 0, maxFee: 0, median: 0 },
        contractCall: data.fee_priorities?.contract_call || { minFee: 0, maxFee: 0, median: 0 },
      },
    };
  } catch (error) {
    console.error('Failed to fetch mempool stats:', error);
    return null;
  }
}

/**
 * Check if the network API is reachable
 */
export async function isNetworkReachable(): Promise<boolean> {
  const apiUrl = getApiUrl();
  
  try {
    const response = await fetch(`${apiUrl}/v2/info`, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

// ============================================================================
// Block Time Utilities
// ============================================================================

// Average block time in seconds (Stacks ~10 minutes)
const AVERAGE_BLOCK_TIME_SECONDS = 600;

/**
 * Estimate block height at a future time
 * 
 * @example
 * ```typescript
 * import { estimateBlockAtTime } from '@/lib/network-status';
 * 
 * const futureDate = new Date('2024-12-31');
 * const { blockHeight } = await estimateBlockAtTime(futureDate);
 * console.log('Estimated block at end of year:', blockHeight);
 * ```
 */
export async function estimateBlockAtTime(targetTime: Date): Promise<{
  blockHeight: number;
  confidence: 'high' | 'medium' | 'low';
}> {
  const currentHeight = await getCurrentBlockHeight();
  const now = Date.now();
  const targetMs = targetTime.getTime();
  
  if (targetMs <= now) {
    return { blockHeight: currentHeight, confidence: 'high' };
  }
  
  const secondsUntil = (targetMs - now) / 1000;
  const blocksUntil = Math.floor(secondsUntil / AVERAGE_BLOCK_TIME_SECONDS);
  
  // Confidence decreases with time
  let confidence: 'high' | 'medium' | 'low' = 'high';
  if (secondsUntil > 86400 * 30) { // > 30 days
    confidence = 'low';
  } else if (secondsUntil > 86400 * 7) { // > 7 days
    confidence = 'medium';
  }
  
  return {
    blockHeight: currentHeight + blocksUntil,
    confidence,
  };
}

/**
 * Estimate time when a block will be reached
 * 
 * @example
 * ```typescript
 * import { estimateTimeAtBlock } from '@/lib/network-status';
 * 
 * const { estimatedTime } = await estimateTimeAtBlock(150000);
 * console.log('Block 150000 expected at:', estimatedTime);
 * ```
 */
export async function estimateTimeAtBlock(targetHeight: number): Promise<{
  estimatedTime: Date;
  blocksRemaining: number;
  secondsRemaining: number;
}> {
  const currentHeight = await getCurrentBlockHeight();
  
  if (targetHeight <= currentHeight) {
    return {
      estimatedTime: new Date(),
      blocksRemaining: 0,
      secondsRemaining: 0,
    };
  }
  
  const blocksRemaining = targetHeight - currentHeight;
  const secondsRemaining = blocksRemaining * AVERAGE_BLOCK_TIME_SECONDS;
  const estimatedTime = new Date(Date.now() + secondsRemaining * 1000);
  
  return {
    estimatedTime,
    blocksRemaining,
    secondsRemaining,
  };
}

/**
 * Format blocks remaining as human-readable time
 */
export function formatBlocksAsTime(blocks: number): string {
  const seconds = blocks * AVERAGE_BLOCK_TIME_SECONDS;
  
  if (seconds < 3600) {
    const minutes = Math.round(seconds / 60);
    return `~${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
  
  if (seconds < 86400) {
    const hours = Math.round(seconds / 3600);
    return `~${hours} hour${hours !== 1 ? 's' : ''}`;
  }
  
  const days = Math.round(seconds / 86400);
  return `~${days} day${days !== 1 ? 's' : ''}`;
}

// ============================================================================
// Network Status Hook Support
// ============================================================================

/**
 * Create a network status subscription
 * Returns a cleanup function
 * 
 * @example
 * ```typescript
 * import { subscribeToNetworkStatus } from '@/lib/network-status';
 * 
 * useEffect(() => {
 *   const unsubscribe = subscribeToNetworkStatus((status) => {
 *     console.log('Network status:', status.health);
 *   });
 *   return unsubscribe;
 * }, []);
 * ```
 */
export function subscribeToNetworkStatus(
  callback: (status: NetworkStatus) => void,
  intervalMs = 30000
): () => void {
  // Initial fetch
  getNetworkStatus(true).then(callback);
  
  // Periodic updates
  const interval = setInterval(() => {
    getNetworkStatus(true).then(callback);
  }, intervalMs);
  
  // Cleanup function
  return () => clearInterval(interval);
}

// ============================================================================
// Exports
// ============================================================================

export {
  API_URLS,
  AVERAGE_BLOCK_TIME_SECONDS,
};
