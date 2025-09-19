import type {
  PluginManager as CorePluginManager,
  ResilienceRunner,
} from "@shopana/core-plugin";
import type {
  ProviderContext,
  InventoryOffer,
  InventoryProvider,
  GetOffersInput,
} from "@shopana/inventory-plugin-sdk";

// Base types for kernel
export interface Logger {
  info: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
  debug: (...args: any[]) => void;
}

// Plugin Manager for inventory
export interface PluginManager
  extends CorePluginManager<
    Record<string, unknown>,
    ProviderContext,
    InventoryProvider
  > {
  getOffers(params: {
    pluginCode: string;
    input: GetOffersInput;
  }): Promise<InventoryOffer[]>;
}

// Services provided by kernel for transaction scripts
export interface KernelServices {
  readonly pluginManager: PluginManager;
  readonly logger: Logger;
  readonly runner?: ResilienceRunner;
}

// Base interface for any transaction script
export interface TransactionScript<TParams = any, TResult = any> {
  (params: TParams, services: KernelServices): Promise<TResult>;
}

// Types for common results
export interface ScriptResult<TData = any> {
  data: TData;
  warnings?: Array<{ code: string; message: string; details?: any }>;
  metadata?: Record<string, unknown>;
}

// Kernel errors
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
