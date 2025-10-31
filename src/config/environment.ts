/**
 * Configuration management for MoCo API connection
 * Handles environment variables validation and provides typed configuration
 */

export interface MocoConfig {
  /** API key for MoCo authentication */
  apiKey: string;
  /** MoCo subdomain (e.g., 'yourcompany' for 'yourcompany.mocoapp.com') */
  subdomain: string;
  /** Complete base URL for MoCo API requests */
  baseUrl: string;
  /** Default cache TTL for MoCo API list responses (seconds) */
  cacheTtlSeconds: number;
}

export interface HttpServerConfig {
  /** Port the HTTP transport listens on */
  port: number;
  /** Host binding for the HTTP transport */
  host: string;
  /** Base path for the HTTP endpoint */
  basePath: string;
  /** Whether the server maintains session state */
  sessionStateful: boolean;
  /** Whether to automatically start an ngrok tunnel */
  ngrokEnabled: boolean;
  /** Optional DNS rebinding protection host whitelist */
  allowedHosts?: string[];
  /** Optional CORS origin whitelist */
  allowedOrigins?: string[];
}

export type LogLevel = "debug" | "info" | "warn" | "error";

const DEFAULT_HTTP_PORT = 8080;
const DEFAULT_HTTP_HOST = "0.0.0.0";
const DEFAULT_HTTP_BASE_PATH = "/sse";
const DEFAULT_HTTP_SESSION_STATEFUL = false;
const DEFAULT_LOG_LEVEL: LogLevel = "info";
const DEFAULT_NGROK_ENABLED = false;
const DEFAULT_CACHE_TTL_SECONDS = 300; // 5 minutes

/**
 * Retrieves and validates MoCo configuration from environment variables
 * @returns {MocoConfig} Validated configuration object
 * @throws {Error} When required environment variables are missing
 */
export function getMocoConfig(): MocoConfig {
  const apiKey = process.env.MOCO_API_KEY;
  const subdomain = process.env.MOCO_SUBDOMAIN;
  const cacheTtlEnv = process.env.MOCO_API_CACHE_TIME;

  if (!apiKey) {
    throw new Error('MOCO_API_KEY environment variable is required');
  }

  if (!subdomain) {
    throw new Error('MOCO_SUBDOMAIN environment variable is required');
  }

  // Validate subdomain format - should not contain protocol or domain parts
  if (subdomain.includes('.') || subdomain.includes('http')) {
    throw new Error('MOCO_SUBDOMAIN should only contain the subdomain name (e.g., "yourcompany", not "yourcompany.mocoapp.com")');
  }

  let cacheTtlSeconds = DEFAULT_CACHE_TTL_SECONDS;

  if (cacheTtlEnv !== undefined) {
    const parsed = Number.parseInt(cacheTtlEnv, 10);

    if (Number.isNaN(parsed) || parsed < 0) {
      throw new Error('MOCO_API_CACHE_TIME must be a non-negative integer representing seconds.');
    }

    cacheTtlSeconds = parsed;
  }

  return {
    apiKey,
    subdomain,
    baseUrl: `https://${subdomain}.mocoapp.com/api/v1`,
    cacheTtlSeconds
  };
}

function parseCsv(value: string | undefined): string[] | undefined {
  if (!value) {
    return undefined;
  }
  const entries = value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  return entries.length > 0 ? entries : undefined;
}

export function normalizeHttpBasePath(pathValue: string | undefined): string {
  if (!pathValue) {
    return DEFAULT_HTTP_BASE_PATH;
  }
  const trimmed = pathValue.trim();
  if (!trimmed) {
    return DEFAULT_HTTP_BASE_PATH;
  }
  const withLeadingSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  if (withLeadingSlash.length === 1) {
    return "/";
  }
  return withLeadingSlash.endsWith("/") ? withLeadingSlash.slice(0, -1) : withLeadingSlash;
}

export function getHttpServerConfig(): HttpServerConfig {
  const rawPort = process.env.MCP_HTTP_PORT ?? process.env.PORT;
  const parsedPort = rawPort ? Number.parseInt(rawPort, 10) : DEFAULT_HTTP_PORT;
  const port = Number.isNaN(parsedPort) || parsedPort <= 0 ? DEFAULT_HTTP_PORT : parsedPort;

  const host = process.env.MCP_HTTP_HOST?.trim() || DEFAULT_HTTP_HOST;
  const basePath = normalizeHttpBasePath(process.env.MCP_HTTP_PATH);

  const sessionStatefulEnv = process.env.MCP_HTTP_SESSION_STATEFUL;
  const sessionStateful = sessionStatefulEnv
    ? sessionStatefulEnv.toLowerCase() !== "false"
    : DEFAULT_HTTP_SESSION_STATEFUL;

  const ngrokEnabledEnv = process.env.NGROK_ENABLED;
  const ngrokEnabled = ngrokEnabledEnv
    ? ["1", "true", "yes", "on"].includes(ngrokEnabledEnv.toLowerCase())
    : DEFAULT_NGROK_ENABLED;

  const allowedHosts = parseCsv(process.env.MCP_HTTP_ALLOWED_HOSTS);
  const allowedOrigins = parseCsv(process.env.MCP_HTTP_ALLOWED_ORIGINS);

  return {
    port,
    host,
    basePath,
    sessionStateful,
    ngrokEnabled,
    allowedHosts,
    allowedOrigins,
  };
}

function normalizeLogLevel(level: string | undefined): LogLevel {
  if (!level) {
    return DEFAULT_LOG_LEVEL;
  }
  const normalized = level.toLowerCase();
  switch (normalized) {
    case "debug":
    case "info":
    case "warn":
    case "error":
      return normalized;
    default:
      return DEFAULT_LOG_LEVEL;
  }
}

export function getLogLevel(): LogLevel {
  return normalizeLogLevel(process.env.LOG_LEVEL);
}