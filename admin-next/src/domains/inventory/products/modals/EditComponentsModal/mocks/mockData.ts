import {
  ComponentItemType,
  ComponentPriceType,
  BundleCalcMode,
  type IComponentGroup,
  type IPickerProduct,
  type IPricingRuleTemplate,
  type ITieredDiscount,
  type IEditComponentsModalPayload,
} from "../types";

// ============================================================================
// Mock Products for ProductPicker
// ============================================================================

export const mockProducts: IPickerProduct[] = [
  {
    id: "prod-1",
    title: "Premium Case",
    sku: "CASE-PREM",
    price: 2500,
    priceMax: 4500,
    imageUrl: "/placeholder.png",
    hasVariants: true,
    stock: 234,
    options: [
      { id: "opt-color", name: "Color", values: ["Black", "White", "Blue"] },
      { id: "opt-material", name: "Material", values: ["Leather", "Silicone"] },
    ],
    variants: [
      {
        id: "var-1",
        title: "Black / Leather",
        sku: "CASE-BLK-LTH",
        price: 4500,
        stock: 45,
        options: [
          { optionId: "opt-color", optionName: "Color", value: "Black" },
          { optionId: "opt-material", optionName: "Material", value: "Leather" },
        ],
      },
      {
        id: "var-2",
        title: "Black / Silicone",
        sku: "CASE-BLK-SIL",
        price: 2500,
        stock: 67,
        options: [
          { optionId: "opt-color", optionName: "Color", value: "Black" },
          { optionId: "opt-material", optionName: "Material", value: "Silicone" },
        ],
      },
      {
        id: "var-3",
        title: "White / Leather",
        sku: "CASE-WHT-LTH",
        price: 4500,
        stock: 23,
        options: [
          { optionId: "opt-color", optionName: "Color", value: "White" },
          { optionId: "opt-material", optionName: "Material", value: "Leather" },
        ],
      },
      {
        id: "var-4",
        title: "White / Silicone",
        sku: "CASE-WHT-SIL",
        price: 2500,
        stock: 56,
        options: [
          { optionId: "opt-color", optionName: "Color", value: "White" },
          { optionId: "opt-material", optionName: "Material", value: "Silicone" },
        ],
      },
      {
        id: "var-5",
        title: "Blue / Leather",
        sku: "CASE-BLU-LTH",
        price: 4500,
        stock: 0,
        options: [
          { optionId: "opt-color", optionName: "Color", value: "Blue" },
          { optionId: "opt-material", optionName: "Material", value: "Leather" },
        ],
      },
      {
        id: "var-6",
        title: "Blue / Silicone",
        sku: "CASE-BLU-SIL",
        price: 2500,
        stock: 43,
        options: [
          { optionId: "opt-color", optionName: "Color", value: "Blue" },
          { optionId: "opt-material", optionName: "Material", value: "Silicone" },
        ],
      },
    ],
  },
  {
    id: "prod-2",
    title: "Pro Charger 65W",
    sku: "CHG-PRO-001",
    price: 3200,
    imageUrl: "/placeholder.png",
    hasVariants: false,
    stock: 45,
  },
  {
    id: "prod-3",
    title: "Screen Protector",
    sku: "SCR-PRO-001",
    price: 1200,
    imageUrl: "/placeholder.png",
    hasVariants: false,
    stock: 89,
  },
  {
    id: "prod-4",
    title: "Premium USB-C Cable",
    sku: "CBL-USBC-001",
    price: 990,
    imageUrl: "/placeholder.png",
    hasVariants: false,
    stock: 156,
  },
  {
    id: "prod-5",
    title: "Wireless Charger",
    sku: "CHG-WIR-001",
    price: 2490,
    imageUrl: "/placeholder.png",
    hasVariants: false,
    stock: 34,
  },
  {
    id: "prod-6",
    title: "Laptop Stand",
    sku: "STD-LAP-001",
    price: 4990,
    imageUrl: "/placeholder.png",
    hasVariants: false,
    stock: 22,
  },
];

// ============================================================================
// Mock Warranty Products
// ============================================================================

export const mockWarrantyProducts: IPickerProduct[] = [
  {
    id: "war-1",
    title: "1 Year Standard Warranty",
    sku: "WAR-STD-1Y",
    price: 0,
    imageUrl: null,
    hasVariants: false,
    stock: 999,
  },
  {
    id: "war-2",
    title: "2 Year Extended Warranty",
    sku: "WAR-EXT-2Y",
    price: 12990,
    imageUrl: null,
    hasVariants: false,
    stock: 999,
  },
  {
    id: "war-3",
    title: "3 Year AppleCare+",
    sku: "WAR-APC-3Y",
    price: 24990,
    imageUrl: null,
    hasVariants: false,
    stock: 999,
  },
];

// ============================================================================
// Mock Gift Wrap Products
// ============================================================================

export const mockGiftWrapProducts: IPickerProduct[] = [
  {
    id: "gift-1",
    title: "Classic Gift Wrap",
    sku: "GIFT-CLS-001",
    price: 299,
    imageUrl: "/placeholder.png",
    hasVariants: false,
    stock: 100,
  },
  {
    id: "gift-2",
    title: "Premium Gift Wrap",
    sku: "GIFT-PRM-001",
    price: 599,
    imageUrl: "/placeholder.png",
    hasVariants: false,
    stock: 50,
  },
];

// ============================================================================
// Mock Component Groups
// ============================================================================

export const mockGroups: IComponentGroup[] = [
  {
    id: "grp-1",
    title: "Accessories",
    slug: "accessories",
    sortIndex: 0,
    isRequired: true,
    isMultiple: true,
    minSelection: 1,
    maxSelection: 5,
    defaultItemIds: [],
    items: [
      {
        id: "item-1",
        itemType: ComponentItemType.PRODUCT_WITH_VARIANTS,
        productId: "prod-1",
        priceType: ComponentPriceType.MARKUP_PERCENT,
        priceValue: 10,
        basePrice: 2500,
        basePriceMax: 4500,
        finalPrice: 2750,
        finalPriceMax: 4950,
        sortIndex: 0,
        isAvailable: true,
        totalStock: 234,
        availableVariantIds: ["var-1", "var-2", "var-3", "var-4"],
        autoHideOutOfStock: true,
      },
      {
        id: "item-2",
        itemType: ComponentItemType.SINGLE_VARIANT,
        productId: "prod-1",
        variantId: "var-5",
        priceType: ComponentPriceType.FIXED,
        priceValue: 3990,
        basePrice: 4500,
        finalPrice: 3990,
        sortIndex: 1,
        isAvailable: false,
        stockStatus: "Out of stock",
      },
      {
        id: "item-3",
        itemType: ComponentItemType.SIMPLE_PRODUCT,
        productId: "prod-2",
        priceType: ComponentPriceType.DISCOUNT_PERCENT,
        priceValue: 10,
        basePrice: 3200,
        finalPrice: 2880,
        sortIndex: 2,
        isAvailable: true,
      },
      {
        id: "item-4",
        itemType: ComponentItemType.SIMPLE_PRODUCT,
        productId: "prod-3",
        priceType: ComponentPriceType.FREE,
        priceValue: null,
        basePrice: 1200,
        finalPrice: 0,
        sortIndex: 3,
        isAvailable: true,
      },
      {
        id: "item-5",
        itemType: ComponentItemType.SIMPLE_PRODUCT,
        productId: "prod-4",
        priceType: ComponentPriceType.BASE,
        priceValue: null,
        basePrice: 990,
        finalPrice: 990,
        sortIndex: 4,
        isAvailable: true,
      },
    ],
  },
  {
    id: "grp-2",
    title: "Warranty",
    slug: "warranty",
    sortIndex: 1,
    isRequired: false,
    isMultiple: false,
    minSelection: 0,
    maxSelection: 1,
    defaultItemIds: ["item-6"],
    items: [
      {
        id: "item-6",
        itemType: ComponentItemType.SIMPLE_PRODUCT,
        productId: "war-1",
        priceType: ComponentPriceType.INCLUDED,
        priceValue: null,
        basePrice: 0,
        finalPrice: 0,
        sortIndex: 0,
        isAvailable: true,
        customTitle: "1 Year Standard Warranty (included)",
      },
      {
        id: "item-7",
        itemType: ComponentItemType.SIMPLE_PRODUCT,
        productId: "war-2",
        priceType: ComponentPriceType.FIXED,
        priceValue: 12990,
        basePrice: 12990,
        finalPrice: 12990,
        sortIndex: 1,
        isAvailable: true,
        customTitle: "2 Year Extended Warranty",
      },
      {
        id: "item-8",
        itemType: ComponentItemType.SIMPLE_PRODUCT,
        productId: "war-3",
        priceType: ComponentPriceType.FIXED,
        priceValue: 24990,
        basePrice: 24990,
        finalPrice: 24990,
        sortIndex: 2,
        isAvailable: true,
        customTitle: "3 Year AppleCare+",
      },
    ],
  },
  {
    id: "grp-3",
    title: "Gift Wrap",
    slug: "gift-wrap",
    sortIndex: 2,
    isRequired: false,
    isMultiple: false,
    minSelection: 0,
    maxSelection: 1,
    defaultItemIds: [],
    items: [
      {
        id: "item-9",
        itemType: ComponentItemType.SIMPLE_PRODUCT,
        productId: "gift-1",
        priceType: ComponentPriceType.FREE,
        priceValue: null,
        basePrice: 299,
        finalPrice: 0,
        sortIndex: 0,
        isAvailable: true,
      },
      {
        id: "item-10",
        itemType: ComponentItemType.SIMPLE_PRODUCT,
        productId: "gift-2",
        priceType: ComponentPriceType.FREE,
        priceValue: null,
        basePrice: 599,
        finalPrice: 0,
        sortIndex: 1,
        isAvailable: true,
      },
    ],
  },
];

// ============================================================================
// Mock Pricing Templates
// ============================================================================

export const mockPricingTemplates: IPricingRuleTemplate[] = [
  {
    id: "tpl-1",
    name: "Bundle Discount",
    priceType: ComponentPriceType.DISCOUNT_PERCENT,
    priceValue: 15,
    applyToGroupIds: "all",
  },
  {
    id: "tpl-2",
    name: "Accessories Markup",
    priceType: ComponentPriceType.MARKUP_PERCENT,
    priceValue: 10,
    applyToGroupIds: ["grp-1"],
  },
  {
    id: "tpl-3",
    name: "Fixed Warranty",
    priceType: ComponentPriceType.FIXED,
    priceValue: 4990,
    applyToGroupIds: ["grp-2"],
  },
  {
    id: "tpl-4",
    name: "Free Gift",
    priceType: ComponentPriceType.FREE,
    priceValue: null,
    applyToGroupIds: ["grp-3"],
  },
];

// ============================================================================
// Mock Tiered Discounts
// ============================================================================

export const mockTieredDiscounts: ITieredDiscount[] = [
  { id: "tier-1", minItems: 2, discountPercent: 5 },
  { id: "tier-2", minItems: 4, discountPercent: 10 },
  { id: "tier-3", minItems: 6, discountPercent: 15 },
];

// ============================================================================
// Mock Modal Settings
// ============================================================================

export const mockModalSettings = {
  bundleCalcMode: BundleCalcMode.ADDITIVE,
  displayStyle: "accordion" as const,
  showImages: true,
  showSku: true,
  showStock: true,
  showComparePrice: false,
  outOfStockBehavior: "disable" as const,
  inheritStock: true,
  validationMessage: "Please select required accessories before continuing",
};

// ============================================================================
// Full Mock Payload
// ============================================================================

export const mockPayload: IEditComponentsModalPayload = {
  productId: "main-product-123",
  groups: mockGroups,
  bundleCalcMode: mockModalSettings.bundleCalcMode,
  pricingTemplates: mockPricingTemplates,
  tieredDiscounts: mockTieredDiscounts,
  displayStyle: mockModalSettings.displayStyle,
  showImages: mockModalSettings.showImages,
  showSku: mockModalSettings.showSku,
  showStock: mockModalSettings.showStock,
  showComparePrice: mockModalSettings.showComparePrice,
  outOfStockBehavior: mockModalSettings.outOfStockBehavior,
  inheritStock: mockModalSettings.inheritStock,
  validationMessage: mockModalSettings.validationMessage,
  onSave: (data) => {
    console.log("Saving component data:", data);
  },
};

// ============================================================================
// Helper: Get product by ID
// ============================================================================

const allProducts = [...mockProducts, ...mockWarrantyProducts, ...mockGiftWrapProducts];

export const getProductById = (id: string): IPickerProduct | undefined => {
  return allProducts.find((p) => p.id === id);
};

export const getVariantById = (productId: string, variantId: string) => {
  const product = getProductById(productId);
  return product?.variants?.find((v) => v.id === variantId);
};

// ============================================================================
// Helper: Format price
// ============================================================================

export const formatPrice = (amount: number): string => {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// ============================================================================
// Helper: Calculate final price
// ============================================================================

export const calculateFinalPrice = (
  basePrice: number,
  priceType: ComponentPriceType,
  priceValue: number | null
): number => {
  switch (priceType) {
    case ComponentPriceType.BASE:
      return basePrice;
    case ComponentPriceType.FIXED:
      return priceValue ?? basePrice;
    case ComponentPriceType.MARKUP_PERCENT:
      return Math.round(basePrice * (1 + (priceValue ?? 0) / 100));
    case ComponentPriceType.DISCOUNT_PERCENT:
      return Math.round(basePrice * (1 - (priceValue ?? 0) / 100));
    case ComponentPriceType.MARKUP_FIXED:
      return basePrice + (priceValue ?? 0);
    case ComponentPriceType.DISCOUNT_FIXED:
      return Math.max(0, basePrice - (priceValue ?? 0));
    case ComponentPriceType.FREE:
    case ComponentPriceType.INCLUDED:
      return 0;
    default:
      return basePrice;
  }
};
