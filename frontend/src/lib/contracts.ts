/**
 * Contract interaction utilities using @stacks/transactions
 * For making read-only calls and building transactions
 */

import {
  callReadOnlyFunction,
  cvToValue,
  uintCV,
  principalCV,
  bufferCV,
  ClarityValue,
  PostConditionMode,
  makeContractCall,
  broadcastTransaction,
  AnchorMode,
  FungibleConditionCode,
  makeStandardSTXPostCondition,
} from '@stacks/transactions';
import { StacksMainnet, StacksTestnet, StacksDevnet } from '@stacks/network';
import { openContractCall } from '@stacks/connect';
import { ACTIVE_NETWORK, CONTRACTS, parseContractId, NETWORK } from './constants';
import type { 
  Position, 
  CreatePositionParams, 
  ContractCallResult, 
  ReadOnlyResult,
  EarlyWithdrawalInfo,
  PauseStatus,
  FeeTierInfo,
} from './types';
import { userSession } from './wallet-context';

// Get the appropriate network instance
export function getNetwork() {
  switch (ACTIVE_NETWORK) {
    case 'mainnet':
      return new StacksMainnet();
    case 'testnet':
      return new StacksTestnet();
    case 'devnet':
      return new StacksDevnet();
    default:
      return new StacksTestnet();
  }
}

// ============================================
// Read-Only Contract Calls
// ============================================

/**
 * Generic read-only function call
 */
export async function readContract<T = unknown>(
  contractId: string,
  functionName: string,
  args: ClarityValue[] = [],
  senderAddress?: string
): Promise<ReadOnlyResult<T>> {
  try {
    const { address, name } = parseContractId(contractId);
    const network = getNetwork();
    
    const result = await callReadOnlyFunction({
      contractAddress: address,
      contractName: name,
      functionName,
      functionArgs: args,
      network,
      senderAddress: senderAddress || address,
    });

    return {
      success: true,
      value: cvToValue(result) as T,
    };
  } catch (error) {
    console.error(`Error calling ${functionName}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get total position count
 */
export async function getPositionCount(): Promise<number> {
  const result = await readContract<{ value: number }>(
    CONTRACTS.timelockExchange,
    'get-position-count'
  );
  return result.success ? result.value?.value ?? 0 : 0;
}

/**
 * Get demo count (Clarity 4 demo)
 */
export async function getDemoCount(): Promise<number> {
  const result = await readContract<{ value: number }>(
    CONTRACTS.timelockExchange,
    'get-demo-count'
  );
  return result.success ? result.value?.value ?? 0 : 0;
}

/**
 * Get current block time (Clarity 4 feature)
 */
export async function getCurrentTime(): Promise<number> {
  const result = await readContract<{ value: number }>(
    CONTRACTS.timelockExchange,
    'get-current-time'
  );
  return result.success ? result.value?.value ?? 0 : 0;
}

/**
 * Check if a bot is approved
 */
export async function isBotApproved(botPrincipal: string): Promise<boolean> {
  const result = await readContract<boolean>(
    CONTRACTS.timelockExchange,
    'is-bot-approved?',
    [principalCV(botPrincipal)]
  );
  return result.success ? !!result.value : false;
}

/**
 * Get position details
 */
export async function getPosition(positionId: number): Promise<Position | null> {
  const result = await readContract<{
    owner: string;
    amount: { value: number };
    'lock-duration': { value: number };
    'created-at': { value: number };
    'unlock-time': { value: number };
    'is-active': boolean;
    'asset-type': string;
    'passkey-protected': boolean;
  }>(
    CONTRACTS.timelockExchange,
    'get-position',
    [uintCV(positionId)]
  );
  
  if (!result.success || !result.value) return null;
  
  const pos = result.value;
  return {
    id: positionId,
    owner: pos.owner,
    amount: pos.amount.value / 1_000_000,
    asset: pos['asset-type'],
    createdAt: pos['created-at'].value,
    duration: pos['lock-duration'].value / 86400,
    unlockTime: pos['unlock-time'].value,
    isActive: pos['is-active'],
    passkeyProtected: pos['passkey-protected'],
  };
}

/**
 * Get total locked value
 */
export async function getTotalLockedValue(): Promise<number> {
  const result = await readContract<{ value: number }>(
    CONTRACTS.timelockExchange,
    'get-total-locked-value'
  );
  return result.success ? (result.value?.value ?? 0) / 1_000_000 : 0;
}

/**
 * Calculate early withdrawal penalty
 */
export async function calculateEarlyWithdrawalPenalty(positionId: number): Promise<EarlyWithdrawalInfo | null> {
  const result = await readContract<{
    value: {
      'penalty-amount': { value: number };
      'penalty-bps': { value: number };
      'amount-after-penalty': { value: number };
      'time-remaining': { value: number };
    };
  }>(
    CONTRACTS.timelockExchange,
    'calculate-early-withdrawal-penalty',
    [uintCV(positionId)]
  );
  
  if (!result.success || !result.value?.value) return null;
  
  const info = result.value.value;
  return {
    penaltyAmount: info['penalty-amount'].value / 1_000_000,
    penaltyBps: info['penalty-bps'].value,
    amountAfterPenalty: info['amount-after-penalty'].value / 1_000_000,
    timeRemaining: info['time-remaining'].value,
  };
}

/**
 * Get pause status
 */
export async function getPauseStatus(): Promise<PauseStatus> {
  const result = await readContract<{
    'is-paused': boolean;
    reason: string;
    'paused-since': { value: number };
  }>(
    CONTRACTS.timelockExchange,
    'get-pause-status'
  );
  
  if (!result.success || !result.value) {
    return { isPaused: false, reason: '', pausedSince: 0 };
  }
  
  return {
    isPaused: result.value['is-paused'],
    reason: result.value.reason,
    pausedSince: result.value['paused-since'].value,
  };
}

/**
 * Calculate fee for lock duration
 */
export async function calculateFee(amount: number, lockDurationSeconds: number): Promise<FeeTierInfo | null> {
  const amountMicroSTX = Math.floor(amount * 1_000_000);
  const result = await readContract<{
    'fee-amount': { value: number };
    'fee-bps': { value: number };
    tier: { value: number };
    'amount-after-fee': { value: number };
  }>(
    CONTRACTS.feeCollector,
    'calculate-fee',
    [uintCV(amountMicroSTX), uintCV(lockDurationSeconds)]
  );
  
  if (!result.success || !result.value) return null;
  
  return {
    feeAmount: result.value['fee-amount'].value / 1_000_000,
    feeBps: result.value['fee-bps'].value,
    tier: result.value.tier.value,
    amountAfterFee: result.value['amount-after-fee'].value / 1_000_000,
  };
}

/**
 * Get total fees collected
 */
export async function getTotalFees(): Promise<number> {
  const result = await readContract<{ value: number }>(
    CONTRACTS.feeCollector,
    'get-total-fees'
  );
  return result.success ? result.value?.value ?? 0 : 0;
}

/**
 * Get last token ID (NFT)
 */
export async function getLastTokenId(): Promise<number> {
  const result = await readContract<{ value: { value: number } }>(
    CONTRACTS.positionNft,
    'get-last-token-id'
  );
  return result.success ? result.value?.value?.value ?? 0 : 0;
}

// ============================================
// Contract Write Calls (requires wallet)
// ============================================

/**
 * Create a new timelock position
 * Uses openContractCall from @stacks/connect for wallet signing
 */
export async function createPosition(
  params: CreatePositionParams,
  senderAddress: string
): Promise<ContractCallResult> {
  const { address, name } = parseContractId(CONTRACTS.timelockExchange);
  const amountMicroSTX = Math.floor(params.amount * 1_000_000);
  
  return new Promise((resolve) => {
    openContractCall({
      contractAddress: address,
      contractName: name,
      functionName: 'create-position',
      functionArgs: [
        uintCV(amountMicroSTX),
        uintCV(params.lockDuration),
      ],
      // Post conditions to ensure user doesn't lose more STX than expected
      postConditionMode: PostConditionMode.Deny,
      postConditions: [
        makeStandardSTXPostCondition(
          senderAddress,
          FungibleConditionCode.LessEqual,
          BigInt(amountMicroSTX)
        ),
      ],
      onFinish: (data) => {
        resolve({
          txId: data.txId,
          success: true,
        });
      },
      onCancel: () => {
        resolve({
          txId: '',
          success: false,
          error: 'Transaction cancelled by user',
        });
      },
    });
  });
}

/**
 * Register a passkey (Clarity 4 secp256r1-verify demo)
 */
export async function registerPasskey(publicKey: Uint8Array): Promise<ContractCallResult> {
  const { address, name } = parseContractId(CONTRACTS.timelockExchange);
  
  return new Promise((resolve) => {
    openContractCall({
      contractAddress: address,
      contractName: name,
      functionName: 'register-passkey',
      functionArgs: [bufferCV(publicKey)],
      postConditionMode: PostConditionMode.Allow,
      postConditions: [],
      onFinish: (data) => {
        resolve({
          txId: data.txId,
          success: true,
        });
      },
      onCancel: () => {
        resolve({
          txId: '',
          success: false,
          error: 'Transaction cancelled by user',
        });
      },
    });
  });
}

/**
 * Approve a trading bot (Clarity 4 contract-hash? demo)
 */
export async function approveTradingBot(
  botContract: string,
  expectedHash: Uint8Array
): Promise<ContractCallResult> {
  const { address, name } = parseContractId(CONTRACTS.timelockExchange);
  
  return new Promise((resolve) => {
    openContractCall({
      contractAddress: address,
      contractName: name,
      functionName: 'approve-trading-bot',
      functionArgs: [
        principalCV(botContract),
        bufferCV(expectedHash),
      ],
      postConditionMode: PostConditionMode.Allow,
      postConditions: [],
      onFinish: (data) => {
        resolve({
          txId: data.txId,
          success: true,
        });
      },
      onCancel: () => {
        resolve({
          txId: '',
          success: false,
          error: 'Transaction cancelled by user',
        });
      },
    });
  });
}

/**
 * Run the comprehensive demo (uses all Clarity 4 functions)
 */
export async function runComprehensiveDemo(
  botContract: string,
  expectedHash: Uint8Array,
  messageHash: Uint8Array,
  signature: Uint8Array
): Promise<ContractCallResult> {
  const { address, name } = parseContractId(CONTRACTS.timelockExchange);
  
  return new Promise((resolve) => {
    openContractCall({
      contractAddress: address,
      contractName: name,
      functionName: 'comprehensive-demo',
      functionArgs: [
        principalCV(botContract),
        bufferCV(expectedHash),
        bufferCV(messageHash),
        bufferCV(signature),
      ],
      postConditionMode: PostConditionMode.Allow,
      postConditions: [],
      onFinish: (data) => {
        resolve({
          txId: data.txId,
          success: true,
        });
      },
      onCancel: () => {
        resolve({
          txId: '',
          success: false,
          error: 'Transaction cancelled by user',
        });
      },
    });
  });
}

/**
 * Mint a position NFT
 */
export async function mintPositionNft(recipient: string): Promise<ContractCallResult> {
  const { address, name } = parseContractId(CONTRACTS.positionNft);
  
  return new Promise((resolve) => {
    openContractCall({
      contractAddress: address,
      contractName: name,
      functionName: 'mint',
      functionArgs: [principalCV(recipient)],
      postConditionMode: PostConditionMode.Allow,
      postConditions: [],
      onFinish: (data) => {
        resolve({
          txId: data.txId,
          success: true,
        });
      },
      onCancel: () => {
        resolve({
          txId: '',
          success: false,
          error: 'Transaction cancelled by user',
        });
      },
    });
  });
}

// ============================================
// Explorer URLs
// ============================================

export function getExplorerTxUrl(txId: string): string {
  const baseUrl = NETWORK[ACTIVE_NETWORK].explorer;
  const formattedTxId = txId.startsWith('0x') ? txId : `0x${txId}`;
  return `${baseUrl}/txid/${formattedTxId}`;
}

export function getExplorerAddressUrl(address: string): string {
  const baseUrl = NETWORK[ACTIVE_NETWORK].explorer;
  return `${baseUrl}/address/${address}`;
}

export function getExplorerContractUrl(contractId: string): string {
  const baseUrl = NETWORK[ACTIVE_NETWORK].explorer;
  return `${baseUrl}/txid/${contractId}`;
}
