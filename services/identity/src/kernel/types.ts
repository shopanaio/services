import type {
  BaseKernelServices,
  ScriptContext as BaseScriptContext,
  TransactionScript as BaseTransactionScript,
} from "@shopana/shared-kernel";
import type { CasdoorAdapter } from "../adapters/casdoor/CasdoorAdapter.js";

export interface Logger {
  debug(...args: any[]): void;
  info(...args: any[]): void;
  warn(...args: any[]): void;
  error(...args: any[]): void;
}

export interface IdentityKernelServices extends BaseKernelServices {
  readonly casdoorAdapter: CasdoorAdapter | null;
}

export type ScriptContext = BaseScriptContext;

export type TransactionScript<
  TParams = any,
  TResult = any
> = BaseTransactionScript<TParams, TResult, IdentityKernelServices>;

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
