import type {
  BaseKernelServices,
  ScriptContext as BaseScriptContext,
  TransactionScript as BaseTransactionScript,
} from "@shopana/shared-kernel";
import type { Repository } from "../repositories";

/**
 * Logger interface for the media service
 */
export interface Logger {
  debug(...args: any[]): void;
  info(...args: any[]): void;
  warn(...args: any[]): void;
  error(...args: any[]): void;
}

/**
 * Plugin Manager interface for the media service
 */
export interface PluginManager {
  getOffers(params: {
    pluginCode: string;
    input: any;
    requestMeta?: { requestId?: string; userAgent?: string };
    projectId?: string;
  }): Promise<any[]>;
}

/**
 * Extended services for media microservice
 */
export interface MediaKernelServices extends BaseKernelServices {
  readonly repository: Repository;
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
