import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility function to merge Tailwind CSS classes
 * Combines clsx for conditional classes and tailwind-merge for deduplication
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format STX amount from microSTX
 */
export function formatSTX(microSTX: number): string {
  return (microSTX / 1_000_000).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });
}

/**
 * Format address for display (truncated)
 */
export function formatAddress(address: string, chars = 4): string {
  if (!address) return '';
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

/**
 * Format date from unix timestamp
 */
export function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format relative time (e.g., "2 days ago", "in 3 hours")
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now() / 1000;
  const diff = timestamp - now;
  const absDiff = Math.abs(diff);
  
  const units = [
    { name: 'year', seconds: 31536000 },
    { name: 'month', seconds: 2592000 },
    { name: 'day', seconds: 86400 },
    { name: 'hour', seconds: 3600 },
    { name: 'minute', seconds: 60 },
  ];

  for (const unit of units) {
    if (absDiff >= unit.seconds) {
      const count = Math.floor(absDiff / unit.seconds);
      const plural = count !== 1 ? 's' : '';
      return diff > 0 
        ? `in ${count} ${unit.name}${plural}`
        : `${count} ${unit.name}${plural} ago`;
    }
  }
  
  return diff > 0 ? 'in a moment' : 'just now';
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
