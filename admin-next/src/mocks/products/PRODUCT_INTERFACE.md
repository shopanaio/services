# Unified Product Interface for UI

## Overview

This document defines a unified, consistent interface for products in the admin UI. It resolves conflicts and duplications found across multiple mock files.

---

## Identified Issues in Current Mocks

### 1. Duplicate Type Definitions

| Type | Files | Issue |
|------|-------|-------|
| `ISwatch` | `types.ts`, `options.ts` | Different type systems (enum vs string literal) |
| `ITag` | `types.ts`, `tags.ts` | `color` required vs optional |
| Status | `types.ts`, `products-list.ts`, `bulk-editor.ts` | Enum vs string literals |
| Variant | `types.ts`, `bulk-editor.ts`, `components.ts` | 3 different structures |
| Product | `types.ts`, `products-list.ts`, `bulk-editor.ts`, `components.ts` | 4 different structures |

### 2. Inconsistent Naming

- `title` vs `name` vs `label` for display names
- `slug` present in some, missing in others
- `sortIndex` vs `variantSortIndex` vs `level`

### 3. Attributes vs Options Confusion

- `types.ts`: Uses `IProductFeatureGroup` for both, distinguishes via `isOption` flag
- `attributes.ts`: Separate `IAttributeRow`, `IAttributeValue` with `displayType`
- `options.ts`: `IOptionGroup`, `IOptionValue` with `style`

---

## Unified Interface

### Base Types

```typescript
type ID = string;

// ============================================================================
// Enums
// ============================================================================

enum EntityStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

enum WeightUnit {
  G = 'G',
  KG = 'KG',
  LB = 'LB',
  OZ = 'OZ',
}

enum DimensionUnit {
  MM = 'MM',
  CM = 'CM',
  M = 'M',
  IN = 'IN',
}

enum SwatchType {
  NONE = 'NONE',
  COLOR = 'COLOR',
  TWO_COLOR = 'TWO_COLOR',
  IMAGE = 'IMAGE',
}

enum OptionDisplayStyle {
  DEFAULT = 'DEFAULT',     // Radio buttons / pills
  DROPDOWN = 'DROPDOWN',   // Select dropdown
  SWATCH = 'SWATCH',       // Color/image swatches
  SIZE = 'SIZE',           // Size selector
}

enum AttributeDisplayType {
  TEXT = 'TEXT',
  DROPDOWN = 'DROPDOWN',
  MULTISELECT = 'MULTISELECT',
}

enum FileDriver {
  LOCAL = 'LOCAL',
  S3 = 'S3',
}

enum StockStatus {
  IN_STOCK = 'IN_STOCK',
  LOW_STOCK = 'LOW_STOCK',
  OUT_OF_STOCK = 'OUT_OF_STOCK',
  BACKORDER = 'BACKORDER',
}
```

### Media

```typescript
interface IMediaFile {
  id: ID;
  url: string;
  name: string;
  size: number;
  ext: string;
  driver: FileDriver;
  key: string;
  createdAt: string;
  updatedAt?: string;
  alt?: string;
  width?: number;
  height?: number;
}
```

### Swatch (Unified)

```typescript
interface ISwatch {
  id: ID;
  type: SwatchType;
  color1: string | null;
  color2: string | null;
  image: IMediaFile | null;
}
```

### Category

```typescript
interface ICategory {
  id: ID;
  title: string;
  slug: string;
  description: string | null;
  excerpt: string | null;
  parentId: ID | null;
  level: number;
  path: ID[];                    // Array of ancestor IDs
  status: EntityStatus;
  sortIndex: number;
  seoTitle: string | null;
  seoDescription: string | null;
  featured: IMediaFile | null;
  gallery: IMediaFile[];
  createdAt: string;
  updatedAt: string;
}
```

### Tag

```typescript
interface ITag {
  id: ID;
  title: string;
  slug: string;
  color: string;                 // Required, not optional
}
```

### Option System

```typescript
/**
 * Option Value - a single selectable option (e.g., "Red", "Large")
 */
interface IOptionValue {
  id: ID;
  title: string;
  slug: string;
  sortIndex: number;
  swatch: ISwatch | null;
  isDefault?: boolean;
}

/**
 * Option Group - a group of related options (e.g., "Color", "Size")
 */
interface IOptionGroup {
  id: ID;
  title: string;
  slug: string;
  displayStyle: OptionDisplayStyle;
  sortIndex: number;
  values: IOptionValue[];
  /** UI state flags - not persisted */
  isActive?: boolean;
  isEditing?: boolean;
}
```

### Attribute System

```typescript
/**
 * Attribute Value - a single attribute value
 */
interface IAttributeValue {
  id: ID;
  title: string;
  slug: string;
  sortIndex: number;
}

/**
 * Attribute - a product characteristic (e.g., "Material: Cotton")
 */
interface IAttribute {
  id: ID;
  title: string;
  slug: string;
  displayType: AttributeDisplayType;
  sortIndex: number;
  groupId: ID | null;
  values: IAttributeValue[];
}

/**
 * Attribute Group - for organizing related attributes
 */
interface IAttributeGroup {
  id: ID;
  title: string;
  slug: string;
  sortIndex: number;
  attributes: IAttribute[];
}
```

### Physical Properties

```typescript
interface IPhysicalProperties {
  weight: number | null;
  weightUnit: WeightUnit;
  length: number | null;
  width: number | null;
  height: number | null;
  dimensionUnit: DimensionUnit;
}
```

### Pricing

```typescript
interface IPricing {
  /** Current selling price (in minor currency units, e.g., kopecks) */
  price: number;
  /** Compare at / original price for showing discounts */
  compareAtPrice: number | null;
  /** Cost price for margin calculation */
  costPrice: number | null;
  /** Computed margin percentage */
  margin?: number | null;
}

interface IPriceHistoryRecord {
  id: ID;
  amount: number;
  compareAt: number | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  isCurrent: boolean;
}
```

### Inventory

```typescript
interface IInventory {
  /** Total quantity on hand */
  onHand: number;
  /** Reserved for pending orders */
  reserved: number;
  /** Damaged, expired, etc. */
  unavailable: number;
  /** Computed: onHand - reserved - unavailable */
  available: number;
  stockStatus: StockStatus;
  /** Low stock threshold */
  lowStockThreshold?: number;
  /** Allow backorders */
  allowBackorder?: boolean;
}
```

### Variant

```typescript
interface IProductVariant {
  id: ID;
  containerId: ID;              // Parent product ID

  // Basic Info
  title: string;
  slug: string;
  sku: string | null;
  barcode: string | null;

  // Media
  featured: IMediaFile | null;
  gallery: IMediaFile[];

  // Pricing
  pricing: IPricing;

  // Physical
  physical: IPhysicalProperties;
  requiresShipping: boolean;

  // Inventory
  inventory: IInventory;

  // Options - which option values make this variant
  selectedOptions: {
    groupId: ID;
    groupSlug: string;
    valueId: ID;
    valueSlug: string;
    valueTitle: string;
    swatch: ISwatch | null;
  }[];

  // Status
  status: EntityStatus;
  sortIndex: number;

  // Listing visibility
  inListing: boolean;
  listingSortIndex: number | null;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}
```

### Component System (for Bundles)

```typescript
enum ComponentItemType {
  SIMPLE_PRODUCT = 'SIMPLE_PRODUCT',
  SINGLE_VARIANT = 'SINGLE_VARIANT',
  PRODUCT_WITH_VARIANTS = 'PRODUCT_WITH_VARIANTS',
}

enum ComponentPriceType {
  BASE = 'BASE',
  FIXED = 'FIXED',
  MARKUP_PERCENT = 'MARKUP_PERCENT',
  DISCOUNT_PERCENT = 'DISCOUNT_PERCENT',
  MARKUP_FIXED = 'MARKUP_FIXED',
  DISCOUNT_FIXED = 'DISCOUNT_FIXED',
  FREE = 'FREE',
  INCLUDED = 'INCLUDED',
}

interface IComponentItem {
  id: ID;
  itemType: ComponentItemType;

  productId: ID;
  variantId?: ID;

  // For PRODUCT_WITH_VARIANTS - which variants are available
  availableVariantIds: ID[] | null;  // null = all

  // Pricing
  priceType: ComponentPriceType;
  priceValue: number | null;
  basePrice: number;
  finalPrice: number;
  basePriceMax?: number;
  finalPriceMax?: number;

  // Customization
  customTitle: string | null;
  customImage: IMediaFile | null;

  // Availability
  isAvailable: boolean;
  stockStatus: StockStatus;
  totalStock: number;

  sortIndex: number;
}

interface IComponentGroup {
  id: ID;
  title: string;
  slug: string;
  sortIndex: number;

  // Selection rules
  isRequired: boolean;
  isMultiple: boolean;
  minSelection: number;
  maxSelection: number | null;
  defaultItemIds: ID[];

  items: IComponentItem[];
}
```

### Main Product Interface

```typescript
interface IProduct {
  id: ID;
  containerId: ID;               // Same as id for parent, parent id for variants

  // ========================================
  // Basic Information
  // ========================================
  title: string;
  slug: string;
  description: string | null;    // Rich text (EditorJS JSON string)
  excerpt: string | null;        // Rich text (EditorJS JSON string)

  // ========================================
  // Media
  // ========================================
  featured: IMediaFile | null;
  gallery: IMediaFile[];

  // ========================================
  // Classification
  // ========================================
  categories: ICategory[];
  primaryCategory: {
    id: ID;
    title: string;
    slug: string;
  } | null;
  tags: ITag[];

  // ========================================
  // Pricing (for simple products or default)
  // ========================================
  pricing: IPricing;

  // ========================================
  // Physical Properties
  // ========================================
  physical: IPhysicalProperties;
  requiresShipping: boolean;

  // ========================================
  // Inventory
  // ========================================
  inventory: IInventory;
  sku: string | null;
  barcode: string | null;

  // ========================================
  // Attributes (product characteristics)
  // ========================================
  attributes: IAttributeGroup[];

  // ========================================
  // Options & Variants
  // ========================================
  options: IOptionGroup[];
  isVariableProduct: boolean;
  variants: IProductVariant[];

  /** For simple products, the embedded variant for inventory/pricing */
  embedVariantId: ID | null;

  // ========================================
  // Components (bundles/kits)
  // ========================================
  hasComponents: boolean;
  componentGroups: IComponentGroup[];

  // ========================================
  // SEO
  // ========================================
  seoTitle: string | null;
  seoDescription: string | null;

  // ========================================
  // Status & Timestamps
  // ========================================
  status: EntityStatus;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}
```

---

## Derived Types for Specific UI Views

### Product List Item (Table View)

```typescript
interface IProductListItem {
  id: ID;
  title: string;
  slug: string;
  status: EntityStatus;
  featured: IMediaFile | null;

  // Quick info
  sku: string | null;
  price: number;
  priceMax?: number;           // For variable products

  // Inventory
  inventory: {
    total: number;
    available: number;
    stockStatus: StockStatus;
  };

  // Classification
  primaryCategory: {
    id: ID;
    title: string;
  } | null;
  tags: ITag[];

  // Variant info
  isVariableProduct: boolean;
  variantCount: number;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}
```

### Product Picker Item (for component selection)

```typescript
interface IProductPickerItem {
  id: ID;
  title: string;
  sku: string | null;
  imageUrl: string | null;

  price: number;
  priceMax?: number;

  hasVariants: boolean;
  stock: number;

  variants?: IProductPickerVariant[];
  options?: IProductPickerOption[];
}

interface IProductPickerVariant {
  id: ID;
  title: string;
  sku: string | null;
  imageUrl: string | null;
  price: number;
  stock: number;
  selectedOptions: {
    groupId: ID;
    groupTitle: string;
    value: string;
  }[];
}

interface IProductPickerOption {
  id: ID;
  title: string;
  values: string[];
}
```

### Bulk Editor Row

```typescript
interface IBulkEditorRow {
  id: ID;
  productId: ID;
  variantId: ID;

  title: string;
  imageUrl: string | null;

  // Editable fields
  sku: string | null;
  barcode: string | null;
  price: number;
  compareAtPrice: number | null;
  costPrice: number | null;

  // Inventory
  onHand: number;
  reserved: number;
  unavailable: number;

  // Physical
  weight: number | null;
  weightUnit: WeightUnit;
  length: number | null;
  width: number | null;
  height: number | null;
  dimensionUnit: DimensionUnit;
}
```

---

## Type Guards & Utilities

```typescript
// Check if product is a variable product
const isVariableProduct = (product: IProduct): boolean => {
  return product.isVariableProduct && product.variants.length > 0;
};

// Check if product has components (is a bundle)
const isBundle = (product: IProduct): boolean => {
  return product.hasComponents && product.componentGroups.length > 0;
};

// Get price range for variable products
const getPriceRange = (product: IProduct): { min: number; max: number } => {
  if (!isVariableProduct(product) || product.variants.length === 0) {
    return { min: product.pricing.price, max: product.pricing.price };
  }

  const prices = product.variants.map(v => v.pricing.price);
  return {
    min: Math.min(...prices),
    max: Math.max(...prices),
  };
};

// Get total inventory
const getTotalInventory = (product: IProduct): number => {
  if (!isVariableProduct(product)) {
    return product.inventory.available;
  }

  return product.variants.reduce((sum, v) => sum + v.inventory.available, 0);
};

// Get stock status for product
const getProductStockStatus = (product: IProduct): StockStatus => {
  const total = getTotalInventory(product);
  const threshold = product.inventory.lowStockThreshold ?? 10;

  if (total === 0) return StockStatus.OUT_OF_STOCK;
  if (total <= threshold) return StockStatus.LOW_STOCK;
  return StockStatus.IN_STOCK;
};
```

---

## Migration Notes

### From `types.ts`

- `IProduct.oldPrice` -> `IProduct.pricing.compareAtPrice`
- `IProduct.costPrice` -> `IProduct.pricing.costPrice`
- `IProduct.price` -> `IProduct.pricing.price`
- `IProduct.weight/weightUnit/length/width/height/dimensionUnit` -> `IProduct.physical.*`
- `IProduct.stockStatus` -> `IProduct.inventory.stockStatus`
- `IProduct.embedVariant` -> `IProduct.embedVariantId` (just ID, not full object)
- `IProduct.groups` -> `IProduct.componentGroups`

### From `options.ts`

- `IOptionGroup.style` -> `IOptionGroup.displayStyle`
- `IOptionGroup.name` -> `IOptionGroup.title`
- `IOptionValue.label` -> `IOptionValue.title`
- `ISwatch.color_duo` -> `SwatchType.TWO_COLOR`

### From `attributes.ts`

- Separate `IAttributeRow` -> unified `IAttribute` + `IAttributeGroup`
- `displayType` string literals -> `AttributeDisplayType` enum
- `level` -> computed from `groupId`

### From `bulk-editor.ts`

- `IMockVariant` -> Use `IProductVariant` or `IBulkEditorRow`
- `IMockProduct` -> Use `IProduct`
- `status` string -> `EntityStatus` enum

### From `products-list.ts`

- `IProductListItem.name` -> `IProductListItem.title`
- `IProductListItem.inventory` number -> `IProductListItem.inventory.total`
- `IProductListItem.category` string -> `IProductListItem.primaryCategory`
- `IProductListItem.brand` -> Move to attributes

---

## Summary

This unified interface provides:

1. **Consistent naming**: All use `title` for display names, `slug` for URLs
2. **Clear separation**: Options (for variants) vs Attributes (product characteristics)
3. **Normalized structure**: Pricing, Physical, Inventory as nested objects
4. **Type safety**: Enums instead of string literals
5. **Flexibility**: Derived types for specific UI needs
6. **Extensibility**: Component system for bundles
7. **Utility functions**: Type guards and helpers

Prices are stored in minor currency units (kopecks/cents) as integers to avoid floating-point issues.
