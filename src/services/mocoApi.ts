/**
 * MoCo API service client
 * Handles all HTTP communication with the MoCo API including authentication,
 * pagination, and error handling
 */

import { getMocoConfig } from '../config/environment.js';
import { handleMocoApiError } from '../utils/errorHandler.js';
import type {
  Activity,
  Project,
  Task,
  UserHoliday,
  UserPresence
} from '../types/mocoTypes.js';

/**
 * HTTP client for MoCo API with automatic pagination and error handling
 */
export class MocoApiService {
  private readonly config = getMocoConfig();
  
  /**
   * Default request headers for MoCo API
   */
  private get defaultHeaders(): Record<string, string> {
    return {
      'Authorization': `Token token=${this.config.apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }

  /**
   * Makes an HTTP request to the MoCo API with error handling
   * @param endpoint - API endpoint path (without base URL)
   * @param params - Query parameters
   * @returns Promise with parsed JSON response
   */
  private async makeRequest<T>(endpoint: string, params: Record<string, string | number> = {}): Promise<T> {
    const url = new URL(`${this.config.baseUrl}${endpoint}`);
    
    // Add query parameters
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, String(value));
    });

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: this.defaultHeaders
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json() as T;
    } catch (error) {
      throw new Error(handleMocoApiError(error));
    }
  }

  /**
   * Makes an HTTP request to the MoCo API with headers for pagination
   * @param endpoint - API endpoint path (without base URL)
   * @param params - Query parameters
   * @returns Promise with parsed JSON response and headers
   */
  private async makeRequestWithHeaders<T>(endpoint: string, params: Record<string, string | number> = {}): Promise<{ data: T; headers: Headers }> {
    const url = new URL(`${this.config.baseUrl}${endpoint}`);
    
    // Add query parameters
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, String(value));
    });

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: this.defaultHeaders
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json() as T;
      return { data, headers: response.headers };
    } catch (error) {
      throw new Error(handleMocoApiError(error));
    }
  }

  /**
   * Fetches all pages of a paginated endpoint automatically using header-based pagination
   * @param endpoint - API endpoint path
   * @param params - Query parameters
   * @returns Promise with all items from all pages
   */
  private async fetchAllPages<T>(endpoint: string, params: Record<string, string | number> = {}): Promise<T[]> {
    const allItems: T[] = [];
    let currentPage = 1;
    let hasMorePages = true;

    while (hasMorePages) {
      const { data, headers } = await this.makeRequestWithHeaders<T[]>(endpoint, {
        ...params,
        page: currentPage
      });

      // MoCo API returns direct arrays, not nested in data property
      allItems.push(...data);
      
      // Check pagination info from headers
      const xPage = headers.get('X-Page');
      const xTotal = headers.get('X-Total');
      const xPerPage = headers.get('X-Per-Page');
      
      if (xPage && xTotal && xPerPage) {
        const totalItems = parseInt(xTotal, 10);
        const itemsPerPage = parseInt(xPerPage, 10);
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        hasMorePages = currentPage < totalPages;
      } else {
        // No pagination headers found, assume single page
        hasMorePages = false;
      }
      
      currentPage++;
    }

    return allItems;
  }

  /**
   * Retrieves activities for the current user within a date range
   * @param startDate - Start date in ISO 8601 format (YYYY-MM-DD)
   * @param endDate - End date in ISO 8601 format (YYYY-MM-DD)
   * @param projectId - Optional project ID to filter activities
   * @returns Promise with array of activities
   */
  async getActivities(startDate: string, endDate: string, projectId?: number): Promise<Activity[]> {
    const params: Record<string, string | number> = {
      from: startDate,
      to: endDate
    };
    
    if (projectId) {
      params.project_id = projectId;
    }
    
    return this.fetchAllPages<Activity>('/activities', params);
  }

  /**
   * Retrieves all projects assigned to the current user
   * @returns Promise with array of assigned projects
   */
  async getProjects(): Promise<Project[]> {
    return this.fetchAllPages<Project>('/projects/assigned');
  }

  /**
   * Searches for projects by name or description
   * @param query - Search query string
   * @returns Promise with array of matching projects
   */
  async searchProjects(query: string): Promise<Project[]> {
    // Get all projects and filter client-side since MoCo API doesn't have text search
    const allProjects = await this.getProjects();
    
    const lowerQuery = query.toLowerCase();
    return allProjects.filter(project => 
      project.name.toLowerCase().includes(lowerQuery) ||
      (project.description && project.description.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * Retrieves all tasks for a specific assigned project
   * @param projectId - Project ID (must be assigned to current user)
   * @returns Promise with array of tasks
   */
  async getProjectTasks(projectId: number): Promise<Task[]> {
    // Get all assigned projects
    const assignedProjects = await this.getProjects();
    
    // Find the specific project
    const project = assignedProjects.find(p => p.id === projectId);
    
    if (!project) {
      throw new Error(`Project ${projectId} is not assigned to the current user or does not exist.`);
    }
    
    // Extract tasks from the project and convert to full Task interface
    return project.tasks.map(task => ({
      id: task.id,
      name: task.name,
      active: task.active,
      billable: task.billable,
      project: {
        id: project.id,
        name: project.name
      },
      created_at: project.created_at,
      updated_at: project.updated_at
    }));
  }

  /**
   * Retrieves user holidays for a specific year
   * @param year - Year (e.g., 2024)
   * @returns Promise with array of user holidays
   */
  async getUserHolidays(year: number): Promise<UserHoliday[]> {
    try {
      return await this.makeRequest<UserHoliday[]>('/users/holidays', {
        year: year
      });
    } catch (error) {
      // If 404 error (Resource not found), return empty array instead of throwing error
      // This happens when no holiday data exists for the year yet
      if (error instanceof Error && error.message.includes('Resource not found')) {
        return [];
      }
      // Re-throw other errors
      throw error;
    }
  }

  /**
   * Retrieves actual taken holidays (absences) for a specific year using schedules endpoint
   * @param year - Year (e.g., 2024)
   * @returns Promise with array of taken holiday schedules
   */
  async getTakenHolidays(year: number): Promise<any[]> {
    // Calculate year date range
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;
    
    console.error(`DEBUG API: Trying to fetch schedules for ${startDate} to ${endDate}`);
    
    try {
      // Schedules endpoint has different response structure, use direct request
      // Based on previous success with makeRequest showing 63 schedules
      const allSchedules = await this.makeRequest<any[]>('/schedules', {
        from: startDate,
        to: endDate
      });
      
      console.error(`DEBUG API: Found ${allSchedules.length} total schedules for ${year}`);
      if (allSchedules.length > 0) {
        console.error('DEBUG API: First few schedules:', JSON.stringify(allSchedules.slice(0, 3), null, 2));
      }
      
      // Filter for absences (schedules with assignment type "Absence")
      const absences = allSchedules.filter(schedule => 
        schedule.assignment && 
        schedule.assignment.type === 'Absence'
      );
      console.error(`DEBUG API: Found ${absences.length} absences with assignment codes:`, absences.map(a => a.assignment?.code + ' (' + a.assignment?.name + ')'));
      
      // Look specifically for vacation/holiday codes (we need to figure out which code is for vacation)
      const vacationCodes = ['3', '4', '5']; // Common vacation codes to try
      const holidays = absences.filter(schedule => 
        vacationCodes.includes(schedule.assignment?.code)
      );
      console.error(`DEBUG API: Found ${holidays.length} potential holidays with codes:`, holidays.map(a => a.assignment?.code + ' (' + a.assignment?.name + ')'));
      
      // Filter for only vacation days (assignment code "4")
      const vacationDays = absences.filter(schedule => 
        schedule.assignment?.code === '4' && schedule.assignment?.name === 'Urlaub'
      );
      console.error(`DEBUG API: Found ${vacationDays.length} actual vacation days (code 4)`);
      
      return vacationDays;
    } catch (error) {
      console.error('DEBUG API: Error fetching schedules:', error);
      console.error('DEBUG API: Error details:', error instanceof Error ? error.message : 'Unknown error');
      return [];
    }
  }

  /**
   * Retrieves actual taken sick days for a specific year using schedules endpoint
   * @param year - Year (e.g., 2024)
   * @returns Promise with array of taken sick day schedules
   */
  async getTakenSickDays(year: number): Promise<any[]> {
    // Calculate year date range
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;
    
    console.error(`DEBUG API: Trying to fetch sick days for ${startDate} to ${endDate}`);
    
    try {
      // Get ALL schedules using direct request (schedules has different response structure)
      const allSchedules = await this.makeRequest<any[]>('/schedules', {
        from: startDate,
        to: endDate
      });
      
      console.error(`DEBUG API: Found ${allSchedules.length} total schedules for sick days query`);
      
      // Filter for sick days (assignment code "3" and name "Krankheit")
      const sickDays = allSchedules.filter(schedule => 
        schedule.assignment && 
        schedule.assignment.type === 'Absence' &&
        schedule.assignment.code === '3' && 
        schedule.assignment.name === 'Krankheit'
      );
      console.error(`DEBUG API: Found ${sickDays.length} actual sick days (code 3)`);
      
      return sickDays;
    } catch (error) {
      console.error('DEBUG API: Error fetching sick days:', error);
      console.error('DEBUG API: Error details:', error instanceof Error ? error.message : 'Unknown error');
      return [];
    }
  }

  /**
   * Retrieves user presences within a date range
   * @param startDate - Start date in ISO 8601 format (YYYY-MM-DD)
   * @param endDate - End date in ISO 8601 format (YYYY-MM-DD)
   * @returns Promise with array of user presences
   */
  async getUserPresences(startDate: string, endDate: string): Promise<UserPresence[]> {
    return this.fetchAllPages<UserPresence>('/users/presences', {
      from: startDate,
      to: endDate
    });
  }

}