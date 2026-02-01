'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * Hook that tracks a CSS media query
 * @param query - The media query string (e.g., '(min-width: 768px)')
 * @returns Boolean indicating if the media query matches
 */
export function useMediaQuery(query: string): boolean {
  const getMatches = useCallback((query: string): boolean => {
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches;
    }
    return false;
  }, []);

  const [matches, setMatches] = useState<boolean>(getMatches(query));

  useEffect(() => {
    const mediaQueryList = window.matchMedia(query);
    
    // Set initial value
    setMatches(mediaQueryList.matches);

    // Handler for changes
    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Modern browsers
    if (mediaQueryList.addEventListener) {
      mediaQueryList.addEventListener('change', handler);
    } else {
      // Fallback for older browsers
      mediaQueryList.addListener(handler);
    }

    return () => {
      if (mediaQueryList.removeEventListener) {
        mediaQueryList.removeEventListener('change', handler);
      } else {
        mediaQueryList.removeListener(handler);
      }
    };
  }, [query]);

  return matches;
}

// Breakpoint hooks using Tailwind CSS defaults
const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

/**
 * Hook that returns true when viewport is at or above the 'sm' breakpoint (640px)
 */
export function useIsSm(): boolean {
  return useMediaQuery(`(min-width: ${breakpoints.sm})`);
}

/**
 * Hook that returns true when viewport is at or above the 'md' breakpoint (768px)
 */
export function useIsMd(): boolean {
  return useMediaQuery(`(min-width: ${breakpoints.md})`);
}

/**
 * Hook that returns true when viewport is at or above the 'lg' breakpoint (1024px)
 */
export function useIsLg(): boolean {
  return useMediaQuery(`(min-width: ${breakpoints.lg})`);
}

/**
 * Hook that returns true when viewport is at or above the 'xl' breakpoint (1280px)
 */
export function useIsXl(): boolean {
  return useMediaQuery(`(min-width: ${breakpoints.xl})`);
}

/**
 * Hook that returns true when viewport is at or above the '2xl' breakpoint (1536px)
 */
export function useIs2xl(): boolean {
  return useMediaQuery(`(min-width: ${breakpoints['2xl']})`);
}

/**
 * Hook that returns true when user prefers reduced motion
 */
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}

/**
 * Hook that returns true when user prefers dark color scheme
 */
export function usePrefersDarkMode(): boolean {
  return useMediaQuery('(prefers-color-scheme: dark)');
}

/**
 * Hook that returns true when viewport is in landscape orientation
 */
export function useIsLandscape(): boolean {
  return useMediaQuery('(orientation: landscape)');
}

/**
 * Hook that returns the current breakpoint name
 * @returns The current breakpoint name: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
 */
export function useBreakpoint(): 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' {
  const isSm = useIsSm();
  const isMd = useIsMd();
  const isLg = useIsLg();
  const isXl = useIsXl();
  const is2xl = useIs2xl();

  if (is2xl) return '2xl';
  if (isXl) return 'xl';
  if (isLg) return 'lg';
  if (isMd) return 'md';
  if (isSm) return 'sm';
  return 'xs';
}

/**
 * Hook that checks if device supports touch
 */
export function useIsTouchDevice(): boolean {
  return useMediaQuery('(hover: none) and (pointer: coarse)');
}
