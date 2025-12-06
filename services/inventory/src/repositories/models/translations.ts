import {
  uuid,
  varchar,
  text,
  jsonb,
  primaryKey,
  index,
} from "drizzle-orm/pg-core";
import { inventorySchema } from "./schema";
import { product, variant } from "./products";
import { productOption, productOptionValue } from "./options";
import { productFeature, productFeatureValue } from "./features";
import { warehouses } from "./stock";

// ─────────────────────────────────────────────────────────────────────────────
// Product Translations
// ─────────────────────────────────────────────────────────────────────────────
// Main product content: title, description, SEO fields
// Each product can have translations in multiple locales (uk, en, ru, etc.)

export const productTranslation = inventorySchema.table(
  "product_translation",
  {
    projectId: uuid("project_id").notNull(),
    productId: uuid("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    locale: varchar("locale", { length: 8 }).notNull(),

    // Content fields
    title: text("title").notNull(),

    // Description in multiple formats
    descriptionText: text("description_text"), // Plain text (for search, Typesense)
    descriptionHtml: text("description_html"), // Rendered HTML (for storefront)
    descriptionJson: jsonb("description_json"), // EditorJS blocks state

    // Short summary
    excerpt: text("excerpt"),

    // SEO fields
    seoTitle: varchar("seo_title", { length: 255 }),
    seoDescription: text("seo_description"),
  },
  (table) => [
    primaryKey({ columns: [table.productId, table.locale] }),
    index("idx_product_translation_project").on(table.projectId),
    index("idx_product_translation_project_locale").on(
      table.projectId,
      table.locale
    ),
  ]
);

// ─────────────────────────────────────────────────────────────────────────────
// Variant Translations
// ─────────────────────────────────────────────────────────────────────────────
// Optional: only if variants have distinct names beyond option combinations
// Example: "iPhone 15 Pro 256GB Space Black" vs auto-generated from options

export const variantTranslation = inventorySchema.table(
  "variant_translation",
  {
    projectId: uuid("project_id").notNull(),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => variant.id, { onDelete: "cascade" }),
    locale: varchar("locale", { length: 8 }).notNull(),

    title: text("title"),
  },
  (table) => [
    primaryKey({ columns: [table.variantId, table.locale] }),
    index("idx_variant_translation_project").on(table.projectId),
  ]
);

// ─────────────────────────────────────────────────────────────────────────────
// Option Translations
// ─────────────────────────────────────────────────────────────────────────────
// Translates option names: "Color" → "Колір" / "Цвет"
// slug remains invariant (used for filtering), name is displayed

export const productOptionTranslation = inventorySchema.table(
  "product_option_translation",
  {
    projectId: uuid("project_id").notNull(),
    optionId: uuid("option_id")
      .notNull()
      .references(() => productOption.id, { onDelete: "cascade" }),
    locale: varchar("locale", { length: 8 }).notNull(),

    name: text("name").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.optionId, table.locale] }),
    index("idx_product_option_translation_project").on(table.projectId),
  ]
);

// ─────────────────────────────────────────────────────────────────────────────
// Option Value Translations
// ─────────────────────────────────────────────────────────────────────────────
// Translates option values: "Red" → "Червоний" / "Красный"
// slug remains invariant for filtering (e.g., "red")

export const productOptionValueTranslation = inventorySchema.table(
  "product_option_value_translation",
  {
    projectId: uuid("project_id").notNull(),
    optionValueId: uuid("option_value_id")
      .notNull()
      .references(() => productOptionValue.id, { onDelete: "cascade" }),
    locale: varchar("locale", { length: 8 }).notNull(),

    name: text("name").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.optionValueId, table.locale] }),
    index("idx_product_option_value_translation_project").on(table.projectId),
  ]
);

// ─────────────────────────────────────────────────────────────────────────────
// Feature Translations
// ─────────────────────────────────────────────────────────────────────────────
// Translates feature names: "Brand" → "Бренд", "Material" → "Матеріал"

export const productFeatureTranslation = inventorySchema.table(
  "product_feature_translation",
  {
    projectId: uuid("project_id").notNull(),
    featureId: uuid("feature_id")
      .notNull()
      .references(() => productFeature.id, { onDelete: "cascade" }),
    locale: varchar("locale", { length: 8 }).notNull(),

    name: text("name").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.featureId, table.locale] }),
    index("idx_product_feature_translation_project").on(table.projectId),
  ]
);

// ─────────────────────────────────────────────────────────────────────────────
// Feature Value Translations
// ─────────────────────────────────────────────────────────────────────────────
// Translates feature values: "Leather" → "Шкіра" / "Кожа"

export const productFeatureValueTranslation = inventorySchema.table(
  "product_feature_value_translation",
  {
    projectId: uuid("project_id").notNull(),
    featureValueId: uuid("feature_value_id")
      .notNull()
      .references(() => productFeatureValue.id, { onDelete: "cascade" }),
    locale: varchar("locale", { length: 8 }).notNull(),

    name: text("name").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.featureValueId, table.locale] }),
    index("idx_product_feature_value_translation_project").on(table.projectId),
  ]
);

// ─────────────────────────────────────────────────────────────────────────────
// Warehouse Translations
// ─────────────────────────────────────────────────────────────────────────────
// Translates warehouse display names

export const warehouseTranslation = inventorySchema.table(
  "warehouse_translation",
  {
    projectId: uuid("project_id").notNull(),
    warehouseId: uuid("warehouse_id")
      .notNull()
      .references(() => warehouses.id, { onDelete: "cascade" }),
    locale: varchar("locale", { length: 8 }).notNull(),

    name: text("name").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.warehouseId, table.locale] }),
    index("idx_warehouse_translation_project").on(table.projectId),
  ]
);

// ─────────────────────────────────────────────────────────────────────────────
// Type exports
// ─────────────────────────────────────────────────────────────────────────────

export type ProductTranslation = typeof productTranslation.$inferSelect;
export type NewProductTranslation = typeof productTranslation.$inferInsert;

export type VariantTranslation = typeof variantTranslation.$inferSelect;
export type NewVariantTranslation = typeof variantTranslation.$inferInsert;

export type ProductOptionTranslation =
  typeof productOptionTranslation.$inferSelect;
export type NewProductOptionTranslation =
  typeof productOptionTranslation.$inferInsert;

export type ProductOptionValueTranslation =
  typeof productOptionValueTranslation.$inferSelect;
export type NewProductOptionValueTranslation =
  typeof productOptionValueTranslation.$inferInsert;

export type ProductFeatureTranslation =
  typeof productFeatureTranslation.$inferSelect;
export type NewProductFeatureTranslation =
  typeof productFeatureTranslation.$inferInsert;

export type ProductFeatureValueTranslation =
  typeof productFeatureValueTranslation.$inferSelect;
export type NewProductFeatureValueTranslation =
  typeof productFeatureValueTranslation.$inferInsert;

export type WarehouseTranslation = typeof warehouseTranslation.$inferSelect;
export type NewWarehouseTranslation = typeof warehouseTranslation.$inferInsert;
