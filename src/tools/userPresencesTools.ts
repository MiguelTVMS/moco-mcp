/**
 * MCP tools for User Presences management
 * Provides attendance tracking with daily aggregation and summation
 */

import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { MocoApiService } from '../services/mocoApi.js';
import { validateDateRange } from '../utils/dateUtils.js';
import { createTimeFormat, sumHours, roundHours } from '../utils/timeUtils.js';
import { createValidationErrorMessage, createEmptyResultMessage } from '../utils/errorHandler.js';
import type { UserPresence, PresenceRangeSummary, DailyPresenceSummary } from '../types/mocoTypes.js';

// Schema for get_user_presences tool
const GetUserPresencesSchema = z.object({
  startDate: z.string().describe('Start date in ISO 8601 format (YYYY-MM-DD)'),
  endDate: z.string().describe('End date in ISO 8601 format (YYYY-MM-DD)')
});

/**
 * Tool: get_user_presences
 * Retrieves user presences within a date range with daily aggregation
 */
export const getUserPresencesTool = {
  name: 'get_user_presences',
  description: 'Get user presences within a date range with daily aggregation and total calculations',
  inputSchema: zodToJsonSchema(GetUserPresencesSchema),
  handler: async (params: z.infer<typeof GetUserPresencesSchema>): Promise<string> => {
    const { startDate, endDate } = params;

    // Validate date format and range
    if (!validateDateRange(startDate, endDate)) {
      return createValidationErrorMessage({
        field: 'dateRange',
        value: `${startDate} to ${endDate}`,
        reason: 'invalid_date_range'
      });
    }

    try {
      const apiService = new MocoApiService();
      const presences = await apiService.getUserPresences(startDate, endDate);

      if (presences.length === 0) {
        return createEmptyResultMessage({
          type: 'presences',
          startDate,
          endDate
        });
      }

      const summary = aggregatePresences(presences, startDate, endDate);
      return formatPresencesSummary(summary);

    } catch (error) {
      return `Error retrieving presences: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
};

/**
 * Aggregates presence data by date with comprehensive summation
 */
function aggregatePresences(presences: UserPresence[], startDate: string, endDate: string): PresenceRangeSummary {
  // Group presences by date and calculate daily totals
  const presencesByDate = new Map<string, UserPresence[]>();
  
  presences.forEach(presence => {
    if (!presencesByDate.has(presence.date)) {
      presencesByDate.set(presence.date, []);
    }
    presencesByDate.get(presence.date)!.push(presence);
  });

  // Create daily summaries
  const dailySummaries: DailyPresenceSummary[] = [];
  
  // Sort dates for consistent output
  const sortedDates = Array.from(presencesByDate.keys()).sort();
  
  sortedDates.forEach(date => {
    const dayPresences = presencesByDate.get(date)!;
    const dailySummary = createDailyPresenceSummary(date, dayPresences);
    dailySummaries.push(dailySummary);
  });

  // Calculate grand total
  const grandTotalHours = sumHours(dailySummaries.map(day => day.totalHours));

  return {
    startDate,
    endDate,
    dailySummaries,
    grandTotal: createTimeFormat(grandTotalHours)
  };
}

/**
 * Creates a daily presence summary from presence records for a single date
 */
function createDailyPresenceSummary(date: string, presences: UserPresence[]): DailyPresenceSummary {
  // Calculate total hours for the day
  // Only count presences that have both 'from' and 'to' times (completed presences)
  const completedPresences = presences.filter(presence => presence.from && presence.to);
  
  const totalHours = completedPresences.reduce((total, presence) => {
    const hours = calculateHoursFromTimes(presence.from!, presence.to!);
    return total + hours;
  }, 0);

  return {
    date,
    totalHours: roundHours(totalHours),
    totalHoursFormatted: createTimeFormat(totalHours).hoursFormatted
  };
}

/**
 * Calculate hours between two time strings (HH:MM format)
 */
function calculateHoursFromTimes(fromTime: string, toTime: string): number {
  try {
    const [fromHours, fromMinutes] = fromTime.split(':').map(Number);
    const [toHours, toMinutes] = toTime.split(':').map(Number);
    
    const fromTotalMinutes = fromHours * 60 + fromMinutes;
    const toTotalMinutes = toHours * 60 + toMinutes;
    
    // Handle case where 'to' time is next day (crosses midnight)
    const diffMinutes = toTotalMinutes >= fromTotalMinutes 
      ? toTotalMinutes - fromTotalMinutes
      : (24 * 60) - fromTotalMinutes + toTotalMinutes;
    
    return diffMinutes / 60; // Convert minutes to hours
    
  } catch (error) {
    console.error(`Error calculating hours from ${fromTime} to ${toTime}:`, error);
    return 0;
  }
}

/**
 * Formats the presence summary into a readable string
 */
function formatPresencesSummary(summary: PresenceRangeSummary): string {
  const lines: string[] = [];
  
  lines.push(`Presences from ${summary.startDate} to ${summary.endDate}:`);
  lines.push('');

  // Daily summaries
  if (summary.dailySummaries.length > 0) {
    lines.push('Daily presences:');
    summary.dailySummaries.forEach(day => {
      lines.push(`- ${day.date}: ${day.totalHours}h (${day.totalHoursFormatted})`);
    });
    lines.push('');
  }

  // Grand total
  lines.push(`Grand total: ${summary.grandTotal.hours}h (${summary.grandTotal.hoursFormatted})`);

  // Additional statistics
  if (summary.dailySummaries.length > 0) {
    const workingDays = summary.dailySummaries.length;
    const averageHoursPerDay = roundHours(summary.grandTotal.hours / workingDays);
    
    lines.push('');
    lines.push('Statistics:');
    lines.push(`- Working days: ${workingDays}`);
    lines.push(`- Average per day: ${averageHoursPerDay}h (${createTimeFormat(averageHoursPerDay).hoursFormatted})`);
  }

  return lines.join('\\n');
}