import { createServer, type Server as NodeHttpServer } from "node:http";
import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { AVAILABLE_TOOLS, MOCO_PROMPTS, createMocoServer } from "./index.js";

interface HttpServerControls {
  httpServer: NodeHttpServer;
  transport: StreamableHTTPServerTransport;
  mcpServer: ReturnType<typeof createMocoServer>;
  shutdown: (signal?: NodeJS.Signals) => Promise<void>;
}

interface StartHttpServerOptions {
  port?: number;
  host?: string;
  sessionMode?: "stateful" | "stateless";
  handleSignals?: boolean;
}

function parseCsvEnv(value: string | undefined): string[] | undefined {
  if (!value) {
    return undefined;
  }
  const entries = value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  return entries.length > 0 ? entries : undefined;
}

export async function startHttpServer(options: StartHttpServerOptions = {}): Promise<HttpServerControls> {
  const port = options.port ?? Number(process.env.MCP_HTTP_PORT ?? process.env.PORT ?? 8080);
  const host = options.host ?? process.env.MCP_HTTP_HOST ?? "0.0.0.0";
  const sessionMode = options.sessionMode ?? (process.env.MCP_HTTP_SESSION_MODE?.toLowerCase() === "stateless" ? "stateless" : "stateful");
  const handleSignals = options.handleSignals ?? true;

  const allowedHosts = parseCsvEnv(process.env.MCP_HTTP_ALLOWED_HOSTS);
  const allowedOrigins = parseCsvEnv(process.env.MCP_HTTP_ALLOWED_ORIGINS);

  const mcpServer = createMocoServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: sessionMode === "stateless" ? undefined : () => randomUUID(),
    enableJsonResponse: true,
    allowedHosts,
    allowedOrigins,
    enableDnsRebindingProtection: Boolean(allowedHosts?.length || allowedOrigins?.length),
  });

  await mcpServer.connect(transport);

  const httpServer = createServer(async (req, res) => {
    try {
      await transport.handleRequest(req, res);
    } catch (error) {
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

  console.error(`MoCo MCP HTTP server listening on http://${host}:${port}`);
  console.error(`Available tools: ${AVAILABLE_TOOLS.map((tool) => tool.name).join(", ")}`);
  console.error(`Available prompts: ${MOCO_PROMPTS.map((prompt) => prompt.name).join(", ")}`);

  const shutdown = async (signal?: NodeJS.Signals) => {
    if (signal) {
      console.error(`Received ${signal}, stopping HTTP MCP server...`);
    }
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    await transport.close();
    await mcpServer.close();
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

  return { httpServer, transport, mcpServer, shutdown };
}

const getCurrentModuleUrl = (): string | undefined => {
  try {
    return Function('return import.meta.url;')();
  } catch {
    return undefined;
  }
};

const isCliEntry = (() => {
  const entryPoint = process.argv?.[1];
  if (!entryPoint) {
    return false;
  }
  const moduleUrl = getCurrentModuleUrl();
  if (!moduleUrl) {
    return false;
  }
  try {
    return moduleUrl === pathToFileURL(entryPoint).href;
  } catch {
    return false;
  }
})();

if (isCliEntry) {
  startHttpServer().catch((error) => {
    console.error("Failed to start MoCo MCP HTTP server:", error);
    process.exit(1);
  });
}
