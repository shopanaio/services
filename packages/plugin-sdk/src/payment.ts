import { z } from 'zod';
import type { ProviderContextLike } from './providerContext';
import type { HttpClient } from './httpClient';
import type { BasePluginManifest, ConfigMigration } from './types';

// Re-export HttpClient for convenience
export type { HttpClient } from './httpClient';

/**
 * Alias of provider context specialized with JSON HttpClient.
 * @public
 */
export type ProviderContext = ProviderContextLike<HttpClient>;

/**
 * Payment flow strategies.
 * @public
 */
export enum PaymentFlow {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
  ON_DELIVERY = 'ON_DELIVERY',
}

export type PaymentMethodConstraints = Readonly<{
  shippingMethodCodes: ReadonlyArray<string>;
}>;

export type PaymentMethod = Readonly<{
  code: string;
  provider: string;
  flow: PaymentFlow;
  metadata: Record<string, unknown>;
  constraints: PaymentMethodConstraints;
}>;

export type ListPaymentMethodsInput = Readonly<{ currency: string }>; // extend as needed

export type PaymentProvider = {
  payment: {
    list(input?: ListPaymentMethodsInput): Promise<ReadonlyArray<PaymentMethod>>;
  };
};

// Capabilities removed: manifest no longer declares capabilities.

export type PaymentPluginManifest = BasePluginManifest;

export type PaymentPluginHooks = Partial<{
  init: (ctx: ProviderContext) => Promise<void> | void;
  healthCheck: () => Promise<{ ok: boolean; details?: Record<string, unknown> }> | { ok: boolean; details?: Record<string, unknown> };
  onError: (e: unknown, meta: { operation: string }) => void;
  onTelemetry: (event: string, payload?: Record<string, unknown>) => void;
}>;

export type PaymentPlugin<TConfig extends z.ZodTypeAny = z.ZodAny> = Readonly<{
  manifest: PaymentPluginManifest;
  configSchema: TConfig;
  hooks?: PaymentPluginHooks;
  migrations?: ReadonlyArray<ConfigMigration>;
  create: (ctx: ProviderContext, config: z.infer<TConfig>) => PaymentProvider;
}>;

export type PluginModule = Readonly<{ plugin: PaymentPlugin }>;
