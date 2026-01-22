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
  /** Unique identifier for this item */
  id: string;

  /** Component item type - determines how the item is displayed */
  itemType: ComponentItemType;

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

  /** Pricing rule for this variant (overrides product pricing) */
  pricingRule:
    | PricingRuleTemplate
    | {
        /** Pricing configuration - applies to all variants */
        priceType: ComponentPriceType;
        priceValue: number | null;
        /** Template if using a pricing template */
      };
}

// ============================================================================
// Component Group
// ============================================================================

export interface IComponentGroup {
  /** Unique identifier for this group */
  id: string;

  /** Title for this group */
  title: string;

  /** Sort index for display order */
  sortIndex: number;

  /** Whether this group is required to be selected */
  isRequired: boolean;

  /** Whether this group allows multiple items to be selected */
  isMultiple: boolean;

  /** Minimum number of items to select (null = no limit) */
  minSelection: number | null;

  /** Maximum number of items to select (null = no limit) */
  maxSelection: number | null;

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

// ============================================================================
// Dependency Rules
// ============================================================================

/**
 * Condition types (STATE-BASED, not events!)
 *
 * Key insight: These are predicates evaluated against current state,
 * not events that "fire". This avoids "why didn't rule trigger on modal open" bugs.
 */
export enum DependencyConditionType {
  /** Item is currently selected */
  IS_SELECTED = "IS_SELECTED",
  /** Item is currently NOT selected */
  IS_NOT_SELECTED = "IS_NOT_SELECTED",
  /** Item quantity >= value */
  QTY_GTE = "QTY_GTE",
  /** Item quantity <= value */
  QTY_LTE = "QTY_LTE",
  /** Item quantity == value */
  QTY_EQ = "QTY_EQ",
  /** Unique selected items in group >= value (e.g. 3 different items) */
  GROUP_UNIQUE_GTE = "GROUP_UNIQUE_GTE",
  /** Total quantity in group >= value (e.g. 5 total pieces) */
  GROUP_TOTAL_QTY_GTE = "GROUP_TOTAL_QTY_GTE",
}

/**
 * Action types for THEN clause
 */
export enum DependencyActionType {
  // Visibility
  SHOW = "SHOW",
  HIDE = "HIDE",
  // Availability
  ENABLE = "ENABLE",
  DISABLE = "DISABLE",
  // Quantity
  SET_QTY = "SET_QTY",
  // Pricing
  OVERRIDE_PRICE = "OVERRIDE_PRICE", // replaces base price entirely
  ADJUST_PRICE = "ADJUST_PRICE", // modifies base price
}

/**
 * Target type for conditions and actions
 */
export enum DependencyTargetType {
  ITEM = "ITEM",
  GROUP = "GROUP",
  BUNDLE = "BUNDLE",
}

/**
 * Single condition in WHEN clause
 *
 * All conditions in a rule are AND-ed together.
 */
export interface IDependencyCondition {
  id: string;
  conditionType: DependencyConditionType;
  targetType: DependencyTargetType;
  targetId: string; // item or group ID
  value?: number; // for QTY_*, GROUP_COUNT_GTE
}

/**
 * Single action in THEN clause
 */
export interface IDependencyAction {
  id: string;
  actionType: DependencyActionType;
  targetType: DependencyTargetType;
  targetId?: string; // Optional for BUNDLE (implicit "this bundle")

  // For SET_QTY
  qtyValue?: number;

  // For OVERRIDE_PRICE / ADJUST_PRICE
  priceType?: ComponentPriceType;
  priceValue?: number | null;

  // Price conflict resolution
  exclusiveKey?: string; // e.g. "bundleDiscount" - only highest priority wins in same key
  applyTo?: "ITEM" | "COMPONENTS_SUBTOTAL"; // where discount applies (default: ITEM)

  // UX
  label?: string; // reason shown in UI ("Not compatible with Premium")
}

/**
 * Full dependency rule
 */
export interface IDependencyRule {
  id: string;
  name: string;
  enabled: boolean;
  priority: number; // higher = wins conflicts

  // WHEN clause (all conditions must match - AND logic)
  conditions: IDependencyCondition[];

  // THEN clause (all actions execute if conditions pass)
  actions: IDependencyAction[];
}

// ============================================================================
// Dependency Rule Helper Types & Constants
// ============================================================================

export const CONDITION_TYPE_LABELS: Record<DependencyConditionType, string> = {
  [DependencyConditionType.IS_SELECTED]: "is selected",
  [DependencyConditionType.IS_NOT_SELECTED]: "is not selected",
  [DependencyConditionType.QTY_GTE]: "quantity >=",
  [DependencyConditionType.QTY_LTE]: "quantity <=",
  [DependencyConditionType.QTY_EQ]: "quantity =",
  [DependencyConditionType.GROUP_UNIQUE_GTE]: "unique items >=",
  [DependencyConditionType.GROUP_TOTAL_QTY_GTE]: "total quantity >=",
};

export const ACTION_TYPE_LABELS: Record<DependencyActionType, string> = {
  [DependencyActionType.SHOW]: "show",
  [DependencyActionType.HIDE]: "hide",
  [DependencyActionType.ENABLE]: "enable",
  [DependencyActionType.DISABLE]: "disable",
  [DependencyActionType.SET_QTY]: "set quantity",
  [DependencyActionType.OVERRIDE_PRICE]: "override price",
  [DependencyActionType.ADJUST_PRICE]: "adjust price",
};

export const TARGET_TYPE_LABELS: Record<DependencyTargetType, string> = {
  [DependencyTargetType.ITEM]: "Item",
  [DependencyTargetType.GROUP]: "Group",
  [DependencyTargetType.BUNDLE]: "Bundle",
};

/**
 * Valid condition types for each target type
 * - ITEM: selection state and quantity conditions
 * - GROUP: group-specific validation conditions
 * - BUNDLE: not used as condition source (conditions are about components, not the bundle itself)
 */
export const CONDITION_TYPES_BY_TARGET: Record<DependencyTargetType, DependencyConditionType[]> = {
  [DependencyTargetType.ITEM]: [
    DependencyConditionType.IS_SELECTED,
    DependencyConditionType.IS_NOT_SELECTED,
    DependencyConditionType.QTY_GTE,
    DependencyConditionType.QTY_LTE,
    DependencyConditionType.QTY_EQ,
  ],
  [DependencyTargetType.GROUP]: [
    DependencyConditionType.GROUP_UNIQUE_GTE,
    DependencyConditionType.GROUP_TOTAL_QTY_GTE,
  ],
  [DependencyTargetType.BUNDLE]: [], // Bundle is not used as condition source
};

/**
 * Valid action types for each target type
 * - ITEM: all actions (visibility, availability, quantity, pricing)
 * - GROUP: visibility and availability only (no quantity or pricing)
 * - BUNDLE: pricing only (can't hide/disable/set qty on the bundle itself)
 */
export const ACTION_TYPES_BY_TARGET: Record<DependencyTargetType, DependencyActionType[]> = {
  [DependencyTargetType.ITEM]: [
    DependencyActionType.SHOW,
    DependencyActionType.HIDE,
    DependencyActionType.ENABLE,
    DependencyActionType.DISABLE,
    DependencyActionType.SET_QTY,
    DependencyActionType.OVERRIDE_PRICE,
    DependencyActionType.ADJUST_PRICE,
  ],
  [DependencyTargetType.GROUP]: [
    DependencyActionType.SHOW,
    DependencyActionType.HIDE,
    DependencyActionType.ENABLE,
    DependencyActionType.DISABLE,
  ],
  [DependencyTargetType.BUNDLE]: [
    DependencyActionType.OVERRIDE_PRICE,
    DependencyActionType.ADJUST_PRICE,
  ],
};
