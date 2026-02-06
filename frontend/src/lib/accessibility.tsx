'use client';

import React, { useCallback, useEffect, useRef } from 'react';

/**
 * Hook for managing focus trap within a component (e.g., modals)
 */
export function useFocusTrap(isActive: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Focus first element on mount
    firstElement?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [isActive]);

  return containerRef;
}

/**
 * Hook for keyboard navigation in lists
 */
export function useKeyboardNavigation<T>(
  items: T[],
  onSelect: (item: T) => void,
  options: { loop?: boolean; orientation?: 'vertical' | 'horizontal' } = {}
) {
  const { loop = true, orientation = 'vertical' } = options;
  const [activeIndex, setActiveIndex] = React.useState(-1);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const prevKey = orientation === 'vertical' ? 'ArrowUp' : 'ArrowLeft';
      const nextKey = orientation === 'vertical' ? 'ArrowDown' : 'ArrowRight';

      switch (e.key) {
        case prevKey:
          e.preventDefault();
          setActiveIndex((prev) => {
            if (prev <= 0) return loop ? items.length - 1 : 0;
            return prev - 1;
          });
          break;
        case nextKey:
          e.preventDefault();
          setActiveIndex((prev) => {
            if (prev >= items.length - 1) return loop ? 0 : items.length - 1;
            return prev + 1;
          });
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          if (activeIndex >= 0 && items[activeIndex]) {
            onSelect(items[activeIndex]);
          }
          break;
        case 'Home':
          e.preventDefault();
          setActiveIndex(0);
          break;
        case 'End':
          e.preventDefault();
          setActiveIndex(items.length - 1);
          break;
      }
    },
    [items, activeIndex, loop, orientation, onSelect]
  );

  return { activeIndex, setActiveIndex, handleKeyDown };
}

/**
 * Skip link component for keyboard navigation
 */
export function SkipLink({ href = '#main-content', children = 'Skip to main content' }) {
  return (
    <a
      href={href}
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg focus:outline-none"
    >
      {children}
    </a>
  );
}

/**
 * Live region for screen reader announcements
 */
export function LiveRegion({
  message,
  politeness = 'polite',
  atomic = true,
}: {
  message: string;
  politeness?: 'polite' | 'assertive';
  atomic?: boolean;
}) {
  return (
    <div
      role="status"
      aria-live={politeness}
      aria-atomic={atomic}
      className="sr-only"
    >
      {message}
    </div>
  );
}

/**
 * Hook for live announcements
 */
export function useAnnounce() {
  const [message, setMessage] = React.useState('');
  const timeoutRef = useRef<NodeJS.Timeout>();

  const announce = useCallback((text: string, duration = 1000) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setMessage(text);
    timeoutRef.current = setTimeout(() => setMessage(''), duration);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const LiveRegionComponent = () => <LiveRegion message={message} />;

  return { announce, LiveRegionComponent };
}

/**
 * Visually hidden content (for screen readers only)
 */
export function VisuallyHidden({ children }: { children: React.ReactNode }) {
  return <span className="sr-only">{children}</span>;
}

/**
 * Focus visible only on keyboard navigation
 */
export function useFocusVisible() {
  const [isFocusVisible, setIsFocusVisible] = React.useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleFocus = () => {
      // Check if the focus was triggered by keyboard
      if (document.body.dataset.keyboardNav === 'true') {
        setIsFocusVisible(true);
      }
    };

    const handleBlur = () => {
      setIsFocusVisible(false);
    };

    element.addEventListener('focus', handleFocus);
    element.addEventListener('blur', handleBlur);

    return () => {
      element.removeEventListener('focus', handleFocus);
      element.removeEventListener('blur', handleBlur);
    };
  }, []);

  return { ref, isFocusVisible };
}

/**
 * Keyboard navigation tracker (add to layout)
 */
export function KeyboardNavTracker() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        document.body.dataset.keyboardNav = 'true';
      }
    };

    const handleMouseDown = () => {
      document.body.dataset.keyboardNav = 'false';
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);

  return null;
}

/**
 * Accessible icon button
 */
interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  label: string;
}

export function IconButton({ icon, label, ...props }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      {...props}
    >
      {icon}
      <VisuallyHidden>{label}</VisuallyHidden>
    </button>
  );
}

/**
 * Format number for screen readers
 */
export function formatForScreenReader(amount: bigint | number, unit = 'STX'): string {
  const num = typeof amount === 'bigint' ? Number(amount) / 1_000_000 : amount;
  return `${num.toLocaleString()} ${unit}`;
}

/**
 * Format time for screen readers
 */
export function formatTimeForScreenReader(seconds: number): string {
  if (seconds <= 0) return 'Ready to unlock';
  
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);
  if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
  if (minutes > 0) parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);

  return parts.join(', ') || 'Less than a minute';
}

export default useFocusTrap;
