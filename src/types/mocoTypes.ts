/**
 * Type definitions for MoCo API data structures
 * Based on MoCo API v1 documentation
 */

// Raw API response types - mirror the exact API structure

/**
 * Activity record from MoCo API
 * Represents time tracking entries
 */
export interface Activity {
  id: number;
  date: string; // ISO 8601 format (YYYY-MM-DD)
  hours: number; // Decimal hours (e.g., 2.5 for 2:30)
  description: string;
  project: {
    id: number;
    name: string;
  };
  task: {
    id: number;
    name: string;
  };
  user: {
    id: number;
    firstname: string;
    lastname: string;
  };
  billable: boolean;
  locked: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Project record from MoCo API
 */
export interface Project {
  id: number;
  name: string;
  description?: string;
  active: boolean;
  currency: string;
  budget?: number;
  budget_monthly?: number;
  created_at: string;
  updated_at: string;
  customer?: {
    id: number;
    name: string;
  };
  leader?: {
    id: number;
    firstname: string;
    lastname: string;
  };
  tasks: {
    id: number;
    name: string;
    active: boolean;
    billable: boolean;
  }[];
}

/**
 * Task record from MoCo API
 */
export interface Task {
  id: number;
  name: string;
  active: boolean;
  billable: boolean;
  project: {
    id: number;
    name: string;
  };
  created_at: string;
  updated_at: string;
}

/**
 * User Holiday record from MoCo API
 */
export interface UserHoliday {
  id: number;
  date: string; // ISO 8601 format (YYYY-MM-DD)
  hours: number; // Hours as decimal (8.0 for full day, 4.0 for half day)
  status: 'approved' | 'pending' | 'rejected';
  note?: string;
  user: {
    id: number;
    firstname: string;
    lastname: string;
  };
  created_at: string;
  updated_at: string;
}

/**
 * User Presence record from MoCo API
 */
export interface UserPresence {
  id: number;
  date: string; // ISO 8601 format (YYYY-MM-DD)
  from: string; // Time format HH:MM
  to?: string; // Time format HH:MM, null if still active
  hours?: number; // Calculated hours, only present if 'to' is set
  user: {
    id: number;
    firstname: string;
    lastname: string;
  };
  created_at: string;
  updated_at: string;
}

/**
 * User information including holiday entitlement
 */
export interface User {
  id: number;
  firstname: string;
  lastname: string;
  email: string;
  active: boolean;
  extern?: boolean;
  language?: string;
  mobile_phone?: string;
  work_phone?: string;
  info?: string;
  tags?: string[];
  custom_properties?: Record<string, unknown>;
  unit?: {
    id: number;
    name: string;
  };
  role?: {
    id: number;
    name: string;
  };
  avatar_url?: string;
  birthday?: string; // ISO 8601 format (YYYY-MM-DD)
  holiday_entitlement?: number; // Annual holiday entitlement in hours
  created_at: string;
  updated_at: string;
}

// Aggregated data structures for processed responses

/**
 * Time formatting helper - provides both decimal and HH:MM formats
 */
export interface TimeFormat {
  /** Hours as decimal number (e.g., 2.5) */
  hours: number;
  /** Hours in HH:MM format (e.g., "2:30") */
  hoursFormatted: string;
}

/**
 * Activity summary for a single task within a project
 */
export interface TaskActivitySummary {
  taskId: number;
  taskName: string;
  hours: number;
  hoursFormatted: string;
  billable: boolean;
}

/**
 * Activity summary for a single project on a specific day
 */
export interface ProjectActivitySummary {
  projectId: number;
  projectName: string;
  tasks: TaskActivitySummary[];
  projectTotal: TimeFormat;
}

/**
 * Activity summary for a single day
 */
export interface DailyActivitySummary {
  date: string; // ISO 8601 format
  projects: ProjectActivitySummary[];
  dailyTotal: TimeFormat;
}

/**
 * Complete activity summary for a date range
 */
export interface ActivityRangeSummary {
  startDate: string;
  endDate: string;
  dailySummaries: DailyActivitySummary[];
  projectTotals: Array<{
    projectId: number;
    projectName: string;
    total: TimeFormat;
    tasks: Array<{
      taskId: number;
      taskName: string;
      total: TimeFormat;
      billable: boolean;
    }>;
  }>;
  grandTotal: TimeFormat;
}

/**
 * Daily presence summary (aggregated from multiple presence records)
 */
export interface DailyPresenceSummary {
  date: string; // ISO 8601 format
  totalHours: number;
  totalHoursFormatted: string;
}

/**
 * Complete presence summary for a date range
 */
export interface PresenceRangeSummary {
  startDate: string;
  endDate: string;
  dailySummaries: DailyPresenceSummary[];
  grandTotal: TimeFormat;
}

/**
 * Holiday summary for a single year
 */
export interface HolidaySummary {
  year: number;
  holidays: Array<{
    date: string;
    days: number; // Convert hours to days (assuming 8h = 1 day)
    status: string;
    note?: string;
  }>;
  totalTakenDays: number;
  annualEntitlementDays: number;
  utilizationPercentage: number;
  remainingDays: number;
}

/**
 * API pagination metadata
 */
export interface PaginationMeta {
  total: number;
  count: number;
  per_page: number;
  current_page: number;
  total_pages: number;
}

/**
 * Generic paginated API response
 */
export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}