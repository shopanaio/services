# Bundles Database Schema

Bundle — это продукт с `product.kind = 1` и отдельной 1:1 записью в таблице `bundle`.
На уровне API/кода числовой `product.kind` мапится в `ProductKind` (`0` → `BASE`, `1` → `BUNDLE`).
Bundle root ссылается на `product.id`; configuration-scoped таблицы ссылаются на
`bundle_configuration.id`.
Структура бандла хранится в `bundle_configuration`: одна конфигурация содержит groups/items/pricing templates/dependency rules и может быть назначена одному или нескольким вариантам bundle product.

## ER Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              BUNDLES SCHEMA                                 │
└─────────────────────────────────────────────────────────────────────────────┘

                              catalog.product
                                     │
                                     │ 1:1 (kind = 1 / BUNDLE)
                                     ▼
┌──────────────────┐       ┌────────────────────────┐       ┌─────────────────────────────┐
│      bundle      │       │  bundle_configuration  │       │ bundle_configuration_variant │
├──────────────────┤       ├────────────────────────┤       ├─────────────────────────────┤
│ id (PK)          │──1:N──│ id (PK)                │──1:N──│ configuration_id (PK, FK)    │
│ product_id (FK)  │       │ bundle_id (FK)         │       │ variant_id (PK, FK)          │
│ type             │       │ name                   │       └─────────────────────────────┘
│ display_style    │       │ created_at             │                       │ N:1
│ created_at       │       │ updated_at             │                       ▼
│ updated_at       │       │                        │
└──────────────────┘       └────────────────────────┘              catalog.variant
         │                            │
         │                            │ 1:N
         ▼
┌──────────────────┐
│   bundle_group   │
├──────────────────┤
│ id (PK)          │
│ configuration_id │
│ sort_index       │
│ min_selection    │
│ max_selection    │
└──────────────────┘
         │
         │ 1:N
         ▼
┌──────────────────┐
│   bundle_item    │
├──────────────────┤
│ id (PK)          │
│ group_id (FK)    │
│ item_type        │
│ sort_index       │
│ ref_product_id   │
│ ref_variant_id   │
│ featured_img_id  │
│ min_qty          │
│ max_qty          │
│ default_qty      │
│ price_rule_id    │
│ pricing_tmpl_id  │
│ visible          │
│ selected         │
└──────────────────┘
         │
         │ 1:N
         ▼
┌──────────────────────────────┐
│ bundle_item_option_selection │
├──────────────────────────────┤
│ id (PK)                      │
│ item_id (FK)                 │
│ ref_option_id                │
│ parent_option_id             │
│ sort_index                   │
└──────────────────────────────┘
         │
         │ 1:N
         ▼
┌────────────────────────────────────┐
│ bundle_item_option_value_selection │
├────────────────────────────────────┤
│ id (PK)                            │
│ option_selection_id (FK)           │
│ ref_option_value_id                │
│ value                              │
│ status                             │
│ sort_index                         │
└────────────────────────────────────┘

┌────────────────────────────┐       ┌────────────────────────────┐
│ bundle_group_translation   │       │ bundle_item_translation    │
├────────────────────────────┤       ├────────────────────────────┤
│ group_id (PK, FK)          │       │ item_id (PK, FK)           │
│ locale (PK)                │       │ locale (PK)                │
│ name                       │       │ name                       │
└────────────────────────────┘       └────────────────────────────┘

┌────────────────────────────┐
│  bundle_pricing_template   │
├────────────────────────────┤
│ id (PK)                    │
│ configuration_id (FK)      │
│ name                       │
│ price_rule_id (FK)         │
│ sort_index                 │
└────────────────────────────┘

┌────────────────────────────┐       ┌────────────────────────────┐
│     bundle_price_rule      │       │ bundle_price_rule_amount   │
├────────────────────────────┤       ├────────────────────────────┤
│ id (PK)                    │──1:N──│ price_rule_id (PK, FK)     │
│ configuration_id (FK)      │       │ currency (PK)              │
│ price_type                 │       │ amount_minor               │
│                            │       │ project_id                 │
└────────────────────────────┘       └────────────────────────────┘
               │ 1:0..1
               ▼
┌────────────────────────────┐
│  bundle_price_rule_percent │
├────────────────────────────┤
│ price_rule_id (PK, FK)     │
│ percent_value              │
│ project_id                 │
└────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                           DEPENDENCY RULES                                   │
└──────────────────────────────────────────────────────────────────────────────┘

┌────────────────────┐       ┌────────────────────┐       ┌────────────────────┐
│  dependency_rule   │       │  condition_group   │       │    condition       │
├────────────────────┤       ├────────────────────┤       ├────────────────────┤
│ id (PK)            │──1:N──│ id (PK)            │──1:N──│ id (PK)            │
│ configuration_id   │       │ logic_operator     │       │ category           │
│ name               │       │ sort_index         │       │ subject            │
│ enabled            │       └────────────────────┘       │ operator           │
│ priority           │                                    │ target_type        │
│ logic_operator     │                                    │ target_id          │
│ created_at         │                                    │ value              │
│ updated_at         │                                    │ sort_index         │
└────────────────────┘                                    └────────────────────┘
        │
        │        ┌────────────────────┐
        └──1:N───│  dependency_action │
                 ├────────────────────┤
                 │ id (PK)            │
                 │ rule_id (FK)       │
                 │ action_type        │
                 │ target_type        │
                 │ target_id          │
                 │ required_value     │
                 │ price_rule_id      │
                 │ stackable          │
                 │ sort_index         │
                 └────────────────────┘
```

---

## Enums

### ProductKind API Mapping
```typescript
enum ProductKind {
  BASE = "BASE",     // DB value: 0
  BUNDLE = "BUNDLE", // DB value: 1
}

const PRODUCT_KIND_DB = {
  BASE: 0,
  BUNDLE: 1,
} as const;
```

### BundleItemType
```typescript
enum BundleItemType {
  PRODUCT = "PRODUCT",   // Component product; allowed variants are derived from option selections
  VARIANT = "VARIANT",   // Fixed component variant; no option selection is needed
}
```

### BundleItemOptionValueSelectionStatus
```typescript
enum BundleItemOptionValueSelectionStatus {
  SELECTED = "SELECTED",       // Option value is allowed inside this bundle item
  DESELECTED = "DESELECTED",   // Option value is intentionally disabled for this bundle item
  NEW = "NEW",                 // Option value appeared after bundle configuration and needs admin review
  UNAVAILABLE = "UNAVAILABLE", // Option value was configured before but no longer exists or is not sellable
}
```

### BundleType
```typescript
enum BundleType {
  FIXED = "FIXED",
  MULTIPACK = "MULTIPACK",
  MIX_AND_MATCH = "MIX_AND_MATCH",
  CUSTOM = "CUSTOM",
}
```

### BundlePriceType
```typescript
enum BundlePriceType {
  BASE = "BASE",                     // No changes, use base product price
  FIXED = "FIXED",                   // Override with fixed price
  DISCOUNT_PERCENT = "DISCOUNT_PERCENT", // Subtract percentage from base
  DISCOUNT_FIXED = "DISCOUNT_FIXED", // Subtract fixed amount from base
  FREE = "FREE",                     // 100% discount, free in bundle
}
```

### DisplayStyle
```typescript
type DisplayStyle = "accordion" | "tabs" | "flat" | "wizard";
```

### OutOfStockBehavior
```typescript
type OutOfStockBehavior = "hide" | "disable" | "backorder";
```

### LogicOperator
```typescript
enum LogicOperator {
  AND = "AND",
  OR = "OR",
}
```

### ConditionCategory
```typescript
enum ConditionCategory {
  STATE_CHECK = "STATE_CHECK",
  NUMERIC = "NUMERIC",
}
```

### ConditionSubject
```typescript
enum ConditionSubject {
  ITEM_SELECTED = "ITEM_SELECTED",
  ITEM_QTY = "ITEM_QTY",
  GROUP_TOTAL_QTY = "GROUP_TOTAL_QTY",
}
```

### Operators
```typescript
// For STATE_CHECK conditions
enum StateCheckOperator {
  IS_SELECTED = "IS_SELECTED",
  IS_NOT_SELECTED = "IS_NOT_SELECTED",
}

// For NUMERIC conditions
enum ComparisonOperator {
  GTE = "GTE",
  EQ = "EQ",
  LTE = "LTE",
}
```

### DependencyTargetType
```typescript
enum DependencyTargetType {
  ITEM = "ITEM",
  GROUP = "GROUP",
  BUNDLE = "BUNDLE",
}
```

### DependencyActionType
```typescript
enum DependencyActionType {
  SHOW = "SHOW",
  HIDE = "HIDE",
  SET_REQUIRED = "SET_REQUIRED",
  ADJUST_PRICE = "ADJUST_PRICE",
}
```

---

## Drizzle Schema

```typescript
// services/catalog/src/repositories/models/schema.ts
import { pgSchema } from "drizzle-orm/pg-core";
export const catalogSchema = pgSchema("catalog");
```

### Product Kind

```typescript
// services/catalog/src/repositories/models/products.ts
export const product = catalogSchema.table(
  "product",
  {
    // existing product columns...
    kind: integer("kind").notNull().default(0), // 0 = BASE, 1 = BUNDLE
  }
);
```

### Bundle

```typescript
// services/catalog/src/repositories/models/bundle.ts
import {
  uuid,
  varchar,
  timestamp,
  boolean,
  integer,
  text,
  index,
  primaryKey,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { catalogSchema } from "./schema";
import { product, variant } from "./products";

export const bundle = catalogSchema.table(
  "bundle",
  {
    id: uuid("id").primaryKey(),
    projectId: uuid("project_id").notNull(),
    productId: uuid("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 32 }), // BundleType string, null = custom/unspecified
    displayStyle: varchar("display_style", { length: 32 })
      .notNull()
      .default("accordion"), // DisplayStyle
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("bundle_product_id_unique").on(table.productId),
    index("idx_bundle_project_id").on(table.projectId),
  ]
);
```

### Bundle Configuration

```typescript
// services/catalog/src/repositories/models/bundle.ts

export const bundleConfiguration = catalogSchema.table(
  "bundle_configuration",
  {
    id: uuid("id").primaryKey(),
    projectId: uuid("project_id").notNull(),
    bundleId: uuid("bundle_id")
      .notNull()
      .references(() => bundle.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_bundle_configuration_bundle_id").on(table.bundleId),
  ]
);

export const bundleConfigurationVariant = catalogSchema.table(
  "bundle_configuration_variant",
  {
    projectId: uuid("project_id").notNull(),
    configurationId: uuid("configuration_id")
      .notNull()
      .references(() => bundleConfiguration.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => variant.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.configurationId, table.variantId] }),
    uniqueIndex("bundle_configuration_variant_unique").on(table.variantId),
    index("idx_bundle_configuration_variant_project_id").on(table.projectId),
  ]
);
```

`bundle_configuration` is the structure profile for a bundle. It owns groups, items,
pricing templates, and dependency rules. `bundle_configuration_variant` assigns a profile to
one or more variants of the root bundle product. Configuration resolution is explicit only:
a sellable bundle variant must have exactly one `bundle_configuration_variant` assignment.
Unassigned variants are treated as draft or misconfigured and are not sellable as bundles.

Do not add `variant_id` to `bundle_group`, `bundle_item`, `bundle_pricing_template`, or
`dependency_rule`. Variant-specific behavior is selected by resolving a configuration first,
then loading all configuration-scoped data through `configuration_id`.

### Bundle Price Rule

```typescript
// services/catalog/src/repositories/models/bundle.ts
import {
  uuid,
  varchar,
  integer,
  bigint,
  index,
  primaryKey,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { catalogSchema } from "./schema";
import { currencyEnum } from "./pricing";
import { productOption, productOptionValue } from "./options";

export const bundlePriceRule = catalogSchema.table(
  "bundle_price_rule",
  {
    id: uuid("id").primaryKey(),
    projectId: uuid("project_id").notNull(),
    configurationId: uuid("configuration_id")
      .notNull()
      .references(() => bundleConfiguration.id, { onDelete: "cascade" }),
    priceType: varchar("price_type", { length: 32 }).notNull(), // BundlePriceType
  },
  (table) => [
    index("idx_bundle_price_rule_configuration_id").on(table.configurationId),
  ]
);

export const bundlePriceRuleAmount = catalogSchema.table(
  "bundle_price_rule_amount",
  {
    projectId: uuid("project_id").notNull(),
    priceRuleId: uuid("price_rule_id")
      .notNull()
      .references(() => bundlePriceRule.id, { onDelete: "cascade" }),
    currency: currencyEnum("currency").notNull(),
    amountMinor: bigint("amount_minor", { mode: "number" }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.priceRuleId, table.currency] }),
    index("idx_bundle_price_rule_amount_project_currency").on(
      table.projectId,
      table.currency
    ),
    check(
      "bundle_price_rule_amount_minor_check",
      sql`${table.amountMinor} >= 0`
    ),
  ]
);

export const bundlePriceRulePercent = catalogSchema.table(
  "bundle_price_rule_percent",
  {
    projectId: uuid("project_id").notNull(),
    priceRuleId: uuid("price_rule_id")
      .primaryKey()
      .references(() => bundlePriceRule.id, { onDelete: "cascade" }),
    percentValue: integer("percent_value").notNull(),
  },
  (table) => [
    index("idx_bundle_price_rule_percent_project_id").on(table.projectId),
    check(
      "bundle_price_rule_percent_value_check",
      sql`${table.percentValue} >= 0 AND ${table.percentValue} <= 100`
    ),
  ]
);
```

`bundle_price_rule_amount` stores money amounts only for `FIXED` and `DISCOUNT_FIXED`.
`amount_minor` uses `bigint("amount_minor", { mode: "number" })` to match the existing
`item_pricing.amount_minor` product price model.
`bundle_price_rule_percent` stores percent values only for `DISCOUNT_PERCENT`.
`BASE` and `FREE` do not use value rows.

### Bundle Pricing Template

```typescript
// services/catalog/src/repositories/models/bundle.ts

export const bundlePricingTemplate = catalogSchema.table(
  "bundle_pricing_template",
  {
    id: uuid("id").primaryKey(),
    projectId: uuid("project_id").notNull(),
    configurationId: uuid("configuration_id")
      .notNull()
      .references(() => bundleConfiguration.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    priceRuleId: uuid("price_rule_id")
      .notNull()
      .references(() => bundlePriceRule.id, { onDelete: "restrict" }),
    sortIndex: integer("sort_index").notNull().default(0),
  },
  (table) => [
    index("idx_bundle_pricing_template_configuration_id").on(
      table.configurationId
    ),
    index("idx_bundle_pricing_template_price_rule_id").on(table.priceRuleId),
  ]
);
```

### Bundle Group

```typescript
export const bundleGroup = catalogSchema.table(
  "bundle_group",
  {
    id: uuid("id").primaryKey(),
    projectId: uuid("project_id").notNull(),
    configurationId: uuid("configuration_id")
      .notNull()
      .references(() => bundleConfiguration.id, { onDelete: "cascade" }),
    sortIndex: integer("sort_index").notNull().default(0),
    minSelection: integer("min_selection"), // null = no minimum
    maxSelection: integer("max_selection"), // null = no maximum
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_bundle_group_configuration_id").on(table.configurationId),
    index("idx_bundle_group_sort").on(table.configurationId, table.sortIndex),
    check(
      "bundle_group_selection_check",
      sql`(
        (${table.minSelection} IS NULL OR ${table.minSelection} >= 0)
        AND
        (${table.maxSelection} IS NULL OR ${table.maxSelection} >= 0)
        AND
        (${table.minSelection} IS NULL OR ${table.maxSelection} IS NULL OR ${table.maxSelection} >= ${table.minSelection})
      )`
    ),
  ]
);
```

### Bundle Group Translation

```typescript
export const bundleGroupTranslation = catalogSchema.table(
  "bundle_group_translation",
  {
    projectId: uuid("project_id").notNull(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => bundleGroup.id, { onDelete: "cascade" }),
    locale: varchar("locale", { length: 8 }).notNull(),
    name: text("name").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.groupId, table.locale] }),
    index("idx_bundle_group_translation_project_locale").on(
      table.projectId,
      table.locale
    ),
  ]
);
```

### Bundle Item

```typescript
export const bundleItem = catalogSchema.table(
  "bundle_item",
  {
    id: uuid("id").primaryKey(),
    projectId: uuid("project_id").notNull(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => bundleGroup.id, { onDelete: "cascade" }),

    // Item type
    itemType: varchar("item_type", { length: 32 }).notNull(), // PRODUCT | VARIANT
    sortIndex: integer("sort_index").notNull().default(0),

    // References to catalog entities (one of these based on itemType)
    refProductId: uuid("ref_product_id"),  // FK to catalog.product
    refVariantId: uuid("ref_variant_id"),  // FK to catalog.variant

    // Customization
    featuredImageId: uuid("featured_image_id"), // FK to media

    // Quantity constraints
    minQty: integer("min_qty").default(1),
    maxQty: integer("max_qty"), // null = no limit
    defaultQty: integer("default_qty").default(1), // initial quantity when added to cart

    // Pricing (custom rule or template reference)
    priceRuleId: uuid("price_rule_id")
      .references(() => bundlePriceRule.id, { onDelete: "set null" }),
    pricingTemplateId: uuid("pricing_template_id")
      .references(() => bundlePricingTemplate.id, { onDelete: "set null" }),

    // Visibility & defaults
    visible: boolean("visible").notNull().default(true),
    selected: boolean("selected").notNull().default(false),

    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_bundle_item_group_id").on(table.groupId),
    index("idx_bundle_item_ref_product_id").on(table.refProductId),
    index("idx_bundle_item_ref_variant_id").on(table.refVariantId),
    index("idx_bundle_item_sort").on(table.groupId, table.sortIndex),
    index("idx_bundle_item_price_rule_id").on(table.priceRuleId),
    check(
      "bundle_item_quantity_check",
      sql`(
        (${table.minQty} IS NULL OR ${table.minQty} >= 0)
        AND
        (${table.defaultQty} IS NULL OR ${table.minQty} IS NULL OR ${table.defaultQty} >= ${table.minQty})
        AND
        (${table.defaultQty} IS NULL OR ${table.maxQty} IS NULL OR ${table.defaultQty} <= ${table.maxQty})
        AND
        (${table.maxQty} IS NULL OR ${table.minQty} IS NULL OR ${table.maxQty} >= ${table.minQty})
      )`
    ),
    check(
      "bundle_item_reference_check",
      sql`(
        (${table.itemType} = 'PRODUCT' AND ${table.refProductId} IS NOT NULL AND ${table.refVariantId} IS NULL)
        OR
        (${table.itemType} = 'VARIANT' AND ${table.refVariantId} IS NOT NULL AND ${table.refProductId} IS NULL)
      )`
    ),
    check(
      "bundle_item_pricing_source_check",
      sql`NOT (${table.pricingTemplateId} IS NOT NULL AND ${table.priceRuleId} IS NOT NULL)`
    ),
  ]
);
```

`PRODUCT` items point to a component product. Their sellable variants are derived from
`bundle_item_option_selection` and `bundle_item_option_value_selection`.
`VARIANT` items point to a fixed component variant and do not need option selections.

The bundle schema does not store `excluded_variant_ids`. Variant availability is expressed
through option value statuses, and the runtime resolves the matching catalog variants from the
selected option values.

### Bundle Item Option Selection

```typescript
export const bundleItemOptionSelection = catalogSchema.table(
  "bundle_item_option_selection",
  {
    id: uuid("id").primaryKey(),
    projectId: uuid("project_id").notNull(),
    itemId: uuid("item_id")
      .notNull()
      .references(() => bundleItem.id, { onDelete: "cascade" }),

    // Component product option, for example Color, Size, Material.
    refOptionId: uuid("ref_option_id")
      .notNull()
      .references(() => productOption.id, { onDelete: "cascade" }),

    // Optional parent bundle product option used when component options drive
    // parent bundle variant generation.
    parentOptionId: uuid("parent_option_id")
      .references(() => productOption.id, { onDelete: "set null" }),

    sortIndex: integer("sort_index").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_bundle_item_option_selection_item_id").on(table.itemId),
    index("idx_bundle_item_option_selection_ref_option_id").on(
      table.refOptionId
    ),
    index("idx_bundle_item_option_selection_parent_option_id").on(
      table.parentOptionId
    ),
    uniqueIndex("bundle_item_option_selection_item_option_unique").on(
      table.itemId,
      table.refOptionId
    ),
  ]
);
```

`ref_option_id` is the option on the referenced component product.
`parent_option_id` is nullable because many bundles do not expose component options as parent
bundle options. For example, a fixed bundle can still restrict a component product to allowed
colors without creating a parent `Color` option on the bundle product.

### Bundle Item Option Value Selection

```typescript
export const bundleItemOptionValueSelection = catalogSchema.table(
  "bundle_item_option_value_selection",
  {
    id: uuid("id").primaryKey(),
    projectId: uuid("project_id").notNull(),
    optionSelectionId: uuid("option_selection_id")
      .notNull()
      .references(() => bundleItemOptionSelection.id, { onDelete: "cascade" }),

    // Prefer refOptionValueId when product option values are normalized.
    // Keep value as a snapshot/fallback for deleted or not-yet-normalized values.
    refOptionValueId: uuid("ref_option_value_id")
      .references(() => productOptionValue.id, { onDelete: "set null" }),
    value: text("value").notNull(),

    status: varchar("status", { length: 32 }).notNull().default("SELECTED"),
    sortIndex: integer("sort_index").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_bundle_item_option_value_selection_option_id").on(
      table.optionSelectionId
    ),
    index("idx_bundle_item_option_value_selection_ref_value_id").on(
      table.refOptionValueId
    ),
    index("idx_bundle_item_option_value_selection_status").on(
      table.optionSelectionId,
      table.status
    ),
    uniqueIndex("bundle_item_option_value_selection_value_unique").on(
      table.optionSelectionId,
      table.value
    ),
  ]
);
```

Option value statuses replace `excluded_variant_ids`:

- `SELECTED` means the value is allowed for this bundle item.
- `DESELECTED` means the value is intentionally disabled for this bundle item.
- `NEW` means the value was added to the component product after bundle setup and needs admin review.
- `UNAVAILABLE` means the value was configured before but is no longer present or sellable.

For `PRODUCT` items, the storefront exposes only `SELECTED` option values by default. Checkout
resolves the final component variant from the selected option values and stores the concrete
variant in cart/order component lines.

### Bundle Item Translation

```typescript
export const bundleItemTranslation = catalogSchema.table(
  "bundle_item_translation",
  {
    projectId: uuid("project_id").notNull(),
    itemId: uuid("item_id")
      .notNull()
      .references(() => bundleItem.id, { onDelete: "cascade" }),
    locale: varchar("locale", { length: 8 }).notNull(),
    name: text("name").notNull(), // item title override in this locale
  },
  (table) => [
    primaryKey({ columns: [table.itemId, table.locale] }),
    index("idx_bundle_item_translation_project_locale").on(
      table.projectId,
      table.locale
    ),
  ]
);
```

### Dependency Rule

```typescript
export const dependencyRule = catalogSchema.table(
  "dependency_rule",
  {
    id: uuid("id").primaryKey(),
    projectId: uuid("project_id").notNull(),
    configurationId: uuid("configuration_id")
      .notNull()
      .references(() => bundleConfiguration.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    enabled: boolean("enabled").notNull().default(true),
    priority: integer("priority").notNull().default(0),
    logicOperator: varchar("logic_operator", { length: 8 }).notNull().default("AND"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_dependency_rule_configuration_id").on(table.configurationId),
    index("idx_dependency_rule_priority").on(
      table.configurationId,
      table.priority
    ),
  ]
);
```

### Condition Group

```typescript
export const conditionGroup = catalogSchema.table(
  "condition_group",
  {
    id: uuid("id").primaryKey(),
    projectId: uuid("project_id").notNull(),
    ruleId: uuid("rule_id")
      .notNull()
      .references(() => dependencyRule.id, { onDelete: "cascade" }),
    logicOperator: varchar("logic_operator", { length: 8 }).notNull().default("AND"),
    sortIndex: integer("sort_index").notNull().default(0),
  },
  (table) => [
    index("idx_condition_group_rule_id").on(table.ruleId),
  ]
);
```

### Condition

```typescript
export const condition = catalogSchema.table(
  "condition",
  {
    id: uuid("id").primaryKey(),
    projectId: uuid("project_id").notNull(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => conditionGroup.id, { onDelete: "cascade" }),

    // Discriminator
    category: varchar("category", { length: 32 }).notNull(), // STATE_CHECK | NUMERIC

    // What we're checking
    subject: varchar("subject", { length: 32 }).notNull(), // ITEM_SELECTED | ITEM_QTY | GROUP_TOTAL_QTY

    // Operator (depends on category)
    operator: varchar("operator", { length: 32 }).notNull(),
    // STATE_CHECK: IS_SELECTED | IS_NOT_SELECTED
    // NUMERIC: GTE | EQ | LTE

    // Target
    targetType: varchar("target_type", { length: 32 }).notNull(), // ITEM | GROUP | BUNDLE
    targetId: uuid("target_id").notNull(), // FK to bundle_item or bundle_group

    // Value (for NUMERIC conditions)
    value: integer("value"),

    sortIndex: integer("sort_index").notNull().default(0),
  },
  (table) => [
    index("idx_condition_group_id").on(table.groupId),
    index("idx_condition_target").on(table.targetType, table.targetId),
  ]
);
```

### Dependency Action

```typescript
export const dependencyAction = catalogSchema.table(
  "dependency_action",
  {
    id: uuid("id").primaryKey(),
    projectId: uuid("project_id").notNull(),
    ruleId: uuid("rule_id")
      .notNull()
      .references(() => dependencyRule.id, { onDelete: "cascade" }),

    // Action type
    actionType: varchar("action_type", { length: 32 }).notNull(),
    // SHOW | HIDE | SET_REQUIRED | ADJUST_PRICE

    // Target
    targetType: varchar("target_type", { length: 32 }).notNull(), // ITEM | GROUP | BUNDLE
    targetId: uuid("target_id"), // FK, nullable for BUNDLE target

    // Action-specific fields
    requiredValue: boolean("required_value"), // for SET_REQUIRED
    priceRuleId: uuid("price_rule_id")
      .references(() => bundlePriceRule.id, { onDelete: "restrict" }), // for ADJUST_PRICE

    // Stacking behavior
    stackable: boolean("stackable").notNull().default(false),
    // true  = stacks with other actions on same target
    // false = replaces previous (higher priority wins)

    sortIndex: integer("sort_index").notNull().default(0),
  },
  (table) => [
    index("idx_dependency_action_rule_id").on(table.ruleId),
    index("idx_dependency_action_target").on(table.targetType, table.targetId),
    index("idx_dependency_action_price_rule_id").on(table.priceRuleId),
    check(
      "dependency_action_price_rule_check",
      sql`(
        (${table.actionType} = 'ADJUST_PRICE' AND ${table.priceRuleId} IS NOT NULL)
        OR
        (${table.actionType} <> 'ADJUST_PRICE' AND ${table.priceRuleId} IS NULL)
      )`
    ),
  ]
);
```

---

## Type Exports

```typescript
export type Bundle = typeof bundle.$inferSelect;
export type BundleConfiguration = typeof bundleConfiguration.$inferSelect;
export type NewBundleConfiguration = typeof bundleConfiguration.$inferInsert;
export type BundleConfigurationVariant =
  typeof bundleConfigurationVariant.$inferSelect;
export type NewBundleConfigurationVariant =
  typeof bundleConfigurationVariant.$inferInsert;
export type BundleGroup = typeof bundleGroup.$inferSelect;
export type NewBundleGroup = typeof bundleGroup.$inferInsert;
export type BundleGroupTranslation = typeof bundleGroupTranslation.$inferSelect;
export type NewBundleGroupTranslation = typeof bundleGroupTranslation.$inferInsert;
export type BundleItem = typeof bundleItem.$inferSelect;
export type NewBundleItem = typeof bundleItem.$inferInsert;
export type BundleItemTranslation = typeof bundleItemTranslation.$inferSelect;
export type BundleItemOptionSelection =
  typeof bundleItemOptionSelection.$inferSelect;
export type BundleItemOptionValueSelection =
  typeof bundleItemOptionValueSelection.$inferSelect;
export type BundlePriceRule = typeof bundlePriceRule.$inferSelect;
export type BundlePriceRuleAmount = typeof bundlePriceRuleAmount.$inferSelect;
export type BundlePriceRulePercent = typeof bundlePriceRulePercent.$inferSelect;
export type BundlePricingTemplate = typeof bundlePricingTemplate.$inferSelect;
export type DependencyRule = typeof dependencyRule.$inferSelect;
export type NewDependencyRule = typeof dependencyRule.$inferInsert;
export type ConditionGroup = typeof conditionGroup.$inferSelect;
export type Condition = typeof condition.$inferSelect;
export type DependencyAction = typeof dependencyAction.$inferSelect;
```

---

## Key Design Decisions

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| **Product kind** | `product.kind = 0 \| 1 \| ...` in DB, mapped to API enum | DB stores compact numeric discriminator; API/code exposes `BASE` / `BUNDLE` |
| **Bundle root** | `bundle` table is 1:1 with `product` | Keeps bundle-specific aggregate root separate from base product fields |
| **Bundle type** | `bundle.type = "FIXED" \| "MULTIPACK" \| "MIX_AND_MATCH" \| "CUSTOM" \| null` in DB | Stores the bundle type as a readable string for admin labels and filters without numeric mapping |
| **Display style** | `bundle.display_style` | Storefront rendering mode: accordion, tabs, flat, or wizard |
| **Configuration root** | `bundle_configuration` owns groups, items, pricing templates, and dependency rules | Allows different structure and rules per bundle variant without duplicating the root bundle |
| **Variant mapping** | `bundle_configuration_variant` maps root bundle variants to configurations | One configuration can be reused by many variants; each variant can have only one active configuration |
| **Configuration-scoped FKs** | Configuration-scoped tables store only `configuration_id` | Avoids duplicating `bundle_id`; bundle ownership is resolved through `bundle_configuration` |
| **Product FK** | `bundle.product_id` → `product.id` | Only the root bundle row links to product |
| **Pricing** | Normalized price rule | `bundle_price_rule` stores only the rule type; `bundle_price_rule_amount` and `bundle_price_rule_percent` store type-specific values |
| **Pricing ownership** | Regular FKs to `bundle_price_rule` | Avoids polymorphic `owner_type + owner_id` and avoids nullable owner-specific FK columns on amount rows |
| **Group/item titles** | Stored as `name` in `bundle_group_translation` and `bundle_item_translation` | Same locale-aware pattern as `product_translation`; API can expose this value as `title` |
| **Variant availability** | Option value selections under `bundle_item` | Replaces `excluded_variant_ids`; admins configure allowed Color/Size/etc values and runtime resolves matching variants |
| **Option value lifecycle** | `SELECTED` / `DESELECTED` / `NEW` / `UNAVAILABLE` statuses | Distinguishes manually disabled values from new catalog values and values that disappeared after bundle setup |
| **Condition Groups** | Separate table | Supports nested AND/OR logic |
| **project_id** | On all tables | Data-level multi-tenancy |
| **Money values** | `amount_minor` bigint by currency | Avoids floating point precision issues and supports fixed/discount amounts in multiple currencies |
| **ref_product_id** | Prefixed with `ref_` | Distinguishes item referenced product from bundle owner product |
| **Action stacking** | `stackable` boolean on action | Controls if effects accumulate (true) or replace (false, higher priority wins) |

---

## Indexes Summary

| Table | Index | Purpose |
|-------|-------|---------|
| `bundle` | `bundle_product_id_unique` | Enforce one bundle row per bundle product |
| `bundle_configuration` | `idx_bundle_configuration_bundle_id` | Load configurations by bundle |
| `bundle_configuration_variant` | `bundle_configuration_variant_unique` | Enforce a single active configuration per bundle variant |
| `bundle_group` | `idx_bundle_group_configuration_id` | Load groups by resolved configuration |
| `bundle_group` | `idx_bundle_group_sort` | Ordered retrieval |
| `bundle_group_translation` | `idx_..._project_locale` | Resolve group titles for current locale |
| `bundle_price_rule` | `idx_..._configuration_id` | Load price rules by resolved configuration |
| `bundle_price_rule_amount` | `idx_..._project_currency` | Resolve rule amounts for project currency |
| `bundle_price_rule_percent` | `idx_..._project_id` | Resolve percent values by project |
| `bundle_pricing_template` | `idx_..._configuration_id` | Load templates by resolved configuration |
| `bundle_pricing_template` | `idx_..._price_rule_id` | Follow template to reusable price rule |
| `bundle_item` | `idx_bundle_item_group_id` | Load items by group |
| `bundle_item` | `idx_bundle_item_sort` | Ordered retrieval |
| `bundle_item` | `idx_bundle_item_price_rule_id` | Resolve custom item price rule |
| `bundle_item_option_selection` | `idx_..._item_id` | Load option restrictions for an item |
| `bundle_item_option_selection` | `idx_..._ref_option_id` | Find bundle items using a component product option |
| `bundle_item_option_value_selection` | `idx_..._option_id` | Load allowed/disabled values for an option selection |
| `bundle_item_option_value_selection` | `idx_..._status` | Resolve selected values and admin review states |
| `bundle_item_translation` | `idx_..._project_locale` | Resolve item title overrides for current locale |
| `dependency_rule` | `idx_dependency_rule_configuration_id` | Load rules by resolved configuration |
| `dependency_rule` | `idx_dependency_rule_priority` | Priority-based evaluation |
| `condition` | `idx_condition_target` | Find conditions affecting target |
| `dependency_action` | `idx_dependency_action_target` | Find actions affecting target |
| `dependency_action` | `idx_dependency_action_price_rule_id` | Resolve action price adjustment rule |

---

## Example Queries

### Resolve bundle configuration for variant
```typescript
const [bundleRow] = await db
  .select()
  .from(bundle)
  .where(
    and(
      eq(bundle.projectId, context.projectId),
      eq(bundle.productId, productId)
    )
  )
  .limit(1);

const [variantConfiguration] = await db
  .select({ configuration: bundleConfiguration })
  .from(bundleConfigurationVariant)
  .innerJoin(
    bundleConfiguration,
    eq(bundleConfiguration.id, bundleConfigurationVariant.configurationId)
  )
  .where(
    and(
      eq(bundleConfigurationVariant.projectId, context.projectId),
      eq(bundleConfiguration.bundleId, bundleRow.id),
      eq(bundleConfigurationVariant.variantId, selectedBundleVariantId)
    )
  )
  .limit(1);

const configurationRow = variantConfiguration?.configuration;
```

`selectedBundleVariantId` must be a variant of `bundle.product_id`.
Publish/sellable validation must ensure every sellable bundle variant has exactly one explicit
configuration assignment. If resolution returns no configuration, treat the variant as
misconfigured and do not expose it as sellable.

### Load bundle groups with items
```typescript
const locale = context.locale ?? store.defaultLocale;

const groups = await db.query.bundleGroup.findMany({
  where: eq(bundleGroup.configurationId, configurationRow.id),
  orderBy: [asc(bundleGroup.sortIndex)],
  with: {
    items: {
      orderBy: [asc(bundleItem.sortIndex)],
    },
  },
});

const groupIds = groups.map((group) => group.id);
const itemIds = groups.flatMap((group) => group.items.map((item) => item.id));

const groupTranslations = await db
  .select()
  .from(bundleGroupTranslation)
  .where(
    and(
      inArray(bundleGroupTranslation.groupId, groupIds),
      eq(bundleGroupTranslation.locale, locale)
    )
  );

const itemTranslations = await db
  .select()
  .from(bundleItemTranslation)
  .where(
    and(
      inArray(bundleItemTranslation.itemId, itemIds),
      eq(bundleItemTranslation.locale, locale)
    )
  );
```

### Load selected option values for bundle items
```typescript
const optionSelections = await db
  .select()
  .from(bundleItemOptionSelection)
  .where(inArray(bundleItemOptionSelection.itemId, itemIds))
  .orderBy(asc(bundleItemOptionSelection.sortIndex));

const optionSelectionIds = optionSelections.map((selection) => selection.id);

const optionValues = await db
  .select()
  .from(bundleItemOptionValueSelection)
  .where(
    and(
      inArray(
        bundleItemOptionValueSelection.optionSelectionId,
        optionSelectionIds
      ),
      eq(bundleItemOptionValueSelection.status, "SELECTED")
    )
  )
  .orderBy(asc(bundleItemOptionValueSelection.sortIndex));
```

For a `PRODUCT` bundle item, selected option values define the allowed component variants.
For example, `Color in [Red, Black]` and `Size in [S, M]` resolves to all catalog variants
whose option values match that intersection. `DESELECTED`, `NEW`, and `UNAVAILABLE` values are
kept for admin review and synchronization, but they are not exposed as sellable values by default.

### Load dependency rules for bundle configuration
```typescript
const rules = await db.query.dependencyRule.findMany({
  where: and(
    eq(dependencyRule.configurationId, configurationRow.id),
    eq(dependencyRule.enabled, true)
  ),
  orderBy: [desc(dependencyRule.priority)],
  with: {
    conditionGroups: {
      with: { conditions: true },
    },
    actions: true,
  },
});
```

### Find items affected by a rule action
```typescript
const affectedItems = await db
  .select()
  .from(bundleItem)
  .innerJoin(
    dependencyAction,
    and(
      eq(dependencyAction.targetType, "ITEM"),
      eq(dependencyAction.targetId, bundleItem.id)
    )
  )
  .where(eq(dependencyAction.ruleId, ruleId));
```
