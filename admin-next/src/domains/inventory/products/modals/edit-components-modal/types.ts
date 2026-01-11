import type { ApiFile, ApiProduct, ApiVariant } from "@/graphql/types";

// ============================================================================
// Enums
// ============================================================================

/**
 * Component item type - determines how the item is displayed
 */
export enum ComponentItemType {
  /** Simple product without variants */
  PRODUCT = "PRODUCT",
  /** Specific variant of a product */
  VARIANT = "VARIANT",
}

/**
 * Price rule types for component items
 */
export enum ComponentPriceType {
  /** No changes, use base product price */
  BASE = "BASE",
  /** Override with fixed price */
  FIXED = "FIXED",
  /** Add percentage markup to base */
  MARKUP_PERCENT = "MARKUP_PERCENT",
  /** Subtract percentage from base */
  DISCOUNT_PERCENT = "DISCOUNT_PERCENT",
  /** Add fixed amount to base */
  MARKUP_FIXED = "MARKUP_FIXED",
  /** Subtract fixed amount from base */
  DISCOUNT_FIXED = "DISCOUNT_FIXED",
  /** 100% discount, free in bundle */
  FREE = "FREE",
  /** Price included in bundle base */
  INCLUDED = "INCLUDED",
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
 * Stock status for component items
 */
export type StockStatus = "inStock" | "lowStock" | "outOfStock";

// ============================================================================
// Component Item
// ============================================================================

export interface ComponentItem {
  id: string;
  itemType: ComponentItemType;

  /** Assigned product (PRODUCT only) */
  assignedProduct?: ApiProduct;
  /** Exclude variant IDs (for PRODUCT) - null = all variants are included */
  excludeAssignedProductVariants?: string[] | null;

  /** Assigned variant (VARIANT only). Variant has product field for product reference. */
  assignedVariant?: ApiVariant;

  sortIndex: number;

  pricingRule:
    | PricingRuleTemplate
    | {
        /** Pricing configuration - applies to all variants */
        priceType: ComponentPriceType;
        priceValue: number | null;
        /** Template if using a pricing template */
      };

  overrides: {
    /** Custom overrides */
    title: string | null;
    featuredImage: ApiFile | null;
  };
}

// ============================================================================
// Component Group
// ============================================================================

export interface IComponentGroup {
  id: string;
  title: string;
  sortIndex: number;

  /** Selection rules */
  rules: {
    isRequired: boolean;
    isMultiple: boolean;
    minSelection: number | null;
    maxSelection: number | null;
  };

  /** Items in this group */
  items: ComponentItem[];
}

// ============================================================================
// Pricing Configuration
// ============================================================================

export interface PricingRuleTemplate {
  id: string;
  name: string;
  priceType: ComponentPriceType;
  priceValue: number | null;
}

export interface ITieredDiscount {
  id: string;
  minItems: number;
  discountPercent: number;
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

export type EditComponentsTabKey =
  | "groups"
  | "pricing"
  | "preview"
  | "settings";

// ============================================================================
// Helper Types & Constants
// ============================================================================

export interface PriceRuleOption {
  value: ComponentPriceType;
  label: string;
  requiresValue?: boolean;
  valueSuffix?: string;
}

export const PRICE_RULE_OPTIONS: PriceRuleOption[] = [
  { value: ComponentPriceType.BASE, label: "No change" },
  {
    value: ComponentPriceType.FIXED,
    label: "Fixed price",
    requiresValue: true,
    valueSuffix: "$",
  },
  {
    value: ComponentPriceType.MARKUP_PERCENT,
    label: "Markup %",
    requiresValue: true,
    valueSuffix: "%",
  },
  {
    value: ComponentPriceType.DISCOUNT_PERCENT,
    label: "Discount %",
    requiresValue: true,
    valueSuffix: "%",
  },
  {
    value: ComponentPriceType.MARKUP_FIXED,
    label: "Markup $",
    requiresValue: true,
    valueSuffix: "$",
  },
  {
    value: ComponentPriceType.DISCOUNT_FIXED,
    label: "Discount $",
    requiresValue: true,
    valueSuffix: "$",
  },
  {
    value: ComponentPriceType.FREE,
    label: "Free",
  },
  {
    value: ComponentPriceType.INCLUDED,
    label: "Included in bundle",
  },
];

export const ITEM_TYPE_LABELS: Record<ComponentItemType, string> = {
  [ComponentItemType.PRODUCT]: "Product",
  [ComponentItemType.VARIANT]: "Variant",
};

export const STOCK_STATUS_LABELS: Record<StockStatus, string> = {
  inStock: "In Stock",
  lowStock: "Low Stock",
  outOfStock: "Out of Stock",
};
