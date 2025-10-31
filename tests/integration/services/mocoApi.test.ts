/**
 * Integration tests for MocoApiService
 * Uses mocked fetch to test API interactions
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { MocoApiService } from '../../../src/services/mocoApi';
import type { Activity, Project, Task, User, UserHoliday, UserPresence } from '../../../src/types/mocoTypes';

// Mock fetch globally
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe('MocoApiService Integration Tests', () => {
  let apiService: MocoApiService;

  beforeEach(() => {
    apiService = new MocoApiService();
    mockFetch.mockClear();
  });

  describe('getActivities', () => {
    it('should fetch activities for date range', async () => {
      const mockActivities: Activity[] = [
        {
          id: 1,
          date: '2024-01-15',
          hours: 4.5,
          description: 'Frontend work',
          project: { id: 123, name: 'Website' },
          task: { id: 456, name: 'Development' },
          user: { id: 1, firstname: 'John', lastname: 'Doe' },
          billable: true,
          locked: false,
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-01-15T10:00:00Z'
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockActivities,
        headers: new Headers({
          'X-Page': '1',
          'X-Per-Page': '25',
          'X-Total': '1'
        })
      } as Response);

      const result = await apiService.getActivities('2024-01-01', '2024-01-31');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-company.mocoapp.com/api/v1/activities?from=2024-01-01&to=2024-01-31&page=1',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Token token=test-api-key',
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          })
        })
      );

      expect(result).toEqual(mockActivities);
    });

    it('should handle pagination automatically', async () => {
      const page1Activities: Activity[] = [
        {
          id: 1,
          date: '2024-01-15',
          hours: 4.5,
          description: 'Page 1 activity',
          project: { id: 123, name: 'Website' },
          task: { id: 456, name: 'Development' },
          user: { id: 1, firstname: 'John', lastname: 'Doe' },
          billable: true,
          locked: false,
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-01-15T10:00:00Z'
        }
      ];

      const page2Activities: Activity[] = [
        {
          id: 2,
          date: '2024-01-16',
          hours: 3.25,
          description: 'Page 2 activity',
          project: { id: 124, name: 'App' },
          task: { id: 457, name: 'Testing' },
          user: { id: 1, firstname: 'John', lastname: 'Doe' },
          billable: true,
          locked: false,
          created_at: '2024-01-16T10:00:00Z',
          updated_at: '2024-01-16T10:00:00Z'
        }
      ];

      // Mock first page response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => page1Activities,
        headers: new Headers({
          'X-Page': '1',
          'X-Per-Page': '1',
          'X-Total': '2'
        })
      } as Response);

      // Mock second page response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => page2Activities,
        headers: new Headers({
          'X-Page': '2',
          'X-Per-Page': '1',
          'X-Total': '2'
        })
      } as Response);

      const result = await apiService.getActivities('2024-01-01', '2024-01-31');

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result).toEqual([...page1Activities, ...page2Activities]);
    });

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      } as Response);

      await expect(apiService.getActivities('2024-01-01', '2024-01-31'))
        .rejects.toThrow('API authentication failed. Please check MOCO_API_KEY.');
    });
  });

  describe('getProjects', () => {
    it('should fetch all projects', async () => {
      const mockProjects: Project[] = [
        {
          id: 123,
          name: 'Website Redesign',
          description: 'Complete website overhaul',
          active: true,
          currency: 'EUR',
          budget: 50000,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          customer: { id: 1, name: 'ACME Corp' },
          leader: { id: 2, firstname: 'Jane', lastname: 'Smith' },
          tasks: []
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockProjects,
        headers: new Headers({
          'X-Page': '1',
          'X-Per-Page': '25',
          'X-Total': '1'
        })
      } as Response);

      const result = await apiService.getProjects();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-company.mocoapp.com/api/v1/projects/assigned?page=1',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Token token=test-api-key',
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          })
        })
      );

      expect(result).toEqual(mockProjects);
    });
  });

  describe('searchProjects', () => {
    it('should filter projects by search query', async () => {
      const allProjects: Project[] = [
        {
          id: 1,
          name: 'Website Redesign',
          description: 'Complete website overhaul',
          active: true,
          currency: 'EUR',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          tasks: []
        },
        {
          id: 2,
          name: 'Mobile App',
          description: 'New mobile application',
          active: true,
          currency: 'EUR',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          tasks: []
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => allProjects,
        headers: new Headers({
          'X-Page': '1',
          'X-Per-Page': '25',
          'X-Total': '2'
        })
      } as Response);

      const result = await apiService.searchProjects('website');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Website Redesign');
    });

    it('should perform case-insensitive search', async () => {
      const allProjects: Project[] = [
        {
          id: 1,
          name: 'Website Redesign',
          description: 'Complete WEBSITE overhaul',
          active: true,
          currency: 'EUR',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          tasks: []
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => allProjects,
        headers: new Headers({
          'X-Page': '1',
          'X-Per-Page': '25',
          'X-Total': '1'
        })
      } as Response);

      const result = await apiService.searchProjects('WEBSITE');
      expect(result).toHaveLength(1);
    });

    it('should search in both name and description', async () => {
      const allProjects: Project[] = [
        {
          id: 1,
          name: 'Project Alpha',
          description: 'Mobile development project',
          active: true,
          currency: 'EUR',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          tasks: []
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => allProjects,
        headers: new Headers({
          'X-Page': '1',
          'X-Per-Page': '25',
          'X-Total': '2'
        })
      } as Response);

      const result = await apiService.searchProjects('mobile');
      expect(result).toHaveLength(1);
    });
  });

  describe('searchUsers', () => {
    it('should filter users by query across multiple fields', async () => {
      const mockUsers: User[] = [
        {
          id: 1,
          firstname: 'Jane',
          lastname: 'Doe',
          email: 'jane.doe@example.com',
          active: true,
          tags: ['Designer'],
          unit: { id: 10, name: 'Design' },
          role: { id: 5, name: 'Lead Designer' },
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        },
        {
          id: 2,
          firstname: 'John',
          lastname: 'Smith',
          email: 'john.smith@example.com',
          active: true,
          tags: ['Engineering'],
          unit: { id: 12, name: 'Engineering' },
          role: { id: 3, name: 'Backend Developer' },
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockUsers,
        headers: new Headers({
          'X-Page': '1',
          'X-Per-Page': '25',
          'X-Total': '2'
        })
      } as Response);

      const result = await apiService.searchUsers('lead designer');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-company.mocoapp.com/api/v1/users?page=1',
        expect.objectContaining({
          method: 'GET'
        })
      );

      expect(result).toHaveLength(1);
      expect(result[0].firstname).toBe('Jane');
    });

    it('should include archived users when option enabled', async () => {
      const archivedUser: User = {
        id: 3,
        firstname: 'Alex',
        lastname: 'Archived',
        email: 'alex.archived@example.com',
        active: false,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [archivedUser],
        headers: new Headers({
          'X-Page': '1',
          'X-Per-Page': '25',
          'X-Total': '1'
        })
      } as Response);

      const result = await apiService.searchUsers('alex', { includeArchived: true });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-company.mocoapp.com/api/v1/users?include_archived=true&page=1',
        expect.any(Object)
      );

      expect(result).toHaveLength(1);
      expect(result[0].active).toBe(false);
    });

    it('should return all users when query is empty', async () => {
      const mockUsers: User[] = [
        {
          id: 1,
          firstname: 'Empty',
          lastname: 'Query',
          email: 'empty.query@example.com',
          active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockUsers,
        headers: new Headers({
          'X-Page': '1',
          'X-Per-Page': '25',
          'X-Total': '1'
        })
      } as Response);

      const result = await apiService.searchUsers('   ');

      expect(result).toEqual(mockUsers);
    });
  });

  describe('getProjectTasks', () => {
    it('should fetch tasks for specific project', async () => {
      const mockProjects: Project[] = [
        {
          id: 123,
          name: 'Website Redesign',
          description: 'Complete website overhaul',
          active: true,
          currency: 'EUR',
          budget: 50000,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          customer: { id: 1, name: 'ACME Corp' },
          leader: { id: 2, firstname: 'Jane', lastname: 'Smith' },
          tasks: [
            {
              id: 456,
              name: 'Frontend Development',
              active: true,
              billable: true
            }
          ]
        }
      ];

      // Mock the getProjects() call that getProjectTasks() makes internally
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockProjects,
        headers: new Headers({
          'X-Page': '1',
          'X-Per-Page': '25',
          'X-Total': '1'
        })
      } as Response);

      const result = await apiService.getProjectTasks(123);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-company.mocoapp.com/api/v1/projects/assigned?page=1',
        expect.any(Object)
      );

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Frontend Development');
      expect(result[0].id).toBe(456);
      expect(result[0].active).toBe(true);
      expect(result[0].billable).toBe(true);
    });
  });

  describe('getUserHolidays', () => {
    it('should fetch user holidays for specific year', async () => {
      const mockHolidays: UserHoliday[] = [
        {
          id: 1,
          date: '2024-07-15',
          hours: 8,
          status: 'approved',
          note: 'Summer vacation',
          user: { id: 1, firstname: 'John', lastname: 'Doe' },
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockHolidays
      } as Response);

      const result = await apiService.getUserHolidays(2024);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-company.mocoapp.com/api/v1/users/holidays?year=2024',
        expect.any(Object)
      );

      expect(result).toEqual(mockHolidays);
    });

    it('should return empty array when no holidays exist for year (404)', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Resource not found. Please check the provided IDs.'));

      const result = await apiService.getUserHolidays(2025);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-company.mocoapp.com/api/v1/users/holidays?year=2025',
        expect.any(Object)
      );

      expect(result).toEqual([]);
    });
  });

  describe('getUserPresences', () => {
    it('should fetch user presences for date range', async () => {
      const mockPresences: UserPresence[] = [
        {
          id: 1,
          date: '2024-01-15',
          from: '09:00',
          to: '17:30',
          hours: 8.5,
          user: { id: 1, firstname: 'John', lastname: 'Doe' },
          created_at: '2024-01-15T09:00:00Z',
          updated_at: '2024-01-15T17:30:00Z'
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPresences,
        headers: new Headers({
          'X-Page': '1',
          'X-Per-Page': '25',
          'X-Total': '1'
        })
      } as Response);

      const result = await apiService.getUserPresences('2024-01-01', '2024-01-31');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-company.mocoapp.com/api/v1/users/presences?from=2024-01-01&to=2024-01-31&page=1',
        expect.any(Object)
      );

      expect(result).toEqual(mockPresences);
    });
  });


  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('Network error'));

      await expect(apiService.getProjects())
        .rejects.toThrow('Network error accessing MoCo API. Please check your internet connection.');
    });

    it('should handle rate limiting', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests'
      } as Response);

      await expect(apiService.getProjects())
        .rejects.toThrow('API limit reached. Please try again in a few seconds.');
    });

    it('should handle server errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      } as Response);

      await expect(apiService.getProjects())
        .rejects.toThrow('MoCo server error. Please try again later.');
    });
  });
});