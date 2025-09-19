import { z } from "zod";
import type { Money } from "@shopana/shared-money";

export const CORE_API_VERSION = "1.0.0";

/**
 * Simple discount types
 */
export enum DiscountType {
  PERCENTAGE = "percentage",
  FIXED = "fixed",
}

/**
 * Discount application conditions
 */
export type DiscountCondition = Readonly<{
  /** Minimum order amount for discount application (currency: USD) */
  minAmount?: Money;
}>;

export type FixedDiscount = {
  code: string;
  type: DiscountType.FIXED;
  value: Money;
  provider: string;
  conditions?: DiscountCondition;
};

export type PercentageDiscount = {
  code: string;
  type: DiscountType.PERCENTAGE;
  value: number;
  provider: string;
  conditions?: DiscountCondition;
};

export type Discount = {
  code: string;
  type: DiscountType;
  value: number | Money;
  provider: string;
  conditions?: DiscountCondition;
};

/**
 * HTTP client for plugins
 */
export type HttpClient = {
  get(
    path: string,
    init?: RequestInit & { timeoutMs?: number },
  ): Promise<Response>;
  post(
    path: string,
    body?: unknown,
    init?: RequestInit & { timeoutMs?: number },
  ): Promise<Response>;
  put(
    path: string,
    body?: unknown,
    init?: RequestInit & { timeoutMs?: number },
  ): Promise<Response>;
  delete(
    path: string,
    init?: RequestInit & { timeoutMs?: number },
  ): Promise<Response>;
};

/**
 * Context for plugin
 */
export type ProviderContext = Readonly<{
  logger: {
    info: (...args: any[]) => void;
    warn: (...args: any[]) => void;
    error: (...args: any[]) => void;
  };
  createHttp: (
    baseUrl: string,
    init?: { apiKey?: string; defaultHeaders?: Record<string, string> },
  ) => HttpClient;
}>;

/**
 * Discount provider
 */
export type PricingProvider = {
  getDiscounts(): Promise<Discount[]>;

  /**
   * Validation of specific discount/promo code
   * Each plugin implements its own logic
   */
  validateDiscount(code: string): Promise<{
    valid: boolean;
    discount?: Discount;
  }>;
};

/**
 * Plugin hooks
 */
export type PricingPluginHooks = Partial<{
  init: (ctx: ProviderContext) => Promise<void> | void;
  healthCheck: () =>
    | Promise<{ ok: boolean; details?: Record<string, unknown> }>
    | { ok: boolean; details?: Record<string, unknown> };
  onError: (e: unknown, meta: { operation: string }) => void;
  onTelemetry: (event: string, payload?: Record<string, unknown>) => void;
}>;

/**
 * Plugin manifest
 */
export type PricingPluginManifest = Readonly<{
  code: string;
  displayName: string;
  description?: string;
  version: string;
  apiVersionRange: string;
  domains: string[];
  capabilities?: string[];
  priority?: number;
}>;

/**
 * Pricing plugin
 */
export type PricingPlugin<TConfig extends z.ZodTypeAny = z.ZodAny> = Readonly<{
  manifest: PricingPluginManifest;
  configSchema: TConfig;
  hooks?: PricingPluginHooks;
  create: (ctx: ProviderContext, config: z.infer<TConfig>) => PricingProvider;
}>;

/**
 * Plugin module
 */
export type PluginModule = Readonly<{ plugin: PricingPlugin }>;
