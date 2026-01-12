# Bundle Components - Inventory Service Update

## Overview

Добавление поддержки бандлов (bundles) и компонентов (components) для продуктов. Бандл позволяет объединять несколько продуктов/вариантов в группы с гибкими правилами ценообразования и выбора.

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
```

### Tables

```typescript
// bundles.ts

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
} from "drizzle-orm/pg-core";
import { inventorySchema } from "./schema";
import { product, variant } from "./products";
import { componentPriceTypeEnum } from "./enums";

// ============================================================================
// Bundle Settings (1:1 с product)
// ============================================================================

export const bundleSettings = inventorySchema.table(
  "bundle_settings",
  {
    id: uuid("id").primaryKey(),
    projectId: uuid("project_id").notNull(),
    productId: uuid("product_id")
      .notNull()
      .unique()
      .references(() => product.id, { onDelete: "cascade" }),

    // Display settings
    displayStyle: varchar("display_style", { length: 32 })
      .notNull()
      .default("accordion"),
    showImages: boolean("show_images").notNull().default(true),
    showSku: boolean("show_sku").notNull().default(false),
    showStock: boolean("show_stock").notNull().default(true),
    showComparePrice: boolean("show_compare_price").notNull().default(false),

    // Stock settings
    outOfStockBehavior: varchar("out_of_stock_behavior", { length: 32 })
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
    index("idx_bundle_settings_project_id").on(table.projectId),
    index("idx_bundle_settings_product_id").on(table.productId),
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

    itemType: varchar("item_type", { length: 32 }).notNull(), // PRODUCT | VARIANT
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

export const bundleTieredDiscount = inventorySchema.table(
  "bundle_tiered_discount",
  {
    id: uuid("id").primaryKey(),
    projectId: uuid("project_id").notNull(),
    bundleSettingsId: uuid("bundle_settings_id")
      .notNull()
      .references(() => bundleSettings.id, { onDelete: "cascade" }),

    minItems: integer("min_items").notNull(),
    discountPercent: numeric("discount_percent", { precision: 5, scale: 2 }).notNull(),
  },
  (table) => [
    index("idx_bundle_tiered_discount_bundle_id").on(table.bundleSettingsId),
    unique("bundle_tiered_discount_unique").on(
      table.bundleSettingsId,
      table.minItems
    ),
  ]
);
```

---

## GraphQL Schema

### File: `bundles.graphql`

```graphql
# ============================================================================
# Enums
# ============================================================================

"""
Type of component item in a bundle.
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
  """100% discount, free in bundle."""
  FREE
  """Price included in bundle base."""
  INCLUDED
}

"""
Display style for bundle on storefront.
"""
enum BundleDisplayStyle {
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
Component item overrides.
"""
type ComponentItemOverrides {
  """Custom title override."""
  title: String

  """Custom featured image override."""
  featuredImage: File
}

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
Display settings for bundle.
"""
type BundleDisplaySettings {
  """Display style on storefront."""
  displayStyle: BundleDisplayStyle!

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
Stock settings for bundle.
"""
type BundleStockSettings {
  """Behavior when component is out of stock."""
  outOfStockBehavior: OutOfStockBehavior!

  """Inherit stock from components."""
  inheritStock: Boolean!
}

"""
Bundle settings for a product.
"""
type BundleSettings implements Node @key(fields: "id") {
  """The globally unique ID."""
  id: ID!

  """The product this bundle belongs to."""
  product: Product!

  """Display settings."""
  displaySettings: BundleDisplaySettings!

  """Stock settings."""
  stockSettings: BundleStockSettings!

  """Custom validation message."""
  validationMessage: String

  """Component groups in this bundle."""
  groups: [ComponentGroup!]!

  """Tiered volume discounts."""
  tieredDiscounts: [TieredDiscount!]!

  """When the bundle was created."""
  createdAt: DateTime!

  """When the bundle was last updated."""
  updatedAt: DateTime!
}

"""
A group of components within a bundle.
"""
type ComponentGroup implements Node @key(fields: "id") {
  """The globally unique ID."""
  id: ID!

  """Group title."""
  title: String!

  """Sort order within the bundle."""
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

  """Display overrides."""
  overrides: ComponentItemOverrides!
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
Tiered volume discount for bundles.
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
Input for display settings.
"""
input BundleDisplaySettingsInput {
  """Display style on storefront."""
  displayStyle: BundleDisplayStyle

  """Show component images."""
  showImages: Boolean

  """Show SKU codes."""
  showSku: Boolean

  """Show stock status."""
  showStock: Boolean

  """Show compare at prices."""
  showComparePrice: Boolean
}

"""
Input for stock settings.
"""
input BundleStockSettingsInput {
  """Behavior when component is out of stock."""
  outOfStockBehavior: OutOfStockBehavior

  """Inherit stock from components."""
  inheritStock: Boolean
}

"""
Input for bundle settings.
"""
input BundleSettingsInput {
  """Display settings."""
  displaySettings: BundleDisplaySettingsInput

  """Stock settings."""
  stockSettings: BundleStockSettingsInput

  """Custom validation message."""
  validationMessage: String
}

"""
Input for component group rules.
"""
input ComponentGroupRulesInput {
  """Whether selection from this group is required."""
  isRequired: Boolean

  """Whether multiple items can be selected."""
  isMultiple: Boolean

  """Minimum number of selections."""
  minSelection: Int

  """Maximum number of selections."""
  maxSelection: Int
}

"""
Input for creating a component group.
"""
input ComponentGroupCreateInput {
  """Product ID to add the group to."""
  productId: ID!

  """Group title."""
  title: String!

  """Sort order within the bundle."""
  sortIndex: Int

  """Selection rules."""
  rules: ComponentGroupRulesInput
}

"""
Input for updating a component group.
"""
input ComponentGroupUpdateInput {
  """The ID of the group to update."""
  id: ID!

  """Group title."""
  title: String

  """Sort order within the bundle."""
  sortIndex: Int

  """Selection rules."""
  rules: ComponentGroupRulesInput
}

"""
Input for deleting a component group.
"""
input ComponentGroupDeleteInput {
  """The ID of the group to delete."""
  id: ID!
}

"""
Input for pricing rule (inline or template reference).
"""
input ComponentPricingRuleInput {
  """Use existing template ID."""
  templateId: ID

  """Price type (required if not using template)."""
  priceType: ComponentPriceType

  """Price value."""
  priceValue: Decimal
}

"""
Input for component item overrides.
"""
input ComponentItemOverridesInput {
  """Override title."""
  title: String

  """Override featured image file ID."""
  featuredImageId: ID
}

"""
Input for creating a component item.
"""
input ComponentItemCreateInput {
  """The ID of the group to add the item to."""
  groupId: ID!

  """Type of item."""
  itemType: ComponentItemType!

  """Sort order within the group."""
  sortIndex: Int

  """Product ID (for PRODUCT type)."""
  assignedProductId: ID

  """Excluded variant IDs (for PRODUCT type)."""
  excludeAssignedProductVariants: [ID!]

  """Variant ID (for VARIANT type)."""
  assignedVariantId: ID

  """Pricing rule configuration."""
  pricingRule: ComponentPricingRuleInput

  """Display overrides."""
  overrides: ComponentItemOverridesInput
}

"""
Input for updating a component item.
"""
input ComponentItemUpdateInput {
  """The ID of the item to update."""
  id: ID!

  """Sort order within the group."""
  sortIndex: Int

  """Excluded variant IDs (for PRODUCT type)."""
  excludeAssignedProductVariants: [ID!]

  """Pricing rule configuration."""
  pricingRule: ComponentPricingRuleInput

  """Display overrides."""
  overrides: ComponentItemOverridesInput
}

"""
Input for deleting a component item.
"""
input ComponentItemDeleteInput {
  """The ID of the item to delete."""
  id: ID!
}

"""
Input for creating a pricing rule template.
"""
input PricingRuleTemplateCreateInput {
  """Template name."""
  name: String!

  """Price type."""
  priceType: ComponentPriceType!

  """Price value."""
  priceValue: Decimal
}

"""
Input for updating a pricing rule template.
"""
input PricingRuleTemplateUpdateInput {
  """The ID of the template to update."""
  id: ID!

  """Template name."""
  name: String

  """Price type."""
  priceType: ComponentPriceType

  """Price value."""
  priceValue: Decimal
}

"""
Input for deleting a pricing rule template.
"""
input PricingRuleTemplateDeleteInput {
  """The ID of the template to delete."""
  id: ID!
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
Input for bulk updating bundle with all components.
"""
input BundleUpdateInput {
  """Product ID."""
  productId: ID!

  """Bundle settings."""
  settings: BundleSettingsInput

  """Groups to create."""
  createGroups: [ComponentGroupCreateInput!]

  """Groups to update."""
  updateGroups: [ComponentGroupUpdateInput!]

  """Group IDs to delete."""
  deleteGroupIds: [ID!]

  """Items to create."""
  createItems: [ComponentItemCreateInput!]

  """Items to update."""
  updateItems: [ComponentItemUpdateInput!]

  """Item IDs to delete."""
  deleteItemIds: [ID!]

  """Tiered discounts (replaces all)."""
  tieredDiscounts: [TieredDiscountInput!]
}

# ============================================================================
# Payloads
# ============================================================================

"""
Payload for bundle update.
"""
type BundleUpdatePayload {
  """The updated bundle settings."""
  bundleSettings: BundleSettings

  """List of errors that occurred during the mutation."""
  userErrors: [GenericUserError!]!
}

"""
Payload for component group mutations.
"""
type ComponentGroupPayload {
  """The component group."""
  group: ComponentGroup

  """List of errors that occurred during the mutation."""
  userErrors: [GenericUserError!]!
}

"""
Payload for component item mutations.
"""
type ComponentItemPayload {
  """The component item."""
  item: ComponentItem

  """List of errors that occurred during the mutation."""
  userErrors: [GenericUserError!]!
}

"""
Payload for pricing rule template mutations.
"""
type PricingRuleTemplatePayload {
  """The pricing rule template."""
  template: PricingRuleTemplate

  """List of errors that occurred during the mutation."""
  userErrors: [GenericUserError!]!
}

# ============================================================================
# Queries (extend existing Query type)
# ============================================================================

extend type Query {
  """Get bundle settings for a product."""
  bundleSettings(productId: ID!): BundleSettings

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
  """Update bundle settings and components (bulk operation)."""
  bundleUpdate(input: BundleUpdateInput!): BundleUpdatePayload!

  """Create a component group."""
  componentGroupCreate(input: ComponentGroupCreateInput!): ComponentGroupPayload!

  """Update a component group."""
  componentGroupUpdate(input: ComponentGroupUpdateInput!): ComponentGroupPayload!

  """Delete a component group."""
  componentGroupDelete(input: ComponentGroupDeleteInput!): ComponentGroupPayload!

  """Create a component item."""
  componentItemCreate(input: ComponentItemCreateInput!): ComponentItemPayload!

  """Update a component item."""
  componentItemUpdate(input: ComponentItemUpdateInput!): ComponentItemPayload!

  """Delete a component item."""
  componentItemDelete(input: ComponentItemDeleteInput!): ComponentItemPayload!

  """Create a pricing rule template."""
  pricingRuleTemplateCreate(input: PricingRuleTemplateCreateInput!): PricingRuleTemplatePayload!

  """Update a pricing rule template."""
  pricingRuleTemplateUpdate(input: PricingRuleTemplateUpdateInput!): PricingRuleTemplatePayload!

  """Delete a pricing rule template."""
  pricingRuleTemplateDelete(input: PricingRuleTemplateDeleteInput!): PricingRuleTemplatePayload!
}

# ============================================================================
# Extend Product type
# ============================================================================

extend type Product {
  """Bundle settings if this product is a bundle."""
  bundleSettings: BundleSettings

  """Whether this product is a bundle."""
  isBundle: Boolean!
}
```

---

## Entity Relationships

```
Product (1) ──────────── (0..1) BundleSettings
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
                              └── (0..*) BundleTieredDiscount

PricingRuleTemplate (shared across project)
```

---

## Notes

1. **bundleSettings** - связь 1:1 с product. Если у продукта есть bundleSettings, он считается бандлом.

2. **componentGroup** - группа компонентов с правилами выбора (обязательный/множественный выбор).

3. **componentItem** - элемент группы, может быть либо PRODUCT (все варианты), либо VARIANT (конкретный вариант).

4. **Pricing** - может использовать шаблон (pricingTemplateId) или inline значения (priceType + priceValue).

5. **excludedVariants** - для PRODUCT типа можно исключить определенные варианты из выбора.

6. **Bulk mutation** - `bundleUpdate` позволяет обновить все настройки бандла за одну операцию.
