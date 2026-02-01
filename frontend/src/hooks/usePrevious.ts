'use client';

import { useRef, useEffect, useState, useCallback } from 'react';

// =============================================================================
// USE PREVIOUS - Basic previous value tracking
// =============================================================================

/**
 * Returns the previous value of the given value.
 * On the first render, returns undefined.
 * 
 * @param value - The value to track
 * @returns The previous value
 * 
 * @example
 * const [count, setCount] = useState(0);
 * const prevCount = usePrevious(count);
 * // prevCount is undefined on first render, then tracks previous count
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}

// =============================================================================
// USE PREVIOUS DEFINED - Tracks only defined values
// =============================================================================

/**
 * Returns the previous defined value, ignoring undefined values.
 * Useful when a value might temporarily become undefined.
 * 
 * @param value - The value to track
 * @returns The previous defined value
 */
export function usePreviousDefined<T>(value: T | undefined): T | undefined {
  const ref = useRef<T | undefined>(undefined);

  useEffect(() => {
    if (value !== undefined) {
      ref.current = value;
    }
  }, [value]);

  return ref.current;
}

// =============================================================================
// USE PREVIOUS DISTINCT - Tracks only when value changes
// =============================================================================

/**
 * Returns the previous distinct value. Only updates when the value
 * is different from the current value using strict equality.
 * 
 * @param value - The value to track
 * @param isEqual - Optional custom equality function
 * @returns The previous distinct value
 */
export function usePreviousDistinct<T>(
  value: T,
  isEqual: (prev: T, next: T) => boolean = (a, b) => a === b
): T | undefined {
  const prevRef = useRef<T | undefined>(undefined);
  const currentRef = useRef<T>(value);

  if (!isEqual(currentRef.current, value)) {
    prevRef.current = currentRef.current;
    currentRef.current = value;
  }

  return prevRef.current;
}

// =============================================================================
// USE PREVIOUS WITH INITIAL - Returns initial value instead of undefined
// =============================================================================

/**
 * Returns the previous value with an initial value fallback.
 * 
 * @param value - The value to track
 * @param initialValue - The initial value to return on first render
 * @returns The previous value or initial value
 */
export function usePreviousWithInitial<T>(value: T, initialValue: T): T {
  const ref = useRef<T>(initialValue);

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}

// =============================================================================
// USE PREVIOUS HISTORY - Maintains a history of values
// =============================================================================

interface UsePreviousHistoryReturn<T> {
  history: T[];
  previous: T | undefined;
  oldest: T | undefined;
  clear: () => void;
}

/**
 * Maintains a history of previous values.
 * 
 * @param value - The value to track
 * @param maxHistory - Maximum number of values to keep in history
 * @returns History array and helper methods
 */
export function usePreviousHistory<T>(
  value: T,
  maxHistory: number = 10
): UsePreviousHistoryReturn<T> {
  const [history, setHistory] = useState<T[]>([]);

  useEffect(() => {
    setHistory(prev => {
      const newHistory = [value, ...prev];
      return newHistory.slice(0, maxHistory);
    });
  }, [value, maxHistory]);

  const clear = useCallback(() => {
    setHistory([value]);
  }, [value]);

  return {
    history: history.slice(1), // Exclude current value
    previous: history[1],
    oldest: history[history.length - 1] || undefined,
    clear,
  };
}

// =============================================================================
// USE PREVIOUS COMPARE - Compare current with previous
// =============================================================================

interface UsePreviousCompareReturn<T> {
  previous: T | undefined;
  hasChanged: boolean;
  changedFrom: T | undefined;
  changedTo: T;
}

/**
 * Returns the previous value along with comparison info.
 * 
 * @param value - The value to track
 * @param isEqual - Optional custom equality function
 * @returns Previous value and comparison metadata
 */
export function usePreviousCompare<T>(
  value: T,
  isEqual: (prev: T | undefined, next: T) => boolean = (a, b) => a === b
): UsePreviousCompareReturn<T> {
  const prevRef = useRef<T | undefined>(undefined);
  const [comparison, setComparison] = useState<UsePreviousCompareReturn<T>>({
    previous: undefined,
    hasChanged: true,
    changedFrom: undefined,
    changedTo: value,
  });

  useEffect(() => {
    const hasChanged = !isEqual(prevRef.current, value);
    
    setComparison({
      previous: prevRef.current,
      hasChanged,
      changedFrom: hasChanged ? prevRef.current : undefined,
      changedTo: value,
    });

    prevRef.current = value;
  }, [value, isEqual]);

  return comparison;
}

// =============================================================================
// USE PREVIOUS ON CHANGE - Callback when value changes
// =============================================================================

/**
 * Calls a callback when the value changes, providing both old and new values.
 * 
 * @param value - The value to track
 * @param onChange - Callback called with (newValue, oldValue) when value changes
 */
export function usePreviousOnChange<T>(
  value: T,
  onChange: (newValue: T, oldValue: T | undefined) => void
): void {
  const prevRef = useRef<T | undefined>(undefined);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      prevRef.current = value;
      return;
    }

    if (prevRef.current !== value) {
      onChange(value, prevRef.current);
      prevRef.current = value;
    }
  }, [value, onChange]);
}

// =============================================================================
// USE PREVIOUS STATE - Full state tracking with multiple values
// =============================================================================

interface UsePreviousStateReturn<T> {
  current: T;
  previous: T | undefined;
  initial: T;
  hasChanged: boolean;
  changesCount: number;
  isInitialValue: boolean;
}

/**
 * Comprehensive state tracking that maintains current, previous, and initial values.
 * 
 * @param value - The value to track
 * @param isEqual - Optional custom equality function
 * @returns Full state tracking object
 */
export function usePreviousState<T>(
  value: T,
  isEqual: (a: T, b: T) => boolean = (a, b) => a === b
): UsePreviousStateReturn<T> {
  const initialRef = useRef<T>(value);
  const prevRef = useRef<T | undefined>(undefined);
  const changesCountRef = useRef(0);

  const hasChanged = prevRef.current !== undefined && !isEqual(prevRef.current, value);
  const isInitialValue = isEqual(value, initialRef.current);

  if (hasChanged) {
    changesCountRef.current++;
  }

  useEffect(() => {
    prevRef.current = value;
  }, [value]);

  return {
    current: value,
    previous: prevRef.current,
    initial: initialRef.current,
    hasChanged,
    changesCount: changesCountRef.current,
    isInitialValue,
  };
}

// =============================================================================
// USE PREVIOUS DEEP - Deep comparison for objects/arrays
// =============================================================================

/**
 * Deep comparison function for objects and arrays.
 */
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  
  if (typeof a !== typeof b) return false;
  
  if (a === null || b === null) return a === b;
  
  if (typeof a !== 'object') return a === b;
  
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, index) => deepEqual(item, b[index]));
  }
  
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  
  const aObj = a as Record<string, unknown>;
  const bObj = b as Record<string, unknown>;
  
  const aKeys = Object.keys(aObj);
  const bKeys = Object.keys(bObj);
  
  if (aKeys.length !== bKeys.length) return false;
  
  return aKeys.every(key => deepEqual(aObj[key], bObj[key]));
}

/**
 * Returns the previous value using deep equality comparison for objects/arrays.
 * Only stores the previous value when the deep comparison shows a change.
 * 
 * @param value - The object or array to track
 * @returns The previous value (deep compared)
 */
export function usePreviousDeep<T>(value: T): T | undefined {
  return usePreviousDistinct(value, deepEqual);
}

// =============================================================================
// USE PREVIOUS DEBOUNCED - Debounced previous value
// =============================================================================

/**
 * Returns the previous value with a debounce delay.
 * Useful when you want to track the previous value only after changes settle.
 * 
 * @param value - The value to track
 * @param delay - Debounce delay in milliseconds
 * @returns The debounced previous value
 */
export function usePreviousDebounced<T>(value: T, delay: number = 300): T | undefined {
  const [debouncedPrev, setDebouncedPrev] = useState<T | undefined>(undefined);
  const currentRef = useRef<T>(value);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setDebouncedPrev(currentRef.current);
      currentRef.current = value;
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, delay]);

  return debouncedPrev;
}

// =============================================================================
// TIMELOCK-SPECIFIC HOOKS
// =============================================================================

/**
 * Track previous position state for detecting changes in timelock positions.
 */
export interface TimelockPositionState {
  id: string;
  amount: string;
  unlockTime: number;
  isUnlocked: boolean;
}

export function usePreviousPosition(
  position: TimelockPositionState | null
): TimelockPositionState | null | undefined {
  return usePreviousDistinct(position, (prev, next) => {
    if (prev === next) return true;
    if (!prev || !next) return prev === next;
    return (
      prev.id === next.id &&
      prev.amount === next.amount &&
      prev.unlockTime === next.unlockTime &&
      prev.isUnlocked === next.isUnlocked
    );
  });
}

/**
 * Track wallet connection state changes.
 */
export function usePreviousWalletState(
  isConnected: boolean
): {
  previous: boolean | undefined;
  justConnected: boolean;
  justDisconnected: boolean;
} {
  const previous = usePrevious(isConnected);

  return {
    previous,
    justConnected: previous === false && isConnected === true,
    justDisconnected: previous === true && isConnected === false,
  };
}

/**
 * Track transaction status changes for UI updates.
 */
export type TransactionStatus = 'idle' | 'pending' | 'success' | 'error';

export function usePreviousTransactionStatus(
  status: TransactionStatus
): {
  previous: TransactionStatus | undefined;
  justSucceeded: boolean;
  justFailed: boolean;
  justStarted: boolean;
} {
  const previous = usePrevious(status);

  return {
    previous,
    justSucceeded: previous === 'pending' && status === 'success',
    justFailed: previous === 'pending' && status === 'error',
    justStarted: previous === 'idle' && status === 'pending',
  };
}

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

export default usePrevious;
