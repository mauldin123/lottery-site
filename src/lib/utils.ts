/**
 * Utility functions for formatting and display
 */

/**
 * Format a number to a specified number of decimal places
 * @param value - The number to format
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted string
 */
export function formatNumber(value: number, decimals: number = 1): string {
  if (isNaN(value) || !isFinite(value)) return "0";
  return value.toFixed(decimals);
}

/**
 * Format a percentage value
 * @param value - The percentage value (0-100)
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted percentage string
 */
export function formatPercent(value: number, decimals: number = 1): string {
  if (isNaN(value) || !isFinite(value)) return "0%";
  return `${formatNumber(value, decimals)}%`;
}

/**
 * Format a number with locale-specific formatting (commas, etc.)
 * @param value - The number to format
 * @returns Formatted string with locale formatting
 */
export function formatNumberLocale(value: number): string {
  if (isNaN(value) || !isFinite(value)) return "0";
  return value.toLocaleString();
}

/**
 * Round a number to a specified number of decimal places
 * @param value - The number to round
 * @param decimals - Number of decimal places (default: 1)
 * @returns Rounded number
 */
export function roundTo(value: number, decimals: number = 1): number {
  if (isNaN(value) || !isFinite(value)) return 0;
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

