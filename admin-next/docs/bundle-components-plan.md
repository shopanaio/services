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

export const tieredDiscountBasisEnum = inventorySchema.enum("tiered_discount_basis", [
  "UNIQUE_ITEMS",    // Count of distinct selected items
  "TOTAL_QUANTITY",  // Sum of quantities across all selected items
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

    // Selection rules (how many DIFFERENT items can be selected)
    isRequired: boolean("is_required").notNull().default(false),
    isMultiple: boolean("is_multiple").notNull().default(false),
    minSelection: integer("min_selection"), // Min unique items to select
    maxSelection: integer("max_selection"), // Max unique items to select

    // Total quantity rules (sum of quantities across all selected items)
    minTotalQuantity: integer("min_total_quantity"), // Min total units (e.g., "pick at least 5 items total")
    maxTotalQuantity: integer("max_total_quantity"), // Max total units (e.g., "pick up to 10 items total")

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
    // Total quantity constraints
    check(
      "component_group_min_max_total_quantity_valid",
      table.minTotalQuantity.isNull().or(table.minTotalQuantity.gte(1))
        .and(table.maxTotalQuantity.isNull().or(table.maxTotalQuantity.gte(1)))
        .and(
          table.minTotalQuantity.isNull()
            .or(table.maxTotalQuantity.isNull())
            .or(table.minTotalQuantity.lte(table.maxTotalQuantity))
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
    // Pricing value validation based on price type
    check(
      "pricing_rule_template_price_value_valid",
      // BASE, FREE, INCLUDED → priceValue must be NULL
      table.priceType.in(["BASE", "FREE", "INCLUDED"])
        .and(table.priceValue.isNull())
        .or(
          // FIXED, MARKUP_*, DISCOUNT_* → priceValue required
          table.priceType.in([
            "FIXED",
            "MARKUP_PERCENT",
            "DISCOUNT_PERCENT",
            "MARKUP_FIXED",
            "DISCOUNT_FIXED",
          ]).and(table.priceValue.isNotNull())
        )
    ),
    // Percent types should be in range 0-100
    check(
      "pricing_rule_template_percent_range",
      table.priceType.notIn(["MARKUP_PERCENT", "DISCOUNT_PERCENT"])
        .or(
          table.priceValue.gte(0).and(table.priceValue.lte(100))
        )
    ),
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

    // Quantity settings
    quantity: integer("quantity").notNull().default(1), // Default/fixed quantity per item
    isQuantityAdjustable: boolean("is_quantity_adjustable").notNull().default(false),
    minQuantity: integer("min_quantity"), // Min if adjustable (null = 1)
    maxQuantity: integer("max_quantity"), // Max if adjustable (null = unlimited)

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
    // Pricing value validation based on price type
    // BASE, FREE, INCLUDED → priceValue must be NULL
    // FIXED, MARKUP_*, DISCOUNT_* → priceValue required
    check(
      "component_item_price_value_valid",
      // When using template, skip this check (priceType is null)
      table.priceType.isNull()
        .or(
          // BASE, FREE, INCLUDED → priceValue must be NULL
          table.priceType.in(["BASE", "FREE", "INCLUDED"])
            .and(table.priceValue.isNull())
        )
        .or(
          // FIXED, MARKUP_*, DISCOUNT_* → priceValue required
          table.priceType.in([
            "FIXED",
            "MARKUP_PERCENT",
            "DISCOUNT_PERCENT",
            "MARKUP_FIXED",
            "DISCOUNT_FIXED",
          ]).and(table.priceValue.isNotNull())
        )
    ),
    // Percent types should be in range 0-100
    check(
      "component_item_percent_range",
      table.priceType.isNull()
        .or(table.priceType.notIn(["MARKUP_PERCENT", "DISCOUNT_PERCENT"]))
        .or(
          table.priceValue.gte(0).and(table.priceValue.lte(100))
        )
    ),
    // Quantity must be >= 1
    check(
      "component_item_quantity_positive",
      table.quantity.gte(1)
    ),
    // Quantity validation when adjustable
    check(
      "component_item_quantity_adjustable_valid",
      // If not adjustable, min/max should be null
      table.isQuantityAdjustable.eq(false)
        .and(table.minQuantity.isNull())
        .and(table.maxQuantity.isNull())
        .or(
          // If adjustable, validate min/max ranges
          table.isQuantityAdjustable.eq(true)
            .and(
              table.minQuantity.isNull().or(table.minQuantity.gte(1))
            )
            .and(
              table.maxQuantity.isNull().or(table.maxQuantity.gte(1))
            )
            .and(
              table.minQuantity.isNull()
                .or(table.maxQuantity.isNull())
                .or(table.minQuantity.lte(table.maxQuantity))
            )
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

    // What to count for the threshold
    basis: tieredDiscountBasisEnum("basis").notNull().default("TOTAL_QUANTITY"),

    // Threshold value (interpretation depends on basis)
    minCount: integer("min_count").notNull(), // renamed from minItems for clarity
    discountPercent: numeric("discount_percent", { precision: 5, scale: 2 }).notNull(),
  },
  (table) => [
    index("idx_package_tiered_discount_package_id").on(table.packageSettingsId),
    // Unique per package + basis + threshold (allows different rules for UNIQUE_ITEMS vs TOTAL_QUANTITY)
    unique("package_tiered_discount_unique").on(
      table.packageSettingsId,
      table.basis,
      table.minCount
    ),
    check(
      "package_tiered_discount_percent_range",
      table.discountPercent.gte(0).and(table.discountPercent.lte(100))
    ),
    check(
      "package_tiered_discount_min_count_positive",
      table.minCount.gte(1)
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

"""
Basis for calculating tiered discount threshold.
"""
enum TieredDiscountBasis {
  """Count distinct selected items (positions)."""
  UNIQUE_ITEMS
  """Sum of quantities across all selected items (total units)."""
  TOTAL_QUANTITY
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
Controls how many DIFFERENT items can be selected from the group.
"""
type ComponentGroupSelectionRules {
  """Whether selection from this group is required."""
  isRequired: Boolean!

  """Whether multiple items can be selected."""
  isMultiple: Boolean!

  """Minimum number of unique items to select (if multiple)."""
  minSelection: Int

  """Maximum number of unique items to select (if multiple)."""
  maxSelection: Int
}

"""
Total quantity rules for a component group.
Controls the SUM of quantities across all selected items.
"""
type ComponentGroupQuantityRules {
  """Minimum total units required (e.g., "pick at least 5 items total")."""
  minTotalQuantity: Int

  """Maximum total units allowed (e.g., "pick up to 10 items total")."""
  maxTotalQuantity: Int
}

"""
Quantity settings for a component item.
"""
type ComponentItemQuantitySettings {
  """Default/fixed quantity of this item when selected."""
  quantity: Int!

  """Whether the customer can adjust the quantity."""
  isAdjustable: Boolean!

  """Minimum quantity allowed (when adjustable). Null means 1."""
  minQuantity: Int

  """Maximum quantity allowed (when adjustable). Null means unlimited."""
  maxQuantity: Int
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

  """Selection rules (how many DIFFERENT items can be selected)."""
  selectionRules: ComponentGroupSelectionRules!

  """Total quantity rules (sum of quantities across selected items)."""
  quantityRules: ComponentGroupQuantityRules!

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

  """Quantity settings for this item."""
  quantitySettings: ComponentItemQuantitySettings!

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

  """What to count for the threshold."""
  basis: TieredDiscountBasis!

  """Minimum count to qualify (interpretation depends on basis)."""
  minCount: Int!

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
Input for quantity settings.
"""
input ComponentItemQuantityInput {
  """Default/fixed quantity of this item when selected. Default: 1."""
  quantity: Int

  """Whether the customer can adjust the quantity. Default: false."""
  isAdjustable: Boolean

  """Minimum quantity allowed (when adjustable). Null means 1."""
  minQuantity: Int

  """Maximum quantity allowed (when adjustable). Null means unlimited."""
  maxQuantity: Int
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

  """Quantity settings. If not provided, defaults to quantity=1, not adjustable."""
  quantitySettings: ComponentItemQuantityInput

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

  # Selection rules (how many DIFFERENT items)
  """Whether selection from this group is required."""
  isRequired: Boolean!

  """Whether multiple items can be selected."""
  isMultiple: Boolean!

  """Minimum number of unique items to select (null = no minimum)."""
  minSelection: Int

  """Maximum number of unique items to select (null = no maximum)."""
  maxSelection: Int

  # Total quantity rules (sum of quantities)
  """Minimum total units across all selected items (null = no minimum)."""
  minTotalQuantity: Int

  """Maximum total units across all selected items (null = no maximum)."""
  maxTotalQuantity: Int

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
  """What to count for the threshold. Default: TOTAL_QUANTITY."""
  basis: TieredDiscountBasis

  """Minimum count to qualify (interpretation depends on basis)."""
  minCount: Int!

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

  """
  Expected updatedAt timestamp for optimistic locking.
  If provided and doesn't match current DB value, mutation fails with CONCURRENT_MODIFICATION error.
  Optional for new packages (when creating package for the first time).
  """
  expectedUpdatedAt: DateTime

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
Mapping from temporary client ID to generated server UUID.
Used to help frontend update local state after mutation.
"""
type IdMapping {
  """Temporary ID sent by client (e.g., "grp-1234567890")."""
  tempId: ID!

  """Generated UUID on server."""
  newId: ID!
}

"""
Payload for package update.
"""
type PackageUpdatePayload {
  """The updated package settings."""
  packageSettings: PackageSettings

  """
  Mappings from temporary IDs to new UUIDs.
  Only includes entries for newly created entities.
  Frontend can use this to update local state with real IDs.
  """
  idMappings: [IdMapping!]!

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
                              │         │  - selectionRules: minSelection, maxSelection
                              │         │  - quantityRules: minTotalQuantity, maxTotalQuantity
                              │         │
                              │         └── (1..*) ComponentItem
                              │                   │  - quantitySettings: quantity, isAdjustable, min/max
                              │                   │
                              │                   ├── → Product (PRODUCT type)
                              │                   │    └── ComponentItemExcludedVariant
                              │                   │
                              │                   ├── → Variant (VARIANT type)
                              │                   │
                              │                   └── → PricingRuleTemplate (optional)
                              │
                              └── (0..*) PackageTieredDiscount
                                         - basis: UNIQUE_ITEMS | TOTAL_QUANTITY
                                         - minCount, discountPercent

PricingRuleTemplate (shared across project)
```

---

## Notes

1. **packageSettings** - связь 1:1 с product. Если у продукта есть packageSettings, он считается пакетом.

2. **componentGroup** - группа компонентов с двумя типами лимитов:

   | Лимит | Что контролирует | Поля |
   |-------|-----------------|------|
   | **Selection** | Сколько **разных позиций** можно выбрать | `minSelection`, `maxSelection` |
   | **Total Quantity** | Сколько **штук суммарно** можно выбрать | `minTotalQuantity`, `maxTotalQuantity` |

   **Примеры бизнес-кейсов:**
   - "Выбери 1-3 разных напитка" → `minSelection=1, maxSelection=3`
   - "Выбери всего 5 штук из списка" → `minTotalQuantity=5, maxTotalQuantity=5`
   - "Выбери 2-4 разных товара, но не более 10 штук всего" → `minSelection=2, maxSelection=4, maxTotalQuantity=10`

3. **componentItem** - элемент группы, может быть либо PRODUCT (все варианты), либо VARIANT (конкретный вариант).

4. **Quantity per Item** - каждый `componentItem` имеет настройки количества:
   - `quantity` - базовое/фиксированное количество единиц товара при выборе (например, "2 футболки")
   - `isQuantityAdjustable` - может ли покупатель изменять количество
   - `minQuantity` / `maxQuantity` - диапазон допустимого количества (только если adjustable=true)

   **Примеры использования:**
   - Фиксированный набор: `quantity=2, isAdjustable=false` → "В комплект входит 2 носка"
   - Настраиваемое количество: `quantity=1, isAdjustable=true, minQuantity=1, maxQuantity=5` → "Выберите от 1 до 5 штук"

5. **Pricing** - может использовать шаблон (pricingTemplateId) или inline значения (priceType + priceValue). Цена применяется **за единицу товара**, итоговая цена = priceValue × quantity.

6. **Tiered Discount** - теперь с явным `basis`:
   - `UNIQUE_ITEMS` - скидка по количеству выбранных позиций ("выбери 3 разных товара — скидка 10%")
   - `TOTAL_QUANTITY` - скидка по общему количеству штук ("купи 5 штук — скидка 10%")

   **Default: TOTAL_QUANTITY** — это более привычная логика для большинства мерчантов.

7. **excludedVariants** - для PRODUCT типа можно исключить определенные варианты из выбора.

8. **Validation rules**:
   - `component_item`:
     - `item_type = PRODUCT` → `assigned_product_id` is not null and `assigned_variant_id` is null.
     - `item_type = VARIANT` → `assigned_variant_id` is not null and `assigned_product_id` is null.
     - Pricing: либо `pricing_template_id` (и тогда `price_type`/`price_value` null), либо inline `price_type`.
     - Quantity: `quantity >= 1`; если `is_quantity_adjustable = false` → `min/max_quantity` должны быть NULL.
   - `component_group`:
     - Selection: `min_selection >= 0`, `max_selection >= 1`, `min <= max` (если оба заданы).
     - Total Quantity: `min_total_quantity >= 1`, `max_total_quantity >= 1`, `min <= max` (если оба заданы).
   - `package_tiered_discount`: `min_count >= 1`, `discount_percent` в диапазоне 0..100.
   - Все enum-поля в БД совпадают с GraphQL enum значениями.
   - `pricing_template_id` должен принадлежать тому же `project_id`, что и `component_item` (валидация на уровне сервиса).

9. **Bulk mutation (Replace All)** - единственная мутация `packageUpdate`:
   - Фронтенд отправляет полное состояние (groups с items, templates, discounts, settings)
   - Бэкенд сравнивает с существующими данными и определяет что создать/обновить/удалить
   - ID handling:
     - Существующие UUID → обновление записи
     - Временные ID (например, `grp-1234567890`) → создание новой записи
     - Записи отсутствующие в input → удаление
   - Мутация возвращает полный обновленный package с новыми UUID

---

## Service Validation Rules (Critical)

Эти правила должны быть реализованы на уровне сервиса, так как DB constraints не могут покрыть все случаи.

### 1. Pricing: priceType ↔ priceValue

| priceType | priceValue |
|-----------|------------|
| `BASE`, `FREE`, `INCLUDED` | **must be NULL** |
| `FIXED`, `MARKUP_FIXED`, `DISCOUNT_FIXED` | **required, any positive value** |
| `MARKUP_PERCENT`, `DISCOUNT_PERCENT` | **required, range 0-100** |

```typescript
// Service validation example
function validatePricingRule(priceType: ComponentPriceType, priceValue: Decimal | null): UserError[] {
  const errors: UserError[] = [];

  const noValueTypes = ["BASE", "FREE", "INCLUDED"];
  const valueRequiredTypes = ["FIXED", "MARKUP_FIXED", "DISCOUNT_FIXED", "MARKUP_PERCENT", "DISCOUNT_PERCENT"];
  const percentTypes = ["MARKUP_PERCENT", "DISCOUNT_PERCENT"];

  if (noValueTypes.includes(priceType) && priceValue !== null) {
    errors.push({ field: "priceValue", message: `priceValue must be null for ${priceType}` });
  }

  if (valueRequiredTypes.includes(priceType) && priceValue === null) {
    errors.push({ field: "priceValue", message: `priceValue is required for ${priceType}` });
  }

  if (percentTypes.includes(priceType) && priceValue !== null) {
    if (priceValue < 0 || priceValue > 100) {
      errors.push({ field: "priceValue", message: "Percent value must be between 0 and 100" });
    }
  }

  return errors;
}
```

### 2. Quantity Settings Validation

| isAdjustable | quantity | minQuantity | maxQuantity |
|--------------|----------|-------------|-------------|
| `false` | ≥1 (fixed) | **must be NULL** | **must be NULL** |
| `true` | ≥1 (default) | NULL or ≥1 | NULL or ≥1, ≥minQuantity |

```typescript
function validateQuantitySettings(
  quantity: number,
  isAdjustable: boolean,
  minQuantity: number | null,
  maxQuantity: number | null
): UserError[] {
  const errors: UserError[] = [];

  // Quantity must be at least 1
  if (quantity < 1) {
    errors.push({
      field: "quantitySettings.quantity",
      message: "Quantity must be at least 1"
    });
  }

  if (!isAdjustable) {
    // Fixed quantity mode: min/max should be null
    if (minQuantity !== null || maxQuantity !== null) {
      errors.push({
        field: "quantitySettings.minQuantity",
        message: "min/maxQuantity should be null when isAdjustable=false"
      });
    }
  } else {
    // Adjustable mode
    if (minQuantity !== null && minQuantity < 1) {
      errors.push({
        field: "quantitySettings.minQuantity",
        message: "minQuantity must be at least 1"
      });
    }

    if (maxQuantity !== null && maxQuantity < 1) {
      errors.push({
        field: "quantitySettings.maxQuantity",
        message: "maxQuantity must be at least 1"
      });
    }

    if (minQuantity !== null && maxQuantity !== null && minQuantity > maxQuantity) {
      errors.push({
        field: "quantitySettings.minQuantity",
        message: "minQuantity cannot exceed maxQuantity"
      });
    }

    // Default quantity should be within min/max range
    const effectiveMin = minQuantity ?? 1;
    const effectiveMax = maxQuantity ?? Infinity;
    if (quantity < effectiveMin || quantity > effectiveMax) {
      errors.push({
        field: "quantitySettings.quantity",
        message: `Default quantity must be between ${effectiveMin} and ${effectiveMax === Infinity ? 'unlimited' : effectiveMax}`
      });
    }
  }

  return errors;
}
```

### 3. ComponentGroupRules: Selection vs Total Quantity

**Selection Rules** (сколько РАЗНЫХ позиций):

| isMultiple | isRequired | Expected minSelection/maxSelection |
|------------|------------|-----------------------------------|
| `false` | `false` | NULL, NULL (0 or 1 selection) |
| `false` | `true` | NULL, NULL (exactly 1 selection) |
| `true` | `false` | 0 or NULL, any (0 to N selections) |
| `true` | `true` | ≥1, any (1 to N selections) |

**Total Quantity Rules** (сколько ШТУК суммарно):
- Независимы от isMultiple/isRequired
- `minTotalQuantity` и `maxTotalQuantity` могут быть NULL (без ограничений)
- Если заданы оба: `min <= max`

```typescript
interface GroupRulesInput {
  isMultiple: boolean;
  isRequired: boolean;
  minSelection: number | null;
  maxSelection: number | null;
  minTotalQuantity: number | null;
  maxTotalQuantity: number | null;
}

function validateGroupRules(input: GroupRulesInput): UserError[] {
  const errors: UserError[] = [];
  const { isMultiple, isRequired, minSelection, maxSelection, minTotalQuantity, maxTotalQuantity } = input;

  // === Selection Rules ===
  if (!isMultiple) {
    // Single selection mode: min/max should be null (implicitly 0-1 or exactly 1)
    if (minSelection !== null || maxSelection !== null) {
      errors.push({
        field: "minSelection",
        message: "min/maxSelection should be null when isMultiple=false"
      });
    }
  } else {
    // Multiple selection mode
    if (isRequired && (minSelection === null || minSelection < 1)) {
      errors.push({
        field: "minSelection",
        message: "minSelection must be ≥1 when isRequired=true and isMultiple=true"
      });
    }
  }

  // === Total Quantity Rules ===
  if (minTotalQuantity !== null && minTotalQuantity < 1) {
    errors.push({
      field: "minTotalQuantity",
      message: "minTotalQuantity must be at least 1"
    });
  }

  if (maxTotalQuantity !== null && maxTotalQuantity < 1) {
    errors.push({
      field: "maxTotalQuantity",
      message: "maxTotalQuantity must be at least 1"
    });
  }

  if (minTotalQuantity !== null && maxTotalQuantity !== null && minTotalQuantity > maxTotalQuantity) {
    errors.push({
      field: "minTotalQuantity",
      message: "minTotalQuantity cannot exceed maxTotalQuantity"
    });
  }

  return errors;
}
```

### 4. excludedVariants: принадлежность assignedProduct

FK не может гарантировать, что variant принадлежит assignedProduct. Проверяем на уровне сервиса:

```typescript
async function validateExcludedVariants(
  itemType: ComponentItemType,
  assignedProductId: string | null,
  excludedVariantIds: string[]
): Promise<UserError[]> {
  const errors: UserError[] = [];

  // excludedVariants только для PRODUCT type
  if (itemType !== "PRODUCT" && excludedVariantIds.length > 0) {
    errors.push({
      field: "excludeAssignedProductVariants",
      message: "excludedVariants only allowed for PRODUCT type items"
    });
    return errors;
  }

  if (itemType === "PRODUCT" && excludedVariantIds.length > 0) {
    // Загружаем варианты и проверяем принадлежность
    const variants = await db.query.variant.findMany({
      where: inArray(variant.id, excludedVariantIds),
      columns: { id: true, productId: true }
    });

    for (const v of variants) {
      if (v.productId !== assignedProductId) {
        errors.push({
          field: "excludeAssignedProductVariants",
          message: `Variant ${v.id} does not belong to assigned product`
        });
      }
    }
  }

  return errors;
}
```

### 5. projectId Cross-Validation

Все связанные сущности должны принадлежать одному projectId:

```typescript
async function validateProjectOwnership(
  projectId: string,
  input: PackageUpdateInput
): Promise<UserError[]> {
  const errors: UserError[] = [];

  // Validate pricingTemplateId references
  const templateIds = input.groups
    .flatMap(g => g.items)
    .map(i => i.pricingRule.templateId)
    .filter(Boolean);

  if (templateIds.length > 0) {
    const templates = await db.query.pricingRuleTemplate.findMany({
      where: and(
        inArray(pricingRuleTemplate.id, templateIds),
        eq(pricingRuleTemplate.projectId, projectId)
      )
    });

    const foundIds = new Set(templates.map(t => t.id));
    for (const id of templateIds) {
      if (!foundIds.has(id)) {
        errors.push({
          field: "pricingRule.templateId",
          message: `Template ${id} not found or belongs to different project`
        });
      }
    }
  }

  // Similarly validate assignedProductId, assignedVariantId, etc.

  return errors;
}
```

---

## Concurrency Protection (Optimistic Locking)

Replace-all мутация может перезаписать изменения другого пользователя. Решение: optimistic locking.

### GraphQL Schema Update

```graphql
input PackageUpdateInput {
  """Product ID."""
  productId: ID!

  """
  Expected updatedAt timestamp for optimistic locking.
  If provided and doesn't match current DB value, mutation fails with CONCURRENT_MODIFICATION error.
  Optional for new packages.
  """
  expectedUpdatedAt: DateTime

  # ... rest of fields
}

type PackageUpdatePayload {
  packageSettings: PackageSettings
  userErrors: [GenericUserError!]!
}
```

### Service Implementation

```typescript
async function packageUpdate(
  projectId: string,
  input: PackageUpdateInput
): Promise<PackageUpdatePayload> {
  return await db.transaction(async (tx) => {
    // 1. Check optimistic lock
    const existing = await tx.query.packageSettings.findFirst({
      where: eq(packageSettings.productId, input.productId)
    });

    if (existing && input.expectedUpdatedAt) {
      if (existing.updatedAt.getTime() !== new Date(input.expectedUpdatedAt).getTime()) {
        return {
          packageSettings: null,
          userErrors: [{
            field: "expectedUpdatedAt",
            code: "CONCURRENT_MODIFICATION",
            message: "Package was modified by another user. Please refresh and try again."
          }]
        };
      }
    }

    // 2. Perform all operations within transaction
    // ... create/update/delete logic

    // 3. Return updated package with new updatedAt
  });
}
```

---

## ID Mapping (Temp ID → UUID)

Фронтенд использует временные ID для новых сущностей. Мутация должна вернуть маппинг.

### GraphQL Schema Update

```graphql
"""
Mapping from temporary client ID to generated server UUID.
"""
type IdMapping {
  """Temporary ID sent by client."""
  tempId: ID!

  """Generated UUID on server."""
  newId: ID!
}

type PackageUpdatePayload {
  packageSettings: PackageSettings

  """
  Mappings from temporary IDs to new UUIDs.
  Only includes entries for newly created entities.
  """
  idMappings: [IdMapping!]!

  userErrors: [GenericUserError!]!
}
```

### Service Implementation

```typescript
function isTemporaryId(id: string): boolean {
  // Temporary IDs: "grp-", "item-", "tpl-", "tier-" prefixes
  return /^(grp|item|tpl|tier)-/.test(id);
}

async function packageUpdate(input: PackageUpdateInput): Promise<PackageUpdatePayload> {
  const idMappings: IdMapping[] = [];

  for (const groupInput of input.groups) {
    if (isTemporaryId(groupInput.id)) {
      const newId = crypto.randomUUID();
      idMappings.push({ tempId: groupInput.id, newId });
      // Use newId for insert
    }

    for (const itemInput of groupInput.items) {
      if (isTemporaryId(itemInput.id)) {
        const newId = crypto.randomUUID();
        idMappings.push({ tempId: itemInput.id, newId });
      }
    }
  }

  // ... same for templates and tieredDiscounts

  return {
    packageSettings: updatedPackage,
    idMappings,
    userErrors: []
  };
}
```

---

## GraphQL Validation Notes

### ComponentPricingRuleInput: Mutual Exclusivity

```typescript
function validatePricingRuleInput(input: ComponentPricingRuleInput): UserError[] {
  const errors: UserError[] = [];

  const hasTemplate = input.templateId !== null && input.templateId !== undefined;
  const hasInline = input.priceType !== null && input.priceType !== undefined;

  if (hasTemplate && hasInline) {
    errors.push({
      field: "pricingRule",
      message: "Cannot specify both templateId and priceType. Choose one."
    });
  }

  if (!hasTemplate && !hasInline) {
    errors.push({
      field: "pricingRule",
      message: "Must specify either templateId or priceType."
    });
  }

  return errors;
}
```

### excludeAssignedProductVariants: null vs []

- `null` или отсутствует → все варианты включены (по умолчанию)
- `[]` (пустой массив) → все варианты включены (эквивалент null)
- `[id1, id2]` → указанные варианты исключены

```typescript
// В резолвере
excludeAssignedProductVariants: async (item) => {
  if (item.itemType !== "PRODUCT") return null;

  const excluded = await db.query.componentItemExcludedVariant.findMany({
    where: eq(componentItemExcludedVariant.componentItemId, item.id)
  });

  return excluded.length > 0
    ? excluded.map(e => e.variantId)
    : null; // Return null, not [] for "all included"
}
```

### Sorting

Явно определяем сортировку в резолверах:

```typescript
// PackageSettings.groups
groups: async (packageSettings) => {
  return db.query.componentGroup.findMany({
    where: eq(componentGroup.productId, packageSettings.productId),
    orderBy: asc(componentGroup.sortIndex) // Explicit sort
  });
}

// PackageSettings.tieredDiscounts
tieredDiscounts: async (packageSettings) => {
  return db.query.packageTieredDiscount.findMany({
    where: eq(packageTieredDiscount.packageSettingsId, packageSettings.id),
    orderBy: asc(packageTieredDiscount.minItems) // Explicit sort by minItems
  });
}

// ComponentGroup.items
items: async (group) => {
  return db.query.componentItem.findMany({
    where: eq(componentItem.groupId, group.id),
    orderBy: asc(componentItem.sortIndex) // Explicit sort
  });
}
```
