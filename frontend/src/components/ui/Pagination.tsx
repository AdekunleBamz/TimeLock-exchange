'use client';

import React, { useMemo, useCallback } from 'react';

// =============================================================================
// TYPES
// =============================================================================

type PaginationVariant = 'default' | 'minimal' | 'simple' | 'bordered';
type PaginationSize = 'sm' | 'md' | 'lg';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  variant?: PaginationVariant;
  size?: PaginationSize;
  siblingCount?: number;
  boundaryCount?: number;
  showFirstLast?: boolean;
  showPrevNext?: boolean;
  disabled?: boolean;
  className?: string;
}

interface PaginationButtonProps {
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  size: PaginationSize;
  variant: PaginationVariant;
  className?: string;
  children: React.ReactNode;
  'aria-label'?: string;
  'aria-current'?: 'page' | undefined;
}

interface PageSizeSelectorProps {
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  options?: number[];
  size?: PaginationSize;
  disabled?: boolean;
  className?: string;
}

interface PaginationInfoProps {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  className?: string;
}

// =============================================================================
// STYLES
// =============================================================================

const sizeStyles: Record<PaginationSize, string> = {
  sm: 'h-7 min-w-[1.75rem] px-2 text-xs',
  md: 'h-9 min-w-[2.25rem] px-3 text-sm',
  lg: 'h-11 min-w-[2.75rem] px-4 text-base',
};

const variantStyles: Record<PaginationVariant, { base: string; active: string; hover: string }> = {
  default: {
    base: 'rounded-md',
    active: 'bg-blue-600 text-white',
    hover: 'hover:bg-gray-100 dark:hover:bg-gray-800',
  },
  minimal: {
    base: '',
    active: 'text-blue-600 dark:text-blue-400 font-semibold',
    hover: 'hover:text-blue-600 dark:hover:text-blue-400',
  },
  simple: {
    base: 'rounded-full',
    active: 'bg-blue-600 text-white',
    hover: 'hover:bg-gray-100 dark:hover:bg-gray-800',
  },
  bordered: {
    base: 'border border-gray-300 dark:border-gray-600 rounded-md',
    active: 'bg-blue-600 text-white border-blue-600',
    hover: 'hover:bg-gray-50 dark:hover:bg-gray-800',
  },
};

// =============================================================================
// PAGINATION BUTTON
// =============================================================================

function PaginationButton({
  onClick,
  disabled = false,
  active = false,
  size,
  variant,
  className = '',
  children,
  'aria-label': ariaLabel,
  'aria-current': ariaCurrent,
}: PaginationButtonProps) {
  const styles = variantStyles[variant];

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-current={ariaCurrent}
      className={`
        inline-flex items-center justify-center font-medium transition-colors
        focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed
        ${sizeStyles[size]}
        ${styles.base}
        ${active ? styles.active : `text-gray-700 dark:text-gray-300 ${styles.hover}`}
        ${className}
      `}
    >
      {children}
    </button>
  );
}

// =============================================================================
// PAGINATION HELPERS
// =============================================================================

const ELLIPSIS = '...';

function usePaginationRange(
  currentPage: number,
  totalPages: number,
  siblingCount: number,
  boundaryCount: number
): (number | typeof ELLIPSIS)[] {
  return useMemo(() => {
    const totalPageNumbers = siblingCount * 2 + 3 + boundaryCount * 2;

    if (totalPageNumbers >= totalPages) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const leftSiblingIndex = Math.max(currentPage - siblingCount, boundaryCount + 1);
    const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages - boundaryCount);

    const shouldShowLeftEllipsis = leftSiblingIndex > boundaryCount + 2;
    const shouldShowRightEllipsis = rightSiblingIndex < totalPages - boundaryCount - 1;

    const firstPageIndex = 1;
    const lastPageIndex = totalPages;

    // Left boundary pages
    const leftBoundary = Array.from({ length: boundaryCount }, (_, i) => i + 1);
    // Right boundary pages
    const rightBoundary = Array.from(
      { length: boundaryCount },
      (_, i) => totalPages - boundaryCount + i + 1
    );

    if (!shouldShowLeftEllipsis && shouldShowRightEllipsis) {
      const leftItemCount = 3 + 2 * siblingCount;
      const leftRange = Array.from({ length: leftItemCount }, (_, i) => i + 1);
      return [...leftRange, ELLIPSIS, ...rightBoundary.filter(p => p > leftItemCount)];
    }

    if (shouldShowLeftEllipsis && !shouldShowRightEllipsis) {
      const rightItemCount = 3 + 2 * siblingCount;
      const rightRange = Array.from(
        { length: rightItemCount },
        (_, i) => totalPages - rightItemCount + i + 1
      );
      return [
        ...leftBoundary.filter(p => p < totalPages - rightItemCount + 1),
        ELLIPSIS,
        ...rightRange,
      ];
    }

    const middleRange = Array.from(
      { length: rightSiblingIndex - leftSiblingIndex + 1 },
      (_, i) => leftSiblingIndex + i
    );

    return [
      ...leftBoundary,
      ELLIPSIS,
      ...middleRange,
      ELLIPSIS,
      ...rightBoundary,
    ];
  }, [currentPage, totalPages, siblingCount, boundaryCount]);
}

// =============================================================================
// PAGINATION COMPONENT
// =============================================================================

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  variant = 'default',
  size = 'md',
  siblingCount = 1,
  boundaryCount = 1,
  showFirstLast = true,
  showPrevNext = true,
  disabled = false,
  className = '',
}: PaginationProps) {
  const paginationRange = usePaginationRange(currentPage, totalPages, siblingCount, boundaryCount);

  const handlePrevious = useCallback(() => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  }, [currentPage, onPageChange]);

  const handleNext = useCallback(() => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  }, [currentPage, totalPages, onPageChange]);

  const handleFirst = useCallback(() => {
    onPageChange(1);
  }, [onPageChange]);

  const handleLast = useCallback(() => {
    onPageChange(totalPages);
  }, [totalPages, onPageChange]);

  if (totalPages <= 1) {
    return null;
  }

  const isFirstPage = currentPage === 1;
  const isLastPage = currentPage === totalPages;

  return (
    <nav
      role="navigation"
      aria-label="Pagination"
      className={`flex items-center gap-1 ${className}`}
    >
      {showFirstLast && (
        <PaginationButton
          onClick={handleFirst}
          disabled={disabled || isFirstPage}
          size={size}
          variant={variant}
          aria-label="Go to first page"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </PaginationButton>
      )}

      {showPrevNext && (
        <PaginationButton
          onClick={handlePrevious}
          disabled={disabled || isFirstPage}
          size={size}
          variant={variant}
          aria-label="Go to previous page"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </PaginationButton>
      )}

      {paginationRange.map((pageNumber, index) => {
        if (pageNumber === ELLIPSIS) {
          return (
            <span
              key={`ellipsis-${index}`}
              className={`${sizeStyles[size]} inline-flex items-center justify-center text-gray-500`}
            >
              {ELLIPSIS}
            </span>
          );
        }

        return (
          <PaginationButton
            key={pageNumber}
            onClick={() => onPageChange(pageNumber as number)}
            disabled={disabled}
            active={currentPage === pageNumber}
            size={size}
            variant={variant}
            aria-label={`Go to page ${pageNumber}`}
            aria-current={currentPage === pageNumber ? 'page' : undefined}
          >
            {pageNumber}
          </PaginationButton>
        );
      })}

      {showPrevNext && (
        <PaginationButton
          onClick={handleNext}
          disabled={disabled || isLastPage}
          size={size}
          variant={variant}
          aria-label="Go to next page"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </PaginationButton>
      )}

      {showFirstLast && (
        <PaginationButton
          onClick={handleLast}
          disabled={disabled || isLastPage}
          size={size}
          variant={variant}
          aria-label="Go to last page"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </PaginationButton>
      )}
    </nav>
  );
}

// =============================================================================
// PAGE SIZE SELECTOR
// =============================================================================

export function PageSizeSelector({
  pageSize,
  onPageSizeChange,
  options = [10, 25, 50, 100],
  size = 'md',
  disabled = false,
  className = '',
}: PageSizeSelectorProps) {
  const sizeClasses: Record<PaginationSize, string> = {
    sm: 'h-7 text-xs px-2',
    md: 'h-9 text-sm px-3',
    lg: 'h-11 text-base px-4',
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <label className="text-sm text-gray-600 dark:text-gray-400">Show</label>
      <select
        value={pageSize}
        onChange={(e) => onPageSizeChange(Number(e.target.value))}
        disabled={disabled}
        className={`
          ${sizeClasses[size]}
          rounded-md border border-gray-300 dark:border-gray-600
          bg-white dark:bg-gray-800 text-gray-900 dark:text-white
          focus:outline-none focus:ring-2 focus:ring-blue-500
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <label className="text-sm text-gray-600 dark:text-gray-400">per page</label>
    </div>
  );
}

// =============================================================================
// PAGINATION INFO
// =============================================================================

export function PaginationInfo({
  currentPage,
  pageSize,
  totalItems,
  className = '',
}: PaginationInfoProps) {
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <p className={`text-sm text-gray-600 dark:text-gray-400 ${className}`}>
      Showing <span className="font-medium text-gray-900 dark:text-white">{startItem}</span> to{' '}
      <span className="font-medium text-gray-900 dark:text-white">{endItem}</span> of{' '}
      <span className="font-medium text-gray-900 dark:text-white">{totalItems}</span> results
    </p>
  );
}

// =============================================================================
// FULL PAGINATION COMPONENT
// =============================================================================

interface FullPaginationProps extends PaginationProps {
  pageSize: number;
  totalItems: number;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  showInfo?: boolean;
  showPageSize?: boolean;
}

export function FullPagination({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  showInfo = true,
  showPageSize = true,
  ...paginationProps
}: FullPaginationProps) {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        {showInfo && (
          <PaginationInfo
            currentPage={currentPage}
            pageSize={pageSize}
            totalItems={totalItems}
          />
        )}
        {showPageSize && onPageSizeChange && (
          <PageSizeSelector
            pageSize={pageSize}
            onPageSizeChange={onPageSizeChange}
            options={pageSizeOptions}
            size={paginationProps.size}
            disabled={paginationProps.disabled}
          />
        )}
      </div>
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
        {...paginationProps}
      />
    </div>
  );
}

// =============================================================================
// HOOK FOR PAGINATION STATE
// =============================================================================

interface UsePaginationOptions {
  initialPage?: number;
  initialPageSize?: number;
  totalItems: number;
}

export function usePagination({
  initialPage = 1,
  initialPageSize = 10,
  totalItems,
}: UsePaginationOptions) {
  const [currentPage, setCurrentPage] = React.useState(initialPage);
  const [pageSize, setPageSize] = React.useState(initialPageSize);

  const totalPages = Math.ceil(totalItems / pageSize);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(Math.min(Math.max(1, page), totalPages));
  }, [totalPages]);

  const handlePageSizeChange = useCallback((size: number) => {
    setPageSize(size);
    setCurrentPage(1); // Reset to first page when page size changes
  }, []);

  // Adjust current page if it exceeds total pages
  React.useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  return {
    currentPage,
    pageSize,
    totalPages,
    onPageChange: handlePageChange,
    onPageSizeChange: handlePageSizeChange,
    startIndex: (currentPage - 1) * pageSize,
    endIndex: Math.min(currentPage * pageSize, totalItems),
  };
}

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

export default Pagination;
