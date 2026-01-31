'use client';

import {
  createContext,
  forwardRef,
  HTMLAttributes,
  ReactNode,
  useContext,
  useState,
  useRef,
  useEffect,
} from 'react';
import { cn } from '@/lib/utils';

// Dropdown Context
interface DropdownContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}

const DropdownContext = createContext<DropdownContextType | null>(null);

const useDropdown = () => {
  const context = useContext(DropdownContext);
  if (!context) {
    throw new Error('Dropdown components must be used within a Dropdown');
  }
  return context;
};

// Main Dropdown component
interface DropdownProps {
  children: ReactNode;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const Dropdown = ({ children, defaultOpen = false, onOpenChange }: DropdownProps) => {
  const [isOpen, setIsOpenState] = useState(defaultOpen);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const setIsOpen = (open: boolean) => {
    setIsOpenState(open);
    onOpenChange?.(open);
  };

  return (
    <DropdownContext.Provider value={{ isOpen, setIsOpen, triggerRef }}>
      <div className="relative inline-block">{children}</div>
    </DropdownContext.Provider>
  );
};

// Dropdown Trigger
interface DropdownTriggerProps extends HTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export const DropdownTrigger = forwardRef<HTMLButtonElement, DropdownTriggerProps>(
  ({ className, children, onClick, ...props }, ref) => {
    const { isOpen, setIsOpen, triggerRef } = useDropdown();

    return (
      <button
        ref={(node) => {
          (triggerRef as React.MutableRefObject<HTMLButtonElement | null>).current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) ref.current = node;
        }}
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        onClick={(e) => {
          setIsOpen(!isOpen);
          onClick?.(e);
        }}
        className={className}
        {...props}
      >
        {children}
      </button>
    );
  }
);

DropdownTrigger.displayName = 'DropdownTrigger';

// Dropdown Content
interface DropdownContentProps extends HTMLAttributes<HTMLDivElement> {
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'bottom';
  sideOffset?: number;
}

export const DropdownContent = forwardRef<HTMLDivElement, DropdownContentProps>(
  ({ align = 'start', side = 'bottom', sideOffset = 4, className, children, ...props }, ref) => {
    const { isOpen, setIsOpen, triggerRef } = useDropdown();
    const contentRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
      if (!isOpen) return;

      const handleClickOutside = (event: MouseEvent) => {
        if (
          contentRef.current &&
          !contentRef.current.contains(event.target as Node) &&
          triggerRef.current &&
          !triggerRef.current.contains(event.target as Node)
        ) {
          setIsOpen(false);
        }
      };

      const handleEscape = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          setIsOpen(false);
          triggerRef.current?.focus();
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);

      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleEscape);
      };
    }, [isOpen, setIsOpen, triggerRef]);

    if (!isOpen) return null;

    const alignStyles = {
      start: 'left-0',
      center: 'left-1/2 -translate-x-1/2',
      end: 'right-0',
    };

    const sideStyles = {
      top: `bottom-full mb-${sideOffset}`,
      bottom: `top-full mt-${sideOffset}`,
    };

    return (
      <div
        ref={(node) => {
          (contentRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) ref.current = node;
        }}
        role="menu"
        aria-orientation="vertical"
        className={cn(
          'absolute z-50 min-w-[8rem] py-1 bg-white rounded-lg border border-gray-200 shadow-lg',
          'animate-fadeIn',
          alignStyles[align],
          side === 'top' ? `bottom-full mb-1` : `top-full mt-1`,
          className
        )}
        style={{ marginTop: side === 'bottom' ? sideOffset : undefined, marginBottom: side === 'top' ? sideOffset : undefined }}
        {...props}
      >
        {children}
      </div>
    );
  }
);

DropdownContent.displayName = 'DropdownContent';

// Dropdown Item
interface DropdownItemProps extends HTMLAttributes<HTMLButtonElement> {
  disabled?: boolean;
  destructive?: boolean;
  icon?: ReactNode;
}

export const DropdownItem = forwardRef<HTMLButtonElement, DropdownItemProps>(
  ({ disabled, destructive, icon, className, children, onClick, ...props }, ref) => {
    const { setIsOpen } = useDropdown();

    return (
      <button
        ref={ref}
        type="button"
        role="menuitem"
        disabled={disabled}
        onClick={(e) => {
          if (!disabled) {
            onClick?.(e);
            setIsOpen(false);
          }
        }}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2 text-sm text-left',
          'hover:bg-gray-100 focus:bg-gray-100 focus:outline-none',
          'transition-colors',
          disabled && 'opacity-50 cursor-not-allowed',
          destructive && 'text-red-600 hover:bg-red-50 focus:bg-red-50',
          className
        )}
        {...props}
      >
        {icon && <span className="w-4 h-4 flex-shrink-0">{icon}</span>}
        {children}
      </button>
    );
  }
);

DropdownItem.displayName = 'DropdownItem';

// Dropdown Separator
export const DropdownSeparator = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        role="separator"
        className={cn('h-px my-1 bg-gray-200', className)}
        {...props}
      />
    );
  }
);

DropdownSeparator.displayName = 'DropdownSeparator';

// Dropdown Label
export const DropdownLabel = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase', className)}
        {...props}
      />
    );
  }
);

DropdownLabel.displayName = 'DropdownLabel';
