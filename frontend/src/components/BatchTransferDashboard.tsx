'use client';

import React, { useState, useRef, useMemo, useCallback } from 'react';
import { useBatchTransfer, Recipient } from '@/hooks/useBatchTransfer';
import { useWallet } from '@/lib/wallet-context';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Tabs } from '@/components/ui/Tabs';
import { Table } from '@/components/ui/Table';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Toast } from '@/components/ui/Toast';
import { formatSTX, truncateAddress } from '@/lib/utils';

// Types
type TransferMode = 'manual' | 'csv' | 'equal' | 'percentage';

interface PercentageRecipient {
  address: string;
  percentage: number;
}

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

// Recipient Row Component
const RecipientRow: React.FC<{
  recipient: Recipient;
  index: number;
  onUpdate: (index: number, updates: Partial<Recipient>) => void;
  onRemove: (index: number) => void;
}> = ({ recipient, index, onUpdate, onRemove }) => (
  <tr className="border-b hover:bg-gray-50">
    <td className="py-2 px-3">
      <Input
        value={recipient.address}
        onChange={(e) => onUpdate(index, { address: e.target.value })}
        placeholder="SP..."
        className="w-full font-mono text-sm"
      />
    </td>
    <td className="py-2 px-3">
      <Input
        type="number"
        value={recipient.amount / 1_000_000}
        onChange={(e) => onUpdate(index, { amount: parseFloat(e.target.value) * 1_000_000 })}
        min="0.000001"
        step="0.000001"
        className="w-24"
      />
    </td>
    <td className="py-2 px-3">
      <Input
        value={recipient.memo || ''}
        onChange={(e) => onUpdate(index, { memo: e.target.value })}
        placeholder="Optional"
        maxLength={34}
        className="w-32"
      />
    </td>
    <td className="py-2 px-3">
      <Button size="sm" variant="error" onClick={() => onRemove(index)}>
        ×
      </Button>
    </td>
  </tr>
);

// CSV Import Modal
const CSVImportModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onImport: (csv: string) => void;
}> = ({ isOpen, onClose, onImport }) => {
  const [csvContent, setCsvContent] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCsvContent(event.target?.result as string);
      };
      reader.readAsText(file);
    }
  };

  const handleImport = () => {
    onImport(csvContent);
    setCsvContent('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Import from CSV">
      <div className="space-y-4">
        <div className="p-3 bg-gray-50 rounded-lg text-sm">
          <p className="font-medium mb-2">CSV Format:</p>
          <code className="text-xs">address,amount,memo (optional)</code>
          <p className="text-gray-500 mt-2">
            Example:<br />
            SP1ABC...XYZ,10.5,Payment 1<br />
            SP2DEF...123,25.0,Payment 2
          </p>
        </div>

        <div>
          <input
            type="file"
            accept=".csv,.txt"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="w-full"
          >
            📁 Choose File
          </Button>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Or paste CSV content:</label>
          <textarea
            value={csvContent}
            onChange={(e) => setCsvContent(e.target.value)}
            placeholder="address,amount,memo"
            rows={8}
            className="w-full p-2 border rounded-lg font-mono text-sm"
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleImport} disabled={!csvContent.trim()}>
            Import
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// Equal Distribution Modal
const EqualDistributionModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onDistribute: (addresses: string[], totalAmount: number) => void;
}> = ({ isOpen, onClose, onDistribute }) => {
  const [addresses, setAddresses] = useState('');
  const [totalAmount, setTotalAmount] = useState('');

  const addressList = useMemo(() => 
    addresses.split('\n').map(a => a.trim()).filter(a => a),
    [addresses]
  );

  const amountPerRecipient = useMemo(() => {
    if (addressList.length === 0 || !totalAmount) return 0;
    return parseFloat(totalAmount) / addressList.length;
  }, [addressList.length, totalAmount]);

  const handleSubmit = () => {
    onDistribute(addressList, parseFloat(totalAmount) * 1_000_000);
    setAddresses('');
    setTotalAmount('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Equal Distribution">
      <div className="space-y-4">
        <Input
          label="Total Amount (STX)"
          type="number"
          value={totalAmount}
          onChange={(e) => setTotalAmount(e.target.value)}
          placeholder="1000"
          min="0.000001"
          step="0.000001"
        />

        <div>
          <label className="block text-sm font-medium mb-1">
            Recipient Addresses (one per line)
          </label>
          <textarea
            value={addresses}
            onChange={(e) => setAddresses(e.target.value)}
            placeholder="SP1ABC...&#10;SP2DEF...&#10;SP3GHI..."
            rows={8}
            className="w-full p-2 border rounded-lg font-mono text-sm"
          />
        </div>

        {addressList.length > 0 && totalAmount && (
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              <strong>{addressList.length}</strong> recipients will each receive{' '}
              <strong>{amountPerRecipient.toFixed(6)} STX</strong>
            </p>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            variant="primary" 
            onClick={handleSubmit}
            disabled={addressList.length === 0 || !totalAmount}
          >
            Distribute
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// Percentage Distribution Modal
const PercentageDistributionModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onDistribute: (recipients: PercentageRecipient[], totalAmount: number) => void;
}> = ({ isOpen, onClose, onDistribute }) => {
  const [totalAmount, setTotalAmount] = useState('');
  const [recipients, setRecipients] = useState<PercentageRecipient[]>([
    { address: '', percentage: 50 },
    { address: '', percentage: 50 },
  ]);

  const totalPercentage = recipients.reduce((sum, r) => sum + r.percentage, 0);

  const addRecipient = () => {
    setRecipients([...recipients, { address: '', percentage: 0 }]);
  };

  const removeRecipient = (index: number) => {
    if (recipients.length > 2) {
      setRecipients(recipients.filter((_, i) => i !== index));
    }
  };

  const updateRecipient = (index: number, field: keyof PercentageRecipient, value: string | number) => {
    const updated = [...recipients];
    if (field === 'percentage') {
      updated[index][field] = Math.min(100, Math.max(0, Number(value)));
    } else {
      updated[index][field] = value as string;
    }
    setRecipients(updated);
  };

  const handleSubmit = () => {
    const validRecipients = recipients.filter(r => r.address && r.percentage > 0);
    onDistribute(validRecipients, parseFloat(totalAmount) * 1_000_000);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Percentage Distribution">
      <div className="space-y-4">
        <Input
          label="Total Amount (STX)"
          type="number"
          value={totalAmount}
          onChange={(e) => setTotalAmount(e.target.value)}
          placeholder="1000"
          min="0.000001"
          step="0.000001"
        />

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium">Recipients</label>
            <Button size="sm" variant="outline" onClick={addRecipient}>
              + Add
            </Button>
          </div>

          {recipients.map((recipient, index) => (
            <div key={index} className="flex gap-2 items-center">
              <Input
                placeholder="SP..."
                value={recipient.address}
                onChange={(e) => updateRecipient(index, 'address', e.target.value)}
                className="flex-1 font-mono text-sm"
              />
              <Input
                type="number"
                value={recipient.percentage}
                onChange={(e) => updateRecipient(index, 'percentage', e.target.value)}
                min="0"
                max="100"
                className="w-20"
              />
              <span className="text-sm text-gray-500">%</span>
              {recipients.length > 2 && (
                <Button size="sm" variant="error" onClick={() => removeRecipient(index)}>
                  ×
                </Button>
              )}
            </div>
          ))}

          <div className={`text-sm text-right ${totalPercentage === 100 ? 'text-green-600' : 'text-red-500'}`}>
            Total: {totalPercentage}% {totalPercentage !== 100 && '(must equal 100%)'}
          </div>
        </div>

        {totalAmount && totalPercentage === 100 && (
          <div className="p-3 bg-blue-50 rounded-lg text-sm">
            <p className="font-medium mb-1">Preview:</p>
            {recipients.filter(r => r.address).map((r, i) => (
              <p key={i} className="text-blue-700">
                {truncateAddress(r.address)}: {((parseFloat(totalAmount) * r.percentage) / 100).toFixed(6)} STX
              </p>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            variant="primary" 
            onClick={handleSubmit}
            disabled={totalPercentage !== 100 || !totalAmount}
          >
            Distribute
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// Confirmation Modal
const ConfirmationModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  recipients: Recipient[];
  totalAmount: number;
  estimatedFee: number;
}> = ({ isOpen, onClose, onConfirm, recipients, totalAmount, estimatedFee }) => (
  <Modal isOpen={isOpen} onClose={onClose} title="Confirm Batch Transfer">
    <div className="space-y-4">
      <div className="max-h-48 overflow-y-auto border rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="py-2 px-3 text-left">Recipient</th>
              <th className="py-2 px-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {recipients.slice(0, 10).map((r, i) => (
              <tr key={i} className="border-t">
                <td className="py-2 px-3 font-mono">{truncateAddress(r.address)}</td>
                <td className="py-2 px-3 text-right">{formatSTX(r.amount)}</td>
              </tr>
            ))}
            {recipients.length > 10 && (
              <tr className="border-t bg-gray-50">
                <td colSpan={2} className="py-2 px-3 text-center text-gray-500">
                  ... and {recipients.length - 10} more recipients
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="space-y-2 p-3 bg-gray-50 rounded-lg">
        <div className="flex justify-between">
          <span>Total Recipients:</span>
          <span className="font-semibold">{recipients.length}</span>
        </div>
        <div className="flex justify-between">
          <span>Total Amount:</span>
          <span className="font-semibold">{formatSTX(totalAmount)}</span>
        </div>
        <div className="flex justify-between text-gray-500">
          <span>Est. Network Fee:</span>
          <span>{formatSTX(estimatedFee)}</span>
        </div>
        <div className="flex justify-between text-lg font-bold border-t pt-2">
          <span>Grand Total:</span>
          <span>{formatSTX(totalAmount + estimatedFee)}</span>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={onConfirm}>
          Confirm & Send
        </Button>
      </div>
    </div>
  </Modal>
);

// Main Dashboard Component
export const BatchTransferDashboard: React.FC = () => {
  const { address, isConnected } = useWallet();
  const {
    recipients,
    loading,
    error,
    pendingTx,
    totalAmount,
    estimatedFee,
    addRecipient,
    removeRecipient,
    updateRecipient,
    clearRecipients,
    importFromCSV,
    exportToCSV,
    executeBatchTransfer,
    distributeEqual,
    distributeByPercentage,
    validateRecipients,
    getUserStats,
    clearError,
    MAX_RECIPIENTS,
  } = useBatchTransfer();

  const [activeTab, setActiveTab] = useState<TransferMode>('manual');
  const [isCSVModalOpen, setIsCSVModalOpen] = useState(false);
  const [isEqualModalOpen, setIsEqualModalOpen] = useState(false);
  const [isPercentageModalOpen, setIsPercentageModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [userStats, setUserStats] = useState<{
    totalSent: number;
    transferCount: number;
    recipientCount: number;
  } | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Load user stats
  React.useEffect(() => {
    if (isConnected) {
      getUserStats().then(setUserStats);
    }
  }, [isConnected, getUserStats]);

  // Add new empty recipient
  const handleAddRecipient = () => {
    addRecipient({ address: '', amount: 0 });
  };

  // Handle transfer execution
  const handleExecuteTransfer = async () => {
    const validation = validateRecipients();
    if (!validation.valid) {
      setToast({ message: validation.errors[0], type: 'error' });
      return;
    }
    setIsConfirmModalOpen(true);
  };

  const handleConfirmTransfer = async () => {
    setIsConfirmModalOpen(false);
    const result = await executeBatchTransfer();
    if (result.success) {
      setToast({ message: `Successfully sent to ${result.recipientCount} recipients`, type: 'success' });
      clearRecipients();
    } else {
      setToast({ message: result.error || 'Transfer failed', type: 'error' });
    }
  };

  // Handle equal distribution
  const handleEqualDistribute = async (addresses: string[], amount: number) => {
    const result = await distributeEqual(addresses, amount);
    if (result.success) {
      setToast({ message: `Distributed equally to ${result.recipientCount} recipients`, type: 'success' });
    } else {
      setToast({ message: result.error || 'Distribution failed', type: 'error' });
    }
  };

  // Handle percentage distribution
  const handlePercentageDistribute = async (percentageRecipients: PercentageRecipient[], amount: number) => {
    const result = await distributeByPercentage(percentageRecipients, amount);
    if (result.success) {
      setToast({ message: `Distributed by percentage to ${result.recipientCount} recipients`, type: 'success' });
    } else {
      setToast({ message: result.error || 'Distribution failed', type: 'error' });
    }
  };

  // Export CSV
  const handleExport = () => {
    const csv = exportToCSV();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'batch-transfer-recipients.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isConnected) {
    return (
      <Card className="p-8 text-center">
        <EmptyState
          icon="🔐"
          title="Connect Your Wallet"
          description="Connect your wallet to send batch transfers"
        />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Batch Transfer</h1>
          <p className="text-gray-500">Send STX to multiple recipients in one transaction</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard
          title="Total Sent"
          value={userStats ? formatSTX(userStats.totalSent) : '-'}
          icon="💸"
        />
        <StatsCard
          title="Transfers Made"
          value={userStats?.transferCount ?? '-'}
          icon="📤"
        />
        <StatsCard
          title="Recipients Reached"
          value={userStats?.recipientCount ?? '-'}
          icon="👥"
        />
        <StatsCard
          title="Max Recipients"
          value={MAX_RECIPIENTS}
          subtitle="per transaction"
          icon="📊"
        />
      </div>

      {/* Mode Selection */}
      <Tabs
        tabs={[
          { id: 'manual', label: '✏️ Manual Entry' },
          { id: 'csv', label: '📁 CSV Import' },
          { id: 'equal', label: '⚖️ Equal Split' },
          { id: 'percentage', label: '📊 By Percentage' },
        ]}
        activeTab={activeTab}
        onChange={(tab) => setActiveTab(tab as TransferMode)}
      />

      {/* Manual Entry Mode */}
      {activeTab === 'manual' && (
        <Card className="p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold">
              Recipients ({recipients.length}/{MAX_RECIPIENTS})
            </h2>
            <div className="flex gap-2">
              {recipients.length > 0 && (
                <>
                  <Button size="sm" variant="outline" onClick={handleExport}>
                    Export CSV
                  </Button>
                  <Button size="sm" variant="error" onClick={clearRecipients}>
                    Clear All
                  </Button>
                </>
              )}
              <Button size="sm" variant="primary" onClick={handleAddRecipient}>
                + Add Recipient
              </Button>
            </div>
          </div>

          {recipients.length === 0 ? (
            <EmptyState
              icon="📋"
              title="No Recipients"
              description="Add recipients manually or import from CSV"
              action={
                <div className="flex gap-2">
                  <Button variant="primary" onClick={handleAddRecipient}>
                    Add Recipient
                  </Button>
                  <Button variant="outline" onClick={() => setIsCSVModalOpen(true)}>
                    Import CSV
                  </Button>
                </div>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-2 px-3 text-left text-sm">Address</th>
                    <th className="py-2 px-3 text-left text-sm">Amount (STX)</th>
                    <th className="py-2 px-3 text-left text-sm">Memo</th>
                    <th className="py-2 px-3 w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {recipients.map((recipient, index) => (
                    <RecipientRow
                      key={index}
                      recipient={recipient}
                      index={index}
                      onUpdate={updateRecipient}
                      onRemove={removeRecipient}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {recipients.length > 0 && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-500">Total Amount</p>
                  <p className="text-2xl font-bold">{formatSTX(totalAmount)}</p>
                  <p className="text-xs text-gray-400">
                    + ~{formatSTX(estimatedFee)} estimated fee
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleExecuteTransfer}
                  disabled={loading || recipients.length === 0}
                >
                  {loading ? 'Processing...' : `Send to ${recipients.length} Recipients`}
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* CSV Import Mode */}
      {activeTab === 'csv' && (
        <Card className="p-8 text-center">
          <div className="max-w-md mx-auto">
            <div className="text-6xl mb-4">📁</div>
            <h2 className="text-xl font-semibold mb-2">Import from CSV</h2>
            <p className="text-gray-500 mb-4">
              Upload a CSV file with addresses, amounts, and optional memos
            </p>
            <Button variant="primary" onClick={() => setIsCSVModalOpen(true)}>
              Import CSV File
            </Button>
          </div>
        </Card>
      )}

      {/* Equal Distribution Mode */}
      {activeTab === 'equal' && (
        <Card className="p-8 text-center">
          <div className="max-w-md mx-auto">
            <div className="text-6xl mb-4">⚖️</div>
            <h2 className="text-xl font-semibold mb-2">Equal Distribution</h2>
            <p className="text-gray-500 mb-4">
              Split a total amount equally among multiple recipients
            </p>
            <Button variant="primary" onClick={() => setIsEqualModalOpen(true)}>
              Set Up Equal Distribution
            </Button>
          </div>
        </Card>
      )}

      {/* Percentage Distribution Mode */}
      {activeTab === 'percentage' && (
        <Card className="p-8 text-center">
          <div className="max-w-md mx-auto">
            <div className="text-6xl mb-4">📊</div>
            <h2 className="text-xl font-semibold mb-2">Percentage Distribution</h2>
            <p className="text-gray-500 mb-4">
              Distribute based on custom percentages (must total 100%)
            </p>
            <Button variant="primary" onClick={() => setIsPercentageModalOpen(true)}>
              Set Up Percentage Distribution
            </Button>
          </div>
        </Card>
      )}

      {/* Pending Transaction */}
      {pendingTx && (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-center gap-3">
            <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full" />
            <div>
              <p className="font-medium">Transaction Pending</p>
              <p className="text-sm text-blue-600 font-mono">{truncateAddress(pendingTx)}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Card className="p-4 bg-red-50 border-red-200">
          <div className="flex justify-between items-center">
            <p className="text-red-600">{error}</p>
            <Button size="sm" variant="outline" onClick={clearError}>
              Dismiss
            </Button>
          </div>
        </Card>
      )}

      {/* Modals */}
      <CSVImportModal
        isOpen={isCSVModalOpen}
        onClose={() => setIsCSVModalOpen(false)}
        onImport={importFromCSV}
      />

      <EqualDistributionModal
        isOpen={isEqualModalOpen}
        onClose={() => setIsEqualModalOpen(false)}
        onDistribute={handleEqualDistribute}
      />

      <PercentageDistributionModal
        isOpen={isPercentageModalOpen}
        onClose={() => setIsPercentageModalOpen(false)}
        onDistribute={handlePercentageDistribute}
      />

      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={handleConfirmTransfer}
        recipients={recipients}
        totalAmount={totalAmount}
        estimatedFee={estimatedFee}
      />

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default BatchTransferDashboard;
