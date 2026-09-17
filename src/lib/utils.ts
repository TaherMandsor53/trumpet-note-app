import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Calculates whether a tune or note was created within the last 15 days.
 * Returns true if Date.now() - createdAt < 15 days in milliseconds.
 */
export function isTuneNew(createdAt: string | Date | undefined): boolean {
  if (!createdAt) return false;
  const createdTime = new Date(createdAt).getTime();
  if (isNaN(createdTime)) return false;
  
  const fifteenDaysInMs = 15 * 24 * 60 * 60 * 1000;
  const difference = Date.now() - createdTime;
  
  return difference >= 0 && difference < fifteenDaysInMs;
}

/**
 * Formats a currency amount into standard INR notation
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Formats an ISO date string into human readable format
 */
export function formatDate(dateString: string | undefined): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}

/**
 * Days remaining until the "NEW" badge expires
 */
export function getDaysRemainingForNewBadge(createdAt: string | Date): number {
  const createdTime = new Date(createdAt).getTime();
  const fifteenDaysInMs = 15 * 24 * 60 * 60 * 1000;
  const expiryTime = createdTime + fifteenDaysInMs;
  const remainingMs = expiryTime - Date.now();
  if (remainingMs <= 0) return 0;
  return Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
}
