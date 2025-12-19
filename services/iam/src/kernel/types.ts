import type {
  BaseKernelServices,
  ScriptContext as BaseScriptContext,
  TransactionScript as BaseTransactionScript,
} from "@shopana/shared-kernel";
import type { Repository } from "../repositories/Repository.js";

/**
 * Logger interface for the users service
 */
export interface Logger {
  debug(...args: unknown[]): void;
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
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
  TParams = unknown,
  TResult = unknown
> = BaseTransactionScript<TParams, TResult, UsersKernelServices>;

/**
 * Kernel error
 */
export class KernelError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "KernelError";
  }
}
