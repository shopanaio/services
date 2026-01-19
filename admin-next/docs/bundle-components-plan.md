# Package Components - Inventory Service Update

## Overview

Добавление поддержки пакетов (packages) и компонентов (components) для продуктов. Пакет позволяет объединять несколько продуктов/вариантов в группы с гибкими правилами ценообразования и выбора.

## Структура данных (Frontend Types Reference)

Основано на типах из `edit-components-modal/types.ts`:

- **ComponentItemType**: `PRODUCT` | `VARIANT`
- **ComponentPriceType**: `BASE` | `FIXED` | `MARKUP_PERCENT` | `DISCOUNT_PERCENT` | `MARKUP_FIXED` | `DISCOUNT_FIXED` | `FREE` | `INCLUDED`
- **DisplayStyle**: `accordion` | `tabs` | `flat` | `wizard`
- **OutOfStockBehavior**: `hide` | `disable` | `backorder`

---

## Database Schema (Drizzle ORM)

### Enums

```typescript
// enums.ts

import { inventorySchema } from "./schema";

export const componentPriceTypeEnum = inventorySchema.enum("component_price_type", [
  "BASE",
  "FIXED",
  "MARKUP_PERCENT",
  "DISCOUNT_PERCENT",
  "MARKUP_FIXED",
  "DISCOUNT_FIXED",
  "FREE",
  "INCLUDED",
]);

export const componentItemTypeEnum = inventorySchema.enum("component_item_type", [
  "PRODUCT",
  "VARIANT",
]);

export const packageDisplayStyleEnum = inventorySchema.enum("package_display_style", [
  "accordion",
  "tabs",
  "flat",
  "wizard",
]);

export const outOfStockBehaviorEnum = inventorySchema.enum("out_of_stock_behavior", [
  "hide",
  "disable",
  "backorder",
]);
```

### Tables

```typescript
// packages.ts

import {
  uuid,
  varchar,
  integer,
  boolean,
  numeric,
  text,
  timestamp,
  index,
  unique,
  check,
} from "drizzle-orm/pg-core";
import { inventorySchema } from "./schema";
import { product, variant } from "./products";
import {
  componentPriceTypeEnum,
  componentItemTypeEnum,
  packageDisplayStyleEnum,
  outOfStockBehaviorEnum,
} from "./enums";

// ============================================================================
// Package Settings (1:1 с product)
// ============================================================================

export const packageSettings = inventorySchema.table(
  "package_settings",
  {
    id: uuid("id").primaryKey(),
    projectId: uuid("project_id").notNull(),
    productId: uuid("product_id")
      .notNull()
      .unique()
      .references(() => product.id, { onDelete: "cascade" }),

    // Display settings
    displayStyle: packageDisplayStyleEnum("display_style")
      .notNull()
      .default("accordion"),
    showImages: boolean("show_images").notNull().default(true),
    showSku: boolean("show_sku").notNull().default(false),
    showStock: boolean("show_stock").notNull().default(true),
    showComparePrice: boolean("show_compare_price").notNull().default(false),

    // Stock settings
    outOfStockBehavior: outOfStockBehaviorEnum("out_of_stock_behavior")
      .notNull()
      .default("disable"),
    inheritStock: boolean("inherit_stock").notNull().default(true),

    // Validation
    validationMessage: text("validation_message"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_package_settings_project_id").on(table.projectId),
    index("idx_package_settings_product_id").on(table.productId),
  ]
);

// ============================================================================
// Component Group
// ============================================================================

export const componentGroup = inventorySchema.table(
  "component_group",
  {
    id: uuid("id").primaryKey(),
    projectId: uuid("project_id").notNull(),
    productId: uuid("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),

    title: varchar("title", { length: 255 }).notNull(),
    sortIndex: integer("sort_index").notNull().default(0),

    // Selection rules
    isRequired: boolean("is_required").notNull().default(false),
    isMultiple: boolean("is_multiple").notNull().default(false),
    minSelection: integer("min_selection"),
    maxSelection: integer("max_selection"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_component_group_project_id").on(table.projectId),
    index("idx_component_group_product_id").on(table.productId),
    index("idx_component_group_sort_index").on(table.productId, table.sortIndex),
    check(
      "component_group_min_max_selection_valid",
      table.minSelection.isNull().or(table.minSelection.gte(0))
        .and(table.maxSelection.isNull().or(table.maxSelection.gte(1)))
        .and(
          table.minSelection.isNull()
            .or(table.maxSelection.isNull())
            .or(table.minSelection.lte(table.maxSelection))
        )
    ),
  ]
);

// ============================================================================
// Pricing Rule Template (reusable across items)
// ============================================================================

export const pricingRuleTemplate = inventorySchema.table(
  "pricing_rule_template",
  {
    id: uuid("id").primaryKey(),
    projectId: uuid("project_id").notNull(),

    name: varchar("name", { length: 255 }).notNull(),
    priceType: componentPriceTypeEnum("price_type").notNull(),
    priceValue: numeric("price_value", { precision: 15, scale: 4 }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_pricing_rule_template_project_id").on(table.projectId),
    unique("pricing_rule_template_project_name").on(table.projectId, table.name),
  ]
);

// ============================================================================
// Component Item
// ============================================================================

export const componentItem = inventorySchema.table(
  "component_item",
  {
    id: uuid("id").primaryKey(),
    projectId: uuid("project_id").notNull(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => componentGroup.id, { onDelete: "cascade" }),

    itemType: componentItemTypeEnum("item_type").notNull(), // PRODUCT | VARIANT
    sortIndex: integer("sort_index").notNull().default(0),

    // For PRODUCT type
    assignedProductId: uuid("assigned_product_id")
      .references(() => product.id, { onDelete: "cascade" }),

    // For VARIANT type
    assignedVariantId: uuid("assigned_variant_id")
      .references(() => variant.id, { onDelete: "cascade" }),

    // Pricing (inline or template reference)
    pricingTemplateId: uuid("pricing_template_id")
      .references(() => pricingRuleTemplate.id, { onDelete: "set null" }),
    priceType: componentPriceTypeEnum("price_type"),
    priceValue: numeric("price_value", { precision: 15, scale: 4 }),

    // Overrides
    overrideTitle: varchar("override_title", { length: 255 }),
    overrideImageId: uuid("override_image_id"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_component_item_project_id").on(table.projectId),
    index("idx_component_item_group_id").on(table.groupId),
    index("idx_component_item_assigned_product_id").on(table.assignedProductId),
    index("idx_component_item_assigned_variant_id").on(table.assignedVariantId),
    index("idx_component_item_sort_index").on(table.groupId, table.sortIndex),
    check(
      "component_item_type_assignment_valid",
      table.itemType
        .eq("PRODUCT")
        .and(table.assignedProductId.isNotNull())
        .and(table.assignedVariantId.isNull())
        .or(
          table.itemType
            .eq("VARIANT")
            .and(table.assignedVariantId.isNotNull())
            .and(table.assignedProductId.isNull())
        )
    ),
    check(
      "component_item_pricing_rule_valid",
      table.pricingTemplateId.isNotNull()
        .and(table.priceType.isNull())
        .and(table.priceValue.isNull())
        .or(
          table.pricingTemplateId.isNull()
            .and(table.priceType.isNotNull())
        )
    ),
  ]
);

// ============================================================================
// Component Item Excluded Variants (for PRODUCT type items)
// ============================================================================

export const componentItemExcludedVariant = inventorySchema.table(
  "component_item_excluded_variant",
  {
    id: uuid("id").primaryKey(),
    projectId: uuid("project_id").notNull(),
    componentItemId: uuid("component_item_id")
      .notNull()
      .references(() => componentItem.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => variant.id, { onDelete: "cascade" }),
  },
  (table) => [
    unique("component_item_excluded_variant_unique").on(
      table.componentItemId,
      table.variantId
    ),
    index("idx_component_item_excluded_variant_item_id").on(table.componentItemId),
  ]
);

// ============================================================================
// Tiered Discount (optional volume discounts)
// ============================================================================

export const packageTieredDiscount = inventorySchema.table(
  "package_tiered_discount",
  {
    id: uuid("id").primaryKey(),
    projectId: uuid("project_id").notNull(),
    packageSettingsId: uuid("package_settings_id")
      .notNull()
      .references(() => packageSettings.id, { onDelete: "cascade" }),

    minItems: integer("min_items").notNull(),
    discountPercent: numeric("discount_percent", { precision: 5, scale: 2 }).notNull(),
  },
  (table) => [
    index("idx_package_tiered_discount_package_id").on(table.packageSettingsId),
    unique("package_tiered_discount_unique").on(
      table.packageSettingsId,
      table.minItems
    ),
    check(
      "package_tiered_discount_percent_range",
      table.discountPercent.gte(0).and(table.discountPercent.lte(100))
    ),
    check(
      "package_tiered_discount_min_items_positive",
      table.minItems.gte(1)
    ),
  ]
);
```

---

## GraphQL Schema

### File: `packages.graphql`

```graphql
# ============================================================================
# Enums
# ============================================================================

"""
Type of component item in a package.
"""
enum ComponentItemType {
  """Simple product without specific variant selection."""
  PRODUCT
  """Specific variant of a product."""
  VARIANT
}

"""
Price rule types for component items.
"""
enum ComponentPriceType {
  """No changes, use base product price."""
  BASE
  """Override with fixed price."""
  FIXED
  """Add percentage markup to base."""
  MARKUP_PERCENT
  """Subtract percentage from base."""
  DISCOUNT_PERCENT
  """Add fixed amount to base."""
  MARKUP_FIXED
  """Subtract fixed amount from base."""
  DISCOUNT_FIXED
  """100% discount, free in package."""
  FREE
  """Price included in package base."""
  INCLUDED
}

"""
Display style for package on storefront.
"""
enum PackageDisplayStyle {
  accordion
  tabs
  flat
  wizard
}

"""
Behavior when component is out of stock.
"""
enum OutOfStockBehavior {
  """Hide the component from display."""
  hide
  """Show but disable selection."""
  disable
  """Allow backorder."""
  backorder
}

# ============================================================================
# Types
# ============================================================================

"""
Inline pricing rule (not using a template).
"""
type InlinePricingRule {
  """Price type."""
  priceType: ComponentPriceType!

  """Price value."""
  priceValue: Decimal
}

"""
Pricing rule - either a template or inline values.
"""
union ComponentPricingRule = PricingRuleTemplate | InlinePricingRule

"""
Selection rules for a component group.
"""
type ComponentGroupRules {
  """Whether selection from this group is required."""
  isRequired: Boolean!

  """Whether multiple items can be selected."""
  isMultiple: Boolean!

  """Minimum number of selections (if multiple)."""
  minSelection: Int

  """Maximum number of selections (if multiple)."""
  maxSelection: Int
}

"""
Display settings for package.
"""
type PackageDisplaySettings {
  """Display style on storefront."""
  displayStyle: PackageDisplayStyle!

  """Show component images."""
  showImages: Boolean!

  """Show SKU codes."""
  showSku: Boolean!

  """Show stock status."""
  showStock: Boolean!

  """Show compare at prices."""
  showComparePrice: Boolean!
}

"""
Stock settings for package.
"""
type PackageStockSettings {
  """Behavior when component is out of stock."""
  outOfStockBehavior: OutOfStockBehavior!

  """Inherit stock from components."""
  inheritStock: Boolean!
}

"""
Package settings for a product.
"""
type PackageSettings implements Node @key(fields: "id") {
  """The globally unique ID."""
  id: ID!

  """The product this package belongs to."""
  product: Product!

  """Display settings."""
  displaySettings: PackageDisplaySettings!

  """Stock settings."""
  stockSettings: PackageStockSettings!

  """Custom validation message."""
  validationMessage: String

  """Component groups in this package."""
  groups: [ComponentGroup!]!

  """Tiered volume discounts."""
  tieredDiscounts: [TieredDiscount!]!

  """When the package was created."""
  createdAt: DateTime!

  """When the package was last updated."""
  updatedAt: DateTime!
}

"""
A group of components within a package.
"""
type ComponentGroup implements Node @key(fields: "id") {
  """The globally unique ID."""
  id: ID!

  """Group title."""
  title: String!

  """Sort order within the package."""
  sortIndex: Int!

  """Selection rules for this group."""
  rules: ComponentGroupRules!

  """Items in this group."""
  items: [ComponentItem!]!
}

"""
A component item within a group.
"""
type ComponentItem implements Node @key(fields: "id") {
  """The globally unique ID."""
  id: ID!

  """Type of this item (PRODUCT or VARIANT)."""
  itemType: ComponentItemType!

  """Assigned product (for PRODUCT type)."""
  assignedProduct: Product

  """Excluded variant IDs (for PRODUCT type, null means all included)."""
  excludeAssignedProductVariants: [ID!]

  """Assigned variant (for VARIANT type)."""
  assignedVariant: Variant

  """Sort order within the group."""
  sortIndex: Int!

  """Pricing rule configuration."""
  pricingRule: ComponentPricingRule!

  """Custom title override (overrides product/variant title)."""
  title: String

  """Custom featured image override (overrides product/variant image)."""
  featuredImage: File
}

"""
Reusable pricing rule template.
"""
type PricingRuleTemplate implements Node @key(fields: "id") {
  """The globally unique ID."""
  id: ID!

  """Template name."""
  name: String!

  """Price type."""
  priceType: ComponentPriceType!

  """Price value."""
  priceValue: Decimal
}

"""
Tiered volume discount for packages.
"""
type TieredDiscount implements Node @key(fields: "id") {
  """The globally unique ID."""
  id: ID!

  """Minimum items to qualify."""
  minItems: Int!

  """Discount percentage."""
  discountPercent: Decimal!
}

# ============================================================================
# Inputs
# ============================================================================

"""
Input for pricing rule (inline or template reference).
"""
input ComponentPricingRuleInput {
  """Use existing template ID (mutually exclusive with priceType)."""
  templateId: ID

  """Price type (required if not using template)."""
  priceType: ComponentPriceType

  """Price value (for types that require it)."""
  priceValue: Decimal
}

"""
Input for component item (used in bulk save).
ID format determines operation:
- UUID format (existing ID) = update existing item
- Temporary ID (e.g., "item-1234567890") = create new item
- Missing from array = delete
"""
input ComponentItemInput {
  """Item ID (UUID for existing, temporary for new)."""
  id: ID!

  """Type of item."""
  itemType: ComponentItemType!

  """Sort order within the group."""
  sortIndex: Int!

  """Product ID (required for PRODUCT type)."""
  assignedProductId: ID

  """Excluded variant IDs (for PRODUCT type, null = all included)."""
  excludeAssignedProductVariants: [ID!]

  """Variant ID (required for VARIANT type)."""
  assignedVariantId: ID

  """Pricing rule configuration."""
  pricingRule: ComponentPricingRuleInput!

  """Custom title override."""
  title: String

  """Custom featured image file ID override."""
  featuredImageId: ID
}

"""
Input for component group (used in bulk save).
ID format determines operation:
- UUID format (existing ID) = update existing group
- Temporary ID (e.g., "grp-1234567890") = create new group
- Missing from array = delete
"""
input ComponentGroupInput {
  """Group ID (UUID for existing, temporary for new)."""
  id: ID!

  """Group title."""
  title: String!

  """Sort order within the package."""
  sortIndex: Int!

  """Whether selection from this group is required."""
  isRequired: Boolean!

  """Whether multiple items can be selected."""
  isMultiple: Boolean!

  """Minimum number of selections (null = no minimum)."""
  minSelection: Int

  """Maximum number of selections (null = no maximum)."""
  maxSelection: Int

  """Items in this group (replaces all items)."""
  items: [ComponentItemInput!]!
}

"""
Input for pricing rule template (used in bulk save).
"""
input PricingRuleTemplateInput {
  """Template ID (UUID for existing, temporary for new)."""
  id: ID!

  """Template name."""
  name: String!

  """Price type."""
  priceType: ComponentPriceType!

  """Price value."""
  priceValue: Decimal
}

"""
Input for tiered discount.
"""
input TieredDiscountInput {
  """Minimum items to qualify."""
  minItems: Int!

  """Discount percentage."""
  discountPercent: Decimal!
}

"""
Input for package settings.
"""
input PackageSettingsInput {
  """Display style on storefront."""
  displayStyle: PackageDisplayStyle

  """Show component images."""
  showImages: Boolean

  """Show SKU codes."""
  showSku: Boolean

  """Show stock status."""
  showStock: Boolean

  """Show compare at prices."""
  showComparePrice: Boolean

  """Behavior when component is out of stock."""
  outOfStockBehavior: OutOfStockBehavior

  """Inherit stock from components."""
  inheritStock: Boolean

  """Custom validation message."""
  validationMessage: String
}

"""
Input for bulk updating package (replace all approach).
Frontend sends complete state, backend determines CRUD operations.
"""
input PackageUpdateInput {
  """Product ID."""
  productId: ID!

  """Package settings."""
  settings: PackageSettingsInput

  """All groups with their items (replaces existing groups)."""
  groups: [ComponentGroupInput!]!

  """All pricing templates (replaces existing templates)."""
  pricingTemplates: [PricingRuleTemplateInput!]

  """All tiered discounts (replaces existing discounts)."""
  tieredDiscounts: [TieredDiscountInput!]
}

# ============================================================================
# Payloads
# ============================================================================

"""
Payload for package update.
"""
type PackageUpdatePayload {
  """The updated package settings."""
  packageSettings: PackageSettings

  """List of errors that occurred during the mutation."""
  userErrors: [GenericUserError!]!
}

# ============================================================================
# Queries (extend existing Query type)
# ============================================================================

extend type Query {
  """Get package settings for a product."""
  packageSettings(productId: ID!): PackageSettings

  """List all pricing rule templates."""
  pricingRuleTemplates(
    first: Int
    after: String
    last: Int
    before: String
  ): PricingRuleTemplateConnection!
}

"""
Connection for pricing rule templates.
"""
type PricingRuleTemplateConnection {
  edges: [PricingRuleTemplateEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

"""
Edge for pricing rule template.
"""
type PricingRuleTemplateEdge {
  node: PricingRuleTemplate!
  cursor: String!
}

# ============================================================================
# Mutations (extend existing Mutation type)
# ============================================================================

extend type Mutation {
  """
  Bulk update package settings and all components.

  This mutation uses a "replace all" approach:
  - Frontend sends complete state (groups, items, templates, discounts)
  - Backend compares with existing data and handles create/update/delete

  ID handling:
  - Existing UUIDs → update existing records
  - Temporary IDs (e.g., "grp-1234567890") → create new records
  - Records missing from input → deleted

  The mutation returns the complete updated package with all new UUIDs.
  """
  packageUpdate(input: PackageUpdateInput!): PackageUpdatePayload!
}

# ============================================================================
# Extend Product type
# ============================================================================

extend type Product {
  """Package settings if this product is a package."""
  packageSettings: PackageSettings

  """Whether this product is a package."""
  isPackage: Boolean!
}
```

---

## Entity Relationships

```
Product (1) ──────────── (0..1) PackageSettings
                              │
                              ├── (1..*) ComponentGroup
                              │         │
                              │         └── (1..*) ComponentItem
                              │                   │
                              │                   ├── → Product (PRODUCT type)
                              │                   │    └── ComponentItemExcludedVariant
                              │                   │
                              │                   ├── → Variant (VARIANT type)
                              │                   │
                              │                   └── → PricingRuleTemplate (optional)
                              │
                              └── (0..*) PackageTieredDiscount

PricingRuleTemplate (shared across project)
```

---

## Notes

1. **packageSettings** - связь 1:1 с product. Если у продукта есть packageSettings, он считается пакетом.

2. **componentGroup** - группа компонентов с правилами выбора (обязательный/множественный выбор).

3. **componentItem** - элемент группы, может быть либо PRODUCT (все варианты), либо VARIANT (конкретный вариант).

4. **Pricing** - может использовать шаблон (pricingTemplateId) или inline значения (priceType + priceValue).

5. **excludedVariants** - для PRODUCT типа можно исключить определенные варианты из выбора.

6. **Validation rules**:
   - `component_item`:
     - `item_type = PRODUCT` -> `assigned_product_id` is not null and `assigned_variant_id` is null.
     - `item_type = VARIANT` -> `assigned_variant_id` is not null and `assigned_product_id` is null.
     - Pricing: либо `pricing_template_id` (и тогда `price_type`/`price_value` null), либо inline `price_type` (а `price_value` обязателен для типов, где он нужен).
   - `component_group`: `min_selection >= 0`, `max_selection >= 1`, `min_selection <= max_selection` (если оба заданы).
   - `package_tiered_discount`: `min_items >= 1`, `discount_percent` в диапазоне 0..100.
   - Все enum-поля в БД совпадают с GraphQL enum значениями.
   - `pricing_template_id` должен принадлежать тому же `project_id`, что и `component_item` (валидация на уровне сервиса).

6. **Bulk mutation (Replace All)** - единственная мутация `packageUpdate`:
   - Фронтенд отправляет полное состояние (groups с items, templates, discounts, settings)
   - Бэкенд сравнивает с существующими данными и определяет что создать/обновить/удалить
   - ID handling:
     - Существующие UUID → обновление записи
     - Временные ID (например, `grp-1234567890`) → создание новой записи
     - Записи отсутствующие в input → удаление
   - Мутация возвращает полный обновленный package с новыми UUID
