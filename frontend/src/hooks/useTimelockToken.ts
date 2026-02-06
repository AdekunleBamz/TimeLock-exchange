/**
 * useTimelockToken - React hook for TLX token contract interactions
 * 
 * This hook provides functions for querying token balances, transferring tokens,
 * and interacting with the TLX (TimeLock Exchange) token.
 * Uses @stacks/connect for transaction signing and @stacks/transactions for building calls.
 * 
 * Contract: SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT.timelock-token-v11-1
 */

'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useWallet } from '@/lib/wallet-context';
import {
  callReadOnlyFunction,
  cvToValue,
  uintCV,
  principalCV,
  stringUtf8CV,
  PostConditionMode,
  makeStandardFungiblePostCondition,
  FungibleConditionCode,
  createAssetInfo,
} from '@stacks/transactions';
import { openContractCall } from '@stacks/connect';
import { getNetwork } from '@/lib/contracts';
import { CONTRACTS, parseContractId, MICRO_STX } from '@/lib/constants';

// ============================================================================
// Types
// ============================================================================

export interface TokenInfo {
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: bigint;
  tokenUri: string | null;
}

export interface TokenBalance {
  balance: bigint;
  locked: bigint;
  available: bigint;
}

export interface TokenTransfer {
  txId: string;
  from: string;
  to: string;
  amount: bigint;
  memo: string | null;
  timestamp: Date;
  status: 'pending' | 'confirmed' | 'failed';
}

export interface UseTimelockTokenReturn {
  // State
  isLoading: boolean;
  isTransferring: boolean;
  error: string | null;
  
  // Data
  tokenInfo: TokenInfo | null;
  balance: TokenBalance | null;
  transferHistory: TokenTransfer[];
  
  // Actions
  transfer: (recipient: string, amount: bigint, memo?: string) => Promise<string | null>;
  refresh: () => Promise<void>;
  
  // Queries
  getBalance: (address: string) => Promise<bigint>;
  
  // Computed
  hasBalance: boolean;
  formattedBalance: string;
  formattedAvailable: string;
}

// ============================================================================
// Constants - Using Mainnet Contract Address
// ============================================================================

const { address: CONTRACT_ADDRESS, name: CONTRACT_NAME } = parseContractId(CONTRACTS.timelockToken);
const TIMELOCK_TOKEN_CONTRACT = CONTRACTS.timelockToken; // SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT.timelock-token-v11-1

// Token asset info for post conditions
const TOKEN_ASSET_NAME = 'timelock-token';
const TOKEN_DECIMALS = 6;

// ============================================================================
// Helper Functions
// ============================================================================

function formatTokenAmount(amount: bigint, decimals: number = TOKEN_DECIMALS): string {
  const divisor = BigInt(10 ** decimals);
  const integerPart = amount / divisor;
  const fractionalPart = amount % divisor;
  const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
  return `${integerPart}.${fractionalStr}`;
}

function parseTokenAmount(amount: string, decimals: number = TOKEN_DECIMALS): bigint {
  const [integerPart, fractionalPart = ''] = amount.split('.');
  const paddedFractional = fractionalPart.padEnd(decimals, '0').slice(0, decimals);
  return BigInt(integerPart) * BigInt(10 ** decimals) + BigInt(paddedFractional);
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useTimelockToken(): UseTimelockTokenReturn {
  const { stxAddress, isConnected } = useWallet();
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [balance, setBalance] = useState<TokenBalance | null>(null);
  const [transferHistory, setTransferHistory] = useState<TokenTransfer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const network = useMemo(() => getNetwork(), []);

  // Computed values
  const hasBalance = useMemo(() => {
    return balance !== null && balance.balance > BigInt(0);
  }, [balance]);

  const formattedBalance = useMemo(() => {
    if (!balance) return '0';
    return formatTokenAmount(balance.balance);
  }, [balance]);

  const formattedAvailable = useMemo(() => {
    if (!balance) return '0';
    return formatTokenAmount(balance.available);
  }, [balance]);

  // ============================================================================
  // Read Functions
  // ============================================================================

  const fetchTokenInfo = useCallback(async (): Promise<TokenInfo | null> => {
    try {
      const [nameResult, symbolResult, decimalsResult, supplyResult, uriResult] = await Promise.all([
        callReadOnlyFunction({
          contractAddress: CONTRACT_ADDRESS,
          contractName: CONTRACT_NAME,
          functionName: 'get-name',
          functionArgs: [],
          network,
          senderAddress: CONTRACT_ADDRESS,
        }),
        callReadOnlyFunction({
          contractAddress: CONTRACT_ADDRESS,
          contractName: CONTRACT_NAME,
          functionName: 'get-symbol',
          functionArgs: [],
          network,
          senderAddress: CONTRACT_ADDRESS,
        }),
        callReadOnlyFunction({
          contractAddress: CONTRACT_ADDRESS,
          contractName: CONTRACT_NAME,
          functionName: 'get-decimals',
          functionArgs: [],
          network,
          senderAddress: CONTRACT_ADDRESS,
        }),
        callReadOnlyFunction({
          contractAddress: CONTRACT_ADDRESS,
          contractName: CONTRACT_NAME,
          functionName: 'get-total-supply',
          functionArgs: [],
          network,
          senderAddress: CONTRACT_ADDRESS,
        }),
        callReadOnlyFunction({
          contractAddress: CONTRACT_ADDRESS,
          contractName: CONTRACT_NAME,
          functionName: 'get-token-uri',
          functionArgs: [],
          network,
          senderAddress: CONTRACT_ADDRESS,
        }),
      ]);

      return {
        name: cvToValue(nameResult)?.value || 'TimeLock Token',
        symbol: cvToValue(symbolResult)?.value || 'TLX',
        decimals: cvToValue(decimalsResult)?.value || TOKEN_DECIMALS,
        totalSupply: BigInt(cvToValue(supplyResult)?.value || 0),
        tokenUri: cvToValue(uriResult)?.value || null,
      };
    } catch (err) {
      console.error('Failed to fetch token info:', err);
      return null;
    }
  }, [network]);

  const getBalance = useCallback(async (address: string): Promise<bigint> => {
    try {
      const result = await callReadOnlyFunction({
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: 'get-balance',
        functionArgs: [principalCV(address)],
        network,
        senderAddress: CONTRACT_ADDRESS,
      });

      const data = cvToValue(result);
      return BigInt(data?.value || 0);
    } catch (err) {
      console.error('Failed to get balance:', err);
      return BigInt(0);
    }
  }, [network]);

  const fetchBalance = useCallback(async (address: string): Promise<TokenBalance | null> => {
    try {
      const balanceAmount = await getBalance(address);
      
      // Try to get locked balance if contract supports it
      let lockedAmount = BigInt(0);
      try {
        const lockedResult = await callReadOnlyFunction({
          contractAddress: CONTRACT_ADDRESS,
          contractName: CONTRACT_NAME,
          functionName: 'get-locked-balance',
          functionArgs: [principalCV(address)],
          network,
          senderAddress: CONTRACT_ADDRESS,
        });
        lockedAmount = BigInt(cvToValue(lockedResult)?.value || 0);
      } catch {
        // Contract may not support locked balance
      }

      return {
        balance: balanceAmount,
        locked: lockedAmount,
        available: balanceAmount - lockedAmount,
      };
    } catch (err) {
      console.error('Failed to fetch balance:', err);
      return null;
    }
  }, [getBalance, network]);

  // ============================================================================
  // Refresh Data
  // ============================================================================

  const refresh = useCallback(async () => {
    if (!isConnected) return;

    setIsLoading(true);
    setError(null);

    try {
      // Fetch token info
      const info = await fetchTokenInfo();
      setTokenInfo(info);

      // Fetch user balance
      if (stxAddress) {
        const balanceData = await fetchBalance(stxAddress);
        setBalance(balanceData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch token data');
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, stxAddress, fetchTokenInfo, fetchBalance]);

  // ============================================================================
  // Write Functions
  // ============================================================================

  /**
   * Transfer TLX tokens to another address
   */
  const transfer = useCallback(async (
    recipient: string,
    amount: bigint,
    memo?: string
  ): Promise<string | null> => {
    if (!isConnected || !stxAddress) {
      setError('Wallet not connected');
      return null;
    }

    // Validate recipient address
    if (!recipient.startsWith('SP') && !recipient.startsWith('ST')) {
      setError('Invalid recipient address');
      return null;
    }

    // Validate amount
    if (amount <= BigInt(0)) {
      setError('Amount must be greater than 0');
      return null;
    }

    if (balance && amount > balance.available) {
      setError('Insufficient balance');
      return null;
    }

    setIsTransferring(true);
    setError(null);

    // Create post condition to ensure correct transfer amount
    const postConditions = [
      makeStandardFungiblePostCondition(
        stxAddress,
        FungibleConditionCode.Equal,
        amount,
        createAssetInfo(CONTRACT_ADDRESS, CONTRACT_NAME, TOKEN_ASSET_NAME)
      ),
    ];

    // Build function args - use separate arrays for with/without memo
    const baseArgs = [
      uintCV(Number(amount)),
      principalCV(stxAddress),
      principalCV(recipient),
    ];

    // Call transfer with or without memo
    const functionName = memo ? 'transfer-memo' : 'transfer';
    const functionArgs = memo 
      ? [...baseArgs, stringUtf8CV(memo)]
      : baseArgs;

    return new Promise((resolve) => {
      openContractCall({
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName,
        functionArgs,
        postConditionMode: PostConditionMode.Deny,
        postConditions,
        onFinish: (data) => {
          setIsTransferring(false);
          // Add to transfer history
          setTransferHistory(prev => [{
            txId: data.txId,
            from: stxAddress,
            to: recipient,
            amount,
            memo: memo || null,
            timestamp: new Date(),
            status: 'pending',
          }, ...prev]);
          refresh();
          resolve(data.txId);
        },
        onCancel: () => {
          setIsTransferring(false);
          setError('Transaction cancelled');
          resolve(null);
        },
      });
    });
  }, [isConnected, stxAddress, balance, refresh]);

  // ============================================================================
  // Effects
  // ============================================================================

  // Load data on mount if connected
  useEffect(() => {
    if (isConnected) {
      refresh();
    }
  }, [isConnected, refresh]);

  // ============================================================================
  // Return
  // ============================================================================

  return {
    isLoading,
    isTransferring,
    error,
    tokenInfo,
    balance,
    transferHistory,
    transfer,
    refresh,
    getBalance,
    hasBalance,
    formattedBalance,
    formattedAvailable,
  };
}

export default useTimelockToken;
