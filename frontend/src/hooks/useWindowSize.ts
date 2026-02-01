'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

// =============================================================================
// TYPES
// =============================================================================

interface WindowSize {
  width: number;
  height: number;
}

interface UseWindowSizeOptions {
  debounce?: number;
  initialWidth?: number;
  initialHeight?: number;
}

// =============================================================================
// BREAKPOINT DEFINITIONS
// =============================================================================

export const breakpoints = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

export type Breakpoint = keyof typeof breakpoints;

// =============================================================================
// USE WINDOW SIZE - Basic window dimensions
// =============================================================================

/**
 * Hook to track window dimensions.
 * 
 * @param options - Configuration options
 * @returns Current window width and height
 * 
 * @example
 * const { width, height } = useWindowSize();
 */
export function useWindowSize(options: UseWindowSizeOptions = {}): WindowSize {
  const {
    debounce: debounceMs = 100,
    initialWidth = typeof window !== 'undefined' ? window.innerWidth : 1024,
    initialHeight = typeof window !== 'undefined' ? window.innerHeight : 768,
  } = options;

  const [size, setSize] = useState<WindowSize>({
    width: initialWidth,
    height: initialHeight,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let timeoutId: NodeJS.Timeout | null = null;

    const handleResize = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      if (debounceMs > 0) {
        timeoutId = setTimeout(() => {
          setSize({
            width: window.innerWidth,
            height: window.innerHeight,
          });
        }, debounceMs);
      } else {
        setSize({
          width: window.innerWidth,
          height: window.innerHeight,
        });
      }
    };

    // Set initial size
    setSize({
      width: window.innerWidth,
      height: window.innerHeight,
    });

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [debounceMs]);

  return size;
}

// =============================================================================
// USE BREAKPOINT - Current breakpoint detection
// =============================================================================

interface UseBreakpointReturn {
  breakpoint: Breakpoint;
  isXs: boolean;
  isSm: boolean;
  isMd: boolean;
  isLg: boolean;
  isXl: boolean;
  is2xl: boolean;
  isSmUp: boolean;
  isMdUp: boolean;
  isLgUp: boolean;
  isXlUp: boolean;
  is2xlUp: boolean;
  isSmDown: boolean;
  isMdDown: boolean;
  isLgDown: boolean;
  isXlDown: boolean;
}

/**
 * Hook to get current breakpoint and breakpoint-related flags.
 * 
 * @param customBreakpoints - Optional custom breakpoint definitions
 * @returns Current breakpoint and boolean flags
 */
export function useBreakpoint(
  customBreakpoints: Record<string, number> = breakpoints
): UseBreakpointReturn {
  const { width } = useWindowSize();

  const breakpoint = useMemo(() => {
    const sortedBreakpoints = Object.entries(customBreakpoints)
      .sort(([, a], [, b]) => b - a) as [Breakpoint, number][];

    for (const [name, minWidth] of sortedBreakpoints) {
      if (width >= minWidth) {
        return name;
      }
    }
    return 'xs' as Breakpoint;
  }, [width, customBreakpoints]);

  return useMemo(() => ({
    breakpoint,
    isXs: breakpoint === 'xs',
    isSm: breakpoint === 'sm',
    isMd: breakpoint === 'md',
    isLg: breakpoint === 'lg',
    isXl: breakpoint === 'xl',
    is2xl: breakpoint === '2xl',
    isSmUp: width >= breakpoints.sm,
    isMdUp: width >= breakpoints.md,
    isLgUp: width >= breakpoints.lg,
    isXlUp: width >= breakpoints.xl,
    is2xlUp: width >= breakpoints['2xl'],
    isSmDown: width < breakpoints.md,
    isMdDown: width < breakpoints.lg,
    isLgDown: width < breakpoints.xl,
    isXlDown: width < breakpoints['2xl'],
  }), [breakpoint, width]);
}

// =============================================================================
// USE MEDIA QUERY EXTENDED - Extended media query support
// =============================================================================

/**
 * Hook to check if the viewport is mobile.
 * 
 * @param maxWidth - Maximum width considered mobile (default: 768)
 * @returns Boolean indicating if viewport is mobile
 */
export function useIsMobile(maxWidth: number = 768): boolean {
  const { width } = useWindowSize();
  return width < maxWidth;
}

/**
 * Hook to check if the viewport is desktop.
 * 
 * @param minWidth - Minimum width considered desktop (default: 1024)
 * @returns Boolean indicating if viewport is desktop
 */
export function useIsDesktop(minWidth: number = 1024): boolean {
  const { width } = useWindowSize();
  return width >= minWidth;
}

/**
 * Hook to check if the viewport is tablet.
 * 
 * @param minWidth - Minimum width for tablet (default: 768)
 * @param maxWidth - Maximum width for tablet (default: 1024)
 * @returns Boolean indicating if viewport is tablet
 */
export function useIsTablet(minWidth: number = 768, maxWidth: number = 1024): boolean {
  const { width } = useWindowSize();
  return width >= minWidth && width < maxWidth;
}

// =============================================================================
// USE ORIENTATION - Device orientation
// =============================================================================

type Orientation = 'portrait' | 'landscape';

interface UseOrientationReturn {
  orientation: Orientation;
  isPortrait: boolean;
  isLandscape: boolean;
  angle: number;
}

/**
 * Hook to track device orientation.
 * 
 * @returns Current orientation state
 */
export function useOrientation(): UseOrientationReturn {
  const [orientation, setOrientation] = useState<UseOrientationReturn>(() => {
    if (typeof window === 'undefined') {
      return {
        orientation: 'portrait' as Orientation,
        isPortrait: true,
        isLandscape: false,
        angle: 0,
      };
    }

    const angle = window.screen?.orientation?.angle ?? 0;
    const isPortrait = angle === 0 || angle === 180;

    return {
      orientation: isPortrait ? 'portrait' : 'landscape',
      isPortrait,
      isLandscape: !isPortrait,
      angle,
    };
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOrientationChange = () => {
      const angle = window.screen?.orientation?.angle ?? 0;
      const isPortrait = angle === 0 || angle === 180;

      setOrientation({
        orientation: isPortrait ? 'portrait' : 'landscape',
        isPortrait,
        isLandscape: !isPortrait,
        angle,
      });
    };

    window.addEventListener('orientationchange', handleOrientationChange);
    
    // Also listen to resize as a fallback
    window.addEventListener('resize', handleOrientationChange);

    return () => {
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.removeEventListener('resize', handleOrientationChange);
    };
  }, []);

  return orientation;
}

// =============================================================================
// USE SCREEN - Full screen information
// =============================================================================

interface ScreenInfo {
  width: number;
  height: number;
  availWidth: number;
  availHeight: number;
  colorDepth: number;
  pixelDepth: number;
  devicePixelRatio: number;
}

/**
 * Hook to get screen information.
 * 
 * @returns Screen dimensions and properties
 */
export function useScreen(): ScreenInfo {
  const [screen, setScreen] = useState<ScreenInfo>(() => {
    if (typeof window === 'undefined') {
      return {
        width: 1920,
        height: 1080,
        availWidth: 1920,
        availHeight: 1040,
        colorDepth: 24,
        pixelDepth: 24,
        devicePixelRatio: 1,
      };
    }

    return {
      width: window.screen.width,
      height: window.screen.height,
      availWidth: window.screen.availWidth,
      availHeight: window.screen.availHeight,
      colorDepth: window.screen.colorDepth,
      pixelDepth: window.screen.pixelDepth,
      devicePixelRatio: window.devicePixelRatio || 1,
    };
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateScreen = () => {
      setScreen({
        width: window.screen.width,
        height: window.screen.height,
        availWidth: window.screen.availWidth,
        availHeight: window.screen.availHeight,
        colorDepth: window.screen.colorDepth,
        pixelDepth: window.screen.pixelDepth,
        devicePixelRatio: window.devicePixelRatio || 1,
      });
    };

    window.addEventListener('resize', updateScreen);

    return () => {
      window.removeEventListener('resize', updateScreen);
    };
  }, []);

  return screen;
}

// =============================================================================
// USE VIEWPORT - Viewport dimensions with scroll position
// =============================================================================

interface ViewportInfo {
  width: number;
  height: number;
  scrollX: number;
  scrollY: number;
  scrollWidth: number;
  scrollHeight: number;
  isScrollable: boolean;
  scrollPercentageX: number;
  scrollPercentageY: number;
}

/**
 * Hook to track viewport dimensions and scroll position.
 * 
 * @param debounceMs - Debounce delay in milliseconds
 * @returns Viewport information
 */
export function useViewport(debounceMs: number = 100): ViewportInfo {
  const [viewport, setViewport] = useState<ViewportInfo>(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
    scrollX: 0,
    scrollY: 0,
    scrollWidth: typeof document !== 'undefined' ? document.body.scrollWidth : 1024,
    scrollHeight: typeof document !== 'undefined' ? document.body.scrollHeight : 768,
    isScrollable: false,
    scrollPercentageX: 0,
    scrollPercentageY: 0,
  }));

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let timeoutId: NodeJS.Timeout | null = null;

    const updateViewport = () => {
      const scrollWidth = document.body.scrollWidth;
      const scrollHeight = document.body.scrollHeight;
      const width = window.innerWidth;
      const height = window.innerHeight;
      const scrollX = window.scrollX;
      const scrollY = window.scrollY;

      const maxScrollX = scrollWidth - width;
      const maxScrollY = scrollHeight - height;

      setViewport({
        width,
        height,
        scrollX,
        scrollY,
        scrollWidth,
        scrollHeight,
        isScrollable: scrollHeight > height || scrollWidth > width,
        scrollPercentageX: maxScrollX > 0 ? (scrollX / maxScrollX) * 100 : 0,
        scrollPercentageY: maxScrollY > 0 ? (scrollY / maxScrollY) * 100 : 0,
      });
    };

    const handleUpdate = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      if (debounceMs > 0) {
        timeoutId = setTimeout(updateViewport, debounceMs);
      } else {
        updateViewport();
      }
    };

    updateViewport();

    window.addEventListener('resize', handleUpdate);
    window.addEventListener('scroll', handleUpdate);

    return () => {
      window.removeEventListener('resize', handleUpdate);
      window.removeEventListener('scroll', handleUpdate);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [debounceMs]);

  return viewport;
}

// =============================================================================
// USE ELEMENT SIZE - Track element dimensions
// =============================================================================

interface ElementSize {
  width: number;
  height: number;
  top: number;
  left: number;
  right: number;
  bottom: number;
}

/**
 * Hook to track the size and position of an element.
 * 
 * @returns [ref, size] - Ref to attach to element and current size
 */
export function useElementSize<T extends HTMLElement>(): [
  React.RefObject<T>,
  ElementSize
] {
  const [size, setSize] = useState<ElementSize>({
    width: 0,
    height: 0,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  });

  const ref = useCallback((node: T | null) => {
    if (!node) return;

    const observer = new ResizeObserver(entries => {
      const entry = entries[0];
      if (entry) {
        const rect = node.getBoundingClientRect();
        setSize({
          width: rect.width,
          height: rect.height,
          top: rect.top,
          left: rect.left,
          right: rect.right,
          bottom: rect.bottom,
        });
      }
    });

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, []);

  return [{ current: null } as React.RefObject<T>, size];
}

// =============================================================================
// TIMELOCK-SPECIFIC RESPONSIVE HOOKS
// =============================================================================

/**
 * Hook for responsive layout in TimeLock UI.
 * Returns layout configuration based on screen size.
 */
export function useResponsiveLayout(): {
  columns: number;
  cardSize: 'sm' | 'md' | 'lg';
  showSidebar: boolean;
  showMobileNav: boolean;
  tableView: 'compact' | 'full';
  chartHeight: number;
} {
  const { breakpoint, isMdUp, isLgUp, isXlUp } = useBreakpoint();

  return useMemo(() => ({
    columns: isXlUp ? 4 : isLgUp ? 3 : isMdUp ? 2 : 1,
    cardSize: isLgUp ? 'lg' : isMdUp ? 'md' : 'sm',
    showSidebar: isLgUp,
    showMobileNav: !isMdUp,
    tableView: isMdUp ? 'full' : 'compact',
    chartHeight: isLgUp ? 400 : isMdUp ? 300 : 200,
  }), [breakpoint, isMdUp, isLgUp, isXlUp]);
}

/**
 * Hook for responsive typography sizing.
 */
export function useResponsiveText(): {
  headingSize: 'text-2xl' | 'text-3xl' | 'text-4xl';
  bodySize: 'text-sm' | 'text-base' | 'text-lg';
  captionSize: 'text-xs' | 'text-sm';
} {
  const { isMdUp, isLgUp } = useBreakpoint();

  return useMemo(() => ({
    headingSize: isLgUp ? 'text-4xl' : isMdUp ? 'text-3xl' : 'text-2xl',
    bodySize: isLgUp ? 'text-lg' : isMdUp ? 'text-base' : 'text-sm',
    captionSize: isMdUp ? 'text-sm' : 'text-xs',
  }), [isMdUp, isLgUp]);
}

/**
 * Hook for responsive spacing in TimeLock components.
 */
export function useResponsiveSpacing(): {
  containerPadding: string;
  cardPadding: string;
  gap: string;
  sectionMargin: string;
} {
  const { isMdUp, isLgUp } = useBreakpoint();

  return useMemo(() => ({
    containerPadding: isLgUp ? 'px-8' : isMdUp ? 'px-6' : 'px-4',
    cardPadding: isLgUp ? 'p-6' : isMdUp ? 'p-4' : 'p-3',
    gap: isLgUp ? 'gap-6' : isMdUp ? 'gap-4' : 'gap-3',
    sectionMargin: isLgUp ? 'my-8' : isMdUp ? 'my-6' : 'my-4',
  }), [isMdUp, isLgUp]);
}

/**
 * Hook for modal sizing based on screen size.
 */
export function useModalSize(): {
  width: string;
  maxWidth: string;
  padding: string;
} {
  const { isMdUp, isLgUp } = useBreakpoint();

  return useMemo(() => ({
    width: isMdUp ? 'auto' : '100%',
    maxWidth: isLgUp ? '32rem' : isMdUp ? '28rem' : '100%',
    padding: isMdUp ? '1.5rem' : '1rem',
  }), [isMdUp, isLgUp]);
}

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

export default useWindowSize;
