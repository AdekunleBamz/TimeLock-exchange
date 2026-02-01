'use client';

import React, { createContext, useContext, useState, useCallback, useId, useMemo } from 'react';

// =============================================================================
// TYPES
// =============================================================================

type TabsVariant = 'default' | 'pills' | 'underline' | 'enclosed' | 'soft';
type TabsSize = 'sm' | 'md' | 'lg';
type TabsOrientation = 'horizontal' | 'vertical';

interface TabsContextValue {
  activeTab: string;
  setActiveTab: (value: string) => void;
  variant: TabsVariant;
  size: TabsSize;
  orientation: TabsOrientation;
  baseId: string;
}

interface TabsProps {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  variant?: TabsVariant;
  size?: TabsSize;
  orientation?: TabsOrientation;
  className?: string;
  children: React.ReactNode;
}

interface TabsListProps {
  className?: string;
  children: React.ReactNode;
}

interface TabsTriggerProps {
  value: string;
  disabled?: boolean;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

interface TabsContentProps {
  value: string;
  forceMount?: boolean;
  className?: string;
  children: React.ReactNode;
}

// =============================================================================
// CONTEXT
// =============================================================================

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('Tabs components must be used within a Tabs provider');
  }
  return context;
}

// =============================================================================
// STYLES
// =============================================================================

const listVariantStyles: Record<TabsVariant, Record<TabsOrientation, string>> = {
  default: {
    horizontal: 'border-b border-gray-200 dark:border-gray-700',
    vertical: 'border-r border-gray-200 dark:border-gray-700',
  },
  pills: {
    horizontal: 'bg-gray-100 dark:bg-gray-800 p-1 rounded-lg',
    vertical: 'bg-gray-100 dark:bg-gray-800 p-1 rounded-lg',
  },
  underline: {
    horizontal: '',
    vertical: '',
  },
  enclosed: {
    horizontal: 'border-b border-gray-200 dark:border-gray-700',
    vertical: 'border-r border-gray-200 dark:border-gray-700',
  },
  soft: {
    horizontal: 'gap-1',
    vertical: 'gap-1',
  },
};

const triggerVariantStyles: Record<TabsVariant, { base: string; active: string; inactive: string }> = {
  default: {
    base: 'border-b-2 -mb-px transition-colors',
    active: 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400',
    inactive: 'border-transparent text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200',
  },
  pills: {
    base: 'rounded-md transition-all',
    active: 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm',
    inactive: 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200',
  },
  underline: {
    base: 'relative transition-colors',
    active: 'text-blue-600 dark:text-blue-400 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-blue-600 dark:after:bg-blue-400',
    inactive: 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200',
  },
  enclosed: {
    base: 'border border-transparent -mb-px rounded-t-lg transition-all',
    active: 'border-gray-200 border-b-white dark:border-gray-700 dark:border-b-gray-900 bg-white dark:bg-gray-900 text-gray-900 dark:text-white',
    inactive: 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200',
  },
  soft: {
    base: 'rounded-lg transition-all',
    active: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
    inactive: 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800',
  },
};

const sizeStyles: Record<TabsSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-base',
};

// =============================================================================
// TABS ROOT
// =============================================================================

export function Tabs({
  defaultValue,
  value,
  onValueChange,
  variant = 'default',
  size = 'md',
  orientation = 'horizontal',
  className = '',
  children,
}: TabsProps) {
  const [internalValue, setInternalValue] = useState(defaultValue || '');
  const baseId = useId();
  
  const activeTab = value !== undefined ? value : internalValue;
  
  const setActiveTab = useCallback((newValue: string) => {
    if (value === undefined) {
      setInternalValue(newValue);
    }
    onValueChange?.(newValue);
  }, [value, onValueChange]);

  const contextValue = useMemo(() => ({
    activeTab,
    setActiveTab,
    variant,
    size,
    orientation,
    baseId,
  }), [activeTab, setActiveTab, variant, size, orientation, baseId]);

  return (
    <TabsContext.Provider value={contextValue}>
      <div
        className={`
          ${orientation === 'horizontal' ? 'flex flex-col' : 'flex flex-row'}
          ${className}
        `}
        data-orientation={orientation}
      >
        {children}
      </div>
    </TabsContext.Provider>
  );
}

// =============================================================================
// TABS LIST
// =============================================================================

export function TabsList({ className = '', children }: TabsListProps) {
  const { variant, orientation } = useTabsContext();

  return (
    <div
      role="tablist"
      aria-orientation={orientation}
      className={`
        flex
        ${orientation === 'horizontal' ? 'flex-row' : 'flex-col'}
        ${listVariantStyles[variant][orientation]}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

// =============================================================================
// TABS TRIGGER
// =============================================================================

export function TabsTrigger({
  value,
  disabled = false,
  icon,
  badge,
  className = '',
  children,
}: TabsTriggerProps) {
  const { activeTab, setActiveTab, variant, size, baseId } = useTabsContext();
  const isActive = activeTab === value;

  const handleClick = () => {
    if (!disabled) {
      setActiveTab(value);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  const styles = triggerVariantStyles[variant];

  return (
    <button
      role="tab"
      id={`${baseId}-trigger-${value}`}
      aria-controls={`${baseId}-content-${value}`}
      aria-selected={isActive}
      tabIndex={isActive ? 0 : -1}
      disabled={disabled}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`
        inline-flex items-center justify-center gap-2 font-medium
        focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed
        ${styles.base}
        ${isActive ? styles.active : styles.inactive}
        ${sizeStyles[size]}
        ${className}
      `}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
      {badge && <span className="flex-shrink-0">{badge}</span>}
    </button>
  );
}

// =============================================================================
// TABS CONTENT
// =============================================================================

export function TabsContent({
  value,
  forceMount = false,
  className = '',
  children,
}: TabsContentProps) {
  const { activeTab, baseId, orientation } = useTabsContext();
  const isActive = activeTab === value;

  if (!forceMount && !isActive) {
    return null;
  }

  return (
    <div
      role="tabpanel"
      id={`${baseId}-content-${value}`}
      aria-labelledby={`${baseId}-trigger-${value}`}
      hidden={!isActive}
      tabIndex={0}
      className={`
        focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
        ${orientation === 'horizontal' ? 'mt-4' : 'ml-4'}
        ${isActive ? 'animate-in fade-in-0 duration-200' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

// =============================================================================
// ICON TAB COMPONENT (Convenience wrapper)
// =============================================================================

interface IconTabProps {
  icon: React.ReactNode;
  label?: string;
  value: string;
  disabled?: boolean;
  showLabel?: boolean;
  className?: string;
}

export function IconTab({
  icon,
  label,
  value,
  disabled = false,
  showLabel = true,
  className = '',
}: IconTabProps) {
  return (
    <TabsTrigger
      value={value}
      disabled={disabled}
      className={className}
    >
      <span className="flex items-center gap-2">
        {icon}
        {showLabel && label && <span>{label}</span>}
      </span>
    </TabsTrigger>
  );
}

// =============================================================================
// SCROLLABLE TABS (For many tabs)
// =============================================================================

interface ScrollableTabsListProps extends TabsListProps {
  showArrows?: boolean;
}

export function ScrollableTabsList({
  showArrows = true,
  className = '',
  children,
}: ScrollableTabsListProps) {
  const { variant, orientation } = useTabsContext();
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  const checkScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setShowLeftArrow(scrollLeft > 0);
    setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 1);
  }, []);

  React.useEffect(() => {
    checkScroll();
    const ref = scrollRef.current;
    if (ref) {
      ref.addEventListener('scroll', checkScroll);
      window.addEventListener('resize', checkScroll);
    }
    return () => {
      if (ref) {
        ref.removeEventListener('scroll', checkScroll);
      }
      window.removeEventListener('resize', checkScroll);
    };
  }, [checkScroll]);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const amount = direction === 'left' ? -200 : 200;
    scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
  };

  if (orientation === 'vertical') {
    return <TabsList className={className}>{children}</TabsList>;
  }

  return (
    <div className="relative flex items-center">
      {showArrows && showLeftArrow && (
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 z-10 p-1 bg-white dark:bg-gray-900 rounded-full shadow-md hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-label="Scroll tabs left"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}
      
      <div
        ref={scrollRef}
        role="tablist"
        className={`
          flex overflow-x-auto scrollbar-hide
          ${listVariantStyles[variant][orientation]}
          ${showArrows ? 'px-8' : ''}
          ${className}
        `}
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {children}
      </div>

      {showArrows && showRightArrow && (
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 z-10 p-1 bg-white dark:bg-gray-900 rounded-full shadow-md hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-label="Scroll tabs right"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}
    </div>
  );
}

// =============================================================================
// ANIMATED TABS (with sliding indicator)
// =============================================================================

export function AnimatedTabsList({ className = '', children }: TabsListProps) {
  const { variant, orientation, activeTab } = useTabsContext();
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

  React.useEffect(() => {
    if (!containerRef.current) return;
    
    const activeButton = containerRef.current.querySelector(`[aria-selected="true"]`) as HTMLElement;
    if (activeButton) {
      setIndicatorStyle({
        left: activeButton.offsetLeft,
        width: activeButton.offsetWidth,
      });
    }
  }, [activeTab]);

  if (orientation === 'vertical') {
    return <TabsList className={className}>{children}</TabsList>;
  }

  return (
    <div
      ref={containerRef}
      role="tablist"
      className={`
        relative flex
        ${listVariantStyles[variant][orientation]}
        ${className}
      `}
    >
      {variant === 'underline' && (
        <div
          className="absolute bottom-0 h-0.5 bg-blue-600 dark:bg-blue-400 transition-all duration-300 ease-out"
          style={{ left: indicatorStyle.left, width: indicatorStyle.width }}
        />
      )}
      {children}
    </div>
  );
}

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

export default Tabs;
