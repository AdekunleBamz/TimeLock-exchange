'use client';

import { useState, useEffect, useCallback } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { calculateFee } from '@/lib/contracts';
import { CONTRACTS, DEPLOYER_ADDRESS, LOCK_DURATIONS } from '@/lib/constants';
import { useWallet } from '@/lib/wallet-context';
import type { FeeTierInfo } from '@/lib/types';

// Mainnet contract for creating positions
const TIMELOCK_CONTRACT = CONTRACTS.timelockExchange;
const FEE_COLLECTOR_CONTRACT = CONTRACTS.feeCollector;

interface CreatePositionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (amount: number, durationDays: number, usePasskey: boolean) => Promise<void>;
  isLoading?: boolean;
  hasPasskey?: boolean;
}

const DURATION_OPTIONS = [
  { value: 7, label: '7 Days', description: 'Short-term lock' },
  { value: 30, label: '30 Days', description: '1 Month' },
  { value: 90, label: '90 Days', description: '3 Months' },
  { value: 180, label: '180 Days', description: '6 Months' },
  { value: 365, label: '365 Days', description: '1 Year - Best rate!' },
];

const TIER_INFO = {
  1: { name: 'Bronze', fee: '1.0%', color: 'text-amber-600' },
  2: { name: 'Silver', fee: '0.75%', color: 'text-gray-500' },
  3: { name: 'Gold', fee: '0.5%', color: 'text-yellow-500' },
  4: { name: 'Platinum', fee: '0.25%', color: 'text-blue-500' },
  5: { name: 'Diamond', fee: '0.1%', color: 'text-purple-500' },
};

export function CreatePositionModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
  hasPasskey = false,
}: CreatePositionModalProps) {
  const [amount, setAmount] = useState<string>('');
  const [duration, setDuration] = useState<number>(30);
  const [usePasskey, setUsePasskey] = useState(false);
  const [feeInfo, setFeeInfo] = useState<FeeTierInfo | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // Calculate fee when amount or duration changes
  useEffect(() => {
    const calculateFeeAsync = async () => {
      const amountNum = parseFloat(amount);
      if (!amountNum || amountNum <= 0) {
        setFeeInfo(null);
        return;
      }

      setIsCalculating(true);
      try {
        const durationSeconds = duration * 24 * 60 * 60;
        const info = await calculateFee(amountNum, durationSeconds);
        setFeeInfo(info);
      } catch (error) {
        console.error('Error calculating fee:', error);
        setFeeInfo(null);
      }
      setIsCalculating(false);
    };

    const debounce = setTimeout(calculateFeeAsync, 300);
    return () => clearTimeout(debounce);
  }, [amount, duration]);

  const handleSubmit = async () => {
    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum <= 0) return;
    
    await onSubmit(amountNum, duration, usePasskey);
    // Reset form on success
    setAmount('');
    setDuration(30);
    setUsePasskey(false);
  };

  const amountNum = parseFloat(amount) || 0;
  const isValid = amountNum >= 1; // Minimum 1 STX

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalHeader 
        title="Create TimeLock Position" 
        subtitle="Lock your STX and receive a position NFT"
      />
      
      <ModalBody>
        {/* Amount Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Amount to Lock (STX)
          </label>
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount (min. 1 STX)"
            min="1"
            step="0.01"
            className="text-lg"
          />
          {amountNum > 0 && amountNum < 1 && (
            <p className="text-sm text-red-500 mt-1">Minimum deposit is 1 STX</p>
          )}
        </div>

        {/* Duration Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Lock Duration
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {DURATION_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setDuration(option.value)}
                className={`p-3 rounded-lg border-2 transition-all ${
                  duration === option.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <div className="font-semibold text-gray-900">{option.label}</div>
                <div className="text-xs text-gray-500">{option.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Fee Information */}
        {feeInfo && (
          <Card variant="outlined" padding="md" className="mb-6">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Fee Breakdown</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Tier</span>
                <Badge variant={feeInfo.tier >= 4 ? 'success' : 'secondary'}>
                  {TIER_INFO[feeInfo.tier as keyof typeof TIER_INFO]?.name || `Tier ${feeInfo.tier}`}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Fee Rate</span>
                <span className={`font-medium ${TIER_INFO[feeInfo.tier as keyof typeof TIER_INFO]?.color || ''}`}>
                  {(feeInfo.feeBps / 100).toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Fee Amount</span>
                <span className="text-gray-900">{feeInfo.feeAmount.toFixed(4)} STX</span>
              </div>
              <hr className="my-2" />
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-700">You Lock</span>
                <span className="font-bold text-gray-900">{feeInfo.amountAfterFee.toFixed(4)} STX</span>
              </div>
            </div>
          </Card>
        )}

        {isCalculating && (
          <div className="text-center text-gray-500 text-sm mb-4">
            Calculating fees...
          </div>
        )}

        {/* Passkey Option */}
        {hasPasskey && (
          <div className="mb-4">
            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
              <input
                type="checkbox"
                checked={usePasskey}
                onChange={(e) => setUsePasskey(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <div>
                <span className="font-medium text-gray-900">🔐 Passkey Protection</span>
                <p className="text-sm text-gray-500">Require passkey verification to unlock</p>
              </div>
            </label>
          </div>
        )}

        {/* Summary */}
        {isValid && feeInfo && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-2">Position Summary</h4>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• Lock <strong>{feeInfo.amountAfterFee.toFixed(2)} STX</strong> for <strong>{duration} days</strong></li>
              <li>• Unlock date: <strong>{new Date(Date.now() + duration * 24 * 60 * 60 * 1000).toLocaleDateString()}</strong></li>
              <li>• Receive a transferable position NFT</li>
              {usePasskey && <li>• 🔐 Passkey verification required to unlock</li>}
            </ul>
          </div>
        )}
      </ModalBody>

      <ModalFooter>
        <Button variant="ghost" onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          isLoading={isLoading}
          disabled={!isValid || isLoading}
        >
          Create Position
        </Button>
      </ModalFooter>
    </Modal>
  );
}
