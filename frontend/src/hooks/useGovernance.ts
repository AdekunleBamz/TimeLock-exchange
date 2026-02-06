import { useState, useEffect, useCallback, useMemo } from 'react';
import { useWallet } from '../lib/wallet-context';
import { CONTRACTS, parseContractId, ACTIVE_NETWORK } from '../lib/constants';

// ============================================================================
// Types
// ============================================================================

export interface Proposal {
  id: number;
  title: string;
  description: string;
  proposer: string;
  status: ProposalStatus;
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

export type ProposalStatus = 'pending' | 'active' | 'passed' | 'rejected' | 'executed' | 'cancelled';

export interface ProposalAction {
  target: string;
  functionName: string;
  args: string[];
}

export interface VotingPower {
  total: bigint;
  available: bigint;
  delegated: bigint;
  receivedDelegations: bigint;
}

export interface Delegate {
  address: string;
  votingPower: bigint;
  proposalsVoted: number;
  delegators: number;
}

export interface VoteRecord {
  proposalId: number;
  vote: 'for' | 'against' | 'abstain';
  weight: bigint;
  timestamp: Date;
  txId: string;
}

export interface GovernanceStats {
  totalProposals: number;
  activeProposals: number;
  totalVoters: number;
  quorumPercentage: number;
  proposalThreshold: bigint;
  votingPeriod: number;
  timelockDelay: number;
}

export interface UseGovernanceOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  onVoteSuccess?: (proposalId: number, vote: string, txId: string) => void;
  onDelegateSuccess?: (delegate: string, txId: string) => void;
  onProposalCreated?: (proposalId: number, txId: string) => void;
  onError?: (error: Error) => void;
}

export interface UseGovernanceReturn {
  // State
  isLoading: boolean;
  isVoting: boolean;
  isDelegating: boolean;
  isCreatingProposal: boolean;
  error: Error | null;
  
  // Data
  proposals: Proposal[];
  activeProposals: Proposal[];
  votingPower: VotingPower | null;
  delegates: Delegate[];
  voteHistory: VoteRecord[];
  stats: GovernanceStats | null;
  currentDelegate: string | null;
  
  // Computed
  canVote: boolean;
  canCreateProposal: boolean;
  hasVotedOnProposal: (proposalId: number) => boolean;
  getProposal: (proposalId: number) => Proposal | undefined;
  
  // Actions
  vote: (proposalId: number, vote: 'for' | 'against' | 'abstain') => Promise<string>;
  delegate: (delegatee: string) => Promise<string>;
  undelegate: () => Promise<string>;
  createProposal: (title: string, description: string, actions: ProposalAction[]) => Promise<number>;
  executeProposal: (proposalId: number) => Promise<string>;
  cancelProposal: (proposalId: number) => Promise<string>;
  refresh: () => Promise<void>;
}

// ============================================================================
// Constants - Using Mainnet Contract Addresses
// ============================================================================

/**
 * Governance contract deployed on mainnet
 * @see CONTRACTS.governance
 */
const { address: GOVERNANCE_ADDRESS, name: GOVERNANCE_NAME } = parseContractId(CONTRACTS.governance);
const GOVERNANCE_CONTRACT = CONTRACTS.governance; // SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT.governance-v1

const DEFAULT_OPTIONS: UseGovernanceOptions = {
  autoRefresh: true,
  refreshInterval: 30000
};

// ============================================================================
// Helper Functions
// ============================================================================

function calculateProposalStatus(
  proposal: Partial<Proposal>,
  currentBlock: number
): ProposalStatus {
  if (proposal.status === 'cancelled' || proposal.status === 'executed') {
    return proposal.status;
  }
  
  const startBlock = proposal.startBlock || 0;
  const endBlock = proposal.endBlock || 0;
  const forVotes = proposal.forVotes || BigInt(0);
  const againstVotes = proposal.againstVotes || BigInt(0);
  const quorum = proposal.quorum || BigInt(0);
  const threshold = proposal.threshold || 51;
  
  if (currentBlock < startBlock) {
    return 'pending';
  }
  
  if (currentBlock <= endBlock) {
    return 'active';
  }
  
  // Voting ended
  const totalVotes = forVotes + againstVotes;
  const quorumReached = totalVotes >= quorum;
  const passThreshold = totalVotes > BigInt(0) 
    ? Number((forVotes * BigInt(100)) / totalVotes)
    : 0;
  
  if (quorumReached && passThreshold >= threshold) {
    return 'passed';
  }
  
  return 'rejected';
}

function calculateVotePercentages(proposal: Proposal) {
  const total = proposal.forVotes + proposal.againstVotes + proposal.abstainVotes;
  if (total === BigInt(0)) {
    return { for: 0, against: 0, abstain: 0 };
  }
  
  return {
    for: Number((proposal.forVotes * BigInt(100)) / total),
    against: Number((proposal.againstVotes * BigInt(100)) / total),
    abstain: Number((proposal.abstainVotes * BigInt(100)) / total)
  };
}

// ============================================================================
// Main Hook
// ============================================================================

export function useGovernance(options: UseGovernanceOptions = {}): UseGovernanceReturn {
  const { isConnected, stxAddress, openContractCall } = useWallet();
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  
  // State
  const [isLoading, setIsLoading] = useState(true);
  const [isVoting, setIsVoting] = useState(false);
  const [isDelegating, setIsDelegating] = useState(false);
  const [isCreatingProposal, setIsCreatingProposal] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [votingPower, setVotingPower] = useState<VotingPower | null>(null);
  const [delegates, setDelegates] = useState<Delegate[]>([]);
  const [voteHistory, setVoteHistory] = useState<VoteRecord[]>([]);
  const [stats, setStats] = useState<GovernanceStats | null>(null);
  const [currentDelegate, setCurrentDelegate] = useState<string | null>(null);
  const [currentBlock, setCurrentBlock] = useState(0);
  
  // Computed
  const activeProposals = useMemo(() => {
    return proposals.filter(p => p.status === 'active');
  }, [proposals]);
  
  const canVote = useMemo(() => {
    return isConnected && !isVoting && votingPower !== null && votingPower.available > BigInt(0);
  }, [isConnected, isVoting, votingPower]);
  
  const canCreateProposal = useMemo(() => {
    if (!isConnected || !votingPower || !stats) return false;
    return votingPower.total >= stats.proposalThreshold;
  }, [isConnected, votingPower, stats]);
  
  const hasVotedOnProposal = useCallback((proposalId: number) => {
    return voteHistory.some(v => v.proposalId === proposalId);
  }, [voteHistory]);
  
  const getProposal = useCallback((proposalId: number) => {
    return proposals.find(p => p.id === proposalId);
  }, [proposals]);
  
  // Fetch governance data
  const fetchGovernanceData = useCallback(async () => {
    try {
      setError(null);
      
      // Fetch current block
      const blockResponse = await fetch('https://api.mainnet.hiro.so/extended/v1/block?limit=1');
      const blockData = await blockResponse.json();
      const latestBlock = blockData.results?.[0]?.height || 115000;
      setCurrentBlock(latestBlock);
      
      // TODO: Replace with actual contract calls
      setStats({
        totalProposals: 24,
        activeProposals: 3,
        totalVoters: 847,
        quorumPercentage: 4,
        proposalThreshold: BigInt(10000) * BigInt(1e6),
        votingPeriod: 4320,
        timelockDelay: 144
      });
      
      // Simulated proposals
      const simulatedProposals: Proposal[] = [
        {
          id: 24,
          title: 'Increase Staking APR to 15%',
          description: 'Proposal to increase the base staking APR from 12.5% to 15%',
          proposer: 'SP1A2B3C4D5E6F7G8H9I0J',
          status: 'active',
          forVotes: BigInt(250000) * BigInt(1e6),
          againstVotes: BigInt(50000) * BigInt(1e6),
          abstainVotes: BigInt(10000) * BigInt(1e6),
          startBlock: latestBlock - 1000,
          endBlock: latestBlock + 3320,
          quorum: BigInt(200000) * BigInt(1e6),
          threshold: 51,
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          actions: [{ target: 'staking-rewards', functionName: 'set-apr', args: ['u1500'] }]
        },
        {
          id: 23,
          title: 'Add VIP Fee Tier',
          description: 'Introduce a VIP fee tier with 50% reduced fees',
          proposer: 'SP2B3C4D5E6F7G8H9I0J1K',
          status: 'active',
          forVotes: BigInt(180000) * BigInt(1e6),
          againstVotes: BigInt(120000) * BigInt(1e6),
          abstainVotes: BigInt(5000) * BigInt(1e6),
          startBlock: latestBlock - 500,
          endBlock: latestBlock + 3820,
          quorum: BigInt(200000) * BigInt(1e6),
          threshold: 51,
          createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          actions: [{ target: 'fee-collector', functionName: 'add-tier', args: ['vip', 'u50'] }]
        },
        {
          id: 22,
          title: 'Treasury Diversification',
          description: 'Allocate 20% of treasury to stable assets',
          proposer: 'SP3C4D5E6F7G8H9I0J1K2L',
          status: 'passed',
          forVotes: BigInt(350000) * BigInt(1e6),
          againstVotes: BigInt(80000) * BigInt(1e6),
          abstainVotes: BigInt(20000) * BigInt(1e6),
          startBlock: latestBlock - 5000,
          endBlock: latestBlock - 680,
          executionBlock: latestBlock - 536,
          quorum: BigInt(200000) * BigInt(1e6),
          threshold: 51,
          createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
          actions: []
        },
        {
          id: 21,
          title: 'Reduce Minimum Lock Period',
          description: 'Lower minimum timelock from 30 to 7 days',
          proposer: 'SP4D5E6F7G8H9I0J1K2L3M',
          status: 'rejected',
          forVotes: BigInt(100000) * BigInt(1e6),
          againstVotes: BigInt(280000) * BigInt(1e6),
          abstainVotes: BigInt(15000) * BigInt(1e6),
          startBlock: latestBlock - 10000,
          endBlock: latestBlock - 5680,
          quorum: BigInt(200000) * BigInt(1e6),
          threshold: 51,
          createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
          actions: []
        }
      ];
      
      setProposals(simulatedProposals);
      
      if (isConnected && stxAddress) {
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
            txId: '0xabc123'
          },
          {
            proposalId: 21,
            vote: 'against',
            weight: BigInt(18000) * BigInt(1e6),
            timestamp: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000),
            txId: '0xdef456'
          }
        ]);
      }
      
      setDelegates([
        { address: 'SP1DELEGATE1234567890', votingPower: BigInt(500000) * BigInt(1e6), proposalsVoted: 20, delegators: 45 },
        { address: 'SP2DELEGATE0987654321', votingPower: BigInt(350000) * BigInt(1e6), proposalsVoted: 18, delegators: 32 },
        { address: 'SP3DELEGATE1122334455', votingPower: BigInt(200000) * BigInt(1e6), proposalsVoted: 15, delegators: 28 }
      ]);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch governance data');
      setError(error);
      mergedOptions.onError?.(error);
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, stxAddress, mergedOptions]);
  
  // Initial load and refresh
  useEffect(() => {
    fetchGovernanceData();
    
    if (mergedOptions.autoRefresh && mergedOptions.refreshInterval) {
      const interval = setInterval(fetchGovernanceData, mergedOptions.refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchGovernanceData, mergedOptions.autoRefresh, mergedOptions.refreshInterval]);
  
  // Vote on proposal
  const vote = useCallback(async (
    proposalId: number,
    voteChoice: 'for' | 'against' | 'abstain'
  ): Promise<string> => {
    if (!canVote) throw new Error('Cannot vote at this time');
    if (hasVotedOnProposal(proposalId)) throw new Error('Already voted on this proposal');
    
    const proposal = getProposal(proposalId);
    if (!proposal) throw new Error('Proposal not found');
    if (proposal.status !== 'active') throw new Error('Proposal is not active');
    
    setIsVoting(true);
    setError(null);
    
    try {
      const voteValue = voteChoice === 'for' ? 1 : voteChoice === 'against' ? 2 : 3;
      
      const txId = await openContractCall({
        contractAddress: GOVERNANCE_CONTRACT.split('.')[0],
        contractName: GOVERNANCE_CONTRACT.split('.')[1],
        functionName: 'vote',
        functionArgs: [proposalId.toString(), voteValue.toString()]
      });
      
      const voteWeight = votingPower?.available || BigInt(0);
      
      // Optimistic update
      setProposals(prev => prev.map(p => {
        if (p.id !== proposalId) return p;
        return {
          ...p,
          forVotes: voteChoice === 'for' ? p.forVotes + voteWeight : p.forVotes,
          againstVotes: voteChoice === 'against' ? p.againstVotes + voteWeight : p.againstVotes,
          abstainVotes: voteChoice === 'abstain' ? p.abstainVotes + voteWeight : p.abstainVotes
        };
      }));
      
      setVoteHistory(prev => [{
        proposalId,
        vote: voteChoice,
        weight: voteWeight,
        timestamp: new Date(),
        txId
      }, ...prev]);
      
      mergedOptions.onVoteSuccess?.(proposalId, voteChoice, txId);
      return txId;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Vote failed');
      setError(error);
      mergedOptions.onError?.(error);
      throw error;
    } finally {
      setIsVoting(false);
    }
  }, [canVote, hasVotedOnProposal, getProposal, votingPower, openContractCall, mergedOptions]);
  
  // Delegate voting power
  const delegate = useCallback(async (delegatee: string): Promise<string> => {
    if (!isConnected) throw new Error('Wallet not connected');
    if (delegatee === stxAddress) throw new Error('Cannot delegate to yourself');
    
    setIsDelegating(true);
    setError(null);
    
    try {
      const txId = await openContractCall({
        contractAddress: GOVERNANCE_CONTRACT.split('.')[0],
        contractName: GOVERNANCE_CONTRACT.split('.')[1],
        functionName: 'delegate',
        functionArgs: [delegatee]
      });
      
      // Optimistic update
      setCurrentDelegate(delegatee);
      setVotingPower(prev => prev ? {
        ...prev,
        delegated: prev.total,
        available: BigInt(0)
      } : null);
      
      mergedOptions.onDelegateSuccess?.(delegatee, txId);
      return txId;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Delegation failed');
      setError(error);
      mergedOptions.onError?.(error);
      throw error;
    } finally {
      setIsDelegating(false);
    }
  }, [isConnected, stxAddress, openContractCall, mergedOptions]);
  
  // Undelegate
  const undelegate = useCallback(async (): Promise<string> => {
    if (!isConnected) throw new Error('Wallet not connected');
    if (!currentDelegate) throw new Error('Not currently delegating');
    
    setIsDelegating(true);
    setError(null);
    
    try {
      const txId = await openContractCall({
        contractAddress: GOVERNANCE_CONTRACT.split('.')[0],
        contractName: GOVERNANCE_CONTRACT.split('.')[1],
        functionName: 'undelegate',
        functionArgs: []
      });
      
      // Optimistic update
      setCurrentDelegate(null);
      setVotingPower(prev => prev ? {
        ...prev,
        delegated: BigInt(0),
        available: prev.total
      } : null);
      
      return txId;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Undelegation failed');
      setError(error);
      mergedOptions.onError?.(error);
      throw error;
    } finally {
      setIsDelegating(false);
    }
  }, [isConnected, currentDelegate, openContractCall, mergedOptions]);
  
  // Create proposal
  const createProposal = useCallback(async (
    title: string,
    description: string,
    actions: ProposalAction[]
  ): Promise<number> => {
    if (!canCreateProposal) throw new Error('Insufficient voting power to create proposal');
    
    setIsCreatingProposal(true);
    setError(null);
    
    try {
      const txId = await openContractCall({
        contractAddress: GOVERNANCE_CONTRACT.split('.')[0],
        contractName: GOVERNANCE_CONTRACT.split('.')[1],
        functionName: 'create-proposal',
        functionArgs: [title, description, JSON.stringify(actions)]
      });
      
      const newProposalId = (stats?.totalProposals || 0) + 1;
      
      // Optimistic update
      const newProposal: Proposal = {
        id: newProposalId,
        title,
        description,
        proposer: stxAddress || '',
        status: 'pending',
        forVotes: BigInt(0),
        againstVotes: BigInt(0),
        abstainVotes: BigInt(0),
        startBlock: currentBlock + 144, // ~1 day delay
        endBlock: currentBlock + 144 + (stats?.votingPeriod || 4320),
        quorum: BigInt(200000) * BigInt(1e6),
        threshold: 51,
        createdAt: new Date(),
        actions
      };
      
      setProposals(prev => [newProposal, ...prev]);
      setStats(prev => prev ? { ...prev, totalProposals: prev.totalProposals + 1 } : null);
      
      mergedOptions.onProposalCreated?.(newProposalId, txId);
      return newProposalId;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create proposal');
      setError(error);
      mergedOptions.onError?.(error);
      throw error;
    } finally {
      setIsCreatingProposal(false);
    }
  }, [canCreateProposal, stats, stxAddress, currentBlock, openContractCall, mergedOptions]);
  
  // Execute proposal
  const executeProposal = useCallback(async (proposalId: number): Promise<string> => {
    const proposal = getProposal(proposalId);
    if (!proposal) throw new Error('Proposal not found');
    if (proposal.status !== 'passed') throw new Error('Proposal must be passed to execute');
    
    try {
      const txId = await openContractCall({
        contractAddress: GOVERNANCE_CONTRACT.split('.')[0],
        contractName: GOVERNANCE_CONTRACT.split('.')[1],
        functionName: 'execute-proposal',
        functionArgs: [proposalId.toString()]
      });
      
      // Optimistic update
      setProposals(prev => prev.map(p => 
        p.id === proposalId 
          ? { ...p, status: 'executed' as ProposalStatus, executionBlock: currentBlock }
          : p
      ));
      
      return txId;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Execution failed');
      setError(error);
      mergedOptions.onError?.(error);
      throw error;
    }
  }, [getProposal, currentBlock, openContractCall, mergedOptions]);
  
  // Cancel proposal
  const cancelProposal = useCallback(async (proposalId: number): Promise<string> => {
    const proposal = getProposal(proposalId);
    if (!proposal) throw new Error('Proposal not found');
    if (proposal.proposer !== stxAddress) throw new Error('Only proposer can cancel');
    if (proposal.status !== 'pending' && proposal.status !== 'active') {
      throw new Error('Cannot cancel this proposal');
    }
    
    try {
      const txId = await openContractCall({
        contractAddress: GOVERNANCE_CONTRACT.split('.')[0],
        contractName: GOVERNANCE_CONTRACT.split('.')[1],
        functionName: 'cancel-proposal',
        functionArgs: [proposalId.toString()]
      });
      
      // Optimistic update
      setProposals(prev => prev.map(p => 
        p.id === proposalId ? { ...p, status: 'cancelled' as ProposalStatus } : p
      ));
      
      return txId;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Cancel failed');
      setError(error);
      mergedOptions.onError?.(error);
      throw error;
    }
  }, [getProposal, stxAddress, openContractCall, mergedOptions]);
  
  const refresh = useCallback(async () => {
    await fetchGovernanceData();
  }, [fetchGovernanceData]);
  
  return {
    // State
    isLoading,
    isVoting,
    isDelegating,
    isCreatingProposal,
    error,
    
    // Data
    proposals,
    activeProposals,
    votingPower,
    delegates,
    voteHistory,
    stats,
    currentDelegate,
    
    // Computed
    canVote,
    canCreateProposal,
    hasVotedOnProposal,
    getProposal,
    
    // Actions
    vote,
    delegate,
    undelegate,
    createProposal,
    executeProposal,
    cancelProposal,
    refresh
  };
}

// ============================================================================
// Additional Hooks
// ============================================================================

/**
 * Hook for a single proposal
 */
export function useProposal(proposalId: number) {
  const { proposals, isLoading, vote, hasVotedOnProposal, canVote, isVoting } = useGovernance();
  
  const proposal = useMemo(() => {
    return proposals.find(p => p.id === proposalId);
  }, [proposals, proposalId]);
  
  const hasVoted = useMemo(() => {
    return hasVotedOnProposal(proposalId);
  }, [hasVotedOnProposal, proposalId]);
  
  const votePercentages = useMemo(() => {
    if (!proposal) return { for: 0, against: 0, abstain: 0 };
    return calculateVotePercentages(proposal);
  }, [proposal]);
  
  const castVote = useCallback(async (voteChoice: 'for' | 'against' | 'abstain') => {
    return vote(proposalId, voteChoice);
  }, [vote, proposalId]);
  
  return {
    proposal,
    isLoading,
    hasVoted,
    canVote: canVote && !hasVoted,
    isVoting,
    votePercentages,
    vote: castVote
  };
}

/**
 * Hook for delegation info
 */
export function useDelegation() {
  const { 
    votingPower, 
    delegates, 
    currentDelegate, 
    delegate, 
    undelegate, 
    isDelegating,
    isLoading 
  } = useGovernance();
  
  return {
    votingPower,
    delegates,
    currentDelegate,
    delegate,
    undelegate,
    isDelegating,
    isLoading
  };
}

/**
 * Hook for governance stats only
 */
export function useGovernanceStats() {
  const [stats, setStats] = useState<GovernanceStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const fetchStats = async () => {
      try {
        // TODO: Fetch from contract
        setStats({
          totalProposals: 24,
          activeProposals: 3,
          totalVoters: 847,
          quorumPercentage: 4,
          proposalThreshold: BigInt(10000) * BigInt(1e6),
          votingPeriod: 4320,
          timelockDelay: 144
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchStats();
  }, []);
  
  return { stats, isLoading };
}

export default useGovernance;
