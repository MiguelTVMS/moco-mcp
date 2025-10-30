import { getLogLevel, type LogLevel } from "../config/environment.js";

const levelPriority: Record<LogLevel, number> = {
    debug: 10,
    info: 20,
    warn: 30,
    error: 40,
};

function shouldLog(level: LogLevel): boolean {
    const currentLevel = getLogLevel();
    return levelPriority[level] >= levelPriority[currentLevel];
}

function log(level: LogLevel, message: string, meta?: unknown): void {
    if (!shouldLog(level)) {
        return;
    }

    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

    const consoleMethod =
        level === "debug"
            ? console.debug
            : level === "info"
                ? console.info
                : level === "warn"
                    ? console.warn
                    : console.error;

    if (meta !== undefined) {
        consoleMethod(prefix, meta);
    } else {
        consoleMethod(prefix);
    }
}

export const logger = {
    debug: (message: string, meta?: unknown) => log("debug", message, meta),
    info: (message: string, meta?: unknown) => log("info", message, meta),
    warn: (message: string, meta?: unknown) => log("warn", message, meta),
    error: (message: string, meta?: unknown) => log("error", message, meta),
    isLevelEnabled: (level: LogLevel) => shouldLog(level),
};
