/**
 * Integration-style tests for the HTTP MCP server wrapper
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import request from 'supertest';
import { LATEST_PROTOCOL_VERSION } from '@modelcontextprotocol/sdk/types.js';
import { startHttpServer } from '../../src/http';

async function createServer() {
  return startHttpServer({ port: 0, handleSignals: false });
}

const ACCEPT_HEADER = 'application/json, text/event-stream';

function createBaseHeaders() {
  return {
    Accept: ACCEPT_HEADER,
    'Content-Type': 'application/json'
  } as Record<string, string>;
}

function createSessionHeaders(sessionId: string, protocolVersion: string) {
    return {
      ...createBaseHeaders(),
      'Mcp-Session-Id': sessionId,
      'Mcp-Protocol-Version': protocolVersion
    };
}

async function performInitialization(server: Awaited<ReturnType<typeof createServer>>) {
  const initResponse = await request(server.httpServer)
    .post('/')
    .set(createBaseHeaders())
    .send({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: LATEST_PROTOCOL_VERSION,
        capabilities: {},
        clientInfo: { name: 'http-test-suite', version: '1.0.0' }
      }
    });

  expect(initResponse.status).toBe(200);
  expect(initResponse.body?.result?.serverInfo?.name).toBe('moco-mcp');

  const sessionId = initResponse.headers['mcp-session-id'];
  expect(sessionId).toBeDefined();

  const negotiatedProtocol = initResponse.body?.result?.protocolVersion as string | undefined;
  expect(typeof negotiatedProtocol).toBe('string');

  return { sessionId: sessionId as string, protocolVersion: negotiatedProtocol as string };
}

let consoleErrorSpy: jest.SpiedFunction<typeof console.error>;

beforeEach(() => {
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

describe('HTTP MCP server', () => {
  it('performs initialization handshake and lists tools and prompts', async () => {
    const controls = await createServer();
    try {
      const { sessionId, protocolVersion } = await performInitialization(controls);

      const initializedResponse = await request(controls.httpServer)
        .post('/')
        .set(createSessionHeaders(sessionId, protocolVersion))
        .send({
          jsonrpc: '2.0',
          method: 'initialized',
          params: {}
        });

      expect(initializedResponse.status).toBe(202);

      const toolsResponse = await request(controls.httpServer)
        .post('/')
        .set(createSessionHeaders(sessionId, protocolVersion))
        .send({
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/list',
          params: {}
        });

      expect(toolsResponse.status).toBe(200);
      expect(Array.isArray(toolsResponse.body?.result?.tools)).toBe(true);
      expect(toolsResponse.body.result.tools).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'get_activities' })
        ])
      );

      const promptsResponse = await request(controls.httpServer)
        .post('/')
        .set(createSessionHeaders(sessionId, protocolVersion))
        .send({
          jsonrpc: '2.0',
          id: 3,
          method: 'prompts/list',
          params: {}
        });

      expect(promptsResponse.status).toBe(200);
      expect(Array.isArray(promptsResponse.body?.result?.prompts)).toBe(true);
      expect(promptsResponse.body.result.prompts.length).toBeGreaterThan(0);
    } finally {
      await controls.shutdown();
    }
  });

  it('rejects GET requests without the required Accept header', async () => {
    const controls = await createServer();
    try {
      const response = await request(controls.httpServer).get('/');

      expect(response.status).toBe(406);
      expect(response.text).toContain('Not Acceptable');
    } finally {
      await controls.shutdown();
    }
  });

  it('rejects GET requests before initialization when session headers are missing', async () => {
    const controls = await createServer();
    try {
      const response = await request(controls.httpServer)
        .get('/')
        .set('Accept', 'text/event-stream');

      expect(response.status).toBe(400);
      expect(response.text).toContain('Server not initialized');
    } finally {
      await controls.shutdown();
    }
  });

  it('returns 406 when POST requests do not advertise both accepted content types', async () => {
    const controls = await createServer();
    try {
      const response = await request(controls.httpServer)
        .post('/')
        .set('Content-Type', 'application/json')
        .send({});

      expect(response.status).toBe(406);
      expect(response.text).toContain('Not Acceptable');
    } finally {
      await controls.shutdown();
    }
  });

  it('shuts down cleanly via the exposed shutdown helper', async () => {
    const controls = await createServer();
    await controls.shutdown();

    expect(controls.httpServer.listening).toBe(false);
  });

  it('rejects POST requests missing session headers after initialization', async () => {
    const controls = await createServer();
    try {
      const { protocolVersion } = await performInitialization(controls);

      const response = await request(controls.httpServer)
        .post('/')
        .set({
          ...createBaseHeaders(),
          'Mcp-Protocol-Version': protocolVersion
        })
        .send({
          jsonrpc: '2.0',
          id: 99,
          method: 'tools/list',
          params: {}
        });

      expect(response.status).toBe(400);
      expect(response.text).toContain('Mcp-Session-Id header is required');
    } finally {
      await controls.shutdown();
    }
  });
});
