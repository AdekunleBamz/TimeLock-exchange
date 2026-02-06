/**
 * Error Handling Utilities for TimeLock Exchange
 * 
 * Provides comprehensive error handling for:
 * - Stacks transaction errors
 * - Contract-specific errors
 * - Network errors
 * - Wallet connection errors
 * 
 * @module error-handling
 */

import { ACTIVE_NETWORK } from './constants';

// ============================================================================
// Error Types
// ============================================================================

export enum ErrorCode {
  // Transaction errors
  TRANSACTION_REJECTED = 'TRANSACTION_REJECTED',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  TRANSACTION_TIMEOUT = 'TRANSACTION_TIMEOUT',
  TRANSACTION_ABORTED = 'TRANSACTION_ABORTED',
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  NONCE_ERROR = 'NONCE_ERROR',
  
  // Contract errors
  CONTRACT_NOT_FOUND = 'CONTRACT_NOT_FOUND',
  FUNCTION_NOT_FOUND = 'FUNCTION_NOT_FOUND',
  INVALID_ARGUMENTS = 'INVALID_ARGUMENTS',
  POST_CONDITION_FAILED = 'POST_CONDITION_FAILED',
  CONTRACT_ERROR = 'CONTRACT_ERROR',
  
  // Network errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  API_ERROR = 'API_ERROR',
  TIMEOUT = 'TIMEOUT',
  
  // Wallet errors
  WALLET_NOT_CONNECTED = 'WALLET_NOT_CONNECTED',
  WALLET_REJECTED = 'WALLET_REJECTED',
  WALLET_LOCKED = 'WALLET_LOCKED',
  INVALID_ADDRESS = 'INVALID_ADDRESS',
  
  // Application errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export interface AppError {
  code: ErrorCode;
  message: string;
  details?: string;
  originalError?: Error;
  recoverable: boolean;
  suggestion?: string;
}

// ============================================================================
// Contract Error Codes
// ============================================================================

/**
 * TimeLock Exchange contract error codes
 * Maps contract error codes to human-readable messages
 */
export const CONTRACT_ERRORS: Record<number, { message: string; suggestion: string }> = {
  // Common errors
  100: { message: 'Not authorized', suggestion: 'You do not have permission to perform this action' },
  101: { message: 'Contract is paused', suggestion: 'Wait for the contract to be unpaused' },
  102: { message: 'Invalid parameters', suggestion: 'Check your input values' },
  103: { message: 'Position not found', suggestion: 'The position may not exist or has been withdrawn' },
  104: { message: 'Insufficient balance', suggestion: 'You do not have enough funds for this operation' },
  
  // Position errors
  200: { message: 'Position still locked', suggestion: 'Wait until the unlock time to withdraw' },
  201: { message: 'Position already withdrawn', suggestion: 'This position has already been withdrawn' },
  202: { message: 'Invalid lock duration', suggestion: 'Choose a lock duration between 7 and 365 days' },
  203: { message: 'Amount too small', suggestion: 'Minimum amount is 1 STX' },
  204: { message: 'Amount too large', suggestion: 'Maximum amount exceeded' },
  205: { message: 'Early withdrawal penalty exceeds amount', suggestion: 'The penalty is too high for early withdrawal' },
  
  // Staking errors
  300: { message: 'Not enough staked', suggestion: 'You need to stake more before this action' },
  301: { message: 'Cooldown period active', suggestion: 'Wait for the cooldown period to end' },
  302: { message: 'Already staking', suggestion: 'You already have an active stake' },
  303: { message: 'Stake is locked', suggestion: 'Wait for the lock period to end' },
  304: { message: 'No rewards to claim', suggestion: 'Accumulate more rewards before claiming' },
  
  // Governance errors
  400: { message: 'Proposal not found', suggestion: 'The proposal may have been cancelled or executed' },
  401: { message: 'Voting period ended', suggestion: 'This proposal is no longer accepting votes' },
  402: { message: 'Already voted', suggestion: 'You have already cast your vote' },
  403: { message: 'Insufficient voting power', suggestion: 'Stake more tokens to gain voting power' },
  404: { message: 'Proposal not passed', suggestion: 'The proposal did not reach quorum or threshold' },
  405: { message: 'Execution delay not met', suggestion: 'Wait for the timelock delay to pass' },
  
  // Vault errors
  500: { message: 'Vault not found', suggestion: 'The vault may not exist' },
  501: { message: 'Vault is locked', suggestion: 'Wait for the vault to unlock' },
  502: { message: 'Daily limit exceeded', suggestion: 'Wait until tomorrow or increase your daily limit' },
  503: { message: 'Withdrawal delay not met', suggestion: 'Wait for the withdrawal delay to pass' },
  504: { message: 'Not vault owner', suggestion: 'You can only manage your own vaults' },
  505: { message: 'Pending withdrawal exists', suggestion: 'Execute or cancel existing withdrawal first' },
  
  // Escrow errors
  600: { message: 'Escrow not found', suggestion: 'The escrow may have been completed or refunded' },
  601: { message: 'Escrow not funded', suggestion: 'The buyer needs to fund the escrow first' },
  602: { message: 'Not escrow participant', suggestion: 'You are not the buyer or seller' },
  603: { message: 'Escrow already released', suggestion: 'Funds have already been released' },
  604: { message: 'Escrow is disputed', suggestion: 'Wait for dispute resolution' },
  605: { message: 'Deadline passed', suggestion: 'The escrow deadline has passed' },
  
  // Emergency withdraw errors
  700: { message: 'Emergency request not found', suggestion: 'Submit an emergency withdrawal request first' },
  701: { message: 'Emergency delay not met', suggestion: 'Wait for the emergency delay period' },
  702: { message: 'Request already executed', suggestion: 'This request has already been processed' },
  703: { message: 'Request cancelled', suggestion: 'This request was cancelled' },
};

// ============================================================================
// Error Parsing
// ============================================================================

/**
 * Parse a Clarity error response
 */
export function parseClarityError(errorValue: string): { code: number; message: string } | null {
  // Match patterns like (err u100) or (err 100)
  const match = errorValue.match(/\(err\s+u?(\d+)\)/);
  if (match) {
    return {
      code: parseInt(match[1], 10),
      message: CONTRACT_ERRORS[parseInt(match[1], 10)]?.message || 'Unknown contract error',
    };
  }
  return null;
}

/**
 * Parse a transaction error
 */
export function parseTransactionError(error: unknown): AppError {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    // User cancelled
    if (message.includes('cancel') || message.includes('rejected') || message.includes('user denied')) {
      return {
        code: ErrorCode.WALLET_REJECTED,
        message: 'Transaction cancelled',
        details: 'You cancelled the transaction in your wallet',
        originalError: error,
        recoverable: true,
        suggestion: 'Try again when ready',
      };
    }
    
    // Insufficient funds
    if (message.includes('insufficient') || message.includes('not enough')) {
      return {
        code: ErrorCode.INSUFFICIENT_FUNDS,
        message: 'Insufficient funds',
        details: 'You do not have enough STX for this transaction',
        originalError: error,
        recoverable: false,
        suggestion: 'Add more STX to your wallet',
      };
    }
    
    // Post condition failed
    if (message.includes('post-condition') || message.includes('postcondition')) {
      return {
        code: ErrorCode.POST_CONDITION_FAILED,
        message: 'Transaction safety check failed',
        details: 'The transaction was blocked to protect your funds',
        originalError: error,
        recoverable: true,
        suggestion: 'Check the transaction details and try again',
      };
    }
    
    // Nonce error
    if (message.includes('nonce')) {
      return {
        code: ErrorCode.NONCE_ERROR,
        message: 'Transaction sequence error',
        details: 'There may be a pending transaction',
        originalError: error,
        recoverable: true,
        suggestion: 'Wait for pending transactions to complete',
      };
    }
    
    // Contract error
    const clarityError = parseClarityError(message);
    if (clarityError) {
      const errorInfo = CONTRACT_ERRORS[clarityError.code];
      return {
        code: ErrorCode.CONTRACT_ERROR,
        message: errorInfo?.message || clarityError.message,
        details: `Contract error code: ${clarityError.code}`,
        originalError: error,
        recoverable: errorInfo ? true : false,
        suggestion: errorInfo?.suggestion || 'Contact support if the issue persists',
      };
    }
    
    // Network error
    if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
      return {
        code: ErrorCode.NETWORK_ERROR,
        message: 'Network error',
        details: 'Failed to connect to the Stacks network',
        originalError: error,
        recoverable: true,
        suggestion: 'Check your internet connection and try again',
      };
    }
    
    // Timeout
    if (message.includes('timeout')) {
      return {
        code: ErrorCode.TIMEOUT,
        message: 'Request timed out',
        details: 'The operation took too long to complete',
        originalError: error,
        recoverable: true,
        suggestion: 'The network may be congested, try again later',
      };
    }
  }
  
  // Unknown error
  return {
    code: ErrorCode.UNKNOWN_ERROR,
    message: 'An unexpected error occurred',
    details: error instanceof Error ? error.message : String(error),
    originalError: error instanceof Error ? error : undefined,
    recoverable: false,
    suggestion: 'Please try again or contact support',
  };
}

// ============================================================================
// Error Creation Helpers
// ============================================================================

/**
 * Create a validation error
 */
export function createValidationError(message: string, details?: string): AppError {
  return {
    code: ErrorCode.VALIDATION_ERROR,
    message,
    details,
    recoverable: true,
    suggestion: 'Please check your input and try again',
  };
}

/**
 * Create a wallet not connected error
 */
export function createWalletNotConnectedError(): AppError {
  return {
    code: ErrorCode.WALLET_NOT_CONNECTED,
    message: 'Wallet not connected',
    details: 'Please connect your wallet to continue',
    recoverable: true,
    suggestion: 'Click the Connect Wallet button',
  };
}

/**
 * Create an API error
 */
export function createApiError(message: string, details?: string): AppError {
  return {
    code: ErrorCode.API_ERROR,
    message,
    details,
    recoverable: true,
    suggestion: 'Try refreshing the page',
  };
}

// ============================================================================
// Error Display Helpers
// ============================================================================

/**
 * Format an error for user display
 */
export function formatErrorForDisplay(error: AppError): {
  title: string;
  description: string;
  action?: string;
} {
  return {
    title: error.message,
    description: error.details || '',
    action: error.recoverable ? error.suggestion : undefined,
  };
}

/**
 * Get error severity level
 */
export function getErrorSeverity(error: AppError): 'error' | 'warning' | 'info' {
  if (!error.recoverable) {
    return 'error';
  }
  
  if ([ErrorCode.WALLET_REJECTED, ErrorCode.VALIDATION_ERROR].includes(error.code)) {
    return 'info';
  }
  
  return 'warning';
}

/**
 * Should the error be logged to analytics/monitoring?
 */
export function shouldLogError(error: AppError): boolean {
  // Don't log user actions like cancellation
  const userActionCodes = [
    ErrorCode.WALLET_REJECTED,
    ErrorCode.VALIDATION_ERROR,
  ];
  
  return !userActionCodes.includes(error.code);
}

// ============================================================================
// Error Boundary Support
// ============================================================================

/**
 * Error details for error boundary reporting
 */
export interface ErrorReport {
  error: AppError;
  componentStack?: string;
  timestamp: Date;
  network: string;
  url: string;
  userAgent: string;
}

/**
 * Create an error report for logging/monitoring
 */
export function createErrorReport(
  error: AppError,
  componentStack?: string
): ErrorReport {
  return {
    error,
    componentStack,
    timestamp: new Date(),
    network: ACTIVE_NETWORK,
    url: typeof window !== 'undefined' ? window.location.href : '',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
  };
}

// ============================================================================
// Retry Logic
// ============================================================================

/**
 * Determine if an error should be retried
 */
export function isRetryableError(error: AppError): boolean {
  const retryableCodes = [
    ErrorCode.NETWORK_ERROR,
    ErrorCode.TIMEOUT,
    ErrorCode.API_ERROR,
    ErrorCode.NONCE_ERROR,
  ];
  
  return retryableCodes.includes(error.code);
}

/**
 * Get recommended retry delay in milliseconds
 */
export function getRetryDelay(error: AppError, attempt: number): number {
  const baseDelay = 1000;
  const maxDelay = 30000;
  
  // Exponential backoff
  const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
  
  // Add jitter
  const jitter = Math.random() * 0.3 * delay;
  
  return delay + jitter;
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validate a Stacks address
 */
export function validateStacksAddress(address: string): AppError | null {
  if (!address) {
    return createValidationError('Address is required');
  }
  
  // Check prefix for mainnet/testnet
  const isMainnet = ACTIVE_NETWORK === 'mainnet';
  const validPrefix = isMainnet ? 'SP' : 'ST';
  
  if (!address.startsWith(validPrefix)) {
    return createValidationError(
      `Invalid address for ${ACTIVE_NETWORK}`,
      `Address must start with ${validPrefix}`
    );
  }
  
  // Check length (typically 39-41 characters)
  if (address.length < 39 || address.length > 41) {
    return createValidationError('Invalid address format');
  }
  
  return null;
}

/**
 * Validate an amount
 */
export function validateAmount(
  amount: number | bigint,
  options: {
    min?: number | bigint;
    max?: number | bigint;
    balance?: number | bigint;
  } = {}
): AppError | null {
  const { min = 0, max, balance } = options;
  const amountNum = typeof amount === 'bigint' ? Number(amount) : amount;
  const minNum = typeof min === 'bigint' ? Number(min) : min;
  
  if (isNaN(amountNum) || amountNum <= 0) {
    return createValidationError('Amount must be a positive number');
  }
  
  if (amountNum < minNum) {
    return createValidationError(`Amount must be at least ${minNum / 1_000_000} STX`);
  }
  
  if (max !== undefined) {
    const maxNum = typeof max === 'bigint' ? Number(max) : max;
    if (amountNum > maxNum) {
      return createValidationError(`Amount cannot exceed ${maxNum / 1_000_000} STX`);
    }
  }
  
  if (balance !== undefined) {
    const balanceNum = typeof balance === 'bigint' ? Number(balance) : balance;
    if (amountNum > balanceNum) {
      return createValidationError(
        'Insufficient balance',
        `You have ${balanceNum / 1_000_000} STX available`
      );
    }
  }
  
  return null;
}

// ============================================================================
// Exports
// ============================================================================

export type {
  AppError as TimeLockError,
};
