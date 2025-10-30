/**
 * Date utility functions for validation and formatting
 */

/**
 * Validates if a string is in valid ISO 8601 date format (YYYY-MM-DD)
 * @param dateString - Date string to validate
 * @returns true if valid, false otherwise
 */
export function isValidDateFormat(dateString: string): boolean {
  // Basic format check: YYYY-MM-DD
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) {
    return false;
  }

  // Check if it's a valid date
  const date = new Date(dateString + 'T00:00:00.000Z'); // Ensure UTC
  
  // Check if date is invalid (NaN)
  if (isNaN(date.getTime())) {
    return false;
  }
  
  return date.toISOString().slice(0, 10) === dateString;
}

/**
 * Validates a date range ensuring start date is not after end date
 * @param startDate - Start date in ISO 8601 format
 * @param endDate - End date in ISO 8601 format
 * @returns true if valid range, false otherwise
 */
export function validateDateRange(startDate: string, endDate: string): boolean {
  if (!isValidDateFormat(startDate) || !isValidDateFormat(endDate)) {
    return false;
  }

  const start = new Date(startDate + 'T00:00:00.000Z');
  const end = new Date(endDate + 'T00:00:00.000Z');
  
  return start <= end;
}

/**
 * Validates a year ensuring it's reasonable (not too far in past/future)
 * @param year - Year to validate
 * @returns true if valid year, false otherwise
 */
export function validateYear(year: number): boolean {
  const currentYear = new Date().getFullYear();
  
  // Allow years from 2000 to current year + 1 (for planning purposes)
  return year >= 2000 && year <= currentYear + 1;
}

/**
 * Formats a Date object to ISO 8601 date string (YYYY-MM-DD)
 * @param date - Date object to format
 * @returns ISO 8601 date string
 */
export function formatDateISO(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Gets the first day of a year as ISO date string
 * @param year - Year
 * @returns ISO date string for January 1st
 */
export function getYearStart(year: number): string {
  return `${year}-01-01`;
}

/**
 * Gets the last day of a year as ISO date string
 * @param year - Year
 * @returns ISO date string for December 31st
 */
export function getYearEnd(year: number): string {
  return `${year}-12-31`;
}