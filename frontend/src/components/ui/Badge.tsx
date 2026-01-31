'use client';

import { forwardRef, HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  removable?: boolean;
  onRemove?: () => void;
  icon?: ReactNode;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-gray-100 text-gray-700 border-gray-200',
  primary: 'bg-blue-100 text-blue-700 border-blue-200',
  success: 'bg-green-100 text-green-700 border-green-200',
  warning: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  danger: 'bg-red-100 text-red-700 border-red-200',
  info: 'bg-purple-100 text-purple-700 border-purple-200',
};

const dotColors: Record<BadgeVariant, string> = {
  default: 'bg-gray-500',
  primary: 'bg-blue-500',
  success: 'bg-green-500',
  warning: 'bg-yellow-500',
  danger: 'bg-red-500',
  info: 'bg-purple-500',
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
  lg: 'px-3 py-1.5 text-sm',
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      variant = 'default',
      size = 'md',
      dot = false,
      removable = false,
      onRemove,
      icon,
      className,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center gap-1.5 font-medium rounded-full border',
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {dot && (
          <span
            className={cn('w-1.5 h-1.5 rounded-full', dotColors[variant])}
            aria-hidden="true"
          />
        )}
        {icon && <span className="flex-shrink-0">{icon}</span>}
        {children}
        {removable && (
          <button
            type="button"
            onClick={onRemove}
            className="ml-0.5 -mr-1 p-0.5 rounded-full hover:bg-black/10 transition-colors"
            aria-label="Remove"
          >
            <svg
              className="w-3 h-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

// Status Badge for timelock positions
type StatusType = 'locked' | 'unlocked' | 'pending' | 'expired' | 'active';

const statusConfig: Record<StatusType, { variant: BadgeVariant; label: string }> = {
  locked: { variant: 'warning', label: 'Locked' },
  unlocked: { variant: 'success', label: 'Unlocked' },
  pending: { variant: 'info', label: 'Pending' },
  expired: { variant: 'danger', label: 'Expired' },
  active: { variant: 'primary', label: 'Active' },
};

interface StatusBadgeProps extends Omit<BadgeProps, 'variant'> {
  status: StatusType;
}

export const StatusBadge = forwardRef<HTMLSpanElement, StatusBadgeProps>(
  ({ status, ...props }, ref) => {
    const config = statusConfig[status];
    return (
      <Badge ref={ref} variant={config.variant} dot {...props}>
        {config.label}
      </Badge>
    );
  }
);

StatusBadge.displayName = 'StatusBadge';

// Notification Badge (count)
interface NotificationBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  count: number;
  max?: number;
  showZero?: boolean;
}

export const NotificationBadge = forwardRef<HTMLSpanElement, NotificationBadgeProps>(
  ({ count, max = 99, showZero = false, className, ...props }, ref) => {
    if (count === 0 && !showZero) return null;

    const displayCount = count > max ? `${max}+` : count;

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5',
          'text-xs font-bold text-white bg-red-500 rounded-full',
          className
        )}
        {...props}
      >
        {displayCount}
      </span>
    );
  }
);

NotificationBadge.displayName = 'NotificationBadge';
