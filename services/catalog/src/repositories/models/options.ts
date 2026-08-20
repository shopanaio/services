import {
  uuid,
  varchar,
  integer,
  jsonb,
  primaryKey,
  foreignKey,
  index,
  unique,
  timestamp,
} from "drizzle-orm/pg-core";
import { catalogSchema } from "./schema";
import { product, variant } from "./products";

export const productOptionSwatch = catalogSchema.table(
  "product_option_swatch",
  {
    storeId: uuid("store_id").notNull(),
    id: uuid("id").primaryKey(),
    colorOne: varchar("color_one", { length: 32 }),
    colorTwo: varchar("color_two", { length: 32 }),
    imageId: uuid("image_id"),
    swatchType: varchar("swatch_type", { length: 32 }).notNull(),
    metadata: jsonb("metadata"),
  },
  (table) => [index("idx_product_option_swatch_store_id").on(table.storeId)],
);

export const productOptionCategory = catalogSchema.table(
  "product_option_category",
  {
    storeId: uuid("store_id").notNull(),
    id: uuid("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("product_option_category_store_id_slug_key").on(table.storeId, table.slug),
    unique("product_option_category_store_id_id_unique").on(table.storeId, table.id),
    index("idx_product_option_category_store_id").on(table.storeId),
  ],
);

export const productOption = catalogSchema.table(
  "product_option",
  {
    id: uuid("id").primaryKey(),
    storeId: uuid("store_id").notNull(),
    productId: uuid("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => productOptionCategory.id, { onDelete: "restrict" }),
    slug: varchar("slug", { length: 255 }).notNull(),
    sortIndex: integer("sort_index").notNull().default(0),
  },
  (table) => [
    unique("product_option_product_id_slug_key").on(table.productId, table.slug),
    unique("product_option_product_id_id_uniq").on(table.productId, table.id),
    index("idx_product_option_product_id").on(table.productId),
    index("idx_product_option_category_id").on(table.categoryId),
    index("idx_product_option_sort").on(table.storeId, table.productId, table.sortIndex),
  ],
);

export const productOptionValue = catalogSchema.table(
  "product_option_value",
  {
    id: uuid("id").primaryKey(),
    storeId: uuid("store_id").notNull(),
    optionId: uuid("option_id")
      .notNull()
      .references(() => productOption.id, { onDelete: "cascade" }),
    swatchId: uuid("swatch_id").references(() => productOptionSwatch.id, {
      onDelete: "set null",
    }),
    slug: varchar("slug", { length: 255 }).notNull(),
    sortIndex: integer("sort_index").notNull(),
  },
  (table) => [
    unique("product_option_value_option_id_slug_key").on(table.optionId, table.slug),
    unique("product_option_value_option_id_id_uniq").on(table.optionId, table.id),
    index("idx_product_option_value_option_id").on(table.optionId),
  ],
);

export const productOptionVariantLink = catalogSchema.table(
  "product_option_variant_link",
  {
    storeId: uuid("store_id").notNull(),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => variant.id, { onDelete: "cascade" }),
    optionId: uuid("option_id")
      .notNull()
      .references(() => productOption.id, { onDelete: "cascade" }),
    optionValueId: uuid("option_value_id"),
  },
  (table) => [
    primaryKey({ columns: [table.variantId, table.optionId] }),
    foreignKey({
      name: "product_option_variant_link_option_value_fk",
      columns: [table.optionId, table.optionValueId],
      foreignColumns: [productOptionValue.optionId, productOptionValue.id],
    }).onDelete("cascade"),
    index("idx_product_option_variant_link_store_id").on(table.storeId),
  ],
);

export type ProductOptionSwatch = typeof productOptionSwatch.$inferSelect;
export type NewProductOptionSwatch = typeof productOptionSwatch.$inferInsert;
export type ProductOptionCategory = typeof productOptionCategory.$inferSelect;
export type NewProductOptionCategory = typeof productOptionCategory.$inferInsert;
export type ProductOption = typeof productOption.$inferSelect;
export type NewProductOption = typeof productOption.$inferInsert;
export type ProductOptionValue = typeof productOptionValue.$inferSelect;
export type NewProductOptionValue = typeof productOptionValue.$inferInsert;
export type ProductOptionVariantLink = typeof productOptionVariantLink.$inferSelect;
export type NewProductOptionVariantLink = typeof productOptionVariantLink.$inferInsert;
