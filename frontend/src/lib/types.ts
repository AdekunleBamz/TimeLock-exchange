/**
 * Position interface for TimeLock positions
 */
export interface Position {
  id: number;
  owner: string;
  amount: number; // in STX
  asset: string;
  createdAt: number; // unix timestamp
  duration: number; // in days
  unlockTime: number; // unix timestamp
  isActive: boolean;
  passkeyProtected?: boolean;
  tier?: number;
}

/**
 * Position metadata from NFT contract
 */
export interface PositionMetadata {
  tokenId: number;
  owner: string | null;
  amount: number;
  assetType: string;
  lockDuration: number;
  createdAt: number;
  unlockTime: number;
  originalOwner: string;
  transferCount: number;
  tier: number;
  isUnlockable: boolean;
}

/**
 * Create position parameters
 */
export interface CreatePositionParams {
  amount: number; // in STX
  lockDuration: number; // in seconds
  usePasskey?: boolean;
}

/**
 * Early withdrawal info
 */
export interface EarlyWithdrawalInfo {
  penaltyAmount: number;
  penaltyBps: number;
  amountAfterPenalty: number;
  timeRemaining: number;
}

/**
 * Fee tier info
 */
export interface FeeTierInfo {
  feeAmount: number;
  feeBps: number;
  tier: number;
  amountAfterFee: number;
}

/**
 * Pause status
 */
export interface PauseStatus {
  isPaused: boolean;
  reason: string;
  pausedSince: number;
}

/**
 * Passkey info
 */
export interface PasskeyInfo {
  publicKey: string;
  name: string;
  createdAt: number;
  isActive: boolean;
}

/**
 * Wallet state
 */
export interface WalletState {
  isConnected: boolean;
  address: string | null;
  network: 'mainnet' | 'testnet';
}

/**
 * Contract call result
 */
export interface ContractCallResult {
  txId: string;
  success: boolean;
  error?: string;
}

/**
 * Read-only call result
 */
export interface ReadOnlyResult<T = unknown> {
  success: boolean;
  value?: T;
  error?: string;
}

/**
 * Fee statistics
 */
export interface FeeStats {
  totalFees: number;
  feeCount: number;
  tier1Fees: number;
  tier2Fees: number;
  tier3Fees: number;
  tier4Fees: number;
  tier5Fees: number;
}
