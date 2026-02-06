'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  openContractCall,
  ContractCallOptions,
} from '@stacks/connect';
import {
  principalCV,
  uintCV,
  listCV,
  tupleCV,
  stringAsciiCV,
  cvToValue,
  fetchCallReadOnlyFunction,
  ClarityValue,
} from '@stacks/transactions';
import { useWallet } from '@/lib/wallet-context';
import { CONTRACTS, parseContractId, ACTIVE_NETWORK, NETWORK } from '@/lib/constants';

// ============================================================================
// Types
// ============================================================================

export interface Recipient {
  address: string;
  amount: number;
  memo?: string;
}

export interface DistributionRecipient {
  address: string;
  percentage?: number;
  amount?: number;
}

export interface BatchTransferResult {
  success: boolean;
  txId?: string;
  error?: string;
  totalAmount: number;
  recipientCount: number;
}

export interface TransferHistory {
  id: number;
  sender: string;
  totalAmount: number;
  recipientCount: number;
  timestamp: number;
  txId: string;
  type: 'batch' | 'equal' | 'percentage';
}

export interface BatchTransferState {
  recipients: Recipient[];
  loading: boolean;
  error: string | null;
  pendingTx: string | null;
  history: TransferHistory[];
  totalAmount: number;
  estimatedFee: number;
}

// ============================================================================
// Constants - Using Mainnet Contract Address
// ============================================================================

/**
 * Batch Transfer contract deployed on mainnet
 * @see CONTRACTS.batchTransfer
 */
const { address: CONTRACT_ADDRESS, name: CONTRACT_NAME } = parseContractId(CONTRACTS.batchTransfer);
const BATCH_TRANSFER_CONTRACT = CONTRACTS.batchTransfer; // SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT.batch-transfer-v1

const MAX_RECIPIENTS = 200;
const MIN_AMOUNT = 1; // 1 micro-STX
const FEE_PER_RECIPIENT = 1000; // Estimated fee per recipient in micro-STX

// ============================================================================
// Hook Implementation
// ============================================================================

export function useBatchTransfer() {
  const { address, isConnected } = useWallet();
  
  const [state, setState] = useState<BatchTransferState>({
    recipients: [],
    loading: false,
    error: null,
    pendingTx: null,
    history: [],
    totalAmount: 0,
    estimatedFee: 0,
  });

  // Calculate totals when recipients change
  useEffect(() => {
    const totalAmount = state.recipients.reduce((sum, r) => sum + r.amount, 0);
    const estimatedFee = state.recipients.length * FEE_PER_RECIPIENT;
    setState(prev => ({ ...prev, totalAmount, estimatedFee }));
  }, [state.recipients]);

  // Add recipient
  const addRecipient = useCallback((recipient: Recipient) => {
    setState(prev => {
      if (prev.recipients.length >= MAX_RECIPIENTS) {
        return { ...prev, error: `Maximum ${MAX_RECIPIENTS} recipients allowed` };
      }
      
      // Validate address format
      if (!recipient.address.startsWith('SP') && !recipient.address.startsWith('ST')) {
        return { ...prev, error: 'Invalid address format' };
      }
      
      // Validate amount
      if (recipient.amount < MIN_AMOUNT) {
        return { ...prev, error: 'Amount must be at least 1 micro-STX' };
      }
      
      return {
        ...prev,
        recipients: [...prev.recipients, recipient],
        error: null,
      };
    });
  }, []);

  // Add multiple recipients at once
  const addRecipients = useCallback((recipients: Recipient[]) => {
    setState(prev => {
      const totalCount = prev.recipients.length + recipients.length;
      if (totalCount > MAX_RECIPIENTS) {
        return { ...prev, error: `Maximum ${MAX_RECIPIENTS} recipients allowed` };
      }
      
      // Validate all recipients
      for (const recipient of recipients) {
        if (!recipient.address.startsWith('SP') && !recipient.address.startsWith('ST')) {
          return { ...prev, error: `Invalid address: ${recipient.address}` };
        }
        if (recipient.amount < MIN_AMOUNT) {
          return { ...prev, error: `Invalid amount for ${recipient.address}` };
        }
      }
      
      return {
        ...prev,
        recipients: [...prev.recipients, ...recipients],
        error: null,
      };
    });
  }, []);

  // Remove recipient by index
  const removeRecipient = useCallback((index: number) => {
    setState(prev => ({
      ...prev,
      recipients: prev.recipients.filter((_, i) => i !== index),
    }));
  }, []);

  // Update recipient
  const updateRecipient = useCallback((index: number, updates: Partial<Recipient>) => {
    setState(prev => ({
      ...prev,
      recipients: prev.recipients.map((r, i) => 
        i === index ? { ...r, ...updates } : r
      ),
    }));
  }, []);

  // Clear all recipients
  const clearRecipients = useCallback(() => {
    setState(prev => ({
      ...prev,
      recipients: [],
      error: null,
    }));
  }, []);

  // Parse CSV input
  const parseCSV = useCallback((csvContent: string): Recipient[] => {
    const lines = csvContent.trim().split('\n');
    const recipients: Recipient[] = [];
    
    for (const line of lines) {
      const parts = line.split(',').map(p => p.trim());
      if (parts.length >= 2) {
        const address = parts[0];
        const amount = parseFloat(parts[1]) * 1_000_000; // Convert to micro-STX
        const memo = parts[2] || undefined;
        
        if (address && !isNaN(amount) && amount > 0) {
          recipients.push({ address, amount, memo });
        }
      }
    }
    
    return recipients;
  }, []);

  // Import from CSV
  const importFromCSV = useCallback((csvContent: string) => {
    try {
      const recipients = parseCSV(csvContent);
      if (recipients.length === 0) {
        setState(prev => ({ ...prev, error: 'No valid recipients found in CSV' }));
        return;
      }
      addRecipients(recipients);
    } catch (err) {
      setState(prev => ({ ...prev, error: 'Failed to parse CSV' }));
    }
  }, [parseCSV, addRecipients]);

  // Export to CSV
  const exportToCSV = useCallback((): string => {
    return state.recipients
      .map(r => `${r.address},${r.amount / 1_000_000}${r.memo ? `,${r.memo}` : ''}`)
      .join('\n');
  }, [state.recipients]);

  // Execute batch STX transfer
  const executeBatchTransfer = useCallback(async (): Promise<BatchTransferResult> => {
    if (!isConnected || !address) {
      return { success: false, error: 'Wallet not connected', totalAmount: 0, recipientCount: 0 };
    }

    if (state.recipients.length === 0) {
      return { success: false, error: 'No recipients', totalAmount: 0, recipientCount: 0 };
    }

    if (state.recipients.length > MAX_RECIPIENTS) {
      return { success: false, error: `Max ${MAX_RECIPIENTS} recipients`, totalAmount: 0, recipientCount: 0 };
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Build recipients list for contract
      const recipientsList = state.recipients.map(r =>
        tupleCV({
          to: principalCV(r.address),
          amount: uintCV(r.amount),
          memo: r.memo ? stringAsciiCV(r.memo.slice(0, 34)) : stringAsciiCV(''),
        })
      );

      const options: ContractCallOptions = {
        network: NETWORK,
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: 'batch-stx-transfer',
        functionArgs: [listCV(recipientsList)],
        onFinish: (data) => {
          setState(prev => ({
            ...prev,
            loading: false,
            pendingTx: data.txId,
          }));
        },
        onCancel: () => {
          setState(prev => ({ ...prev, loading: false, error: 'Transaction cancelled' }));
        },
      };

      await openContractCall(options);

      return {
        success: true,
        totalAmount: state.totalAmount,
        recipientCount: state.recipients.length,
      };
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Transfer failed';
      setState(prev => ({ ...prev, loading: false, error }));
      return { success: false, error, totalAmount: 0, recipientCount: 0 };
    }
  }, [isConnected, address, state.recipients, state.totalAmount]);

  // Distribute equal amounts
  const distributeEqual = useCallback(async (
    addresses: string[],
    totalAmount: number
  ): Promise<BatchTransferResult> => {
    if (!isConnected || !address) {
      return { success: false, error: 'Wallet not connected', totalAmount: 0, recipientCount: 0 };
    }

    if (addresses.length === 0) {
      return { success: false, error: 'No recipients', totalAmount: 0, recipientCount: 0 };
    }

    if (addresses.length > MAX_RECIPIENTS) {
      return { success: false, error: `Max ${MAX_RECIPIENTS} recipients`, totalAmount: 0, recipientCount: 0 };
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const addressList = addresses.map(addr => principalCV(addr));

      const options: ContractCallOptions = {
        network: NETWORK,
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: 'distribute-equal',
        functionArgs: [
          listCV(addressList),
          uintCV(totalAmount),
        ],
        onFinish: (data) => {
          setState(prev => ({
            ...prev,
            loading: false,
            pendingTx: data.txId,
          }));
        },
        onCancel: () => {
          setState(prev => ({ ...prev, loading: false, error: 'Transaction cancelled' }));
        },
      };

      await openContractCall(options);

      return {
        success: true,
        totalAmount,
        recipientCount: addresses.length,
      };
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Distribution failed';
      setState(prev => ({ ...prev, loading: false, error }));
      return { success: false, error, totalAmount: 0, recipientCount: 0 };
    }
  }, [isConnected, address]);

  // Distribute by percentage
  const distributeByPercentage = useCallback(async (
    recipients: { address: string; percentage: number }[],
    totalAmount: number
  ): Promise<BatchTransferResult> => {
    if (!isConnected || !address) {
      return { success: false, error: 'Wallet not connected', totalAmount: 0, recipientCount: 0 };
    }

    if (recipients.length === 0) {
      return { success: false, error: 'No recipients', totalAmount: 0, recipientCount: 0 };
    }

    // Validate percentages sum to 100
    const totalPercentage = recipients.reduce((sum, r) => sum + r.percentage, 0);
    if (totalPercentage !== 100) {
      return { success: false, error: 'Percentages must sum to 100', totalAmount: 0, recipientCount: 0 };
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const recipientsList = recipients.map(r =>
        tupleCV({
          to: principalCV(r.address),
          percentage: uintCV(r.percentage),
        })
      );

      const options: ContractCallOptions = {
        network: NETWORK,
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: 'distribute-percentage',
        functionArgs: [
          listCV(recipientsList),
          uintCV(totalAmount),
        ],
        onFinish: (data) => {
          setState(prev => ({
            ...prev,
            loading: false,
            pendingTx: data.txId,
          }));
        },
        onCancel: () => {
          setState(prev => ({ ...prev, loading: false, error: 'Transaction cancelled' }));
        },
      };

      await openContractCall(options);

      return {
        success: true,
        totalAmount,
        recipientCount: recipients.length,
      };
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Distribution failed';
      setState(prev => ({ ...prev, loading: false, error }));
      return { success: false, error, totalAmount: 0, recipientCount: 0 };
    }
  }, [isConnected, address]);

  // Get user transfer stats
  const getUserStats = useCallback(async (userAddress?: string): Promise<{
    totalSent: number;
    transferCount: number;
    recipientCount: number;
  } | null> => {
    const target = userAddress || address;
    if (!target) return null;

    try {
      const result = await fetchCallReadOnlyFunction({
        network: NETWORK,
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: 'get-user-stats',
        functionArgs: [principalCV(target)],
        senderAddress: target,
      });

      const value = cvToValue(result);
      if (value) {
        return {
          totalSent: Number(value['total-sent']) || 0,
          transferCount: Number(value['transfer-count']) || 0,
          recipientCount: Number(value['recipient-count']) || 0,
        };
      }
      return null;
    } catch (err) {
      console.error('Failed to get user stats:', err);
      return null;
    }
  }, [address]);

  // Get contract stats
  const getContractStats = useCallback(async (): Promise<{
    totalTransfers: number;
    totalVolume: number;
    totalRecipients: number;
  } | null> => {
    try {
      const result = await fetchCallReadOnlyFunction({
        network: NETWORK,
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: 'get-contract-stats',
        functionArgs: [],
        senderAddress: CONTRACT_ADDRESS,
      });

      const value = cvToValue(result);
      if (value) {
        return {
          totalTransfers: Number(value['total-transfers']) || 0,
          totalVolume: Number(value['total-volume']) || 0,
          totalRecipients: Number(value['total-recipients']) || 0,
        };
      }
      return null;
    } catch (err) {
      console.error('Failed to get contract stats:', err);
      return null;
    }
  }, []);

  // Validate recipients list
  const validateRecipients = useCallback((): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (state.recipients.length === 0) {
      errors.push('No recipients added');
    }

    if (state.recipients.length > MAX_RECIPIENTS) {
      errors.push(`Maximum ${MAX_RECIPIENTS} recipients allowed`);
    }

    const addressSet = new Set<string>();
    state.recipients.forEach((r, i) => {
      if (!r.address.startsWith('SP') && !r.address.startsWith('ST')) {
        errors.push(`Invalid address at row ${i + 1}`);
      }
      if (r.amount < MIN_AMOUNT) {
        errors.push(`Invalid amount at row ${i + 1}`);
      }
      if (addressSet.has(r.address)) {
        errors.push(`Duplicate address at row ${i + 1}`);
      }
      addressSet.add(r.address);
    });

    return { valid: errors.length === 0, errors };
  }, [state.recipients]);

  // Calculate amounts for equal distribution preview
  const previewEqualDistribution = useCallback((
    addresses: string[],
    totalAmount: number
  ): Recipient[] => {
    if (addresses.length === 0) return [];
    const amountPerRecipient = Math.floor(totalAmount / addresses.length);
    return addresses.map(address => ({ address, amount: amountPerRecipient }));
  }, []);

  // Calculate amounts for percentage distribution preview
  const previewPercentageDistribution = useCallback((
    recipients: { address: string; percentage: number }[],
    totalAmount: number
  ): Recipient[] => {
    return recipients.map(r => ({
      address: r.address,
      amount: Math.floor((totalAmount * r.percentage) / 100),
    }));
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    // State
    recipients: state.recipients,
    loading: state.loading,
    error: state.error,
    pendingTx: state.pendingTx,
    history: state.history,
    totalAmount: state.totalAmount,
    estimatedFee: state.estimatedFee,
    
    // Recipient management
    addRecipient,
    addRecipients,
    removeRecipient,
    updateRecipient,
    clearRecipients,
    
    // CSV operations
    importFromCSV,
    exportToCSV,
    parseCSV,
    
    // Transfer operations
    executeBatchTransfer,
    distributeEqual,
    distributeByPercentage,
    
    // Read operations
    getUserStats,
    getContractStats,
    
    // Utilities
    validateRecipients,
    previewEqualDistribution,
    previewPercentageDistribution,
    clearError,
    
    // Constants
    MAX_RECIPIENTS,
    MIN_AMOUNT,
  };
}

export default useBatchTransfer;
