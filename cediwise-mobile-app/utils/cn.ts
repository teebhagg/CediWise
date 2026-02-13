import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges Tailwind class names with proper deduplication and conflict resolution.
 * Use for conditional or composed classNames (e.g. cn('p-4', isActive && 'bg-primary')).
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
