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
  /** Optional DNS rebinding protection host whitelist */
  allowedHosts?: string[];
  /** Optional CORS origin whitelist */
  allowedOrigins?: string[];
}

export type LogLevel = "debug" | "info" | "warn" | "error";

const DEFAULT_HTTP_PORT = 8080;
const DEFAULT_HTTP_HOST = "0.0.0.0";
const DEFAULT_HTTP_BASE_PATH = "/mcp";
const DEFAULT_LOG_LEVEL: LogLevel = "info";

/**
 * Retrieves and validates MoCo configuration from environment variables
 * @returns {MocoConfig} Validated configuration object
 * @throws {Error} When required environment variables are missing
 */
export function getMocoConfig(): MocoConfig {
  const apiKey = process.env.MOCO_API_KEY;
  const subdomain = process.env.MOCO_SUBDOMAIN;

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

  return {
    apiKey,
    subdomain,
    baseUrl: `https://${subdomain}.mocoapp.com/api/v1`
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
  const sessionStateful = sessionStatefulEnv ? sessionStatefulEnv.toLowerCase() !== "false" : true;

  const allowedHosts = parseCsv(process.env.MCP_HTTP_ALLOWED_HOSTS);
  const allowedOrigins = parseCsv(process.env.MCP_HTTP_ALLOWED_ORIGINS);

  return {
    port,
    host,
    basePath,
    sessionStateful,
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