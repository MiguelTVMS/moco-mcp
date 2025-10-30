/**
 * MCP tools for User Sick Days management
 * Provides sick day tracking with comprehensive calculations and summaries
 */

import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { MocoApiService } from '../services/mocoApi.js';
import { validateYear } from '../utils/dateUtils.js';
import { createValidationErrorMessage } from '../utils/errorHandler.js';
import type { HolidaySummary } from '../types/mocoTypes.js';

// Schema for get_user_sick_days tool
const GetUserSickDaysSchema = z.object({
  year: z.number().int().describe('Year to retrieve sick days for (e.g., 2024)')
});

/**
 * Tool: get_user_sick_days
 * Retrieves user sick days for a specific year
 */
export const getUserSickDaysTool = {
  name: 'get_user_sick_days',
  description: 'Get all user sick days for a specific year with daily breakdown and total calculations',
  inputSchema: zodToJsonSchema(GetUserSickDaysSchema),
  handler: async (params: z.infer<typeof GetUserSickDaysSchema>): Promise<string> => {
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
      const sickDays = await apiService.getTakenSickDays(year);

      // Debug logging
      console.error(`DEBUG: Got ${sickDays.length} sick days for year ${year}`);
      console.error('DEBUG: Sick days data:', JSON.stringify(sickDays.slice(0, 3), null, 2));

      if (sickDays.length === 0) {
        return formatSickDaysWithNoData(year);
      }

      const summary = createSickDaysSummary(sickDays, year);
      console.error('DEBUG: Sick days summary created:', JSON.stringify(summary, null, 2));
      return formatSickDaysSummary(summary);

    } catch (error) {
      return `Error retrieving sick days for ${year}: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
};

/**
 * Creates a sick days summary from taken sick days
 */
function createSickDaysSummary(sickDays: any[], year: number): HolidaySummary {
  console.error('DEBUG: Processing sick days...');
  
  // Process sick days from schedules endpoint
  const processedSickDays = sickDays
    .map(schedule => ({
      date: schedule.date,
      days: calculateDaysFromSchedule(schedule), // Calculate days from am/pm flags
      status: 'sick', // All schedules are sick days
      note: schedule.comment || ''
    }))
    .sort((a, b) => a.date.localeCompare(b.date)); // Sort by date

  console.error('DEBUG: Processed sick days:', processedSickDays);

  // Calculate totals
  const totalSickDays = processedSickDays.reduce((total, sickDay) => total + sickDay.days, 0);

  return {
    year,
    holidays: processedSickDays, // Reuse the same structure
    totalTakenDays: Math.round(totalSickDays * 100) / 100, // Round to 2 decimal places
    annualEntitlementDays: 0, // Not applicable for sick days
    utilizationPercentage: 0, // Not applicable for sick days
    remainingDays: 0 // Not applicable for sick days
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
 * Formats the sick days summary into a readable string
 */
function formatSickDaysSummary(summary: HolidaySummary): string {
  const lines: string[] = [];
  
  lines.push(`Sick days overview for ${summary.year}:`);
  lines.push('');

  // Individual sick days
  if (summary.holidays.length > 0) {
    lines.push('Taken sick days:');
    summary.holidays.forEach(sickDay => {
      const dayText = sickDay.days === 1 ? 'day' : 'days';
      let line = `- ${sickDay.date}: ${sickDay.days} ${dayText}`;
      
      if (sickDay.note) {
        line += ` (${sickDay.note})`;
      }
      
      lines.push(line);
    });
    lines.push('');
  }

  // Summary statistics
  lines.push('Summary:');
  lines.push(`- Total sick days: ${summary.totalTakenDays} days`);

  return lines.join('\\n');
}

/**
 * Formats response when no sick day data is available
 */
function formatSickDaysWithNoData(year: number): string {
  const lines: string[] = [];
  
  lines.push(`Sick days overview for ${year}:`);
  lines.push('');
  lines.push('No sick days found.');
  lines.push('');
  lines.push('Summary:');
  lines.push('- Total sick days: 0 days');

  return lines.join('\\n');
}