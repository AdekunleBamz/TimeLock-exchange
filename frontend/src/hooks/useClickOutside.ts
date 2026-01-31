'use client';

import { useEffect, useRef, RefObject, useCallback } from 'react';

type EventType = MouseEvent | TouchEvent;

/**
 * Hook that triggers a callback when clicking outside of the specified element
 * @param callback - Function to call when clicking outside
 * @param enabled - Whether the hook is enabled (default: true)
 * @returns Ref to attach to the element
 */
export function useClickOutside<T extends HTMLElement = HTMLElement>(
  callback: (event: EventType) => void,
  enabled: boolean = true
): RefObject<T | null> {
  const ref = useRef<T | null>(null);
  const callbackRef = useRef(callback);

  // Update callback ref on each render
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) return;

    const handleClick = (event: EventType) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        callbackRef.current(event);
      }
    };

    // Use mousedown/touchstart for faster response
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('touchstart', handleClick);

    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('touchstart', handleClick);
    };
  }, [enabled]);

  return ref;
}

/**
 * Hook that triggers a callback when clicking outside of multiple elements
 * @param callback - Function to call when clicking outside
 * @param refs - Array of refs to check
 * @param enabled - Whether the hook is enabled
 */
export function useClickOutsideMultiple(
  callback: (event: EventType) => void,
  refs: RefObject<HTMLElement | null>[],
  enabled: boolean = true
): void {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) return;

    const handleClick = (event: EventType) => {
      const target = event.target as Node;
      const isOutside = refs.every(
        (ref) => ref.current && !ref.current.contains(target)
      );
      
      if (isOutside) {
        callbackRef.current(event);
      }
    };

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('touchstart', handleClick);

    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('touchstart', handleClick);
    };
  }, [enabled, refs]);
}

/**
 * Hook for detecting escape key press
 * @param callback - Function to call when escape is pressed
 * @param enabled - Whether the hook is enabled
 */
export function useEscapeKey(
  callback: () => void,
  enabled: boolean = true
): void {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        callbackRef.current();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled]);
}

/**
 * Combined hook for click outside and escape key detection (useful for modals/dropdowns)
 * @param onClose - Function to call when closing
 * @param enabled - Whether the hooks are enabled
 * @returns Ref to attach to the element
 */
export function useCloseOnClickOutsideOrEscape<T extends HTMLElement = HTMLElement>(
  onClose: () => void,
  enabled: boolean = true
): RefObject<T | null> {
  const ref = useClickOutside<T>(onClose, enabled);
  useEscapeKey(onClose, enabled);
  return ref;
}

/**
 * Hook for detecting clicks on a specific element
 * @param callback - Function to call when element is clicked
 * @returns Ref to attach to the element
 */
export function useOnClickInside<T extends HTMLElement = HTMLElement>(
  callback: (event: MouseEvent) => void
): RefObject<T | null> {
  const ref = useRef<T | null>(null);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleClick = (event: MouseEvent) => {
      callbackRef.current(event);
    };

    element.addEventListener('click', handleClick);

    return () => {
      element.removeEventListener('click', handleClick);
    };
  }, []);

  return ref;
}
