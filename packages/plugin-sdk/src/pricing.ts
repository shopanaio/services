import { z } from 'zod';
import type { Money } from '@shopana/shared-money';
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
 * Discount types and DTOs for pricing domain.
 * @public
 */
export enum DiscountType {
  PERCENTAGE = 'percentage',
  FIXED = 'fixed',
}

export type DiscountCondition = Readonly<{
  minAmount?: Money;
}>;

export type FixedDiscount = Readonly<{
  code: string;
  type: DiscountType.FIXED;
  value: Money;
  provider: string;
  conditions?: DiscountCondition;
}>;

export type PercentageDiscount = Readonly<{
  code: string;
  type: DiscountType.PERCENTAGE;
  value: number;
  provider: string;
  conditions?: DiscountCondition;
}>;

export type Discount = Readonly<{
  code: string;
  type: DiscountType;
  value: number | Money;
  provider: string;
  conditions?: DiscountCondition;
}>;

export type PricingProvider = {
  pricing: {
    list(): Promise<ReadonlyArray<Discount>>;
    validate(code: string): Promise<{ valid: boolean; discount?: Discount }>;
  };
};

export type PricingPluginHooks = Partial<{
  init: (ctx: ProviderContext) => Promise<void> | void;
  healthCheck: () => Promise<{ ok: boolean; details?: Record<string, unknown> }> | { ok: boolean; details?: Record<string, unknown> };
  onError: (e: unknown, meta: { operation: string }) => void;
  onTelemetry: (event: string, payload?: Record<string, unknown>) => void;
}>;

export type PricingPluginManifest = BasePluginManifest;

export type PricingPlugin<TConfig extends z.ZodTypeAny = z.ZodAny> = Readonly<{
  manifest: PricingPluginManifest;
  configSchema: TConfig;
  hooks?: PricingPluginHooks;
  migrations?: ReadonlyArray<ConfigMigration>;
  create: (ctx: ProviderContext, config: z.infer<TConfig>) => PricingProvider;
}>;

export type PluginModule = Readonly<{ plugin: PricingPlugin }>;
