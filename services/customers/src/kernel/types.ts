import type {
  BaseKernelServices,
  ScriptContext as BaseScriptContext,
  TransactionScript as BaseTransactionScript,
} from "@shopana/shared-kernel";
import type { Repository } from "../repositories/Repository";

/**
 * Logger interface for the customers service
 */
export interface Logger {
  debug(...args: any[]): void;
  info(...args: any[]): void;
  warn(...args: any[]): void;
  error(...args: any[]): void;
}

/**
 * Extended services for customers microservice
 */
export interface CustomersKernelServices extends BaseKernelServices {
  readonly repository: Repository;
}

/**
 * Script context for customers service
 */
export type ScriptContext = BaseScriptContext;

/**
 * Transaction script for customers service
 */
export type TransactionScript<
  TParams = any,
  TResult = any
> = BaseTransactionScript<TParams, TResult, CustomersKernelServices>;

/**
 * Kernel error
 */
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
