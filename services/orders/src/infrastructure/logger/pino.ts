import pino, { type Logger } from 'pino';

/**
 * Creates a configured pino logger instance with pretty formatting for development
 */
export function createLogger(): Logger {
  const isDevelopment = process.env.NODE_ENV === 'development';

  const baseConfig = {
    level: process.env.LOG_LEVEL ?? 'info',
    base: {
      pid: process.pid,
      hostname: undefined, // Remove hostname for cleaner output
      service: 'order',
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level: (label: string) => {
        return { level: label };
      },
    },
  };

  // Pretty formatting for development
  if (isDevelopment) {
    return pino({
      ...baseConfig,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:HH:MM:ss.l',
          ignore: 'pid,hostname',
          messageFormat: '{level} [ORDER] {msg}',
          // Removed customPrettifiers as they contain non-serializable functions
          // which cause DataCloneError during object cloning
          levelFirst: true,
          hideObject: false,
          singleLine: false,
        }
      }
    });
  }

  // Structured JSON logging for production
  return pino(baseConfig);
}
