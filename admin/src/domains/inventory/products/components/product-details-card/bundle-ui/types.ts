import type {
  ApiFile,
  ApiProduct,
  ApiVariant,
  ProductComponentDisplayStyle,
} from "@/graphql/types";
import { ProductComponentItemType } from "@/graphql/types";
import type { IDependencyRule } from "./dependency-rules/types";

/**
 * Legacy bundle presentation type used by the restored Admin UI.
 */
export enum BundleType {
  Fixed = "FIXED",
  Multipack = "MULTIPACK",
  MixAndMatch = "MIX_AND_MATCH",
  Custom = "CUSTOM",
}

/**
 * Behavior when component is out of stock
 */
export type OutOfStockBehavior = "hide" | "disable" | "backorder";

/**
 * Stock status for bundle items
 */
export type StockStatus = "inStock" | "lowStock" | "outOfStock";

/**
 * Editor-only flattened pricing choice. ProductComponent has no equivalent
 * enum: it models strategy, operation, value type and value separately.
 */
export enum BundlePriceType {
  Base = "BASE",
  DiscountFixed = "DISCOUNT_FIXED",
  DiscountPercent = "DISCOUNT_PERCENT",
  Fixed = "FIXED",
  Free = "FREE",
  MarkupFixed = "MARKUP_FIXED",
  MarkupPercent = "MARKUP_PERCENT",
}

// ============================================================================
// Bundle Item
// ============================================================================

export interface BundleItem {
  /** Unique identifier for this item */
  id: string;

  /** Bundle item type - determines how the item is displayed */
  itemType: ProductComponentItemType;

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

  /** Whether this item is pre-selected by default (default: no) */
  selected?: "yes" | "no";
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
// Bundle Configuration
// ============================================================================

export interface IBundleConfiguration {
  id: string;
  title: string;
  bundleItems: IBundleGroup[];
  dependencyRules: IDependencyRule[];
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
  displayStyle: ProductComponentDisplayStyle;
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
  { value: BundlePriceType.Base, label: "No change" },
  {
    value: BundlePriceType.Fixed,
    label: "Fixed price",
    requiresValue: true,
    valueSuffix: "$",
  },
  {
    value: BundlePriceType.DiscountPercent,
    label: "Discount %",
    requiresValue: true,
    valueSuffix: "%",
  },
  {
    value: BundlePriceType.DiscountFixed,
    label: "Discount $",
    requiresValue: true,
    valueSuffix: "$",
  },
  {
    value: BundlePriceType.Free,
    label: "Free",
  },
  {
    value: BundlePriceType.MarkupPercent,
    label: "Markup %",
    requiresValue: true,
    valueSuffix: "%",
  },
  {
    value: BundlePriceType.MarkupFixed,
    label: "Markup $",
    requiresValue: true,
    valueSuffix: "$",
  },
];

export const ITEM_TYPE_LABELS: Record<ProductComponentItemType, string> = {
  [ProductComponentItemType.Product]: "Product",
  [ProductComponentItemType.Variant]: "Variant",
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
