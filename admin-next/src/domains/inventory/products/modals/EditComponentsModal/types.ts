import type { IMediaFile } from "../../mocks/types";

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

// ============================================================================
// Product & Variant Types (for ProductPicker)
// ============================================================================

export interface IProductOption {
  id: string;
  name: string;
  values: string[];
}

export interface IProductVariantOption {
  optionId: string;
  optionName: string;
  value: string;
}

export interface IProductVariant {
  id: string;
  title: string;
  sku: string;
  price: number;
  stock: number;
  imageUrl?: string | null;
  options?: IProductVariantOption[];
}

export interface IPickerProduct {
  id: string;
  title: string;
  sku: string;
  price: number;
  priceMax?: number;
  imageUrl?: string | null;
  hasVariants: boolean;
  stock: number;
  variants?: IProductVariant[];
  options?: IProductOption[];
}

// ============================================================================
// Component Item
// ============================================================================

export interface IComponentItem {
  id: string;
  itemType: ComponentItemType;

  /** Product ID (for all types) */
  productId: string;
  /** Resolved product data */
  product?: IPickerProduct;

  /** Variant ID (for SINGLE_VARIANT) */
  variantId?: string;
  /** Resolved variant data */
  variant?: IProductVariant;

  /** Available variant IDs (for PRODUCT_WITH_VARIANTS) - null = all */
  availableVariantIds?: string[] | null;
  /** Option value restrictions */
  availableOptionValues?: {
    optionId: string;
    allowedValues: string[];
  }[];

  sortIndex: number;

  /** Pricing configuration */
  priceType: ComponentPriceType;
  priceValue: number | null;
  /** Template ID if using a pricing template */
  templateId?: string;

  /** Computed prices */
  basePrice: number;
  basePriceMax?: number;
  finalPrice: number;
  finalPriceMax?: number;

  /** Custom overrides */
  customTitle?: string | null;
  customImage?: IMediaFile | null;

  /** Availability */
  isAvailable: boolean;
  stockStatus?: string;
  totalStock?: number;
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
  settings: {
    showImages: boolean;
    showSku: boolean;
    showStock: boolean;
    showComparePrice: boolean;
    outOfStockBehavior: OutOfStockBehavior;
    inheritStock: boolean;
    validationMessage: string | null;
  };
}

// ============================================================================
// Tab Types
// ============================================================================

export type EditComponentsTabKey = "groups" | "pricing" | "preview" | "settings";

// ============================================================================
// Helper Types
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

export const ITEM_TYPE_ICONS: Record<ComponentItemType, string> = {
  [ComponentItemType.PRODUCT_WITH_VARIANTS]: "📦",
  [ComponentItemType.SINGLE_VARIANT]: "🏷️",
  [ComponentItemType.SIMPLE_PRODUCT]: "📄",
};

export const ITEM_TYPE_LABELS: Record<ComponentItemType, string> = {
  [ComponentItemType.PRODUCT_WITH_VARIANTS]: "Product with variants",
  [ComponentItemType.SINGLE_VARIANT]: "Variant",
  [ComponentItemType.SIMPLE_PRODUCT]: "Simple product",
};
