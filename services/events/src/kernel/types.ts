import type {
  BaseKernelServices,
  ScriptContext as BaseScriptContext,
  TransactionScript as BaseTransactionScript,
} from "@shopana/shared-kernel";
import type { Repository } from "../repositories/index.js";
import type { WorkflowRegistry } from "@shopana/shared-kernel";

export interface Logger {
  debug(...args: unknown[]): void;
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
}

export interface EventsKernelServices extends BaseKernelServices {
  readonly repository: Repository;
  readonly workflow: WorkflowRegistry;
}

export type ScriptContext = BaseScriptContext;

export type TransactionScript<TParams = unknown, TResult = unknown> =
  BaseTransactionScript<TParams, TResult, EventsKernelServices>;

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
