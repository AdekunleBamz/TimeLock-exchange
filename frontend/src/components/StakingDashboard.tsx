'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useWallet } from '../lib/wallet-context';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Badge } from './ui/Badge';
import { Progress } from './ui/Progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/Tabs';
import { Skeleton } from './ui/Skeleton';
import { formatSTX, formatPercent, formatNumber, formatDate } from '../lib/utils';
import { CONTRACTS, DEPLOYER_ADDRESS, parseContractId } from '../lib/constants';
import { useStaking } from '../hooks/useStaking';

// Mainnet staking contracts
const STAKING_CONTRACT = CONTRACTS.staking; // SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT.staking-v1
const REWARDS_CONTRACT = CONTRACTS.stakingRewards; // SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT.staking-rewards-v2

// ============================================================================
// Types
// ============================================================================

interface StakingStats {
  totalStaked: bigint;
  totalRewards: bigint;
  apr: number;
  totalStakers: number;
  minStakeAmount: bigint;
  lockPeriod: number;
  cooldownPeriod: number;
}

interface UserStake {
  amount: bigint;
  startBlock: number;
  lastRewardBlock: number;
  pendingRewards: bigint;
  lockEndBlock: number;
  isLocked: boolean;
  multiplier: number;
}

interface StakingTier {
  name: string;
  minAmount: bigint;
  multiplier: number;
  benefits: string[];
  color: string;
  icon: string;
}

interface RewardHistory {
  id: string;
  type: 'claim' | 'stake' | 'unstake' | 'compound';
  amount: bigint;
  timestamp: Date;
  txId: string;
  blockHeight: number;
}

interface LeaderboardEntry {
  rank: number;
  address: string;
  stakedAmount: bigint;
  rewards: bigint;
  tier: string;
}

// ============================================================================
// Constants
// ============================================================================

const STAKING_TIERS: StakingTier[] = [
  {
    name: 'Bronze',
    minAmount: BigInt(1000) * BigInt(1e6),
    multiplier: 1.0,
    benefits: ['Base APR', 'Weekly rewards'],
    color: 'from-amber-600 to-amber-800',
    icon: '🥉'
  },
  {
    name: 'Silver',
    minAmount: BigInt(10000) * BigInt(1e6),
    multiplier: 1.25,
    benefits: ['1.25x APR boost', 'Daily rewards', 'Governance voting'],
    color: 'from-slate-400 to-slate-600',
    icon: '🥈'
  },
  {
    name: 'Gold',
    minAmount: BigInt(50000) * BigInt(1e6),
    multiplier: 1.5,
    benefits: ['1.5x APR boost', 'Priority support', 'Early access features'],
    color: 'from-yellow-400 to-yellow-600',
    icon: '🥇'
  },
  {
    name: 'Platinum',
    minAmount: BigInt(100000) * BigInt(1e6),
    multiplier: 2.0,
    benefits: ['2x APR boost', 'Fee discounts', 'Exclusive events', 'VIP support'],
    color: 'from-cyan-400 to-cyan-600',
    icon: '💎'
  }
];

// ============================================================================
// Helper Components
// ============================================================================

const StatCard: React.FC<{
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: { value: number; isPositive: boolean };
}> = ({ title, value, subtitle, icon, trend }) => (
  <Card className="relative overflow-hidden">
    <CardContent className="p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{value}</h3>
          {subtitle && (
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{subtitle}</p>
          )}
          {trend && (
            <div className={`flex items-center mt-2 text-sm ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
              <span>{trend.isPositive ? '↑' : '↓'}</span>
              <span className="ml-1">{Math.abs(trend.value)}%</span>
              <span className="ml-1 text-slate-500">vs last week</span>
            </div>
          )}
        </div>
        <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
          {icon}
        </div>
      </div>
    </CardContent>
  </Card>
);

const TierCard: React.FC<{
  tier: StakingTier;
  isActive: boolean;
  isLocked: boolean;
  progress: number;
}> = ({ tier, isActive, isLocked, progress }) => (
  <div
    className={`relative rounded-xl p-4 border-2 transition-all ${
      isActive
        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
    } ${isLocked ? 'opacity-50' : ''}`}
  >
    {isActive && (
      <div className="absolute -top-2 -right-2">
        <Badge variant="default" className="bg-indigo-600">Current</Badge>
      </div>
    )}
    
    <div className="flex items-center gap-3 mb-3">
      <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${tier.color} flex items-center justify-center text-2xl`}>
        {tier.icon}
      </div>
      <div>
        <h4 className="font-semibold text-slate-900 dark:text-white">{tier.name}</h4>
        <p className="text-sm text-slate-500">{tier.multiplier}x multiplier</p>
      </div>
    </div>
    
    <div className="mb-3">
      <p className="text-xs text-slate-500 mb-1">
        Min: {formatSTX(tier.minAmount)}
      </p>
      {!isActive && !isLocked && progress > 0 && (
        <Progress value={progress} className="h-1" />
      )}
    </div>
    
    <ul className="space-y-1">
      {tier.benefits.map((benefit, i) => (
        <li key={i} className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-2">
          <span className="text-green-500">✓</span>
          {benefit}
        </li>
      ))}
    </ul>
  </div>
);

const RewardHistoryItem: React.FC<{ entry: RewardHistory }> = ({ entry }) => {
  const typeConfig = {
    claim: { icon: '💰', label: 'Claimed', color: 'text-green-600' },
    stake: { icon: '📥', label: 'Staked', color: 'text-blue-600' },
    unstake: { icon: '📤', label: 'Unstaked', color: 'text-orange-600' },
    compound: { icon: '🔄', label: 'Compounded', color: 'text-purple-600' }
  };
  
  const config = typeConfig[entry.type];
  
  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-700 last:border-0">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{config.icon}</span>
        <div>
          <p className={`font-medium ${config.color}`}>{config.label}</p>
          <p className="text-sm text-slate-500">{formatDate(entry.timestamp)}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="font-semibold text-slate-900 dark:text-white">
          {entry.type === 'unstake' ? '-' : '+'}{formatSTX(entry.amount)}
        </p>
        <a
          href={`https://explorer.stacks.co/txid/${entry.txId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-indigo-600 hover:underline"
        >
          View tx
        </a>
      </div>
    </div>
  );
};

const LeaderboardRow: React.FC<{ entry: LeaderboardEntry; isCurrentUser: boolean }> = ({ entry, isCurrentUser }) => (
  <tr className={`border-b border-slate-100 dark:border-slate-700 ${isCurrentUser ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''}`}>
    <td className="py-3 px-4">
      <div className="flex items-center gap-2">
        {entry.rank <= 3 ? (
          <span className="text-xl">
            {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : '🥉'}
          </span>
        ) : (
          <span className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-sm font-medium">
            {entry.rank}
          </span>
        )}
      </div>
    </td>
    <td className="py-3 px-4">
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm">
          {entry.address.slice(0, 8)}...{entry.address.slice(-6)}
        </span>
        {isCurrentUser && <Badge variant="outline">You</Badge>}
      </div>
    </td>
    <td className="py-3 px-4 font-medium">{formatSTX(entry.stakedAmount)}</td>
    <td className="py-3 px-4 text-green-600">{formatSTX(entry.rewards)}</td>
    <td className="py-3 px-4">
      <Badge variant="outline">{entry.tier}</Badge>
    </td>
  </tr>
);

// ============================================================================
// Main Component
// ============================================================================

export const StakingDashboard: React.FC = () => {
  const { isConnected, stxAddress } = useWallet();
  
  // State
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [stakingStats, setStakingStats] = useState<StakingStats | null>(null);
  const [userStake, setUserStake] = useState<UserStake | null>(null);
  const [rewardHistory, setRewardHistory] = useState<RewardHistory[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  
  // Form state
  const [stakeAmount, setStakeAmount] = useState('');
  const [unstakeAmount, setUnstakeAmount] = useState('');
  const [isStaking, setIsStaking] = useState(false);
  const [isUnstaking, setIsUnstaking] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [isCompounding, setIsCompounding] = useState(false);
  
  // Computed values
  const currentTier = useMemo(() => {
    if (!userStake) return null;
    const amount = userStake.amount;
    for (let i = STAKING_TIERS.length - 1; i >= 0; i--) {
      if (amount >= STAKING_TIERS[i].minAmount) {
        return STAKING_TIERS[i];
      }
    }
    return null;
  }, [userStake]);
  
  const nextTier = useMemo(() => {
    if (!userStake) return STAKING_TIERS[0];
    const amount = userStake.amount;
    for (const tier of STAKING_TIERS) {
      if (amount < tier.minAmount) {
        return tier;
      }
    }
    return null;
  }, [userStake]);
  
  const progressToNextTier = useMemo(() => {
    if (!userStake || !nextTier || !currentTier) return 0;
    const current = Number(userStake.amount);
    const min = Number(currentTier?.minAmount || 0);
    const max = Number(nextTier.minAmount);
    return Math.min(100, ((current - min) / (max - min)) * 100);
  }, [userStake, currentTier, nextTier]);
  
  const estimatedDailyRewards = useMemo(() => {
    if (!stakingStats || !userStake) return BigInt(0);
    const dailyRate = stakingStats.apr / 365;
    const multiplier = currentTier?.multiplier || 1;
    return BigInt(Math.floor(Number(userStake.amount) * dailyRate * multiplier / 100));
  }, [stakingStats, userStake, currentTier]);
  
  // Load data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Simulated data - replace with actual contract calls
        setStakingStats({
          totalStaked: BigInt(5000000) * BigInt(1e6),
          totalRewards: BigInt(250000) * BigInt(1e6),
          apr: 12.5,
          totalStakers: 1247,
          minStakeAmount: BigInt(100) * BigInt(1e6),
          lockPeriod: 4320, // ~30 days
          cooldownPeriod: 144 // ~1 day
        });
        
        if (isConnected && stxAddress) {
          setUserStake({
            amount: BigInt(25000) * BigInt(1e6),
            startBlock: 100000,
            lastRewardBlock: 115000,
            pendingRewards: BigInt(312) * BigInt(1e6),
            lockEndBlock: 120000,
            isLocked: true,
            multiplier: 1.25
          });
          
          setRewardHistory([
            {
              id: '1',
              type: 'stake',
              amount: BigInt(20000) * BigInt(1e6),
              timestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
              txId: '0x123...abc',
              blockHeight: 100000
            },
            {
              id: '2',
              type: 'stake',
              amount: BigInt(5000) * BigInt(1e6),
              timestamp: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
              txId: '0x456...def',
              blockHeight: 107500
            },
            {
              id: '3',
              type: 'claim',
              amount: BigInt(156) * BigInt(1e6),
              timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
              txId: '0x789...ghi',
              blockHeight: 112000
            }
          ]);
        }
        
        setLeaderboard([
          { rank: 1, address: 'SP1A2B3C4D5E6F7G8H9I0J', stakedAmount: BigInt(500000) * BigInt(1e6), rewards: BigInt(25000) * BigInt(1e6), tier: 'Platinum' },
          { rank: 2, address: 'SP2B3C4D5E6F7G8H9I0J1K', stakedAmount: BigInt(350000) * BigInt(1e6), rewards: BigInt(17500) * BigInt(1e6), tier: 'Platinum' },
          { rank: 3, address: 'SP3C4D5E6F7G8H9I0J1K2L', stakedAmount: BigInt(200000) * BigInt(1e6), rewards: BigInt(10000) * BigInt(1e6), tier: 'Platinum' },
          { rank: 4, address: 'SP4D5E6F7G8H9I0J1K2L3M', stakedAmount: BigInt(75000) * BigInt(1e6), rewards: BigInt(5625) * BigInt(1e6), tier: 'Gold' },
          { rank: 5, address: 'SP5E6F7G8H9I0J1K2L3M4N', stakedAmount: BigInt(50000) * BigInt(1e6), rewards: BigInt(3750) * BigInt(1e6), tier: 'Gold' }
        ]);
      } catch (error) {
        console.error('Failed to load staking data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [isConnected, stxAddress]);
  
  // Actions
  const handleStake = useCallback(async () => {
    if (!stakeAmount || isStaking) return;
    
    setIsStaking(true);
    try {
      const amount = BigInt(Math.floor(parseFloat(stakeAmount) * 1e6));
      console.log('Staking:', amount);
      // TODO: Call staking contract
      await new Promise(resolve => setTimeout(resolve, 2000));
      setStakeAmount('');
    } catch (error) {
      console.error('Stake failed:', error);
    } finally {
      setIsStaking(false);
    }
  }, [stakeAmount, isStaking]);
  
  const handleUnstake = useCallback(async () => {
    if (!unstakeAmount || isUnstaking) return;
    
    setIsUnstaking(true);
    try {
      const amount = BigInt(Math.floor(parseFloat(unstakeAmount) * 1e6));
      console.log('Unstaking:', amount);
      // TODO: Call unstake contract
      await new Promise(resolve => setTimeout(resolve, 2000));
      setUnstakeAmount('');
    } catch (error) {
      console.error('Unstake failed:', error);
    } finally {
      setIsUnstaking(false);
    }
  }, [unstakeAmount, isUnstaking]);
  
  const handleClaimRewards = useCallback(async () => {
    if (isClaiming) return;
    
    setIsClaiming(true);
    try {
      console.log('Claiming rewards');
      // TODO: Call claim contract
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error('Claim failed:', error);
    } finally {
      setIsClaiming(false);
    }
  }, [isClaiming]);
  
  const handleCompound = useCallback(async () => {
    if (isCompounding) return;
    
    setIsCompounding(true);
    try {
      console.log('Compounding rewards');
      // TODO: Call compound contract
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error('Compound failed:', error);
    } finally {
      setIsCompounding(false);
    }
  }, [isCompounding]);
  
  // Render loading state
  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Staking</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Stake your tokens to earn rewards and unlock benefits
          </p>
        </div>
        {currentTier && (
          <div className="flex items-center gap-2">
            <span className="text-2xl">{currentTier.icon}</span>
            <Badge className={`bg-gradient-to-r ${currentTier.color} text-white`}>
              {currentTier.name} Tier
            </Badge>
          </div>
        )}
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Value Staked"
          value={stakingStats ? formatSTX(stakingStats.totalStaked) : '0 STX'}
          subtitle={`${stakingStats?.totalStakers.toLocaleString()} stakers`}
          icon={<span className="text-2xl">🏦</span>}
          trend={{ value: 5.2, isPositive: true }}
        />
        <StatCard
          title="Your Stake"
          value={userStake ? formatSTX(userStake.amount) : '0 STX'}
          subtitle={currentTier ? `${currentTier.multiplier}x multiplier` : 'Not staking'}
          icon={<span className="text-2xl">💎</span>}
        />
        <StatCard
          title="Pending Rewards"
          value={userStake ? formatSTX(userStake.pendingRewards) : '0 STX'}
          subtitle={`~${formatSTX(estimatedDailyRewards)}/day`}
          icon={<span className="text-2xl">🎁</span>}
        />
        <StatCard
          title="Current APR"
          value={stakingStats ? `${stakingStats.apr}%` : '0%'}
          subtitle={currentTier ? `Effective: ${(stakingStats?.apr || 0) * currentTier.multiplier}%` : undefined}
          icon={<span className="text-2xl">📈</span>}
          trend={{ value: 0.8, isPositive: true }}
        />
      </div>
      
      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="stake">Stake / Unstake</TabsTrigger>
          <TabsTrigger value="tiers">Tiers & Benefits</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
        </TabsList>
        
        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Rewards Card */}
            <Card>
              <CardHeader>
                <CardTitle>Rewards</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <div className="text-5xl mb-4">🎁</div>
                  <h3 className="text-3xl font-bold text-slate-900 dark:text-white">
                    {userStake ? formatSTX(userStake.pendingRewards) : '0 STX'}
                  </h3>
                  <p className="text-slate-500 mt-2">Pending rewards</p>
                  
                  <div className="flex gap-3 justify-center mt-6">
                    <Button
                      onClick={handleClaimRewards}
                      disabled={!userStake || userStake.pendingRewards === BigInt(0) || isClaiming}
                    >
                      {isClaiming ? 'Claiming...' : 'Claim Rewards'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleCompound}
                      disabled={!userStake || userStake.pendingRewards === BigInt(0) || isCompounding}
                    >
                      {isCompounding ? 'Compounding...' : 'Compound'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Progress to Next Tier */}
            <Card>
              <CardHeader>
                <CardTitle>Progress to {nextTier?.name || 'Max'} Tier</CardTitle>
              </CardHeader>
              <CardContent>
                {nextTier ? (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-slate-500">
                        {userStake ? formatSTX(userStake.amount) : '0 STX'}
                      </span>
                      <span className="text-sm text-slate-500">
                        {formatSTX(nextTier.minAmount)}
                      </span>
                    </div>
                    <Progress value={progressToNextTier} className="h-3 mb-4" />
                    <div className="text-center">
                      <p className="text-sm text-slate-500">
                        Stake {formatSTX(nextTier.minAmount - (userStake?.amount || BigInt(0)))} more to reach {nextTier.name}
                      </p>
                      <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <p className="font-medium text-slate-900 dark:text-white mb-2">
                          {nextTier.name} Benefits:
                        </p>
                        <ul className="space-y-1">
                          {nextTier.benefits.map((benefit, i) => (
                            <li key={i} className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-2">
                              <span className="text-green-500">✓</span>
                              {benefit}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-5xl mb-4">🏆</div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                      Maximum Tier Reached!
                    </h3>
                    <p className="text-slate-500 mt-2">
                      You&apos;re enjoying all available benefits
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Stake/Unstake Tab */}
        <TabsContent value="stake" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Stake Card */}
            <Card>
              <CardHeader>
                <CardTitle>Stake Tokens</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Amount to Stake
                    </label>
                    <Input
                      type="number"
                      placeholder="Enter amount..."
                      value={stakeAmount}
                      onChange={(e) => setStakeAmount(e.target.value)}
                      min="0"
                    />
                    <p className="text-sm text-slate-500 mt-1">
                      Min: {stakingStats ? formatSTX(stakingStats.minStakeAmount) : '100 STX'}
                    </p>
                  </div>
                  
                  <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-500">Lock Period</span>
                      <span className="font-medium">~30 days</span>
                    </div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-500">Current APR</span>
                      <span className="font-medium text-green-600">{stakingStats?.apr}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Est. Annual Rewards</span>
                      <span className="font-medium">
                        {stakeAmount ? formatSTX(BigInt(Math.floor(parseFloat(stakeAmount) * (stakingStats?.apr || 0) / 100 * 1e6))) : '0 STX'}
                      </span>
                    </div>
                  </div>
                  
                  <Button
                    className="w-full"
                    onClick={handleStake}
                    disabled={!stakeAmount || parseFloat(stakeAmount) <= 0 || isStaking || !isConnected}
                  >
                    {!isConnected ? 'Connect Wallet' : isStaking ? 'Staking...' : 'Stake Tokens'}
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            {/* Unstake Card */}
            <Card>
              <CardHeader>
                <CardTitle>Unstake Tokens</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Amount to Unstake
                    </label>
                    <Input
                      type="number"
                      placeholder="Enter amount..."
                      value={unstakeAmount}
                      onChange={(e) => setUnstakeAmount(e.target.value)}
                      min="0"
                      max={userStake ? Number(userStake.amount) / 1e6 : 0}
                    />
                    <p className="text-sm text-slate-500 mt-1">
                      Available: {userStake ? formatSTX(userStake.amount) : '0 STX'}
                    </p>
                  </div>
                  
                  {userStake?.isLocked && (
                    <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                      <p className="text-sm text-yellow-800 dark:text-yellow-200">
                        ⚠️ Your stake is currently locked. Early unstaking will incur a 10% penalty.
                      </p>
                    </div>
                  )}
                  
                  <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-500">Cooldown Period</span>
                      <span className="font-medium">~1 day</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Pending Rewards</span>
                      <span className="font-medium text-green-600">
                        {userStake ? formatSTX(userStake.pendingRewards) : '0 STX'}
                      </span>
                    </div>
                  </div>
                  
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleUnstake}
                    disabled={!unstakeAmount || parseFloat(unstakeAmount) <= 0 || isUnstaking || !userStake}
                  >
                    {isUnstaking ? 'Unstaking...' : 'Unstake Tokens'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Tiers Tab */}
        <TabsContent value="tiers" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {STAKING_TIERS.map((tier, index) => {
              const isActive = currentTier?.name === tier.name;
              const isLocked = !currentTier && index > 0;
              const progress = nextTier?.name === tier.name ? progressToNextTier : 0;
              
              return (
                <TierCard
                  key={tier.name}
                  tier={tier}
                  isActive={isActive}
                  isLocked={isLocked}
                  progress={progress}
                />
              );
            })}
          </div>
        </TabsContent>
        
        {/* History Tab */}
        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Reward History</CardTitle>
            </CardHeader>
            <CardContent>
              {rewardHistory.length > 0 ? (
                <div className="divide-y divide-slate-100 dark:divide-slate-700">
                  {rewardHistory.map((entry) => (
                    <RewardHistoryItem key={entry.id} entry={entry} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-5xl mb-4">📜</div>
                  <h3 className="text-lg font-medium text-slate-900 dark:text-white">No History Yet</h3>
                  <p className="text-slate-500 mt-2">
                    Your staking and reward history will appear here
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Leaderboard Tab */}
        <TabsContent value="leaderboard" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Top Stakers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Rank</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Address</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Staked</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Rewards</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Tier</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((entry) => (
                      <LeaderboardRow
                        key={entry.rank}
                        entry={entry}
                        isCurrentUser={entry.address === stxAddress}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StakingDashboard;
