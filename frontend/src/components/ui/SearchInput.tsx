'use client';

import React, { useState, useCallback, useRef, useEffect, forwardRef } from 'react';

// =============================================================================
// TYPES
// =============================================================================

interface SearchInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  onSearch?: (value: string) => void;
  onClear?: () => void;
  placeholder?: string;
  debounce?: number;
  showClearButton?: boolean;
  showSearchIcon?: boolean;
  loading?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'filled' | 'minimal';
  fullWidth?: boolean;
  className?: string;
  inputClassName?: string;
  iconClassName?: string;
  clearButtonClassName?: string;
  autoFocus?: boolean;
}

// =============================================================================
// ICONS
// =============================================================================

const SearchIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className={className || 'w-5 h-5'}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
    />
  </svg>
);

const ClearIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className={className || 'w-4 h-4'}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const LoadingSpinner: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={`animate-spin ${className || 'w-5 h-5'}`}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

// =============================================================================
// SIZE STYLES
// =============================================================================

const sizeStyles = {
  sm: {
    container: 'h-8',
    input: 'text-sm px-8',
    iconLeft: 'left-2 w-4 h-4',
    iconRight: 'right-2 w-4 h-4',
  },
  md: {
    container: 'h-10',
    input: 'text-base px-10',
    iconLeft: 'left-3 w-5 h-5',
    iconRight: 'right-3 w-5 h-5',
  },
  lg: {
    container: 'h-12',
    input: 'text-lg px-12',
    iconLeft: 'left-4 w-6 h-6',
    iconRight: 'right-4 w-6 h-6',
  },
};

const variantStyles = {
  default: {
    container: 'border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800',
    containerFocus: 'ring-2 ring-blue-500 ring-opacity-50 border-blue-500',
    input: 'bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500',
  },
  filled: {
    container: 'border-0 rounded-lg bg-gray-100 dark:bg-gray-700',
    containerFocus: 'ring-2 ring-blue-500 ring-opacity-50 bg-white dark:bg-gray-800',
    input: 'bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400',
  },
  minimal: {
    container: 'border-0 border-b-2 border-gray-200 dark:border-gray-600 rounded-none bg-transparent',
    containerFocus: 'border-blue-500',
    input: 'bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500',
  },
};

// =============================================================================
// SEARCH INPUT COMPONENT
// =============================================================================

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  (
    {
      value: controlledValue,
      defaultValue = '',
      onChange,
      onSearch,
      onClear,
      placeholder = 'Search...',
      debounce = 300,
      showClearButton = true,
      showSearchIcon = true,
      loading = false,
      size = 'md',
      variant = 'default',
      fullWidth = false,
      className = '',
      inputClassName = '',
      iconClassName = '',
      clearButtonClassName = '',
      autoFocus = false,
      disabled = false,
      ...inputProps
    },
    ref
  ) => {
    const isControlled = controlledValue !== undefined;
    const [internalValue, setInternalValue] = useState(defaultValue);
    const [isFocused, setIsFocused] = useState(false);
    const debounceRef = useRef<NodeJS.Timeout | null>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);

    const value = isControlled ? controlledValue : internalValue;

    // Combine refs
    const setRef = useCallback(
      (element: HTMLInputElement | null) => {
        inputRef.current = element;
        if (typeof ref === 'function') {
          ref(element);
        } else if (ref) {
          ref.current = element;
        }
      },
      [ref]
    );

    // Handle input change with debounce
    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;

        if (!isControlled) {
          setInternalValue(newValue);
        }

        onChange?.(newValue);

        // Debounced search callback
        if (onSearch) {
          if (debounceRef.current) {
            clearTimeout(debounceRef.current);
          }
          debounceRef.current = setTimeout(() => {
            onSearch(newValue);
          }, debounce);
        }
      },
      [isControlled, onChange, onSearch, debounce]
    );

    // Handle clear
    const handleClear = useCallback(() => {
      if (!isControlled) {
        setInternalValue('');
      }
      onChange?.('');
      onClear?.();
      onSearch?.('');
      inputRef.current?.focus();
    }, [isControlled, onChange, onClear, onSearch]);

    // Handle key press
    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && onSearch) {
          if (debounceRef.current) {
            clearTimeout(debounceRef.current);
          }
          onSearch(value);
        }
        if (e.key === 'Escape') {
          handleClear();
        }
      },
      [value, onSearch, handleClear]
    );

    // Cleanup debounce on unmount
    useEffect(() => {
      return () => {
        if (debounceRef.current) {
          clearTimeout(debounceRef.current);
        }
      };
    }, []);

    const sizeStyle = sizeStyles[size];
    const variantStyle = variantStyles[variant];
    const showClear = showClearButton && value && !disabled;

    return (
      <div
        className={`
          relative flex items-center transition-all duration-200
          ${sizeStyle.container}
          ${variantStyle.container}
          ${isFocused ? variantStyle.containerFocus : ''}
          ${fullWidth ? 'w-full' : 'w-auto'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${className}
        `}
      >
        {/* Search Icon */}
        {showSearchIcon && (
          <div
            className={`
              absolute ${sizeStyle.iconLeft} 
              flex items-center justify-center 
              text-gray-400 dark:text-gray-500 pointer-events-none
              ${iconClassName}
            `}
          >
            {loading ? (
              <LoadingSpinner className={sizeStyle.iconLeft.split(' ').slice(1).join(' ')} />
            ) : (
              <SearchIcon className={sizeStyle.iconLeft.split(' ').slice(1).join(' ')} />
            )}
          </div>
        )}

        {/* Input */}
        <input
          ref={setRef}
          type="text"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          className={`
            w-full h-full outline-none
            ${sizeStyle.input}
            ${variantStyle.input}
            ${!showSearchIcon ? 'pl-3' : ''}
            ${!showClear ? 'pr-3' : ''}
            ${disabled ? 'cursor-not-allowed' : ''}
            ${inputClassName}
          `}
          {...inputProps}
        />

        {/* Clear Button */}
        {showClear && (
          <button
            type="button"
            onClick={handleClear}
            className={`
              absolute ${sizeStyle.iconRight}
              flex items-center justify-center
              text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300
              transition-colors rounded-full p-0.5
              hover:bg-gray-100 dark:hover:bg-gray-700
              ${clearButtonClassName}
            `}
            aria-label="Clear search"
          >
            <ClearIcon className={sizeStyle.iconRight.split(' ').slice(1).join(' ')} />
          </button>
        )}
      </div>
    );
  }
);

SearchInput.displayName = 'SearchInput';

// =============================================================================
// SEARCH WITH SUGGESTIONS
// =============================================================================

interface SearchWithSuggestionsProps extends SearchInputProps {
  suggestions?: string[];
  onSuggestionSelect?: (suggestion: string) => void;
  showSuggestions?: boolean;
  maxSuggestions?: number;
  highlightMatch?: boolean;
  suggestionsClassName?: string;
}

export const SearchWithSuggestions: React.FC<SearchWithSuggestionsProps> = ({
  suggestions = [],
  onSuggestionSelect,
  showSuggestions = true,
  maxSuggestions = 5,
  highlightMatch = true,
  suggestionsClassName = '',
  value,
  onChange,
  onSearch,
  ...searchInputProps
}) => {
  const [internalValue, setInternalValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentValue = value ?? internalValue;

  const filteredSuggestions = showSuggestions
    ? suggestions
        .filter(s => s.toLowerCase().includes(currentValue.toLowerCase()))
        .slice(0, maxSuggestions)
    : [];

  const handleChange = (newValue: string) => {
    setInternalValue(newValue);
    onChange?.(newValue);
    setIsOpen(newValue.length > 0 && filteredSuggestions.length > 0);
    setSelectedIndex(-1);
  };

  const handleSelect = (suggestion: string) => {
    setInternalValue(suggestion);
    onChange?.(suggestion);
    onSuggestionSelect?.(suggestion);
    onSearch?.(suggestion);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, filteredSuggestions.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
        if (selectedIndex >= 0) {
          e.preventDefault();
          handleSelect(filteredSuggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Highlight matching text
  const highlightText = (text: string, query: string) => {
    if (!highlightMatch || !query) return text;

    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={i} className="bg-yellow-200 dark:bg-yellow-700 rounded px-0.5">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div ref={containerRef} className="relative">
      <SearchInput
        value={currentValue}
        onChange={handleChange}
        onSearch={onSearch}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsOpen(currentValue.length > 0 && filteredSuggestions.length > 0)}
        {...searchInputProps}
      />

      {isOpen && filteredSuggestions.length > 0 && (
        <ul
          className={`
            absolute z-50 w-full mt-1 py-1
            bg-white dark:bg-gray-800
            border border-gray-200 dark:border-gray-700
            rounded-lg shadow-lg max-h-60 overflow-auto
            ${suggestionsClassName}
          `}
        >
          {filteredSuggestions.map((suggestion, index) => (
            <li
              key={suggestion}
              onClick={() => handleSelect(suggestion)}
              className={`
                px-4 py-2 cursor-pointer
                ${index === selectedIndex
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                }
              `}
            >
              {highlightText(suggestion, currentValue)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// =============================================================================
// TIMELOCK-SPECIFIC SEARCH
// =============================================================================

interface PositionSearchProps extends Omit<SearchInputProps, 'placeholder'> {
  searchType?: 'all' | 'id' | 'address' | 'token';
}

export const PositionSearch: React.FC<PositionSearchProps> = ({
  searchType = 'all',
  ...props
}) => {
  const placeholders = {
    all: 'Search positions by ID, address, or token...',
    id: 'Search by position ID...',
    address: 'Search by wallet address...',
    token: 'Search by token symbol...',
  };

  return (
    <SearchInput
      placeholder={placeholders[searchType]}
      showSearchIcon={true}
      {...props}
    />
  );
};

interface TransactionSearchProps extends Omit<SearchInputProps, 'placeholder'> {
  network?: 'mainnet' | 'testnet';
}

export const TransactionSearch: React.FC<TransactionSearchProps> = ({
  network = 'mainnet',
  ...props
}) => {
  return (
    <SearchInput
      placeholder={`Search ${network} transaction ID...`}
      showSearchIcon={true}
      {...props}
    />
  );
};

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

export default SearchInput;
