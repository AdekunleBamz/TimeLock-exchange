import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '../lib/wallet-context';
import type { PasskeyInfo } from '../lib/types';
import { openContractCall } from '@stacks/connect';
import { TIMELOCK_EXCHANGE_CONTRACT } from '../lib/contracts';
import { 
  contractPrincipalCV, 
  uintCV, 
  bufferCV,
  standardPrincipalCV,
  callReadOnlyFunction,
  cvToValue 
} from '@stacks/transactions';

interface UsePasskeysReturn {
  passkeys: PasskeyInfo[];
  isLoading: boolean;
  error: string | null;
  passkeyCount: number;
  canAddMore: boolean;
  addPasskey: (publicKey: Uint8Array, deviceName: string) => Promise<void>;
  revokePasskey: (passkeyId: number) => Promise<void>;
  verifyPasskey: (passkeyId: number, message: Uint8Array, signature: Uint8Array) => Promise<boolean>;
  refetch: () => Promise<void>;
}

const MAX_PASSKEYS = 5;

export function usePasskeys(): UsePasskeysReturn {
  const { address, isConnected, network } = useWallet();
  const [passkeys, setPasskeys] = useState<PasskeyInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPasskeys = useCallback(async () => {
    if (!isConnected || !address) {
      setPasskeys([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const userPasskeys: PasskeyInfo[] = [];

      // Fetch passkey count
      const countResult = await callReadOnlyFunction({
        contractAddress: TIMELOCK_EXCHANGE_CONTRACT.address,
        contractName: TIMELOCK_EXCHANGE_CONTRACT.name,
        functionName: 'get-passkey-count',
        functionArgs: [standardPrincipalCV(address)],
        network,
        senderAddress: address,
      });

      const count = Number(cvToValue(countResult));

      // Fetch each passkey
      for (let i = 0; i < count; i++) {
        const passkeyResult = await callReadOnlyFunction({
          contractAddress: TIMELOCK_EXCHANGE_CONTRACT.address,
          contractName: TIMELOCK_EXCHANGE_CONTRACT.name,
          functionName: 'get-passkey',
          functionArgs: [standardPrincipalCV(address), uintCV(i)],
          network,
          senderAddress: address,
        });

        const passkeyData = cvToValue(passkeyResult);
        if (passkeyData && passkeyData.value) {
          userPasskeys.push({
            id: i,
            publicKey: passkeyData.value['public-key'],
            deviceName: passkeyData.value['device-name'] || `Device ${i + 1}`,
            addedAt: BigInt(passkeyData.value['added-at'] || 0),
            isActive: passkeyData.value['active'] !== false,
          });
        }
      }

      setPasskeys(userPasskeys);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch passkeys');
    } finally {
      setIsLoading(false);
    }
  }, [address, isConnected, network]);

  useEffect(() => {
    fetchPasskeys();
  }, [fetchPasskeys]);

  const addPasskey = useCallback(async (publicKey: Uint8Array, deviceName: string) => {
    if (!isConnected || !address) {
      throw new Error('Wallet not connected');
    }

    if (passkeys.length >= MAX_PASSKEYS) {
      throw new Error(`Maximum ${MAX_PASSKEYS} passkeys allowed`);
    }

    try {
      await openContractCall({
        contractAddress: TIMELOCK_EXCHANGE_CONTRACT.address,
        contractName: TIMELOCK_EXCHANGE_CONTRACT.name,
        functionName: 'add-passkey',
        functionArgs: [
          bufferCV(publicKey),
          bufferCV(new TextEncoder().encode(deviceName)),
        ],
        network,
        onFinish: (data) => {
          console.log('Add passkey transaction:', data);
          // Refetch after transaction
          setTimeout(fetchPasskeys, 5000);
        },
        onCancel: () => {
          throw new Error('Transaction cancelled');
        },
      });
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to add passkey');
    }
  }, [address, isConnected, network, passkeys.length, fetchPasskeys]);

  const revokePasskey = useCallback(async (passkeyId: number) => {
    if (!isConnected || !address) {
      throw new Error('Wallet not connected');
    }

    const passkey = passkeys.find(p => p.id === passkeyId);
    if (!passkey) {
      throw new Error('Passkey not found');
    }

    try {
      await openContractCall({
        contractAddress: TIMELOCK_EXCHANGE_CONTRACT.address,
        contractName: TIMELOCK_EXCHANGE_CONTRACT.name,
        functionName: 'revoke-passkey',
        functionArgs: [uintCV(passkeyId)],
        network,
        onFinish: (data) => {
          console.log('Revoke passkey transaction:', data);
          // Refetch after transaction
          setTimeout(fetchPasskeys, 5000);
        },
        onCancel: () => {
          throw new Error('Transaction cancelled');
        },
      });
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to revoke passkey');
    }
  }, [address, isConnected, network, passkeys, fetchPasskeys]);

  const verifyPasskey = useCallback(async (
    passkeyId: number, 
    message: Uint8Array, 
    signature: Uint8Array
  ): Promise<boolean> => {
    if (!isConnected || !address) {
      return false;
    }

    try {
      const result = await callReadOnlyFunction({
        contractAddress: TIMELOCK_EXCHANGE_CONTRACT.address,
        contractName: TIMELOCK_EXCHANGE_CONTRACT.name,
        functionName: 'verify-passkey',
        functionArgs: [
          standardPrincipalCV(address),
          uintCV(passkeyId),
          bufferCV(message),
          bufferCV(signature),
        ],
        network,
        senderAddress: address,
      });

      return cvToValue(result) === true;
    } catch {
      return false;
    }
  }, [address, isConnected, network]);

  return {
    passkeys,
    isLoading,
    error,
    passkeyCount: passkeys.length,
    canAddMore: passkeys.length < MAX_PASSKEYS,
    addPasskey,
    revokePasskey,
    verifyPasskey,
    refetch: fetchPasskeys,
  };
}

// WebAuthn helpers for passkey creation
export async function createWebAuthnCredential(
  userName: string,
  displayName: string
): Promise<{ publicKey: Uint8Array; credentialId: Uint8Array }> {
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  
  const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
    challenge,
    rp: {
      name: 'TimeLock Exchange',
      id: window.location.hostname,
    },
    user: {
      id: new TextEncoder().encode(userName),
      name: userName,
      displayName,
    },
    pubKeyCredParams: [
      { type: 'public-key', alg: -7 }, // ES256 (secp256r1)
    ],
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      userVerification: 'preferred',
      residentKey: 'preferred',
    },
    timeout: 60000,
  };

  const credential = await navigator.credentials.create({
    publicKey: publicKeyCredentialCreationOptions,
  }) as PublicKeyCredential;

  const response = credential.response as AuthenticatorAttestationResponse;
  
  // Extract public key from attestation object
  // This is a simplified extraction - production code should properly parse CBOR
  const publicKeyBytes = new Uint8Array(response.getPublicKey()!);
  
  return {
    publicKey: publicKeyBytes,
    credentialId: new Uint8Array(credential.rawId),
  };
}

export async function signWithWebAuthn(
  credentialId: Uint8Array,
  message: Uint8Array
): Promise<Uint8Array> {
  const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
    challenge: message,
    rpId: window.location.hostname,
    allowCredentials: [
      {
        type: 'public-key',
        id: credentialId,
      },
    ],
    userVerification: 'preferred',
    timeout: 60000,
  };

  const assertion = await navigator.credentials.get({
    publicKey: publicKeyCredentialRequestOptions,
  }) as PublicKeyCredential;

  const response = assertion.response as AuthenticatorAssertionResponse;
  return new Uint8Array(response.signature);
}
