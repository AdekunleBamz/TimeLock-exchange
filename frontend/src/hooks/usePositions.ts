import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '../lib/wallet-context';
import { getPosition, getTotalLockedValue, calculateEarlyWithdrawalPenalty } from '../lib/contracts';
import type { Position, PositionMetadata, EarlyWithdrawalInfo } from '../lib/types';

interface UsePositionsReturn {
  positions: Position[];
  isLoading: boolean;
  error: string | null;
  totalLocked: bigint;
  refetch: () => Promise<void>;
  getPositionDetails: (id: number) => Promise<PositionMetadata | null>;
  getEarlyWithdrawalInfo: (id: number) => Promise<EarlyWithdrawalInfo | null>;
}

export function usePositions(): UsePositionsReturn {
  const { address, isConnected } = useWallet();
  const [positions, setPositions] = useState<Position[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalLocked, setTotalLocked] = useState<bigint>(BigInt(0));

  const fetchPositions = useCallback(async () => {
    if (!isConnected || !address) {
      setPositions([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch user positions - in real implementation, would query contract
      // For now, we scan for positions owned by the user
      const userPositions: Position[] = [];
      
      // Scan first 100 position IDs to find user's positions
      // In production, use an indexer or events
      for (let i = 1; i <= 100; i++) {
        try {
          const position = await getPosition(i);
          if (position && position.owner === address) {
            userPositions.push(position);
          }
        } catch {
          // Position doesn't exist, continue
          break;
        }
      }

      setPositions(userPositions);

      // Get total locked value
      const total = await getTotalLockedValue();
      setTotalLocked(total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch positions');
    } finally {
      setIsLoading(false);
    }
  }, [address, isConnected]);

  useEffect(() => {
    fetchPositions();
  }, [fetchPositions]);

  const getPositionDetails = useCallback(async (id: number): Promise<PositionMetadata | null> => {
    try {
      const position = await getPosition(id);
      if (!position) return null;

      const currentTime = BigInt(Math.floor(Date.now() / 1000));
      const isUnlockable = currentTime >= position.unlockTime;
      const timeRemaining = isUnlockable ? BigInt(0) : position.unlockTime - currentTime;
      const progressPercent = isUnlockable 
        ? 100 
        : Number((currentTime - position.createdAt) * BigInt(100) / (position.unlockTime - position.createdAt));

      return {
        tokenId: id,
        amount: position.amount,
        createdAt: position.createdAt,
        unlockTime: position.unlockTime,
        owner: position.owner,
        tier: position.tier,
        feesPaid: position.feesPaid,
        isUnlockable,
        timeRemaining,
        progressPercent,
      };
    } catch {
      return null;
    }
  }, []);

  const getEarlyWithdrawalInfo = useCallback(async (id: number): Promise<EarlyWithdrawalInfo | null> => {
    try {
      const position = await getPosition(id);
      if (!position) return null;

      const penalty = await calculateEarlyWithdrawalPenalty(id);
      const returnAmount = position.amount - penalty;
      const penaltyPercent = Number(penalty * BigInt(100) / position.amount);

      return {
        positionId: id,
        originalAmount: position.amount,
        penalty,
        returnAmount,
        penaltyPercent,
      };
    } catch {
      return null;
    }
  }, []);

  return {
    positions,
    isLoading,
    error,
    totalLocked,
    refetch: fetchPositions,
    getPositionDetails,
    getEarlyWithdrawalInfo,
  };
}

// Hook for single position
export function usePosition(positionId: number | null) {
  const [position, setPosition] = useState<PositionMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPosition = useCallback(async () => {
    if (positionId === null) {
      setPosition(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const pos = await getPosition(positionId);
      if (!pos) {
        setPosition(null);
        return;
      }

      const currentTime = BigInt(Math.floor(Date.now() / 1000));
      const isUnlockable = currentTime >= pos.unlockTime;
      const timeRemaining = isUnlockable ? BigInt(0) : pos.unlockTime - currentTime;
      const progressPercent = isUnlockable 
        ? 100 
        : Number((currentTime - pos.createdAt) * BigInt(100) / (pos.unlockTime - pos.createdAt));

      setPosition({
        tokenId: positionId,
        amount: pos.amount,
        createdAt: pos.createdAt,
        unlockTime: pos.unlockTime,
        owner: pos.owner,
        tier: pos.tier,
        feesPaid: pos.feesPaid,
        isUnlockable,
        timeRemaining,
        progressPercent,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch position');
    } finally {
      setIsLoading(false);
    }
  }, [positionId]);

  useEffect(() => {
    fetchPosition();
  }, [fetchPosition]);

  return {
    position,
    isLoading,
    error,
    refetch: fetchPosition,
  };
}
