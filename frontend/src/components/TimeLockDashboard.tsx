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
import { LOCK_DURATIONS, CONTRACTS, DEPLOYER_ADDRESS } from '@/lib/constants';
import type { Position } from '@/lib/types';

// New integrated components
import { PositionCard } from './PositionCard';
import { CreatePositionModal } from './CreatePositionModal';
import { PasskeyManager } from './PasskeyManager';
import { StatsDashboard } from './StatsDashboard';

// Hooks
import { usePositions } from '@/hooks/usePositions';
import { usePasskeys } from '@/hooks/usePasskeys';
import { useFees } from '@/hooks/useFees';
import { useContractStatus } from '@/hooks/useContractStatus';

// UI Components
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/Tabs';
import { Badge } from './ui/Badge';
import { Tooltip } from './ui/Tooltip';

// Mainnet contract configuration
const TIMELOCK_CONTRACT = CONTRACTS.timelockExchange;

export function TimeLockDashboard() {
  const { isConnected, stxAddress } = useWallet();
  
  // Use new hooks
  const { positions, isLoading: positionsLoading, totalLocked, refetch: refetchPositions } = usePositions();
  const { passkeys, passkeyCount, canAddMore } = usePasskeys();
  const { stats: feeStats, tiers } = useFees();
  const { isPaused, isAdmin, pauseStatus } = useContractStatus();
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState('positions');
  const [lastTxId, setLastTxId] = useState<string | null>(null);
  
  // Legacy stats for backward compatibility
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

  // Loading state for stats
  const [statsLoading, setStatsLoading] = useState(false);

  // Combined loading state
  const isLoading = positionsLoading || statsLoading;

  // Load contract stats
  const loadStats = useCallback(async () => {
    setStatsLoading(true);
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
    setStatsLoading(false);
  }, []);

  // Load on mount
  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Create position handler - now handled by CreatePositionModal
  const handleCreatePosition = async () => {
    // Legacy handler - modal handles this now
    setShowCreateModal(true);
  };

  // Passkey registration - now handled by PasskeyManager
  const handleRegisterPasskey = async () => {
    setActiveTab('passkeys');
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Pause Warning Banner */}
      {isPaused && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <p className="font-semibold text-red-800">Contract Paused</p>
            <p className="text-sm text-red-600">
              New positions and withdrawals are temporarily disabled.
              {pauseStatus?.pausedBy && ` Paused by: ${pauseStatus.pausedBy.slice(0, 10)}...`}
            </p>
          </div>
        </div>
      )}

      {/* Stats Dashboard */}
      <StatsDashboard />

      {/* Block Time Display */}
      {stats.blockTime > 0 && (
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg p-4 mb-8 text-white">
          <p className="text-sm opacity-80">Current Block Time (Clarity 4 stacks-block-time)</p>
          <p className="text-lg font-mono">
            {new Date(stats.blockTime * 1000).toLocaleString()}
          </p>
        </div>
      )}

      {/* Main Action Buttons */}
      <div className="flex flex-wrap gap-4 mb-8 justify-center">
        <button
          onClick={() => setShowCreateModal(true)}
          disabled={!isConnected || isPaused}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2"
        >
          <span>🔒</span> Create TimeLock Position
        </button>

        <button
          onClick={() => {
            loadStats();
            refetchPositions();
          }}
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

      {/* Tabbed Content */}
      <Tabs defaultValue="positions" className="mb-8">
        <TabsList className="mb-4">
          <TabsTrigger value="positions">
            Positions {positions.length > 0 && <Badge variant="primary" size="sm" className="ml-2">{positions.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="passkeys">
            Passkeys {passkeyCount > 0 && <Badge variant="success" size="sm" className="ml-2">{passkeyCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="fees">Fee Tiers</TabsTrigger>
          {isAdmin && <TabsTrigger value="admin">Admin</TabsTrigger>}
        </TabsList>

        <TabsContent value="positions">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Your TimeLock Positions</h2>
              <p className="text-sm text-gray-500">
                Total Locked: <span className="font-semibold">{Number(totalLocked) / 1_000_000} STX</span>
              </p>
            </div>

            {positions.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">🔒</div>
                <p className="text-gray-500">No positions found. Create your first TimeLock position!</p>
                <p className="text-sm text-gray-400 mt-2">
                  Lock your STX and receive a position NFT
                </p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  disabled={!isConnected || isPaused}
                  className="mt-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg text-sm"
                >
                  Create First Position
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {positions.map((position) => (
                  <PositionCard
                    key={position.id}
                    position={{
                      id: position.id,
                      amount: BigInt(Math.floor(position.amount * 1_000_000)),
                      unlockTime: BigInt(position.unlockTime),
                      owner: stxAddress || '',
                      tier: Math.floor(position.duration / 30) || 1,
                      feesPaid: BigInt(0),
                      createdAt: BigInt(position.createdAt),
                      isUnlocked: !position.isActive,
                    }}
                    onUnlock={() => {
                      // Handle unlock
                      console.log('Unlock position', position.id);
                    }}
                    onEarlyWithdraw={() => {
                      // Handle early withdrawal
                      console.log('Early withdraw position', position.id);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="passkeys">
          <PasskeyManager />
        </TabsContent>

        <TabsContent value="fees">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Fee Tiers</h2>
            <p className="text-sm text-gray-600 mb-6">
              Longer lock periods earn lower fees. Choose the tier that fits your needs.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tiers.map((tier) => (
                <div key={tier.name} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-gray-900">{tier.name}</h3>
                    <Badge variant={tier.feePercent <= 25 ? 'success' : tier.feePercent <= 50 ? 'warning' : 'default'}>
                      {(tier.feePercent / 100).toFixed(2)}% fee
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">{tier.description}</p>
                  <p className="text-xs text-gray-400 mt-2">
                    {tier.minDays} - {tier.maxDays === Infinity ? '∞' : tier.maxDays} days
                  </p>
                </div>
              ))}
            </div>
            {feeStats && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-sm text-gray-600">
                  Total fees collected: <span className="font-semibold">{Number(feeStats.totalCollected) / 1_000_000} STX</span>
                </p>
              </div>
            )}
          </div>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="admin">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Admin Controls</h2>
              <div className="flex gap-4">
                <button
                  className={`px-4 py-2 rounded-lg font-medium ${
                    isPaused
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'bg-red-600 hover:bg-red-700 text-white'
                  }`}
                >
                  {isPaused ? '▶️ Resume Contract' : '⏸️ Pause Contract'}
                </button>
              </div>
            </div>
          </TabsContent>
        )}
      </Tabs>

      {/* Create Position Modal */}
      <CreatePositionModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={(txId) => {
          setLastTxId(txId);
          setShowCreateModal(false);
          setTimeout(() => {
            loadStats();
            refetchPositions();
          }, 3000);
        }}
      />

      {/* Clarity 4 Features Info */}
      <div className="mt-8 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-3">✨ Clarity 4 Features Used</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <Tooltip content="Get accurate block timestamps for position timing">
            <div className="bg-white rounded-lg p-3 cursor-help">
              <code className="text-purple-600">stacks-block-time</code>
              <p className="text-gray-600 mt-1">Get current block timestamp</p>
            </div>
          </Tooltip>
          <Tooltip content="Hardware key verification for secure position management">
            <div className="bg-white rounded-lg p-3 cursor-help">
              <code className="text-purple-600">secp256r1-verify</code>
              <p className="text-gray-600 mt-1">WebAuthn passkey verification</p>
            </div>
          </Tooltip>
          <Tooltip content="Verify contract integrity before interactions">
            <div className="bg-white rounded-lg p-3 cursor-help">
              <code className="text-purple-600">contract-hash?</code>
              <p className="text-gray-600 mt-1">Verify trading bot contracts</p>
            </div>
          </Tooltip>
          <Tooltip content="Prevent unauthorized asset movements">
            <div className="bg-white rounded-lg p-3 cursor-help">
              <code className="text-purple-600">restrict-assets?</code>
              <p className="text-gray-600 mt-1">Asset protection</p>
            </div>
          </Tooltip>
          <Tooltip content="Generate readable NFT metadata on-chain">
            <div className="bg-white rounded-lg p-3 cursor-help">
              <code className="text-purple-600">to-ascii?</code>
              <p className="text-gray-600 mt-1">Convert uint to ASCII string</p>
            </div>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
