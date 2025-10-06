/**
 * Date utility functions to ensure consistent formatting and prevent hydration errors
 */

/**
 * Format date in a consistent way that won't cause hydration mismatches
 * @param date - Date object or date string
 * @returns Formatted date string in YYYY/MM/DD format
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Format date with time in a consistent way
 * @param date - Date object or date string
 * @returns Formatted date-time string in YYYY/MM/DD HH:MM format
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return `${formatDate(d)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/**
 * Get short month name (prevents locale-dependent hydration issues)
 * @param date - Date object
 * @returns Short month name (Jan, Feb, etc.)
 */
export function getShortMonthName(date: Date): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  return months[date.getMonth()]
}

/**
 * Check if a date is today
 * @param date - Date object or date string
 * @returns True if the date is today
 */
export function isToday(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date
  const today = new Date()
  return d.getDate() === today.getDate() &&
         d.getMonth() === today.getMonth() &&
         d.getFullYear() === today.getFullYear()
}

/**
 * Check if a date is in the past
 * @param date - Date object or date string
 * @returns True if the date is in the past
 */
export function isPast(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date
  return d < new Date()
}