'use client';

import { useState, useCallback } from 'react';
import { useVault, Vault, PendingWithdrawal } from '@/hooks/useVault';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';
import { Modal } from '@/components/ui/Modal';
import { CONTRACTS, DEPLOYER_ADDRESS } from '@/lib/constants';

// Mainnet vault contract
const VAULT_CONTRACT = CONTRACTS.vault; // SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT.vault-v1

// ============================================================================
// Sub-Components
// ============================================================================

function VaultCard({ 
  vault, 
  onSelect,
  isSelected 
}: { 
  vault: Vault; 
  onSelect: () => void;
  isSelected: boolean;
}) {
  const utilizationPercent = vault.totalDeposited > 0 
    ? ((vault.totalDeposited - vault.stxBalance) / vault.totalDeposited) * 100 
    : 0;

  return (
    <Card 
      className={`cursor-pointer transition-all hover:shadow-lg ${
        isSelected ? 'ring-2 ring-primary' : ''
      }`}
      onClick={onSelect}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Vault #{vault.id}</CardTitle>
          <div className="flex gap-2">
            {vault.isLocked && (
              <Badge variant="destructive">
                <LockIcon className="w-3 h-3 mr-1" />
                Locked
              </Badge>
            )}
            <Badge variant="outline">
              {vault.dailyLimitBps / 100}% daily limit
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Balance</span>
            <span className="text-2xl font-bold">{vault.stxBalance.toFixed(2)} STX</span>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Withdrawal Activity</span>
              <span>{utilizationPercent.toFixed(1)}%</span>
            </div>
            <Progress value={utilizationPercent} className="h-2" />
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2 border-t text-sm">
            <div>
              <span className="text-muted-foreground block">Total Deposited</span>
              <span className="font-medium">{vault.totalDeposited.toFixed(2)} STX</span>
            </div>
            <div>
              <span className="text-muted-foreground block">Total Withdrawn</span>
              <span className="font-medium">{vault.totalWithdrawn.toFixed(2)} STX</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PendingWithdrawalRow({ 
  withdrawal, 
  onExecute, 
  onCancel,
  isExecuting 
}: { 
  withdrawal: PendingWithdrawal;
  onExecute: () => void;
  onCancel: () => void;
  isExecuting: boolean;
}) {
  const hoursRemaining = Math.ceil(withdrawal.timeRemaining / 60);
  
  return (
    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
      <div className="space-y-1">
        <div className="font-medium">{withdrawal.amount.toFixed(4)} STX</div>
        <div className="text-sm text-muted-foreground">
          Request #{withdrawal.requestId}
        </div>
      </div>
      
      <div className="text-center">
        {withdrawal.canExecute ? (
          <Badge variant="success">Ready to execute</Badge>
        ) : (
          <div className="text-sm text-muted-foreground">
            <ClockIcon className="w-4 h-4 inline mr-1" />
            {hoursRemaining}h remaining
          </div>
        )}
      </div>
      
      <div className="flex gap-2">
        {withdrawal.canExecute ? (
          <Button 
            size="sm" 
            onClick={onExecute}
            disabled={isExecuting}
          >
            {isExecuting ? 'Executing...' : 'Execute'}
          </Button>
        ) : (
          <Button 
            size="sm" 
            variant="outline"
            onClick={onCancel}
            disabled={isExecuting}
          >
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}

function CreateVaultModal({ 
  isOpen, 
  onClose, 
  onCreate 
}: { 
  isOpen: boolean; 
  onClose: () => void;
  onCreate: (dailyLimit: number, delay: number) => Promise<void>;
}) {
  const [dailyLimit, setDailyLimit] = useState('10');
  const [delay, setDelay] = useState('144');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      await onCreate(parseInt(dailyLimit) * 100, parseInt(delay));
      onClose();
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Vault">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Daily Withdrawal Limit (%)
          </label>
          <Input
            type="number"
            value={dailyLimit}
            onChange={(e) => setDailyLimit(e.target.value)}
            min="1"
            max="100"
            placeholder="10"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Maximum percentage of vault balance withdrawable per day
          </p>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">
            Withdrawal Delay (blocks)
          </label>
          <Input
            type="number"
            value={delay}
            onChange={(e) => setDelay(e.target.value)}
            min="144"
            placeholder="144"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Minimum 144 blocks (~24 hours). 1 block ≈ 10 minutes.
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleCreate} disabled={isCreating}>
            {isCreating ? 'Creating...' : 'Create Vault'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function DepositModal({ 
  isOpen, 
  onClose, 
  vaultId,
  onDeposit 
}: { 
  isOpen: boolean; 
  onClose: () => void;
  vaultId: number;
  onDeposit: (amount: number) => Promise<void>;
}) {
  const [amount, setAmount] = useState('');
  const [isDepositing, setIsDepositing] = useState(false);

  const handleDeposit = async () => {
    if (!amount || parseFloat(amount) <= 0) return;
    setIsDepositing(true);
    try {
      await onDeposit(parseFloat(amount));
      setAmount('');
      onClose();
    } finally {
      setIsDepositing(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Deposit to Vault #${vaultId}`}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Amount (STX)</label>
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="0.000001"
            step="0.1"
            placeholder="0.00"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleDeposit} disabled={isDepositing || !amount}>
            {isDepositing ? 'Depositing...' : 'Deposit'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function WithdrawModal({ 
  isOpen, 
  onClose, 
  vault,
  dailyRemaining,
  onWithdraw 
}: { 
  isOpen: boolean; 
  onClose: () => void;
  vault: Vault;
  dailyRemaining: number;
  onWithdraw: (amount: number) => Promise<void>;
}) {
  const [amount, setAmount] = useState('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  const handleWithdraw = async () => {
    if (!amount || parseFloat(amount) <= 0) return;
    setIsWithdrawing(true);
    try {
      await onWithdraw(parseFloat(amount));
      setAmount('');
      onClose();
    } finally {
      setIsWithdrawing(false);
    }
  };

  const maxWithdraw = Math.min(vault.stxBalance, dailyRemaining);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Request Withdrawal from Vault #${vault.id}`}>
      <div className="space-y-4">
        <div className="p-3 bg-amber-50 dark:bg-amber-950 rounded-lg text-sm">
          <p className="font-medium text-amber-800 dark:text-amber-200">
            ⏱️ Withdrawal will be available after {Math.ceil(vault.withdrawalDelay / 6)} hours
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Amount (STX)</label>
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="0.000001"
            max={maxWithdraw}
            step="0.1"
            placeholder="0.00"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Available: {vault.stxBalance.toFixed(4)} STX | Daily remaining: {dailyRemaining.toFixed(4)} STX
          </p>
        </div>

        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setAmount(maxWithdraw.toString())}
        >
          Max ({maxWithdraw.toFixed(4)} STX)
        </Button>

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            onClick={handleWithdraw} 
            disabled={isWithdrawing || !amount || parseFloat(amount) > maxWithdraw}
          >
            {isWithdrawing ? 'Requesting...' : 'Request Withdrawal'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ============================================================================
// Icons
// ============================================================================

function LockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

function VaultIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
    </svg>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function VaultDashboard() {
  const {
    vaults,
    selectedVault,
    pendingWithdrawals,
    vaultStats,
    isLoading,
    error,
    createVault,
    deposit,
    requestWithdrawal,
    executeWithdrawal,
    cancelWithdrawal,
    lockVault,
    unlockVault,
    selectVault,
    refreshVaults,
  } = useVault();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [executingId, setExecutingId] = useState<number | null>(null);

  const handleCreateVault = useCallback(async (dailyLimit: number, delay: number) => {
    await createVault(dailyLimit, delay);
  }, [createVault]);

  const handleDeposit = useCallback(async (amount: number) => {
    if (!selectedVault) return;
    await deposit(selectedVault.id, amount);
  }, [selectedVault, deposit]);

  const handleRequestWithdrawal = useCallback(async (amount: number) => {
    if (!selectedVault) return;
    await requestWithdrawal(selectedVault.id, amount);
  }, [selectedVault, requestWithdrawal]);

  const handleExecuteWithdrawal = useCallback(async (requestId: number) => {
    if (!selectedVault) return;
    setExecutingId(requestId);
    try {
      await executeWithdrawal(selectedVault.id, requestId);
    } finally {
      setExecutingId(null);
    }
  }, [selectedVault, executeWithdrawal]);

  const handleCancelWithdrawal = useCallback(async (requestId: number) => {
    if (!selectedVault) return;
    setExecutingId(requestId);
    try {
      await cancelWithdrawal(selectedVault.id, requestId);
    } finally {
      setExecutingId(null);
    }
  }, [selectedVault, cancelWithdrawal]);

  const handleToggleLock = useCallback(async () => {
    if (!selectedVault) return;
    if (selectedVault.isLocked) {
      await unlockVault(selectedVault.id);
    } else {
      await lockVault(selectedVault.id, 4320); // ~30 days
    }
  }, [selectedVault, lockVault, unlockVault]);

  if (isLoading && vaults.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <VaultIcon className="w-7 h-7" />
            Secure Vaults
          </h2>
          <p className="text-muted-foreground">
            Manage your time-locked vaults with withdrawal delays
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <PlusIcon className="w-4 h-4 mr-2" />
          Create Vault
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-lg">
          {error}
        </div>
      )}

      {/* Vault Grid */}
      {vaults.length === 0 ? (
        <Card className="p-12 text-center">
          <VaultIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Vaults Yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first secure vault to start protecting your assets
          </p>
          <Button onClick={() => setShowCreateModal(true)}>
            Create Your First Vault
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vaults.map((vault) => (
            <VaultCard
              key={vault.id}
              vault={vault}
              onSelect={() => selectVault(vault.id)}
              isSelected={selectedVault?.id === vault.id}
            />
          ))}
        </div>
      )}

      {/* Selected Vault Details */}
      {selectedVault && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Vault #{selectedVault.id} Details</CardTitle>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowDepositModal(true)}
                >
                  Deposit
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowWithdrawModal(true)}
                  disabled={selectedVault.isLocked || selectedVault.stxBalance === 0}
                >
                  Withdraw
                </Button>
                <Button
                  variant={selectedVault.isLocked ? "default" : "outline"}
                  size="sm"
                  onClick={handleToggleLock}
                >
                  {selectedVault.isLocked ? 'Unlock' : 'Lock'}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="text-sm text-muted-foreground">Balance</div>
                <div className="text-xl font-bold">{selectedVault.stxBalance.toFixed(4)} STX</div>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="text-sm text-muted-foreground">Daily Remaining</div>
                <div className="text-xl font-bold">{vaultStats?.dailyRemaining.toFixed(4) || '0'} STX</div>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="text-sm text-muted-foreground">Withdrawal Delay</div>
                <div className="text-xl font-bold">{Math.ceil(selectedVault.withdrawalDelay / 6)}h</div>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="text-sm text-muted-foreground">Pending Requests</div>
                <div className="text-xl font-bold">{pendingWithdrawals.length}</div>
              </div>
            </div>

            {/* Pending Withdrawals */}
            {pendingWithdrawals.length > 0 && (
              <div>
                <h4 className="font-medium mb-3">Pending Withdrawals</h4>
                <div className="space-y-2">
                  {pendingWithdrawals.map((withdrawal) => (
                    <PendingWithdrawalRow
                      key={withdrawal.requestId}
                      withdrawal={withdrawal}
                      onExecute={() => handleExecuteWithdrawal(withdrawal.requestId)}
                      onCancel={() => handleCancelWithdrawal(withdrawal.requestId)}
                      isExecuting={executingId === withdrawal.requestId}
                    />
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Modals */}
      <CreateVaultModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateVault}
      />
      
      {selectedVault && (
        <>
          <DepositModal
            isOpen={showDepositModal}
            onClose={() => setShowDepositModal(false)}
            vaultId={selectedVault.id}
            onDeposit={handleDeposit}
          />
          <WithdrawModal
            isOpen={showWithdrawModal}
            onClose={() => setShowWithdrawModal(false)}
            vault={selectedVault}
            dailyRemaining={vaultStats?.dailyRemaining || 0}
            onWithdraw={handleRequestWithdrawal}
          />
        </>
      )}
    </div>
  );
}

export default VaultDashboard;
