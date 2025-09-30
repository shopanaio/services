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
 * Delivery method categorization.
 * @public
 */
export enum DeliveryMethodType {
  SHIPPING = 'SHIPPING',
  PICKUP = 'PICKUP',
  NONE = 'NONE',
}

/**
 * Who collects the shipping payment.
 * @public
 */
export enum ShippingPaymentModel {
  MERCHANT_COLLECTED = 'MERCHANT_COLLECTED',
  CARRIER_DIRECT = 'CARRIER_DIRECT',
}

/**
 * Primary shipping method DTO exposed by providers.
 * @public
 */
export type ShippingMethod = Readonly<{
  code: string;
  provider: string;
  deliveryMethodType: DeliveryMethodType;
  shippingPaymentModel: ShippingPaymentModel;
}>;

/**
 * Provider contract for shipping domain.
 * @public
 */
export type ShippingProvider = {
  /** Domain-scoped API to avoid method name collisions across domains */
  shipping: {
    /** Returns list of available shipping methods */
    list(): Promise<ReadonlyArray<ShippingMethod>>;
  };
};

/**
 * Shipping capability identifier type.
 * @public
 */
// Capabilities removed: manifest no longer declares capabilities.

/**
 * Manifest for shipping plugins, extending base manifest with shipping-specific semantics.
 * @public
 */
export type ShippingPluginManifest = BasePluginManifest;

/**
 * Lifecycle hooks available for shipping plugins.
 * @public
 */
export type ShippingPluginHooks = Partial<{
  init: (ctx: ProviderContext) => Promise<void> | void;
  healthCheck: () => Promise<{ ok: boolean; details?: Record<string, unknown> }> | { ok: boolean; details?: Record<string, unknown> };
  onError: (e: unknown, meta: { operation: string }) => void;
  onTelemetry: (event: string, payload?: Record<string, unknown>) => void;
}>;

/**
 * Shipping plugin contract.
 * @public
 */
export type ShippingPlugin<TConfig extends z.ZodTypeAny = z.ZodAny> = Readonly<{
  manifest: ShippingPluginManifest;
  configSchema: TConfig;
  hooks?: ShippingPluginHooks;
  migrations?: ReadonlyArray<ConfigMigration>;
  create: (ctx: ProviderContext, config: z.infer<TConfig>) => ShippingProvider;
}>;

/**
 * Module shape exported by shipping plugin packages.
 * @public
 */
export type PluginModule = Readonly<{ plugin: ShippingPlugin }>;
