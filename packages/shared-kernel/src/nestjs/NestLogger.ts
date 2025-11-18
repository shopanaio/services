import { Logger as NestLoggerImpl } from '@nestjs/common';
import type { Logger } from '../types';

/**
 * Adapter that implements the shared Logger interface using NestJS utilities.
 */
export class NestJsLogger implements Logger {
  private readonly logger: NestLoggerImpl;

  constructor(context: string) {
    this.logger = new NestLoggerImpl(context);
  }

  debug(...args: unknown[]): void {
    this.logger.debug(this.formatArgs(args));
  }

  info(...args: unknown[]): void {
    this.logger.log(this.formatArgs(args));
  }

  warn(...args: unknown[]): void {
    this.logger.warn(this.formatArgs(args));
  }

  error(...args: unknown[]): void {
    this.logger.error(this.formatArgs(args));
  }

  private formatArgs(args: unknown[]): string {
    return args
      .map((arg) => {
        if (arg === null) {
          return 'null';
        }
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg);
          } catch (error) {
            return String(arg);
          }
        }
        return String(arg);
      })
      .join(' ');
  }
}
