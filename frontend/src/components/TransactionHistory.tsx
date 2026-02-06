'use client';

import React, { useState, useMemo } from 'react';
import { useDebounce } from '../hooks/useDebounce';
import { CONTRACTS, DEPLOYER_ADDRESS, ACTIVE_NETWORK } from '../lib/constants';

// Mainnet explorer URLs
const EXPLORER_BASE_URL = ACTIVE_NETWORK === 'mainnet' 
  ? 'https://explorer.stacks.co' 
  : 'https://explorer.stacks.co/?chain=testnet';

// Contract references for transaction parsing
const CONTRACT_NAMES = {
  [CONTRACTS.timelockExchange]: 'TimeLock Exchange',
  [CONTRACTS.staking]: 'Staking',
  [CONTRACTS.stakingRewards]: 'Staking Rewards',
  [CONTRACTS.governance]: 'Governance',
  [CONTRACTS.vault]: 'Vault',
  [CONTRACTS.escrow]: 'Escrow',
  [CONTRACTS.feeCollector]: 'Fee Collector',
  [CONTRACTS.positionNft]: 'Position NFT',
};

// ============================================================================
// Types
// ============================================================================

export type TransactionType = 
  | 'create-position' 
  | 'withdraw' 
  | 'cancel' 
  | 'transfer'
  | 'stake'
  | 'unstake'
  | 'claim-rewards'
  | 'vote'
  | 'delegate'
  | 'create-proposal';

export type TransactionStatus = 'pending' | 'success' | 'failed';

export interface Transaction {
  id: string;
  txId: string;
  type: TransactionType;
  status: TransactionStatus;
  timestamp: number;
  blockHeight?: number;
  amount?: number;
  recipient?: string;
  positionId?: number;
  proposalId?: number;
  fee?: number;
  error?: string;
  metadata?: Record<string, unknown>;
}

interface TransactionHistoryProps {
  transactions: Transaction[];
  isLoading?: boolean;
  onTransactionClick?: (tx: Transaction) => void;
  className?: string;
}

// ============================================================================
// Transaction Type Configs
// ============================================================================

const TX_TYPE_CONFIG: Record<TransactionType, { label: string; icon: React.ReactNode; color: string }> = {
  'create-position': {
    label: 'Create Position',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    color: 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30',
  },
  'withdraw': {
    label: 'Withdraw',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
      </svg>
    ),
    color: 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30',
  },
  'cancel': {
    label: 'Cancel Position',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
    color: 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30',
  },
  'transfer': {
    label: 'Transfer',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
      </svg>
    ),
    color: 'text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-900/30',
  },
  'stake': {
    label: 'Stake',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
      </svg>
    ),
    color: 'text-indigo-600 bg-indigo-100 dark:text-indigo-400 dark:bg-indigo-900/30',
  },
  'unstake': {
    label: 'Unstake',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6L9 12.75l4.286-4.286a11.948 11.948 0 014.306 6.43l.776 2.898m0 0l3.182-5.511m-3.182 5.51l-5.511-3.181" />
      </svg>
    ),
    color: 'text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/30',
  },
  'claim-rewards': {
    label: 'Claim Rewards',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
      </svg>
    ),
    color: 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30',
  },
  'vote': {
    label: 'Vote',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
      </svg>
    ),
    color: 'text-cyan-600 bg-cyan-100 dark:text-cyan-400 dark:bg-cyan-900/30',
  },
  'delegate': {
    label: 'Delegate',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
    color: 'text-pink-600 bg-pink-100 dark:text-pink-400 dark:bg-pink-900/30',
  },
  'create-proposal': {
    label: 'Create Proposal',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
    color: 'text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/30',
  },
};

// ============================================================================
// Status Badge Component
// ============================================================================

const StatusBadge: React.FC<{ status: TransactionStatus }> = ({ status }) => {
  const config = {
    pending: {
      label: 'Pending',
      classes: 'text-yellow-700 bg-yellow-100 dark:text-yellow-300 dark:bg-yellow-900/30',
      icon: (
        <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      ),
    },
    success: {
      label: 'Success',
      classes: 'text-green-700 bg-green-100 dark:text-green-300 dark:bg-green-900/30',
      icon: (
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ),
    },
    failed: {
      label: 'Failed',
      classes: 'text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-900/30',
      icon: (
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      ),
    },
  };

  const { label, classes, icon } = config[status];

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${classes}`}>
      {icon}
      {label}
    </span>
  );
};

// ============================================================================
// Transaction Row Component
// ============================================================================

interface TransactionRowProps {
  transaction: Transaction;
  onClick?: (tx: Transaction) => void;
}

const TransactionRow: React.FC<TransactionRowProps> = ({ transaction, onClick }) => {
  const config = TX_TYPE_CONFIG[transaction.type];

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - timestamp;

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;

    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 6,
    }).format(amount);
  };

  const truncateTxId = (txId: string) => {
    if (txId.length <= 16) return txId;
    return `${txId.slice(0, 8)}...${txId.slice(-6)}`;
  };

  return (
    <div
      className="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
      onClick={() => onClick?.(transaction)}
    >
      {/* Icon */}
      <div className={`p-2 rounded-lg ${config.color}`}>
        {config.icon}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900 dark:text-white">
            {config.label}
          </span>
          <StatusBadge status={transaction.status} />
        </div>
        <div className="flex items-center gap-2 mt-1 text-sm text-gray-500 dark:text-gray-400">
          <span>{formatTime(transaction.timestamp)}</span>
          <span>•</span>
          <a
            href={`https://explorer.stacks.co/txid/${transaction.txId}?chain=mainnet`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="hover:text-indigo-600 dark:hover:text-indigo-400"
          >
            {truncateTxId(transaction.txId)}
          </a>
          {transaction.blockHeight && (
            <>
              <span>•</span>
              <span>Block #{transaction.blockHeight.toLocaleString()}</span>
            </>
          )}
        </div>
      </div>

      {/* Amount */}
      {transaction.amount !== undefined && (
        <div className="text-right">
          <div className="font-medium text-gray-900 dark:text-white">
            {transaction.type === 'withdraw' || transaction.type === 'claim-rewards' ? '+' : ''}
            {formatAmount(transaction.amount)} STX
          </div>
          {transaction.fee !== undefined && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Fee: {formatAmount(transaction.fee)} STX
            </div>
          )}
        </div>
      )}

      {/* Arrow */}
      <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </div>
  );
};

// ============================================================================
// Main Transaction History Component
// ============================================================================

export const TransactionHistory: React.FC<TransactionHistoryProps> = ({
  transactions,
  isLoading = false,
  onTransactionClick,
  className,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TransactionType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<TransactionStatus | 'all'>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  const debouncedSearch = useDebounce(searchQuery, 300);

  // Filter and sort transactions
  const filteredTransactions = useMemo(() => {
    let result = [...transactions];

    // Search filter
    if (debouncedSearch) {
      const query = debouncedSearch.toLowerCase();
      result = result.filter(
        (tx) =>
          tx.txId.toLowerCase().includes(query) ||
          TX_TYPE_CONFIG[tx.type].label.toLowerCase().includes(query) ||
          tx.recipient?.toLowerCase().includes(query)
      );
    }

    // Type filter
    if (typeFilter !== 'all') {
      result = result.filter((tx) => tx.type === typeFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter((tx) => tx.status === statusFilter);
    }

    // Sort
    result.sort((a, b) => {
      if (sortOrder === 'newest') {
        return b.timestamp - a.timestamp;
      }
      return a.timestamp - b.timestamp;
    });

    return result;
  }, [transactions, debouncedSearch, typeFilter, statusFilter, sortOrder]);

  // Group by date
  const groupedTransactions = useMemo(() => {
    const groups: { label: string; transactions: Transaction[] }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);

    let currentGroup: { label: string; transactions: Transaction[] } | null = null;

    filteredTransactions.forEach((tx) => {
      const txDate = new Date(tx.timestamp);
      txDate.setHours(0, 0, 0, 0);

      let label: string;
      if (txDate.getTime() === today.getTime()) {
        label = 'Today';
      } else if (txDate.getTime() === yesterday.getTime()) {
        label = 'Yesterday';
      } else if (txDate >= lastWeek) {
        label = 'This Week';
      } else {
        label = txDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
      }

      if (!currentGroup || currentGroup.label !== label) {
        currentGroup = { label, transactions: [] };
        groups.push(currentGroup);
      }

      currentGroup.transactions.push(tx);
    });

    return groups;
  }, [filteredTransactions]);

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Transaction History
          </h3>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {filteredTransactions.length} transactions
          </span>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search transactions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Type filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as TransactionType | 'all')}
            className="px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Types</option>
            {Object.entries(TX_TYPE_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
          </select>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as TransactionStatus | 'all')}
            className="px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
          </select>

          {/* Sort */}
          <button
            onClick={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}
            className="px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            {sortOrder === 'newest' ? '↓ Newest' : '↑ Oldest'}
          </button>
        </div>
      </div>

      {/* Transaction List */}
      <div className="max-h-[600px] overflow-y-auto">
        {isLoading ? (
          <div className="p-8 text-center">
            <svg className="w-8 h-8 mx-auto text-gray-400 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="mt-2 text-gray-500 dark:text-gray-400">Loading transactions...</p>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="p-8 text-center">
            <svg className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p className="mt-2 text-gray-500 dark:text-gray-400">No transactions found</p>
            {(searchQuery || typeFilter !== 'all' || statusFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setTypeFilter('all');
                  setStatusFilter('all');
                }}
                className="mt-2 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {groupedTransactions.map((group) => (
              <div key={group.label}>
                <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800/50 sticky top-0">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {group.label}
                  </span>
                </div>
                {group.transactions.map((tx) => (
                  <TransactionRow
                    key={tx.id}
                    transaction={tx}
                    onClick={onTransactionClick}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionHistory;
