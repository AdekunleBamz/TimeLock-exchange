'use client';

import React, { useState, useCallback, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'danger';
  isLoading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  isLoading = false,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const handleConfirm = async () => {
    await onConfirm();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4 animate-fade-in">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <div className="text-gray-600 mb-6">{message}</div>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className={cn(
              'px-4 py-2 rounded-lg font-medium transition-colors',
              variant === 'danger'
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-blue-600 text-white hover:bg-blue-700',
              isLoading && 'opacity-50 cursor-not-allowed'
            )}
          >
            {isLoading ? 'Loading...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

// Hook for confirm dialog
interface ConfirmOptions {
  title: string;
  message: ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'danger';
}

export function useConfirmDialog() {
  const [state, setState] = useState<{
    isOpen: boolean;
    options: ConfirmOptions | null;
    resolve: ((value: boolean) => void) | null;
  }>({
    isOpen: false,
    options: null,
    resolve: null,
  });

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({ isOpen: true, options, resolve });
    });
  }, []);

  const handleClose = useCallback(() => {
    state.resolve?.(false);
    setState({ isOpen: false, options: null, resolve: null });
  }, [state]);

  const handleConfirm = useCallback(() => {
    state.resolve?.(true);
    setState({ isOpen: false, options: null, resolve: null });
  }, [state]);

  const ConfirmDialogComponent = state.options ? (
    <ConfirmDialog
      isOpen={state.isOpen}
      onClose={handleClose}
      onConfirm={handleConfirm}
      title={state.options.title}
      message={state.options.message}
      confirmText={state.options.confirmText}
      cancelText={state.options.cancelText}
      variant={state.options.variant}
    />
  ) : null;

  return { confirm, ConfirmDialogComponent };
}

// Amount display component
interface AmountDisplayProps {
  amount: bigint;
  symbol?: string;
  decimals?: number;
  showFull?: boolean;
  className?: string;
}

export function AmountDisplay({
  amount,
  symbol = 'STX',
  decimals = 6,
  showFull = false,
  className,
}: AmountDisplayProps) {
  const divisor = BigInt(10 ** decimals);
  const whole = amount / divisor;
  const fraction = amount % divisor;
  const fractionStr = fraction.toString().padStart(decimals, '0');
  
  // Trim trailing zeros unless showFull
  const displayFraction = showFull 
    ? fractionStr 
    : fractionStr.replace(/0+$/, '') || '0';

  const formatted = displayFraction === '0' 
    ? whole.toLocaleString()
    : `${whole.toLocaleString()}.${displayFraction}`;

  return (
    <span className={cn('font-mono', className)}>
      {formatted} <span className="text-gray-500">{symbol}</span>
    </span>
  );
}

// Time display component
interface TimeDisplayProps {
  seconds: bigint | number;
  format?: 'short' | 'long' | 'countdown';
  className?: string;
}

export function TimeDisplay({ seconds, format = 'short', className }: TimeDisplayProps) {
  const secs = typeof seconds === 'bigint' ? Number(seconds) : seconds;
  
  if (secs <= 0) {
    return <span className={cn('text-green-600 font-medium', className)}>Ready</span>;
  }

  const days = Math.floor(secs / 86400);
  const hours = Math.floor((secs % 86400) / 3600);
  const minutes = Math.floor((secs % 3600) / 60);
  const remainingSeconds = secs % 60;

  if (format === 'countdown') {
    return (
      <span className={cn('font-mono tabular-nums', className)}>
        {days > 0 && `${days}d `}
        {String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}:
        {String(remainingSeconds).padStart(2, '0')}
      </span>
    );
  }

  if (format === 'long') {
    const parts: string[] = [];
    if (days > 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);
    if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
    if (minutes > 0 && days === 0) parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
    return <span className={className}>{parts.join(', ') || 'Less than a minute'}</span>;
  }

  // Short format
  if (days > 0) return <span className={className}>{days}d {hours}h</span>;
  if (hours > 0) return <span className={className}>{hours}h {minutes}m</span>;
  return <span className={className}>{minutes}m {remainingSeconds}s</span>;
}

// Address display with copy
interface AddressDisplayProps {
  address: string;
  truncate?: boolean;
  className?: string;
}

export function AddressDisplay({ address, truncate = true, className }: AddressDisplayProps) {
  const [copied, setCopied] = useState(false);

  const displayAddress = truncate
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : address;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className={cn(
        'font-mono text-sm hover:bg-gray-100 px-2 py-1 rounded transition-colors inline-flex items-center gap-1',
        className
      )}
      title={address}
    >
      {displayAddress}
      {copied ? (
        <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      )}
    </button>
  );
}

export default ConfirmDialog;
