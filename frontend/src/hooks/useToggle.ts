'use client';

import { useState, useCallback, useRef, useMemo } from 'react';

// =============================================================================
// USE TOGGLE - Basic boolean toggle
// =============================================================================

/**
 * A simple hook to toggle between true and false.
 * 
 * @param initialValue - The initial boolean value (default: false)
 * @returns A tuple of [value, toggle, setValue]
 * 
 * @example
 * const [isOpen, toggleOpen, setOpen] = useToggle(false);
 * toggleOpen(); // Flips the value
 * setOpen(true); // Sets specific value
 */
export function useToggle(
  initialValue: boolean = false
): [boolean, () => void, (value: boolean) => void] {
  const [value, setValue] = useState(initialValue);

  const toggle = useCallback(() => {
    setValue(v => !v);
  }, []);

  return [value, toggle, setValue];
}

// =============================================================================
// USE TOGGLE EXTENDED - With additional controls
// =============================================================================

interface UseToggleExtendedReturn {
  value: boolean;
  toggle: () => void;
  setTrue: () => void;
  setFalse: () => void;
  setValue: (value: boolean) => void;
  reset: () => void;
}

/**
 * An extended toggle hook with more granular controls.
 * 
 * @param initialValue - The initial boolean value
 * @returns Object with toggle state and control functions
 */
export function useToggleExtended(
  initialValue: boolean = false
): UseToggleExtendedReturn {
  const [value, setValue] = useState(initialValue);

  const toggle = useCallback(() => setValue(v => !v), []);
  const setTrue = useCallback(() => setValue(true), []);
  const setFalse = useCallback(() => setValue(false), []);
  const reset = useCallback(() => setValue(initialValue), [initialValue]);

  return {
    value,
    toggle,
    setTrue,
    setFalse,
    setValue,
    reset,
  };
}

// =============================================================================
// USE MULTI TOGGLE - Toggle between multiple values
// =============================================================================

interface UseMultiToggleReturn<T> {
  value: T;
  toggle: () => void;
  setIndex: (index: number) => void;
  setValue: (value: T) => void;
  currentIndex: number;
  values: T[];
  next: () => void;
  prev: () => void;
  reset: () => void;
}

/**
 * Toggle between multiple values in a cycle.
 * 
 * @param values - Array of values to cycle through
 * @param initialIndex - Starting index (default: 0)
 * @returns Multi-toggle state and controls
 * 
 * @example
 * const { value, toggle, next, prev } = useMultiToggle(['off', 'low', 'medium', 'high']);
 * toggle(); // Cycles to next value
 */
export function useMultiToggle<T>(
  values: T[],
  initialIndex: number = 0
): UseMultiToggleReturn<T> {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const toggle = useCallback(() => {
    setCurrentIndex(i => (i + 1) % values.length);
  }, [values.length]);

  const next = useCallback(() => {
    setCurrentIndex(i => (i + 1) % values.length);
  }, [values.length]);

  const prev = useCallback(() => {
    setCurrentIndex(i => (i - 1 + values.length) % values.length);
  }, [values.length]);

  const setValue = useCallback(
    (value: T) => {
      const index = values.indexOf(value);
      if (index !== -1) {
        setCurrentIndex(index);
      }
    },
    [values]
  );

  const setIndex = useCallback(
    (index: number) => {
      if (index >= 0 && index < values.length) {
        setCurrentIndex(index);
      }
    },
    [values.length]
  );

  const reset = useCallback(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  return {
    value: values[currentIndex],
    toggle,
    setIndex,
    setValue,
    currentIndex,
    values,
    next,
    prev,
    reset,
  };
}

// =============================================================================
// USE TOGGLE WITH COUNT - Track toggle count
// =============================================================================

interface UseToggleWithCountReturn {
  value: boolean;
  toggle: () => void;
  setTrue: () => void;
  setFalse: () => void;
  toggleCount: number;
  trueCount: number;
  falseCount: number;
  reset: () => void;
  resetCount: () => void;
}

/**
 * A toggle hook that tracks how many times it's been toggled.
 * 
 * @param initialValue - The initial boolean value
 * @returns Toggle state with counts
 */
export function useToggleWithCount(
  initialValue: boolean = false
): UseToggleWithCountReturn {
  const [value, setValue] = useState(initialValue);
  const [toggleCount, setToggleCount] = useState(0);
  const [trueCount, setTrueCount] = useState(initialValue ? 1 : 0);
  const [falseCount, setFalseCount] = useState(initialValue ? 0 : 1);

  const toggle = useCallback(() => {
    setValue(v => {
      const newValue = !v;
      setToggleCount(c => c + 1);
      if (newValue) {
        setTrueCount(c => c + 1);
      } else {
        setFalseCount(c => c + 1);
      }
      return newValue;
    });
  }, []);

  const setTrue = useCallback(() => {
    setValue(v => {
      if (!v) {
        setToggleCount(c => c + 1);
        setTrueCount(c => c + 1);
      }
      return true;
    });
  }, []);

  const setFalse = useCallback(() => {
    setValue(v => {
      if (v) {
        setToggleCount(c => c + 1);
        setFalseCount(c => c + 1);
      }
      return false;
    });
  }, []);

  const reset = useCallback(() => {
    setValue(initialValue);
    setToggleCount(0);
    setTrueCount(initialValue ? 1 : 0);
    setFalseCount(initialValue ? 0 : 1);
  }, [initialValue]);

  const resetCount = useCallback(() => {
    setToggleCount(0);
    setTrueCount(value ? 1 : 0);
    setFalseCount(value ? 0 : 1);
  }, [value]);

  return {
    value,
    toggle,
    setTrue,
    setFalse,
    toggleCount,
    trueCount,
    falseCount,
    reset,
    resetCount,
  };
}

// =============================================================================
// USE TOGGLE DELAYED - Toggle with delay
// =============================================================================

interface UseToggleDelayedReturn {
  value: boolean;
  toggle: () => void;
  toggleDelayed: (delay: number) => void;
  setTrueDelayed: (delay: number) => void;
  setFalseDelayed: (delay: number) => void;
  cancelPending: () => void;
  isPending: boolean;
  setValue: (value: boolean) => void;
}

/**
 * A toggle hook that supports delayed toggles.
 * 
 * @param initialValue - The initial boolean value
 * @returns Toggle state with delayed controls
 */
export function useToggleDelayed(
  initialValue: boolean = false
): UseToggleDelayedReturn {
  const [value, setValue] = useState(initialValue);
  const [isPending, setIsPending] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const cancelPending = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      setIsPending(false);
    }
  }, []);

  const toggle = useCallback(() => {
    cancelPending();
    setValue(v => !v);
  }, [cancelPending]);

  const toggleDelayed = useCallback(
    (delay: number) => {
      cancelPending();
      setIsPending(true);
      timeoutRef.current = setTimeout(() => {
        setValue(v => !v);
        setIsPending(false);
      }, delay);
    },
    [cancelPending]
  );

  const setTrueDelayed = useCallback(
    (delay: number) => {
      cancelPending();
      setIsPending(true);
      timeoutRef.current = setTimeout(() => {
        setValue(true);
        setIsPending(false);
      }, delay);
    },
    [cancelPending]
  );

  const setFalseDelayed = useCallback(
    (delay: number) => {
      cancelPending();
      setIsPending(true);
      timeoutRef.current = setTimeout(() => {
        setValue(false);
        setIsPending(false);
      }, delay);
    },
    [cancelPending]
  );

  // Cleanup on unmount
  const setValueWrapper = useCallback(
    (newValue: boolean) => {
      cancelPending();
      setValue(newValue);
    },
    [cancelPending]
  );

  return {
    value,
    toggle,
    toggleDelayed,
    setTrueDelayed,
    setFalseDelayed,
    cancelPending,
    isPending,
    setValue: setValueWrapper,
  };
}

// =============================================================================
// USE TOGGLE SET - Manage a set of toggles
// =============================================================================

interface UseToggleSetReturn<T extends string> {
  values: Set<T>;
  has: (key: T) => boolean;
  toggle: (key: T) => void;
  add: (key: T) => void;
  remove: (key: T) => void;
  toggleAll: () => void;
  selectAll: () => void;
  clearAll: () => void;
  isAllSelected: boolean;
  selectedCount: number;
}

/**
 * Manage multiple toggles as a set.
 * 
 * @param allKeys - All possible keys in the set
 * @param initialSelected - Initially selected keys
 * @returns Set management functions
 * 
 * @example
 * const { has, toggle, toggleAll } = useToggleSet(['item1', 'item2', 'item3'], ['item1']);
 */
export function useToggleSet<T extends string>(
  allKeys: T[],
  initialSelected: T[] = []
): UseToggleSetReturn<T> {
  const [values, setValues] = useState<Set<T>>(new Set(initialSelected));

  const has = useCallback((key: T) => values.has(key), [values]);

  const toggle = useCallback((key: T) => {
    setValues(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const add = useCallback((key: T) => {
    setValues(prev => new Set([...prev, key]));
  }, []);

  const remove = useCallback((key: T) => {
    setValues(prev => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setValues(new Set(allKeys));
  }, [allKeys]);

  const clearAll = useCallback(() => {
    setValues(new Set());
  }, []);

  const toggleAll = useCallback(() => {
    setValues(prev => {
      if (prev.size === allKeys.length) {
        return new Set();
      }
      return new Set(allKeys);
    });
  }, [allKeys]);

  const isAllSelected = values.size === allKeys.length;
  const selectedCount = values.size;

  return {
    values,
    has,
    toggle,
    add,
    remove,
    toggleAll,
    selectAll,
    clearAll,
    isAllSelected,
    selectedCount,
  };
}

// =============================================================================
// TIMELOCK-SPECIFIC TOGGLES
// =============================================================================

/**
 * Toggle for UI panel visibility states common in TimeLock.
 */
export type PanelState = 'collapsed' | 'expanded' | 'minimized';

export function usePanelToggle(
  initialState: PanelState = 'collapsed'
): UseMultiToggleReturn<PanelState> {
  return useMultiToggle<PanelState>(
    ['collapsed', 'expanded', 'minimized'],
    ['collapsed', 'expanded', 'minimized'].indexOf(initialState)
  );
}

/**
 * Toggle for timelock view modes.
 */
export type ViewMode = 'list' | 'grid' | 'table';

export function useViewModeToggle(
  initialMode: ViewMode = 'list'
): UseMultiToggleReturn<ViewMode> {
  return useMultiToggle<ViewMode>(
    ['list', 'grid', 'table'],
    ['list', 'grid', 'table'].indexOf(initialMode)
  );
}

/**
 * Toggle for position filter states.
 */
export type PositionFilter = 'all' | 'active' | 'unlocked' | 'locked';

export function usePositionFilterToggle(
  initialFilter: PositionFilter = 'all'
): UseMultiToggleReturn<PositionFilter> {
  return useMultiToggle<PositionFilter>(
    ['all', 'active', 'unlocked', 'locked'],
    ['all', 'active', 'unlocked', 'locked'].indexOf(initialFilter)
  );
}

/**
 * Toggle for sort direction with sort field.
 */
interface UseSortToggleReturn<T extends string> {
  field: T;
  direction: 'asc' | 'desc';
  toggleDirection: () => void;
  setField: (field: T) => void;
  toggleField: (field: T) => void;
  reset: () => void;
}

export function useSortToggle<T extends string>(
  initialField: T,
  initialDirection: 'asc' | 'desc' = 'asc'
): UseSortToggleReturn<T> {
  const [field, setField] = useState<T>(initialField);
  const [direction, setDirection] = useState<'asc' | 'desc'>(initialDirection);

  const toggleDirection = useCallback(() => {
    setDirection(d => (d === 'asc' ? 'desc' : 'asc'));
  }, []);

  const toggleField = useCallback(
    (newField: T) => {
      if (newField === field) {
        toggleDirection();
      } else {
        setField(newField);
        setDirection('asc');
      }
    },
    [field, toggleDirection]
  );

  const reset = useCallback(() => {
    setField(initialField);
    setDirection(initialDirection);
  }, [initialField, initialDirection]);

  return {
    field,
    direction,
    toggleDirection,
    setField,
    toggleField,
    reset,
  };
}

/**
 * Theme toggle for light/dark mode.
 */
export function useThemeToggle(): {
  theme: 'light' | 'dark';
  toggle: () => void;
  setLight: () => void;
  setDark: () => void;
  isLight: boolean;
  isDark: boolean;
} {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const toggle = useCallback(() => {
    setTheme(t => (t === 'light' ? 'dark' : 'light'));
  }, []);

  const setLight = useCallback(() => setTheme('light'), []);
  const setDark = useCallback(() => setTheme('dark'), []);

  return {
    theme,
    toggle,
    setLight,
    setDark,
    isLight: theme === 'light',
    isDark: theme === 'dark',
  };
}

/**
 * Toggle for wallet advanced options visibility.
 */
export function useAdvancedOptionsToggle(): UseToggleExtendedReturn {
  return useToggleExtended(false);
}

/**
 * Toggle for showing/hiding sensitive balance information.
 */
export function useBalanceVisibilityToggle(
  initialVisible: boolean = true
): UseToggleExtendedReturn & { isHidden: boolean } {
  const toggle = useToggleExtended(initialVisible);

  return {
    ...toggle,
    isHidden: !toggle.value,
  };
}

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

export default useToggle;
