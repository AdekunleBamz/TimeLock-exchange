'use client';

import React from 'react';

// =============================================================================
// TYPES
// =============================================================================

type EmptyStateSize = 'sm' | 'md' | 'lg';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  size?: EmptyStateSize;
  className?: string;
  children?: React.ReactNode;
}

interface IllustratedEmptyStateProps extends Omit<EmptyStateProps, 'icon'> {
  illustration: 'no-data' | 'no-results' | 'no-positions' | 'error' | 'locked' | 'wallet' | 'success';
}

// =============================================================================
// STYLES
// =============================================================================

const sizeStyles: Record<EmptyStateSize, { container: string; icon: string; title: string; description: string }> = {
  sm: {
    container: 'py-6 px-4',
    icon: 'w-10 h-10 mb-3',
    title: 'text-base font-medium',
    description: 'text-sm',
  },
  md: {
    container: 'py-12 px-6',
    icon: 'w-16 h-16 mb-4',
    title: 'text-lg font-semibold',
    description: 'text-base',
  },
  lg: {
    container: 'py-16 px-8',
    icon: 'w-24 h-24 mb-6',
    title: 'text-xl font-bold',
    description: 'text-lg',
  },
};

// =============================================================================
// ILLUSTRATIONS
// =============================================================================

const illustrations: Record<IllustratedEmptyStateProps['illustration'], React.ReactNode> = {
  'no-data': (
    <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <circle cx="100" cy="100" r="80" fill="currentColor" className="text-gray-100 dark:text-gray-800" />
      <rect x="60" y="60" width="80" height="100" rx="4" fill="currentColor" className="text-gray-200 dark:text-gray-700" />
      <rect x="70" y="80" width="60" height="8" rx="2" fill="currentColor" className="text-gray-300 dark:text-gray-600" />
      <rect x="70" y="96" width="40" height="8" rx="2" fill="currentColor" className="text-gray-300 dark:text-gray-600" />
      <rect x="70" y="112" width="50" height="8" rx="2" fill="currentColor" className="text-gray-300 dark:text-gray-600" />
      <rect x="70" y="128" width="30" height="8" rx="2" fill="currentColor" className="text-gray-300 dark:text-gray-600" />
    </svg>
  ),
  'no-results': (
    <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <circle cx="100" cy="100" r="80" fill="currentColor" className="text-gray-100 dark:text-gray-800" />
      <circle cx="90" cy="90" r="35" stroke="currentColor" strokeWidth="8" className="text-gray-300 dark:text-gray-600" fill="none" />
      <line x1="115" y1="115" x2="145" y2="145" stroke="currentColor" strokeWidth="8" strokeLinecap="round" className="text-gray-300 dark:text-gray-600" />
      <line x1="75" y1="85" x2="105" y2="95" stroke="currentColor" strokeWidth="4" strokeLinecap="round" className="text-gray-400 dark:text-gray-500" />
      <line x1="105" y1="85" x2="75" y2="95" stroke="currentColor" strokeWidth="4" strokeLinecap="round" className="text-gray-400 dark:text-gray-500" />
    </svg>
  ),
  'no-positions': (
    <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <circle cx="100" cy="100" r="80" fill="currentColor" className="text-gray-100 dark:text-gray-800" />
      <rect x="50" y="70" width="100" height="60" rx="8" fill="currentColor" className="text-gray-200 dark:text-gray-700" />
      <circle cx="75" cy="100" r="15" fill="currentColor" className="text-gray-300 dark:text-gray-600" />
      <rect x="100" y="90" width="40" height="8" rx="2" fill="currentColor" className="text-gray-300 dark:text-gray-600" />
      <rect x="100" y="102" width="30" height="6" rx="2" fill="currentColor" className="text-gray-400 dark:text-gray-500" />
      <path d="M150 60 L160 70 L150 80" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 dark:text-gray-500" />
      <path d="M50 120 L40 130 L50 140" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 dark:text-gray-500" />
    </svg>
  ),
  'error': (
    <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <circle cx="100" cy="100" r="80" fill="currentColor" className="text-red-100 dark:text-red-900/30" />
      <circle cx="100" cy="100" r="50" fill="currentColor" className="text-red-200 dark:text-red-800/30" />
      <path d="M100 70 L100 110" stroke="currentColor" strokeWidth="8" strokeLinecap="round" className="text-red-500" />
      <circle cx="100" cy="125" r="5" fill="currentColor" className="text-red-500" />
    </svg>
  ),
  'locked': (
    <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <circle cx="100" cy="100" r="80" fill="currentColor" className="text-yellow-100 dark:text-yellow-900/30" />
      <rect x="65" y="90" width="70" height="55" rx="6" fill="currentColor" className="text-yellow-300 dark:text-yellow-700" />
      <path d="M75 90 V75 C75 61.193 86.193 50 100 50 C113.807 50 125 61.193 125 75 V90" stroke="currentColor" strokeWidth="8" strokeLinecap="round" className="text-yellow-400 dark:text-yellow-600" fill="none" />
      <circle cx="100" cy="115" r="8" fill="currentColor" className="text-yellow-500 dark:text-yellow-500" />
      <rect x="97" y="115" width="6" height="15" rx="2" fill="currentColor" className="text-yellow-500 dark:text-yellow-500" />
    </svg>
  ),
  'wallet': (
    <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <circle cx="100" cy="100" r="80" fill="currentColor" className="text-blue-100 dark:text-blue-900/30" />
      <rect x="45" y="70" width="110" height="70" rx="8" fill="currentColor" className="text-blue-200 dark:text-blue-800/50" />
      <rect x="45" y="70" width="110" height="20" fill="currentColor" className="text-blue-300 dark:text-blue-700" />
      <circle cx="130" cy="105" r="12" fill="currentColor" className="text-blue-400 dark:text-blue-600" />
      <circle cx="130" cy="105" r="6" fill="currentColor" className="text-blue-500 dark:text-blue-500" />
    </svg>
  ),
  'success': (
    <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <circle cx="100" cy="100" r="80" fill="currentColor" className="text-green-100 dark:text-green-900/30" />
      <circle cx="100" cy="100" r="50" fill="currentColor" className="text-green-200 dark:text-green-800/30" />
      <path d="M75 100 L90 115 L125 80" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" className="text-green-500" />
    </svg>
  ),
};

// =============================================================================
// EMPTY STATE COMPONENT
// =============================================================================

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  size = 'md',
  className = '',
  children,
}: EmptyStateProps) {
  const styles = sizeStyles[size];

  return (
    <div
      className={`
        flex flex-col items-center justify-center text-center
        ${styles.container}
        ${className}
      `}
    >
      {icon && (
        <div className={`${styles.icon} text-gray-400 dark:text-gray-500`}>
          {icon}
        </div>
      )}
      
      <h3 className={`${styles.title} text-gray-900 dark:text-white mb-2`}>
        {title}
      </h3>
      
      {description && (
        <p className={`${styles.description} text-gray-500 dark:text-gray-400 max-w-md mb-6`}>
          {description}
        </p>
      )}
      
      {(action || secondaryAction) && (
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {action}
          {secondaryAction}
        </div>
      )}
      
      {children}
    </div>
  );
}

// =============================================================================
// ILLUSTRATED EMPTY STATE
// =============================================================================

export function IllustratedEmptyState({
  illustration,
  title,
  description,
  action,
  secondaryAction,
  size = 'md',
  className = '',
  children,
}: IllustratedEmptyStateProps) {
  const styles = sizeStyles[size];

  return (
    <EmptyState
      icon={<div className={styles.icon}>{illustrations[illustration]}</div>}
      title={title}
      description={description}
      action={action}
      secondaryAction={secondaryAction}
      size={size}
      className={className}
    >
      {children}
    </EmptyState>
  );
}

// =============================================================================
// PRESET EMPTY STATES
// =============================================================================

interface PresetEmptyStateProps {
  action?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  size?: EmptyStateSize;
  className?: string;
}

export function NoPositionsEmptyState({ action, secondaryAction, size = 'md', className = '' }: PresetEmptyStateProps) {
  return (
    <IllustratedEmptyState
      illustration="no-positions"
      title="No Timelock Positions"
      description="You haven't created any timelock positions yet. Lock your tokens to start earning rewards."
      action={action}
      secondaryAction={secondaryAction}
      size={size}
      className={className}
    />
  );
}

export function NoResultsEmptyState({ action, secondaryAction, size = 'md', className = '' }: PresetEmptyStateProps) {
  return (
    <IllustratedEmptyState
      illustration="no-results"
      title="No Results Found"
      description="We couldn't find any results matching your search. Try adjusting your filters or search terms."
      action={action}
      secondaryAction={secondaryAction}
      size={size}
      className={className}
    />
  );
}

export function ErrorEmptyState({ 
  action, 
  secondaryAction, 
  size = 'md', 
  className = '',
  message = "Something went wrong. Please try again later."
}: PresetEmptyStateProps & { message?: string }) {
  return (
    <IllustratedEmptyState
      illustration="error"
      title="Oops! Something went wrong"
      description={message}
      action={action}
      secondaryAction={secondaryAction}
      size={size}
      className={className}
    />
  );
}

export function WalletNotConnectedEmptyState({ action, secondaryAction, size = 'md', className = '' }: PresetEmptyStateProps) {
  return (
    <IllustratedEmptyState
      illustration="wallet"
      title="Connect Your Wallet"
      description="Connect your Stacks wallet to view your positions, create timelocks, and manage your assets."
      action={action}
      secondaryAction={secondaryAction}
      size={size}
      className={className}
    />
  );
}

export function LockedPositionEmptyState({ 
  action, 
  secondaryAction, 
  size = 'md', 
  className = '',
  unlockDate
}: PresetEmptyStateProps & { unlockDate?: Date }) {
  const formattedDate = unlockDate ? unlockDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }) : 'the unlock date';

  return (
    <IllustratedEmptyState
      illustration="locked"
      title="Position Still Locked"
      description={`This position is currently locked. You'll be able to claim your tokens after ${formattedDate}.`}
      action={action}
      secondaryAction={secondaryAction}
      size={size}
      className={className}
    />
  );
}

export function SuccessEmptyState({ 
  action, 
  secondaryAction, 
  size = 'md', 
  className = '',
  title = "Success!",
  description = "Your action was completed successfully."
}: PresetEmptyStateProps & { title?: string; description?: string }) {
  return (
    <IllustratedEmptyState
      illustration="success"
      title={title}
      description={description}
      action={action}
      secondaryAction={secondaryAction}
      size={size}
      className={className}
    />
  );
}

// =============================================================================
// LOADING EMPTY STATE
// =============================================================================

interface LoadingEmptyStateProps {
  title?: string;
  description?: string;
  size?: EmptyStateSize;
  className?: string;
}

export function LoadingEmptyState({
  title = "Loading...",
  description,
  size = 'md',
  className = '',
}: LoadingEmptyStateProps) {
  const styles = sizeStyles[size];

  return (
    <div
      className={`
        flex flex-col items-center justify-center text-center
        ${styles.container}
        ${className}
      `}
    >
      <div className={`${styles.icon} mb-4`}>
        <svg
          className="animate-spin text-blue-600 dark:text-blue-400 w-full h-full"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      </div>
      
      <h3 className={`${styles.title} text-gray-900 dark:text-white mb-2`}>
        {title}
      </h3>
      
      {description && (
        <p className={`${styles.description} text-gray-500 dark:text-gray-400 max-w-md`}>
          {description}
        </p>
      )}
    </div>
  );
}

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

export default EmptyState;
