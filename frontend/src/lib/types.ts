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
