'use client';

import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

// Toast types
export type ToastType = 'success' | 'error' | 'warning' | 'info';
export type ToastPosition = 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';

interface Toast {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
  removeAllToasts: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

// Toast Provider
interface ToastProviderProps {
  children: React.ReactNode;
  position?: ToastPosition;
  maxToasts?: number;
}

export function ToastProvider({ 
  children, 
  position = 'top-right',
  maxToasts = 5 
}: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    
    setToasts((prev) => {
      const newToasts = [...prev, { ...toast, id }];
      // Limit number of toasts
      if (newToasts.length > maxToasts) {
        return newToasts.slice(-maxToasts);
      }
      return newToasts;
    });

    return id;
  }, [maxToasts]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const removeAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const positionClasses: Record<ToastPosition, string> = {
    'top-left': 'top-4 left-4',
    'top-center': 'top-4 left-1/2 -translate-x-1/2',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
    'bottom-right': 'bottom-4 right-4',
  };

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, removeAllToasts }}>
      {children}
      {mounted && createPortal(
        <div
          className={cn(
            'fixed z-[100] flex flex-col gap-2 pointer-events-none',
            positionClasses[position],
            position.includes('bottom') ? 'flex-col-reverse' : 'flex-col'
          )}
          role="region"
          aria-label="Notifications"
        >
          {toasts.map((toast) => (
            <ToastItem
              key={toast.id}
              toast={toast}
              onDismiss={() => removeToast(toast.id)}
              position={position}
            />
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}

// Toast Item Component
interface ToastItemProps {
  toast: Toast;
  onDismiss: () => void;
  position: ToastPosition;
}

const typeStyles: Record<ToastType, { bg: string; icon: string; iconBg: string }> = {
  success: {
    bg: 'bg-white dark:bg-gray-800 border-l-4 border-l-green-500',
    icon: 'text-green-500',
    iconBg: 'bg-green-100 dark:bg-green-900/30',
  },
  error: {
    bg: 'bg-white dark:bg-gray-800 border-l-4 border-l-red-500',
    icon: 'text-red-500',
    iconBg: 'bg-red-100 dark:bg-red-900/30',
  },
  warning: {
    bg: 'bg-white dark:bg-gray-800 border-l-4 border-l-yellow-500',
    icon: 'text-yellow-500',
    iconBg: 'bg-yellow-100 dark:bg-yellow-900/30',
  },
  info: {
    bg: 'bg-white dark:bg-gray-800 border-l-4 border-l-blue-500',
    icon: 'text-blue-500',
    iconBg: 'bg-blue-100 dark:bg-blue-900/30',
  },
};

function ToastItem({ toast, onDismiss, position }: ToastItemProps) {
  const [isExiting, setIsExiting] = useState(false);
  const timerRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (toast.duration !== 0) {
      timerRef.current = setTimeout(() => {
        setIsExiting(true);
      }, toast.duration || 5000);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [toast.duration]);

  useEffect(() => {
    if (isExiting) {
      const timer = setTimeout(onDismiss, 200);
      return () => clearTimeout(timer);
    }
  }, [isExiting, onDismiss]);

  const handleMouseEnter = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
  };

  const handleMouseLeave = () => {
    if (toast.duration !== 0) {
      timerRef.current = setTimeout(() => {
        setIsExiting(true);
      }, 2000);
    }
  };

  const getAnimationClass = () => {
    if (isExiting) {
      return position.includes('right') 
        ? 'animate-out slide-out-to-right fade-out duration-200' 
        : position.includes('left')
        ? 'animate-out slide-out-to-left fade-out duration-200'
        : 'animate-out fade-out duration-200';
    }
    return position.includes('right')
      ? 'animate-in slide-in-from-right fade-in duration-300'
      : position.includes('left')
      ? 'animate-in slide-in-from-left fade-in duration-300'
      : position.includes('top')
      ? 'animate-in slide-in-from-top fade-in duration-300'
      : 'animate-in slide-in-from-bottom fade-in duration-300';
  };

  const icons: Record<ToastType, React.ReactNode> = {
    success: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
    error: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
    warning: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    info: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };

  return (
    <div
      className={cn(
        'pointer-events-auto w-full max-w-sm rounded-lg shadow-lg',
        typeStyles[toast.type].bg,
        getAnimationClass()
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      role="alert"
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn('flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center', typeStyles[toast.type].iconBg, typeStyles[toast.type].icon)}>
            {icons[toast.type]}
          </div>
          
          <div className="flex-1 min-w-0">
            {toast.title && (
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {toast.title}
              </p>
            )}
            <p className={cn('text-sm text-gray-600 dark:text-gray-300', toast.title && 'mt-1')}>
              {toast.message}
            </p>
            
            {toast.action && (
              <button
                type="button"
                onClick={toast.action.onClick}
                className="mt-2 text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400"
              >
                {toast.action.label}
              </button>
            )}
          </div>
          
          <button
            type="button"
            onClick={() => setIsExiting(true)}
            className="flex-shrink-0 p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="Dismiss"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// Hook for using toasts
export function useToast() {
  const context = useContext(ToastContext);
  
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }

  const { addToast, removeToast, removeAllToasts, toasts } = context;

  const success = useCallback(
    (message: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'message'>>) => {
      return addToast({ ...options, type: 'success', message });
    },
    [addToast]
  );

  const error = useCallback(
    (message: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'message'>>) => {
      return addToast({ ...options, type: 'error', message });
    },
    [addToast]
  );

  const warning = useCallback(
    (message: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'message'>>) => {
      return addToast({ ...options, type: 'warning', message });
    },
    [addToast]
  );

  const info = useCallback(
    (message: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'message'>>) => {
      return addToast({ ...options, type: 'info', message });
    },
    [addToast]
  );

  const promise = useCallback(
    <T,>(
      promiseOrFn: Promise<T> | (() => Promise<T>),
      messages: {
        loading: string;
        success: string | ((data: T) => string);
        error: string | ((err: Error) => string);
      }
    ): Promise<T> => {
      const promise = typeof promiseOrFn === 'function' ? promiseOrFn() : promiseOrFn;
      
      const loadingId = addToast({
        type: 'info',
        message: messages.loading,
        duration: 0, // Don't auto-dismiss
      });

      promise
        .then((data) => {
          removeToast(loadingId);
          const message = typeof messages.success === 'function' 
            ? messages.success(data) 
            : messages.success;
          addToast({ type: 'success', message });
        })
        .catch((err) => {
          removeToast(loadingId);
          const message = typeof messages.error === 'function' 
            ? messages.error(err) 
            : messages.error;
          addToast({ type: 'error', message });
        });

      return promise;
    },
    [addToast, removeToast]
  );

  return {
    toasts,
    addToast,
    removeToast,
    removeAllToasts,
    success,
    error,
    warning,
    info,
    promise,
  };
}

// Standalone toast function (requires ToastProvider)
export const toast = {
  success: (message: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'message'>>) => {
    const event = new CustomEvent('toast', {
      detail: { ...options, type: 'success', message },
    });
    window.dispatchEvent(event);
  },
  error: (message: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'message'>>) => {
    const event = new CustomEvent('toast', {
      detail: { ...options, type: 'error', message },
    });
    window.dispatchEvent(event);
  },
  warning: (message: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'message'>>) => {
    const event = new CustomEvent('toast', {
      detail: { ...options, type: 'warning', message },
    });
    window.dispatchEvent(event);
  },
  info: (message: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'message'>>) => {
    const event = new CustomEvent('toast', {
      detail: { ...options, type: 'info', message },
    });
    window.dispatchEvent(event);
  },
};
