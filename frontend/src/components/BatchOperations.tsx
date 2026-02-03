'use client';

import React, { useState, useCallback } from 'react';
import { useWallet } from '@/lib/wallet-context';
import { openContractCall } from '@stacks/connect';
import { TIMELOCK_EXCHANGE_CONTRACT } from '@/lib/contracts';
import { uintCV, listCV, tupleCV } from '@stacks/transactions';
import { cn } from '@/lib/utils';

interface BatchPosition {
  amount: number;
  duration: number;
}

interface BatchOperationsProps {
  onSuccess?: (txIds: string[]) => void;
  onError?: (error: Error) => void;
}

export function BatchOperations({ onSuccess, onError }: BatchOperationsProps) {
  const { isConnected, network } = useWallet();
  const [positions, setPositions] = useState<BatchPosition[]>([
    { amount: 100, duration: 7 },
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const addPosition = () => {
    if (positions.length < 10) {
      setPositions([...positions, { amount: 100, duration: 7 }]);
    }
  };

  const removePosition = (index: number) => {
    setPositions(positions.filter((_, i) => i !== index));
  };

  const updatePosition = (index: number, field: keyof BatchPosition, value: number) => {
    const updated = [...positions];
    updated[index] = { ...updated[index], [field]: value };
    setPositions(updated);
  };

  const totalAmount = positions.reduce((sum, p) => sum + p.amount, 0);

  const handleBatchCreate = useCallback(async () => {
    if (!isConnected || positions.length === 0) return;

    setIsLoading(true);
    try {
      // Create positions sequentially
      const txIds: string[] = [];
      
      for (const position of positions) {
        await openContractCall({
          contractAddress: TIMELOCK_EXCHANGE_CONTRACT.address,
          contractName: TIMELOCK_EXCHANGE_CONTRACT.name,
          functionName: 'create-position',
          functionArgs: [
            uintCV(position.amount * 1_000_000), // Convert to micro-STX
            uintCV(position.duration * 86400),   // Convert days to seconds
          ],
          network,
          onFinish: (data) => {
            txIds.push(data.txId);
          },
          onCancel: () => {
            throw new Error('Transaction cancelled');
          },
        });
      }

      onSuccess?.(txIds);
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error('Batch operation failed'));
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, positions, network, onSuccess, onError]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Batch Create Positions</h2>
      <p className="text-sm text-gray-600 mb-6">
        Create multiple positions in one session. Up to 10 positions can be created at once.
      </p>

      <div className="space-y-4 mb-6">
        {positions.map((position, index) => (
          <div key={index} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">Amount (STX)</label>
              <input
                type="number"
                value={position.amount}
                onChange={(e) => updatePosition(index, 'amount', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                min="1"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">Duration (days)</label>
              <select
                value={position.duration}
                onChange={(e) => updatePosition(index, 'duration', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="7">7 days</option>
                <option value="30">30 days</option>
                <option value="90">90 days</option>
                <option value="180">180 days</option>
                <option value="365">365 days</option>
              </select>
            </div>
            {positions.length > 1 && (
              <button
                onClick={() => removePosition(index)}
                className="p-2 text-red-500 hover:bg-red-50 rounded-md"
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mb-6">
        <button
          onClick={addPosition}
          disabled={positions.length >= 10}
          className="text-blue-600 hover:text-blue-700 text-sm font-medium disabled:text-gray-400"
        >
          + Add Another Position
        </button>
        <p className="text-sm text-gray-600">
          Total: <span className="font-semibold">{totalAmount} STX</span>
        </p>
      </div>

      <button
        onClick={handleBatchCreate}
        disabled={!isConnected || isLoading || positions.length === 0}
        className={cn(
          'w-full py-3 px-4 rounded-lg font-semibold transition-colors',
          isConnected && !isLoading
            ? 'bg-blue-600 text-white hover:bg-blue-700'
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
        )}
      >
        {isLoading ? 'Creating Positions...' : `Create ${positions.length} Position${positions.length > 1 ? 's' : ''}`}
      </button>
    </div>
  );
}

export default BatchOperations;
