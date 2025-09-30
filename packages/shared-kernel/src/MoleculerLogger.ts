import type { LoggerInstance } from 'moleculer';
import type { Logger } from './types';

/**
 * Moleculer logger adapter
 *
 * Implements the Logger interface using Moleculer's built-in logger.
 * This adapter allows using Moleculer's logging infrastructure while
 * maintaining compatibility with the kernel's Logger interface.
 */
export class MoleculerLogger implements Logger {
  constructor(private readonly moleculerLogger: LoggerInstance) {}

  debug(...args: any[]): void {
    this.moleculerLogger.debug(...args);
  }

  info(...args: any[]): void {
    this.moleculerLogger.info(...args);
  }

  warn(...args: any[]): void {
    this.moleculerLogger.warn(...args);
  }

  error(...args: any[]): void {
    this.moleculerLogger.error(...args);
  }
}
