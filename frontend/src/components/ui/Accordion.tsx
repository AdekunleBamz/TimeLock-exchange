'use client';

import React, { createContext, useContext, useState, useCallback, useId, useMemo } from 'react';

// =============================================================================
// TYPES
// =============================================================================

type AccordionType = 'single' | 'multiple';
type AccordionVariant = 'default' | 'bordered' | 'separated' | 'ghost';

interface AccordionContextValue {
  openItems: string[];
  toggleItem: (value: string) => void;
  variant: AccordionVariant;
  disabled: boolean;
}

interface AccordionItemContextValue {
  value: string;
  isOpen: boolean;
  disabled: boolean;
  triggerId: string;
  contentId: string;
}

interface AccordionProps {
  type?: AccordionType;
  defaultValue?: string | string[];
  value?: string | string[];
  onValueChange?: (value: string | string[]) => void;
  variant?: AccordionVariant;
  disabled?: boolean;
  collapsible?: boolean;
  className?: string;
  children: React.ReactNode;
}

interface AccordionItemProps {
  value: string;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}

interface AccordionTriggerProps {
  className?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

interface AccordionContentProps {
  className?: string;
  children: React.ReactNode;
}

// =============================================================================
// CONTEXTS
// =============================================================================

const AccordionContext = createContext<AccordionContextValue | null>(null);
const AccordionItemContext = createContext<AccordionItemContextValue | null>(null);

function useAccordionContext() {
  const context = useContext(AccordionContext);
  if (!context) {
    throw new Error('Accordion components must be used within an Accordion provider');
  }
  return context;
}

function useAccordionItemContext() {
  const context = useContext(AccordionItemContext);
  if (!context) {
    throw new Error('AccordionItem components must be used within an AccordionItem provider');
  }
  return context;
}

// =============================================================================
// STYLES
// =============================================================================

const variantStyles: Record<AccordionVariant, { container: string; item: string; trigger: string; content: string }> = {
  default: {
    container: 'divide-y divide-gray-200 dark:divide-gray-700',
    item: '',
    trigger: 'hover:bg-gray-50 dark:hover:bg-gray-800/50',
    content: '',
  },
  bordered: {
    container: 'border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-200 dark:divide-gray-700 overflow-hidden',
    item: '',
    trigger: 'hover:bg-gray-50 dark:hover:bg-gray-800/50',
    content: 'bg-gray-50 dark:bg-gray-800/30',
  },
  separated: {
    container: 'space-y-2',
    item: 'border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden',
    trigger: 'hover:bg-gray-50 dark:hover:bg-gray-800/50',
    content: '',
  },
  ghost: {
    container: '',
    item: '',
    trigger: 'rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800',
    content: '',
  },
};

// =============================================================================
// ACCORDION ROOT
// =============================================================================

export function Accordion({
  type = 'single',
  defaultValue,
  value,
  onValueChange,
  variant = 'default',
  disabled = false,
  collapsible = true,
  className = '',
  children,
}: AccordionProps) {
  const getInitialValue = (): string[] => {
    if (defaultValue) {
      return Array.isArray(defaultValue) ? defaultValue : [defaultValue];
    }
    return [];
  };

  const [internalValue, setInternalValue] = useState<string[]>(getInitialValue);
  
  const openItems = value !== undefined 
    ? (Array.isArray(value) ? value : [value])
    : internalValue;

  const toggleItem = useCallback((itemValue: string) => {
    if (disabled) return;

    let newValue: string[];

    if (type === 'single') {
      if (openItems.includes(itemValue)) {
        newValue = collapsible ? [] : openItems;
      } else {
        newValue = [itemValue];
      }
    } else {
      if (openItems.includes(itemValue)) {
        newValue = openItems.filter(v => v !== itemValue);
      } else {
        newValue = [...openItems, itemValue];
      }
    }

    if (value === undefined) {
      setInternalValue(newValue);
    }
    
    if (type === 'single') {
      onValueChange?.(newValue[0] || '');
    } else {
      onValueChange?.(newValue);
    }
  }, [type, openItems, collapsible, disabled, value, onValueChange]);

  const contextValue = useMemo(() => ({
    openItems,
    toggleItem,
    variant,
    disabled,
  }), [openItems, toggleItem, variant, disabled]);

  return (
    <AccordionContext.Provider value={contextValue}>
      <div className={`${variantStyles[variant].container} ${className}`}>
        {children}
      </div>
    </AccordionContext.Provider>
  );
}

// =============================================================================
// ACCORDION ITEM
// =============================================================================

export function AccordionItem({
  value,
  disabled: itemDisabled = false,
  className = '',
  children,
}: AccordionItemProps) {
  const { openItems, variant, disabled: accordionDisabled } = useAccordionContext();
  const baseId = useId();
  
  const isOpen = openItems.includes(value);
  const disabled = accordionDisabled || itemDisabled;

  const contextValue = useMemo(() => ({
    value,
    isOpen,
    disabled,
    triggerId: `${baseId}-trigger`,
    contentId: `${baseId}-content`,
  }), [value, isOpen, disabled, baseId]);

  return (
    <AccordionItemContext.Provider value={contextValue}>
      <div
        data-state={isOpen ? 'open' : 'closed'}
        data-disabled={disabled ? '' : undefined}
        className={`${variantStyles[variant].item} ${className}`}
      >
        {children}
      </div>
    </AccordionItemContext.Provider>
  );
}

// =============================================================================
// ACCORDION TRIGGER
// =============================================================================

export function AccordionTrigger({
  className = '',
  icon,
  children,
}: AccordionTriggerProps) {
  const { toggleItem, variant } = useAccordionContext();
  const { value, isOpen, disabled, triggerId, contentId } = useAccordionItemContext();

  const handleClick = () => {
    if (!disabled) {
      toggleItem(value);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
      e.preventDefault();
      toggleItem(value);
    }
  };

  const defaultIcon = (
    <svg
      className={`w-5 h-5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );

  return (
    <button
      id={triggerId}
      aria-controls={contentId}
      aria-expanded={isOpen}
      disabled={disabled}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`
        flex w-full items-center justify-between py-4 px-4
        text-left font-medium text-gray-900 dark:text-white
        transition-colors
        focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variantStyles[variant].trigger}
        ${className}
      `}
    >
      <span className="flex-1">{children}</span>
      <span className="ml-4 flex-shrink-0 text-gray-500 dark:text-gray-400">
        {icon || defaultIcon}
      </span>
    </button>
  );
}

// =============================================================================
// ACCORDION CONTENT
// =============================================================================

export function AccordionContent({
  className = '',
  children,
}: AccordionContentProps) {
  const { variant } = useAccordionContext();
  const { isOpen, triggerId, contentId } = useAccordionItemContext();
  const contentRef = React.useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | 'auto'>(isOpen ? 'auto' : 0);

  React.useEffect(() => {
    if (!contentRef.current) return;

    if (isOpen) {
      const scrollHeight = contentRef.current.scrollHeight;
      setHeight(scrollHeight);
      const timer = setTimeout(() => setHeight('auto'), 200);
      return () => clearTimeout(timer);
    } else {
      const scrollHeight = contentRef.current.scrollHeight;
      setHeight(scrollHeight);
      requestAnimationFrame(() => {
        setHeight(0);
      });
    }
  }, [isOpen]);

  return (
    <div
      id={contentId}
      role="region"
      aria-labelledby={triggerId}
      hidden={!isOpen && height === 0}
      className="overflow-hidden transition-[height] duration-200 ease-out"
      style={{ height: typeof height === 'number' ? `${height}px` : height }}
    >
      <div
        ref={contentRef}
        className={`
          px-4 pb-4 text-gray-600 dark:text-gray-300
          ${variantStyles[variant].content}
          ${className}
        `}
      >
        {children}
      </div>
    </div>
  );
}

// =============================================================================
// FAQ ACCORDION (Convenience wrapper)
// =============================================================================

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQAccordionProps {
  items: FAQItem[];
  variant?: AccordionVariant;
  className?: string;
}

export function FAQAccordion({ items, variant = 'bordered', className = '' }: FAQAccordionProps) {
  return (
    <Accordion type="single" collapsible variant={variant} className={className}>
      {items.map((item, index) => (
        <AccordionItem key={index} value={`faq-${index}`}>
          <AccordionTrigger>{item.question}</AccordionTrigger>
          <AccordionContent>{item.answer}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

// =============================================================================
// NESTED ACCORDION (For hierarchical content)
// =============================================================================

interface NestedAccordionItem {
  title: string;
  content?: React.ReactNode;
  children?: NestedAccordionItem[];
}

interface NestedAccordionProps {
  items: NestedAccordionItem[];
  level?: number;
  className?: string;
}

export function NestedAccordion({ items, level = 0, className = '' }: NestedAccordionProps) {
  return (
    <Accordion type="multiple" variant={level === 0 ? 'bordered' : 'ghost'} className={className}>
      {items.map((item, index) => (
        <AccordionItem key={index} value={`nested-${level}-${index}`}>
          <AccordionTrigger>
            <span style={{ paddingLeft: `${level * 1}rem` }}>{item.title}</span>
          </AccordionTrigger>
          <AccordionContent>
            {item.content && <div className="mb-2">{item.content}</div>}
            {item.children && item.children.length > 0 && (
              <NestedAccordion items={item.children} level={level + 1} />
            )}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

// =============================================================================
// TIMELOCK INFO ACCORDION (Domain-specific)
// =============================================================================

interface TimelockInfoAccordionProps {
  className?: string;
}

export function TimelockInfoAccordion({ className = '' }: TimelockInfoAccordionProps) {
  const faqItems: FAQItem[] = [
    {
      question: 'What is a timelock position?',
      answer: 'A timelock position is a mechanism that locks your tokens for a specified period. During this time, the tokens cannot be transferred or withdrawn. Once the lock period expires, you can claim your tokens plus any earned rewards.',
    },
    {
      question: 'How do I create a timelock position?',
      answer: 'Connect your wallet, select the token amount you want to lock, choose the lock duration, and confirm the transaction. You\'ll receive an NFT representing your position.',
    },
    {
      question: 'What happens when my lock expires?',
      answer: 'Once your timelock expires, you can claim your locked tokens along with any accumulated rewards. Your position NFT will be burned upon claiming.',
    },
    {
      question: 'Can I unlock early?',
      answer: 'Early unlocking may be possible depending on the contract configuration, but typically incurs a penalty fee. Check the specific terms of your lock position.',
    },
    {
      question: 'What are position NFTs?',
      answer: 'Position NFTs are non-fungible tokens that represent your timelock position. They contain information about your locked amount, lock duration, and unlock date. These NFTs can potentially be traded on secondary markets.',
    },
  ];

  return <FAQAccordion items={faqItems} className={className} />;
}

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

export default Accordion;
