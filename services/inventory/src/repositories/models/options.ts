import {
  pgTable,
  uuid,
  varchar,
  integer,
  jsonb,
  primaryKey,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { product, variant } from "./products";

export const productOptionSwatch = pgTable(
  "product_option_swatch",
  {
    projectId: uuid("project_id").notNull(),
    id: uuid("id").primaryKey(),
    colorOne: varchar("color_one", { length: 32 }),
    colorTwo: varchar("color_two", { length: 32 }),
    imageId: uuid("image_id"),
    swatchType: varchar("swatch_type", { length: 32 }).notNull(),
    metadata: jsonb("metadata"),
  },
  (table) => [
    index("idx_product_option_swatch_project_id").on(table.projectId),
  ]
);

export const productOption = pgTable(
  "product_option",
  {
    id: uuid("id").primaryKey(),
    projectId: uuid("project_id").notNull(),
    productId: uuid("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    slug: varchar("slug", { length: 255 }).notNull(),
    displayType: varchar("display_type", { length: 32 }).notNull(),
  },
  (table) => [
    unique("product_option_product_id_slug_key").on(table.productId, table.slug),
    index("idx_product_option_product_id").on(table.productId),
  ]
);

export const productOptionValue = pgTable(
  "product_option_value",
  {
    id: uuid("id").primaryKey(),
    projectId: uuid("project_id").notNull(),
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
    unique("product_option_value_option_id_slug_key").on(
      table.optionId,
      table.slug
    ),
    index("idx_product_option_value_option_id").on(table.optionId),
  ]
);

export const productOptionVariantLink = pgTable(
  "product_option_variant_link",
  {
    projectId: uuid("project_id").notNull(),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => variant.id, { onDelete: "cascade" }),
    optionId: uuid("option_id")
      .notNull()
      .references(() => productOption.id, { onDelete: "cascade" }),
    optionValueId: uuid("option_value_id").references(
      () => productOptionValue.id,
      { onDelete: "cascade" }
    ),
  },
  (table) => [
    primaryKey({ columns: [table.variantId, table.optionId] }),
    index("idx_product_option_variant_link_project_id").on(table.projectId),
  ]
);

export type ProductOptionSwatch = typeof productOptionSwatch.$inferSelect;
export type NewProductOptionSwatch = typeof productOptionSwatch.$inferInsert;
export type ProductOption = typeof productOption.$inferSelect;
export type NewProductOption = typeof productOption.$inferInsert;
export type ProductOptionValue = typeof productOptionValue.$inferSelect;
export type NewProductOptionValue = typeof productOptionValue.$inferInsert;
export type ProductOptionVariantLink = typeof productOptionVariantLink.$inferSelect;
export type NewProductOptionVariantLink = typeof productOptionVariantLink.$inferInsert;
