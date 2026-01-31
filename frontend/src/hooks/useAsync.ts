'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

// =============================================================================
// TYPES
// =============================================================================

type AsyncStatus = 'idle' | 'pending' | 'success' | 'error';

interface AsyncState<T> {
  status: AsyncStatus;
  data: T | null;
  error: Error | null;
  isIdle: boolean;
  isPending: boolean;
  isSuccess: boolean;
  isError: boolean;
}

interface UseAsyncReturn<T, Args extends unknown[]> extends AsyncState<T> {
  execute: (...args: Args) => Promise<T>;
  reset: () => void;
  setData: (data: T | null) => void;
}

interface UseAsyncOptions<T> {
  immediate?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  onSettled?: (data: T | null, error: Error | null) => void;
  initialData?: T | null;
}

// =============================================================================
// USE ASYNC HOOK
// =============================================================================

export function useAsync<T, Args extends unknown[] = []>(
  asyncFunction: (...args: Args) => Promise<T>,
  options: UseAsyncOptions<T> = {}
): UseAsyncReturn<T, Args> {
  const {
    immediate = false,
    onSuccess,
    onError,
    onSettled,
    initialData = null,
  } = options;

  const [state, setState] = useState<AsyncState<T>>({
    status: 'idle',
    data: initialData,
    error: null,
    isIdle: true,
    isPending: false,
    isSuccess: false,
    isError: false,
  });

  const mountedRef = useRef(true);
  const latestCallId = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const execute = useCallback(
    async (...args: Args): Promise<T> => {
      const callId = ++latestCallId.current;

      setState({
        status: 'pending',
        data: state.data,
        error: null,
        isIdle: false,
        isPending: true,
        isSuccess: false,
        isError: false,
      });

      try {
        const data = await asyncFunction(...args);

        // Only update state if this is the latest call and component is mounted
        if (mountedRef.current && callId === latestCallId.current) {
          setState({
            status: 'success',
            data,
            error: null,
            isIdle: false,
            isPending: false,
            isSuccess: true,
            isError: false,
          });
          onSuccess?.(data);
          onSettled?.(data, null);
        }

        return data;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));

        if (mountedRef.current && callId === latestCallId.current) {
          setState({
            status: 'error',
            data: null,
            error,
            isIdle: false,
            isPending: false,
            isSuccess: false,
            isError: true,
          });
          onError?.(error);
          onSettled?.(null, error);
        }

        throw error;
      }
    },
    [asyncFunction, onSuccess, onError, onSettled, state.data]
  );

  const reset = useCallback(() => {
    latestCallId.current++;
    setState({
      status: 'idle',
      data: initialData,
      error: null,
      isIdle: true,
      isPending: false,
      isSuccess: false,
      isError: false,
    });
  }, [initialData]);

  const setData = useCallback((data: T | null) => {
    setState(prev => ({ ...prev, data }));
  }, []);

  useEffect(() => {
    if (immediate) {
      execute(...([] as unknown as Args));
    }
  }, [immediate, execute]);

  return {
    ...state,
    execute,
    reset,
    setData,
  };
}

// =============================================================================
// USE ASYNC CALLBACK (Execute on demand only)
// =============================================================================

export function useAsyncCallback<T, Args extends unknown[] = []>(
  asyncFunction: (...args: Args) => Promise<T>,
  options: Omit<UseAsyncOptions<T>, 'immediate'> = {}
): UseAsyncReturn<T, Args> {
  return useAsync(asyncFunction, { ...options, immediate: false });
}

// =============================================================================
// USE ASYNC EFFECT (Execute on mount or dependency change)
// =============================================================================

export function useAsyncEffect<T>(
  asyncFunction: () => Promise<T>,
  deps: React.DependencyList,
  options: Omit<UseAsyncOptions<T>, 'immediate'> = {}
): Omit<UseAsyncReturn<T, []>, 'execute'> {
  const { onSuccess, onError, onSettled, initialData } = options;

  const [state, setState] = useState<AsyncState<T>>({
    status: 'idle',
    data: initialData || null,
    error: null,
    isIdle: true,
    isPending: false,
    isSuccess: false,
    isError: false,
  });

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const execute = async () => {
      setState(prev => ({
        ...prev,
        status: 'pending',
        error: null,
        isIdle: false,
        isPending: true,
        isSuccess: false,
        isError: false,
      }));

      try {
        const data = await asyncFunction();

        if (!cancelled && mountedRef.current) {
          setState({
            status: 'success',
            data,
            error: null,
            isIdle: false,
            isPending: false,
            isSuccess: true,
            isError: false,
          });
          onSuccess?.(data);
          onSettled?.(data, null);
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));

        if (!cancelled && mountedRef.current) {
          setState({
            status: 'error',
            data: null,
            error,
            isIdle: false,
            isPending: false,
            isSuccess: false,
            isError: true,
          });
          onError?.(error);
          onSettled?.(null, error);
        }
      }
    };

    execute();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const reset = useCallback(() => {
    setState({
      status: 'idle',
      data: initialData || null,
      error: null,
      isIdle: true,
      isPending: false,
      isSuccess: false,
      isError: false,
    });
  }, [initialData]);

  const setData = useCallback((data: T | null) => {
    setState(prev => ({ ...prev, data }));
  }, []);

  return {
    ...state,
    reset,
    setData,
  };
}

// =============================================================================
// USE RETRY ASYNC (With automatic retry)
// =============================================================================

interface UseRetryAsyncOptions<T> extends UseAsyncOptions<T> {
  retries?: number;
  retryDelay?: number | ((attempt: number) => number);
  shouldRetry?: (error: Error, attempt: number) => boolean;
}

export function useRetryAsync<T, Args extends unknown[] = []>(
  asyncFunction: (...args: Args) => Promise<T>,
  options: UseRetryAsyncOptions<T> = {}
): UseAsyncReturn<T, Args> & { attempt: number } {
  const {
    retries = 3,
    retryDelay = 1000,
    shouldRetry = () => true,
    ...asyncOptions
  } = options;

  const [attempt, setAttempt] = useState(0);

  const wrappedFunction = useCallback(
    async (...args: Args): Promise<T> => {
      let lastError: Error | null = null;

      for (let i = 0; i <= retries; i++) {
        setAttempt(i);

        try {
          return await asyncFunction(...args);
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));

          if (i < retries && shouldRetry(lastError, i)) {
            const delay = typeof retryDelay === 'function' ? retryDelay(i) : retryDelay;
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }

      throw lastError;
    },
    [asyncFunction, retries, retryDelay, shouldRetry]
  );

  const asyncReturn = useAsync(wrappedFunction, asyncOptions);

  return {
    ...asyncReturn,
    attempt,
  };
}

// =============================================================================
// USE POLLING ASYNC (Periodic execution)
// =============================================================================

interface UsePollingAsyncOptions<T> extends UseAsyncOptions<T> {
  interval: number;
  enabled?: boolean;
  stopOnError?: boolean;
}

export function usePollingAsync<T>(
  asyncFunction: () => Promise<T>,
  options: UsePollingAsyncOptions<T>
): UseAsyncReturn<T, []> & { isPolling: boolean; startPolling: () => void; stopPolling: () => void } {
  const {
    interval,
    enabled = true,
    stopOnError = false,
    ...asyncOptions
  } = options;

  const [isPolling, setIsPolling] = useState(enabled);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const asyncReturn = useAsync(asyncFunction, {
    ...asyncOptions,
    onError: (error) => {
      asyncOptions.onError?.(error);
      if (stopOnError) {
        setIsPolling(false);
      }
    },
  });

  const startPolling = useCallback(() => {
    setIsPolling(true);
  }, []);

  const stopPolling = useCallback(() => {
    setIsPolling(false);
  }, []);

  useEffect(() => {
    if (isPolling) {
      // Execute immediately
      asyncReturn.execute();

      // Then set up interval
      intervalRef.current = setInterval(() => {
        asyncReturn.execute();
      }, interval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPolling, interval, asyncReturn.execute]);

  return {
    ...asyncReturn,
    isPolling,
    startPolling,
    stopPolling,
  };
}

// =============================================================================
// USE MUTATION (For POST/PUT/DELETE operations)
// =============================================================================

interface UseMutationOptions<TData, TVariables> {
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: Error, variables: TVariables) => void;
  onSettled?: (data: TData | null, error: Error | null, variables: TVariables) => void;
  onMutate?: (variables: TVariables) => void | Promise<void>;
}

interface UseMutationReturn<TData, TVariables> {
  mutate: (variables: TVariables) => void;
  mutateAsync: (variables: TVariables) => Promise<TData>;
  status: AsyncStatus;
  data: TData | null;
  error: Error | null;
  isIdle: boolean;
  isPending: boolean;
  isSuccess: boolean;
  isError: boolean;
  reset: () => void;
}

export function useMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: UseMutationOptions<TData, TVariables> = {}
): UseMutationReturn<TData, TVariables> {
  const { onSuccess, onError, onSettled, onMutate } = options;

  const [state, setState] = useState<{
    status: AsyncStatus;
    data: TData | null;
    error: Error | null;
  }>({
    status: 'idle',
    data: null,
    error: null,
  });

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const mutateAsync = useCallback(
    async (variables: TVariables): Promise<TData> => {
      await onMutate?.(variables);

      setState({ status: 'pending', data: null, error: null });

      try {
        const data = await mutationFn(variables);

        if (mountedRef.current) {
          setState({ status: 'success', data, error: null });
          onSuccess?.(data, variables);
          onSettled?.(data, null, variables);
        }

        return data;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));

        if (mountedRef.current) {
          setState({ status: 'error', data: null, error });
          onError?.(error, variables);
          onSettled?.(null, error, variables);
        }

        throw error;
      }
    },
    [mutationFn, onMutate, onSuccess, onError, onSettled]
  );

  const mutate = useCallback(
    (variables: TVariables) => {
      mutateAsync(variables).catch(() => {
        // Error is already handled in mutateAsync
      });
    },
    [mutateAsync]
  );

  const reset = useCallback(() => {
    setState({ status: 'idle', data: null, error: null });
  }, []);

  return {
    mutate,
    mutateAsync,
    status: state.status,
    data: state.data,
    error: state.error,
    isIdle: state.status === 'idle',
    isPending: state.status === 'pending',
    isSuccess: state.status === 'success',
    isError: state.status === 'error',
    reset,
  };
}

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

export default useAsync;
