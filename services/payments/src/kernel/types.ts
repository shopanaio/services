/**
 * Kernel types for payments service
 * After migration to centralized apps.execute, pluginManager is no longer needed
 */

export interface Logger {
  info: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
  debug: (...args: any[]) => void;
}

export interface KernelServices {
  readonly broker: any; // Moleculer ServiceBroker for calling apps.execute
  readonly logger: Logger;
}

export interface TransactionScript<TParams = any, TResult = any> {
  (params: TParams, services: KernelServices): Promise<TResult>;
}
