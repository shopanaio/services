import type {
  BaseKernelServices,
  ScriptContext as BaseScriptContext,
  TransactionScript as BaseTransactionScript,
} from "@shopana/shared-kernel";
import type { Repository } from "../repositories/Repository";

/**
 * Logger interface for the users service
 */
export interface Logger {
  debug(...args: any[]): void;
  info(...args: any[]): void;
  warn(...args: any[]): void;
  error(...args: any[]): void;
}

/**
 * Extended services for users microservice
 */
export interface UsersKernelServices extends BaseKernelServices {
  readonly repository: Repository;
}

/**
 * Script context for users service
 */
export type ScriptContext = BaseScriptContext;

/**
 * Transaction script for users service
 */
export type TransactionScript<
  TParams = any,
  TResult = any
> = BaseTransactionScript<TParams, TResult, UsersKernelServices>;

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
