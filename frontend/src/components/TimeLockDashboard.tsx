'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@/lib/wallet-context';
import {
  getPositionCount,
  getDemoCount,
  getCurrentTime,
  getTotalFees,
  getLastTokenId,
  createPosition,
  registerPasskey,
  getExplorerTxUrl,
} from '@/lib/contracts';
import { LOCK_DURATIONS } from '@/lib/constants';
import type { Position } from '@/lib/types';

export function TimeLockDashboard() {
  const { isConnected, stxAddress } = useWallet();
  
  const [positions, setPositions] = useState<Position[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [lastTxId, setLastTxId] = useState<string | null>(null);
  
  // Stats
  const [stats, setStats] = useState({
    positionCount: 0,
    demoCount: 0,
    totalFees: 0,
    lastTokenId: 0,
    blockTime: 0,
  });

  // New position form
  const [newPosition, setNewPosition] = useState({
    amount: '',
    duration: '7',
    usePasskey: false,
  });

  // Load contract stats
  const loadStats = useCallback(async () => {
    setIsLoading(true);
    try {
      const [posCount, demoCount, fees, tokenId, time] = await Promise.all([
        getPositionCount(),
        getDemoCount(),
        getTotalFees(),
        getLastTokenId(),
        getCurrentTime(),
      ]);
      
      setStats({
        positionCount: posCount,
        demoCount: demoCount,
        totalFees: fees / 1_000_000, // Convert to STX
        lastTokenId: tokenId,
        blockTime: time,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
    setIsLoading(false);
  }, []);

  // Load on mount
  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Create position handler
  const handleCreatePosition = async () => {
    if (!isConnected || !stxAddress) {
      alert('Please connect your wallet first');
      return;
    }

    const amount = parseFloat(newPosition.amount);
    if (!amount || amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    setIsLoading(true);
    try {
      const lockSeconds = LOCK_DURATIONS[newPosition.duration as keyof typeof LOCK_DURATIONS];
      
      const result = await createPosition(
        {
          amount,
          lockDuration: lockSeconds,
          usePasskey: newPosition.usePasskey,
        },
        stxAddress
      );

      if (result.success) {
        setLastTxId(result.txId);
        alert(`Position created! TX: ${result.txId.slice(0, 10)}...`);
        setShowCreateForm(false);
        setNewPosition({ amount: '', duration: '7', usePasskey: false });
        // Reload stats after a delay
        setTimeout(loadStats, 3000);
      } else {
        alert(result.error || 'Failed to create position');
      }
    } catch (error) {
      console.error('Error creating position:', error);
      alert('Error creating position');
    }
    setIsLoading(false);
  };

  // Passkey registration handler
  const handleRegisterPasskey = async () => {
    if (!isConnected) {
      alert('Please connect your wallet first');
      return;
    }

    try {
      // WebAuthn passkey registration
      const publicKeyCredential = await navigator.credentials.create({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          rp: { name: 'TimeLock Exchange' },
          user: {
            id: crypto.getRandomValues(new Uint8Array(16)),
            name: stxAddress || 'user@timelock.exchange',
            displayName: 'TimeLock User',
          },
          pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
          timeout: 60000,
          attestation: 'direct',
        },
      }) as PublicKeyCredential;

      // Extract public key from credential
      const response = publicKeyCredential.response as AuthenticatorAttestationResponse;
      const publicKey = new Uint8Array(response.getPublicKey()!);
      
      // Register on-chain
      const result = await registerPasskey(publicKey);
      
      if (result.success) {
        setLastTxId(result.txId);
        alert(`Passkey registered! TX: ${result.txId.slice(0, 10)}...`);
      } else {
        alert(result.error || 'Failed to register passkey');
      }
    } catch (error) {
      console.error('Passkey registration failed:', error);
      alert('Passkey registration failed - your browser may not support WebAuthn');
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Total Positions</h3>
          <p className="text-3xl font-bold text-blue-600">{stats.positionCount}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-1">NFTs Minted</h3>
          <p className="text-3xl font-bold text-green-600">{stats.lastTokenId}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Demo Calls</h3>
          <p className="text-3xl font-bold text-purple-600">{stats.demoCount}</p>
          <p className="text-xs text-gray-400 mt-1">Clarity 4 functions</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Fees Collected</h3>
          <p className="text-3xl font-bold text-orange-600">{stats.totalFees.toFixed(2)} STX</p>
        </div>
      </div>

      {/* Block Time Display */}
      {stats.blockTime > 0 && (
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg p-4 mb-8 text-white">
          <p className="text-sm opacity-80">Current Block Time (Clarity 4 stacks-block-time)</p>
          <p className="text-lg font-mono">
            {new Date(stats.blockTime * 1000).toLocaleString()}
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4 mb-8 justify-center">
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          disabled={!isConnected}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
        >
          {showCreateForm ? '✕ Cancel' : '🔒 Create TimeLock Position'}
        </button>

        <button
          onClick={handleRegisterPasskey}
          disabled={!isConnected}
          className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
        >
          🔑 Register Passkey
        </button>

        <button
          onClick={loadStats}
          disabled={isLoading}
          className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Loading...
            </span>
          ) : (
            '🔄 Refresh'
          )}
        </button>
      </div>

      {/* Not Connected Warning */}
      {!isConnected && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8 text-center">
          <p className="text-yellow-800">
            🔐 Connect your wallet to create positions and interact with contracts
          </p>
        </div>
      )}

      {/* Last Transaction */}
      {lastTxId && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
          <p className="text-sm text-blue-800">
            Last Transaction:{' '}
            <a
              href={getExplorerTxUrl(lastTxId)}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono underline hover:text-blue-600"
            >
              {lastTxId.slice(0, 20)}...
            </a>
          </p>
        </div>
      )}

      {/* Create Position Form */}
      {showCreateForm && isConnected && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Create TimeLock Position</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount (STX)
              </label>
              <input
                type="number"
                value={newPosition.amount}
                onChange={(e) => setNewPosition({ ...newPosition, amount: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="100.00"
                min="0.01"
                step="0.01"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Lock Duration
              </label>
              <select
                value={newPosition.duration}
                onChange={(e) => setNewPosition({ ...newPosition, duration: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="7">7 Days</option>
                <option value="30">30 Days</option>
                <option value="90">90 Days (3 months)</option>
                <option value="180">180 Days (6 months)</option>
                <option value="365">365 Days (1 year)</option>
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={newPosition.usePasskey}
                onChange={(e) => setNewPosition({ ...newPosition, usePasskey: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">
                Use Passkey Authentication (Clarity 4 secp256r1-verify)
              </span>
            </label>
          </div>

          <div className="mt-6 flex gap-4">
            <button
              onClick={handleCreatePosition}
              disabled={isLoading || !newPosition.amount}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
            >
              {isLoading ? 'Creating...' : 'Create Position'}
            </button>

            <button
              onClick={() => setShowCreateForm(false)}
              className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Positions List */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Your TimeLock Positions</h2>

        {positions.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">🔒</div>
            <p className="text-gray-500">No positions found. Create your first TimeLock position!</p>
            <p className="text-sm text-gray-400 mt-2">
              Lock your STX and receive a position NFT
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {positions.map((position) => (
              <div key={position.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-gray-900">Position #{position.id}</h3>
                    <p className="text-sm text-gray-600">
                      {position.amount} {position.asset} • {position.duration} days lock
                    </p>
                    <p className="text-xs text-gray-500">
                      Created: {new Date(position.createdAt * 1000).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-gray-500">
                      Unlocks: {new Date(position.unlockTime * 1000).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        position.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {position.isActive ? '🔒 Active' : '🔓 Unlocked'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Clarity 4 Features Info */}
      <div className="mt-8 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-3">✨ Clarity 4 Features Used</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <div className="bg-white rounded-lg p-3">
            <code className="text-purple-600">stacks-block-time</code>
            <p className="text-gray-600 mt-1">Get current block timestamp</p>
          </div>
          <div className="bg-white rounded-lg p-3">
            <code className="text-purple-600">secp256r1-verify</code>
            <p className="text-gray-600 mt-1">WebAuthn passkey verification</p>
          </div>
          <div className="bg-white rounded-lg p-3">
            <code className="text-purple-600">contract-hash?</code>
            <p className="text-gray-600 mt-1">Verify trading bot contracts</p>
          </div>
          <div className="bg-white rounded-lg p-3">
            <code className="text-purple-600">restrict-assets?</code>
            <p className="text-gray-600 mt-1">Asset protection</p>
          </div>
          <div className="bg-white rounded-lg p-3">
            <code className="text-purple-600">to-ascii?</code>
            <p className="text-gray-600 mt-1">Convert uint to ASCII string</p>
          </div>
        </div>
      </div>
    </div>
  );
}
