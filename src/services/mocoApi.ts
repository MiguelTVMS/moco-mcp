/**
 * MoCo API service client
 * Handles all HTTP communication with the MoCo API including authentication,
 * pagination, and error handling
 */

import { getMocoConfig } from '../config/environment.js';
import { handleMocoApiError } from '../utils/errorHandler.js';
import { logger } from '../utils/logger.js';
import { cache } from '../utils/cache.js';
import type {
  Activity,
  Project,
  Task,
  User,
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

  private sanitizeRequestHeaders(headers: Record<string, string>): Record<string, string> {
    if (!headers.Authorization) {
      return { ...headers };
    }

    const sanitized = { ...headers };
    const authValue = sanitized.Authorization;
    const tokenIndex = authValue.toLowerCase().indexOf('token=');

    if (tokenIndex === -1) {
      sanitized.Authorization = '[REDACTED]';
      return sanitized;
    }

    const tokenPrefix = authValue.slice(0, tokenIndex + 'token='.length);
    const tokenValue = authValue.slice(tokenIndex + 'token='.length);

    if (tokenValue.length <= 8) {
      sanitized.Authorization = `${tokenPrefix}${'*'.repeat(Math.max(tokenValue.length, 4))}`;
      return sanitized;
    }

    sanitized.Authorization = `${tokenPrefix}${tokenValue.slice(0, 4)}...${tokenValue.slice(-4)}`;
    return sanitized;
  }

  private headersToRecord(headers: Headers): Record<string, string> {
    const result: Record<string, string> = {};
    headers.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  private logHttpRequest(url: string, method: string, headers: Record<string, string>, body?: unknown, queryParams?: Record<string, string | number>): void {
    if (!logger.isLevelEnabled('debug')) {
      return;
    }

    logger.debug('MoCo API request', {
      method,
      url,
      headers: this.sanitizeRequestHeaders(headers),
      query: queryParams && Object.keys(queryParams).length > 0 ? queryParams : undefined,
      body: body ?? null
    });
  }

  private logHttpResponse(url: string, method: string, response: Response, body: unknown): void {
    if (!logger.isLevelEnabled('debug')) {
      return;
    }

    logger.debug('MoCo API response', {
      method,
      url,
      status: response.status,
      statusText: response.statusText,
      headers: this.headersToRecord(response.headers),
      body
    });
  }

  private tryParseJson(bodyText: string): { success: true; value: unknown } | { success: false; error: Error } {
    if (!bodyText || bodyText.trim().length === 0) {
      return { success: true, value: null };
    }

    try {
      return { success: true, value: JSON.parse(bodyText) };
    } catch (error) {
      const parseError = error instanceof Error ? error : new Error(String(error));
      return { success: false, error: new Error(`Failed to parse JSON response: ${parseError.message}`) };
    }
  }

  private async parseResponseBody<T>(response: Response): Promise<{ value: T; logBody: unknown }> {
    if (typeof response.text === 'function') {
      const responseText = await response.text();
      const parsedResponse = this.tryParseJson(responseText);

      if (!parsedResponse.success) {
        throw parsedResponse.error;
      }

      return {
        value: parsedResponse.value as T,
        logBody: parsedResponse.value
      };
    }

    if (typeof response.json === 'function') {
      const jsonValue = await response.json() as T;
      return {
        value: jsonValue,
        logBody: jsonValue
      };
    }

    return {
      value: null as T,
      logBody: null
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

    const requestHeaders = this.defaultHeaders;
    this.logHttpRequest(url.toString(), 'GET', requestHeaders, undefined, params);

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: requestHeaders
      });

      const { value, logBody } = await this.parseResponseBody<T>(response);

      this.logHttpResponse(url.toString(), 'GET', response, logBody);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return value;
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

    const requestHeaders = this.defaultHeaders;
    this.logHttpRequest(url.toString(), 'GET', requestHeaders, undefined, params);

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: requestHeaders
      });

      const { value, logBody } = await this.parseResponseBody<T>(response);

      this.logHttpResponse(url.toString(), 'GET', response, logBody);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return { data: value, headers: response.headers };
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

  private async getCachedProjects(): Promise<Project[]> {
    return cache.getOrSet<Project[]>(
      'projects:assigned',
      this.config.cacheTtlSeconds,
      () => this.fetchAllPages<Project>('/projects/assigned')
    );
  }

  private async getCachedUsers(includeArchived: boolean, tags?: string[]): Promise<User[]> {
    const normalizedTags = tags
      ?.map(tag => tag.trim())
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));

    const cacheKeyParts = [
      'users',
      includeArchived ? '1' : '0',
      normalizedTags && normalizedTags.length > 0 ? normalizedTags.join('|') : '-'
    ];

    const cacheKey = cacheKeyParts.join(':');

    const params: Record<string, string> = {};
    if (includeArchived) {
      params.include_archived = 'true';
    }
    if (normalizedTags && normalizedTags.length > 0) {
      params.tags = normalizedTags.join(',');
    }

    return cache.getOrSet<User[]>(
      cacheKey,
      this.config.cacheTtlSeconds,
      () => this.fetchAllPages<User>('/users', params)
    );
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
    const allProjects = await this.getCachedProjects();

    const lowerQuery = query.toLowerCase();
    return allProjects.filter(project =>
      project.name.toLowerCase().includes(lowerQuery) ||
      (project.description && project.description.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * Searches staff directory by matching against name, email, tags, unit, or role
   * @param query - Search query string
   * @param options - Optional search filters
   * @returns Promise with array of matching users
   */
  async searchUsers(
    query: string,
    options: { includeArchived?: boolean; tags?: string[] } = {}
  ): Promise<User[]> {
    const { includeArchived = false, tags } = options;

    const allUsers = await this.getCachedUsers(includeArchived, tags);
    const normalizedQuery = query.trim().toLowerCase();

    if (normalizedQuery.length === 0) {
      return allUsers;
    }

    return allUsers.filter(user => {
      const searchTargets: string[] = [];

      if (user.firstname) {
        searchTargets.push(user.firstname);
      }
      if (user.lastname) {
        searchTargets.push(user.lastname);
      }

      const fullName = `${user.firstname ?? ''} ${user.lastname ?? ''}`.trim();
      if (fullName.length > 0) {
        searchTargets.push(fullName);
      }

      if (user.email) {
        searchTargets.push(user.email);
      }

      if (user.info) {
        searchTargets.push(user.info);
      }

      if (user.tags && user.tags.length > 0) {
        searchTargets.push(user.tags.join(' '));
      }

      if (user.unit?.name) {
        searchTargets.push(user.unit.name);
      }

      if (user.role?.name) {
        searchTargets.push(user.role.name);
      }

      if (user.mobile_phone) {
        searchTargets.push(user.mobile_phone);
      }

      if (user.work_phone) {
        searchTargets.push(user.work_phone);
      }

      return searchTargets.some(target => target.toLowerCase().includes(normalizedQuery));
    });
  }

  /**
   * Retrieves all tasks for a specific assigned project
   * @param projectId - Project ID (must be assigned to current user)
   * @returns Promise with array of tasks
   */
  async getProjectTasks(projectId: number): Promise<Task[]> {
    // Get all assigned projects
    const assignedProjects = await this.getCachedProjects();

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
   * Retrieves public holidays for a specific year using schedules endpoint
   * @param year - Year (e.g., 2024)
   * @returns Promise with array of public holiday schedules
   */
  async getPublicHolidays(year: number): Promise<any[]> {
    // Calculate year date range
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    try {
      // Get ALL schedules using direct request
      const allSchedules = await this.makeRequest<any[]>('/schedules', {
        from: startDate,
        to: endDate
      });

      // Filter for public holidays (assignment code "2" and type "Absence")
      const publicHolidays = allSchedules.filter(schedule =>
        schedule.assignment &&
        schedule.assignment.type === 'Absence' &&
        schedule.assignment.code === '2'
      );

      return publicHolidays;
    } catch (error) {
      console.error('DEBUG API: Error fetching public holidays:', error);
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