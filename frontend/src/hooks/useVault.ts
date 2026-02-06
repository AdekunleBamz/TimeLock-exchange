/**
 * useVault - React hook for vault contract interactions
 * Manages secure multi-asset vaults with time-delayed withdrawals
 */

'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useWallet } from '@/lib/wallet-context';
import {
  callReadOnlyFunction,
  cvToValue,
  uintCV,
  principalCV,
  PostConditionMode,
  makeStandardSTXPostCondition,
  FungibleConditionCode,
} from '@stacks/transactions';
import { openContractCall } from '@stacks/connect';
import { getNetwork } from '@/lib/contracts';
import { CONTRACTS, parseContractId } from '@/lib/constants';

// ============================================================================
// Types
// ============================================================================

export interface Vault {
  id: number;
  owner: string;
  stxBalance: number;
  createdAt: number;
  lastWithdrawal: number;
  dailyLimitBps: number;
  withdrawalDelay: number;
  isLocked: boolean;
  lockUntil: number;
  totalDeposited: number;
  totalWithdrawn: number;
}

export interface PendingWithdrawal {
  vaultId: number;
  requestId: number;
  amount: number;
  assetType: string;
  requestedAt: number;
  executeAfter: number;
  isExecuted: boolean;
  isCancelled: boolean;
  canExecute: boolean;
  timeRemaining: number;
}

export interface VaultStats {
  balance: number;
  totalDeposited: number;
  totalWithdrawn: number;
  dailyRemaining: number;
  isLocked: boolean;
  lockUntil: number;
  pendingRequests: number;
}

export interface UseVaultReturn {
  // State
  vaults: Vault[];
  selectedVault: Vault | null;
  pendingWithdrawals: PendingWithdrawal[];
  vaultStats: VaultStats | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  createVault: (dailyLimitBps: number, withdrawalDelay: number) => Promise<string | null>;
  deposit: (vaultId: number, amount: number) => Promise<string | null>;
  requestWithdrawal: (vaultId: number, amount: number) => Promise<string | null>;
  executeWithdrawal: (vaultId: number, requestId: number) => Promise<string | null>;
  cancelWithdrawal: (vaultId: number, requestId: number) => Promise<string | null>;
  lockVault: (vaultId: number, duration: number) => Promise<string | null>;
  unlockVault: (vaultId: number) => Promise<string | null>;
  addGuardian: (vaultId: number, guardian: string) => Promise<string | null>;
  removeGuardian: (vaultId: number, guardian: string) => Promise<string | null>;
  updateDailyLimit: (vaultId: number, newLimitBps: number) => Promise<string | null>;
  
  // Queries
  selectVault: (vaultId: number) => void;
  refreshVaults: () => Promise<void>;
  refreshPendingWithdrawals: (vaultId: number) => Promise<void>;
}

// ============================================================================
// Contract Configuration - Mainnet
// ============================================================================

// Use the deployed vault contract address
const { address: VAULT_ADDRESS, name: VAULT_NAME } = parseContractId(CONTRACTS.vault);
const MICRO_STX = 1_000_000;

function getContractInfo() {
  return { address: VAULT_ADDRESS, name: VAULT_NAME };
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useVault(): UseVaultReturn {
  const { stxAddress, isConnected } = useWallet();
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [selectedVault, setSelectedVault] = useState<Vault | null>(null);
  const [pendingWithdrawals, setPendingWithdrawals] = useState<PendingWithdrawal[]>([]);
  const [vaultStats, setVaultStats] = useState<VaultStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const network = useMemo(() => getNetwork(), []);
  const { address: contractAddress, name: contractName } = getContractInfo();

  // ============================================================================
  // Read Functions
  // ============================================================================

  const fetchVault = useCallback(async (vaultId: number): Promise<Vault | null> => {
    try {
      const result = await callReadOnlyFunction({
        contractAddress,
        contractName,
        functionName: 'get-vault',
        functionArgs: [uintCV(vaultId)],
        network,
        senderAddress: contractAddress,
      });

      const data = cvToValue(result);
      if (!data) return null;

      return {
        id: vaultId,
        owner: data.owner,
        stxBalance: data['stx-balance'].value / MICRO_STX,
        createdAt: data['created-at'].value,
        lastWithdrawal: data['last-withdrawal'].value,
        dailyLimitBps: data['daily-limit-bps'].value,
        withdrawalDelay: data['withdrawal-delay'].value,
        isLocked: data['is-locked'],
        lockUntil: data['lock-until'].value,
        totalDeposited: data['total-deposited'].value / MICRO_STX,
        totalWithdrawn: data['total-withdrawn'].value / MICRO_STX,
      };
    } catch (err) {
      console.error('Error fetching vault:', err);
      return null;
    }
  }, [contractAddress, contractName, network]);

  const fetchVaultStats = useCallback(async (vaultId: number): Promise<VaultStats | null> => {
    try {
      const result = await callReadOnlyFunction({
        contractAddress,
        contractName,
        functionName: 'get-vault-stats',
        functionArgs: [uintCV(vaultId)],
        network,
        senderAddress: contractAddress,
      });

      const data = cvToValue(result);
      return {
        balance: data.balance.value / MICRO_STX,
        totalDeposited: data['total-deposited'].value / MICRO_STX,
        totalWithdrawn: data['total-withdrawn'].value / MICRO_STX,
        dailyRemaining: data['daily-remaining'].value / MICRO_STX,
        isLocked: data['is-locked'],
        lockUntil: data['lock-until'].value,
        pendingRequests: data['pending-requests'].value,
      };
    } catch (err) {
      console.error('Error fetching vault stats:', err);
      return null;
    }
  }, [contractAddress, contractName, network]);

  const fetchVaultCount = useCallback(async (): Promise<number> => {
    try {
      const result = await callReadOnlyFunction({
        contractAddress,
        contractName,
        functionName: 'get-vault-count',
        functionArgs: [],
        network,
        senderAddress: contractAddress,
      });
      return cvToValue(result).value || 0;
    } catch {
      return 0;
    }
  }, [contractAddress, contractName, network]);

  const fetchPendingWithdrawal = useCallback(async (
    vaultId: number, 
    requestId: number
  ): Promise<PendingWithdrawal | null> => {
    try {
      const result = await callReadOnlyFunction({
        contractAddress,
        contractName,
        functionName: 'get-pending-withdrawal',
        functionArgs: [uintCV(vaultId), uintCV(requestId)],
        network,
        senderAddress: contractAddress,
      });

      const data = cvToValue(result);
      if (!data) return null;

      const executeAfter = data['execute-after'].value;
      const currentBlock = Math.floor(Date.now() / 600000); // Rough estimate

      return {
        vaultId,
        requestId,
        amount: data.amount.value / MICRO_STX,
        assetType: data['asset-type'],
        requestedAt: data['requested-at'].value,
        executeAfter,
        isExecuted: data['is-executed'],
        isCancelled: data['is-cancelled'],
        canExecute: currentBlock >= executeAfter && !data['is-executed'] && !data['is-cancelled'],
        timeRemaining: Math.max(0, (executeAfter - currentBlock) * 10), // minutes
      };
    } catch (err) {
      console.error('Error fetching pending withdrawal:', err);
      return null;
    }
  }, [contractAddress, contractName, network]);

  // ============================================================================
  // Refresh Functions
  // ============================================================================

  const refreshVaults = useCallback(async () => {
    if (!stxAddress) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const count = await fetchVaultCount();
      const userVaults: Vault[] = [];

      // Fetch all vaults and filter by owner
      for (let i = 1; i <= count; i++) {
        const vault = await fetchVault(i);
        if (vault && vault.owner === stxAddress) {
          userVaults.push(vault);
        }
      }

      setVaults(userVaults);
    } catch (err) {
      setError('Failed to fetch vaults');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [stxAddress, fetchVaultCount, fetchVault]);

  const refreshPendingWithdrawals = useCallback(async (vaultId: number) => {
    try {
      const stats = await fetchVaultStats(vaultId);
      if (!stats) return;

      const withdrawals: PendingWithdrawal[] = [];
      for (let i = 1; i <= stats.pendingRequests; i++) {
        const withdrawal = await fetchPendingWithdrawal(vaultId, i);
        if (withdrawal && !withdrawal.isExecuted && !withdrawal.isCancelled) {
          withdrawals.push(withdrawal);
        }
      }

      setPendingWithdrawals(withdrawals);
      setVaultStats(stats);
    } catch (err) {
      console.error('Error refreshing pending withdrawals:', err);
    }
  }, [fetchVaultStats, fetchPendingWithdrawal]);

  const selectVault = useCallback(async (vaultId: number) => {
    const vault = vaults.find(v => v.id === vaultId) || await fetchVault(vaultId);
    setSelectedVault(vault);
    if (vault) {
      await refreshPendingWithdrawals(vaultId);
    }
  }, [vaults, fetchVault, refreshPendingWithdrawals]);

  // ============================================================================
  // Write Functions
  // ============================================================================

  const createVault = useCallback(async (
    dailyLimitBps: number,
    withdrawalDelay: number
  ): Promise<string | null> => {
    if (!stxAddress) return null;

    return new Promise((resolve) => {
      openContractCall({
        contractAddress,
        contractName,
        functionName: 'create-vault',
        functionArgs: [uintCV(dailyLimitBps), uintCV(withdrawalDelay)],
        postConditionMode: PostConditionMode.Allow,
        onFinish: (data) => {
          refreshVaults();
          resolve(data.txId);
        },
        onCancel: () => resolve(null),
      });
    });
  }, [stxAddress, contractAddress, contractName, refreshVaults]);

  const deposit = useCallback(async (vaultId: number, amount: number): Promise<string | null> => {
    if (!stxAddress) return null;

    const amountMicro = Math.floor(amount * MICRO_STX);

    return new Promise((resolve) => {
      openContractCall({
        contractAddress,
        contractName,
        functionName: 'deposit',
        functionArgs: [uintCV(vaultId), uintCV(amountMicro)],
        postConditionMode: PostConditionMode.Deny,
        postConditions: [
          makeStandardSTXPostCondition(
            stxAddress,
            FungibleConditionCode.LessEqual,
            BigInt(amountMicro)
          ),
        ],
        onFinish: (data) => {
          refreshVaults();
          resolve(data.txId);
        },
        onCancel: () => resolve(null),
      });
    });
  }, [stxAddress, contractAddress, contractName, refreshVaults]);

  const requestWithdrawal = useCallback(async (
    vaultId: number, 
    amount: number
  ): Promise<string | null> => {
    if (!stxAddress) return null;

    const amountMicro = Math.floor(amount * MICRO_STX);

    return new Promise((resolve) => {
      openContractCall({
        contractAddress,
        contractName,
        functionName: 'request-withdrawal',
        functionArgs: [uintCV(vaultId), uintCV(amountMicro)],
        postConditionMode: PostConditionMode.Allow,
        onFinish: (data) => {
          refreshPendingWithdrawals(vaultId);
          resolve(data.txId);
        },
        onCancel: () => resolve(null),
      });
    });
  }, [stxAddress, contractAddress, contractName, refreshPendingWithdrawals]);

  const executeWithdrawal = useCallback(async (
    vaultId: number, 
    requestId: number
  ): Promise<string | null> => {
    if (!stxAddress) return null;

    return new Promise((resolve) => {
      openContractCall({
        contractAddress,
        contractName,
        functionName: 'execute-withdrawal',
        functionArgs: [uintCV(vaultId), uintCV(requestId)],
        postConditionMode: PostConditionMode.Allow,
        onFinish: (data) => {
          refreshVaults();
          refreshPendingWithdrawals(vaultId);
          resolve(data.txId);
        },
        onCancel: () => resolve(null),
      });
    });
  }, [stxAddress, contractAddress, contractName, refreshVaults, refreshPendingWithdrawals]);

  const cancelWithdrawal = useCallback(async (
    vaultId: number, 
    requestId: number
  ): Promise<string | null> => {
    if (!stxAddress) return null;

    return new Promise((resolve) => {
      openContractCall({
        contractAddress,
        contractName,
        functionName: 'cancel-withdrawal',
        functionArgs: [uintCV(vaultId), uintCV(requestId)],
        postConditionMode: PostConditionMode.Allow,
        onFinish: (data) => {
          refreshPendingWithdrawals(vaultId);
          resolve(data.txId);
        },
        onCancel: () => resolve(null),
      });
    });
  }, [stxAddress, contractAddress, contractName, refreshPendingWithdrawals]);

  const lockVault = useCallback(async (
    vaultId: number, 
    duration: number
  ): Promise<string | null> => {
    if (!stxAddress) return null;

    return new Promise((resolve) => {
      openContractCall({
        contractAddress,
        contractName,
        functionName: 'lock-vault',
        functionArgs: [uintCV(vaultId), uintCV(duration)],
        postConditionMode: PostConditionMode.Allow,
        onFinish: (data) => {
          refreshVaults();
          resolve(data.txId);
        },
        onCancel: () => resolve(null),
      });
    });
  }, [stxAddress, contractAddress, contractName, refreshVaults]);

  const unlockVault = useCallback(async (vaultId: number): Promise<string | null> => {
    if (!stxAddress) return null;

    return new Promise((resolve) => {
      openContractCall({
        contractAddress,
        contractName,
        functionName: 'unlock-vault',
        functionArgs: [uintCV(vaultId)],
        postConditionMode: PostConditionMode.Allow,
        onFinish: (data) => {
          refreshVaults();
          resolve(data.txId);
        },
        onCancel: () => resolve(null),
      });
    });
  }, [stxAddress, contractAddress, contractName, refreshVaults]);

  const addGuardian = useCallback(async (
    vaultId: number, 
    guardian: string
  ): Promise<string | null> => {
    if (!stxAddress) return null;

    return new Promise((resolve) => {
      openContractCall({
        contractAddress,
        contractName,
        functionName: 'add-guardian',
        functionArgs: [uintCV(vaultId), principalCV(guardian)],
        postConditionMode: PostConditionMode.Allow,
        onFinish: (data) => resolve(data.txId),
        onCancel: () => resolve(null),
      });
    });
  }, [stxAddress, contractAddress, contractName]);

  const removeGuardian = useCallback(async (
    vaultId: number, 
    guardian: string
  ): Promise<string | null> => {
    if (!stxAddress) return null;

    return new Promise((resolve) => {
      openContractCall({
        contractAddress,
        contractName,
        functionName: 'remove-guardian',
        functionArgs: [uintCV(vaultId), principalCV(guardian)],
        postConditionMode: PostConditionMode.Allow,
        onFinish: (data) => resolve(data.txId),
        onCancel: () => resolve(null),
      });
    });
  }, [stxAddress, contractAddress, contractName]);

  const updateDailyLimit = useCallback(async (
    vaultId: number, 
    newLimitBps: number
  ): Promise<string | null> => {
    if (!stxAddress) return null;

    return new Promise((resolve) => {
      openContractCall({
        contractAddress,
        contractName,
        functionName: 'update-daily-limit',
        functionArgs: [uintCV(vaultId), uintCV(newLimitBps)],
        postConditionMode: PostConditionMode.Allow,
        onFinish: (data) => {
          refreshVaults();
          resolve(data.txId);
        },
        onCancel: () => resolve(null),
      });
    });
  }, [stxAddress, contractAddress, contractName, refreshVaults]);

  // ============================================================================
  // Effects
  // ============================================================================

  useEffect(() => {
    if (isConnected && stxAddress) {
      refreshVaults();
    }
  }, [isConnected, stxAddress, refreshVaults]);

  // ============================================================================
  // Return
  // ============================================================================

  return {
    vaults,
    selectedVault,
    pendingWithdrawals,
    vaultStats,
    isLoading,
    error,
    createVault,
    deposit,
    requestWithdrawal,
    executeWithdrawal,
    cancelWithdrawal,
    lockVault,
    unlockVault,
    addGuardian,
    removeGuardian,
    updateDailyLimit,
    selectVault,
    refreshVaults,
    refreshPendingWithdrawals,
  };
}

export default useVault;
