'use client';

import React from 'react';

// =============================================================================
// TYPES
// =============================================================================

type ProgressVariant = 'default' | 'success' | 'warning' | 'error' | 'info';
type ProgressSize = 'xs' | 'sm' | 'md' | 'lg';

interface ProgressProps {
  value: number;
  max?: number;
  variant?: ProgressVariant;
  size?: ProgressSize;
  showLabel?: boolean;
  labelPosition?: 'inside' | 'outside' | 'top';
  animated?: boolean;
  striped?: boolean;
  className?: string;
  'aria-label'?: string;
}

interface CircularProgressProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  variant?: ProgressVariant;
  showLabel?: boolean;
  className?: string;
  'aria-label'?: string;
}

interface StepProgressProps {
  currentStep: number;
  totalSteps: number;
  labels?: string[];
  variant?: ProgressVariant;
  className?: string;
}

interface MultiProgressProps {
  segments: Array<{
    value: number;
    variant?: ProgressVariant;
    label?: string;
  }>;
  max?: number;
  size?: ProgressSize;
  showLabels?: boolean;
  className?: string;
}

// =============================================================================
// STYLES
// =============================================================================

const variantStyles: Record<ProgressVariant, string> = {
  default: 'bg-blue-600',
  success: 'bg-green-600',
  warning: 'bg-yellow-500',
  error: 'bg-red-600',
  info: 'bg-cyan-500',
};

const trackStyles = 'bg-gray-200 dark:bg-gray-700';

const sizeStyles: Record<ProgressSize, string> = {
  xs: 'h-1',
  sm: 'h-2',
  md: 'h-3',
  lg: 'h-4',
};

// =============================================================================
// PROGRESS BAR COMPONENT
// =============================================================================

export function Progress({
  value,
  max = 100,
  variant = 'default',
  size = 'md',
  showLabel = false,
  labelPosition = 'outside',
  animated = false,
  striped = false,
  className = '',
  'aria-label': ariaLabel,
}: ProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  
  const stripedClass = striped
    ? 'bg-stripes bg-[length:1rem_1rem]'
    : '';
  
  const animatedClass = animated
    ? 'animate-pulse'
    : '';

  const stripedAnimatedClass = striped && animated
    ? 'animate-stripes'
    : '';

  return (
    <div className={`w-full ${className}`}>
      {showLabel && labelPosition === 'top' && (
        <div className="flex justify-between mb-1 text-sm">
          <span className="text-gray-700 dark:text-gray-300">Progress</span>
          <span className="text-gray-600 dark:text-gray-400">{Math.round(percentage)}%</span>
        </div>
      )}
      
      <div className="flex items-center gap-3">
        <div
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
          aria-label={ariaLabel || `Progress: ${Math.round(percentage)}%`}
          className={`
            relative w-full overflow-hidden rounded-full
            ${trackStyles}
            ${sizeStyles[size]}
          `}
        >
          <div
            className={`
              h-full rounded-full transition-all duration-500 ease-out
              ${variantStyles[variant]}
              ${stripedClass}
              ${animatedClass}
              ${stripedAnimatedClass}
            `}
            style={{ width: `${percentage}%` }}
          >
            {showLabel && labelPosition === 'inside' && size !== 'xs' && size !== 'sm' && (
              <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">
                {Math.round(percentage)}%
              </span>
            )}
          </div>
        </div>
        
        {showLabel && labelPosition === 'outside' && (
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[3rem] text-right">
            {Math.round(percentage)}%
          </span>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// CIRCULAR PROGRESS COMPONENT
// =============================================================================

export function CircularProgress({
  value,
  max = 100,
  size = 120,
  strokeWidth = 8,
  variant = 'default',
  showLabel = true,
  className = '',
  'aria-label': ariaLabel,
}: CircularProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  const colorMap: Record<ProgressVariant, string> = {
    default: 'stroke-blue-600',
    success: 'stroke-green-600',
    warning: 'stroke-yellow-500',
    error: 'stroke-red-600',
    info: 'stroke-cyan-500',
  };

  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={ariaLabel || `Progress: ${Math.round(percentage)}%`}
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        className="transform -rotate-90"
        width={size}
        height={size}
      >
        {/* Background circle */}
        <circle
          className="stroke-gray-200 dark:stroke-gray-700"
          strokeWidth={strokeWidth}
          fill="none"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        {/* Progress circle */}
        <circle
          className={`${colorMap[variant]} transition-all duration-500 ease-out`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: offset,
          }}
        />
      </svg>
      
      {showLabel && (
        <span className="absolute text-lg font-semibold text-gray-700 dark:text-gray-300">
          {Math.round(percentage)}%
        </span>
      )}
    </div>
  );
}

// =============================================================================
// STEP PROGRESS COMPONENT
// =============================================================================

export function StepProgress({
  currentStep,
  totalSteps,
  labels = [],
  variant = 'default',
  className = '',
}: StepProgressProps) {
  const steps = Array.from({ length: totalSteps }, (_, i) => i + 1);

  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = step < currentStep;
          const isCurrent = step === currentStep;
          const isLast = index === steps.length - 1;

          return (
            <React.Fragment key={step}>
              {/* Step circle */}
              <div className="flex flex-col items-center">
                <div
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center
                    font-semibold text-sm transition-all duration-300
                    ${isCompleted
                      ? `${variantStyles[variant]} text-white`
                      : isCurrent
                        ? `ring-2 ring-offset-2 ${variantStyles[variant].replace('bg-', 'ring-')} bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300`
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                    }
                  `}
                >
                  {isCompleted ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    step
                  )}
                </div>
                
                {/* Label */}
                {labels[index] && (
                  <span className={`
                    mt-2 text-xs font-medium text-center max-w-[80px]
                    ${isCurrent || isCompleted
                      ? 'text-gray-700 dark:text-gray-300'
                      : 'text-gray-500 dark:text-gray-400'
                    }
                  `}>
                    {labels[index]}
                  </span>
                )}
              </div>

              {/* Connector line */}
              {!isLast && (
                <div className="flex-1 mx-2">
                  <div
                    className={`
                      h-1 rounded-full transition-all duration-300
                      ${isCompleted
                        ? variantStyles[variant]
                        : 'bg-gray-200 dark:bg-gray-700'
                      }
                    `}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

// =============================================================================
// MULTI-SEGMENT PROGRESS COMPONENT
// =============================================================================

export function MultiProgress({
  segments,
  max = 100,
  size = 'md',
  showLabels = false,
  className = '',
}: MultiProgressProps) {
  const total = segments.reduce((sum, seg) => sum + seg.value, 0);
  const normalizedMax = max || total;

  return (
    <div className={`w-full ${className}`}>
      <div
        role="progressbar"
        aria-valuenow={total}
        aria-valuemin={0}
        aria-valuemax={normalizedMax}
        className={`
          relative w-full overflow-hidden rounded-full flex
          ${trackStyles}
          ${sizeStyles[size]}
        `}
      >
        {segments.map((segment, index) => {
          const percentage = (segment.value / normalizedMax) * 100;
          return (
            <div
              key={index}
              className={`
                h-full transition-all duration-500 ease-out
                ${variantStyles[segment.variant || 'default']}
                ${index === 0 ? 'rounded-l-full' : ''}
                ${index === segments.length - 1 ? 'rounded-r-full' : ''}
              `}
              style={{ width: `${percentage}%` }}
              title={segment.label || `${Math.round(percentage)}%`}
            />
          );
        })}
      </div>
      
      {showLabels && (
        <div className="flex flex-wrap gap-4 mt-2">
          {segments.map((segment, index) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div className={`w-3 h-3 rounded-full ${variantStyles[segment.variant || 'default']}`} />
              <span className="text-gray-600 dark:text-gray-400">
                {segment.label || `Segment ${index + 1}`}: {segment.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// TIMELOCK PROGRESS COMPONENT (Domain-Specific)
// =============================================================================

interface TimelockProgressProps {
  startTime: Date;
  endTime: Date;
  currentTime?: Date;
  showTimeRemaining?: boolean;
  className?: string;
}

export function TimelockProgress({
  startTime,
  endTime,
  currentTime = new Date(),
  showTimeRemaining = true,
  className = '',
}: TimelockProgressProps) {
  const totalDuration = endTime.getTime() - startTime.getTime();
  const elapsed = currentTime.getTime() - startTime.getTime();
  const percentage = Math.min(Math.max((elapsed / totalDuration) * 100, 0), 100);
  
  const remaining = endTime.getTime() - currentTime.getTime();
  const isComplete = remaining <= 0;
  
  const formatTimeRemaining = (ms: number): string => {
    if (ms <= 0) return 'Complete';
    
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h remaining`;
    if (hours > 0) return `${hours}h ${minutes % 60}m remaining`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s remaining`;
    return `${seconds}s remaining`;
  };

  const variant: ProgressVariant = isComplete ? 'success' : percentage > 75 ? 'warning' : 'default';

  return (
    <div className={`w-full ${className}`}>
      <div className="flex justify-between mb-1 text-sm">
        <span className="text-gray-600 dark:text-gray-400">
          {isComplete ? 'Unlocked' : 'Time Lock Progress'}
        </span>
        {showTimeRemaining && (
          <span className={`font-medium ${isComplete ? 'text-green-600' : 'text-gray-700 dark:text-gray-300'}`}>
            {formatTimeRemaining(remaining)}
          </span>
        )}
      </div>
      
      <Progress
        value={percentage}
        max={100}
        variant={variant}
        size="md"
        animated={!isComplete}
        striped={!isComplete}
      />
      
      <div className="flex justify-between mt-1 text-xs text-gray-500 dark:text-gray-400">
        <span>{startTime.toLocaleDateString()}</span>
        <span>{endTime.toLocaleDateString()}</span>
      </div>
    </div>
  );
}

// =============================================================================
// INDETERMINATE PROGRESS COMPONENT
// =============================================================================

interface IndeterminateProgressProps {
  variant?: ProgressVariant;
  size?: ProgressSize;
  className?: string;
  'aria-label'?: string;
}

export function IndeterminateProgress({
  variant = 'default',
  size = 'md',
  className = '',
  'aria-label': ariaLabel = 'Loading...',
}: IndeterminateProgressProps) {
  return (
    <div
      role="progressbar"
      aria-label={ariaLabel}
      className={`
        relative w-full overflow-hidden rounded-full
        ${trackStyles}
        ${sizeStyles[size]}
        ${className}
      `}
    >
      <div
        className={`
          absolute h-full w-1/3 rounded-full
          ${variantStyles[variant]}
          animate-indeterminate
        `}
      />
    </div>
  );
}

// =============================================================================
// CSS FOR ANIMATIONS (Add to global CSS)
// =============================================================================

/*
Add these to your global CSS file:

@keyframes stripes {
  from {
    background-position: 1rem 0;
  }
  to {
    background-position: 0 0;
  }
}

@keyframes indeterminate {
  0% {
    left: -33%;
  }
  100% {
    left: 100%;
  }
}

.animate-stripes {
  animation: stripes 1s linear infinite;
}

.animate-indeterminate {
  animation: indeterminate 1.5s ease-in-out infinite;
}

.bg-stripes {
  background-image: linear-gradient(
    45deg,
    rgba(255, 255, 255, 0.15) 25%,
    transparent 25%,
    transparent 50%,
    rgba(255, 255, 255, 0.15) 50%,
    rgba(255, 255, 255, 0.15) 75%,
    transparent 75%,
    transparent
  );
}
*/

export default Progress;
