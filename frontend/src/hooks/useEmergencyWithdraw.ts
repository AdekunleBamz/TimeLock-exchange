/**
 * useEmergencyWithdraw - React hook for emergency withdrawal contract interactions
 * 
 * This hook provides functions for emergency fund withdrawals when the standard
 * withdrawal process is unavailable. Uses @stacks/connect for transaction signing
 * and @stacks/transactions for building contract calls.
 * 
 * Contract: SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT.emergency-withdraw-v1
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
import { CONTRACTS, parseContractId, MICRO_STX } from '@/lib/constants';

// ============================================================================
// Types
// ============================================================================

export interface EmergencyRequest {
  id: number;
  requester: string;
  positionId: number;
  amount: number;
  reason: string;
  requestedAt: number;
  approvedAt: number | null;
  executedAt: number | null;
  status: EmergencyStatus;
}

export type EmergencyStatus = 'pending' | 'approved' | 'executed' | 'rejected' | 'cancelled';

export interface EmergencyStats {
  totalRequests: number;
  pendingRequests: number;
  approvedRequests: number;
  executedRequests: number;
  rejectedRequests: number;
}

export interface UseEmergencyWithdrawReturn {
  // State
  requests: EmergencyRequest[];
  myRequests: EmergencyRequest[];
  stats: EmergencyStats | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  requestEmergencyWithdraw: (positionId: number, reason: string) => Promise<string | null>;
  cancelRequest: (requestId: number) => Promise<string | null>;
  executeEmergencyWithdraw: (requestId: number) => Promise<string | null>;
  
  // Queries
  refreshRequests: () => Promise<void>;
  getRequest: (requestId: number) => Promise<EmergencyRequest | null>;
}

// ============================================================================
// Constants - Using Mainnet Contract Address
// ============================================================================

const { address: CONTRACT_ADDRESS, name: CONTRACT_NAME } = parseContractId(CONTRACTS.emergencyWithdraw);
const EMERGENCY_CONTRACT = CONTRACTS.emergencyWithdraw; // SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT.emergency-withdraw-v1

// Status mapping from contract response
const STATUS_MAP: Record<number, EmergencyStatus> = {
  0: 'pending',
  1: 'approved',
  2: 'executed',
  3: 'rejected',
  4: 'cancelled',
};

// ============================================================================
// Hook Implementation
// ============================================================================

export function useEmergencyWithdraw(): UseEmergencyWithdrawReturn {
  const { stxAddress, isConnected } = useWallet();
  const [requests, setRequests] = useState<EmergencyRequest[]>([]);
  const [stats, setStats] = useState<EmergencyStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const network = useMemo(() => getNetwork(), []);

  // Filter requests for current user
  const myRequests = useMemo(() => {
    if (!stxAddress) return [];
    return requests.filter(r => r.requester === stxAddress);
  }, [requests, stxAddress]);

  // ============================================================================
  // Read Functions
  // ============================================================================

  const fetchRequest = useCallback(async (requestId: number): Promise<EmergencyRequest | null> => {
    try {
      const result = await callReadOnlyFunction({
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: 'get-emergency-request',
        functionArgs: [uintCV(requestId)],
        network,
        senderAddress: CONTRACT_ADDRESS,
      });

      const data = cvToValue(result);
      if (!data) return null;

      return {
        id: requestId,
        requester: data.requester,
        positionId: data['position-id'].value,
        amount: data.amount.value / MICRO_STX,
        reason: data.reason || '',
        requestedAt: data['requested-at'].value,
        approvedAt: data['approved-at']?.value || null,
        executedAt: data['executed-at']?.value || null,
        status: STATUS_MAP[data.status.value] || 'pending',
      };
    } catch (err) {
      console.error('Failed to fetch emergency request:', err);
      return null;
    }
  }, [network]);

  const fetchStats = useCallback(async (): Promise<EmergencyStats | null> => {
    try {
      const result = await callReadOnlyFunction({
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: 'get-emergency-stats',
        functionArgs: [],
        network,
        senderAddress: CONTRACT_ADDRESS,
      });

      const data = cvToValue(result);
      if (!data) return null;

      return {
        totalRequests: data['total-requests'].value,
        pendingRequests: data['pending-requests'].value,
        approvedRequests: data['approved-requests'].value,
        executedRequests: data['executed-requests'].value,
        rejectedRequests: data['rejected-requests'].value,
      };
    } catch (err) {
      console.error('Failed to fetch emergency stats:', err);
      return null;
    }
  }, [network]);

  // ============================================================================
  // Refresh Data
  // ============================================================================

  const refreshRequests = useCallback(async () => {
    if (!isConnected) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch stats to get total count
      const statsData = await fetchStats();
      setStats(statsData);
      
      // Fetch recent requests
      const fetchedRequests: EmergencyRequest[] = [];
      const totalRequests = statsData?.totalRequests || 0;
      
      // Fetch last 50 requests
      const startId = Math.max(1, totalRequests - 49);
      for (let i = startId; i <= totalRequests; i++) {
        const request = await fetchRequest(i);
        if (request) {
          fetchedRequests.push(request);
        }
      }
      
      setRequests(fetchedRequests.reverse());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch requests');
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, fetchRequest, fetchStats]);

  // ============================================================================
  // Write Functions
  // ============================================================================

  /**
   * Request an emergency withdrawal for a position
   */
  const requestEmergencyWithdraw = useCallback(async (
    positionId: number,
    reason: string
  ): Promise<string | null> => {
    if (!isConnected || !stxAddress) {
      setError('Wallet not connected');
      return null;
    }

    setIsLoading(true);
    setError(null);

    return new Promise((resolve) => {
      openContractCall({
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: 'request-emergency-withdraw',
        functionArgs: [
          uintCV(positionId),
          // Note: reason might need to be encoded differently based on contract
        ],
        postConditionMode: PostConditionMode.Deny,
        postConditions: [],
        onFinish: (data) => {
          setIsLoading(false);
          refreshRequests();
          resolve(data.txId);
        },
        onCancel: () => {
          setIsLoading(false);
          setError('Transaction cancelled');
          resolve(null);
        },
      });
    });
  }, [isConnected, stxAddress, refreshRequests]);

  /**
   * Cancel a pending emergency withdrawal request
   */
  const cancelRequest = useCallback(async (requestId: number): Promise<string | null> => {
    if (!isConnected || !stxAddress) {
      setError('Wallet not connected');
      return null;
    }

    setIsLoading(true);
    setError(null);

    return new Promise((resolve) => {
      openContractCall({
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: 'cancel-emergency-request',
        functionArgs: [uintCV(requestId)],
        postConditionMode: PostConditionMode.Deny,
        postConditions: [],
        onFinish: (data) => {
          setIsLoading(false);
          refreshRequests();
          resolve(data.txId);
        },
        onCancel: () => {
          setIsLoading(false);
          setError('Transaction cancelled');
          resolve(null);
        },
      });
    });
  }, [isConnected, stxAddress, refreshRequests]);

  /**
   * Execute an approved emergency withdrawal
   */
  const executeEmergencyWithdraw = useCallback(async (requestId: number): Promise<string | null> => {
    if (!isConnected || !stxAddress) {
      setError('Wallet not connected');
      return null;
    }

    // Get request details for post conditions
    const request = await fetchRequest(requestId);
    if (!request) {
      setError('Request not found');
      return null;
    }

    if (request.status !== 'approved') {
      setError('Request must be approved before execution');
      return null;
    }

    setIsLoading(true);
    setError(null);

    // Create post conditions to protect the user
    const postConditions = [
      makeStandardSTXPostCondition(
        CONTRACT_ADDRESS,
        FungibleConditionCode.GreaterEqual,
        BigInt(request.amount * MICRO_STX)
      ),
    ];

    return new Promise((resolve) => {
      openContractCall({
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: 'execute-emergency-withdraw',
        functionArgs: [uintCV(requestId)],
        postConditionMode: PostConditionMode.Deny,
        postConditions,
        onFinish: (data) => {
          setIsLoading(false);
          refreshRequests();
          resolve(data.txId);
        },
        onCancel: () => {
          setIsLoading(false);
          setError('Transaction cancelled');
          resolve(null);
        },
      });
    });
  }, [isConnected, stxAddress, fetchRequest, refreshRequests]);

  // ============================================================================
  // Effects
  // ============================================================================

  // Load requests on mount if connected
  useEffect(() => {
    if (isConnected) {
      refreshRequests();
    }
  }, [isConnected, refreshRequests]);

  // ============================================================================
  // Return
  // ============================================================================

  return {
    requests,
    myRequests,
    stats,
    isLoading,
    error,
    requestEmergencyWithdraw,
    cancelRequest,
    executeEmergencyWithdraw,
    refreshRequests,
    getRequest: fetchRequest,
  };
}

export default useEmergencyWithdraw;
