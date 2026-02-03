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
import { Modal } from './ui/Modal';
import { formatSTX, formatPercent, formatNumber, formatDate, cn } from '../lib/utils';

// ============================================================================
// Types
// ============================================================================

interface Proposal {
  id: number;
  title: string;
  description: string;
  proposer: string;
  status: 'pending' | 'active' | 'passed' | 'rejected' | 'executed' | 'cancelled';
  forVotes: bigint;
  againstVotes: bigint;
  abstainVotes: bigint;
  startBlock: number;
  endBlock: number;
  executionBlock?: number;
  quorum: bigint;
  threshold: number;
  createdAt: Date;
  actions: ProposalAction[];
}

interface ProposalAction {
  target: string;
  functionName: string;
  args: string[];
}

interface VotingPower {
  total: bigint;
  available: bigint;
  delegated: bigint;
  receivedDelegations: bigint;
}

interface Delegate {
  address: string;
  votingPower: bigint;
  proposalsVoted: number;
  delegators: number;
}

interface VoteRecord {
  proposalId: number;
  vote: 'for' | 'against' | 'abstain';
  weight: bigint;
  timestamp: Date;
  txId: string;
}

interface GovernanceStats {
  totalProposals: number;
  activeProposals: number;
  totalVoters: number;
  quorumPercentage: number;
  proposalThreshold: bigint;
  votingPeriod: number;
  timelockDelay: number;
}

// ============================================================================
// Constants
// ============================================================================

const PROPOSAL_STATUS_CONFIG: Record<Proposal['status'], { label: string; color: string; icon: string }> = {
  pending: { label: 'Pending', color: 'bg-slate-500', icon: '⏳' },
  active: { label: 'Active', color: 'bg-blue-500', icon: '🗳️' },
  passed: { label: 'Passed', color: 'bg-green-500', icon: '✅' },
  rejected: { label: 'Rejected', color: 'bg-red-500', icon: '❌' },
  executed: { label: 'Executed', color: 'bg-purple-500', icon: '⚡' },
  cancelled: { label: 'Cancelled', color: 'bg-gray-500', icon: '🚫' }
};

// ============================================================================
// Helper Components
// ============================================================================

const ProposalCard: React.FC<{
  proposal: Proposal;
  onVote: (id: number) => void;
  currentBlock: number;
}> = ({ proposal, onVote, currentBlock }) => {
  const statusConfig = PROPOSAL_STATUS_CONFIG[proposal.status];
  const totalVotes = proposal.forVotes + proposal.againstVotes + proposal.abstainVotes;
  const forPercentage = totalVotes > 0 ? Number((proposal.forVotes * BigInt(100)) / totalVotes) : 0;
  const againstPercentage = totalVotes > 0 ? Number((proposal.againstVotes * BigInt(100)) / totalVotes) : 0;
  const quorumReached = totalVotes >= proposal.quorum;
  const blocksRemaining = Math.max(0, proposal.endBlock - currentBlock);
  
  return (
    <Card className="hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge className={cn('text-white', statusConfig.color)}>
                {statusConfig.icon} {statusConfig.label}
              </Badge>
              <span className="text-sm text-slate-500">#{proposal.id}</span>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              {proposal.title}
            </h3>
            <p className="text-sm text-slate-500 mt-1 line-clamp-2">
              {proposal.description}
            </p>
          </div>
        </div>
        
        {/* Vote Progress */}
        <div className="space-y-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-green-600 font-medium">For: {formatPercent(forPercentage)}</span>
                <span className="text-red-600 font-medium">Against: {formatPercent(againstPercentage)}</span>
              </div>
              <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex">
                <div 
                  className="bg-green-500 transition-all"
                  style={{ width: `${forPercentage}%` }}
                />
                <div 
                  className="bg-red-500 transition-all"
                  style={{ width: `${againstPercentage}%` }}
                />
              </div>
            </div>
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">
              Quorum: {formatSTX(totalVotes)} / {formatSTX(proposal.quorum)}
              {quorumReached && <span className="text-green-600 ml-1">✓</span>}
            </span>
            {proposal.status === 'active' && (
              <span className="text-slate-500">
                {blocksRemaining} blocks remaining
              </span>
            )}
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700">
          <div className="text-sm text-slate-500">
            by {proposal.proposer.slice(0, 8)}...{proposal.proposer.slice(-6)}
          </div>
          {proposal.status === 'active' && (
            <Button size="sm" onClick={() => onVote(proposal.id)}>
              Vote
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const VoteModal: React.FC<{
  proposal: Proposal | null;
  isOpen: boolean;
  onClose: () => void;
  votingPower: bigint;
  onSubmitVote: (vote: 'for' | 'against' | 'abstain') => Promise<void>;
}> = ({ proposal, isOpen, onClose, votingPower, onSubmitVote }) => {
  const [selectedVote, setSelectedVote] = useState<'for' | 'against' | 'abstain' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleSubmit = async () => {
    if (!selectedVote) return;
    setIsSubmitting(true);
    try {
      await onSubmitVote(selectedVote);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (!proposal) return null;
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Vote on Proposal #${proposal.id}`}>
      <div className="space-y-6">
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
            {proposal.title}
          </h3>
          <p className="text-sm text-slate-500">{proposal.description}</p>
        </div>
        
        <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
          <p className="text-sm text-slate-500 mb-1">Your Voting Power</p>
          <p className="text-xl font-bold text-slate-900 dark:text-white">
            {formatSTX(votingPower)}
          </p>
        </div>
        
        <div className="space-y-3">
          <p className="font-medium text-slate-900 dark:text-white">Cast Your Vote</p>
          
          <button
            onClick={() => setSelectedVote('for')}
            className={cn(
              'w-full p-4 rounded-lg border-2 transition-all text-left',
              selectedVote === 'for'
                ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                : 'border-slate-200 dark:border-slate-700 hover:border-green-300'
            )}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">👍</span>
              <div>
                <p className="font-medium text-green-600">Vote For</p>
                <p className="text-sm text-slate-500">Support this proposal</p>
              </div>
            </div>
          </button>
          
          <button
            onClick={() => setSelectedVote('against')}
            className={cn(
              'w-full p-4 rounded-lg border-2 transition-all text-left',
              selectedVote === 'against'
                ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                : 'border-slate-200 dark:border-slate-700 hover:border-red-300'
            )}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">👎</span>
              <div>
                <p className="font-medium text-red-600">Vote Against</p>
                <p className="text-sm text-slate-500">Oppose this proposal</p>
              </div>
            </div>
          </button>
          
          <button
            onClick={() => setSelectedVote('abstain')}
            className={cn(
              'w-full p-4 rounded-lg border-2 transition-all text-left',
              selectedVote === 'abstain'
                ? 'border-slate-500 bg-slate-50 dark:bg-slate-800'
                : 'border-slate-200 dark:border-slate-700 hover:border-slate-400'
            )}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">🤷</span>
              <div>
                <p className="font-medium text-slate-600">Abstain</p>
                <p className="text-sm text-slate-500">Count towards quorum only</p>
              </div>
            </div>
          </button>
        </div>
        
        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!selectedVote || isSubmitting}
            className="flex-1"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Vote'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

const DelegateCard: React.FC<{
  delegate: Delegate;
  onDelegate: (address: string) => void;
  isCurrentDelegate: boolean;
}> = ({ delegate, onDelegate, isCurrentDelegate }) => (
  <div className={cn(
    'p-4 rounded-lg border-2 transition-all',
    isCurrentDelegate
      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
      : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300'
  )}>
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-medium">
          {delegate.address.slice(2, 4).toUpperCase()}
        </div>
        <div>
          <p className="font-medium text-slate-900 dark:text-white">
            {delegate.address.slice(0, 8)}...{delegate.address.slice(-6)}
          </p>
          <p className="text-sm text-slate-500">
            {delegate.delegators} delegators
          </p>
        </div>
      </div>
      {isCurrentDelegate && (
        <Badge variant="default">Current</Badge>
      )}
    </div>
    
    <div className="grid grid-cols-2 gap-4 mb-3">
      <div>
        <p className="text-xs text-slate-500">Voting Power</p>
        <p className="font-semibold text-slate-900 dark:text-white">
          {formatSTX(delegate.votingPower)}
        </p>
      </div>
      <div>
        <p className="text-xs text-slate-500">Proposals Voted</p>
        <p className="font-semibold text-slate-900 dark:text-white">
          {delegate.proposalsVoted}
        </p>
      </div>
    </div>
    
    <Button
      variant={isCurrentDelegate ? 'outline' : 'default'}
      size="sm"
      className="w-full"
      onClick={() => onDelegate(delegate.address)}
    >
      {isCurrentDelegate ? 'Undelegate' : 'Delegate'}
    </Button>
  </div>
);

const CreateProposalForm: React.FC<{
  onSubmit: (title: string, description: string) => Promise<void>;
  minThreshold: bigint;
  userPower: bigint;
}> = ({ onSubmit, minThreshold, userPower }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const canCreate = userPower >= minThreshold;
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreate || !title.trim() || !description.trim()) return;
    
    setIsSubmitting(true);
    try {
      await onSubmit(title, description);
      setTitle('');
      setDescription('');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!canCreate && (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            ⚠️ You need at least {formatSTX(minThreshold)} voting power to create proposals.
            Current: {formatSTX(userPower)}
          </p>
        </div>
      )}
      
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Proposal Title
        </label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter proposal title..."
          disabled={!canCreate}
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe your proposal in detail..."
          className="w-full min-h-32 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white resize-y"
          disabled={!canCreate}
        />
      </div>
      
      <Button
        type="submit"
        disabled={!canCreate || !title.trim() || !description.trim() || isSubmitting}
        className="w-full"
      >
        {isSubmitting ? 'Creating...' : 'Create Proposal'}
      </Button>
    </form>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const GovernanceDashboard: React.FC = () => {
  const { isConnected, stxAddress } = useWallet();
  
  // State
  const [activeTab, setActiveTab] = useState('proposals');
  const [isLoading, setIsLoading] = useState(true);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [votingPower, setVotingPower] = useState<VotingPower | null>(null);
  const [delegates, setDelegates] = useState<Delegate[]>([]);
  const [voteHistory, setVoteHistory] = useState<VoteRecord[]>([]);
  const [stats, setStats] = useState<GovernanceStats | null>(null);
  const [currentBlock, setCurrentBlock] = useState(115000);
  const [currentDelegate, setCurrentDelegate] = useState<string | null>(null);
  
  // Modal state
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [isVoteModalOpen, setIsVoteModalOpen] = useState(false);
  
  // Filter state
  const [statusFilter, setStatusFilter] = useState<Proposal['status'] | 'all'>('all');
  
  // Computed
  const filteredProposals = useMemo(() => {
    if (statusFilter === 'all') return proposals;
    return proposals.filter(p => p.status === statusFilter);
  }, [proposals, statusFilter]);
  
  // Load data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Simulated data
        setStats({
          totalProposals: 24,
          activeProposals: 3,
          totalVoters: 847,
          quorumPercentage: 4,
          proposalThreshold: BigInt(10000) * BigInt(1e6),
          votingPeriod: 4320,
          timelockDelay: 144
        });
        
        setProposals([
          {
            id: 24,
            title: 'Increase Staking APR to 15%',
            description: 'Proposal to increase the base staking APR from 12.5% to 15% to incentivize more long-term staking.',
            proposer: 'SP1A2B3C4D5E6F7G8H9I0J',
            status: 'active',
            forVotes: BigInt(250000) * BigInt(1e6),
            againstVotes: BigInt(50000) * BigInt(1e6),
            abstainVotes: BigInt(10000) * BigInt(1e6),
            startBlock: 114000,
            endBlock: 118320,
            quorum: BigInt(200000) * BigInt(1e6),
            threshold: 51,
            createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
            actions: [{ target: 'staking-rewards', functionName: 'set-apr', args: ['u1500'] }]
          },
          {
            id: 23,
            title: 'Add New Fee Tier for High-Volume Users',
            description: 'Introduce a VIP fee tier with 50% reduced fees for users with over 100 positions.',
            proposer: 'SP2B3C4D5E6F7G8H9I0J1K',
            status: 'active',
            forVotes: BigInt(180000) * BigInt(1e6),
            againstVotes: BigInt(120000) * BigInt(1e6),
            abstainVotes: BigInt(5000) * BigInt(1e6),
            startBlock: 113500,
            endBlock: 117820,
            quorum: BigInt(200000) * BigInt(1e6),
            threshold: 51,
            createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
            actions: [{ target: 'fee-collector', functionName: 'add-tier', args: ['vip', 'u50'] }]
          },
          {
            id: 22,
            title: 'Treasury Diversification Strategy',
            description: 'Allocate 20% of treasury funds to stable assets for risk management.',
            proposer: 'SP3C4D5E6F7G8H9I0J1K2L',
            status: 'passed',
            forVotes: BigInt(350000) * BigInt(1e6),
            againstVotes: BigInt(80000) * BigInt(1e6),
            abstainVotes: BigInt(20000) * BigInt(1e6),
            startBlock: 110000,
            endBlock: 114320,
            executionBlock: 114464,
            quorum: BigInt(200000) * BigInt(1e6),
            threshold: 51,
            createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
            actions: []
          },
          {
            id: 21,
            title: 'Reduce Minimum Lock Period to 7 Days',
            description: 'Lower the minimum timelock period from 30 days to 7 days to improve liquidity.',
            proposer: 'SP4D5E6F7G8H9I0J1K2L3M',
            status: 'rejected',
            forVotes: BigInt(100000) * BigInt(1e6),
            againstVotes: BigInt(280000) * BigInt(1e6),
            abstainVotes: BigInt(15000) * BigInt(1e6),
            startBlock: 105000,
            endBlock: 109320,
            quorum: BigInt(200000) * BigInt(1e6),
            threshold: 51,
            createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
            actions: []
          }
        ]);
        
        if (isConnected) {
          setVotingPower({
            total: BigInt(25000) * BigInt(1e6),
            available: BigInt(20000) * BigInt(1e6),
            delegated: BigInt(5000) * BigInt(1e6),
            receivedDelegations: BigInt(3000) * BigInt(1e6)
          });
          
          setVoteHistory([
            {
              proposalId: 22,
              vote: 'for',
              weight: BigInt(20000) * BigInt(1e6),
              timestamp: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
              txId: '0xabc123...'
            },
            {
              proposalId: 21,
              vote: 'against',
              weight: BigInt(18000) * BigInt(1e6),
              timestamp: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000),
              txId: '0xdef456...'
            }
          ]);
        }
        
        setDelegates([
          { address: 'SP1DELEGATE1234567890', votingPower: BigInt(500000) * BigInt(1e6), proposalsVoted: 20, delegators: 45 },
          { address: 'SP2DELEGATE0987654321', votingPower: BigInt(350000) * BigInt(1e6), proposalsVoted: 18, delegators: 32 },
          { address: 'SP3DELEGATE1122334455', votingPower: BigInt(200000) * BigInt(1e6), proposalsVoted: 15, delegators: 28 }
        ]);
      } catch (error) {
        console.error('Failed to load governance data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [isConnected]);
  
  // Handlers
  const handleVote = useCallback((proposalId: number) => {
    const proposal = proposals.find(p => p.id === proposalId);
    if (proposal) {
      setSelectedProposal(proposal);
      setIsVoteModalOpen(true);
    }
  }, [proposals]);
  
  const handleSubmitVote = useCallback(async (vote: 'for' | 'against' | 'abstain') => {
    console.log('Submitting vote:', vote, 'for proposal:', selectedProposal?.id);
    await new Promise(resolve => setTimeout(resolve, 2000));
  }, [selectedProposal]);
  
  const handleDelegate = useCallback(async (address: string) => {
    console.log('Delegating to:', address);
    setCurrentDelegate(prev => prev === address ? null : address);
  }, []);
  
  const handleCreateProposal = useCallback(async (title: string, description: string) => {
    console.log('Creating proposal:', { title, description });
    await new Promise(resolve => setTimeout(resolve, 2000));
  }, []);
  
  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Governance</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Participate in protocol governance and shape the future
          </p>
        </div>
        {votingPower && (
          <div className="text-right">
            <p className="text-sm text-slate-500">Your Voting Power</p>
            <p className="text-2xl font-bold text-indigo-600">
              {formatSTX(votingPower.total)}
            </p>
          </div>
        )}
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                <span className="text-2xl">📜</span>
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Proposals</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {stats?.totalProposals}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <span className="text-2xl">🗳️</span>
              </div>
              <div>
                <p className="text-sm text-slate-500">Active Proposals</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {stats?.activeProposals}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <span className="text-2xl">👥</span>
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Voters</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {stats?.totalVoters}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <span className="text-2xl">🎯</span>
              </div>
              <div>
                <p className="text-sm text-slate-500">Quorum Required</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {stats?.quorumPercentage}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="proposals">Proposals</TabsTrigger>
          <TabsTrigger value="delegate">Delegate</TabsTrigger>
          <TabsTrigger value="create">Create Proposal</TabsTrigger>
          <TabsTrigger value="history">My Votes</TabsTrigger>
        </TabsList>
        
        {/* Proposals Tab */}
        <TabsContent value="proposals" className="mt-6">
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex gap-2 flex-wrap">
              {['all', 'active', 'passed', 'rejected', 'executed'].map((status) => (
                <Button
                  key={status}
                  variant={statusFilter === status ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter(status as typeof statusFilter)}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Button>
              ))}
            </div>
            
            {/* Proposals Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredProposals.map((proposal) => (
                <ProposalCard
                  key={proposal.id}
                  proposal={proposal}
                  onVote={handleVote}
                  currentBlock={currentBlock}
                />
              ))}
            </div>
            
            {filteredProposals.length === 0 && (
              <div className="text-center py-12">
                <div className="text-5xl mb-4">📭</div>
                <h3 className="text-lg font-medium text-slate-900 dark:text-white">
                  No {statusFilter === 'all' ? '' : statusFilter} proposals
                </h3>
              </div>
            )}
          </div>
        </TabsContent>
        
        {/* Delegate Tab */}
        <TabsContent value="delegate" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Top Delegates</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {delegates.map((delegate) => (
                      <DelegateCard
                        key={delegate.address}
                        delegate={delegate}
                        onDelegate={handleDelegate}
                        isCurrentDelegate={currentDelegate === delegate.address}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Your Delegation</CardTitle>
                </CardHeader>
                <CardContent>
                  {votingPower ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <div className="flex justify-between mb-2">
                          <span className="text-sm text-slate-500">Total Power</span>
                          <span className="font-medium">{formatSTX(votingPower.total)}</span>
                        </div>
                        <div className="flex justify-between mb-2">
                          <span className="text-sm text-slate-500">Available</span>
                          <span className="font-medium">{formatSTX(votingPower.available)}</span>
                        </div>
                        <div className="flex justify-between mb-2">
                          <span className="text-sm text-slate-500">Delegated Out</span>
                          <span className="font-medium">{formatSTX(votingPower.delegated)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-slate-500">Received</span>
                          <span className="font-medium text-green-600">+{formatSTX(votingPower.receivedDelegations)}</span>
                        </div>
                      </div>
                      
                      {currentDelegate && (
                        <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                          <p className="text-sm text-slate-500 mb-1">Currently delegated to</p>
                          <p className="font-medium text-slate-900 dark:text-white">
                            {currentDelegate.slice(0, 12)}...{currentDelegate.slice(-8)}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-center text-slate-500 py-8">
                      Connect wallet to view delegation
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
        
        {/* Create Proposal Tab */}
        <TabsContent value="create" className="mt-6">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Create New Proposal</CardTitle>
            </CardHeader>
            <CardContent>
              <CreateProposalForm
                onSubmit={handleCreateProposal}
                minThreshold={stats?.proposalThreshold || BigInt(0)}
                userPower={votingPower?.total || BigInt(0)}
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Vote History Tab */}
        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Your Voting History</CardTitle>
            </CardHeader>
            <CardContent>
              {voteHistory.length > 0 ? (
                <div className="space-y-4">
                  {voteHistory.map((record) => (
                    <div
                      key={`${record.proposalId}-${record.txId}`}
                      className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          'w-10 h-10 rounded-full flex items-center justify-center text-xl',
                          record.vote === 'for' ? 'bg-green-100' : 
                          record.vote === 'against' ? 'bg-red-100' : 'bg-slate-100'
                        )}>
                          {record.vote === 'for' ? '👍' : record.vote === 'against' ? '👎' : '🤷'}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">
                            Proposal #{record.proposalId}
                          </p>
                          <p className="text-sm text-slate-500">
                            {formatDate(record.timestamp)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-slate-900 dark:text-white">
                          {formatSTX(record.weight)}
                        </p>
                        <Badge variant="outline" className={cn(
                          record.vote === 'for' ? 'text-green-600' :
                          record.vote === 'against' ? 'text-red-600' : 'text-slate-600'
                        )}>
                          {record.vote.charAt(0).toUpperCase() + record.vote.slice(1)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-5xl mb-4">🗳️</div>
                  <h3 className="text-lg font-medium text-slate-900 dark:text-white">
                    No Votes Yet
                  </h3>
                  <p className="text-slate-500 mt-2">
                    Cast your first vote on an active proposal
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Vote Modal */}
      <VoteModal
        proposal={selectedProposal}
        isOpen={isVoteModalOpen}
        onClose={() => setIsVoteModalOpen(false)}
        votingPower={votingPower?.available || BigInt(0)}
        onSubmitVote={handleSubmitVote}
      />
    </div>
  );
};

export default GovernanceDashboard;
