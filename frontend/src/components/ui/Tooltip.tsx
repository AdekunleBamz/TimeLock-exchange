'use client';

import React, { useState, useRef, useEffect, ReactNode, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right';
type TooltipVariant = 'default' | 'light' | 'error' | 'success' | 'warning';

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  placement?: TooltipPlacement;
  variant?: TooltipVariant;
  delay?: number;
  className?: string;
  disabled?: boolean;
  showArrow?: boolean;
  maxWidth?: number;
}

const variantStyles: Record<TooltipVariant, string> = {
  default: 'bg-gray-900 text-white',
  light: 'bg-white text-gray-900 border border-gray-200 shadow-lg',
  error: 'bg-red-600 text-white',
  success: 'bg-green-600 text-white',
  warning: 'bg-yellow-500 text-gray-900',
};

const arrowStyles: Record<TooltipVariant, string> = {
  default: 'border-gray-900',
  light: 'border-white',
  error: 'border-red-600',
  success: 'border-green-600',
  warning: 'border-yellow-500',
};

const placementStyles: Record<TooltipPlacement, string> = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
};

const arrowPlacementStyles: Record<TooltipPlacement, string> = {
  top: 'top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent',
  bottom: 'bottom-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent',
  left: 'left-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent',
  right: 'right-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent',
};

export function Tooltip({
  content,
  children,
  placement = 'top',
  variant = 'default',
  delay = 200,
  className,
  disabled = false,
  showArrow = true,
  maxWidth = 250,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const calculatePosition = useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;

    let top = 0;
    let left = 0;

    switch (placement) {
      case 'top':
        top = triggerRect.top + scrollY - tooltipRect.height - 8;
        left = triggerRect.left + scrollX + triggerRect.width / 2 - tooltipRect.width / 2;
        break;
      case 'bottom':
        top = triggerRect.bottom + scrollY + 8;
        left = triggerRect.left + scrollX + triggerRect.width / 2 - tooltipRect.width / 2;
        break;
      case 'left':
        top = triggerRect.top + scrollY + triggerRect.height / 2 - tooltipRect.height / 2;
        left = triggerRect.left + scrollX - tooltipRect.width - 8;
        break;
      case 'right':
        top = triggerRect.top + scrollY + triggerRect.height / 2 - tooltipRect.height / 2;
        left = triggerRect.right + scrollX + 8;
        break;
    }

    // Clamp to viewport
    const padding = 8;
    left = Math.max(padding, Math.min(left, window.innerWidth - tooltipRect.width - padding));
    top = Math.max(padding, Math.min(top, window.innerHeight + scrollY - tooltipRect.height - padding));

    setPosition({ top, left });
  }, [placement]);

  useEffect(() => {
    if (isVisible) {
      calculatePosition();
      window.addEventListener('scroll', calculatePosition);
      window.addEventListener('resize', calculatePosition);
    }
    return () => {
      window.removeEventListener('scroll', calculatePosition);
      window.removeEventListener('resize', calculatePosition);
    };
  }, [isVisible, calculatePosition]);

  const showTooltip = () => {
    if (disabled) return;
    timeoutRef.current = setTimeout(() => setIsVisible(true), delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        className="inline-block"
      >
        {children}
      </div>
      {isVisible &&
        typeof window !== 'undefined' &&
        createPortal(
          <div
            ref={tooltipRef}
            role="tooltip"
            style={{
              position: 'absolute',
              top: position.top,
              left: position.left,
              maxWidth,
              zIndex: 9999,
            }}
            className={cn(
              'px-3 py-2 text-sm rounded-lg transition-opacity duration-150',
              variantStyles[variant],
              className
            )}
          >
            {content}
            {showArrow && (
              <span
                className={cn(
                  'absolute w-0 h-0 border-4',
                  arrowStyles[variant],
                  arrowPlacementStyles[placement]
                )}
              />
            )}
          </div>,
          document.body
        )}
    </>
  );
}

// Info tooltip with icon
interface InfoTooltipProps {
  content: ReactNode;
  iconSize?: number;
}

export function InfoTooltip({ content, iconSize = 16 }: InfoTooltipProps) {
  return (
    <Tooltip content={content} placement="top">
      <span className="inline-flex items-center justify-center text-gray-400 hover:text-gray-600 cursor-help">
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4" />
          <path d="M12 8h.01" />
        </svg>
      </span>
    </Tooltip>
  );
}

export default Tooltip;
