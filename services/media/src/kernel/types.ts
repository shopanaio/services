import type {
  BaseKernelServices,
  ScriptContext as BaseScriptContext,
  TransactionScript as BaseTransactionScript,
} from "@shopana/shared-kernel";
import type { Cache } from "cache-manager";
import type { Repository } from "../repositories";

/**
 * Logger interface for the media service
 */
export interface Logger {
  debug(...args: unknown[]): void;
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
}

/**
 * Extended services for media microservice
 */
export interface MediaKernelServices extends BaseKernelServices {
  readonly repository: Repository;
  readonly cache: Cache;
}

/**
 * Script context for media service
 */
export type ScriptContext = BaseScriptContext;

/**
 * Transaction script for media service
 */
export type TransactionScript<TParams = any, TResult = any> = BaseTransactionScript<
  TParams,
  TResult,
  MediaKernelServices
>;

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
