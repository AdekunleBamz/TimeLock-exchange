'use client';

import { useState, useCallback } from 'react';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';
import { Tooltip } from '@/components/ui/Tooltip';
import { CONTRACTS, DEPLOYER_ADDRESS } from '@/lib/constants';
import { useWallet } from '@/lib/wallet-context';
import type { Position, EarlyWithdrawalInfo } from '@/lib/types';

// Mainnet contract reference
const TIMELOCK_CONTRACT = CONTRACTS.timelockExchange;
const POSITION_NFT_CONTRACT = CONTRACTS.positionNft;

interface PositionCardProps {
  position: Position;
  onUnlock?: (positionId: number) => void;
  onEarlyWithdraw?: (positionId: number) => void;
  earlyWithdrawalInfo?: EarlyWithdrawalInfo | null;
  isLoading?: boolean;
}

export function PositionCard({
  position,
  onUnlock,
  onEarlyWithdraw,
  earlyWithdrawalInfo,
  isLoading = false,
}: PositionCardProps) {
  const [showEarlyWithdraw, setShowEarlyWithdraw] = useState(false);

  const now = Date.now() / 1000;
  const isUnlockable = now >= position.unlockTime;
  const timeRemaining = Math.max(0, position.unlockTime - now);
  const totalDuration = position.duration * 24 * 60 * 60;
  const elapsed = totalDuration - timeRemaining;
  const progressPercent = Math.min(100, (elapsed / totalDuration) * 100);

  const formatTimeRemaining = (seconds: number): string => {
    if (seconds <= 0) return 'Ready to unlock';
    
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h remaining`;
    if (hours > 0) return `${hours}h ${minutes}m remaining`;
    return `${minutes}m remaining`;
  };

  const getStatusBadge = () => {
    if (!position.isActive) {
      return <Badge variant="secondary">Closed</Badge>;
    }
    if (isUnlockable) {
      return <Badge variant="success">Ready to Unlock</Badge>;
    }
    return <Badge variant="primary">Locked</Badge>;
  };

  const getTierBadge = () => {
    if (!position.tier) return null;
    const tierColors: Record<number, 'primary' | 'secondary' | 'success' | 'warning' | 'danger'> = {
      1: 'secondary',
      2: 'primary',
      3: 'success',
      4: 'warning',
      5: 'danger',
    };
    const tierLabels: Record<number, string> = {
      1: 'Bronze',
      2: 'Silver',
      3: 'Gold',
      4: 'Platinum',
      5: 'Diamond',
    };
    return (
      <Badge variant={tierColors[position.tier] || 'secondary'}>
        {tierLabels[position.tier] || `Tier ${position.tier}`}
      </Badge>
    );
  };

  return (
    <Card variant="elevated" hoverable className="transition-all duration-300">
      <CardHeader
        title={`Position #${position.id}`}
        subtitle={`${position.amount.toFixed(2)} ${position.asset}`}
        action={
          <div className="flex gap-2">
            {getTierBadge()}
            {getStatusBadge()}
          </div>
        }
      />
      
      <CardContent>
        {/* Progress bar for lock period */}
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Lock Progress</span>
            <span>{progressPercent.toFixed(1)}%</span>
          </div>
          <Progress 
            value={progressPercent} 
            variant={isUnlockable ? 'success' : 'primary'}
            size="md"
            animated={!isUnlockable && position.isActive}
          />
        </div>

        {/* Time remaining */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-gray-500">Time Remaining</span>
          <span className={`text-sm font-medium ${isUnlockable ? 'text-green-600' : 'text-blue-600'}`}>
            {formatTimeRemaining(timeRemaining)}
          </span>
        </div>

        {/* Lock duration */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-gray-500">Lock Duration</span>
          <span className="text-sm font-medium">{position.duration} days</span>
        </div>

        {/* Created date */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-gray-500">Created</span>
          <span className="text-sm text-gray-700">
            {new Date(position.createdAt * 1000).toLocaleDateString()}
          </span>
        </div>

        {/* Unlock date */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-gray-500">Unlocks</span>
          <span className="text-sm text-gray-700">
            {new Date(position.unlockTime * 1000).toLocaleDateString()}
          </span>
        </div>

        {/* Passkey protection indicator */}
        {position.passkeyProtected && (
          <div className="flex items-center gap-2 mt-3 p-2 bg-blue-50 rounded-lg">
            <span className="text-blue-600">🔐</span>
            <span className="text-sm text-blue-700">Passkey Protected</span>
          </div>
        )}

        {/* Early withdrawal section */}
        {!isUnlockable && position.isActive && showEarlyWithdraw && earlyWithdrawalInfo && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="text-sm font-semibold text-yellow-800 mb-2">Early Withdrawal</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-yellow-700">Penalty</span>
                <span className="text-yellow-800 font-medium">
                  {earlyWithdrawalInfo.penaltyAmount.toFixed(4)} STX ({(earlyWithdrawalInfo.penaltyBps / 100).toFixed(2)}%)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-yellow-700">You receive</span>
                <span className="text-yellow-800 font-medium">
                  {earlyWithdrawalInfo.amountAfterPenalty.toFixed(4)} STX
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex gap-2">
        {position.isActive && (
          <>
            {isUnlockable ? (
              <Button
                variant="success"
                size="md"
                fullWidth
                isLoading={isLoading}
                onClick={() => onUnlock?.(position.id)}
              >
                🔓 Unlock Position
              </Button>
            ) : (
              <>
                {!showEarlyWithdraw ? (
                  <Button
                    variant="outline"
                    size="md"
                    fullWidth
                    onClick={() => setShowEarlyWithdraw(true)}
                  >
                    Early Withdraw
                  </Button>
                ) : (
                  <div className="flex gap-2 w-full">
                    <Button
                      variant="ghost"
                      size="md"
                      onClick={() => setShowEarlyWithdraw(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="danger"
                      size="md"
                      fullWidth
                      isLoading={isLoading}
                      onClick={() => onEarlyWithdraw?.(position.id)}
                    >
                      Confirm Withdraw
                    </Button>
                  </div>
                )}
              </>
            )}
          </>
        )}
        
        {!position.isActive && (
          <Badge variant="secondary" className="w-full justify-center py-2">
            Position Closed
          </Badge>
        )}
      </CardFooter>
    </Card>
  );
}
