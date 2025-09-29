import type {
  PluginManager as CorePluginManager,
  ResilienceRunner
} from "@shopana/plugin-sdk";
import type {
  ProviderContext,
  ShippingMethod,
  PluginModule,
} from "@shopana/shipping-plugin-sdk";
import type { PaymentMethod, GetPaymentMethodsInput } from "@shopana/payment-plugin-sdk";
// Base types for kernel
export interface Logger {
  info: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
  debug: (...args: any[]) => void;
}

// Plugin Manager for shipping
export interface PluginManager extends CorePluginManager<
  Record<string, unknown>,
  ProviderContext,
  { getMethods(): Promise<ShippingMethod[]>; getPaymentMethods?(input?: GetPaymentMethodsInput): Promise<PaymentMethod[]> }
> {
  getMethods(params: {
    pluginCode: string;
    rawConfig: Record<string, unknown> & { configVersion?: string };
    projectId: string;
    requestMeta?: { requestId?: string; userAgent?: string };
  }): Promise<ShippingMethod[]>;
  getPaymentMethods(params: {
    pluginCode: string;
    rawConfig: Record<string, unknown> & { configVersion?: string };
    projectId: string;
    input?: GetPaymentMethodsInput;
  }): Promise<PaymentMethod[]>;
}

// Services provided by kernel for transaction scripts
export interface KernelServices {
  readonly pluginManager: PluginManager;
  readonly broker: any; // Moleculer ServiceBroker for calling other services
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
    this.name = 'KernelError';
  }
}
