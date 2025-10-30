/**
 * MCP tools for Public Holidays management
 * Provides public holiday tracking with comprehensive listing and aggregation
 */

import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { MocoApiService } from '../services/mocoApi.js';
import { createValidationErrorMessage, createEmptyResultMessage } from '../utils/errorHandler.js';

// Schema for get_public_holidays tool
const GetPublicHolidaysSchema = z.object({
  year: z.number().int().min(2000).max(2100).describe('Year to retrieve public holidays for (e.g., 2024)')
});

/**
 * Tool: get_public_holidays
 * Retrieves all public holidays for a specific year
 */
export const getPublicHolidaysTool = {
  name: 'get_public_holidays',
  description: 'Get all public holidays for a specific year with daily breakdown and total calculations',
  inputSchema: zodToJsonSchema(GetPublicHolidaysSchema),
  handler: async (params: z.infer<typeof GetPublicHolidaysSchema>): Promise<string> => {
    const { year } = params;

    // Validate year parameter
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      return createValidationErrorMessage({
        field: 'year',
        value: year,
        reason: 'invalid_year_range'
      });
    }

    try {
      const apiService = new MocoApiService();
      const publicHolidays = await apiService.getPublicHolidays(year);

      if (publicHolidays.length === 0) {
        return createEmptyResultMessage({
          type: 'public_holidays',
          year
        });
      }

      return formatPublicHolidaysSummary(publicHolidays, year);

    } catch (error) {
      return `Error retrieving public holidays for ${year}: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
};

/**
 * Formats public holidays data into a readable summary
 */
function formatPublicHolidaysSummary(holidays: any[], year: number): string {
  const lines: string[] = [];
  
  lines.push(`Public holidays for ${year}:`);
  lines.push('');

  if (holidays.length > 0) {
    // Sort holidays by date
    const sortedHolidays = holidays.sort((a, b) => a.date.localeCompare(b.date));
    
    lines.push('Holiday dates:');
    sortedHolidays.forEach(holiday => {
      const holidayName = holiday.assignment?.name || 'Public Holiday';
      const date = holiday.date;
      lines.push(`- ${date}: ${holidayName}`);
    });
    lines.push('');
  }

  // Summary statistics
  lines.push('Summary:');
  lines.push(`- Total public holidays: ${holidays.length} days`);
  
  // Calculate remaining working days (rough estimate: 365 - weekends - holidays)
  const totalDaysInYear = isLeapYear(year) ? 366 : 365;
  const approximateWeekends = Math.floor(totalDaysInYear / 7) * 2;
  const approximateWorkingDays = totalDaysInYear - approximateWeekends - holidays.length;
  
  lines.push(`- Approximate working days: ${approximateWorkingDays} days`);

  return lines.join('\\n');
}

/**
 * Check if a year is a leap year
 */
function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}