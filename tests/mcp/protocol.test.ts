/**
 * MCP Protocol Compliance Tests
 * Tests the server's adherence to MCP protocol specifications
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { spawn, ChildProcess } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface MCPRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params?: any;
}

interface MCPResponse {
  jsonrpc: '2.0';
  id: number;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

describe('MCP Protocol Compliance', () => {
  let serverProcess: ChildProcess;
  let requestId = 1;

  beforeAll(async () => {
    // Start the MCP server
    serverProcess = spawn('node', [join(__dirname, '../../dist/index.js')], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        MOCO_API_KEY: 'test-api-key',
        MOCO_SUBDOMAIN: 'test-company'
      }
    });

    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  afterAll(() => {
    if (serverProcess) {
      serverProcess.kill();
    }
  });

  const sendRequest = async (method: string, params?: any): Promise<MCPResponse> => {
    const request: MCPRequest = {
      jsonrpc: '2.0',
      id: requestId++,
      method,
      params
    };

    return new Promise((resolve, reject) => {
      let responseData = '';
      const timeout = setTimeout(() => {
        reject(new Error('Request timeout'));
      }, 5000);

      const onData = (data: Buffer) => {
        responseData += data.toString();
        try {
          const lines = responseData.trim().split('\n');
          for (const line of lines) {
            if (line.trim()) {
              const response = JSON.parse(line);
              if (response.id === request.id) {
                clearTimeout(timeout);
                serverProcess.stdout!.off('data', onData);
                resolve(response);
                return;
              }
            }
          }
        } catch (e) {
          // Not complete JSON yet
        }
      };

      serverProcess.stdout!.on('data', onData);
      serverProcess.stdin!.write(JSON.stringify(request) + '\n');
    });
  };

  describe('Basic Protocol', () => {
    it('should respond to initialize request', async () => {
      const response = await sendRequest('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {
          roots: { listChanged: false }
        },
        clientInfo: {
          name: 'test-client',
          version: '1.0.0'
        }
      });

      expect(response).toMatchObject({
        jsonrpc: '2.0',
        id: expect.any(Number),
        result: expect.objectContaining({
          protocolVersion: expect.any(String),
          capabilities: expect.objectContaining({
            tools: expect.any(Object)
          }),
          serverInfo: expect.objectContaining({
            name: 'moco-mcp',
            version: '1.0.0'
          })
        })
      });
    });

    it('should handle invalid JSON-RPC requests', async () => {
      const invalidRequest = { method: 'test', id: 999 }; // Missing jsonrpc

      return new Promise((resolve) => {
        let responseData = '';
        const timeout = setTimeout(() => {
          resolve(undefined); // No response expected for invalid JSON-RPC
        }, 1000);

        const onData = (data: Buffer) => {
          responseData += data.toString();
          try {
            const response = JSON.parse(responseData);
            if (response.id === 999) {
              clearTimeout(timeout);
              serverProcess.stdout!.off('data', onData);

              // Should be an error response
              expect(response).toMatchObject({
                jsonrpc: '2.0',
                id: 999,
                error: expect.objectContaining({
                  code: expect.any(Number),
                  message: expect.any(String)
                })
              });
              resolve(response);
            }
          } catch (e) {
            // Not complete JSON yet
          }
        };

        serverProcess.stdout!.on('data', onData);
        serverProcess.stdin!.write(JSON.stringify(invalidRequest) + '\n');
      });
    });
  });

  describe('Resource Handling', () => {
    it('should list resources (empty for this server)', async () => {
      const response = await sendRequest('resources/list');

      expect(response).toMatchObject({
        jsonrpc: '2.0',
        id: expect.any(Number),
        result: {
          resources: []
        }
      });
    });

    it('should handle resource read requests with error', async () => {
      const response = await sendRequest('resources/read', {
        uri: 'nonexistent://resource'
      });

      expect(response).toMatchObject({
        jsonrpc: '2.0',
        id: expect.any(Number),
        error: expect.objectContaining({
          message: expect.stringContaining('Resource not found')
        })
      });
    });
  });

  describe('Tool Handling', () => {
    it('should list all available tools', async () => {
      const response = await sendRequest('tools/list');

      expect(response).toMatchObject({
        jsonrpc: '2.0',
        id: expect.any(Number),
        result: {
          tools: expect.arrayContaining([
            expect.objectContaining({
              name: 'get_activities',
              description: expect.any(String),
              inputSchema: expect.any(Object)
            }),
            expect.objectContaining({
              name: 'get_user_projects',
              description: expect.any(String),
              inputSchema: expect.any(Object)
            }),
            expect.objectContaining({
              name: 'get_user_project_tasks',
              description: expect.any(String),
              inputSchema: expect.any(Object)
            }),
            expect.objectContaining({
              name: 'search_users',
              description: expect.any(String),
              inputSchema: expect.any(Object)
            }),
            expect.objectContaining({
              name: 'get_user_holidays',
              description: expect.any(String),
              inputSchema: expect.any(Object)
            }),
            expect.objectContaining({
              name: 'get_user_presences',
              description: expect.any(String),
              inputSchema: expect.any(Object)
            })
          ])
        }
      });

      // Verify we have exactly 8 tools  
      expect(response.result.tools).toHaveLength(8);
    });

    it('should validate tool input schemas', async () => {
      const response = await sendRequest('tools/list');
      const tools = response.result.tools;

      // Check each tool has proper schema structure
      tools.forEach((tool: any) => {
        expect(tool).toMatchObject({
          name: expect.any(String),
          description: expect.any(String),
          inputSchema: expect.objectContaining({
            type: 'object',
            properties: expect.any(Object)
          })
        });
      });
    });

    it('should handle unknown tool calls', async () => {
      const response = await sendRequest('tools/call', {
        name: 'nonexistent_tool',
        arguments: {}
      });

      expect(response).toMatchObject({
        jsonrpc: '2.0',
        id: expect.any(Number),
        error: expect.objectContaining({
          message: expect.stringContaining('Tool not found')
        })
      });
    });

    it('should handle tool calls with validation errors', async () => {
      const response = await sendRequest('tools/call', {
        name: 'get_activities',
        arguments: {
          startDate: 'invalid-date',
          endDate: '2024-01-31'
        }
      });

      expect(response).toMatchObject({
        jsonrpc: '2.0',
        id: expect.any(Number),
        result: {
          content: [
            {
              type: 'text',
              text: expect.stringContaining('Invalid date range')
            }
          ]
        }
      });
    });
  });

  describe('Tool-Specific Protocol Compliance', () => {
    it('should handle get_user_projects tool call', async () => {
      const response = await sendRequest('tools/call', {
        name: 'get_user_projects',
        arguments: {}
      });

      expect(response).toMatchObject({
        jsonrpc: '2.0',
        id: expect.any(Number),
        result: {
          content: [
            {
              type: 'text',
              text: expect.any(String)
            }
          ]
        }
      });
    });

    it('should handle get_user_projects with search query', async () => {
      const response = await sendRequest('tools/call', {
        name: 'get_user_projects',
        arguments: {
          query: 'test'
        }
      });

      expect(response).toMatchObject({
        jsonrpc: '2.0',
        id: expect.any(Number),
        result: {
          content: [
            {
              type: 'text',
              text: expect.any(String)
            }
          ]
        }
      });
    });

    it('should handle get_user_project_tasks tool call', async () => {
      it('should handle search_users tool call', async () => {
        const response = await sendRequest('tools/call', {
          name: 'search_users',
          arguments: {
            query: 'doe'
          }
        });

        expect(response).toMatchObject({
          jsonrpc: '2.0',
          id: expect.any(Number),
          result: {
            content: [
              {
                type: 'text',
                text: expect.any(String)
              }
            ]
          }
        });
      });

      const response = await sendRequest('tools/call', {
        name: 'get_user_project_tasks',
        arguments: {
          projectId: 123
        }
      });

      expect(response).toMatchObject({
        jsonrpc: '2.0',
        id: expect.any(Number),
        result: {
          content: [
            {
              type: 'text',
              text: expect.any(String)
            }
          ]
        }
      });
    });

    it('should validate project ID parameter', async () => {
      const response = await sendRequest('tools/call', {
        name: 'get_user_project_tasks',
        arguments: {
          projectId: -1
        }
      });

      expect(response.result.content[0].text).toContain('Invalid project ID');
    });

    it('should handle get_user_holidays tool call', async () => {
      const response = await sendRequest('tools/call', {
        name: 'get_user_holidays',
        arguments: {
          year: 2024
        }
      });

      expect(response).toMatchObject({
        jsonrpc: '2.0',
        id: expect.any(Number),
        result: {
          content: [
            {
              type: 'text',
              text: expect.any(String)
            }
          ]
        }
      });
    });

    it('should validate year parameter', async () => {
      const response = await sendRequest('tools/call', {
        name: 'get_user_holidays',
        arguments: {
          year: 1999
        }
      });

      expect(response.result.content[0].text).toContain('Invalid year');
    });

    it('should handle get_user_presences tool call', async () => {
      const response = await sendRequest('tools/call', {
        name: 'get_user_presences',
        arguments: {
          startDate: '2024-01-01',
          endDate: '2024-01-31'
        }
      });

      expect(response).toMatchObject({
        jsonrpc: '2.0',
        id: expect.any(Number),
        result: {
          content: [
            {
              type: 'text',
              text: expect.any(String)
            }
          ]
        }
      });
    });
  });

  describe('Error Handling Protocol', () => {
    it('should return proper error format for invalid methods', async () => {
      const response = await sendRequest('invalid/method');

      expect(response).toMatchObject({
        jsonrpc: '2.0',
        id: expect.any(Number),
        error: expect.objectContaining({
          code: expect.any(Number),
          message: expect.any(String)
        })
      });
    });

    it('should handle malformed parameters gracefully', async () => {
      const response = await sendRequest('tools/call', {
        name: 'get_activities'
        // Missing required parameters
      });

      expect(response).toMatchObject({
        jsonrpc: '2.0',
        id: expect.any(Number),
        result: {
          content: [
            {
              type: 'text',
              text: expect.any(String)
            }
          ]
        }
      });
    });
  });
});