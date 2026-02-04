/**
 * useStacks - React hooks for @stacks/connect and @stacks/transactions integration
 * 
 * This module provides a comprehensive set of React hooks for interacting with
 * the Stacks blockchain using the official Stacks.js SDKs.
 * 
 * @stacks/connect - For wallet authentication, user sessions, and contract calls
 * @stacks/transactions - For building, signing, and broadcasting transactions
 * 
 * @example
 * ```tsx
 * import { useStacksAuth, useContractCall, useReadContract } from '@/hooks/useStacks';
 * 
 * function MyComponent() {
 *   const { connect, disconnect, isConnected, address } = useStacksAuth();
 *   const { execute, isLoading } = useContractCall();
 *   const { data } = useReadContract('timelock-exchange', 'get-position-count');
 *   
 *   return <div>Connected: {isConnected ? address : 'Not connected'}</div>;
 * }
 * ```
 */

'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  showConnect,
  openContractCall,
  openSTXTransfer,
  UserSession,
  AppConfig,
  showSignMessage,
} from '@stacks/connect';
import {
  callReadOnlyFunction,
  cvToValue,
  uintCV,
  intCV,
  principalCV,
  bufferCV,
  stringAsciiCV,
  stringUtf8CV,
  boolCV,
  noneCV,
  someCV,
  listCV,
  tupleCV,
  ClarityValue,
  PostConditionMode,
  makeStandardSTXPostCondition,
  makeContractSTXPostCondition,
  makeStandardFungiblePostCondition,
  makeContractFungiblePostCondition,
  makeStandardNonFungiblePostCondition,
  makeContractNonFungiblePostCondition,
  FungibleConditionCode,
  NonFungibleConditionCode,
  createAssetInfo,
  hexToCV,
  cvToHex,
  cvToJSON,
  serializeCV,
  deserializeCV,
} from '@stacks/transactions';
import { StacksMainnet, StacksTestnet, StacksDevnet, StacksNetwork } from '@stacks/network';
import { ACTIVE_NETWORK, APP_DETAILS, CONTRACTS, parseContractId } from '@/lib/constants';

// ============================================================================
// Types
// ============================================================================

export interface StacksAuthState {
  isConnected: boolean;
  isLoading: boolean;
  address: string | null;
  addresses: {
    mainnet: string | null;
    testnet: string | null;
  };
  publicKey: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  signMessage: (message: string) => Promise<string | null>;
}

export interface ContractCallOptions {
  contractAddress: string;
  contractName: string;
  functionName: string;
  functionArgs: ClarityValue[];
  postConditions?: any[];
  postConditionMode?: PostConditionMode;
  onSuccess?: (txId: string) => void;
  onError?: (error: Error) => void;
  onCancel?: () => void;
}

export interface STXTransferOptions {
  recipient: string;
  amount: bigint;
  memo?: string;
  onSuccess?: (txId: string) => void;
  onError?: (error: Error) => void;
  onCancel?: () => void;
}

export interface ReadContractOptions {
  contractAddress?: string;
  contractName: string;
  functionName: string;
  functionArgs?: ClarityValue[];
  senderAddress?: string;
}

export interface UseContractCallReturn {
  execute: (options: ContractCallOptions) => Promise<string | null>;
  isLoading: boolean;
  error: Error | null;
  txId: string | null;
}

export interface UseReadContractReturn<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

// ============================================================================
// Network Configuration
// ============================================================================

const appConfig = new AppConfig(['store_write', 'publish_data']);
const userSession = new UserSession({ appConfig });

export function getStacksNetwork(): StacksNetwork {
  switch (ACTIVE_NETWORK) {
    case 'mainnet':
      return new StacksMainnet();
    case 'testnet':
      return new StacksTestnet();
    case 'devnet':
    default:
      return new StacksDevnet();
  }
}

// ============================================================================
// useStacksAuth - Wallet Authentication Hook
// ============================================================================

/**
 * Hook for managing Stacks wallet authentication using @stacks/connect
 * 
 * @example
 * ```tsx
 * const { connect, disconnect, isConnected, address } = useStacksAuth();
 * 
 * return (
 *   <button onClick={isConnected ? disconnect : connect}>
 *     {isConnected ? `Disconnect ${address?.slice(0, 8)}...` : 'Connect Wallet'}
 *   </button>
 * );
 * ```
 */
export function useStacksAuth(): StacksAuthState {
  const [isLoading, setIsLoading] = useState(false);
  const [userData, setUserData] = useState<any>(null);

  // Check if already signed in on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && userSession.isUserSignedIn()) {
      setUserData(userSession.loadUserData());
    }
  }, []);

  const isConnected = useMemo(() => !!userData, [userData]);

  const addresses = useMemo(() => ({
    mainnet: userData?.profile?.stxAddress?.mainnet || null,
    testnet: userData?.profile?.stxAddress?.testnet || null,
  }), [userData]);

  const address = useMemo(() => {
    if (!userData) return null;
    return ACTIVE_NETWORK === 'mainnet' 
      ? addresses.mainnet 
      : addresses.testnet;
  }, [userData, addresses]);

  const publicKey = useMemo(() => {
    return userData?.profile?.stxPublicKey || null;
  }, [userData]);

  const connect = useCallback(async () => {
    setIsLoading(true);
    
    showConnect({
      appDetails: APP_DETAILS,
      redirectTo: '/',
      onFinish: () => {
        const data = userSession.loadUserData();
        setUserData(data);
        setIsLoading(false);
      },
      onCancel: () => {
        setIsLoading(false);
      },
      userSession,
    });
  }, []);

  const disconnect = useCallback(() => {
    userSession.signUserOut();
    setUserData(null);
  }, []);

  const signMessage = useCallback(async (message: string): Promise<string | null> => {
    if (!isConnected) return null;
    
    return new Promise((resolve) => {
      showSignMessage({
        message,
        onFinish: (data) => {
          resolve(data.signature);
        },
        onCancel: () => {
          resolve(null);
        },
      });
    });
  }, [isConnected]);

  return {
    isConnected,
    isLoading,
    address,
    addresses,
    publicKey,
    connect,
    disconnect,
    signMessage,
  };
}

// ============================================================================
// useContractCall - Contract Write Operations
// ============================================================================

/**
 * Hook for executing contract write operations using @stacks/connect
 * 
 * @example
 * ```tsx
 * const { execute, isLoading, txId } = useContractCall();
 * 
 * const handleCreatePosition = async () => {
 *   const txId = await execute({
 *     contractAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
 *     contractName: 'timelock-exchange',
 *     functionName: 'create-position',
 *     functionArgs: [uintCV(1000000), uintCV(604800)],
 *     postConditionMode: PostConditionMode.Deny,
 *     postConditions: [
 *       makeStandardSTXPostCondition(address, FungibleConditionCode.LessEqual, BigInt(1000000))
 *     ],
 *   });
 *   console.log('Transaction:', txId);
 * };
 * ```
 */
export function useContractCall(): UseContractCallReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [txId, setTxId] = useState<string | null>(null);

  const execute = useCallback(async (options: ContractCallOptions): Promise<string | null> => {
    setIsLoading(true);
    setError(null);
    setTxId(null);

    return new Promise((resolve) => {
      openContractCall({
        contractAddress: options.contractAddress,
        contractName: options.contractName,
        functionName: options.functionName,
        functionArgs: options.functionArgs,
        postConditions: options.postConditions || [],
        postConditionMode: options.postConditionMode || PostConditionMode.Deny,
        onFinish: (data) => {
          setTxId(data.txId);
          setIsLoading(false);
          options.onSuccess?.(data.txId);
          resolve(data.txId);
        },
        onCancel: () => {
          setIsLoading(false);
          options.onCancel?.();
          resolve(null);
        },
      });
    });
  }, []);

  return { execute, isLoading, error, txId };
}

// ============================================================================
// useSTXTransfer - STX Transfer Hook
// ============================================================================

/**
 * Hook for sending STX transfers using @stacks/connect
 * 
 * @example
 * ```tsx
 * const { send, isLoading } = useSTXTransfer();
 * 
 * const handleSend = async () => {
 *   await send({
 *     recipient: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
 *     amount: BigInt(1000000), // 1 STX in microSTX
 *     memo: 'Payment for services',
 *   });
 * };
 * ```
 */
export function useSTXTransfer() {
  const [isLoading, setIsLoading] = useState(false);
  const [txId, setTxId] = useState<string | null>(null);

  const send = useCallback(async (options: STXTransferOptions): Promise<string | null> => {
    setIsLoading(true);
    setTxId(null);

    return new Promise((resolve) => {
      openSTXTransfer({
        recipient: options.recipient,
        amount: options.amount,
        memo: options.memo,
        onFinish: (data) => {
          setTxId(data.txId);
          setIsLoading(false);
          options.onSuccess?.(data.txId);
          resolve(data.txId);
        },
        onCancel: () => {
          setIsLoading(false);
          options.onCancel?.();
          resolve(null);
        },
      });
    });
  }, []);

  return { send, isLoading, txId };
}

// ============================================================================
// useReadContract - Contract Read Operations
// ============================================================================

/**
 * Hook for reading contract state using @stacks/transactions
 * 
 * @example
 * ```tsx
 * const { data, isLoading, refetch } = useReadContract<number>({
 *   contractName: 'timelock-exchange',
 *   functionName: 'get-position-count',
 * });
 * 
 * return <div>Positions: {isLoading ? 'Loading...' : data}</div>;
 * ```
 */
export function useReadContract<T = any>(options: ReadContractOptions): UseReadContractReturn<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const { contractAddress, contractName, functionName, functionArgs = [], senderAddress } = options;

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const network = getStacksNetwork();
      const resolvedContractAddress = contractAddress || parseContractId(CONTRACTS.timelockExchange).address;
      
      const result = await callReadOnlyFunction({
        contractAddress: resolvedContractAddress,
        contractName,
        functionName,
        functionArgs,
        network,
        senderAddress: senderAddress || resolvedContractAddress,
      });

      const value = cvToValue(result);
      setData(value as T);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to read contract'));
    } finally {
      setIsLoading(false);
    }
  }, [contractAddress, contractName, functionName, functionArgs, senderAddress]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}

// ============================================================================
// useContractState - Auto-refreshing Contract State
// ============================================================================

/**
 * Hook that polls contract state at regular intervals
 * 
 * @example
 * ```tsx
 * const { data } = useContractState<number>({
 *   contractName: 'timelock-exchange',
 *   functionName: 'get-total-locked-value',
 * }, 30000); // Refresh every 30 seconds
 * ```
 */
export function useContractState<T = any>(
  options: ReadContractOptions,
  refreshInterval: number = 60000
): UseReadContractReturn<T> {
  const result = useReadContract<T>(options);

  useEffect(() => {
    const interval = setInterval(() => {
      result.refetch();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [result.refetch, refreshInterval]);

  return result;
}

// ============================================================================
// Clarity Value Helpers
// ============================================================================

/**
 * Helper utilities for creating Clarity values
 * These wrap @stacks/transactions CV constructors for convenience
 */
export const cv = {
  uint: uintCV,
  int: intCV,
  principal: principalCV,
  buffer: bufferCV,
  stringAscii: stringAsciiCV,
  stringUtf8: stringUtf8CV,
  bool: boolCV,
  none: noneCV,
  some: someCV,
  list: listCV,
  tuple: tupleCV,
  fromHex: hexToCV,
  toHex: cvToHex,
  toJSON: cvToJSON,
  toValue: cvToValue,
  serialize: serializeCV,
  deserialize: deserializeCV,
};

/**
 * Post condition helpers
 */
export const postConditions = {
  stxTransfer: makeStandardSTXPostCondition,
  stxContractTransfer: makeContractSTXPostCondition,
  ftTransfer: makeStandardFungiblePostCondition,
  ftContractTransfer: makeContractFungiblePostCondition,
  nftTransfer: makeStandardNonFungiblePostCondition,
  nftContractTransfer: makeContractNonFungiblePostCondition,
  createAsset: createAssetInfo,
  FungibleCode: FungibleConditionCode,
  NonFungibleCode: NonFungibleConditionCode,
  Mode: PostConditionMode,
};

// ============================================================================
// useTimelockExchange - Domain-specific hooks for this app
// ============================================================================

/**
 * Domain-specific hook for TimeLock Exchange contract interactions
 * 
 * @example
 * ```tsx
 * const { 
 *   createPosition, 
 *   getPosition, 
 *   positionCount,
 *   totalLocked 
 * } = useTimelockExchange();
 * ```
 */
export function useTimelockExchange() {
  const { execute } = useContractCall();
  const { address } = useStacksAuth();
  
  const { data: positionCount, refetch: refetchPositionCount } = useContractState<{ value: number }>({
    contractName: 'timelock-exchange',
    functionName: 'get-position-count',
  }, 30000);

  const { data: totalLocked, refetch: refetchTotalLocked } = useContractState<{ value: number }>({
    contractName: 'timelock-exchange',
    functionName: 'get-total-locked-value',
  }, 30000);

  const createPosition = useCallback(async (
    amount: number,
    lockDurationSeconds: number
  ): Promise<string | null> => {
    if (!address) return null;

    const { address: contractAddress, name: contractName } = parseContractId(CONTRACTS.timelockExchange);
    const amountMicroSTX = Math.floor(amount * 1_000_000);

    return execute({
      contractAddress,
      contractName,
      functionName: 'create-position',
      functionArgs: [uintCV(amountMicroSTX), uintCV(lockDurationSeconds)],
      postConditionMode: PostConditionMode.Deny,
      postConditions: [
        makeStandardSTXPostCondition(
          address,
          FungibleConditionCode.LessEqual,
          BigInt(amountMicroSTX)
        ),
      ],
      onSuccess: () => {
        refetchPositionCount();
        refetchTotalLocked();
      },
    });
  }, [address, execute, refetchPositionCount, refetchTotalLocked]);

  const getPosition = useCallback(async (positionId: number) => {
    const network = getStacksNetwork();
    const { address: contractAddress, name: contractName } = parseContractId(CONTRACTS.timelockExchange);

    try {
      const result = await callReadOnlyFunction({
        contractAddress,
        contractName,
        functionName: 'get-position',
        functionArgs: [uintCV(positionId)],
        network,
        senderAddress: contractAddress,
      });

      return cvToValue(result);
    } catch {
      return null;
    }
  }, []);

  const withdrawPosition = useCallback(async (positionId: number): Promise<string | null> => {
    if (!address) return null;

    const { address: contractAddress, name: contractName } = parseContractId(CONTRACTS.timelockExchange);

    return execute({
      contractAddress,
      contractName,
      functionName: 'withdraw',
      functionArgs: [uintCV(positionId)],
      postConditionMode: PostConditionMode.Allow,
      onSuccess: () => {
        refetchPositionCount();
        refetchTotalLocked();
      },
    });
  }, [address, execute, refetchPositionCount, refetchTotalLocked]);

  return {
    createPosition,
    getPosition,
    withdrawPosition,
    positionCount: positionCount?.value ?? 0,
    totalLocked: (totalLocked?.value ?? 0) / 1_000_000,
    refetch: () => {
      refetchPositionCount();
      refetchTotalLocked();
    },
  };
}

// ============================================================================
// Export the user session for direct access if needed
// ============================================================================

export { userSession, appConfig };
