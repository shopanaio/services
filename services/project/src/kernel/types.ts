import type {
  BaseKernelServices,
  ScriptContext as BaseScriptContext,
  TransactionScript as BaseTransactionScript,
} from "@shopana/shared-kernel";
import type { Cache } from "cache-manager";
import type { WorkflowRegistry } from "@shopana/workflows";
import type { Repository } from "../repositories/Repository.js";
import type { NameResolver } from "../cache/index.js";

/**
 * Logger interface for the project service
 */
export interface Logger {
  debug(...args: any[]): void;
  info(...args: any[]): void;
  warn(...args: any[]): void;
  error(...args: any[]): void;
}

/**
 * Extended services for project microservice
 */
export interface ProjectKernelServices extends BaseKernelServices {
  readonly repository: Repository;
  readonly workflow: WorkflowRegistry;
  readonly cache: Cache;
  readonly nameResolver: NameResolver;
}

/**
 * Script context for project service
 */
export type ScriptContext = BaseScriptContext;

/**
 * Transaction script for project service
 */
export type TransactionScript<
  TParams = any,
  TResult = any
> = BaseTransactionScript<TParams, TResult, ProjectKernelServices>;

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
