import { z } from 'zod';
import type { ProviderContextLike } from './providerContext';
import type { HttpClient } from './httpClient';
import type { BasePluginManifest, ConfigMigration } from './types';

export type { HttpClient } from './httpClient';

/**
 * Alias of provider context specialized with JSON HttpClient.
 * @public
 */
export type ProviderContext = ProviderContextLike<HttpClient>;

/**
 * Inventory offer payment mode
 * @public
 */
export enum PaymentMode {
  IMMEDIATE = 'IMMEDIATE',
  DEFERRED = 'DEFERRED',
  FREE = 'FREE',
}

/**
 * Price adjustment type for child items in a bundle.
 * Values are always positive - the type determines the operation.
 * @public
 */
export type ChildPriceType =
  | 'FREE'
  | 'BASE'
  | 'DISCOUNT_AMOUNT'
  | 'DISCOUNT_PERCENT'
  | 'MARKUP_AMOUNT'
  | 'MARKUP_PERCENT'
  | 'OVERRIDE';

/**
 * Price configuration for child items
 * @public
 */
export type ChildPriceConfigInput = Readonly<{
  type: ChildPriceType;
  /** Amount in minor units, for DISCOUNT_AMOUNT, MARKUP_AMOUNT, OVERRIDE (always positive) */
  amount?: number;
  /** Percentage for DISCOUNT_PERCENT, MARKUP_PERCENT (e.g., 10 for 10%, always positive) */
  percent?: number;
}>;

/**
 * Purchasable snapshot for data persistence
 * @public
 */
export type PurchasableSnapshot = Readonly<{
  title: string;
  sku: string | null;
  imageUrl: string | null;
  data: Record<string, unknown> | null;
}>;

/**
 * Inventory offer - main data type for inventory plugins
 * @public
 */
export type InventoryOffer = Readonly<{
  purchasableId: string;
  /** Final adjusted price in minor units */
  unitPrice: number;
  /** Original price before any adjustments in minor units */
  unitOriginalPrice: number;
  unitCompareAtPrice?: number | null; // minor units
  isAvailable: boolean;
  isPhysical: boolean;
  paymentMode: PaymentMode;
  purchasableSnapshot?: PurchasableSnapshot;
  providerPayload?: Record<string, unknown>;
  /** Applied price adjustment info (for child items) */
  appliedPriceConfig?: ChildPriceConfigInput;
}>;

/**
 * Item input for getting offers
 * @public
 */
export type GetOffersItemInput = Readonly<{
  lineId: string;
  purchasableId: string;
  quantity: number;
  /** Parent line ID for bundled/child items */
  parentLineId?: string;
  /** Price configuration for child items */
  priceConfig?: ChildPriceConfigInput;
}>;

/**
 * Input data for getting offers
 * @public
 */
export type GetOffersInput = Readonly<{
  items: ReadonlyArray<GetOffersItemInput>;
  projectId?: string;
  apiKey?: string;
  currency?: string;
  locale?: string;
}>;

/**
 * Inventory provider contract.
 * Domain-scoped API prevents collisions across domains.
 * @public
 */
export type InventoryProvider = {
  inventory: {
    /** Returns inventory offers for requested items */
    getOffers(input: GetOffersInput): Promise<ReadonlyArray<InventoryOffer>>;
  };
};

/**
 * Manifest for inventory plugins, extending base manifest with inventory semantics.
 * @public
 */
export type InventoryPluginManifest = BasePluginManifest;

/**
 * Lifecycle hooks available for inventory plugins.
 * @public
 */
export type InventoryPluginHooks = Partial<{
  init: (ctx: ProviderContext) => Promise<void> | void;
  healthCheck: () => Promise<{ ok: boolean; details?: Record<string, unknown> }> | { ok: boolean; details?: Record<string, unknown> };
  onError: (e: unknown, meta: { operation: string }) => void;
  onTelemetry: (event: string, payload?: Record<string, unknown>) => void;
}>;

/**
 * Inventory plugin contract.
 * @public
 */
export type InventoryPlugin<TConfig extends z.ZodTypeAny = z.ZodAny> = Readonly<{
  manifest: InventoryPluginManifest;
  configSchema: TConfig;
  hooks?: InventoryPluginHooks;
  migrations?: ReadonlyArray<ConfigMigration>;
  create: (ctx: ProviderContext, config: z.infer<TConfig>) => InventoryProvider;
}>;

/**
 * Module shape exported by inventory plugin packages.
 * @public
 */
export type PluginModule = Readonly<{ plugin: InventoryPlugin }>;
