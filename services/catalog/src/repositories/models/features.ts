import {
  boolean,
  type AnyPgColumn,
  check,
  index,
  integer,
  varchar,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { product } from "./products";
import { catalogSchema } from "./schema";

export const productFeature = catalogSchema.table(
  "product_feature",
  {
    id: uuid("id").primaryKey(),
    projectId: uuid("project_id").notNull(),
    productId: uuid("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    slug: varchar("slug", { length: 255 }).notNull(),
    index: integer("index").array().notNull(), // int[] - tree position: [0], [0, 1], etc.
    isGroup: boolean("is_group").notNull().default(false),
    parentId: uuid("parent_id").references(
      (): AnyPgColumn => productFeature.id,
      { onDelete: "cascade" }
    ),
  },
  (table) => [
    check(
      "feature_group_no_parent",
      sql`${table.isGroup} = false OR ${table.parentId} IS NULL`
    ),
    check(
      "feature_index_not_empty",
      sql`array_length(${table.index}, 1) > 0`
    ),
    check(
      "feature_group_root_only",
      sql`${table.isGroup} = false OR array_length(${table.index}, 1) = 1`
    ),
    index("product_feature_sort_idx").on(table.productId, table.index),
    index("idx_product_feature_product_id").on(table.productId),
    index("product_feature_children_idx").on(
      table.productId,
      table.parentId,
      table.index
    ),
    unique("product_feature_product_id_index_uniq").on(
      table.productId,
      table.index
    ),
    unique("product_feature_product_id_slug_uniq").on(
      table.productId,
      table.slug
    ),
  ]
);

export const productFeatureValue = catalogSchema.table(
  "product_feature_value",
  {
    id: uuid("id").primaryKey(),
    projectId: uuid("project_id").notNull(),
    featureId: uuid("feature_id")
      .notNull()
      .references(() => productFeature.id, { onDelete: "cascade" }),
    slug: varchar("slug", { length: 255 }).notNull(),
    index: integer("index").notNull(), // position within feature: 0, 1, 2, ...
  },
  (table) => [
    index("idx_product_feature_value_feature_id").on(table.featureId),
    unique("product_feature_value_feature_id_index_uniq").on(
      table.featureId,
      table.index
    ),
    unique("product_feature_value_feature_id_slug_uniq").on(
      table.featureId,
      table.slug
    ),
  ]
);

export type ProductFeature = typeof productFeature.$inferSelect;
export type NewProductFeature = typeof productFeature.$inferInsert;
export type ProductFeatureValue = typeof productFeatureValue.$inferSelect;
export type NewProductFeatureValue = typeof productFeatureValue.$inferInsert;
