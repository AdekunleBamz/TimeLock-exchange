'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { usePriceOracle } from '../hooks/usePriceOracle';

// ============================================================================
// Types
// ============================================================================

interface TimeRange {
  label: string;
  value: '24h' | '7d' | '30d' | '90d' | '1y' | 'all';
  days: number;
}

interface ProtocolMetrics {
  totalValueLocked: number;
  totalPositions: number;
  activeUsers: number;
  totalRewardsDistributed: number;
  averageLockPeriod: number;
  totalFees24h: number;
  volumeLocked24h: number;
  volumeWithdrawn24h: number;
}

interface ChartDataPoint {
  timestamp: number;
  value: number;
  label?: string;
}

interface PieChartData {
  label: string;
  value: number;
  color: string;
  percentage: number;
}

interface AnalyticsDashboardProps {
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

const TIME_RANGES: TimeRange[] = [
  { label: '24h', value: '24h', days: 1 },
  { label: '7d', value: '7d', days: 7 },
  { label: '30d', value: '30d', days: 30 },
  { label: '90d', value: '90d', days: 90 },
  { label: '1y', value: '1y', days: 365 },
  { label: 'All', value: 'all', days: 9999 },
];

const COLORS = {
  primary: '#8B5CF6',
  secondary: '#06B6D4',
  tertiary: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',
};

// ============================================================================
// Utility Functions
// ============================================================================

function formatNumber(value: number, options?: { compact?: boolean; decimals?: number }): string {
  const { compact = false, decimals = 2 } = options || {};
  
  if (compact) {
    if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(decimals)}B`;
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(decimals)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(decimals)}K`;
  }
  
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

function formatCurrency(value: number, compact = false): string {
  if (compact) {
    if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(2)}K`;
  }
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercentage(value: number, showSign = true): string {
  const sign = showSign && value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

function generateMockData(days: number, baseValue: number, volatility: number = 0.1): ChartDataPoint[] {
  const data: ChartDataPoint[] = [];
  const now = Date.now();
  let value = baseValue * (1 - volatility);
  
  for (let i = days; i >= 0; i--) {
    const change = (Math.random() - 0.45) * baseValue * volatility;
    value = Math.max(value + change, baseValue * 0.5);
    value = Math.min(value, baseValue * 1.5);
    
    data.push({
      timestamp: now - i * 24 * 60 * 60 * 1000,
      value,
      label: new Date(now - i * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    });
  }
  
  data[data.length - 1].value = baseValue;
  return data;
}

// ============================================================================
// Chart Components
// ============================================================================

interface LineChartProps {
  data: ChartDataPoint[];
  width?: number;
  height?: number;
  color?: string;
  fillColor?: string;
  showGrid?: boolean;
  showLabels?: boolean;
  className?: string;
}

const LineChart: React.FC<LineChartProps> = ({
  data,
  width = 400,
  height = 200,
  color = COLORS.primary,
  fillColor,
  showGrid = true,
  showLabels = true,
  className = '',
}) => {
  const padding = { top: 20, right: 20, bottom: 40, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const { path, areaPath, yLabels, xLabels, points } = useMemo(() => {
    if (data.length < 2) return { path: '', areaPath: '', yLabels: [], xLabels: [], points: [] };

    const values = data.map(d => d.value);
    const min = Math.min(...values) * 0.95;
    const max = Math.max(...values) * 1.05;
    const range = max - min || 1;

    const pts = data.map((d, i) => ({
      x: padding.left + (i / (data.length - 1)) * chartWidth,
      y: padding.top + chartHeight - ((d.value - min) / range) * chartHeight,
      value: d.value,
      label: d.label,
    }));

    const pathD = `M${pts.map(p => `${p.x},${p.y}`).join(' L')}`;
    const areaD = `${pathD} L${pts[pts.length - 1].x},${padding.top + chartHeight} L${pts[0].x},${padding.top + chartHeight} Z`;

    const yLbls = Array.from({ length: 5 }, (_, i) => ({
      value: min + (range * i) / 4,
      y: padding.top + chartHeight - (chartHeight * i) / 4,
    }));

    const xLbls = data.filter((_, i) => i % Math.ceil(data.length / 6) === 0).map((d, i, arr) => ({
      label: d.label || '',
      x: padding.left + (i / (arr.length - 1 || 1)) * chartWidth,
    }));

    return { path: pathD, areaPath: areaD, yLabels: yLbls, xLabels: xLbls, points: pts };
  }, [data, chartWidth, chartHeight, padding]);

  return (
    <svg width={width} height={height} className={className}>
      {/* Grid lines */}
      {showGrid && (
        <g className="grid">
          {yLabels.map((label, i) => (
            <line
              key={i}
              x1={padding.left}
              x2={width - padding.right}
              y1={label.y}
              y2={label.y}
              stroke="currentColor"
              strokeOpacity={0.1}
              strokeDasharray="4,4"
            />
          ))}
        </g>
      )}

      {/* Area fill */}
      {fillColor && (
        <path
          d={areaPath}
          fill={fillColor}
        />
      )}

      {/* Line */}
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Data points */}
      {points.map((point, i) => (
        <circle
          key={i}
          cx={point.x}
          cy={point.y}
          r={3}
          fill={color}
          className="hover:r-5 transition-all cursor-pointer"
        >
          <title>{formatCurrency(point.value)}</title>
        </circle>
      ))}

      {/* Y-axis labels */}
      {showLabels && yLabels.map((label, i) => (
        <text
          key={i}
          x={padding.left - 10}
          y={label.y + 4}
          textAnchor="end"
          className="text-xs fill-gray-500"
        >
          {formatCurrency(label.value, true)}
        </text>
      ))}

      {/* X-axis labels */}
      {showLabels && xLabels.map((label, i) => (
        <text
          key={i}
          x={label.x}
          y={height - 10}
          textAnchor="middle"
          className="text-xs fill-gray-500"
        >
          {label.label}
        </text>
      ))}
    </svg>
  );
};

interface BarChartProps {
  data: { label: string; value: number; color?: string }[];
  width?: number;
  height?: number;
  className?: string;
}

const BarChart: React.FC<BarChartProps> = ({
  data,
  width = 400,
  height = 200,
  className = '',
}) => {
  const padding = { top: 20, right: 20, bottom: 40, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxValue = Math.max(...data.map(d => d.value)) * 1.1;
  const barWidth = chartWidth / data.length - 10;

  return (
    <svg width={width} height={height} className={className}>
      {data.map((item, i) => {
        const barHeight = (item.value / maxValue) * chartHeight;
        const x = padding.left + i * (chartWidth / data.length) + 5;
        const y = padding.top + chartHeight - barHeight;

        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              fill={item.color || COLORS.primary}
              rx={4}
              className="hover:opacity-80 transition-opacity cursor-pointer"
            >
              <title>{`${item.label}: ${formatNumber(item.value)}`}</title>
            </rect>
            <text
              x={x + barWidth / 2}
              y={height - 10}
              textAnchor="middle"
              className="text-xs fill-gray-500"
            >
              {item.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

interface DonutChartProps {
  data: PieChartData[];
  size?: number;
  strokeWidth?: number;
  className?: string;
}

const DonutChart: React.FC<DonutChartProps> = ({
  data,
  size = 200,
  strokeWidth = 30,
  className = '',
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  let accumulatedOffset = 0;

  return (
    <div className={`relative ${className}`}>
      <svg width={size} height={size} className="transform -rotate-90">
        {data.map((item, i) => {
          const strokeDasharray = (item.percentage / 100) * circumference;
          const strokeDashoffset = -accumulatedOffset;
          accumulatedOffset += strokeDasharray;

          return (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={item.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${strokeDasharray} ${circumference}`}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-300 hover:opacity-80"
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold">
          {formatCurrency(data.reduce((sum, d) => sum + d.value, 0), true)}
        </span>
        <span className="text-sm text-gray-500">Total</span>
      </div>
    </div>
  );
};

// ============================================================================
// Metric Card Component
// ============================================================================

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  changeLabel = '24h',
  icon,
  trend,
  className = '',
}) => {
  const trendColor = trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-gray-500';
  const trendBg = trend === 'up' ? 'bg-green-100 dark:bg-green-900/30' : trend === 'down' ? 'bg-red-100 dark:bg-red-900/30' : 'bg-gray-100 dark:bg-gray-800';

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm ${className}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {change !== undefined && (
            <div className={`inline-flex items-center gap-1 mt-2 px-2 py-1 rounded-full text-xs font-medium ${trendBg} ${trendColor}`}>
              {trend === 'up' && '↑'}
              {trend === 'down' && '↓'}
              {formatPercentage(change)} {changeLabel}
            </div>
          )}
        </div>
        {icon && (
          <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// Main Analytics Dashboard Component
// ============================================================================

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ className = '' }) => {
  const [timeRange, setTimeRange] = useState<TimeRange>(TIME_RANGES[2]); // 30d default
  const [isLoading, setIsLoading] = useState(true);
  const [metrics, setMetrics] = useState<ProtocolMetrics | null>(null);
  const [tvlHistory, setTvlHistory] = useState<ChartDataPoint[]>([]);
  const [volumeHistory, setVolumeHistory] = useState<ChartDataPoint[]>([]);
  const [positionDistribution, setPositionDistribution] = useState<PieChartData[]>([]);
  const [lockPeriodDistribution, setLockPeriodDistribution] = useState<{ label: string; value: number; color: string }[]>([]);
  
  const { stxPrice } = usePriceOracle();

  // Load mock data
  useEffect(() => {
    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      // Protocol metrics
      setMetrics({
        totalValueLocked: 45_000_000,
        totalPositions: 12_456,
        activeUsers: 8_234,
        totalRewardsDistributed: 2_340_000,
        averageLockPeriod: 45,
        totalFees24h: 12_500,
        volumeLocked24h: 1_200_000,
        volumeWithdrawn24h: 800_000,
      });

      // TVL history
      setTvlHistory(generateMockData(timeRange.days, 45_000_000, 0.15));

      // Volume history
      setVolumeHistory(generateMockData(timeRange.days, 2_000_000, 0.3));

      // Position distribution by asset
      setPositionDistribution([
        { label: 'STX', value: 30_000_000, color: COLORS.primary, percentage: 66.7 },
        { label: 'sBTC', value: 10_000_000, color: COLORS.warning, percentage: 22.2 },
        { label: 'ALEX', value: 3_000_000, color: COLORS.tertiary, percentage: 6.7 },
        { label: 'Other', value: 2_000_000, color: COLORS.info, percentage: 4.4 },
      ]);

      // Lock period distribution
      setLockPeriodDistribution([
        { label: '7-30d', value: 2500, color: COLORS.info },
        { label: '30-90d', value: 4200, color: COLORS.tertiary },
        { label: '90-180d', value: 3100, color: COLORS.primary },
        { label: '180-365d', value: 1800, color: COLORS.warning },
        { label: '365d+', value: 856, color: COLORS.danger },
      ]);

      setIsLoading(false);
    }, 1000);
  }, [timeRange]);

  // Calculate changes (mock)
  const tvlChange = useMemo(() => {
    if (tvlHistory.length < 2) return 0;
    const first = tvlHistory[0].value;
    const last = tvlHistory[tvlHistory.length - 1].value;
    return ((last - first) / first) * 100;
  }, [tvlHistory]);

  if (isLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6 animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-2" />
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-32" />
            </div>
          ))}
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 animate-pulse">
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Protocol Analytics</h2>
          <p className="text-gray-500 dark:text-gray-400">
            Real-time insights into TimeLock Exchange
          </p>
        </div>
        
        {/* Time Range Selector */}
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          {TIME_RANGES.map((range) => (
            <button
              key={range.value}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors
                ${timeRange.value === range.value
                  ? 'bg-white dark:bg-gray-700 shadow text-purple-600 dark:text-purple-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Value Locked"
          value={formatCurrency(metrics?.totalValueLocked || 0, true)}
          change={tvlChange}
          changeLabel={timeRange.label}
          trend={tvlChange >= 0 ? 'up' : 'down'}
          icon={
            <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          }
        />
        <MetricCard
          title="Active Positions"
          value={formatNumber(metrics?.totalPositions || 0)}
          change={5.2}
          changeLabel={timeRange.label}
          trend="up"
          icon={
            <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          }
        />
        <MetricCard
          title="Active Users"
          value={formatNumber(metrics?.activeUsers || 0)}
          change={12.8}
          changeLabel={timeRange.label}
          trend="up"
          icon={
            <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          }
        />
        <MetricCard
          title="Rewards Distributed"
          value={formatCurrency(metrics?.totalRewardsDistributed || 0, true)}
          change={8.5}
          changeLabel={timeRange.label}
          trend="up"
          icon={
            <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* TVL Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Total Value Locked</h3>
          <LineChart
            data={tvlHistory}
            width={500}
            height={250}
            color={COLORS.primary}
            fillColor="rgba(139, 92, 246, 0.1)"
            className="w-full"
          />
        </div>

        {/* Volume Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Daily Volume</h3>
          <LineChart
            data={volumeHistory}
            width={500}
            height={250}
            color={COLORS.tertiary}
            fillColor="rgba(16, 185, 129, 0.1)"
            className="w-full"
          />
        </div>
      </div>

      {/* Distribution Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Asset Distribution */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Asset Distribution</h3>
          <div className="flex items-center justify-center">
            <DonutChart data={positionDistribution} size={180} strokeWidth={24} />
          </div>
          <div className="mt-4 space-y-2">
            {positionDistribution.map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-sm text-gray-600 dark:text-gray-400">{item.label}</span>
                </div>
                <span className="text-sm font-medium">{item.percentage.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Lock Period Distribution */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm lg:col-span-2">
          <h3 className="text-lg font-semibold mb-4">Position Lock Periods</h3>
          <BarChart
            data={lockPeriodDistribution}
            width={600}
            height={250}
            className="w-full"
          />
        </div>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
          <p className="text-sm text-gray-500">Avg Lock Period</p>
          <p className="text-xl font-bold mt-1">{metrics?.averageLockPeriod} days</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
          <p className="text-sm text-gray-500">24h Fees</p>
          <p className="text-xl font-bold mt-1">{formatCurrency(metrics?.totalFees24h || 0)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
          <p className="text-sm text-gray-500">24h Locked</p>
          <p className="text-xl font-bold mt-1 text-green-500">{formatCurrency(metrics?.volumeLocked24h || 0, true)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
          <p className="text-sm text-gray-500">24h Withdrawn</p>
          <p className="text-xl font-bold mt-1 text-red-500">{formatCurrency(metrics?.volumeWithdrawn24h || 0, true)}</p>
        </div>
      </div>

      {/* Live Activity Feed */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
        <div className="space-y-3">
          {[
            { type: 'lock', user: 'SP2J...8K4N', amount: 1500, time: '2 min ago' },
            { type: 'withdraw', user: 'SP1M...3H7P', amount: 800, time: '5 min ago' },
            { type: 'stake', user: 'SP3K...9J2M', amount: 5000, time: '8 min ago' },
            { type: 'lock', user: 'SP4N...1K6L', amount: 2200, time: '12 min ago' },
            { type: 'claim', user: 'SP2J...8K4N', amount: 45, time: '15 min ago' },
          ].map((activity, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center
                  ${activity.type === 'lock' ? 'bg-green-100 dark:bg-green-900/30 text-green-600' :
                    activity.type === 'withdraw' ? 'bg-red-100 dark:bg-red-900/30 text-red-600' :
                    activity.type === 'stake' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600' :
                    'bg-blue-100 dark:bg-blue-900/30 text-blue-600'}`}>
                  {activity.type === 'lock' && '🔒'}
                  {activity.type === 'withdraw' && '📤'}
                  {activity.type === 'stake' && '📊'}
                  {activity.type === 'claim' && '💰'}
                </div>
                <div>
                  <p className="text-sm font-medium capitalize">{activity.type}</p>
                  <p className="text-xs text-gray-500">{activity.user}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">{formatNumber(activity.amount)} STX</p>
                <p className="text-xs text-gray-500">{activity.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
