'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

// =============================================================================
// TYPES
// =============================================================================

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | ((error: Error, resetError: () => void) => ReactNode);
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// =============================================================================
// ERROR BOUNDARY CLASS COMPONENT
// =============================================================================

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  resetError = (): void => {
    this.props.onReset?.();
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        if (typeof this.props.fallback === 'function') {
          return this.props.fallback(this.state.error, this.resetError);
        }
        return this.props.fallback;
      }

      return (
        <DefaultErrorFallback
          error={this.state.error}
          resetError={this.resetError}
        />
      );
    }

    return this.props.children;
  }
}

// =============================================================================
// DEFAULT ERROR FALLBACK
// =============================================================================

interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

export function DefaultErrorFallback({ error, resetError }: ErrorFallbackProps) {
  return (
    <div className="min-h-[400px] flex items-center justify-center p-8">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 mx-auto mb-6 text-red-500">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Something went wrong
        </h2>
        
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          An unexpected error occurred. Please try again or contact support if the problem persists.
        </p>
        
        <details className="mb-6 text-left">
          <summary className="cursor-pointer text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
            Error details
          </summary>
          <pre className="mt-2 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs text-red-600 dark:text-red-400 overflow-auto max-h-40">
            {error.message}
            {error.stack && `\n\n${error.stack}`}
          </pre>
        </details>
        
        <button
          onClick={resetError}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// MINIMAL ERROR FALLBACK
// =============================================================================

export function MinimalErrorFallback({ error, resetError }: ErrorFallbackProps) {
  return (
    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 text-red-500">
          <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
            Error loading component
          </h3>
          <p className="mt-1 text-sm text-red-600 dark:text-red-300">
            {error.message}
          </p>
        </div>
        <button
          onClick={resetError}
          className="flex-shrink-0 text-sm text-red-600 dark:text-red-300 hover:text-red-800 dark:hover:text-red-100 underline"
        >
          Retry
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// CARD ERROR FALLBACK
// =============================================================================

export function CardErrorFallback({ error, resetError }: ErrorFallbackProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 text-center">
      <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
        <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        Failed to load
      </h3>
      
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        {error.message || 'An unexpected error occurred'}
      </p>
      
      <button
        onClick={resetError}
        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        Retry
      </button>
    </div>
  );
}

// =============================================================================
// ASYNC ERROR BOUNDARY (For async operations)
// =============================================================================

interface AsyncErrorBoundaryProps extends ErrorBoundaryProps {
  suspenseFallback?: ReactNode;
}

export function AsyncErrorBoundary({
  children,
  fallback,
  suspenseFallback,
  onError,
  onReset,
}: AsyncErrorBoundaryProps) {
  return (
    <ErrorBoundary fallback={fallback} onError={onError} onReset={onReset}>
      <React.Suspense
        fallback={
          suspenseFallback || (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
            </div>
          )
        }
      >
        {children}
      </React.Suspense>
    </ErrorBoundary>
  );
}

// =============================================================================
// QUERY ERROR BOUNDARY (For data fetching)
// =============================================================================

interface QueryErrorBoundaryProps extends ErrorBoundaryProps {
  refetch?: () => void;
}

export function QueryErrorBoundary({
  children,
  fallback,
  refetch,
  onError,
  onReset,
}: QueryErrorBoundaryProps) {
  const handleReset = () => {
    refetch?.();
    onReset?.();
  };

  return (
    <ErrorBoundary
      fallback={(error, resetError) => {
        if (typeof fallback === 'function') {
          return fallback(error, () => {
            handleReset();
            resetError();
          });
        }
        
        if (fallback) {
          return fallback;
        }

        return (
          <div className="p-6 text-center">
            <div className="w-12 h-12 mx-auto mb-4 text-gray-400">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                <path strokeLinecap="round" d="M12 12v4m0 0l-2-2m2 2l2-2" />
              </svg>
            </div>
            
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Failed to load data
            </h3>
            
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {error.message || 'Unable to fetch the requested data'}
            </p>
            
            <button
              onClick={() => {
                handleReset();
                resetError();
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Retry
            </button>
          </div>
        );
      }}
      onError={onError}
      onReset={handleReset}
    >
      {children}
    </ErrorBoundary>
  );
}

// =============================================================================
// USE ERROR HANDLER HOOK
// =============================================================================

interface UseErrorHandlerReturn {
  error: Error | null;
  setError: (error: Error | null) => void;
  clearError: () => void;
  throwError: (error: Error) => never;
}

export function useErrorHandler(): UseErrorHandlerReturn {
  const [error, setError] = React.useState<Error | null>(null);

  const clearError = React.useCallback(() => {
    setError(null);
  }, []);

  const throwError = React.useCallback((error: Error): never => {
    throw error;
  }, []);

  // If there's an error, throw it to be caught by the nearest ErrorBoundary
  if (error) {
    throw error;
  }

  return {
    error,
    setError,
    clearError,
    throwError,
  };
}

// =============================================================================
// TIMELOCK ERROR BOUNDARY (Domain-specific)
// =============================================================================

interface TimelockErrorBoundaryProps {
  children: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

export function TimelockErrorBoundary({ children, onError }: TimelockErrorBoundaryProps) {
  return (
    <ErrorBoundary
      onError={onError}
      fallback={(error, resetError) => (
        <div className="min-h-[300px] flex items-center justify-center p-8 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-xl">
          <div className="max-w-sm text-center">
            <div className="w-16 h-16 mx-auto mb-4">
              <svg viewBox="0 0 200 200" fill="none" className="w-full h-full">
                <circle cx="100" cy="100" r="80" fill="currentColor" className="text-red-100 dark:text-red-900/30" />
                <rect x="65" y="90" width="70" height="55" rx="6" fill="currentColor" className="text-red-300 dark:text-red-700" />
                <path d="M75 90 V75 C75 61.193 86.193 50 100 50 C113.807 50 125 61.193 125 75 V90" stroke="currentColor" strokeWidth="8" strokeLinecap="round" className="text-red-400 dark:text-red-600" fill="none" />
                <line x1="85" y1="105" x2="115" y2="135" stroke="currentColor" strokeWidth="6" strokeLinecap="round" className="text-red-500" />
                <line x1="115" y1="105" x2="85" y2="135" stroke="currentColor" strokeWidth="6" strokeLinecap="round" className="text-red-500" />
              </svg>
            </div>
            
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              TimeLock Error
            </h3>
            
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              There was an issue with your timelock operation. This could be due to network issues or contract errors.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <button
                onClick={resetError}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
              <a
                href="https://docs.stacks.co"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Get Help
              </a>
            </div>
          </div>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

export default ErrorBoundary;
