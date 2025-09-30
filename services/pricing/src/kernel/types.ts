/**
 * Kernel types for pricing service
 * After migration to centralized apps.execute, pluginManager is no longer needed
 */

// Base types for kernel
export interface Logger {
  info: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
  debug: (...args: any[]) => void;
}

// Services provided by kernel for transaction scripts
export interface KernelServices {
  readonly broker: any; // Moleculer ServiceBroker for calling apps.execute
  readonly logger: Logger;
}

// Base interface for any transaction script
export interface TransactionScript<TParams = any, TResult = any> {
  (params: TParams, services: KernelServices): Promise<TResult>;
}

// Types for common results
export interface ScriptResult<TData = any> {
  data: TData;
  warnings?: Array<{ code: string; message: string; details?: any }>;
  metadata?: Record<string, unknown>;
}

// Kernel errors
export class KernelError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: any
  ) {
    super(message);
    this.name = "KernelError";
  }
}
