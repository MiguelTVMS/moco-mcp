import { createServer, type IncomingMessage, type Server as NodeHttpServer } from "node:http";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { connect, type Listener } from "@ngrok/ngrok";
import { AVAILABLE_TOOLS, MOCO_PROMPTS, createMocoServer } from "./index.js";
import { getHttpServerConfig, normalizeHttpBasePath } from "./config/environment.js";
import { logger } from "./utils/logger.js";

interface HttpServerControls {
  httpServer: NodeHttpServer;
  transport: StreamableHTTPServerTransport;
  mcpServer: ReturnType<typeof createMocoServer>;
  shutdown: (signal?: NodeJS.Signals) => Promise<void>;
  ngrokListener?: Listener;
}

interface StartHttpServerOptions {
  port?: number;
  host?: string;
  path?: string;
  sessionStateful?: boolean;
  handleSignals?: boolean;
  ngrokEnabled?: boolean;
}

export async function startHttpServer(options: StartHttpServerOptions = {}): Promise<HttpServerControls> {
  const envConfig = getHttpServerConfig();
  const port = options.port ?? envConfig.port;
  const host = options.host ?? envConfig.host;
  const basePath = normalizeHttpBasePath(options.path ?? envConfig.basePath);
  const sessionStateful = options.sessionStateful ?? envConfig.sessionStateful;
  const handleSignals = options.handleSignals ?? true;
  const ngrokEnabled = options.ngrokEnabled ?? envConfig.ngrokEnabled;
  const allowedHosts = envConfig.allowedHosts;
  const allowedOrigins = envConfig.allowedOrigins;

  const mcpServer = createMocoServer();

  const cachedToolsList = Object.freeze(
    AVAILABLE_TOOLS.map((tool) =>
      Object.freeze({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      })
    )
  );

  mcpServer.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: cachedToolsList,
  }));
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: sessionStateful ? () => randomUUID() : undefined,
    enableJsonResponse: true,
    allowedHosts,
    allowedOrigins,
    enableDnsRebindingProtection: Boolean(allowedHosts?.length || allowedOrigins?.length),
  });

  await mcpServer.connect(transport);

  const httpServer = createServer(async (req, res) => {
    const shouldLogDebug = logger.isLevelEnabled("debug");
    let requestLogged = false;
    let requestUrl: URL | undefined;

    const logRequest = (body: unknown) => {
      if (!shouldLogDebug || requestLogged) {
        return;
      }
      requestLogged = true;
      logger.debug("HTTP request received", {
        method: req.method,
        url: requestUrl?.href ?? req.url ?? "/",
        headers: req.headers,
        body,
      });
    };

    try {
      requestUrl = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
      const matchesBasePath = basePath === "/"
        ? true
        : requestUrl.pathname === basePath || requestUrl.pathname.startsWith(`${basePath}/`);

      if (shouldLogDebug) {
        captureRequestBody(
          req,
          (body) => {
            if (body === undefined || body.length === 0) {
              logRequest(null);
              return;
            }
            try {
              logRequest(JSON.parse(body));
            } catch {
              logRequest(body);
            }
          },
          (error) => {
            logRequest({ error });
          },
        );
      }

      if (!matchesBasePath) {
        logRequest(null);
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          jsonrpc: "2.0",
          error: {
            code: -32601,
            message: "Not Found",
          },
          id: null,
        }));
        if (shouldLogDebug) {
          req.resume();
        }
        return;
      }

      if (basePath !== "/") {
        const remainder = requestUrl.pathname.slice(basePath.length) || "/";
        const normalizedRemainder = remainder.startsWith("/") ? remainder : `/${remainder}`;
        req.url = `${normalizedRemainder}${requestUrl.search}`;
      }
      await transport.handleRequest(req, res);
    } catch (error) {
      logRequest(null);
      logger.debug("HTTP request handler caught error", {
        message: error instanceof Error ? error.message : String(error),
      });
      console.error("Failed to handle HTTP request:", error);
      if (!res.headersSent) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          jsonrpc: "2.0",
          error: {
            code: -32000,
            message: "Internal server error",
          },
          id: null,
        }));
      } else {
        res.end();
      }
    }
  });

  await new Promise<void>((resolve, reject) => {
    httpServer.on("error", reject);
    httpServer.listen(port, host, resolve);
  });

  console.error(`MoCo MCP HTTP server listening on http://${host}:${port}${basePath}`);
  console.error(`Available tools: ${AVAILABLE_TOOLS.map((tool) => tool.name).join(", ")}`);
  console.error(`Available prompts: ${MOCO_PROMPTS.map((prompt) => prompt.name).join(", ")}`);

  let ngrokListener: Listener | undefined;

  if (ngrokEnabled) {
    void connect({ addr: port, authtoken_from_env: true })
      .then((listener) => {
        ngrokListener = listener;
        const ingressUrl = listener.url();
        console.error(`ngrok tunnel established at ${ingressUrl}`);
        console.error(`Remote MCP endpoint available at ${ingressUrl}${basePath}`);
      })
      .catch((error) => {
        console.error("Failed to establish ngrok tunnel:", error instanceof Error ? error.message : error);
      });
  }

  const shutdown = async (signal?: NodeJS.Signals) => {
    if (signal) {
      console.error(`Received ${signal}, stopping HTTP MCP server...`);
    }
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    await transport.close();
    await mcpServer.close();
    if (ngrokListener) {
      try {
        await ngrokListener.close();
        console.error("ngrok tunnel closed");
      } catch (error) {
        console.error("Error closing ngrok tunnel:", error instanceof Error ? error.message : error);
      }
    }
  };

  if (handleSignals) {
    const shutdownSignals: NodeJS.Signals[] = ["SIGINT", "SIGTERM"];
    shutdownSignals.forEach((signal) => {
      process.once(signal, () => {
        void shutdown(signal)
          .catch((error) => {
            console.error("Error during HTTP MCP server shutdown:", error);
          })
          .finally(() => process.exit(0));
      });
    });
  }

  return { httpServer, transport, mcpServer, shutdown, ngrokListener };
}

const isCliEntry = (() => {
  const entryPoint = process.argv?.[1];
  if (!entryPoint) {
    return false;
  }
  const entryBasename = path.basename(entryPoint);
  return entryBasename === "http.ts" || entryBasename === "http.js";
})();

if (isCliEntry) {
  startHttpServer().catch((error) => {
    console.error("Failed to start MoCo MCP HTTP server:", error);
    process.exit(1);
  });
}

type RequestBodyCallback = (body: string | undefined) => void;
type RequestErrorCallback = (error: string) => void;

function captureRequestBody(req: IncomingMessage, onComplete: RequestBodyCallback, onError: RequestErrorCallback): void {
  const chunks: Buffer[] = [];
  let finished = false;

  const cleanup = () => {
    if (typeof req.off === "function") {
      req.off("data", onData as unknown as (...args: unknown[]) => void);
      req.off("end", onEnd as unknown as (...args: unknown[]) => void);
      req.off("error", onErrorHandler as unknown as (...args: unknown[]) => void);
      req.off("close", onClose as unknown as (...args: unknown[]) => void);
    } else {
      req.removeListener("data", onData as unknown as (...args: unknown[]) => void);
      req.removeListener("end", onEnd as unknown as (...args: unknown[]) => void);
      req.removeListener("error", onErrorHandler as unknown as (...args: unknown[]) => void);
      req.removeListener("close", onClose as unknown as (...args: unknown[]) => void);
    }
  };

  const complete = (body: string | undefined) => {
    if (finished) {
      return;
    }
    finished = true;
    cleanup();
    onComplete(body);
  };

  const fail = (message: string) => {
    if (finished) {
      return;
    }
    finished = true;
    cleanup();
    onError(message);
  };

  const onData = (chunk: Buffer | string) => {
    if (typeof chunk === "string") {
      chunks.push(Buffer.from(chunk));
    } else {
      chunks.push(chunk);
    }
  };

  const onEnd = () => {
    complete(chunks.length > 0 ? Buffer.concat(chunks).toString("utf8") : undefined);
  };

  const onClose = () => {
    complete(chunks.length > 0 ? Buffer.concat(chunks).toString("utf8") : undefined);
  };

  const onErrorHandler = (err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    fail(message);
  };

  req.on("data", onData);
  req.on("end", onEnd);
  req.on("close", onClose);
  req.on("error", onErrorHandler);
}
