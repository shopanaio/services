import { uuid, text, jsonb, primaryKey, index } from "drizzle-orm/pg-core";
import { catalogSchema, localeCodeEnum } from "./schema";
import { product, variant } from "./products";
import { productOption, productOptionValue } from "./options";
import { productFeature, productFeatureValue } from "./features";

// ─────────────────────────────────────────────────────────────────────────────
// Product Translations
// ─────────────────────────────────────────────────────────────────────────────
// Main product content: name, description, SEO fields
// Each product can have translations in multiple locales (uk, en, ru, etc.)

export const productTranslation = catalogSchema.table(
  "product_translation",
  {
    storeId: uuid("store_id").notNull(),
    productId: uuid("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    locale: localeCodeEnum("locale").notNull(),

    // Content fields
    name: text("name").notNull(),

    // Description in multiple formats
    descriptionText: text("description_text"), // Plain text (for search, Typesense)
    descriptionHtml: text("description_html"), // Rendered HTML (for storefront)
    descriptionJson: jsonb("description_json"), // EditorJS blocks state

    // Short summary in multiple formats
    excerptText: text("excerpt_text"),
    excerptHtml: text("excerpt_html"),
    excerptJson: jsonb("excerpt_json"),
  },
  (table) => [
    primaryKey({ columns: [table.productId, table.locale] }),
    index("idx_product_translation_store").on(table.storeId),
    index("idx_product_translation_store_locale").on(table.storeId, table.locale),
    index("idx_product_translation_listing_name").on(
      table.storeId,
      table.locale,
      table.name,
      table.productId,
    ),
  ],
);

// ─────────────────────────────────────────────────────────────────────────────
// Variant Translations
// ─────────────────────────────────────────────────────────────────────────────
// Optional: only if variants have distinct names beyond option combinations
// Example: "iPhone 15 Pro 256GB Space Black" vs auto-generated from options

export const variantTranslation = catalogSchema.table(
  "variant_translation",
  {
    storeId: uuid("store_id").notNull(),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => variant.id, { onDelete: "cascade" }),
    locale: localeCodeEnum("locale").notNull(),

    title: text("title"),
  },
  (table) => [
    primaryKey({ columns: [table.variantId, table.locale] }),
    index("idx_variant_translation_store").on(table.storeId),
  ],
);

// ─────────────────────────────────────────────────────────────────────────────
// Option Translations
// ─────────────────────────────────────────────────────────────────────────────
// Translates option names: "Color" → "Колір" / "Цвет"
// slug remains invariant (used for filtering), name is displayed

export const productOptionTranslation = catalogSchema.table(
  "product_option_translation",
  {
    storeId: uuid("store_id").notNull(),
    optionId: uuid("option_id")
      .notNull()
      .references(() => productOption.id, { onDelete: "cascade" }),
    locale: localeCodeEnum("locale").notNull(),

    name: text("name").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.optionId, table.locale] }),
    index("idx_product_option_translation_store").on(table.storeId),
  ],
);

// ─────────────────────────────────────────────────────────────────────────────
// Option Value Translations
// ─────────────────────────────────────────────────────────────────────────────
// Translates option values: "Red" → "Червоний" / "Красный"
// slug remains invariant for filtering (e.g., "red")

export const productOptionValueTranslation = catalogSchema.table(
  "product_option_value_translation",
  {
    storeId: uuid("store_id").notNull(),
    optionValueId: uuid("option_value_id")
      .notNull()
      .references(() => productOptionValue.id, { onDelete: "cascade" }),
    locale: localeCodeEnum("locale").notNull(),

    name: text("name").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.optionValueId, table.locale] }),
    index("idx_product_option_value_translation_store").on(table.storeId),
  ],
);

// ─────────────────────────────────────────────────────────────────────────────
// Feature Translations
// ─────────────────────────────────────────────────────────────────────────────
// Translates feature names: "Brand" → "Бренд", "Material" → "Матеріал"

export const productFeatureTranslation = catalogSchema.table(
  "product_feature_translation",
  {
    storeId: uuid("store_id").notNull(),
    featureId: uuid("feature_id")
      .notNull()
      .references(() => productFeature.id, { onDelete: "cascade" }),
    locale: localeCodeEnum("locale").notNull(),

    name: text("name").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.featureId, table.locale] }),
    index("idx_product_feature_translation_store").on(table.storeId),
  ],
);

// ─────────────────────────────────────────────────────────────────────────────
// Feature Value Translations
// ─────────────────────────────────────────────────────────────────────────────
// Translates feature values: "Leather" → "Шкіра" / "Кожа"

export const productFeatureValueTranslation = catalogSchema.table(
  "product_feature_value_translation",
  {
    storeId: uuid("store_id").notNull(),
    featureValueId: uuid("feature_value_id")
      .notNull()
      .references(() => productFeatureValue.id, { onDelete: "cascade" }),
    locale: localeCodeEnum("locale").notNull(),

    name: text("name").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.featureValueId, table.locale] }),
    index("idx_product_feature_value_translation_store").on(table.storeId),
  ],
);

// ─────────────────────────────────────────────────────────────────────────────
// Warehouse Translations REMOVED (moved to Inventory Service)
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// Type exports
// ─────────────────────────────────────────────────────────────────────────────

export type ProductTranslation = typeof productTranslation.$inferSelect;
export type NewProductTranslation = typeof productTranslation.$inferInsert;

export type VariantTranslation = typeof variantTranslation.$inferSelect;
export type NewVariantTranslation = typeof variantTranslation.$inferInsert;

export type ProductOptionTranslation = typeof productOptionTranslation.$inferSelect;
export type NewProductOptionTranslation = typeof productOptionTranslation.$inferInsert;

export type ProductOptionValueTranslation = typeof productOptionValueTranslation.$inferSelect;
export type NewProductOptionValueTranslation = typeof productOptionValueTranslation.$inferInsert;

export type ProductFeatureTranslation = typeof productFeatureTranslation.$inferSelect;
export type NewProductFeatureTranslation = typeof productFeatureTranslation.$inferInsert;

export type ProductFeatureValueTranslation = typeof productFeatureValueTranslation.$inferSelect;
export type NewProductFeatureValueTranslation = typeof productFeatureValueTranslation.$inferInsert;
