/**
 * Custom Error Classes for TimeLock Exchange
 */

// Base error class
export class TimeLockError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'TimeLockError';
  }
}

// Contract errors
export class ContractError extends TimeLockError {
  constructor(message: string, code: string, details?: Record<string, unknown>) {
    super(message, code, details);
    this.name = 'ContractError';
  }

  static fromClarityError(errorCode: number): ContractError {
    const errorMap: Record<number, { message: string; code: string }> = {
      100: { message: 'Not authorized to perform this action', code: 'ERR_NOT_AUTHORIZED' },
      101: { message: 'Position not found', code: 'ERR_POSITION_NOT_FOUND' },
      102: { message: 'Position is still locked', code: 'ERR_POSITION_LOCKED' },
      103: { message: 'Position already unlocked', code: 'ERR_ALREADY_UNLOCKED' },
      104: { message: 'Invalid amount', code: 'ERR_INVALID_AMOUNT' },
      105: { message: 'Invalid duration', code: 'ERR_INVALID_DURATION' },
      106: { message: 'Contract is paused', code: 'ERR_CONTRACT_PAUSED' },
      107: { message: 'Maximum passkeys reached', code: 'ERR_MAX_PASSKEYS' },
      108: { message: 'Passkey not found', code: 'ERR_PASSKEY_NOT_FOUND' },
      109: { message: 'Invalid signature', code: 'ERR_INVALID_SIGNATURE' },
      110: { message: 'Transfer failed', code: 'ERR_TRANSFER_FAILED' },
      111: { message: 'Mint failed', code: 'ERR_MINT_FAILED' },
    };

    const error = errorMap[errorCode] || { 
      message: `Unknown contract error: ${errorCode}`, 
      code: 'ERR_UNKNOWN' 
    };

    return new ContractError(error.message, error.code, { clarityErrorCode: errorCode });
  }
}

// Wallet errors
export class WalletError extends TimeLockError {
  constructor(message: string, code: string, details?: Record<string, unknown>) {
    super(message, code, details);
    this.name = 'WalletError';
  }

  static notConnected(): WalletError {
    return new WalletError('Wallet not connected', 'ERR_WALLET_NOT_CONNECTED');
  }

  static transactionRejected(): WalletError {
    return new WalletError('Transaction rejected by user', 'ERR_TX_REJECTED');
  }

  static insufficientFunds(required: bigint, available: bigint): WalletError {
    return new WalletError(
      `Insufficient funds. Required: ${required}, Available: ${available}`,
      'ERR_INSUFFICIENT_FUNDS',
      { required: required.toString(), available: available.toString() }
    );
  }
}

// Network errors
export class NetworkError extends TimeLockError {
  constructor(message: string, code: string, details?: Record<string, unknown>) {
    super(message, code, details);
    this.name = 'NetworkError';
  }

  static timeout(): NetworkError {
    return new NetworkError('Request timed out', 'ERR_TIMEOUT');
  }

  static connectionFailed(): NetworkError {
    return new NetworkError('Failed to connect to the network', 'ERR_CONNECTION_FAILED');
  }

  static apiError(status: number, message: string): NetworkError {
    return new NetworkError(
      `API error: ${message}`,
      'ERR_API_ERROR',
      { status, originalMessage: message }
    );
  }
}

// Validation errors
export class ValidationError extends TimeLockError {
  constructor(message: string, field?: string, details?: Record<string, unknown>) {
    super(message, 'ERR_VALIDATION', { field, ...details });
    this.name = 'ValidationError';
  }

  static invalidAmount(amount: string): ValidationError {
    return new ValidationError(`Invalid amount: ${amount}`, 'amount');
  }

  static amountTooLow(min: number): ValidationError {
    return new ValidationError(`Amount must be at least ${min} STX`, 'amount', { min });
  }

  static invalidDuration(duration: number): ValidationError {
    return new ValidationError(`Invalid lock duration: ${duration}`, 'duration');
  }

  static durationTooShort(min: number): ValidationError {
    return new ValidationError(`Lock duration must be at least ${min} days`, 'duration', { min });
  }
}

// Error handler utility
export function handleError(error: unknown): TimeLockError {
  if (error instanceof TimeLockError) {
    return error;
  }

  if (error instanceof Error) {
    // Check for common error patterns
    if (error.message.includes('User rejected')) {
      return WalletError.transactionRejected();
    }
    if (error.message.includes('timeout')) {
      return NetworkError.timeout();
    }
    if (error.message.includes('network')) {
      return NetworkError.connectionFailed();
    }

    return new TimeLockError(error.message, 'ERR_UNKNOWN');
  }

  return new TimeLockError('An unknown error occurred', 'ERR_UNKNOWN');
}

// User-friendly error messages
export function getErrorMessage(error: unknown): string {
  const timeLockError = handleError(error);
  
  const friendlyMessages: Record<string, string> = {
    ERR_WALLET_NOT_CONNECTED: 'Please connect your wallet to continue.',
    ERR_TX_REJECTED: 'Transaction was cancelled.',
    ERR_INSUFFICIENT_FUNDS: 'You don\'t have enough STX for this transaction.',
    ERR_NOT_AUTHORIZED: 'You don\'t have permission to perform this action.',
    ERR_POSITION_NOT_FOUND: 'This position doesn\'t exist.',
    ERR_POSITION_LOCKED: 'This position is still locked. Please wait until the unlock time.',
    ERR_ALREADY_UNLOCKED: 'This position has already been unlocked.',
    ERR_CONTRACT_PAUSED: 'The contract is temporarily paused. Please try again later.',
    ERR_MAX_PASSKEYS: 'You\'ve reached the maximum number of passkeys (5).',
    ERR_TIMEOUT: 'The request timed out. Please check your connection and try again.',
    ERR_CONNECTION_FAILED: 'Failed to connect to the network. Please check your connection.',
  };

  return friendlyMessages[timeLockError.code] || timeLockError.message;
}

export default TimeLockError;
