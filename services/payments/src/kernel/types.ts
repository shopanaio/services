import type { ResilienceRunner } from "@shopana/plugin-sdk";
import type { PaymentMethod, GetPaymentMethodsInput } from "@shopana/plugin-sdk/payment";
import type { ProviderContext } from "@shopana/plugin-sdk/payment";

export interface Logger {
  info: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
  debug: (...args: any[]) => void;
}

export interface PluginManager {
  listManifests(): any[];
  health(): Promise<any[]>;
  getPaymentMethods(params: {
    pluginCode: string;
    rawConfig: Record<string, unknown> & { configVersion?: string };
    projectId: string;
    input?: GetPaymentMethodsInput;
  }): Promise<PaymentMethod[]>;
}

export interface KernelServices {
  readonly pluginManager: PluginManager;
  readonly broker: any;
  readonly logger: Logger;
  readonly runner?: ResilienceRunner;
}

export interface TransactionScript<TParams = any, TResult = any> {
  (params: TParams, services: KernelServices): Promise<TResult>;
}
