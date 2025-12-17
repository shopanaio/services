import pino, { type Logger } from 'pino';
import { getServiceConfig, isDevelopment } from "@shopana/shared-service-config";

const { global } = getServiceConfig("orders");

/**
 * Creates a configured pino logger instance with pretty formatting for development
 */
export function createLogger(): Logger {
  const baseConfig = {
    level: global.log_level ?? 'info',
    base: {
      pid: process.pid,
      hostname: undefined, // Remove hostname for cleaner output
      service: 'orders',
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level: (label: string) => {
        return { level: label };
      },
    },
  };

  // Pretty formatting for development
  if (isDevelopment(global)) {
    return pino({
      ...baseConfig,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:HH:MM:ss.l',
          ignore: 'pid,hostname',
          messageFormat: '{level} [ORDERS] {msg}',
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
