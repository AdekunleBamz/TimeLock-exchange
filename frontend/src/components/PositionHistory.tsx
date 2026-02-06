'use client';

import React, { useState, useMemo } from 'react';
import { usePositionHistory, PositionHistoryFilters, PositionHistoryEvent } from '../hooks/usePositionHistory';
import { useWallet } from '../lib/wallet-context';
import { formatSTX, formatDate, truncateAddress } from '../lib/utils';
import { CONTRACTS, DEPLOYER_ADDRESS, ACTIVE_NETWORK } from '../lib/constants';

// Mainnet contracts for position history
const POSITION_NFT_CONTRACT = CONTRACTS.positionNft;
const TIMELOCK_CONTRACT = CONTRACTS.timelockExchange;

// Explorer URL for transaction links
const EXPLORER_BASE_URL = ACTIVE_NETWORK === 'mainnet'
  ? 'https://explorer.stacks.co'
  : 'https://explorer.stacks.co/?chain=testnet';

interface PositionHistoryProps {
  positionId?: number;
  showFilters?: boolean;
  showStats?: boolean;
  showExport?: boolean;
  compact?: boolean;
}

export function PositionHistory({
  positionId,
  showFilters = true,
  showStats = true,
  showExport = true,
  compact = false,
}: PositionHistoryProps) {
  const { address } = useWallet();
  const [selectedEventTypes, setSelectedEventTypes] = useState<PositionHistoryEvent['eventType'][]>([]);
  const [dateRange, setDateRange] = useState<{ start?: Date; end?: Date }>({});

  const filters: PositionHistoryFilters = useMemo(() => ({
    positionId,
    eventTypes: selectedEventTypes.length > 0 ? selectedEventTypes : undefined,
    startDate: dateRange.start,
    endDate: dateRange.end,
  }), [positionId, selectedEventTypes, dateRange]);

  const {
    history,
    isLoading,
    error,
    stats,
    pagination,
    refresh,
    exportToCSV,
    exportToJSON,
    setFilters,
  } = usePositionHistory({
    userAddress: address || undefined,
    autoRefresh: true,
    refreshInterval: 60000,
  });

  // Update filters when local state changes
  React.useEffect(() => {
    setFilters(filters);
  }, [filters, setFilters]);

  const eventTypeLabels: Record<PositionHistoryEvent['eventType'], { label: string; color: string; icon: string }> = {
    created: { label: 'Created', color: 'bg-green-100 text-green-800', icon: '➕' },
    claimed: { label: 'Claimed', color: 'bg-blue-100 text-blue-800', icon: '✅' },
    extended: { label: 'Extended', color: 'bg-purple-100 text-purple-800', icon: '⏰' },
    'topped-up': { label: 'Topped Up', color: 'bg-orange-100 text-orange-800', icon: '💰' },
    transferred: { label: 'Transferred', color: 'bg-yellow-100 text-yellow-800', icon: '🔄' },
    'emergency-claimed': { label: 'Emergency Claim', color: 'bg-red-100 text-red-800', icon: '🚨' },
  };

  const handleExportCSV = () => {
    const csv = exportToCSV();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `position-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJSON = () => {
    const json = exportToJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `position-history-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleEventType = (type: PositionHistoryEvent['eventType']) => {
    setSelectedEventTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  if (!address) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="text-center text-gray-500">
          <p>Connect your wallet to view position history</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {positionId ? `Position #${positionId} History` : 'Position History'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Track all your position activities
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={refresh}
              disabled={isLoading}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              aria-label="Refresh"
            >
              <svg className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            {showExport && (
              <div className="relative group">
                <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>
                <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                  <button
                    onClick={handleExportCSV}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Export as CSV
                  </button>
                  <button
                    onClick={handleExportJSON}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Export as JSON
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      {showStats && !compact && (
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Total Events</p>
              <p className="text-xl font-semibold text-gray-900">{stats.totalEvents}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Created</p>
              <p className="text-xl font-semibold text-green-600">{stats.totalCreated}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Claimed</p>
              <p className="text-xl font-semibold text-blue-600">{stats.totalClaimed}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Volume Created</p>
              <p className="text-xl font-semibold text-gray-900">{formatSTX(stats.totalVolumeCreated)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Volume Claimed</p>
              <p className="text-xl font-semibold text-gray-900">{formatSTX(stats.totalVolumeClaimed)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Most Active</p>
              <p className="text-sm font-semibold text-gray-900">{stats.mostActiveDay || 'N/A'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      {showFilters && !compact && (
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-gray-500">Filter by:</span>
            {Object.entries(eventTypeLabels).map(([type, { label, color }]) => (
              <button
                key={type}
                onClick={() => toggleEventType(type as PositionHistoryEvent['eventType'])}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  selectedEventTypes.includes(type as PositionHistoryEvent['eventType'])
                    ? color
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
            {selectedEventTypes.length > 0 && (
              <button
                onClick={() => setSelectedEventTypes([])}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
      )}

      {/* History List */}
      <div className="divide-y divide-gray-100">
        {error && (
          <div className="px-6 py-8 text-center">
            <p className="text-red-600">{error.message}</p>
            <button
              onClick={refresh}
              className="mt-2 text-sm text-indigo-600 hover:text-indigo-700"
            >
              Try again
            </button>
          </div>
        )}

        {isLoading && history.length === 0 && (
          <div className="px-6 py-8">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse flex items-center gap-4 py-4">
                <div className="w-10 h-10 bg-gray-200 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
                <div className="h-4 bg-gray-200 rounded w-20" />
              </div>
            ))}
          </div>
        )}

        {!isLoading && history.length === 0 && (
          <div className="px-6 py-12 text-center">
            <div className="text-4xl mb-4">📜</div>
            <p className="text-gray-500">No position history found</p>
            {selectedEventTypes.length > 0 && (
              <p className="text-sm text-gray-400 mt-2">
                Try clearing your filters to see more results
              </p>
            )}
          </div>
        )}

        {history.map(event => {
          const { label, color, icon } = eventTypeLabels[event.eventType];

          return (
            <div
              key={event.id}
              className="px-6 py-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${color}`}>
                  {icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
                      {label}
                    </span>
                    <span className="text-sm text-gray-500">
                      Position #{event.positionId}
                    </span>
                  </div>
                  <div className="mt-1 text-sm text-gray-600">
                    {event.eventType === 'created' && (
                      <span>Created position with {formatSTX(event.details.amount || 0)}</span>
                    )}
                    {event.eventType === 'claimed' && (
                      <span>Claimed {formatSTX(event.details.amount || 0)}</span>
                    )}
                    {event.eventType === 'extended' && (
                      <span>Extended lock from block {event.details.previousUnlockHeight} to {event.details.newUnlockHeight}</span>
                    )}
                    {event.eventType === 'topped-up' && (
                      <span>Added {formatSTX((event.details.newAmount || 0) - (event.details.previousAmount || 0))} (total: {formatSTX(event.details.newAmount || 0)})</span>
                    )}
                    {event.eventType === 'transferred' && (
                      <span>Transferred to {truncateAddress(event.details.to || '')}</span>
                    )}
                    {event.eventType === 'emergency-claimed' && (
                      <span>Emergency claimed {formatSTX(event.details.amount || 0)} (penalty: {formatSTX(event.details.penaltyPaid || 0)})</span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-gray-400">
                    <span>{formatDate(event.timestamp)}</span>
                    <span>Block #{event.blockHeight}</span>
                    <a
                      href={`https://explorer.stacks.co/txid/${event.txId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-indigo-600"
                    >
                      {truncateAddress(event.txId)}
                    </a>
                  </div>
                </div>
                {event.details.feesPaid !== undefined && event.details.feesPaid > 0 && (
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Fees</p>
                    <p className="text-sm text-gray-600">{formatSTX(event.details.feesPaid)}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {(pagination.page - 1) * pagination.pageSize + 1} to{' '}
              {Math.min(pagination.page * pagination.pageSize, pagination.totalItems)} of{' '}
              {pagination.totalItems} events
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={pagination.previousPage}
                disabled={!pagination.hasPrevious}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                onClick={pagination.nextPage}
                disabled={!pagination.hasNext}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PositionHistory;
