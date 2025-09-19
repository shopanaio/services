import { z } from "zod";

export const CORE_API_VERSION = "1.0.0";

/**
 * Payment modes for inventory offer
 */
export enum PaymentMode {
  IMMEDIATE = "IMMEDIATE",
  DEFERRED = "DEFERRED",
  FREE = "FREE",
}

/**
 * Purchasable snapshot for data persistence
 */
export type PurchasableSnapshot = {
  title: string;
  sku: string | null;
  imageUrl: string | null;
  data: Record<string, unknown> | null;
};

/**
 * Inventory offer - main data type for inventory plugins
 */
export type InventoryOffer = {
  purchasableId: string;
  unitPrice: number; // minor units
  unitCompareAtPrice?: number | null; // minor units
  isAvailable: boolean;
  isPhysical: boolean;
  paymentMode: PaymentMode;
  purchasableSnapshot?: PurchasableSnapshot;
  providerPayload?: Record<string, unknown>;
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
 * Input data for getting offers
 */
export type GetOffersInput = {
  items: Array<{
    lineId: string;
    purchasableId: string;
    quantity: number;
  }>;
  projectId?: string;
  apiKey?: string;
  currency?: string;
  locale?: string;
};

/**
 * Inventory provider
 */
export type InventoryProvider = {
  /**
   * Get offers for specified items
   */
  getOffers(input: GetOffersInput): Promise<InventoryOffer[]>;
};

/**
 * Plugin hooks
 */
export type InventoryPluginHooks = Partial<{
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
export type InventoryPluginManifest = Readonly<{
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
 * Inventory plugin
 */
export type InventoryPlugin<TConfig extends z.ZodTypeAny = z.ZodAny> = Readonly<{
  manifest: InventoryPluginManifest;
  configSchema: TConfig;
  hooks?: InventoryPluginHooks;
  create: (ctx: ProviderContext, config: z.infer<TConfig>) => InventoryProvider;
}>;

/**
 * Plugin module
 */
export type PluginModule = Readonly<{ plugin: InventoryPlugin }>;
