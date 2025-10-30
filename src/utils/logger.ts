import { getLogLevel, type LogLevel } from "../config/environment.js";

const levelPriority: Record<LogLevel, number> = {
    debug: 10,
    info: 20,
    warn: 30,
    error: 40,
};

const severityLabels: Record<LogLevel, string> = {
    debug: "DEBUG",
    info: "INFO",
    warn: "WARNING",
    error: "ERROR",
};

function shouldLog(level: LogLevel): boolean {
    const currentLevel = getLogLevel();
    return levelPriority[level] >= levelPriority[currentLevel];
}

function normalizeMeta(meta: unknown): unknown {
    if (meta instanceof Error) {
        return {
            name: meta.name,
            message: meta.message,
            stack: meta.stack,
        };
    }

    if (typeof meta === "object" && meta !== null) {
        return meta;
    }

    return { value: meta };
}

function serializeEntry(entry: Record<string, unknown>): string {
    try {
        return JSON.stringify(entry);
    } catch (error) {
        return JSON.stringify({
            severity: entry.severity,
            message: entry.message,
            time: entry.time,
            serializationError: error instanceof Error ? error.message : String(error),
        });
    }
}

function log(level: LogLevel, message: string, meta?: unknown): void {
    if (!shouldLog(level)) {
        return;
    }

    const timestamp = new Date().toISOString();
    const entry: Record<string, unknown> = {
        severity: severityLabels[level],
        message,
        time: timestamp,
    };

    if (meta !== undefined) {
        entry.context = normalizeMeta(meta);
    }

    const consoleMethod =
        level === "debug"
            ? console.debug
            : level === "info"
                ? console.info
                : level === "warn"
                    ? console.warn
                    : console.error;

    consoleMethod(serializeEntry(entry));
}

export const logger = {
    debug: (message: string, meta?: unknown) => log("debug", message, meta),
    info: (message: string, meta?: unknown) => log("info", message, meta),
    warn: (message: string, meta?: unknown) => log("warn", message, meta),
    error: (message: string, meta?: unknown) => log("error", message, meta),
    isLevelEnabled: (level: LogLevel) => shouldLog(level),
};
