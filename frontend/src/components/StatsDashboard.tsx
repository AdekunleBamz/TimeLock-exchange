'use client';

import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';
import { CONTRACTS, DEPLOYER_ADDRESS, ACTIVE_NETWORK } from '@/lib/constants';
import type { FeeStats, PauseStatus } from '@/lib/types';

// Mainnet contracts for stats fetching
const TIMELOCK_CONTRACT = CONTRACTS.timelockExchange;
const FEE_COLLECTOR_CONTRACT = CONTRACTS.feeCollector;
const POSITION_NFT_CONTRACT = CONTRACTS.positionNft;

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

function StatCard({ title, value, subtitle, icon, trend, trendValue, variant = 'default' }: StatCardProps) {
  const variantColors = {
    default: 'text-blue-600',
    success: 'text-green-600',
    warning: 'text-yellow-600',
    danger: 'text-red-600',
  };

  const trendColors = {
    up: 'text-green-500',
    down: 'text-red-500',
    neutral: 'text-gray-500',
  };

  return (
    <Card variant="elevated" padding="md" className="h-full">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className={`text-3xl font-bold mt-1 ${variantColors[variant]}`}>{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
          {trend && trendValue && (
            <p className={`text-xs mt-1 ${trendColors[trend]}`}>
              {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {trendValue}
            </p>
          )}
        </div>
        {icon && <span className="text-3xl opacity-80">{icon}</span>}
      </div>
    </Card>
  );
}

interface StatsDashboardProps {
  totalLockedValue: number;
  totalPositions: number;
  totalNFTs: number;
  feeStats?: FeeStats;
  pauseStatus?: PauseStatus;
  blockTime?: number;
  isLoading?: boolean;
}

export function StatsDashboard({
  totalLockedValue,
  totalPositions,
  totalNFTs,
  feeStats,
  pauseStatus,
  blockTime,
  isLoading = false,
}: StatsDashboardProps) {
  const formatSTX = (amount: number): string => {
    if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(2)}M`;
    if (amount >= 1_000) return `${(amount / 1_000).toFixed(2)}K`;
    return amount.toFixed(2);
  };

  return (
    <div className="space-y-6">
      {/* Pause Status Banner */}
      {pauseStatus?.isPaused && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <h3 className="font-semibold text-red-800">Contract Paused</h3>
            <p className="text-sm text-red-600">{pauseStatus.reason || 'Operations temporarily suspended'}</p>
            {pauseStatus.pausedSince > 0 && (
              <p className="text-xs text-red-500 mt-1">
                Since {new Date(pauseStatus.pausedSince * 1000).toLocaleString()}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Block Time Display */}
      {blockTime && blockTime > 0 && (
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-80">Current Block Time (Clarity 4)</p>
              <p className="text-lg font-mono">{new Date(blockTime * 1000).toLocaleString()}</p>
            </div>
            <Badge variant="secondary" className="bg-white/20 text-white border-0">
              Live
            </Badge>
          </div>
        </div>
      )}

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Value Locked"
          value={`${formatSTX(totalLockedValue)} STX`}
          icon="🔐"
          variant="success"
        />
        <StatCard
          title="Active Positions"
          value={totalPositions}
          icon="📊"
          variant="default"
        />
        <StatCard
          title="NFTs Minted"
          value={totalNFTs}
          icon="🎨"
          variant="default"
        />
        <StatCard
          title="Total Fees Collected"
          value={`${formatSTX(feeStats?.totalFees || 0)} STX`}
          subtitle={`${feeStats?.feeCount || 0} transactions`}
          icon="💰"
          variant="warning"
        />
      </div>

      {/* Fee Tier Breakdown */}
      {feeStats && (
        <Card variant="outlined" padding="lg">
          <CardHeader title="Fee Distribution by Tier" />
          <CardContent>
            <div className="space-y-4">
              {[
                { tier: 1, name: 'Bronze (7d)', fees: feeStats.tier1Fees, color: 'bg-amber-500' },
                { tier: 2, name: 'Silver (30d)', fees: feeStats.tier2Fees, color: 'bg-gray-400' },
                { tier: 3, name: 'Gold (90d)', fees: feeStats.tier3Fees, color: 'bg-yellow-400' },
                { tier: 4, name: 'Platinum (180d)', fees: feeStats.tier4Fees, color: 'bg-blue-400' },
                { tier: 5, name: 'Diamond (365d)', fees: feeStats.tier5Fees, color: 'bg-purple-500' },
              ].map((tier) => {
                const total = feeStats.totalFees || 1;
                const percent = (tier.fees / total) * 100;
                return (
                  <div key={tier.tier}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-gray-700">{tier.name}</span>
                      <span className="text-gray-500">{formatSTX(tier.fees)} STX ({percent.toFixed(1)}%)</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${tier.color}`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Clarity 4 Features Used */}
      <Card variant="glass" padding="lg">
        <CardHeader title="✨ Powered by Clarity 4" />
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { name: 'stacks-block-time', desc: 'Real-time timestamps', icon: '⏰' },
              { name: 'secp256r1-verify', desc: 'WebAuthn passkeys', icon: '🔑' },
              { name: 'contract-hash?', desc: 'Bot verification', icon: '🤖' },
              { name: 'restrict-assets?', desc: 'Asset protection', icon: '🛡️' },
              { name: 'to-ascii?', desc: 'String conversion', icon: '📝' },
            ].map((feature) => (
              <div key={feature.name} className="bg-white rounded-lg p-3 text-center shadow-sm">
                <span className="text-2xl">{feature.icon}</span>
                <p className="text-xs font-mono text-purple-600 mt-1">{feature.name}</p>
                <p className="text-xs text-gray-500">{feature.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
