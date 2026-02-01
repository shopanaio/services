import type {
  BaseKernelServices,
  ScriptContext as BaseScriptContext,
  TransactionScript as BaseTransactionScript,
} from "@shopana/shared-kernel";
import type { Cache } from "cache-manager";
import type { Repository } from "../repositories/Repository";
import type { WorkflowRegistry } from "@shopana/shared-kernel";

/**
 * Logger interface for the inventory service
 */
export interface Logger {
  debug(...args: unknown[]): void;
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
}

/**
 * Extended services for inventory microservice
 */
export interface InventoryKernelServices extends BaseKernelServices {
  readonly repository: Repository;
  readonly cache: Cache;
  readonly workflow: WorkflowRegistry;
}

/**
 * Script context for inventory service
 */
export type ScriptContext = BaseScriptContext;

/**
 * Minimal context for running scripts from workflows.
 * Contains only the data scripts actually need.
 */
export interface RunScriptContext {
  /** Store/project ID */
  storeId: string;
  /** Organization ID */
  organizationId: string;
  /** Locale for translations */
  locale?: string;
  /** User ID if authenticated */
  userId?: string;
}

/**
 * Transaction script for inventory service
 */
export type TransactionScript<
  TParams = any,
  TResult = any
> = BaseTransactionScript<TParams, TResult, InventoryKernelServices>;

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
