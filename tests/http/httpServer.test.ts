/**
 * Integration-style tests for the HTTP MCP server wrapper
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import request from 'supertest';
import { LATEST_PROTOCOL_VERSION } from '@modelcontextprotocol/sdk/types.js';
import { startHttpServer } from '../../src/http';

const BASE_PATH = '/sse';

async function createServer(options: Partial<Parameters<typeof startHttpServer>[0]> = {}) {
  return startHttpServer({
    port: 0,
    handleSignals: false,
    path: BASE_PATH,
    ...options
  });
}

const ACCEPT_HEADER = 'application/json, text/event-stream';

function createBaseHeaders() {
  return {
    Accept: ACCEPT_HEADER,
    'Content-Type': 'application/json'
  } as Record<string, string>;
}

function createSessionHeaders(protocolVersion: string, sessionId?: string) {
  const headers: Record<string, string> = {
    ...createBaseHeaders(),
    'Mcp-Protocol-Version': protocolVersion
  };

  if (sessionId) {
    headers['Mcp-Session-Id'] = sessionId;
  }

  return headers;
}

async function performInitialization(server: Awaited<ReturnType<typeof createServer>>) {
  const initResponse = await request(server.httpServer)
    .post(BASE_PATH)
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

  const negotiatedProtocol = initResponse.body?.result?.protocolVersion as string | undefined;
  expect(typeof negotiatedProtocol).toBe('string');

  const sessionIdHeader = initResponse.headers['mcp-session-id'];
  const sessionId = Array.isArray(sessionIdHeader) ? sessionIdHeader[0] : sessionIdHeader;

  return { sessionId: sessionId ?? undefined, protocolVersion: negotiatedProtocol as string };
}

let consoleErrorSpy: jest.SpiedFunction<typeof console.error>;

beforeEach(() => {
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

describe('HTTP MCP server (stateless sessions)', () => {
  it('performs initialization handshake and lists tools and prompts', async () => {
    const controls = await createServer({ sessionStateful: false });
    try {
      const { sessionId, protocolVersion } = await performInitialization(controls);

      const initializedResponse = await request(controls.httpServer)
        .post(BASE_PATH)
        .set(createSessionHeaders(protocolVersion, sessionId))
        .send({
          jsonrpc: '2.0',
          method: 'initialized',
          params: {}
        });

      expect(initializedResponse.status).toBe(202);

      const toolsResponse = await request(controls.httpServer)
        .post(BASE_PATH)
        .set(createSessionHeaders(protocolVersion, sessionId))
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
        .post(BASE_PATH)
        .set(createSessionHeaders(protocolVersion, sessionId))
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
    const controls = await createServer({ sessionStateful: false });
    try {
      const response = await request(controls.httpServer).get(BASE_PATH);

      expect(response.status).toBe(406);
      expect(response.text).toContain('Not Acceptable');
    } finally {
      await controls.shutdown();
    }
  });

  it('returns 406 when POST requests do not advertise both accepted content types', async () => {
    const controls = await createServer({ sessionStateful: false });
    try {
      const response = await request(controls.httpServer)
        .post(BASE_PATH)
        .set('Content-Type', 'application/json')
        .send({});

      expect(response.status).toBe(406);
      expect(response.text).toContain('Not Acceptable');
    } finally {
      await controls.shutdown();
    }
  });

  it('returns 404 for requests outside the configured base path', async () => {
    const controls = await createServer({ sessionStateful: false });
    try {
      const response = await request(controls.httpServer)
        .post('/wrong-path')
        .set(createBaseHeaders())
        .send({
          jsonrpc: '2.0',
          id: 42,
          method: 'tools/list',
          params: {}
        });

      expect(response.status).toBe(404);
      expect(response.body?.error?.message).toBe('Not Found');
    } finally {
      await controls.shutdown();
    }
  });

  it('shuts down cleanly via the exposed shutdown helper', async () => {
    const controls = await createServer({ sessionStateful: false });
    await controls.shutdown();

    expect(controls.httpServer.listening).toBe(false);
  });
});

describe('HTTP MCP server (stateful sessions)', () => {
  it('requires session headers for event streams before initialization', async () => {
    const controls = await createServer({ sessionStateful: true });
    try {
      const response = await request(controls.httpServer)
        .get(BASE_PATH)
        .set('Accept', 'text/event-stream');

      expect(response.status).toBe(400);
      expect(response.text).toContain('Server not initialized');
    } finally {
      await controls.shutdown();
    }
  });

  it('rejects POST requests missing session headers after initialization', async () => {
    const controls = await createServer({ sessionStateful: true });
    try {
      const { protocolVersion } = await performInitialization(controls);

      const response = await request(controls.httpServer)
        .post(BASE_PATH)
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
