import type { ApiFile, ApiProduct, ApiVariant } from "@/graphql/types";

// ============================================================================
// Enums
// ============================================================================

/**
 * Bundle item type - determines how the item is displayed
 */
export enum BundleItemType {
  /** Simple product without variants */
  PRODUCT = "PRODUCT",
  /** Specific variant of a product */
  VARIANT = "VARIANT",
}

/**
 * Price rule types for bundle items
 */
export enum BundlePriceType {
  /** No changes, use base product price */
  BASE = "BASE",
  /** Override with fixed price */
  FIXED = "FIXED",
  /** Subtract percentage from base */
  DISCOUNT_PERCENT = "DISCOUNT_PERCENT",
  /** Subtract fixed amount from base */
  DISCOUNT_FIXED = "DISCOUNT_FIXED",
  /** 100% discount, free in bundle */
  FREE = "FREE",
}

/**
 * Display style for storefront
 */
export type DisplayStyle = "accordion" | "tabs" | "flat" | "wizard";

/**
 * Behavior when component is out of stock
 */
export type OutOfStockBehavior = "hide" | "disable" | "backorder";

/**
 * Stock status for bundle items
 */
export type StockStatus = "inStock" | "lowStock" | "outOfStock";

// ============================================================================
// Bundle Item
// ============================================================================

export interface BundleItem {
  /** Unique identifier for this item */
  id: string;

  /** Bundle item type - determines how the item is displayed */
  itemType: BundleItemType;

  /** Sort index for display order */
  sortIndex: number;

  /** Assigned product (PRODUCT only) */
  assignedProduct?: ApiProduct;

  /** Custom title for this variant (overrides product title) */
  title: string | null;

  /** Custom featured image for this variant (overrides product image) */
  featuredImage: ApiFile | null;

  /** Exclude variant IDs (for PRODUCT) - null = all variants are included */
  excludeAssignedProductVariants?: string[] | null;

  /** Assigned variant (VARIANT only). Variant has product field for product reference. */
  assignedVariant?: ApiVariant;

  /** Minimum quantity for this item (null = 1) */
  minQty: number | null;

  /** Maximum quantity for this item (null = no limit) */
  maxQty: number | null;

  /** Pricing rule for this variant (overrides product pricing) */
  pricingRule:
    | PricingRuleTemplate
    | {
        /** Pricing configuration - applies to all variants */
        priceType: BundlePriceType;
        priceValue: number | null;
        /** Template if using a pricing template */
      };

  /** Whether this item is visible on the storefront (default: yes) */
  visible?: "yes" | "no";
}

// ============================================================================
// Bundle Group
// ============================================================================

export interface IBundleGroup {
  /** Unique identifier for this group */
  id: string;

  /** Title for this group */
  title: string;

  /** Sort index for display order */
  sortIndex: number;

  /** Minimum number of items to select (null = no limit) */
  minSelection: number | null;

  /** Maximum number of items to select (null = no limit) */
  maxSelection: number | null;

  /** Items in this group */
  items: BundleItem[];
}

// ============================================================================
// Pricing Configuration
// ============================================================================

export interface PricingRuleTemplate {
  id: string;
  name: string;
  priceType: BundlePriceType;
  priceValue: number | null;
}


// ============================================================================
// Bundle Settings
// ============================================================================

export interface BundleDisplaySettings {
  displayStyle: DisplayStyle;
  showImages: boolean;
  showSku: boolean;
  showStock: boolean;
  showComparePrice: boolean;
}

export interface BundleStockSettings {
  outOfStockBehavior: OutOfStockBehavior;
  inheritStock: boolean;
}

export interface IBundleSettings
  extends BundleDisplaySettings,
    BundleStockSettings {
  validationMessage: string | null;
}

// ============================================================================
// Tab Types
// ============================================================================

export type EditBundleItemsTabKey =
  | "groups"
  | "pricing"
  | "preview"
  | "settings";

// ============================================================================
// Helper Types & Constants
// ============================================================================

export interface PriceRuleOption {
  value: BundlePriceType;
  label: string;
  requiresValue?: boolean;
  valueSuffix?: string;
}

export const PRICE_RULE_OPTIONS: PriceRuleOption[] = [
  { value: BundlePriceType.BASE, label: "No change" },
  {
    value: BundlePriceType.FIXED,
    label: "Fixed price",
    requiresValue: true,
    valueSuffix: "$",
  },
  {
    value: BundlePriceType.DISCOUNT_PERCENT,
    label: "Discount %",
    requiresValue: true,
    valueSuffix: "%",
  },
  {
    value: BundlePriceType.DISCOUNT_FIXED,
    label: "Discount $",
    requiresValue: true,
    valueSuffix: "$",
  },
  {
    value: BundlePriceType.FREE,
    label: "Free",
  },
];

export const ITEM_TYPE_LABELS: Record<BundleItemType, string> = {
  [BundleItemType.PRODUCT]: "Product",
  [BundleItemType.VARIANT]: "Variant",
};

export const STOCK_STATUS_LABELS: Record<StockStatus, string> = {
  inStock: "In Stock",
  lowStock: "Low Stock",
  outOfStock: "Out of Stock",
};

// ============================================================================
// Dependency Rules (re-exported from dedicated module)
// ============================================================================

export {
  DependencyActionType,
  DependencyTargetType,
  ACTION_TYPE_LABELS,
  TARGET_TYPE_LABELS,
  ACTIONS_BY_TARGET,
} from "./dependency-rules";

export type {
  IDependencyCondition,
  IDependencyAction,
  IDependencyRule,
} from "./dependency-rules";
