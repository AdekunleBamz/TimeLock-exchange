import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '../lib/wallet-context';
import { TIMELOCK_EXCHANGE_CONTRACT, getPauseStatus } from '../lib/contracts';
import type { PauseStatus } from '../lib/types';
import { openContractCall } from '@stacks/connect';
import { callReadOnlyFunction, cvToValue, standardPrincipalCV } from '@stacks/transactions';

interface UseContractStatusReturn {
  isPaused: boolean;
  pauseStatus: PauseStatus | null;
  isAdmin: boolean;
  isLoading: boolean;
  error: string | null;
  pause: (reason: string) => Promise<void>;
  unpause: () => Promise<void>;
  refetch: () => Promise<void>;
}

export function useContractStatus(): UseContractStatusReturn {
  const { address, isConnected, network } = useWallet();
  const [pauseStatus, setPauseStatus] = useState<PauseStatus | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const status = await getPauseStatus();
      setPauseStatus(status);

      // Check if current user is admin
      if (isConnected && address) {
        const adminResult = await callReadOnlyFunction({
          contractAddress: TIMELOCK_EXCHANGE_CONTRACT.address,
          contractName: TIMELOCK_EXCHANGE_CONTRACT.name,
          functionName: 'is-admin',
          functionArgs: [standardPrincipalCV(address)],
          network,
          senderAddress: address,
        });
        setIsAdmin(cvToValue(adminResult) === true);
      } else {
        setIsAdmin(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch contract status');
    } finally {
      setIsLoading(false);
    }
  }, [address, isConnected, network]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const pause = useCallback(async (reason: string) => {
    if (!isConnected || !address || !isAdmin) {
      throw new Error('Not authorized to pause contract');
    }

    try {
      await openContractCall({
        contractAddress: TIMELOCK_EXCHANGE_CONTRACT.address,
        contractName: TIMELOCK_EXCHANGE_CONTRACT.name,
        functionName: 'emergency-pause',
        functionArgs: [],
        network,
        onFinish: (data) => {
          console.log('Pause transaction:', data, 'Reason:', reason);
          setTimeout(fetchStatus, 5000);
        },
        onCancel: () => {
          throw new Error('Transaction cancelled');
        },
      });
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to pause contract');
    }
  }, [address, isConnected, isAdmin, network, fetchStatus]);

  const unpause = useCallback(async () => {
    if (!isConnected || !address || !isAdmin) {
      throw new Error('Not authorized to unpause contract');
    }

    try {
      await openContractCall({
        contractAddress: TIMELOCK_EXCHANGE_CONTRACT.address,
        contractName: TIMELOCK_EXCHANGE_CONTRACT.name,
        functionName: 'emergency-unpause',
        functionArgs: [],
        network,
        onFinish: (data) => {
          console.log('Unpause transaction:', data);
          setTimeout(fetchStatus, 5000);
        },
        onCancel: () => {
          throw new Error('Transaction cancelled');
        },
      });
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to unpause contract');
    }
  }, [address, isConnected, isAdmin, network, fetchStatus]);

  return {
    isPaused: pauseStatus?.isPaused ?? false,
    pauseStatus,
    isAdmin,
    isLoading,
    error,
    pause,
    unpause,
    refetch: fetchStatus,
  };
}

// Hook for contract version and info
export function useContractInfo() {
  const { network } = useWallet();
  const [info, setInfo] = useState<{
    version: string;
    deployedAt: bigint;
    totalPositions: number;
    totalLocked: bigint;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchInfo = async () => {
      setIsLoading(true);
      try {
        const [positionCountResult, totalLockedResult] = await Promise.all([
          callReadOnlyFunction({
            contractAddress: TIMELOCK_EXCHANGE_CONTRACT.address,
            contractName: TIMELOCK_EXCHANGE_CONTRACT.name,
            functionName: 'get-total-positions',
            functionArgs: [],
            network,
            senderAddress: TIMELOCK_EXCHANGE_CONTRACT.address,
          }),
          callReadOnlyFunction({
            contractAddress: TIMELOCK_EXCHANGE_CONTRACT.address,
            contractName: TIMELOCK_EXCHANGE_CONTRACT.name,
            functionName: 'get-total-locked-value',
            functionArgs: [],
            network,
            senderAddress: TIMELOCK_EXCHANGE_CONTRACT.address,
          }),
        ]);

        setInfo({
          version: '2.0.0', // Contract version with Clarity 4 features
          deployedAt: BigInt(0), // Would come from deployment info
          totalPositions: Number(cvToValue(positionCountResult) || 0),
          totalLocked: BigInt(cvToValue(totalLockedResult) || 0),
        });
      } catch (err) {
        console.error('Failed to fetch contract info:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInfo();
  }, [network]);

  return { info, isLoading };
}
