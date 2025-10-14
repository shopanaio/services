import pino from "pino";

/**
 * Create and configure application logger
 */
export function createLogger() {
  const isDevelopment = process.env.NODE_ENV !== "production";
  const logLevel = process.env.LOG_LEVEL || (isDevelopment ? "debug" : "info");

  return pino({
    level: logLevel,
    transport: isDevelopment
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "HH:MM:ss.l",
            ignore: "pid,hostname",
            singleLine: false,
          },
        }
      : undefined,
    formatters: {
      level: (label) => {
        return { level: label };
      },
    },
  });
}
