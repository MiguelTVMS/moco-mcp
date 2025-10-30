/**
 * MCP tools for User Holidays management
 * Provides holiday tracking with comprehensive calculations and summaries
 */

import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { MocoApiService } from '../services/mocoApi.js';
import { validateYear } from '../utils/dateUtils.js';
import { hoursToDays, roundHours } from '../utils/timeUtils.js';
import { createValidationErrorMessage, createEmptyResultMessage } from '../utils/errorHandler.js';
import type { UserHoliday, HolidaySummary } from '../types/mocoTypes.js';

// Schema for get_user_holidays tool
const GetUserHolidaysSchema = z.object({
  year: z.number().int().describe('Year to retrieve holidays for (e.g., 2024)')
});

/**
 * Tool: get_user_holidays
 * Retrieves user holidays for a specific year with comprehensive calculations
 */
export const getUserHolidaysTool = {
  name: 'get_user_holidays',
  description: 'Get all user holidays for a specific year with utilization calculations and remaining vacation days',
  inputSchema: zodToJsonSchema(GetUserHolidaysSchema),
  handler: async (params: z.infer<typeof GetUserHolidaysSchema>): Promise<string> => {
    const { year } = params;

    // Validate year
    if (!validateYear(year)) {
      return createValidationErrorMessage({
        field: 'year',
        value: year,
        reason: 'invalid_year'
      });
    }

    try {
      const apiService = new MocoApiService();
      
      // Get both entitlements and actual taken holidays
      let entitlements: any[] = [];
      let takenHolidays: any[] = [];
      
      try {
        entitlements = await apiService.getUserHolidays(year);
      } catch (error) {
        console.error('DEBUG: Failed to get entitlements:', error);
      }
      
      try {
        console.error('DEBUG: About to call getTakenHolidays...');
        takenHolidays = await apiService.getTakenHolidays(year);
        console.error('DEBUG: getTakenHolidays returned:', takenHolidays.length, 'items');
      } catch (error) {
        console.error('DEBUG: Failed to get taken holidays:', error);
        console.error('DEBUG: Error details:', error instanceof Error ? error.message : 'Unknown error');
      }

      // Debug logging
      console.error(`DEBUG: Got ${entitlements.length} entitlements and ${takenHolidays.length} taken holidays for year ${year}`);
      console.error('DEBUG: Entitlements:', JSON.stringify(entitlements, null, 2));
      console.error('DEBUG: Taken holidays:', JSON.stringify(takenHolidays, null, 2));

      if (takenHolidays.length === 0) {
        // Show entitlement info if available, otherwise just empty
        return formatHolidaysWithNoData(year, entitlements);
      }

      const summary = createHolidaySummary(takenHolidays, entitlements, year);
      console.error('DEBUG: Summary created:', JSON.stringify(summary, null, 2));
      return formatHolidaysSummary(summary);

    } catch (error) {
      return `Error retrieving holidays for ${year}: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
};

/**
 * Creates a holiday summary from taken holidays and entitlements
 */
function createHolidaySummary(takenHolidays: any[], entitlements: any[], year: number): HolidaySummary {
  console.error('DEBUG: Processing taken holidays...');
  
  // Process taken holidays from schedules endpoint
  const processedHolidays = takenHolidays
    .map(schedule => ({
      date: schedule.date,
      days: calculateDaysFromSchedule(schedule), // Calculate days from am/pm flags
      status: 'taken', // All schedules are taken holidays
      note: schedule.comment || ''
    }))
    .sort((a, b) => a.date.localeCompare(b.date)); // Sort by date

  console.error('DEBUG: Processed holidays:', processedHolidays);

  // Calculate totals
  const totalTakenDays = processedHolidays.reduce((total, holiday) => total + holiday.days, 0);
  
  // Get entitlement from entitlements array
  const annualEntitlementDays = entitlements.length > 0 ? entitlements[0].days || 0 : 0;
  
  // Calculate utilization and remaining days
  const utilizationPercentage = annualEntitlementDays > 0 
    ? Math.round((totalTakenDays / annualEntitlementDays) * 100)
    : 0;
  
  const remainingDays = Math.max(0, annualEntitlementDays - totalTakenDays);

  return {
    year,
    holidays: processedHolidays,
    totalTakenDays: roundHours(totalTakenDays),
    annualEntitlementDays,
    utilizationPercentage,
    remainingDays: roundHours(remainingDays)
  };
}

/**
 * Calculate days from schedule entry based on am/pm flags
 */
function calculateDaysFromSchedule(schedule: any): number {
  // If schedule has am and pm flags, use them
  if (schedule.am !== undefined && schedule.pm !== undefined) {
    let days = 0;
    if (schedule.am) days += 0.5;
    if (schedule.pm) days += 0.5;
    return days;
  }
  
  // Otherwise assume full day
  return 1;
}

/**
 * Formats the holiday summary into a readable string
 */
function formatHolidaysSummary(summary: HolidaySummary): string {
  const lines: string[] = [];
  
  lines.push(`Holiday overview for ${summary.year}:`);
  lines.push('');

  // Individual holiday days
  if (summary.holidays.length > 0) {
    lines.push('Taken holiday days:');
    summary.holidays.forEach(holiday => {
      const dayText = holiday.days === 1 ? 'day' : 'days';
      let line = `- ${holiday.date}: ${holiday.days} ${dayText}`;
      
      if (holiday.note) {
        line += ` (${holiday.note})`;
      }
      
      lines.push(line);
    });
    lines.push('');
  }

  // Summary statistics
  lines.push('Summary:');
  lines.push(`- Taken vacation: ${summary.totalTakenDays} days`);
  if (summary.annualEntitlementDays > 0) {
    lines.push(`- Annual entitlement: ${summary.annualEntitlementDays} days`);
    lines.push(`- Utilization: ${summary.utilizationPercentage}% (${summary.totalTakenDays}/${summary.annualEntitlementDays})`);
    lines.push(`- Remaining vacation: ${summary.remainingDays} days`);
  }

  return lines.join('\\n');
}

/**
 * Formats response when no holiday data is available
 */
function formatHolidaysWithNoData(year: number, entitlements: any[] = []): string {
  const lines: string[] = [];
  
  lines.push(`Holiday overview for ${year}:`);
  lines.push('');
  lines.push('No holiday days found.');
  lines.push('');
  lines.push('Summary:');
  lines.push('- Taken vacation: 0 days');
  
  // Show entitlement if available
  if (entitlements.length > 0 && entitlements[0].days) {
    const entitlementDays = entitlements[0].days;
    lines.push(`- Annual entitlement: ${entitlementDays} days`);
    lines.push('- Utilization: 0%');
    lines.push(`- Remaining vacation: ${entitlementDays} days`);
  }

  return lines.join('\\n');
}