# Bundles Database Schema

Bundle — это продукт с `product.kind = 1` и отдельной 1:1 записью в таблице `bundle`.
На уровне API/кода числовой `product.kind` мапится в `ProductKind` (`0` → `BASE`, `1` → `BUNDLE`).
Все bundle-таблицы ссылаются на `bundle.id`, а не напрямую на `product.id`.

## ER Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              BUNDLES SCHEMA                                  │
└─────────────────────────────────────────────────────────────────────────────┘

                              catalog.product
                                     │
                                     │ 1:1 (kind = 1 / BUNDLE)
                                     ▼
┌──────────────────┐       ┌──────────────────┐       ┌────────────────────┐
│      bundle      │       │ pricing_template │       │  dependency_rule   │
├──────────────────┤       ├──────────────────┤       ├────────────────────┤
│ id (PK)          │──1:N──│ id (PK)          │       │ id (PK)            │
│ product_id (FK)  │       │ bundle_id (FK)   │       │ bundle_id (FK)     │
│ created_at       │       │ name             │       │ name               │
│ updated_at       │       │ price_type       │       │ enabled            │
└──────────────────┘       │ price_value      │       │ priority           │
         │                 └──────────────────┘       │ logic_operator     │
         │                                            └────────────────────┘
         │ 1:N
         ▼
┌──────────────────┐
│   bundle_group   │
├──────────────────┤
│ id (PK)          │
│ bundle_id (FK)   │
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
│ price_type       │
│ price_value      │
│ pricing_tmpl_id  │
│ visible          │
│ selected         │
│ excluded_variants│
└──────────────────┘

┌────────────────────────────┐       ┌────────────────────────────┐
│ bundle_group_translation   │       │ bundle_item_translation    │
├────────────────────────────┤       ├────────────────────────────┤
│ group_id (PK, FK)          │       │ item_id (PK, FK)           │
│ locale (PK)                │       │ locale (PK)                │
│ name                       │       │ name                       │
└────────────────────────────┘       └────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                           DEPENDENCY RULES                                    │
└──────────────────────────────────────────────────────────────────────────────┘

┌────────────────────┐       ┌────────────────────┐       ┌────────────────────┐
│  dependency_rule   │       │  condition_group   │       │    condition       │
├────────────────────┤       ├────────────────────┤       ├────────────────────┤
│ id (PK)            │──1:N──│ id (PK)            │──1:N──│ id (PK)            │
│ bundle_id (FK)     │       │ rule_id (FK)       │       │ group_id (FK)      │
│ name               │       │ logic_operator     │       │ category           │
│ enabled            │       │ sort_index         │       │ subject            │
│ priority           │       └────────────────────┘       │ operator           │
│ logic_operator     │                                    │ target_type        │
│ created_at         │                                    │ target_id          │
│ updated_at         │                                    │ value              │
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
                 │ price_type         │
                 │ price_value        │
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
  PRODUCT = "PRODUCT",   // Simple product without variants
  VARIANT = "VARIANT",   // Specific variant of a product
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
  jsonb,
  text,
  index,
  primaryKey,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { catalogSchema } from "./schema";
import { product } from "./products";

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

### Bundle Pricing Template

```typescript
// services/catalog/src/repositories/models/bundle.ts
import {
  uuid,
  varchar,
  timestamp,
  boolean,
  integer,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { catalogSchema } from "./schema";

export const bundlePricingTemplate = catalogSchema.table(
  "bundle_pricing_template",
  {
    id: uuid("id").primaryKey(),
    projectId: uuid("project_id").notNull(),
    bundleId: uuid("bundle_id")
      .notNull()
      .references(() => bundle.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    priceType: varchar("price_type", { length: 32 }).notNull(), // BundlePriceType
    priceValue: integer("price_value"), // cents, nullable for BASE/FREE
    sortIndex: integer("sort_index").notNull().default(0),
  },
  (table) => [
    index("idx_bundle_pricing_template_bundle_id").on(table.bundleId),
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
    bundleId: uuid("bundle_id")
      .notNull()
      .references(() => bundle.id, { onDelete: "cascade" }),
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
    index("idx_bundle_group_bundle_id").on(table.bundleId),
    index("idx_bundle_group_sort").on(table.bundleId, table.sortIndex),
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

    // For PRODUCT type: excluded variant IDs
    excludedVariantIds: jsonb("excluded_variant_ids").$type<string[]>(),

    // Quantity constraints
    minQty: integer("min_qty").default(1),
    maxQty: integer("max_qty"), // null = no limit
    defaultQty: integer("default_qty").default(1), // initial quantity when added to cart

    // Pricing (inline or template reference)
    priceType: varchar("price_type", { length: 32 }), // BundlePriceType
    priceValue: integer("price_value"), // cents
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
  ]
);
```

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
    bundleId: uuid("bundle_id")
      .notNull()
      .references(() => bundle.id, { onDelete: "cascade" }),
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
    index("idx_dependency_rule_bundle_id").on(table.bundleId),
    index("idx_dependency_rule_priority").on(table.bundleId, table.priority),
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
    priceType: varchar("price_type", { length: 32 }), // for ADJUST_PRICE
    priceValue: integer("price_value"), // for ADJUST_PRICE

    // Stacking behavior
    stackable: boolean("stackable").notNull().default(false),
    // true  = stacks with other actions on same target
    // false = replaces previous (higher priority wins)

    sortIndex: integer("sort_index").notNull().default(0),
  },
  (table) => [
    index("idx_dependency_action_rule_id").on(table.ruleId),
    index("idx_dependency_action_target").on(table.targetType, table.targetId),
  ]
);
```

---

## Type Exports

```typescript
export type Bundle = typeof bundle.$inferSelect;
export type NewBundle = typeof bundle.$inferInsert;
export type BundleGroup = typeof bundleGroup.$inferSelect;
export type NewBundleGroup = typeof bundleGroup.$inferInsert;
export type BundleGroupTranslation = typeof bundleGroupTranslation.$inferSelect;
export type NewBundleGroupTranslation = typeof bundleGroupTranslation.$inferInsert;
export type BundleItem = typeof bundleItem.$inferSelect;
export type NewBundleItem = typeof bundleItem.$inferInsert;
export type BundleItemTranslation = typeof bundleItemTranslation.$inferSelect;
export type NewBundleItemTranslation = typeof bundleItemTranslation.$inferInsert;
export type BundlePricingTemplate = typeof bundlePricingTemplate.$inferSelect;
export type NewBundlePricingTemplate = typeof bundlePricingTemplate.$inferInsert;
export type DependencyRule = typeof dependencyRule.$inferSelect;
export type NewDependencyRule = typeof dependencyRule.$inferInsert;
export type ConditionGroup = typeof conditionGroup.$inferSelect;
export type NewConditionGroup = typeof conditionGroup.$inferInsert;
export type Condition = typeof condition.$inferSelect;
export type NewCondition = typeof condition.$inferInsert;
export type DependencyAction = typeof dependencyAction.$inferSelect;
export type NewDependencyAction = typeof dependencyAction.$inferInsert;
```

---

## Key Design Decisions

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| **Product kind** | `product.kind = 0 \| 1 \| ...` in DB, mapped to API enum | DB stores compact numeric discriminator; API/code exposes `BASE` / `BUNDLE` |
| **Bundle root** | `bundle` table is 1:1 with `product` | Keeps bundle-specific aggregate root separate from base product fields |
| **Bundle type** | `bundle.type = "FIXED" \| "MULTIPACK" \| "MIX_AND_MATCH" \| "CUSTOM" \| null` in DB | Stores the bundle type as a readable string for admin labels and filters without numeric mapping |
| **Display style** | `bundle.display_style` | Storefront rendering mode: accordion, tabs, flat, or wizard |
| **Bundle table FKs** | Bundle tables use `bundle_id` | Bundle structure depends on bundle aggregate, not directly on product |
| **Product FK** | `bundle.product_id` → `product.id` | Only the root bundle row links to product |
| **Pricing** | Inline + Template | `price_type/value` for custom, `pricing_template_id` for reuse |
| **Group/item titles** | Stored as `name` in `bundle_group_translation` and `bundle_item_translation` | Same locale-aware pattern as `product_translation`; API can expose this value as `title` |
| **Excluded Variants** | JSONB array | Avoids join table for rarely-used feature |
| **Condition Groups** | Separate table | Supports nested AND/OR logic |
| **project_id** | On all tables | Data-level multi-tenancy |
| **Money values** | Integer (cents) | Avoids floating point precision issues |
| **ref_product_id** | Prefixed with `ref_` | Distinguishes item referenced product from bundle owner product |
| **Action stacking** | `stackable` boolean on action | Controls if effects accumulate (true) or replace (false, higher priority wins) |

---

## Indexes Summary

| Table | Index | Purpose |
|-------|-------|---------|
| `bundle` | `bundle_product_id_unique` | Enforce one bundle row per bundle product |
| `bundle_group` | `idx_bundle_group_bundle_id` | Load groups by bundle |
| `bundle_group` | `idx_bundle_group_sort` | Ordered retrieval |
| `bundle_group_translation` | `idx_..._project_locale` | Resolve group titles for current locale |
| `bundle_pricing_template` | `idx_..._bundle_id` | Load templates by bundle |
| `bundle_item` | `idx_bundle_item_group_id` | Load items by group |
| `bundle_item` | `idx_bundle_item_sort` | Ordered retrieval |
| `bundle_item_translation` | `idx_..._project_locale` | Resolve item title overrides for current locale |
| `dependency_rule` | `idx_dependency_rule_bundle_id` | Load rules by bundle |
| `dependency_rule` | `idx_dependency_rule_priority` | Priority-based evaluation |
| `condition` | `idx_condition_target` | Find conditions affecting target |
| `dependency_action` | `idx_dependency_action_target` | Find actions affecting target |

---

## Example Queries

### Load bundle groups with items
```typescript
const locale = context.locale ?? store.defaultLocale;

const [bundleRow] = await db
  .select()
  .from(bundle)
  .where(eq(bundle.productId, productId))
  .limit(1);

const groups = await db.query.bundleGroup.findMany({
  where: eq(bundleGroup.bundleId, bundleRow.id),
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

### Load dependency rules for bundle product
```typescript
const rules = await db.query.dependencyRule.findMany({
  where: and(
    eq(dependencyRule.bundleId, bundleRow.id),
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
