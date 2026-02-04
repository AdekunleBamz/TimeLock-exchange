'use client';

import { Skeleton } from './ui/Skeleton';

/**
 * Position Card Loading Skeleton
 * Displays while position data is being fetched
 */
export function PositionCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <Skeleton variant="circular" width={48} height={48} />
          <div>
            <Skeleton variant="text" width={120} height={20} className="mb-1" />
            <Skeleton variant="text" width={80} height={14} />
          </div>
        </div>
        <Skeleton variant="rounded" width={70} height={24} />
      </div>

      {/* Amount */}
      <div className="mb-4">
        <Skeleton variant="text" width={60} height={12} className="mb-1" />
        <Skeleton variant="text" width={140} height={32} />
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex justify-between mb-1">
          <Skeleton variant="text" width={80} height={12} />
          <Skeleton variant="text" width={40} height={12} />
        </div>
        <Skeleton variant="rounded" height={8} />
      </div>

      {/* Time remaining */}
      <div className="flex justify-between items-center mb-4">
        <Skeleton variant="text" width={100} height={14} />
        <Skeleton variant="text" width={80} height={14} />
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <Skeleton variant="rounded" width="100%" height={40} />
      </div>
    </div>
  );
}

/**
 * Stats Card Loading Skeleton
 */
export function StatsCardSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <Skeleton variant="text" width={100} height={14} className="mb-2" />
      <Skeleton variant="text" width={80} height={36} />
    </div>
  );
}

/**
 * Dashboard Stats Loading Skeleton
 */
export function StatsDashboardSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <StatsCardSkeleton />
      <StatsCardSkeleton />
      <StatsCardSkeleton />
      <StatsCardSkeleton />
    </div>
  );
}

/**
 * Passkey Item Loading Skeleton
 */
export function PasskeyItemSkeleton() {
  return (
    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
      <div className="flex items-center gap-3">
        <Skeleton variant="circular" width={40} height={40} />
        <div>
          <Skeleton variant="text" width={120} height={16} className="mb-1" />
          <Skeleton variant="text" width={80} height={12} />
        </div>
      </div>
      <Skeleton variant="rounded" width={80} height={32} />
    </div>
  );
}

/**
 * Fee Tier Card Loading Skeleton
 */
export function FeeTierSkeleton() {
  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex justify-between items-start mb-2">
        <Skeleton variant="text" width={100} height={18} />
        <Skeleton variant="rounded" width={60} height={22} />
      </div>
      <Skeleton variant="text" width="100%" height={14} className="mb-1" />
      <Skeleton variant="text" width={80} height={12} />
    </div>
  );
}

/**
 * Full Page Loading
 */
export function PageLoadingSkeleton() {
  return (
    <div className="max-w-6xl mx-auto py-8">
      {/* Stats */}
      <StatsDashboardSkeleton />

      {/* Block time banner */}
      <Skeleton variant="rounded" width="100%" height={64} className="mb-8" />

      {/* Action buttons */}
      <div className="flex justify-center gap-4 mb-8">
        <Skeleton variant="rounded" width={200} height={48} />
        <Skeleton variant="rounded" width={120} height={48} />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <Skeleton variant="rounded" width={100} height={36} />
        <Skeleton variant="rounded" width={100} height={36} />
        <Skeleton variant="rounded" width={100} height={36} />
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <Skeleton variant="text" width={200} height={24} className="mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <PositionCardSkeleton />
          <PositionCardSkeleton />
        </div>
      </div>
    </div>
  );
}

/**
 * Transaction Pending Overlay
 */
export function TransactionPendingOverlay({ message = 'Processing transaction...' }: { message?: string }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-8 max-w-sm w-full mx-4 text-center">
        <div className="relative w-16 h-16 mx-auto mb-4">
          <div className="absolute inset-0 border-4 border-blue-200 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{message}</h3>
        <p className="text-sm text-gray-600">Please confirm the transaction in your wallet</p>
      </div>
    </div>
  );
}

export default PositionCardSkeleton;
