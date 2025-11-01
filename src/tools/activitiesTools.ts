/**
 * MCP tools for Activities management
 * Provides time tracking data with automatic aggregation and summation
 */

import { string, z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { MocoApiService } from '../services/mocoApi.js';
import { validateDateRange } from '../utils/dateUtils.js';
import { createTimeFormat, sumHours } from '../utils/timeUtils.js';
import { createValidationErrorMessage, createEmptyResultMessage } from '../utils/errorHandler.js';
import type {
  Activity,
  ActivityRangeSummary,
  DailyActivitySummary,
  ProjectActivitySummary,
  TaskActivitySummary
} from '../types/mocoTypes.js';

// Schema for get_activities tool parameters
const GetActivitiesSchema = z.object({
  startDate: z.string().describe('Start date in ISO 8601 format (YYYY-MM-DD)'),
  endDate: z.string().describe('End date in ISO 8601 format (YYYY-MM-DD)'),
  projectId: z.number().positive().optional().describe('Optional project ID to filter activities for a specific project')
});

/**
 * Tool: get_activities
 * Retrieves activities within a date range with comprehensive aggregation
 */
export const getActivitiesTool = {
  name: 'get_activities',
  description: 'Get all activities within a date range with automatic summation by date, project, and task. Optionally filter by project ID.',
  inputSchema: zodToJsonSchema(GetActivitiesSchema),
  handler: async (params: z.infer<typeof GetActivitiesSchema>): Promise<string> => {
    const { startDate, endDate, projectId } = params;

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
      const activities = await apiService.getActivities(startDate, endDate, projectId);

      if (activities.length === 0) {
        return createEmptyResultMessage({
          type: 'activities',
          startDate,
          endDate,
          projectId
        });
      }

      const summary = aggregateActivities(activities, startDate, endDate);
      return formatActivitiesSummary(summary, projectId);

    } catch (error) {
      return `Error retrieving activities: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
};

/**
 * Aggregates activities into a comprehensive summary structure
 * Groups by date -> project -> task with all necessary totals
 */
function aggregateActivities(activities: Activity[], startDate: string, endDate: string): ActivityRangeSummary {
  // Group activities by date
  const activitiesByDate = new Map<string, Activity[]>();

  activities.forEach(activity => {
    if (!activitiesByDate.has(activity.date)) {
      activitiesByDate.set(activity.date, []);
    }
    activitiesByDate.get(activity.date)!.push(activity);
  });

  // Create daily summaries
  const dailySummaries: DailyActivitySummary[] = [];
  const projectTotalsMap = new Map<number, {
    projectName: string;
    totalHours: number;
    tasks: Map<number, { taskName: string; totalHours: number; billable: boolean }>;
  }>();

  // Sort dates for consistent output
  const sortedDates = Array.from(activitiesByDate.keys()).sort();

  sortedDates.forEach(date => {
    const dayActivities = activitiesByDate.get(date)!;
    const dailySummary = createDailySummary(date, dayActivities);
    dailySummaries.push(dailySummary);

    // Accumulate project totals across all days
    dailySummary.projects.forEach(project => {
      if (!projectTotalsMap.has(project.projectId)) {
        projectTotalsMap.set(project.projectId, {
          projectName: project.projectName,
          totalHours: 0,
          tasks: new Map()
        });
      }

      const projectTotal = projectTotalsMap.get(project.projectId)!;
      projectTotal.totalHours += project.projectTotal.hours;

      project.tasks.forEach(task => {
        if (!projectTotal.tasks.has(task.taskId)) {
          projectTotal.tasks.set(task.taskId, {
            taskName: task.taskName,
            totalHours: 0,
            billable: task.billable
          });
        }
        projectTotal.tasks.get(task.taskId)!.totalHours += task.hours;
      });
    });
  });

  // Convert project totals map to array format
  const projectTotals = Array.from(projectTotalsMap.entries()).map(([projectId, data]) => ({
    projectId,
    projectName: data.projectName,
    total: createTimeFormat(data.totalHours),
    tasks: Array.from(data.tasks.entries()).map(([taskId, taskData]) => ({
      taskId,
      taskName: taskData.taskName,
      total: createTimeFormat(taskData.totalHours),
      billable: taskData.billable
    }))
  }));

  // Calculate grand total
  const grandTotalHours = sumHours(dailySummaries.map(day => day.dailyTotal.hours));

  return {
    startDate,
    endDate,
    dailySummaries,
    projectTotals,
    grandTotal: createTimeFormat(grandTotalHours)
  };
}

/**
 * Creates a daily summary from activities for a single date
 */
function createDailySummary(date: string, activities: Activity[]): DailyActivitySummary {
  // Group by project
  const projectsMap = new Map<number, {
    projectName: string;
    tasks: Map<number, { taskName: string; hours: number; billable: boolean }>;
  }>();

  activities.forEach(activity => {
    if (!projectsMap.has(activity.project.id)) {
      projectsMap.set(activity.project.id, {
        projectName: activity.project.name,
        tasks: new Map()
      });
    }

    const project = projectsMap.get(activity.project.id)!;
    if (!project.tasks.has(activity.task.id)) {
      project.tasks.set(activity.task.id, {
        taskName: activity.task.name,
        hours: 0,
        billable: activity.billable
      });
    }

    project.tasks.get(activity.task.id)!.hours += activity.hours;
  });

  // Convert to structured format
  const projects: ProjectActivitySummary[] = Array.from(projectsMap.entries()).map(([projectId, projectData]) => {
    const tasks: TaskActivitySummary[] = Array.from(projectData.tasks.entries()).map(([taskId, taskData]) => ({
      taskId,
      taskName: taskData.taskName,
      hours: taskData.hours,
      hoursFormatted: createTimeFormat(taskData.hours).hoursFormatted,
      billable: taskData.billable
    }));

    const projectTotalHours = sumHours(tasks.map(task => task.hours));

    return {
      projectId,
      projectName: projectData.projectName,
      tasks,
      projectTotal: createTimeFormat(projectTotalHours)
    };
  });

  const dailyTotalHours = sumHours(projects.map(project => project.projectTotal.hours));

  return {
    date,
    projects,
    dailyTotal: createTimeFormat(dailyTotalHours)
  };
}

/**
 * Formats the activities summary into a readable string
 */
function formatActivitiesSummary(summary: ActivityRangeSummary, projectId?: number): string {
  const lines: string[] = [];

  const titleSuffix = projectId ? ` (filtered by project ID: ${projectId})` : '';
  lines.push(`Activities from ${summary.startDate} to ${summary.endDate}${titleSuffix}:`);
  lines.push('');

  // Daily summaries
  summary.dailySummaries.forEach(day => {
    lines.push(`${day.date}:`);

    day.projects.forEach(project => {
      lines.push(`  Project ${project.projectId} (${project.projectName}):`);

      project.tasks.forEach(task => {
        const billableMark = task.billable ? ' [Billable]' : '';
        lines.push(`    Task ${task.taskId}${billableMark} (${task.taskName}): ${task.hours}h (${task.hoursFormatted})`);
      });

      lines.push(`    Project total: ${project.projectTotal.hours}h (${project.projectTotal.hoursFormatted})`);
    });

    lines.push(`  Daily total: ${day.dailyTotal.hours}h (${day.dailyTotal.hoursFormatted})`);
    lines.push('');
  });

  // Project totals (across all days)
  if (summary.projectTotals.length > 0) {
    lines.push('Project totals (overall):');
    summary.projectTotals.forEach(project => {
      lines.push(`- Project ${project.projectId} (${project.projectName}): ${project.total.hours}h (${project.total.hoursFormatted})`);

      project.tasks.forEach(task => {
        lines.push(`  - Task ${task.taskId} (${task.taskName}): ${task.total.hours}h (${task.total.hoursFormatted})`);
      });
    });
    lines.push('');
  }

  // Grand total
  lines.push(`Grand total: ${summary.grandTotal.hours}h (${summary.grandTotal.hoursFormatted})`);

  return lines.join('\n');
}