/**
 * Admin view interfaces
 *
 * Simple value types (manual interfaces) and derived types from Resolver classes
 */

import type { TypeResult } from "@shopana/type-resolver";
import type { WarehouseResolver } from "../WarehouseResolver.js";

// ============================================================================
// Derived types from Resolver classes (auto-generated from TypeResult)
// ============================================================================

/** Warehouse type derived from WarehouseResolver */
export type Warehouse = TypeResult<typeof WarehouseResolver>;

// ============================================================================
// Simple value types (manual interfaces - no resolvers for these)
// ============================================================================

// --- Product ---

/**
 * Product description in multiple formats
 */
export interface Description {
  /** Plain text description */
  text: string;
  /** HTML description */
  html: string;
  /** EditorJS JSON description */
  json: unknown;
}

// --- Pricing ---

/** Supported currency codes */
export type CurrencyCode = "UAH" | "USD" | "EUR";

/**
 * Represents a price for a variant
 */
export interface VariantPrice {
  /** UUID of the price record */
  id: string;
  /** The currency code */
  currency: CurrencyCode;
  /** The price amount in minor units (cents, kopecks, etc.) */
  amountMinor: number;
  /** The compare-at price in minor units (strikethrough price) */
  compareAtMinor: number | null;
  /** When this price became effective */
  effectiveFrom: Date;
  /** When this price stopped being effective (null if current) */
  effectiveTo: Date | null;
  /** When this price record was created */
  recordedAt: Date;
  /** Whether this is the current active price */
  isCurrent: boolean;
}

/**
 * Represents the cost of a variant
 */
export interface VariantCost {
  /** UUID of the cost record */
  id: string;
  /** The currency code */
  currency: CurrencyCode;
  /** The unit cost in minor units */
  unitCostMinor: number;
  /** When this cost became effective */
  effectiveFrom: Date;
  /** When this cost stopped being effective (null if current) */
  effectiveTo: Date | null;
  /** When this cost record was created */
  recordedAt: Date;
  /** Whether this is the current active cost */
  isCurrent: boolean;
}

// --- Physical ---

/**
 * Physical dimensions of a variant (stored in millimeters)
 */
export interface VariantDimensions {
  /** Width in millimeters */
  width: number;
  /** Length in millimeters */
  length: number;
  /** Height in millimeters */
  height: number;
}

/**
 * Physical weight of a variant (stored in grams)
 */
export interface VariantWeight {
  /** Weight in grams */
  value: number;
}

// --- Media ---

/**
 * Media attached to a variant with sort order
 */
export interface VariantMediaItem {
  /** UUID of the file from the Media service */
  fileId: string;
  /** Sort order index (lower = first) */
  sortIndex: number;
}

// --- Stock ---

/**
 * Represents stock level for a variant in a specific warehouse
 */
export interface WarehouseStock {
  /** UUID of the stock record */
  id: string;
  /** UUID of the warehouse where this stock is located */
  warehouseId: string;
  /** UUID of the variant this stock record is for */
  variantId: string;
  /** The quantity currently on hand */
  quantityOnHand: number;
  /** The date and time when the entity was created */
  createdAt: Date;
  /** The date and time when the entity was last updated */
  updatedAt: Date;
}

// --- Inventory Widget ---

/** Alert threshold method */
export type ThresholdMethod = "SAFETY_STOCK" | "REORDER_POINT";

/** Aggregated stock quantities */
export interface InventoryQuantities {
  availableForSale: number;
  onHand: number;
  reserved: number;
  unavailable: number;
}

/** SKU status metric with optional average age */
export interface SkuStatusMetric {
  count: number;
  averageDays: number | null;
}

/** SKU status breakdown */
export interface InventorySkuStatus {
  total: number;
  lowStock: SkuStatusMetric;
  outOfStock: SkuStatusMetric;
  backorder: SkuStatusMetric;
}

/** Backorder information */
export interface InventoryBackorder {
  quantity: number;
  etaAvgDays: number | null;
}

/** Alert threshold configuration */
export interface InventoryAlertThreshold {
  method: ThresholdMethod;
  minimumStock: number;
}

/** Product inventory widget payload */
export interface ProductInventoryWidget {
  quantities: InventoryQuantities;
  availableChange7d: number;
  skuStatus: InventorySkuStatus;
  backorder: InventoryBackorder;
  alertThreshold: InventoryAlertThreshold;
}

// --- Options ---

/** Display type for product options in the UI */
export type OptionDisplayType = "DROPDOWN" | "SWATCH" | "BUTTONS";

/** Type of visual swatch for option values */
export type SwatchType = "COLOR" | "GRADIENT" | "IMAGE";

/**
 * A visual swatch for representing an option value
 */
export interface ProductOptionSwatch {
  /** UUID of the swatch */
  id: string;
  /** The type of swatch */
  swatchType: SwatchType;
  /** The primary color (hex code or color name) */
  colorOne: string | null;
  /** The secondary color for gradients */
  colorTwo: string | null;
  /** UUID of the file for image-based swatches */
  fileId: string | null;
  /** Additional metadata for the swatch */
  metadata: Record<string, unknown> | null;
}

/**
 * Represents a selected option for a variant
 */
export interface SelectedOption {
  /** UUID of the option */
  optionId: string;
  /** UUID of the selected value */
  optionValueId: string;
}
