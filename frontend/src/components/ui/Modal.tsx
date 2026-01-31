'use client';

import {
  forwardRef,
  HTMLAttributes,
  ReactNode,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

interface ModalProps extends HTMLAttributes<HTMLDivElement> {
  isOpen: boolean;
  onClose: () => void;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

const sizeStyles = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-full mx-4',
};

export const Modal = forwardRef<HTMLDivElement, ModalProps>(
  (
    {
      isOpen,
      onClose,
      closeOnOverlayClick = true,
      closeOnEscape = true,
      size = 'md',
      className,
      children,
      ...props
    },
    ref
  ) => {
    const modalRef = useRef<HTMLDivElement>(null);

    // Handle escape key
    const handleEscape = useCallback(
      (e: KeyboardEvent) => {
        if (e.key === 'Escape' && closeOnEscape) {
          onClose();
        }
      },
      [closeOnEscape, onClose]
    );

    // Handle overlay click
    const handleOverlayClick = useCallback(
      (e: React.MouseEvent) => {
        if (e.target === e.currentTarget && closeOnOverlayClick) {
          onClose();
        }
      },
      [closeOnOverlayClick, onClose]
    );

    // Lock body scroll when modal is open
    useEffect(() => {
      if (isOpen) {
        document.body.style.overflow = 'hidden';
        document.addEventListener('keydown', handleEscape);
      } else {
        document.body.style.overflow = '';
      }

      return () => {
        document.body.style.overflow = '';
        document.removeEventListener('keydown', handleEscape);
      };
    }, [isOpen, handleEscape]);

    // Focus trap
    useEffect(() => {
      if (isOpen && modalRef.current) {
        modalRef.current.focus();
      }
    }, [isOpen]);

    if (!isOpen) return null;

    const modalContent = (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center"
        role="dialog"
        aria-modal="true"
      >
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-fadeIn"
          onClick={handleOverlayClick}
          aria-hidden="true"
        />

        {/* Modal */}
        <div
          ref={ref || modalRef}
          tabIndex={-1}
          className={cn(
            'relative z-10 w-full bg-white rounded-xl shadow-2xl',
            'animate-slideUp',
            sizeStyles[size],
            className
          )}
          {...props}
        >
          {children}
        </div>
      </div>
    );

    if (typeof document !== 'undefined') {
      return createPortal(modalContent, document.body);
    }

    return null;
  }
);

Modal.displayName = 'Modal';

// Modal Header
interface ModalHeaderProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  subtitle?: string;
  onClose?: () => void;
}

export const ModalHeader = forwardRef<HTMLDivElement, ModalHeaderProps>(
  ({ title, subtitle, onClose, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex items-start justify-between p-4 border-b border-gray-200',
          className
        )}
        {...props}
      >
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          {subtitle && (
            <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
          )}
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>
    );
  }
);

ModalHeader.displayName = 'ModalHeader';

// Modal Body
export const ModalBody = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn('p-4 overflow-y-auto max-h-[60vh]', className)}
      {...props}
    />
  );
});

ModalBody.displayName = 'ModalBody';

// Modal Footer
interface ModalFooterProps extends HTMLAttributes<HTMLDivElement> {
  align?: 'left' | 'center' | 'right';
}

const alignStyles = {
  left: 'justify-start',
  center: 'justify-center',
  right: 'justify-end',
};

export const ModalFooter = forwardRef<HTMLDivElement, ModalFooterProps>(
  ({ align = 'right', className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center gap-3 p-4 border-t border-gray-200',
          alignStyles[align],
          className
        )}
        {...props}
      />
    );
  }
);

ModalFooter.displayName = 'ModalFooter';

// Confirmation Modal
interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
}

export const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false,
}: ConfirmModalProps) => {
  const confirmButtonStyles = {
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    warning: 'bg-yellow-600 hover:bg-yellow-700 text-white',
    info: 'bg-blue-600 hover:bg-blue-700 text-white',
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <ModalHeader title={title} onClose={onClose} />
      <ModalBody>
        <p className="text-gray-600">{message}</p>
      </ModalBody>
      <ModalFooter>
        <button
          type="button"
          onClick={onClose}
          disabled={isLoading}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          {cancelText}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isLoading}
          className={cn(
            'px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50',
            confirmButtonStyles[variant]
          )}
        >
          {isLoading ? 'Loading...' : confirmText}
        </button>
      </ModalFooter>
    </Modal>
  );
};
