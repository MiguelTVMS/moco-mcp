/**
 * Time utility functions for formatting and calculations
 */

/**
 * Converts decimal hours to HH:MM format
 * @param hours - Hours as decimal number (e.g., 2.5)
 * @returns Formatted time string (e.g., "2:30")
 */
export function formatHoursToHHMM(hours: number): string {
  if (hours < 0) {
    throw new Error('Hours cannot be negative');
  }

  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  
  // Handle edge case where rounding results in 60 minutes
  if (minutes === 60) {
    return `${wholeHours + 1}:00`;
  }
  
  return `${wholeHours}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * Sums an array of hour values
 * @param hours - Array of hour values to sum
 * @returns Total hours as decimal
 */
export function sumHours(hours: number[]): number {
  return hours.reduce((total, current) => total + current, 0);
}

/**
 * Converts hours to days (assuming 8 hours = 1 working day)
 * @param hours - Hours to convert
 * @returns Days as decimal (e.g., 4 hours = 0.5 days)
 */
export function hoursToDays(hours: number): number {
  const HOURS_PER_DAY = 8;
  return hours / HOURS_PER_DAY;
}

/**
 * Converts days to hours (assuming 8 hours = 1 working day)
 * @param days - Days to convert
 * @returns Hours as decimal
 */
export function daysToHours(days: number): number {
  const HOURS_PER_DAY = 8;
  return days * HOURS_PER_DAY;
}

/**
 * Rounds hours to 2 decimal places
 * @param hours - Hours to round
 * @returns Rounded hours
 */
export function roundHours(hours: number): number {
  return Math.round(hours * 100) / 100;
}

/**
 * Creates a time format object with both decimal and formatted representations
 * @param hours - Hours as decimal
 * @returns Object with hours and hoursFormatted properties
 */
export function createTimeFormat(hours: number): { hours: number; hoursFormatted: string } {
  return {
    hours: roundHours(hours),
    hoursFormatted: formatHoursToHHMM(hours)
  };
}