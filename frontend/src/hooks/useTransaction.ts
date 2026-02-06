/**
 * useTransaction - React hook for managing Stacks transactions
 * 
 * Provides utilities for:
 * - Transaction status tracking
 * - Retry logic with exponential backoff
 * - Gas estimation
 * - Transaction history
 * 
 * @example
 * ```tsx
 * import { useTransaction } from '@/hooks/useTransaction';
 * 
 * function StakeButton({ amount }: { amount: number }) {
 *   const { execute, status, error, estimateGas } = useTransaction();
 *   
 *   const handleStake = async () => {
 *     const gas = await estimateGas('stake', [uintCV(amount)]);
 *     await execute({
 *       contractAddress: 'SP5K2...',
 *       contractName: 'staking-v1',
 *       functionName: 'stake',
 *       functionArgs: [uintCV(amount)],
 *     });
 *   };
 *   
 *   return (
 *     <button onClick={handleStake} disabled={status === 'pending'}>
 *       {status === 'pending' ? 'Processing...' : 'Stake'}
 *     </button>
 *   );
 * }
 * ```
 */

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { openContractCall, type ContractCallOptions } from '@stacks/connect';
import { 
  ClarityValue,
  PostCondition,
  PostConditionMode,
} from '@stacks/transactions';
import { useWallet } from '@/lib/wallet-context';
import {
  estimateGas,
  getTransactionStatus,
  waitForConfirmation,
  retryTransaction,
  getTransactionHistory,
  getTransactionExplorerUrl,
  type TransactionStatus,
  type GasEstimation,
  type HistoricalTransaction,
  type RetryConfig,
} from '@/lib/transaction-utils';
import {
  parseTransactionError,
  type AppError,
} from '@/lib/error-handling';
import { CONTRACTS, parseContractId } from '@/lib/constants';

// ============================================================================
// Types
// ============================================================================

export interface TransactionState {
  txId: string | null;
  status: TransactionStatus | 'idle';
  blockHeight?: number;
  error: AppError | null;
  gasEstimate: GasEstimation | null;
}

export interface UseTransactionOptions {
  /** Auto-poll for confirmation */
  autoConfirm?: boolean;
  /** Polling interval in ms */
  pollInterval?: number;
  /** Confirmation timeout in ms */
  confirmTimeout?: number;
  /** Retry configuration */
  retryConfig?: Partial<RetryConfig>;
  /** Callbacks */
  onSuccess?: (txId: string, blockHeight: number) => void;
  onError?: (error: AppError) => void;
  onStatusChange?: (status: TransactionStatus) => void;
}

export interface ExecuteOptions {
  contractAddress: string;
  contractName: string;
  functionName: string;
  functionArgs: ClarityValue[];
  postConditions?: PostCondition[];
  postConditionMode?: PostConditionMode;
  fee?: bigint;
  onFinish?: (txId: string) => void;
  onCancel?: () => void;
}

export interface UseTransactionReturn {
  // State
  state: TransactionState;
  txId: string | null;
  status: TransactionStatus | 'idle';
  error: AppError | null;
  isProcessing: boolean;
  
  // Actions
  execute: (options: ExecuteOptions) => Promise<string | null>;
  executeWithRetry: (options: ExecuteOptions) => Promise<string | null>;
  checkStatus: (txId?: string) => Promise<TransactionStatus | 'idle'>;
  waitForConfirm: (txId?: string) => Promise<{ blockHeight: number }>;
  reset: () => void;
  
  // Utilities
  estimateGas: (
    functionName: string,
    functionArgs: ClarityValue[],
    contractName?: string
  ) => Promise<GasEstimation | null>;
  getExplorerUrl: (txId?: string) => string | null;
  
  // History
  history: HistoricalTransaction[];
  fetchHistory: () => Promise<void>;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useTransaction(
  options: UseTransactionOptions = {}
): UseTransactionReturn {
  const {
    autoConfirm = true,
    pollInterval = 5000,
    confirmTimeout = 300000,
    retryConfig,
    onSuccess,
    onError,
    onStatusChange,
  } = options;

  const { stxAddress, network, isConnected } = useWallet();
  
  // State
  const [state, setState] = useState<TransactionState>({
    txId: null,
    status: 'idle',
    error: null,
    gasEstimate: null,
  });
  const [history, setHistory] = useState<HistoricalTransaction[]>([]);
  
  // Refs
  const isMountedRef = useRef(true);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  // Update status
  const updateStatus = useCallback((newStatus: TransactionStatus) => {
    if (!isMountedRef.current) return;
    setState(prev => ({ ...prev, status: newStatus }));
    onStatusChange?.(newStatus);
  }, [onStatusChange]);

  // Execute a transaction
  const execute = useCallback(async (execOptions: ExecuteOptions): Promise<string | null> => {
    if (!isConnected || !stxAddress) {
      const error = parseTransactionError(new Error('Wallet not connected'));
      setState(prev => ({ ...prev, error }));
      onError?.(error);
      return null;
    }

    setState(prev => ({
      ...prev,
      status: 'pending',
      error: null,
      txId: null,
    }));

    try {
      return new Promise((resolve, reject) => {
        const callOptions: ContractCallOptions = {
          contractAddress: execOptions.contractAddress,
          contractName: execOptions.contractName,
          functionName: execOptions.functionName,
          functionArgs: execOptions.functionArgs,
          postConditions: execOptions.postConditions,
          postConditionMode: execOptions.postConditionMode || PostConditionMode.Deny,
          network,
          onFinish: (data) => {
            const txId = data.txId;
            if (isMountedRef.current) {
              setState(prev => ({ ...prev, txId, status: 'submitted' }));
            }
            execOptions.onFinish?.(txId);
            
            // Start confirmation polling if enabled
            if (autoConfirm) {
              pollForConfirmation(txId);
            }
            
            resolve(txId);
          },
          onCancel: () => {
            const error = parseTransactionError(new Error('Transaction cancelled'));
            if (isMountedRef.current) {
              setState(prev => ({ ...prev, status: 'idle', error }));
            }
            execOptions.onCancel?.();
            onError?.(error);
            resolve(null);
          },
        };

        openContractCall(callOptions).catch((err) => {
          const error = parseTransactionError(err);
          if (isMountedRef.current) {
            setState(prev => ({ ...prev, status: 'failed', error }));
          }
          onError?.(error);
          reject(error);
        });
      });
    } catch (err) {
      const error = parseTransactionError(err);
      if (isMountedRef.current) {
        setState(prev => ({ ...prev, status: 'failed', error }));
      }
      onError?.(error);
      return null;
    }
  }, [isConnected, stxAddress, network, autoConfirm, onError]);

  // Poll for confirmation
  const pollForConfirmation = useCallback(async (txId: string) => {
    const startTime = Date.now();
    
    const poll = async () => {
      if (!isMountedRef.current) return;
      
      try {
        const result = await getTransactionStatus(txId);
        
        if (result.status !== state.status) {
          updateStatus(result.status);
        }
        
        if (result.status === 'confirmed') {
          if (isMountedRef.current) {
            setState(prev => ({ ...prev, blockHeight: result.blockHeight }));
          }
          onSuccess?.(txId, result.blockHeight!);
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
          }
          return;
        }
        
        if (result.status === 'failed' || result.status === 'aborted') {
          const error = parseTransactionError(new Error(result.error || 'Transaction failed'));
          if (isMountedRef.current) {
            setState(prev => ({ ...prev, error }));
          }
          onError?.(error);
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
          }
          return;
        }
        
        // Check timeout
        if (Date.now() - startTime > confirmTimeout) {
          const error = parseTransactionError(new Error('Confirmation timeout'));
          if (isMountedRef.current) {
            setState(prev => ({ ...prev, error }));
          }
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
          }
          return;
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    };

    // Start polling
    poll();
    pollIntervalRef.current = setInterval(poll, pollInterval);
  }, [state.status, updateStatus, onSuccess, onError, confirmTimeout, pollInterval]);

  // Execute with retry
  const executeWithRetry = useCallback(async (execOptions: ExecuteOptions): Promise<string | null> => {
    return retryTransaction(
      () => execute(execOptions) as Promise<string>,
      retryConfig
    ).catch(() => null);
  }, [execute, retryConfig]);

  // Check transaction status
  const checkStatus = useCallback(async (txId?: string): Promise<TransactionStatus | 'idle'> => {
    const id = txId || state.txId;
    if (!id) return 'idle';
    
    const result = await getTransactionStatus(id);
    if (isMountedRef.current) {
      setState(prev => ({
        ...prev,
        status: result.status,
        blockHeight: result.blockHeight,
      }));
    }
    return result.status;
  }, [state.txId]);

  // Wait for confirmation
  const waitForConfirm = useCallback(async (txId?: string): Promise<{ blockHeight: number }> => {
    const id = txId || state.txId;
    if (!id) throw new Error('No transaction ID');
    
    return waitForConfirmation(id, {
      timeoutMs: confirmTimeout,
      pollIntervalMs: pollInterval,
      onStatusChange: updateStatus,
    });
  }, [state.txId, confirmTimeout, pollInterval, updateStatus]);

  // Reset state
  const reset = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
    setState({
      txId: null,
      status: 'idle',
      error: null,
      gasEstimate: null,
    });
  }, []);

  // Estimate gas for a function
  const estimateGasForFunction = useCallback(async (
    functionName: string,
    functionArgs: ClarityValue[],
    contractName?: string
  ): Promise<GasEstimation | null> => {
    if (!stxAddress) return null;
    
    try {
      // Default to timelock exchange contract
      const contract = contractName 
        ? parseContractId(CONTRACTS[contractName as keyof typeof CONTRACTS] || CONTRACTS.timelockExchange)
        : parseContractId(CONTRACTS.timelockExchange);
      
      const estimate = await estimateGas({
        contractAddress: contract.address,
        contractName: contract.name,
        functionName,
        functionArgs,
        senderAddress: stxAddress,
      });
      
      if (isMountedRef.current) {
        setState(prev => ({ ...prev, gasEstimate: estimate }));
      }
      
      return estimate;
    } catch (err) {
      console.error('Gas estimation failed:', err);
      return null;
    }
  }, [stxAddress]);

  // Get explorer URL
  const getExplorerUrl = useCallback((txId?: string): string | null => {
    const id = txId || state.txId;
    if (!id) return null;
    return getTransactionExplorerUrl(id);
  }, [state.txId]);

  // Fetch transaction history
  const fetchHistory = useCallback(async () => {
    if (!stxAddress) return;
    
    try {
      const txHistory = await getTransactionHistory(stxAddress, { limit: 50 });
      if (isMountedRef.current) {
        setHistory(txHistory);
      }
    } catch (err) {
      console.error('Failed to fetch history:', err);
    }
  }, [stxAddress]);

  // Load history on mount
  useEffect(() => {
    if (stxAddress) {
      fetchHistory();
    }
  }, [stxAddress, fetchHistory]);

  return {
    // State
    state,
    txId: state.txId,
    status: state.status,
    error: state.error,
    isProcessing: state.status === 'pending' || state.status === 'submitted',
    
    // Actions
    execute,
    executeWithRetry,
    checkStatus,
    waitForConfirm,
    reset,
    
    // Utilities
    estimateGas: estimateGasForFunction,
    getExplorerUrl,
    
    // History
    history,
    fetchHistory,
  };
}

// ============================================================================
// Specialized Transaction Hooks
// ============================================================================

/**
 * Hook for position-related transactions
 */
export function usePositionTransaction() {
  const { address: contractAddress, name: contractName } = parseContractId(CONTRACTS.timelockExchange);
  const tx = useTransaction();
  
  const createPosition = useCallback(async (
    amount: bigint,
    lockDays: number,
    postConditions?: PostCondition[]
  ) => {
    const { uintCV } = await import('@stacks/transactions');
    return tx.execute({
      contractAddress,
      contractName,
      functionName: 'create-position',
      functionArgs: [uintCV(amount), uintCV(lockDays)],
      postConditions,
    });
  }, [tx, contractAddress, contractName]);
  
  const withdraw = useCallback(async (
    positionId: number,
    postConditions?: PostCondition[]
  ) => {
    const { uintCV } = await import('@stacks/transactions');
    return tx.execute({
      contractAddress,
      contractName,
      functionName: 'withdraw',
      functionArgs: [uintCV(positionId)],
      postConditions,
    });
  }, [tx, contractAddress, contractName]);
  
  return {
    ...tx,
    createPosition,
    withdraw,
  };
}

/**
 * Hook for staking transactions
 */
export function useStakingTransaction() {
  const { address: contractAddress, name: contractName } = parseContractId(CONTRACTS.staking);
  const tx = useTransaction();
  
  const stake = useCallback(async (
    amount: bigint,
    postConditions?: PostCondition[]
  ) => {
    const { uintCV } = await import('@stacks/transactions');
    return tx.execute({
      contractAddress,
      contractName,
      functionName: 'stake',
      functionArgs: [uintCV(amount)],
      postConditions,
    });
  }, [tx, contractAddress, contractName]);
  
  const unstake = useCallback(async (
    amount: bigint,
    postConditions?: PostCondition[]
  ) => {
    const { uintCV } = await import('@stacks/transactions');
    return tx.execute({
      contractAddress,
      contractName,
      functionName: 'unstake',
      functionArgs: [uintCV(amount)],
      postConditions,
    });
  }, [tx, contractAddress, contractName]);
  
  return {
    ...tx,
    stake,
    unstake,
  };
}

// Default export
export default useTransaction;
