import type {
  BaseKernelServices,
  ScriptContext as BaseScriptContext,
  TransactionScript as BaseTransactionScript,
} from "@shopana/shared-kernel";
import type { Cache } from "cache-manager";
import type { Repository } from "../repositories/Repository.js";
import type { AuthorizationCache } from "../cache/index.js";

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
 * Extended services for IAM microservice
 */
export interface IamKernelServices extends BaseKernelServices {
  readonly repository: Repository;
  readonly cache: Cache;
  readonly authCache: AuthorizationCache;
}

/**
 * @deprecated Use IamKernelServices instead
 */
export type UsersKernelServices = IamKernelServices;

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
