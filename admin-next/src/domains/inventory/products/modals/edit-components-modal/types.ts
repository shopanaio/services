import type { ApiProduct, ApiVariant } from "@/graphql/types";

// ============================================================================
// Enums
// ============================================================================

/**
 * Component item type - determines how the item is displayed
 */
export enum ComponentItemType {
  /** Simple product without variants */
  SIMPLE_PRODUCT = "SIMPLE_PRODUCT",
  /** Specific variant of a product */
  SINGLE_VARIANT = "SINGLE_VARIANT",
  /** Product with variant selection on storefront */
  PRODUCT_WITH_VARIANTS = "PRODUCT_WITH_VARIANTS",
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
export type StockStatus = "in_stock" | "low_stock" | "out_of_stock";

// ============================================================================
// Component Item
// ============================================================================

export interface IComponentItem {
  id: string;
  itemType: ComponentItemType;

  /** Product ID (for all types) */
  productId: string;
  /** Resolved product data from API */
  product?: ApiProduct;

  /** Variant ID (for SINGLE_VARIANT) */
  variantId?: string;
  /** Resolved variant data from API */
  variant?: ApiVariant;

  /** Available variant IDs (for PRODUCT_WITH_VARIANTS) - null = all variants */
  availableVariantIds?: string[] | null;

  /** Included variants with individual pricing */
  includedVariants?: IIncludedVariant[];

  sortIndex: number;

  /** Pricing configuration - applies to all variants */
  priceType: ComponentPriceType;
  priceValue: number | null;
  /** Template ID if using a pricing template */
  templateId?: string;

  /** Custom overrides */
  customTitle?: string | null;
  customImageUrl?: string | null;

  /** Availability */
  isAvailable: boolean;
  stockStatus?: StockStatus;
}

// ============================================================================
// Component Group
// ============================================================================

export interface IComponentGroup {
  id: string;
  title: string;
  slug: string;
  sortIndex: number;

  /** Selection rules */
  isRequired: boolean;
  isMultiple: boolean;
  minSelection: number;
  maxSelection: number | null;

  /** Default selected items */
  defaultItemIds: string[];

  /** Items in this group */
  items: IComponentItem[];
}

// ============================================================================
// Pricing Configuration
// ============================================================================

export interface IPricingRuleTemplate {
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

export interface IBundleDisplaySettings {
  displayStyle: DisplayStyle;
  showImages: boolean;
  showSku: boolean;
  showStock: boolean;
  showComparePrice: boolean;
}

export interface IBundleStockSettings {
  outOfStockBehavior: OutOfStockBehavior;
  inheritStock: boolean;
}

export interface IBundleSettings extends IBundleDisplaySettings, IBundleStockSettings {
  validationMessage: string | null;
}

// ============================================================================
// Modal Payload & Save Data
// ============================================================================

export interface IEditComponentsModalPayload {
  productId: string;
  groups: IComponentGroup[];

  /** Global settings */
  pricingTemplates: IPricingRuleTemplate[];
  tieredDiscounts: ITieredDiscount[];

  /** Display settings */
  displayStyle: DisplayStyle;
  showImages: boolean;
  showSku: boolean;
  showStock: boolean;
  showComparePrice: boolean;

  /** Stock settings */
  outOfStockBehavior: OutOfStockBehavior;
  inheritStock: boolean;

  /** Validation */
  validationMessage: string | null;

  /** Callbacks */
  onSave?: (data: IEditComponentsModalSaveData) => void;
}

export interface IEditComponentsModalSaveData {
  groups: IComponentGroup[];
  pricingTemplates: IPricingRuleTemplate[];
  tieredDiscounts: ITieredDiscount[];
  displayStyle: DisplayStyle;
  settings: IBundleSettings;
}

// ============================================================================
// API Input Types for GraphQL mutations
// ============================================================================

/** Input for creating/updating a component item */
export interface IComponentItemInput {
  itemType: ComponentItemType;
  productId: string;
  variantId?: string | null;
  availableVariantIds?: string[] | null;
  sortIndex: number;
  priceType: ComponentPriceType;
  priceValue?: number | null;
  templateId?: string | null;
  customTitle?: string | null;
  customImageUrl?: string | null;
}

/** Input for creating/updating a component group */
export interface IComponentGroupInput {
  title: string;
  slug: string;
  sortIndex: number;
  isRequired: boolean;
  isMultiple: boolean;
  minSelection: number;
  maxSelection?: number | null;
  defaultItemIds: string[];
  items: IComponentItemInput[];
}

/** Input for pricing rule template */
export interface IPricingRuleTemplateInput {
  id?: string;
  name: string;
  priceType: ComponentPriceType;
  priceValue?: number | null;
}

/** Input for tiered discount */
export interface ITieredDiscountInput {
  id?: string;
  minItems: number;
  discountPercent: number;
}

/** Input for bundle settings */
export interface IBundleSettingsInput {
  showImages: boolean;
  showSku: boolean;
  showStock: boolean;
  showComparePrice: boolean;
  outOfStockBehavior: OutOfStockBehavior;
  inheritStock: boolean;
  validationMessage?: string | null;
}

/** Input for updating entire bundle configuration */
export interface IBundleConfigInput {
  groups: IComponentGroupInput[];
  pricingTemplates: IPricingRuleTemplateInput[];
  tieredDiscounts: ITieredDiscountInput[];
  displayStyle: DisplayStyle;
  settings: IBundleSettingsInput;
}

// ============================================================================
// Tab Types
// ============================================================================

export type EditComponentsTabKey = "groups" | "pricing" | "preview" | "settings";

// ============================================================================
// Helper Types & Constants
// ============================================================================

export interface IPriceRuleOption {
  value: ComponentPriceType;
  label: string;
  requiresValue?: boolean;
  valueSuffix?: string;
}

export const PRICE_RULE_OPTIONS: IPriceRuleOption[] = [
  { value: ComponentPriceType.BASE, label: "No change" },
  { value: ComponentPriceType.FIXED, label: "Fixed price", requiresValue: true, valueSuffix: "$" },
  { value: ComponentPriceType.MARKUP_PERCENT, label: "Markup %", requiresValue: true, valueSuffix: "%" },
  { value: ComponentPriceType.DISCOUNT_PERCENT, label: "Discount %", requiresValue: true, valueSuffix: "%" },
  { value: ComponentPriceType.MARKUP_FIXED, label: "Markup $", requiresValue: true, valueSuffix: "$" },
  { value: ComponentPriceType.DISCOUNT_FIXED, label: "Discount $", requiresValue: true, valueSuffix: "$" },
  { value: ComponentPriceType.FREE, label: "Free" },
  { value: ComponentPriceType.INCLUDED, label: "Included in bundle" },
];

export const ITEM_TYPE_LABELS: Record<ComponentItemType, string> = {
  [ComponentItemType.PRODUCT_WITH_VARIANTS]: "Product with variants",
  [ComponentItemType.SINGLE_VARIANT]: "Variant",
  [ComponentItemType.SIMPLE_PRODUCT]: "Simple product",
};

export const STOCK_STATUS_LABELS: Record<StockStatus, string> = {
  in_stock: "In Stock",
  low_stock: "Low Stock",
  out_of_stock: "Out of Stock",
};
