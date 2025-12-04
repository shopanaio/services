import type { Logger } from './types';

/**
 * Adapter for NestJS Logger to Kernel Logger interface
 */
export class NestLogger implements Logger {
  constructor(private readonly logger: { log: Function; warn: Function; error: Function; debug: Function }) {}

  debug(obj: object, msg?: string) {
    this.logger.debug(msg, obj);
  }

  info(obj: object, msg?: string) {
    this.logger.log(msg, obj);
  }

  warn(obj: object, msg?: string) {
    this.logger.warn(msg, obj);
  }

  error(obj: object, msg?: string) {
    this.logger.error(msg, obj);
  }
}
