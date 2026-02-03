'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal';
import type { PasskeyInfo } from '@/lib/types';

interface PasskeyManagerProps {
  passkeys: PasskeyInfo[];
  onRegister: (name: string) => Promise<void>;
  onRevoke: (keyIndex: number) => Promise<void>;
  onRevokeAll: () => Promise<void>;
  isLoading?: boolean;
  maxPasskeys?: number;
}

export function PasskeyManager({
  passkeys,
  onRegister,
  onRevoke,
  onRevokeAll,
  isLoading = false,
  maxPasskeys = 5,
}: PasskeyManagerProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRevokeAllModal, setShowRevokeAllModal] = useState(false);
  const [newPasskeyName, setNewPasskeyName] = useState('');

  const activePasskeys = passkeys.filter(p => p.isActive);
  const canAddMore = activePasskeys.length < maxPasskeys;

  const getDeviceIcon = (name: string): string => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('phone') || lowerName.includes('mobile')) return '📱';
    if (lowerName.includes('tablet') || lowerName.includes('ipad')) return '📲';
    if (lowerName.includes('laptop') || lowerName.includes('macbook')) return '💻';
    if (lowerName.includes('yubikey') || lowerName.includes('security')) return '🔑';
    return '🔐';
  };

  const handleRegister = async () => {
    if (!newPasskeyName.trim()) return;
    await onRegister(newPasskeyName.trim());
    setNewPasskeyName('');
    setShowAddModal(false);
  };

  const handleRevokeAll = async () => {
    await onRevokeAll();
    setShowRevokeAllModal(false);
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Card variant="elevated" padding="lg">
      <CardHeader
        title="🔐 Passkey Manager"
        subtitle={`${activePasskeys.length} of ${maxPasskeys} passkeys registered`}
        action={
          canAddMore && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowAddModal(true)}
              disabled={isLoading}
            >
              + Add Passkey
            </Button>
          )
        }
      />

      <CardContent>
        {/* Passkey List */}
        {passkeys.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-5xl mb-4">🔑</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Passkeys Registered</h3>
            <p className="text-gray-500 mb-4">
              Add a passkey to enable secure, passwordless authentication for your positions.
            </p>
            <Button
              variant="primary"
              onClick={() => setShowAddModal(true)}
              disabled={isLoading}
            >
              Register Your First Passkey
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {passkeys.map((passkey, index) => (
              <div
                key={index}
                className={`flex items-center justify-between p-4 rounded-lg border ${
                  passkey.isActive
                    ? 'border-green-200 bg-green-50'
                    : 'border-gray-200 bg-gray-50 opacity-60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getDeviceIcon(passkey.name)}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{passkey.name}</span>
                      {passkey.isActive ? (
                        <Badge variant="success" size="sm">Active</Badge>
                      ) : (
                        <Badge variant="secondary" size="sm">Revoked</Badge>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      Added {formatDate(passkey.createdAt)}
                    </div>
                  </div>
                </div>

                {passkey.isActive && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onRevoke(index)}
                    disabled={isLoading}
                  >
                    Revoke
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Revoke All Section */}
        {activePasskeys.length > 1 && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <Button
              variant="danger"
              size="sm"
              onClick={() => setShowRevokeAllModal(true)}
              disabled={isLoading}
            >
              ⚠️ Revoke All Passkeys
            </Button>
            <p className="text-xs text-gray-500 mt-2">
              Emergency action: Revokes all passkeys. You'll need to register new ones.
            </p>
          </div>
        )}

        {/* Security Tips */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="text-sm font-semibold text-blue-900 mb-2">🛡️ Security Tips</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Register passkeys on multiple devices for backup</li>
            <li>• Use descriptive names to identify your devices</li>
            <li>• Revoke passkeys for lost or stolen devices immediately</li>
            <li>• Hardware security keys (YubiKey) provide the strongest protection</li>
          </ul>
        </div>
      </CardContent>

      {/* Add Passkey Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} size="md">
        <ModalHeader
          title="Register New Passkey"
          subtitle="Add a passkey from this device"
        />
        <ModalBody>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Device Name
            </label>
            <Input
              type="text"
              value={newPasskeyName}
              onChange={(e) => setNewPasskeyName(e.target.value)}
              placeholder="e.g., MacBook Pro, iPhone, YubiKey"
              maxLength={50}
            />
            <p className="text-xs text-gray-500 mt-1">
              Give this passkey a memorable name to identify the device.
            </p>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-yellow-800 mb-2">What Happens Next</h4>
            <ol className="text-sm text-yellow-700 space-y-1 list-decimal list-inside">
              <li>Your browser will prompt for biometric or PIN verification</li>
              <li>A unique passkey will be created for this device</li>
              <li>The passkey will be registered on the blockchain</li>
            </ol>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setShowAddModal(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleRegister}
            isLoading={isLoading}
            disabled={!newPasskeyName.trim() || isLoading}
          >
            Register Passkey
          </Button>
        </ModalFooter>
      </Modal>

      {/* Revoke All Confirmation Modal */}
      <Modal isOpen={showRevokeAllModal} onClose={() => setShowRevokeAllModal(false)} size="sm">
        <ModalHeader
          title="⚠️ Revoke All Passkeys?"
          subtitle="This action cannot be undone"
        />
        <ModalBody>
          <p className="text-gray-700">
            This will revoke <strong>{activePasskeys.length} active passkeys</strong>.
            You will need to register new passkeys to use passkey-protected features.
          </p>
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">
              ⚠️ Positions protected by passkeys will require new passkey registration to unlock.
            </p>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setShowRevokeAllModal(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleRevokeAll}
            isLoading={isLoading}
          >
            Revoke All
          </Button>
        </ModalFooter>
      </Modal>
    </Card>
  );
}
