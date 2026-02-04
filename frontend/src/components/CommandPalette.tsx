'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useDebounce } from '../hooks/useDebounce';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';

interface SearchResult {
  id: string;
  type: 'position' | 'transaction' | 'address' | 'block';
  title: string;
  subtitle?: string;
  icon?: string;
  href?: string;
  action?: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect?: (result: SearchResult) => void;
}

export function CommandPalette({ isOpen, onClose, onSelect }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const debouncedQuery = useDebounce(query, 200);

  // Quick actions available when search is empty
  const quickActions: SearchResult[] = useMemo(() => [
    {
      id: 'new-position',
      type: 'position' as const,
      title: 'Create New Position',
      subtitle: 'Lock STX for a specified duration',
      icon: '➕',
    },
    {
      id: 'view-positions',
      type: 'position' as const,
      title: 'View All Positions',
      subtitle: 'See your active and claimed positions',
      icon: '📊',
    },
    {
      id: 'view-history',
      type: 'transaction' as const,
      title: 'Transaction History',
      subtitle: 'View all your past activities',
      icon: '📜',
    },
    {
      id: 'settings',
      type: 'position' as const,
      title: 'Open Settings',
      subtitle: 'Customize your experience',
      icon: '⚙️',
    },
    {
      id: 'help',
      type: 'position' as const,
      title: 'Help & Shortcuts',
      subtitle: 'View keyboard shortcuts and help',
      icon: '❓',
    },
  ], []);

  // Search function
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults(quickActions);
      return;
    }

    setIsLoading(true);

    try {
      const searchResults: SearchResult[] = [];

      // Check if it's a position ID
      if (/^\d+$/.test(searchQuery)) {
        searchResults.push({
          id: `position-${searchQuery}`,
          type: 'position',
          title: `Position #${searchQuery}`,
          subtitle: 'View position details',
          icon: '📍',
          href: `/positions/${searchQuery}`,
        });
      }

      // Check if it's an address
      if (searchQuery.startsWith('ST') || searchQuery.startsWith('SP')) {
        searchResults.push({
          id: `address-${searchQuery}`,
          type: 'address',
          title: searchQuery,
          subtitle: 'View address details',
          icon: '👤',
          href: `/address/${searchQuery}`,
        });
      }

      // Check if it's a transaction hash
      if (searchQuery.startsWith('0x') && searchQuery.length > 10) {
        searchResults.push({
          id: `tx-${searchQuery}`,
          type: 'transaction',
          title: `Transaction ${searchQuery.slice(0, 10)}...`,
          subtitle: 'View transaction details',
          icon: '📄',
          href: `https://explorer.stacks.co/txid/${searchQuery}`,
        });
      }

      // Check if it's a block height
      if (/^\d+$/.test(searchQuery) && parseInt(searchQuery) > 1000) {
        searchResults.push({
          id: `block-${searchQuery}`,
          type: 'block',
          title: `Block #${searchQuery}`,
          subtitle: 'View block details',
          icon: '🧊',
          href: `https://explorer.stacks.co/block/${searchQuery}`,
        });
      }

      // Filter quick actions by query
      const matchingActions = quickActions.filter(
        action =>
          action.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          action.subtitle?.toLowerCase().includes(searchQuery.toLowerCase())
      );

      setResults([...searchResults, ...matchingActions]);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [quickActions]);

  // Perform search when query changes
  useEffect(() => {
    performSearch(debouncedQuery);
  }, [debouncedQuery, performSearch]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Scroll selected item into view
  useEffect(() => {
    if (resultsRef.current) {
      const selectedElement = resultsRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  // Keyboard navigation
  useKeyboardShortcuts([
    {
      key: 'ArrowDown',
      action: () => setSelectedIndex(i => Math.min(i + 1, results.length - 1)),
      description: 'Move down',
    },
    {
      key: 'ArrowUp',
      action: () => setSelectedIndex(i => Math.max(i - 1, 0)),
      description: 'Move up',
    },
    {
      key: 'Enter',
      action: () => {
        if (results[selectedIndex]) {
          handleSelect(results[selectedIndex]);
        }
      },
      description: 'Select',
    },
    {
      key: 'Escape',
      action: onClose,
      description: 'Close',
    },
  ], { enabled: isOpen });

  const handleSelect = (result: SearchResult) => {
    if (result.action) {
      result.action();
    } else if (result.href) {
      if (result.href.startsWith('http')) {
        window.open(result.href, '_blank');
      } else {
        window.location.href = result.href;
      }
    }
    onSelect?.(result);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Command Palette */}
      <div className="relative z-10 w-full max-w-xl mx-4 bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center px-4 border-b border-gray-200 dark:border-gray-800">
          <svg
            className="w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search positions, addresses, transactions..."
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            className="flex-1 px-4 py-4 bg-transparent text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none text-base"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
          />
          {isLoading && (
            <div className="animate-spin w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full" />
          )}
          <kbd className="hidden sm:flex items-center justify-center px-2 py-1 ml-2 text-xs font-mono text-gray-500 bg-gray-100 dark:bg-gray-800 rounded">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div
          ref={resultsRef}
          className="max-h-80 overflow-y-auto"
          role="listbox"
        >
          {results.length === 0 && query && !isLoading ? (
            <div className="px-4 py-8 text-center text-gray-500">
              <p>No results found for "{query}"</p>
              <p className="text-sm mt-2">Try searching for a position ID, address, or transaction</p>
            </div>
          ) : (
            results.map((result, index) => (
              <button
                key={result.id}
                onClick={() => handleSelect(result)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`w-full flex items-center gap-4 px-4 py-3 text-left transition-colors ${
                  index === selectedIndex
                    ? 'bg-[var(--color-primary-light)] dark:bg-gray-800'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                }`}
                role="option"
                aria-selected={index === selectedIndex}
              >
                <span className="text-2xl">{result.icon || '📄'}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white truncate">
                    {result.title}
                  </p>
                  {result.subtitle && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {result.subtitle}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <span className={`px-2 py-0.5 text-xs rounded-full ${
                    result.type === 'position' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' :
                    result.type === 'transaction' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
                    result.type === 'address' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' :
                    'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                  }`}>
                    {result.type}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">↑</kbd>
                <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">↓</kbd>
                navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">↵</kbd>
                select
              </span>
            </div>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">⌘</kbd>
              <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">K</kbd>
              to open
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Hook to manage command palette state
export function useCommandPalette() {
  const [isOpen, setIsOpen] = useState(false);

  useKeyboardShortcuts([
    {
      key: 'k',
      modifiers: { meta: true },
      action: () => setIsOpen(true),
      description: 'Open command palette',
    },
    {
      key: 'k',
      modifiers: { ctrl: true },
      action: () => setIsOpen(true),
      description: 'Open command palette',
    },
  ]);

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen(prev => !prev),
  };
}

export default CommandPalette;
