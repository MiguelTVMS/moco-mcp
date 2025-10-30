/**
 * End-to-End MCP Workflow Tests
 * Tests complete workflows and real-world usage scenarios
 */

import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import { spawn, ChildProcess } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface MCPClient {
  sendRequest(method: string, params?: any): Promise<any>;
  close(): void;
}

class TestMCPClient implements MCPClient {
  private serverProcess: ChildProcess;
  private requestId = 1;

  constructor(serverProcess: ChildProcess) {
    this.serverProcess = serverProcess;
  }

  async sendRequest(method: string, params?: any): Promise<any> {
    const request = {
      jsonrpc: '2.0' as const,
      id: this.requestId++,
      method,
      params
    };

    return new Promise((resolve, reject) => {
      let responseData = '';
      const timeout = setTimeout(() => {
        reject(new Error(`Request timeout for ${method}`));
      }, 10000);

      const onData = (data: Buffer) => {
        responseData += data.toString();
        try {
          const lines = responseData.trim().split('\n');
          for (const line of lines) {
            if (line.trim()) {
              const response = JSON.parse(line);
              if (response.id === request.id) {
                clearTimeout(timeout);
                this.serverProcess.stdout!.off('data', onData);
                resolve(response);
                return;
              }
            }
          }
        } catch (e) {
          // Not complete JSON yet
        }
      };

      this.serverProcess.stdout!.on('data', onData);
      this.serverProcess.stdin!.write(JSON.stringify(request) + '\n');
    });
  }

  close(): void {
    if (this.serverProcess) {
      this.serverProcess.kill();
    }
  }
}

describe('End-to-End MCP Workflows', () => {
  let client: MCPClient;
  let serverProcess: ChildProcess;

  beforeAll(async () => {
    // Mock fetch for these tests to avoid real API calls
    global.fetch = jest.fn();

    // Start the MCP server
    serverProcess = spawn('node', [join(__dirname, '../../dist/index.js')], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        MOCO_API_KEY: 'test-api-key',
        MOCO_SUBDOMAIN: 'test-company'
      }
    });

    client = new TestMCPClient(serverProcess);

    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Initialize the connection
    await client.sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: { roots: { listChanged: false } },
      clientInfo: { name: 'test-client', version: '1.0.0' }
    });
  });

  afterAll(() => {
    client.close();
  });

  describe('Complete Project Discovery Workflow', () => {
    it('should allow full project discovery flow', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

      // Mock project list response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              id: 123,
              name: 'Website Redesign',
              description: 'Complete website overhaul',
              active: true,
              currency: 'EUR',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z'
            },
            {
              id: 124,
              name: 'Mobile App',
              description: 'New mobile application',
              active: true,
              currency: 'EUR',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z'
            }
          ],
          meta: { total_pages: 1 }
        })
      } as Response);

      // Step 1: List all projects
      const projectsResponse = await client.sendRequest('tools/call', {
        name: 'get_user_projects',
        arguments: {}
      });

      expect(projectsResponse.result.content[0].text).toContain('Found projects (2)');
      expect(projectsResponse.result.content[0].text).toContain('Website Redesign');
      expect(projectsResponse.result.content[0].text).toContain('Mobile App');

      // Mock project tasks response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              id: 456,
              name: 'Frontend Development',
              active: true,
              billable: true,
              project: { id: 123, name: 'Website Redesign' },
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z'
            },
            {
              id: 457,
              name: 'Backend API',
              active: true,
              billable: true,
              project: { id: 123, name: 'Website Redesign' },
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z'
            }
          ],
          meta: { total_pages: 1 }
        })
      } as Response);

      // Step 2: Get tasks for specific project
      const tasksResponse = await client.sendRequest('tools/call', {
        name: 'get_user_project_tasks',
        arguments: { projectId: 123 }
      });

      expect(tasksResponse.result.content[0].text).toContain('Tasks for project 123');
      expect(tasksResponse.result.content[0].text).toContain('Frontend Development');
      expect(tasksResponse.result.content[0].text).toContain('Backend API');
    });

    it('should handle project search workflow', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

      // Mock search response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              id: 123,
              name: 'Website Redesign',
              description: 'Complete website overhaul',
              active: true,
              currency: 'EUR',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z'
            }
          ],
          meta: { total_pages: 1 }
        })
      } as Response);

      const searchResponse = await client.sendRequest('tools/call', {
        name: 'get_user_projects',
        arguments: { query: 'website' }
      });

      expect(searchResponse.result.content[0].text).toContain('Search results for "website"');
      expect(searchResponse.result.content[0].text).toContain('**Website**'); // Should highlight search term
    });
  });

  describe('Time Tracking Analysis Workflow', () => {
    it('should support comprehensive time analysis', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

      // Mock activities response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              id: 1,
              date: '2024-01-15',
              hours: 4.5,
              description: 'Frontend development',
              project: { id: 123, name: 'Website Redesign' },
              task: { id: 456, name: 'Frontend Development' },
              user: { id: 1, firstname: 'John', lastname: 'Doe' },
              billable: true,
              locked: false,
              created_at: '2024-01-15T10:00:00Z',
              updated_at: '2024-01-15T10:00:00Z'
            },
            {
              id: 2,
              date: '2024-01-15',
              hours: 3.25,
              description: 'API development',
              project: { id: 123, name: 'Website Redesign' },
              task: { id: 457, name: 'Backend API' },
              user: { id: 1, firstname: 'John', lastname: 'Doe' },
              billable: true,
              locked: false,
              created_at: '2024-01-15T14:00:00Z',
              updated_at: '2024-01-15T14:00:00Z'
            }
          ],
          meta: { total_pages: 1 }
        })
      } as Response);

      const activitiesResponse = await client.sendRequest('tools/call', {
        name: 'get_activities',
        arguments: {
          startDate: '2024-01-01',
          endDate: '2024-01-31'
        }
      });

      const responseText = activitiesResponse.result.content[0].text;

      // Should contain structured time analysis
      expect(responseText).toContain('Activities from 2024-01-01 to 2024-01-31');
      expect(responseText).toContain('2024-01-15:');
      expect(responseText).toContain('Project 123 (Website Redesign)');
      expect(responseText).toContain('Task 456 (Frontend Development): 4.5h (4:30)');
      expect(responseText).toContain('Task 457 (Backend API): 3.25h (3:15)');
      expect(responseText).toContain('Project total: 7.75h (7:45)');
      expect(responseText).toContain('Daily total: 7.75h (7:45)');
      expect(responseText).toContain('Grand total: 7.75h (7:45)');
    });
  });

  describe('Holiday Management Workflow', () => {
    it('should provide comprehensive holiday analysis', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

      // Mock holidays response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              id: 1,
              date: '2024-07-15',
              hours: 8,
              status: 'approved',
              note: 'Summer vacation',
              user: { id: 1, firstname: 'John', lastname: 'Doe' },
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z'
            },
            {
              id: 2,
              date: '2024-12-23',
              hours: 4,
              status: 'approved',
              note: 'Half day before Christmas',
              user: { id: 1, firstname: 'John', lastname: 'Doe' },
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z'
            }
          ],
          meta: { total_pages: 1 }
        })
      } as Response);

      // Mock current user response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 1,
          firstname: 'John',
          lastname: 'Doe',
          email: 'john.doe@example.com',
          active: true,
          holiday_entitlement: 200, // 25 days
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        })
      } as Response);

      const holidaysResponse = await client.sendRequest('tools/call', {
        name: 'get_user_holidays',
        arguments: { year: 2024 }
      });

      const responseText = holidaysResponse.result.content[0].text;

      expect(responseText).toContain('Holiday overview for 2024');
      expect(responseText).toContain('Taken holiday days:');
      expect(responseText).toContain('2024-07-15: 1.0 day');
      expect(responseText).toContain('2024-12-23: 0.5 day');
      expect(responseText).toContain('Summary:');
      expect(responseText).toContain('Taken vacation: 1.5 days');
      expect(responseText).toContain('Annual entitlement: 25 days');
      expect(responseText).toContain('Utilization: 6%');
      expect(responseText).toContain('Remaining vacation: 23.5 days');
    });
  });

  describe('Presence Monitoring Workflow', () => {
    it('should analyze presence patterns effectively', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

      // Mock presences response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              id: 1,
              date: '2024-01-15',
              from: '09:00',
              to: '17:30',
              hours: 8.5,
              user: { id: 1, firstname: 'John', lastname: 'Doe' },
              created_at: '2024-01-15T09:00:00Z',
              updated_at: '2024-01-15T17:30:00Z'
            },
            {
              id: 2,
              date: '2024-01-16',
              from: '08:30',
              to: '16:45',
              hours: 8.25,
              user: { id: 1, firstname: 'John', lastname: 'Doe' },
              created_at: '2024-01-16T08:30:00Z',
              updated_at: '2024-01-16T16:45:00Z'
            }
          ],
          meta: { total_pages: 1 }
        })
      } as Response);

      const presencesResponse = await client.sendRequest('tools/call', {
        name: 'get_user_presences',
        arguments: {
          startDate: '2024-01-15',
          endDate: '2024-01-16'
        }
      });

      const responseText = presencesResponse.result.content[0].text;

      expect(responseText).toContain('Presences from 2024-01-15 to 2024-01-16');
      expect(responseText).toContain('Daily presences:');
      expect(responseText).toContain('2024-01-15: 8.5h (8:30)');
      expect(responseText).toContain('2024-01-16: 8.25h (8:15)');
      expect(responseText).toContain('Grand total: 16.75h (16:45)');
      expect(responseText).toContain('Statistics:');
      expect(responseText).toContain('Working days: 2');
      expect(responseText).toContain('Average per day: 8.38h');
    });
  });

  describe('Error Recovery Workflows', () => {
    it('should gracefully handle API failures in workflow', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

      // Mock API failure
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      } as Response);

      const response = await client.sendRequest('tools/call', {
        name: 'get_user_projects',
        arguments: {}
      });

      expect(response.result.content[0].text).toContain('API authentication failed');
    });

    it('should handle validation errors gracefully', async () => {
      const response = await client.sendRequest('tools/call', {
        name: 'get_activities',
        arguments: {
          startDate: '2024-02-01',
          endDate: '2024-01-01' // End before start
        }
      });

      expect(response.result.content[0].text).toContain('Invalid date range');
    });

    it('should handle network errors in workflow', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

      // Mock network error
      mockFetch.mockRejectedValueOnce(new TypeError('Network error'));

      const response = await client.sendRequest('tools/call', {
        name: 'get_user_projects',
        arguments: {}
      });

      expect(response.result.content[0].text).toContain('Network error accessing MoCo API');
    });
  });

  describe('Complex Multi-Tool Workflows', () => {
    it('should support project analysis workflow', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

      // Step 1: Search for specific project
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{
            id: 123,
            name: 'Website Redesign',
            description: 'Complete website overhaul',
            active: true,
            currency: 'EUR',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
          }],
          meta: { total_pages: 1 }
        })
      } as Response);

      const projectSearch = await client.sendRequest('tools/call', {
        name: 'get_user_projects',
        arguments: { query: 'website' }
      });

      expect(projectSearch.result.content[0].text).toContain('Website Redesign');

      // Step 2: Get tasks for that project
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{
            id: 456,
            name: 'Frontend Development',
            active: true,
            billable: true,
            project: { id: 123, name: 'Website Redesign' },
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
          }],
          meta: { total_pages: 1 }
        })
      } as Response);

      const projectTasks = await client.sendRequest('tools/call', {
        name: 'get_user_project_tasks',
        arguments: { projectId: 123 }
      });

      expect(projectTasks.result.content[0].text).toContain('Frontend Development');

      // Step 3: Get activities for that project's timeframe
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{
            id: 1,
            date: '2024-01-15',
            hours: 4.5,
            description: 'Frontend work',
            project: { id: 123, name: 'Website Redesign' },
            task: { id: 456, name: 'Frontend Development' },
            user: { id: 1, firstname: 'John', lastname: 'Doe' },
            billable: true,
            locked: false,
            created_at: '2024-01-15T10:00:00Z',
            updated_at: '2024-01-15T10:00:00Z'
          }],
          meta: { total_pages: 1 }
        })
      } as Response);

      const activities = await client.sendRequest('tools/call', {
        name: 'get_activities',
        arguments: {
          startDate: '2024-01-01',
          endDate: '2024-01-31'
        }
      });

      expect(activities.result.content[0].text).toContain('Project 123 (Website Redesign)');
      expect(activities.result.content[0].text).toContain('Task 456 (Frontend Development)');
    });
  });
});