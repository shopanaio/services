/**
 * Changes types for ProductUpdateWorkflow event payloads.
 * These represent partial snapshots of what was actually modified.
 */

/**
 * Aggregated changes for a product update operation.
 */
export interface ProductChanges {
  productId: string;

  /** Product-level changes (only modified fields) */
  product?: ProductFieldChanges;

  /** Variant-level changes (only modified variants) */
  variants?: Record<string, VariantChanges>;
}

/**
 * Product identity and metadata changes.
 */
export interface ProductFieldChanges {
  handle?: string;
  title?: string;
  vendorId?: string | null;
  status?: "draft" | "published";
  content?: ContentChanges;
  seo?: SeoChanges;
  media?: MediaChanges;
  categories?: ProductCategoryFieldChanges;
  tags?: ProductTagFieldChanges;
}

export interface ProductCategoryFieldChanges {
  changed: true;
  reason: "assignment" | "categoryFields" | "rank";
  categoryIds?: string[];
}

export interface ProductTagFieldChanges {
  changed: true;
  reason: "assignment";
  tagIds?: string[];
}

export interface RichTextChange {
  text: string | null;
  html: string | null;
  json: unknown | null;
}

/**
 * Product content changes (description, excerpt).
 */
export interface ContentChanges {
  description?: RichTextChange | null;
  excerpt?: RichTextChange | null;
}

/**
 * SEO metadata changes.
 */
export interface SeoChanges {
  title?: string | null;
  description?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  ogImageId?: string | null;
}

/**
 * Media attachment changes.
 */
export interface MediaChanges {
  fileIds: string[];
}

/**
 * Variant-level changes aggregation.
 */
export interface VariantChanges {
  pricing?: PricingChanges;
  inventory?: InventoryChanges;
  dimensions?: DimensionsChanges;
  media?: MediaChanges;
  options?: OptionLinkChanges[];
}

/**
 * Pricing changes for a variant.
 */
export interface PricingChanges {
  currency: string;
  amount: number;
  compareAt?: number | null;
}

/**
 * Inventory/stock changes for a variant.
 */
export interface InventoryChanges {
  warehouseId: string;
  onHand: number;
  unavailable: number;
  sku?: string | null;
  weight?: number | null;
  unitCostMinor?: number | null;
  costCurrency?: string | null;
}

/**
 * Physical dimensions/weight changes for a variant.
 * All measurements in standard units (mm for dimensions, grams for weight).
 */
export interface PhysicalChanges {
  width?: number;
  height?: number;
  length?: number;
  weight?: number;
}

/**
 * Dimensions-only changes for a variant.
 */
export interface DimensionsChanges {
  width: number;
  height: number;
  length: number;
}

/**
 * Option value link changes for a variant.
 */
export interface OptionLinkChanges {
  optionId: string;
  valueId: string;
}

/**
 * Status change payload.
 */
export interface StatusChanges {
  status: "draft" | "published";
}

/**
 * Product identity changes (handle/title only).
 */
export interface ProductIdentityChanges {
  handle?: string;
  title?: string;
  vendorId?: string | null;
}
