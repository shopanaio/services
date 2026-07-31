import { ProductComponentItemType } from "@/graphql/types";

/** Derived display status, not a ProductComponent GraphQL field. */
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
  ACTION_TYPE_LABELS,
  TARGET_TYPE_LABELS,
  ACTIONS_BY_TARGET,
} from "./dependency-rules";
