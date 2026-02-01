'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

// =============================================================================
// TYPES
// =============================================================================

type CopyStatus = 'idle' | 'copying' | 'copied' | 'error';

interface UseClipboardOptions {
  timeout?: number;
  onCopy?: (text: string) => void;
  onError?: (error: Error) => void;
}

interface UseClipboardReturn {
  copy: (text: string) => Promise<boolean>;
  copied: boolean;
  status: CopyStatus;
  error: Error | null;
  reset: () => void;
}

// =============================================================================
// USE CLIPBOARD - Basic clipboard hook
// =============================================================================

/**
 * Hook for copying text to clipboard with status tracking.
 * 
 * @param options - Configuration options
 * @returns Clipboard functions and state
 * 
 * @example
 * const { copy, copied } = useClipboard();
 * <button onClick={() => copy('Hello!')}>
 *   {copied ? 'Copied!' : 'Copy'}
 * </button>
 */
export function useClipboard(options: UseClipboardOptions = {}): UseClipboardReturn {
  const { timeout = 2000, onCopy, onError } = options;

  const [status, setStatus] = useState<CopyStatus>('idle');
  const [error, setError] = useState<Error | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const reset = useCallback(() => {
    setStatus('idle');
    setError(null);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const copy = useCallback(
    async (text: string): Promise<boolean> => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      setStatus('copying');
      setError(null);

      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text);
        } else {
          // Fallback for older browsers
          const textArea = document.createElement('textarea');
          textArea.value = text;
          textArea.style.position = 'fixed';
          textArea.style.left = '-9999px';
          textArea.style.top = '-9999px';
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();

          const successful = document.execCommand('copy');
          document.body.removeChild(textArea);

          if (!successful) {
            throw new Error('Copy command failed');
          }
        }

        setStatus('copied');
        onCopy?.(text);

        if (timeout > 0) {
          timeoutRef.current = setTimeout(() => {
            setStatus('idle');
          }, timeout);
        }

        return true;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to copy');
        setStatus('error');
        setError(error);
        onError?.(error);
        return false;
      }
    },
    [timeout, onCopy, onError]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    copy,
    copied: status === 'copied',
    status,
    error,
    reset,
  };
}

// =============================================================================
// USE COPY TO CLIPBOARD - Simpler interface with value binding
// =============================================================================

interface UseCopyToClipboardReturn {
  value: string;
  copy: () => Promise<boolean>;
  copyText: (text: string) => Promise<boolean>;
  copied: boolean;
  setValue: (value: string) => void;
  reset: () => void;
}

/**
 * Clipboard hook with value binding for a specific piece of text.
 * 
 * @param initialValue - Initial text value to copy
 * @param options - Configuration options
 * @returns Clipboard state and functions
 */
export function useCopyToClipboard(
  initialValue: string = '',
  options: UseClipboardOptions = {}
): UseCopyToClipboardReturn {
  const [value, setValue] = useState(initialValue);
  const clipboard = useClipboard(options);

  const copy = useCallback(async () => {
    return clipboard.copy(value);
  }, [clipboard, value]);

  const copyText = useCallback(
    async (text: string) => {
      setValue(text);
      return clipboard.copy(text);
    },
    [clipboard]
  );

  return {
    value,
    copy,
    copyText,
    copied: clipboard.copied,
    setValue,
    reset: clipboard.reset,
  };
}

// =============================================================================
// USE CLIPBOARD READ - Read from clipboard
// =============================================================================

interface UseClipboardReadReturn {
  text: string | null;
  read: () => Promise<string | null>;
  isReading: boolean;
  error: Error | null;
  isSupported: boolean;
}

/**
 * Hook for reading text from clipboard.
 * Note: Requires user permission and HTTPS.
 * 
 * @returns Clipboard read functions and state
 */
export function useClipboardRead(): UseClipboardReadReturn {
  const [text, setText] = useState<string | null>(null);
  const [isReading, setIsReading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const isSupported = typeof navigator !== 'undefined' && 
    navigator.clipboard !== undefined && 
    navigator.clipboard.readText !== undefined;

  const read = useCallback(async (): Promise<string | null> => {
    if (!isSupported) {
      const error = new Error('Clipboard read not supported');
      setError(error);
      return null;
    }

    setIsReading(true);
    setError(null);

    try {
      const clipboardText = await navigator.clipboard.readText();
      setText(clipboardText);
      return clipboardText;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to read clipboard');
      setError(error);
      return null;
    } finally {
      setIsReading(false);
    }
  }, [isSupported]);

  return {
    text,
    read,
    isReading,
    error,
    isSupported,
  };
}

// =============================================================================
// USE CLIPBOARD HISTORY - Track copied items
// =============================================================================

interface ClipboardHistoryItem {
  text: string;
  timestamp: Date;
  id: string;
}

interface UseClipboardHistoryReturn extends UseClipboardReturn {
  history: ClipboardHistoryItem[];
  clearHistory: () => void;
  removeFromHistory: (id: string) => void;
  copyFromHistory: (id: string) => Promise<boolean>;
}

/**
 * Clipboard hook that maintains a history of copied items.
 * 
 * @param maxHistory - Maximum number of items to keep in history
 * @param options - Configuration options
 * @returns Clipboard with history tracking
 */
export function useClipboardHistory(
  maxHistory: number = 10,
  options: UseClipboardOptions = {}
): UseClipboardHistoryReturn {
  const [history, setHistory] = useState<ClipboardHistoryItem[]>([]);
  const clipboard = useClipboard(options);

  const copy = useCallback(
    async (text: string): Promise<boolean> => {
      const result = await clipboard.copy(text);
      
      if (result) {
        const newItem: ClipboardHistoryItem = {
          text,
          timestamp: new Date(),
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        };

        setHistory(prev => {
          // Remove duplicate if exists
          const filtered = prev.filter(item => item.text !== text);
          // Add new item at the beginning
          return [newItem, ...filtered].slice(0, maxHistory);
        });
      }

      return result;
    },
    [clipboard, maxHistory]
  );

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  const removeFromHistory = useCallback((id: string) => {
    setHistory(prev => prev.filter(item => item.id !== id));
  }, []);

  const copyFromHistory = useCallback(
    async (id: string): Promise<boolean> => {
      const item = history.find(h => h.id === id);
      if (item) {
        return clipboard.copy(item.text);
      }
      return false;
    },
    [history, clipboard]
  );

  return {
    ...clipboard,
    copy,
    history,
    clearHistory,
    removeFromHistory,
    copyFromHistory,
  };
}

// =============================================================================
// TIMELOCK-SPECIFIC CLIPBOARD HOOKS
// =============================================================================

/**
 * Copy a wallet address with formatting.
 */
export function useCopyAddress(options: UseClipboardOptions = {}): {
  copy: (address: string) => Promise<boolean>;
  copyFormatted: (address: string, prefix?: string) => Promise<boolean>;
  copied: boolean;
  copiedAddress: string | null;
  reset: () => void;
} {
  const clipboard = useClipboard(options);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  const copy = useCallback(
    async (address: string): Promise<boolean> => {
      const result = await clipboard.copy(address);
      if (result) {
        setCopiedAddress(address);
      }
      return result;
    },
    [clipboard]
  );

  const copyFormatted = useCallback(
    async (address: string, prefix: string = ''): Promise<boolean> => {
      const formatted = prefix ? `${prefix}${address}` : address;
      const result = await clipboard.copy(formatted);
      if (result) {
        setCopiedAddress(address);
      }
      return result;
    },
    [clipboard]
  );

  const reset = useCallback(() => {
    clipboard.reset();
    setCopiedAddress(null);
  }, [clipboard]);

  return {
    copy,
    copyFormatted,
    copied: clipboard.copied,
    copiedAddress,
    reset,
  };
}

/**
 * Copy a transaction ID with optional explorer link.
 */
export function useCopyTransactionId(
  explorerBaseUrl: string = 'https://explorer.stacks.co/txid',
  options: UseClipboardOptions = {}
): {
  copyTxId: (txId: string) => Promise<boolean>;
  copyExplorerLink: (txId: string, network?: 'mainnet' | 'testnet') => Promise<boolean>;
  copied: boolean;
  copiedTxId: string | null;
  reset: () => void;
} {
  const clipboard = useClipboard(options);
  const [copiedTxId, setCopiedTxId] = useState<string | null>(null);

  const copyTxId = useCallback(
    async (txId: string): Promise<boolean> => {
      const result = await clipboard.copy(txId);
      if (result) {
        setCopiedTxId(txId);
      }
      return result;
    },
    [clipboard]
  );

  const copyExplorerLink = useCallback(
    async (txId: string, network: 'mainnet' | 'testnet' = 'mainnet'): Promise<boolean> => {
      const networkParam = network === 'testnet' ? '?chain=testnet' : '';
      const link = `${explorerBaseUrl}/${txId}${networkParam}`;
      const result = await clipboard.copy(link);
      if (result) {
        setCopiedTxId(txId);
      }
      return result;
    },
    [clipboard, explorerBaseUrl]
  );

  const reset = useCallback(() => {
    clipboard.reset();
    setCopiedTxId(null);
  }, [clipboard]);

  return {
    copyTxId,
    copyExplorerLink,
    copied: clipboard.copied,
    copiedTxId,
    reset,
  };
}

/**
 * Copy position details as formatted text.
 */
export interface TimelockPosition {
  id: string;
  amount: string;
  token: string;
  unlockTime: number;
  owner: string;
}

export function useCopyPositionDetails(options: UseClipboardOptions = {}): {
  copyPosition: (position: TimelockPosition) => Promise<boolean>;
  copyPositionId: (positionId: string) => Promise<boolean>;
  copyPositionAsJson: (position: TimelockPosition) => Promise<boolean>;
  copied: boolean;
  reset: () => void;
} {
  const clipboard = useClipboard(options);

  const copyPosition = useCallback(
    async (position: TimelockPosition): Promise<boolean> => {
      const unlockDate = new Date(position.unlockTime);
      const formatted = [
        `Position ID: ${position.id}`,
        `Amount: ${position.amount} ${position.token}`,
        `Unlock Time: ${unlockDate.toLocaleString()}`,
        `Owner: ${position.owner}`,
      ].join('\n');
      
      return clipboard.copy(formatted);
    },
    [clipboard]
  );

  const copyPositionId = useCallback(
    async (positionId: string): Promise<boolean> => {
      return clipboard.copy(positionId);
    },
    [clipboard]
  );

  const copyPositionAsJson = useCallback(
    async (position: TimelockPosition): Promise<boolean> => {
      return clipboard.copy(JSON.stringify(position, null, 2));
    },
    [clipboard]
  );

  return {
    copyPosition,
    copyPositionId,
    copyPositionAsJson,
    copied: clipboard.copied,
    reset: clipboard.reset,
  };
}

/**
 * Copy share link for a position.
 */
export function useCopyShareLink(
  baseUrl: string = '',
  options: UseClipboardOptions = {}
): {
  copyLink: (path: string) => Promise<boolean>;
  copyPositionLink: (positionId: string) => Promise<boolean>;
  copied: boolean;
  reset: () => void;
} {
  const clipboard = useClipboard(options);
  const effectiveBaseUrl = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');

  const copyLink = useCallback(
    async (path: string): Promise<boolean> => {
      const fullUrl = `${effectiveBaseUrl}${path.startsWith('/') ? path : `/${path}`}`;
      return clipboard.copy(fullUrl);
    },
    [clipboard, effectiveBaseUrl]
  );

  const copyPositionLink = useCallback(
    async (positionId: string): Promise<boolean> => {
      return copyLink(`/position/${positionId}`);
    },
    [copyLink]
  );

  return {
    copyLink,
    copyPositionLink,
    copied: clipboard.copied,
    reset: clipboard.reset,
  };
}

// =============================================================================
// UTILITY HOOK - Copy with feedback
// =============================================================================

interface UseCopyWithFeedbackReturn {
  copy: (text: string) => Promise<boolean>;
  copied: boolean;
  text: string | null;
  reset: () => void;
}

/**
 * Clipboard hook that tracks the last copied text.
 */
export function useCopyWithFeedback(
  options: UseClipboardOptions = {}
): UseCopyWithFeedbackReturn {
  const clipboard = useClipboard(options);
  const [text, setText] = useState<string | null>(null);

  const copy = useCallback(
    async (value: string): Promise<boolean> => {
      const result = await clipboard.copy(value);
      if (result) {
        setText(value);
      }
      return result;
    },
    [clipboard]
  );

  const reset = useCallback(() => {
    clipboard.reset();
    setText(null);
  }, [clipboard]);

  return {
    copy,
    copied: clipboard.copied,
    text,
    reset,
  };
}

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

export default useClipboard;
