'use client';

import React, { useState } from 'react';
import { usePortfolioAnalytics, PortfolioProjection } from '../hooks/usePortfolioAnalytics';
import { useWallet } from '../lib/wallet-context';
import { formatSTX } from '../lib/utils';

export function PortfolioAnalytics() {
  const { address } = useWallet();
  const [selectedPeriod, setSelectedPeriod] = useState<PortfolioProjection['period']>('1m');

  const {
    positions,
    metrics,
    timeSeries,
    insights,
    projections,
    isLoading,
    error,
    refresh,
    getUpcomingUnlocks,
  } = usePortfolioAnalytics({
    userAddress: address || undefined,
    includeProjections: true,
    includeInsights: true,
  });

  const upcomingUnlocks = getUpcomingUnlocks(7);
  const selectedProjection = projections.find(p => p.period === selectedPeriod);

  if (!address) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <div className="text-6xl mb-4">📊</div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Portfolio Analytics</h2>
        <p className="text-gray-500">Connect your wallet to view portfolio analytics</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Portfolio Analytics</h2>
          <p className="text-gray-500 mt-1">Comprehensive view of your locked positions</p>
        </div>
        <button
          onClick={refresh}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          <svg className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error.message}
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Total Locked"
          value={formatSTX(metrics.totalLocked)}
          icon="🔒"
          color="indigo"
        />
        <MetricCard
          label="Total Unlocked"
          value={formatSTX(metrics.totalUnlocked)}
          icon="🔓"
          color="green"
        />
        <MetricCard
          label="Active Positions"
          value={metrics.activePositions.toString()}
          icon="📊"
          color="blue"
        />
        <MetricCard
          label="Total Claimed"
          value={formatSTX(metrics.totalClaimed)}
          icon="✅"
          color="purple"
        />
      </div>

      {/* Health Scores */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Portfolio Health</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <HealthScore
            label="Overall Health"
            score={metrics.portfolioHealth}
            description="Based on diversification and balance"
          />
          <HealthScore
            label="Diversification"
            score={metrics.diversificationScore}
            description="Position count and amount distribution"
          />
          <HealthScore
            label="Risk Level"
            score={100 - metrics.riskScore}
            description="Unlock timing concentration"
            invertColor
          />
        </div>
      </div>

      {/* Insights */}
      {insights.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Insights & Recommendations</h3>
          <div className="space-y-3">
            {insights.map((insight, index) => (
              <InsightCard key={index} insight={insight} />
            ))}
          </div>
        </div>
      )}

      {/* Projections */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Future Projections</h3>
          <div className="flex gap-2">
            {(['1w', '1m', '3m', '6m', '1y'] as const).map(period => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period)}
                className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                  selectedPeriod === period
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {period}
              </button>
            ))}
          </div>
        </div>

        {selectedProjection && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500">Projected Unlocks</p>
              <p className="text-2xl font-bold text-gray-900">{formatSTX(selectedProjection.projectedUnlocks)}</p>
              <p className="text-xs text-gray-400 mt-1">
                {selectedProjection.unlockingPositions.length} position(s)
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500">Remaining Locked</p>
              <p className="text-2xl font-bold text-gray-900">{formatSTX(selectedProjection.projectedValue)}</p>
              <p className="text-xs text-gray-400 mt-1">After period ends</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500">Unlock Rate</p>
              <p className="text-2xl font-bold text-gray-900">
                {metrics.totalLocked > 0
                  ? ((selectedProjection.projectedUnlocks / metrics.totalLocked) * 100).toFixed(1)
                  : 0}%
              </p>
              <p className="text-xs text-gray-400 mt-1">Of total locked</p>
            </div>
          </div>
        )}
      </div>

      {/* Upcoming Unlocks */}
      {upcomingUnlocks.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Unlocking This Week</h3>
          <div className="space-y-3">
            {upcomingUnlocks.map(position => (
              <div
                key={position.id}
                className="flex items-center justify-between p-4 bg-amber-50 rounded-lg border border-amber-100"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                    <span className="text-lg">🔓</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Position #{position.id}</p>
                    <p className="text-sm text-gray-500">Block {position.unlockHeight}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{formatSTX(position.amount)}</p>
                  <p className="text-xs text-amber-600">Ready soon</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Value Chart Placeholder */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Portfolio Value Over Time</h3>
        <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
          <div className="text-center text-gray-500">
            <div className="text-4xl mb-2">📈</div>
            <p>Chart visualization</p>
            <p className="text-sm">Integrate with your preferred charting library</p>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-center gap-4 text-sm text-gray-500">
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 bg-indigo-500 rounded-full" />
            Total Value
          </span>
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 bg-green-500 rounded-full" />
            Locked Value
          </span>
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 bg-blue-500 rounded-full" />
            Positions
          </span>
        </div>
      </div>

      {/* Statistics Summary */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Lock Duration Statistics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">
              {Math.round(metrics.averageLockDuration / 144)} days
            </p>
            <p className="text-sm text-gray-500">Average Duration</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">
              {Math.round(metrics.longestLock / 144)} days
            </p>
            <p className="text-sm text-gray-500">Longest Lock</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">
              {Math.round(metrics.shortestLock / 144)} days
            </p>
            <p className="text-sm text-gray-500">Shortest Lock</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">{metrics.totalPositions}</p>
            <p className="text-sm text-gray-500">Total Positions</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Sub-components
function MetricCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: string;
  color: 'indigo' | 'green' | 'blue' | 'purple';
}) {
  const colorClasses = {
    indigo: 'bg-indigo-50 border-indigo-100',
    green: 'bg-green-50 border-green-100',
    blue: 'bg-blue-50 border-blue-100',
    purple: 'bg-purple-50 border-purple-100',
  };

  return (
    <div className={`${colorClasses[color]} rounded-xl border p-4`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{icon}</span>
        <span className="text-sm text-gray-600">{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function HealthScore({
  label,
  score,
  description,
  invertColor = false,
}: {
  label: string;
  score: number;
  description: string;
  invertColor?: boolean;
}) {
  const getColor = () => {
    const adjustedScore = invertColor ? score : score;
    if (adjustedScore >= 70) return 'text-green-600 bg-green-500';
    if (adjustedScore >= 40) return 'text-yellow-600 bg-yellow-500';
    return 'text-red-600 bg-red-500';
  };

  const [textColor, barColor] = getColor().split(' ');

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className={`text-lg font-bold ${textColor}`}>{Math.round(score)}%</span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} rounded-full transition-all duration-500`}
          style={{ width: `${score}%` }}
        />
      </div>
      <p className="text-xs text-gray-500 mt-1">{description}</p>
    </div>
  );
}

function InsightCard({ insight }: { insight: { type: string; title: string; message: string; actionLabel?: string } }) {
  const typeStyles = {
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    success: 'bg-green-50 border-green-200 text-green-800',
    tip: 'bg-purple-50 border-purple-200 text-purple-800',
  };

  const icons = {
    info: 'ℹ️',
    warning: '⚠️',
    success: '✅',
    tip: '💡',
  };

  const style = typeStyles[insight.type as keyof typeof typeStyles] || typeStyles.info;
  const icon = icons[insight.type as keyof typeof icons] || icons.info;

  return (
    <div className={`flex items-start gap-3 p-4 rounded-lg border ${style}`}>
      <span className="text-xl">{icon}</span>
      <div className="flex-1">
        <p className="font-medium">{insight.title}</p>
        <p className="text-sm opacity-80 mt-1">{insight.message}</p>
      </div>
      {insight.actionLabel && (
        <button className="text-sm font-medium hover:underline">{insight.actionLabel}</button>
      )}
    </div>
  );
}

export default PortfolioAnalytics;
