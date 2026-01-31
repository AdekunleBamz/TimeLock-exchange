'use client';

import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
}

/**
 * Skeleton loading placeholder component
 * Provides visual feedback while content is loading
 */
export function Skeleton({
  className,
  variant = 'text',
  width,
  height,
  animation = 'pulse',
}: SkeletonProps) {
  const baseStyles = 'bg-gray-200 dark:bg-gray-700';
  
  const variantStyles = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-none',
    rounded: 'rounded-lg',
  };

  const animationStyles = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]',
    none: '',
  };

  const style: React.CSSProperties = {
    width: width ?? (variant === 'text' ? '100%' : undefined),
    height: height ?? (variant === 'text' ? '1em' : undefined),
  };

  return (
    <div
      className={cn(
        baseStyles,
        variantStyles[variant],
        animationStyles[animation],
        className
      )}
      style={style}
      role="status"
      aria-label="Loading..."
    />
  );
}

/**
 * Skeleton for card layouts
 */
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('bg-white rounded-lg shadow-md p-6', className)}>
      <Skeleton variant="text" height={24} width="60%" className="mb-4" />
      <Skeleton variant="text" height={16} className="mb-2" />
      <Skeleton variant="text" height={16} className="mb-2" />
      <Skeleton variant="text" height={16} width="80%" />
    </div>
  );
}

/**
 * Skeleton for position list items
 */
export function PositionSkeleton() {
  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <Skeleton variant="text" height={20} width="40%" className="mb-2" />
          <Skeleton variant="text" height={16} width="60%" className="mb-1" />
          <Skeleton variant="text" height={14} width="50%" />
        </div>
        <Skeleton variant="rounded" width={80} height={24} />
      </div>
    </div>
  );
}

/**
 * Skeleton for stats cards
 */
export function StatsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-white rounded-lg shadow-md p-6">
          <Skeleton variant="text" height={14} width="50%" className="mb-2" />
          <Skeleton variant="text" height={32} width="70%" />
        </div>
      ))}
    </div>
  );
}
