import type { LoggerInstance } from 'moleculer';
import type { Logger } from '../../kernel/types.js';

/**
 * Moleculer logger adapter that implements the Logger interface
 * This allows using Moleculer's built-in logger throughout the application
 * while maintaining compatibility with the existing Logger interface
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
