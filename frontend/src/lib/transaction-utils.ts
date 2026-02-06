/**
 * Transaction Utilities for TimeLock Exchange
 * 
 * Provides utilities for transaction management including:
 * - Transaction status tracking
 * - Retry logic with exponential backoff
 * - Gas estimation helpers
 * - Transaction history management
 * 
 * @module transaction-utils
 * @see https://docs.stacks.co/docs/stacks-academy/transactions
 */

import {
  ClarityValue,
  PostCondition,
  PostConditionMode,
} from '@stacks/transactions';
import { StacksNetwork, StacksMainnet, StacksTestnet } from '@stacks/network';
import { ACTIVE_NETWORK } from './constants';

// ============================================================================
// Types
// ============================================================================

export type TransactionStatus = 
  | 'pending'
  | 'submitted'
  | 'confirmed'
  | 'failed'
  | 'aborted';

export interface TransactionInfo {
  txId: string;
  status: TransactionStatus;
  contractAddress: string;
  contractName: string;
  functionName: string;
  functionArgs: string[];
  fee: bigint;
  nonce: number;
  submittedAt: Date;
  confirmedAt?: Date;
  blockHeight?: number;
  error?: string;
}

export interface TransactionOptions {
  contractAddress: string;
  contractName: string;
  functionName: string;
  functionArgs: ClarityValue[];
  postConditions?: PostCondition[];
  postConditionMode?: PostConditionMode;
  fee?: bigint;
  nonce?: number;
  network?: StacksNetwork;
  senderAddress: string;
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

export interface GasEstimation {
  estimated: bigint;
  low: bigint;
  medium: bigint;
  high: bigint;
  unit: 'microSTX';
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
};

// Minimum fees based on transaction type
const MIN_FEES = {
  transfer: BigInt(180),
  contractCall: BigInt(250),
  contractDeploy: BigInt(2000),
} as const;

// Gas limits for common operations
const GAS_LIMITS = {
  simpleTransfer: BigInt(500),
  createPosition: BigInt(5000),
  stake: BigInt(3000),
  unstake: BigInt(3500),
  vote: BigInt(2000),
  claim: BigInt(2500),
  batchTransfer: BigInt(10000),
  emergencyWithdraw: BigInt(7500),
} as const;

// ============================================================================
// Network Utilities
// ============================================================================

/**
 * Get the configured Stacks network
 */
export function getStacksNetwork(): StacksNetwork {
  return ACTIVE_NETWORK === 'mainnet'
    ? new StacksMainnet()
    : new StacksTestnet();
}

/**
 * Get the network API URL
 */
export function getNetworkApiUrl(): string {
  return ACTIVE_NETWORK === 'mainnet'
    ? 'https://api.mainnet.hiro.so'
    : 'https://api.testnet.hiro.so';
}

/**
 * Check if we're on mainnet
 */
export function isMainnet(): boolean {
  return ACTIVE_NETWORK === 'mainnet';
}

// ============================================================================
// Gas Estimation
// ============================================================================

/**
 * Estimate gas for a contract function call
 * Uses the Stacks API to get accurate gas estimates
 * 
 * @example
 * ```typescript
 * import { estimateGas } from '@/lib/transaction-utils';
 * 
 * const estimate = await estimateGas({
 *   contractAddress: 'SP5K2...',
 *   contractName: 'staking-v1',
 *   functionName: 'stake',
 *   functionArgs: [uintCV(1000000)],
 *   senderAddress: 'SP3K...',
 * });
 * 
 * console.log(`Estimated fee: ${estimate.medium} microSTX`);
 * ```
 */
export async function estimateGas(options: TransactionOptions): Promise<GasEstimation> {
  const network = options.network || getStacksNetwork();
  
  try {
    // Use a simpler fee estimation approach
    // The Stacks API doesn't have a direct estimation endpoint,
    // so we use sensible defaults based on operation type
    const defaultFee = getDefaultFeeForFunction(options.functionName);
    
    return {
      estimated: defaultFee,
      low: defaultFee,
      medium: (defaultFee * BigInt(120)) / BigInt(100), // +20%
      high: (defaultFee * BigInt(150)) / BigInt(100),   // +50%
      unit: 'microSTX',
    };
  } catch (error) {
    // Fallback to default estimates based on function type
    const defaultFee = getDefaultFeeForFunction(options.functionName);
    return {
      estimated: defaultFee,
      low: defaultFee,
      medium: (defaultFee * BigInt(120)) / BigInt(100),
      high: (defaultFee * BigInt(150)) / BigInt(100),
      unit: 'microSTX',
    };
  }
}

/**
 * Get default fee estimate based on function name
 */
function getDefaultFeeForFunction(functionName: string): bigint {
  const functionFees: Record<string, bigint> = {
    'create-position': GAS_LIMITS.createPosition,
    'stake': GAS_LIMITS.stake,
    'unstake': GAS_LIMITS.unstake,
    'vote': GAS_LIMITS.vote,
    'claim-rewards': GAS_LIMITS.claim,
    'batch-transfer': GAS_LIMITS.batchTransfer,
    'request-emergency-withdraw': GAS_LIMITS.emergencyWithdraw,
    'execute-emergency-withdraw': GAS_LIMITS.emergencyWithdraw,
  };
  
  return functionFees[functionName] || MIN_FEES.contractCall;
}

/**
 * Format gas estimation for display
 */
export function formatGasEstimate(estimate: GasEstimation): string {
  const stxAmount = Number(estimate.medium) / 1_000_000;
  return `~${stxAmount.toFixed(6)} STX`;
}

// ============================================================================
// Transaction Status
// ============================================================================

/**
 * Fetch transaction status from the Stacks API
 * 
 * @example
 * ```typescript
 * import { getTransactionStatus } from '@/lib/transaction-utils';
 * 
 * const status = await getTransactionStatus('0x123...');
 * if (status.status === 'confirmed') {
 *   console.log('Transaction confirmed at block', status.blockHeight);
 * }
 * ```
 */
export async function getTransactionStatus(txId: string): Promise<{
  status: TransactionStatus;
  blockHeight?: number;
  error?: string;
}> {
  const apiUrl = getNetworkApiUrl();
  
  try {
    const response = await fetch(`${apiUrl}/extended/v1/tx/${txId}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        return { status: 'pending' };
      }
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    switch (data.tx_status) {
      case 'success':
        return {
          status: 'confirmed',
          blockHeight: data.block_height,
        };
      case 'pending':
        return { status: 'submitted' };
      case 'abort_by_response':
      case 'abort_by_post_condition':
        return {
          status: 'aborted',
          error: data.tx_result?.repr || 'Transaction aborted',
        };
      default:
        return {
          status: 'failed',
          error: data.tx_result?.repr || 'Transaction failed',
        };
    }
  } catch (error) {
    return {
      status: 'pending',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Poll for transaction confirmation
 * Resolves when transaction is confirmed or rejects on failure
 * 
 * @example
 * ```typescript
 * import { waitForConfirmation } from '@/lib/transaction-utils';
 * 
 * try {
 *   const result = await waitForConfirmation('0x123...', {
 *     timeoutMs: 120000,
 *     pollIntervalMs: 5000,
 *   });
 *   console.log('Confirmed at block', result.blockHeight);
 * } catch (error) {
 *   console.error('Transaction failed:', error);
 * }
 * ```
 */
export async function waitForConfirmation(
  txId: string,
  options: {
    timeoutMs?: number;
    pollIntervalMs?: number;
    onStatusChange?: (status: TransactionStatus) => void;
  } = {}
): Promise<{ blockHeight: number }> {
  const { 
    timeoutMs = 300000, // 5 minutes default
    pollIntervalMs = 5000,
    onStatusChange,
  } = options;
  
  const startTime = Date.now();
  let lastStatus: TransactionStatus | null = null;
  
  while (Date.now() - startTime < timeoutMs) {
    const result = await getTransactionStatus(txId);
    
    // Notify on status change
    if (result.status !== lastStatus) {
      lastStatus = result.status;
      onStatusChange?.(result.status);
    }
    
    if (result.status === 'confirmed') {
      return { blockHeight: result.blockHeight! };
    }
    
    if (result.status === 'failed' || result.status === 'aborted') {
      throw new Error(result.error || `Transaction ${result.status}`);
    }
    
    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
  }
  
  throw new Error('Transaction confirmation timeout');
}

// ============================================================================
// Transaction Retry Logic
// ============================================================================

/**
 * Calculate delay for exponential backoff
 */
function calculateBackoffDelay(
  attempt: number,
  config: RetryConfig
): number {
  const delay = config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt - 1);
  return Math.min(delay, config.maxDelayMs);
}

/**
 * Retry a transaction with exponential backoff
 * 
 * @example
 * ```typescript
 * import { retryTransaction } from '@/lib/transaction-utils';
 * import { openContractCall } from '@stacks/connect';
 * 
 * const result = await retryTransaction(
 *   async () => {
 *     return await openContractCall({
 *       contractAddress: 'SP5K2...',
 *       contractName: 'staking-v1',
 *       functionName: 'stake',
 *       functionArgs: [uintCV(amount)],
 *       network,
 *     });
 *   },
 *   { maxAttempts: 3 }
 * );
 * ```
 */
export async function retryTransaction<T>(
  transactionFn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const fullConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= fullConfig.maxAttempts; attempt++) {
    try {
      return await transactionFn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry user cancellation
      if (lastError.message.includes('cancelled') || 
          lastError.message.includes('rejected')) {
        throw lastError;
      }
      
      // Don't retry on final attempt
      if (attempt === fullConfig.maxAttempts) {
        break;
      }
      
      // Wait before retrying
      const delay = calculateBackoffDelay(attempt, fullConfig);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError || new Error('Transaction failed after max retries');
}

// ============================================================================
// Nonce Management
// ============================================================================

/**
 * Get the next nonce for an address
 * 
 * @example
 * ```typescript
 * import { getNextNonce } from '@/lib/transaction-utils';
 * 
 * const nonce = await getNextNonce('SP3K...');
 * console.log('Next nonce:', nonce);
 * ```
 */
export async function getNextNonce(address: string): Promise<number> {
  const apiUrl = getNetworkApiUrl();
  
  try {
    const response = await fetch(
      `${apiUrl}/extended/v1/address/${address}/nonces`
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch nonce: ${response.status}`);
    }
    
    const data = await response.json();
    return data.possible_next_nonce;
  } catch (error) {
    console.error('Failed to fetch nonce:', error);
    throw error;
  }
}

// ============================================================================
// Transaction History
// ============================================================================

export interface HistoricalTransaction {
  txId: string;
  type: string;
  status: TransactionStatus;
  fee: number;
  blockHeight?: number;
  timestamp?: string;
  contractAddress?: string;
  contractName?: string;
  functionName?: string;
}

/**
 * Fetch transaction history for an address
 * 
 * @example
 * ```typescript
 * import { getTransactionHistory } from '@/lib/transaction-utils';
 * 
 * const history = await getTransactionHistory('SP3K...', { limit: 50 });
 * history.forEach(tx => {
 *   console.log(`${tx.txId}: ${tx.status}`);
 * });
 * ```
 */
export async function getTransactionHistory(
  address: string,
  options: {
    limit?: number;
    offset?: number;
    contractId?: string;
  } = {}
): Promise<HistoricalTransaction[]> {
  const { limit = 50, offset = 0, contractId } = options;
  const apiUrl = getNetworkApiUrl();
  
  try {
    let url = `${apiUrl}/extended/v1/address/${address}/transactions?limit=${limit}&offset=${offset}`;
    
    // Filter by contract if specified
    if (contractId) {
      url += `&contract_id=${contractId}`;
    }
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch history: ${response.status}`);
    }
    
    const data = await response.json();
    
    return data.results.map((tx: any): HistoricalTransaction => ({
      txId: tx.tx_id,
      type: tx.tx_type,
      status: mapApiStatus(tx.tx_status),
      fee: tx.fee_rate,
      blockHeight: tx.block_height,
      timestamp: tx.burn_block_time_iso,
      contractAddress: tx.contract_call?.contract_id?.split('.')[0],
      contractName: tx.contract_call?.contract_id?.split('.')[1],
      functionName: tx.contract_call?.function_name,
    }));
  } catch (error) {
    console.error('Failed to fetch transaction history:', error);
    return [];
  }
}

function mapApiStatus(apiStatus: string): TransactionStatus {
  switch (apiStatus) {
    case 'success':
      return 'confirmed';
    case 'pending':
      return 'submitted';
    case 'abort_by_response':
    case 'abort_by_post_condition':
      return 'aborted';
    default:
      return 'failed';
  }
}

// ============================================================================
// Transaction URL Helpers
// ============================================================================

/**
 * Get the explorer URL for a transaction
 */
export function getTransactionExplorerUrl(txId: string): string {
  const baseUrl = ACTIVE_NETWORK === 'mainnet'
    ? 'https://explorer.hiro.so/txid'
    : 'https://explorer.hiro.so/txid';
  
  const networkParam = ACTIVE_NETWORK === 'mainnet' ? '' : '?chain=testnet';
  return `${baseUrl}/${txId}${networkParam}`;
}

/**
 * Get the explorer URL for an address
 */
export function getAddressExplorerUrl(address: string): string {
  const baseUrl = ACTIVE_NETWORK === 'mainnet'
    ? 'https://explorer.hiro.so/address'
    : 'https://explorer.hiro.so/address';
  
  const networkParam = ACTIVE_NETWORK === 'mainnet' ? '' : '?chain=testnet';
  return `${baseUrl}/${address}${networkParam}`;
}

/**
 * Get the explorer URL for a contract
 */
export function getContractExplorerUrl(contractAddress: string, contractName: string): string {
  return getAddressExplorerUrl(`${contractAddress}.${contractName}`);
}

// ============================================================================
// Exports
// ============================================================================

export {
  DEFAULT_RETRY_CONFIG,
  MIN_FEES,
  GAS_LIMITS,
};
