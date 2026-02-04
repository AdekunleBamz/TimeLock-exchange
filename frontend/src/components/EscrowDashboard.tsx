'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useEscrow } from '@/hooks/useEscrow';
import { useWallet } from '@/lib/wallet-context';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Progress } from '@/components/ui/Progress';
import { Tabs } from '@/components/ui/Tabs';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatSTX, truncateAddress, formatDate } from '@/lib/utils';

// Types
interface Milestone {
  id: number;
  description: string;
  amount: number;
  released: boolean;
  dueDate?: number;
}

interface Escrow {
  id: number;
  seller: string;
  buyer: string;
  amount: number;
  funded: boolean;
  released: boolean;
  disputed: boolean;
  refunded: boolean;
  description: string;
  milestones: Milestone[];
  createdAt: number;
  expiresAt?: number;
}

interface EscrowStats {
  totalEscrows: number;
  activeEscrows: number;
  completedEscrows: number;
  disputedEscrows: number;
  totalVolume: number;
}

// Status helpers
const getEscrowStatus = (escrow: Escrow): string => {
  if (escrow.refunded) return 'refunded';
  if (escrow.released) return 'completed';
  if (escrow.disputed) return 'disputed';
  if (escrow.funded) return 'funded';
  return 'pending';
};

const getStatusColor = (status: string): 'default' | 'success' | 'warning' | 'error' | 'info' => {
  switch (status) {
    case 'completed': return 'success';
    case 'funded': return 'info';
    case 'disputed': return 'error';
    case 'refunded': return 'warning';
    default: return 'default';
  }
};

// Stats Card Component
const StatsCard: React.FC<{
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
}> = ({ title, value, subtitle, icon }) => (
  <Card className="p-4">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <p className="text-2xl font-bold">{value}</p>
        {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
      </div>
      <div className="text-3xl text-gray-300">{icon}</div>
    </div>
  </Card>
);

// Escrow Card Component
const EscrowCard: React.FC<{
  escrow: Escrow;
  userAddress: string;
  onFund: () => void;
  onRelease: () => void;
  onRefund: () => void;
  onDispute: () => void;
  onViewDetails: () => void;
}> = ({ escrow, userAddress, onFund, onRelease, onRefund, onDispute, onViewDetails }) => {
  const status = getEscrowStatus(escrow);
  const isBuyer = escrow.buyer === userAddress;
  const isSeller = escrow.seller === userAddress;
  const milestonesReleased = escrow.milestones.filter(m => m.released).length;
  const totalMilestones = escrow.milestones.length;
  const progressPercent = totalMilestones > 0 ? (milestonesReleased / totalMilestones) * 100 : 0;

  return (
    <Card className="p-4 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-lg">Escrow #{escrow.id}</h3>
          <p className="text-sm text-gray-500">{escrow.description}</p>
        </div>
        <Badge variant={getStatusColor(status)}>{status.toUpperCase()}</Badge>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xs text-gray-500">Buyer</p>
          <p className="font-mono text-sm">
            {truncateAddress(escrow.buyer)}
            {isBuyer && <Badge variant="info" className="ml-2">You</Badge>}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Seller</p>
          <p className="font-mono text-sm">
            {truncateAddress(escrow.seller)}
            {isSeller && <Badge variant="info" className="ml-2">You</Badge>}
          </p>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span>Amount</span>
          <span className="font-semibold">{formatSTX(escrow.amount)}</span>
        </div>
        {totalMilestones > 0 && (
          <div className="mt-2">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Milestones Progress</span>
              <span>{milestonesReleased}/{totalMilestones}</span>
            </div>
            <Progress value={progressPercent} />
          </div>
        )}
      </div>

      <div className="flex justify-between text-xs text-gray-400 mb-4">
        <span>Created: {formatDate(escrow.createdAt)}</span>
        {escrow.expiresAt && <span>Expires: {formatDate(escrow.expiresAt)}</span>}
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button size="sm" variant="outline" onClick={onViewDetails}>
          View Details
        </Button>
        
        {isBuyer && !escrow.funded && status === 'pending' && (
          <Button size="sm" variant="primary" onClick={onFund}>
            Fund Escrow
          </Button>
        )}
        
        {isBuyer && escrow.funded && !escrow.released && !escrow.disputed && (
          <Button size="sm" variant="success" onClick={onRelease}>
            Release Funds
          </Button>
        )}
        
        {isSeller && escrow.funded && !escrow.released && escrow.disputed && (
          <Button size="sm" variant="warning" onClick={onRefund}>
            Accept Refund
          </Button>
        )}
        
        {(isBuyer || isSeller) && escrow.funded && !escrow.released && !escrow.disputed && (
          <Button size="sm" variant="error" onClick={onDispute}>
            Dispute
          </Button>
        )}
      </div>
    </Card>
  );
};

// Milestone Item Component
const MilestoneItem: React.FC<{
  milestone: Milestone;
  canRelease: boolean;
  onRelease: () => void;
}> = ({ milestone, canRelease, onRelease }) => (
  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
    <div className="flex items-center gap-3">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
        milestone.released ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-500'
      }`}>
        {milestone.released ? '✓' : milestone.id}
      </div>
      <div>
        <p className="font-medium">{milestone.description}</p>
        <p className="text-sm text-gray-500">{formatSTX(milestone.amount)}</p>
      </div>
    </div>
    <div className="flex items-center gap-2">
      {milestone.dueDate && (
        <span className="text-xs text-gray-400">Due: {formatDate(milestone.dueDate)}</span>
      )}
      {milestone.released ? (
        <Badge variant="success">Released</Badge>
      ) : canRelease ? (
        <Button size="sm" onClick={onRelease}>Release</Button>
      ) : (
        <Badge variant="default">Pending</Badge>
      )}
    </div>
  </div>
);

// Create Escrow Modal
const CreateEscrowModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    seller: string;
    amount: number;
    description: string;
    milestones: { description: string; amount: number }[];
  }) => void;
}> = ({ isOpen, onClose, onSubmit }) => {
  const [seller, setSeller] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [milestones, setMilestones] = useState<{ description: string; amount: string }[]>([]);
  const [useMilestones, setUseMilestones] = useState(false);

  const addMilestone = () => {
    setMilestones([...milestones, { description: '', amount: '' }]);
  };

  const removeMilestone = (index: number) => {
    setMilestones(milestones.filter((_, i) => i !== index));
  };

  const updateMilestone = (index: number, field: 'description' | 'amount', value: string) => {
    const updated = [...milestones];
    updated[index][field] = value;
    setMilestones(updated);
  };

  const totalMilestoneAmount = milestones.reduce((sum, m) => sum + (parseFloat(m.amount) || 0), 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      seller,
      amount: parseFloat(amount) * 1_000_000,
      description,
      milestones: useMilestones ? milestones.map(m => ({
        description: m.description,
        amount: parseFloat(m.amount) * 1_000_000
      })) : []
    });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Escrow">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Seller Address"
          placeholder="SP..."
          value={seller}
          onChange={(e) => setSeller(e.target.value)}
          required
        />
        
        <Input
          label="Total Amount (STX)"
          type="number"
          min="0.000001"
          step="0.000001"
          placeholder="100"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
        
        <Input
          label="Description"
          placeholder="What is this escrow for?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="useMilestones"
            checked={useMilestones}
            onChange={(e) => setUseMilestones(e.target.checked)}
            className="rounded"
          />
          <label htmlFor="useMilestones" className="text-sm">
            Use milestone-based payments
          </label>
        </div>

        {useMilestones && (
          <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Milestones</span>
              <Button type="button" size="sm" variant="outline" onClick={addMilestone}>
                + Add Milestone
              </Button>
            </div>
            
            {milestones.map((milestone, index) => (
              <div key={index} className="flex gap-2 items-end">
                <Input
                  label={`Milestone ${index + 1}`}
                  placeholder="Description"
                  value={milestone.description}
                  onChange={(e) => updateMilestone(index, 'description', e.target.value)}
                  className="flex-1"
                />
                <Input
                  label="Amount"
                  type="number"
                  placeholder="STX"
                  value={milestone.amount}
                  onChange={(e) => updateMilestone(index, 'amount', e.target.value)}
                  className="w-24"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="error"
                  onClick={() => removeMilestone(index)}
                >
                  ×
                </Button>
              </div>
            ))}

            {milestones.length > 0 && (
              <div className="text-sm text-right">
                Total: {totalMilestoneAmount.toFixed(6)} STX
                {totalMilestoneAmount !== parseFloat(amount) && (
                  <span className="text-red-500 ml-2">
                    (Should equal {amount} STX)
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            Create Escrow
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// Escrow Details Modal
const EscrowDetailsModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  escrow: Escrow | null;
  userAddress: string;
  onReleaseMilestone: (milestoneId: number) => void;
}> = ({ isOpen, onClose, escrow, userAddress, onReleaseMilestone }) => {
  if (!escrow) return null;

  const status = getEscrowStatus(escrow);
  const isBuyer = escrow.buyer === userAddress;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Escrow #${escrow.id} Details`}>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-gray-500">Status</span>
          <Badge variant={getStatusColor(status)}>{status.toUpperCase()}</Badge>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500">Buyer</p>
            <p className="font-mono text-sm break-all">{escrow.buyer}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Seller</p>
            <p className="font-mono text-sm break-all">{escrow.seller}</p>
          </div>
        </div>

        <div>
          <p className="text-xs text-gray-500">Description</p>
          <p className="text-sm">{escrow.description}</p>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-500">Total Amount</span>
          <span className="font-bold">{formatSTX(escrow.amount)}</span>
        </div>

        {escrow.milestones.length > 0 && (
          <div>
            <p className="font-medium mb-2">Milestones</p>
            <div className="space-y-2">
              {escrow.milestones.map((milestone) => (
                <MilestoneItem
                  key={milestone.id}
                  milestone={milestone}
                  canRelease={isBuyer && escrow.funded && !milestone.released}
                  onRelease={() => onReleaseMilestone(milestone.id)}
                />
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-between text-sm text-gray-400">
          <span>Created: {formatDate(escrow.createdAt)}</span>
          {escrow.expiresAt && <span>Expires: {formatDate(escrow.expiresAt)}</span>}
        </div>

        <div className="pt-4 border-t">
          <Button variant="outline" onClick={onClose} className="w-full">
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// Main Dashboard Component
export const EscrowDashboard: React.FC = () => {
  const { address, isConnected } = useWallet();
  const {
    escrows,
    loading,
    error,
    createEscrow,
    fundEscrow,
    releaseFunds,
    refundBuyer,
    releaseMilestone,
    initiateDispute,
    refreshEscrows
  } = useEscrow();

  const [activeTab, setActiveTab] = useState('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedEscrow, setSelectedEscrow] = useState<Escrow | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Calculate stats
  const stats: EscrowStats = useMemo(() => {
    const userEscrows = escrows.filter(
      e => e.buyer === address || e.seller === address
    );
    return {
      totalEscrows: userEscrows.length,
      activeEscrows: userEscrows.filter(e => e.funded && !e.released && !e.refunded).length,
      completedEscrows: userEscrows.filter(e => e.released).length,
      disputedEscrows: userEscrows.filter(e => e.disputed).length,
      totalVolume: userEscrows.reduce((sum, e) => sum + e.amount, 0)
    };
  }, [escrows, address]);

  // Filter escrows
  const filteredEscrows = useMemo(() => {
    let filtered = escrows.filter(e => e.buyer === address || e.seller === address);

    switch (activeTab) {
      case 'buying':
        filtered = filtered.filter(e => e.buyer === address);
        break;
      case 'selling':
        filtered = filtered.filter(e => e.seller === address);
        break;
      case 'active':
        filtered = filtered.filter(e => e.funded && !e.released && !e.refunded);
        break;
      case 'completed':
        filtered = filtered.filter(e => e.released);
        break;
      case 'disputed':
        filtered = filtered.filter(e => e.disputed);
        break;
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(e =>
        e.description.toLowerCase().includes(query) ||
        e.buyer.toLowerCase().includes(query) ||
        e.seller.toLowerCase().includes(query) ||
        e.id.toString().includes(query)
      );
    }

    return filtered.sort((a, b) => b.createdAt - a.createdAt);
  }, [escrows, address, activeTab, searchQuery]);

  // Handlers
  const handleCreateEscrow = async (data: {
    seller: string;
    amount: number;
    description: string;
    milestones: { description: string; amount: number }[];
  }) => {
    await createEscrow(data.seller, data.amount, data.description);
    refreshEscrows();
  };

  const handleFund = async (escrowId: number, amount: number) => {
    await fundEscrow(escrowId, amount);
    refreshEscrows();
  };

  const handleRelease = async (escrowId: number) => {
    await releaseFunds(escrowId);
    refreshEscrows();
  };

  const handleRefund = async (escrowId: number) => {
    await refundBuyer(escrowId);
    refreshEscrows();
  };

  const handleDispute = async (escrowId: number) => {
    await initiateDispute(escrowId);
    refreshEscrows();
  };

  const handleReleaseMilestone = async (escrowId: number, milestoneId: number) => {
    await releaseMilestone(escrowId, milestoneId);
    refreshEscrows();
  };

  if (!isConnected) {
    return (
      <Card className="p-8 text-center">
        <EmptyState
          icon="🔐"
          title="Connect Your Wallet"
          description="Connect your wallet to view and manage escrows"
        />
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-8 text-center">
        <EmptyState
          icon="⚠️"
          title="Error Loading Escrows"
          description={error}
          action={
            <Button onClick={refreshEscrows}>Try Again</Button>
          }
        />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Escrow Dashboard</h1>
          <p className="text-gray-500">Manage your secure P2P transactions</p>
        </div>
        <Button variant="primary" onClick={() => setIsCreateModalOpen(true)}>
          + New Escrow
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatsCard
          title="Total Escrows"
          value={stats.totalEscrows}
          icon="📋"
        />
        <StatsCard
          title="Active"
          value={stats.activeEscrows}
          icon="⏳"
        />
        <StatsCard
          title="Completed"
          value={stats.completedEscrows}
          icon="✅"
        />
        <StatsCard
          title="Disputed"
          value={stats.disputedEscrows}
          icon="⚠️"
        />
        <StatsCard
          title="Total Volume"
          value={formatSTX(stats.totalVolume)}
          icon="💰"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <Tabs
          tabs={[
            { id: 'all', label: 'All' },
            { id: 'buying', label: 'Buying' },
            { id: 'selling', label: 'Selling' },
            { id: 'active', label: 'Active' },
            { id: 'completed', label: 'Completed' },
            { id: 'disputed', label: 'Disputed' }
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
        />
        <Input
          placeholder="Search escrows..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full md:w-64"
        />
      </div>

      {/* Escrow Grid */}
      {filteredEscrows.length === 0 ? (
        <Card className="p-8">
          <EmptyState
            icon="📭"
            title="No Escrows Found"
            description={
              activeTab === 'all'
                ? "You haven't created or received any escrows yet"
                : `No ${activeTab} escrows found`
            }
            action={
              <Button variant="primary" onClick={() => setIsCreateModalOpen(true)}>
                Create Your First Escrow
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEscrows.map((escrow) => (
            <EscrowCard
              key={escrow.id}
              escrow={escrow}
              userAddress={address || ''}
              onFund={() => handleFund(escrow.id, escrow.amount)}
              onRelease={() => handleRelease(escrow.id)}
              onRefund={() => handleRefund(escrow.id)}
              onDispute={() => handleDispute(escrow.id)}
              onViewDetails={() => setSelectedEscrow(escrow)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <CreateEscrowModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateEscrow}
      />

      <EscrowDetailsModal
        isOpen={!!selectedEscrow}
        onClose={() => setSelectedEscrow(null)}
        escrow={selectedEscrow}
        userAddress={address || ''}
        onReleaseMilestone={(milestoneId) => {
          if (selectedEscrow) {
            handleReleaseMilestone(selectedEscrow.id, milestoneId);
          }
        }}
      />
    </div>
  );
};

export default EscrowDashboard;
