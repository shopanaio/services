import {
  boolean,
  type AnyPgColumn,
  check,
  index,
  integer,
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { product } from "./products";
import { inventorySchema } from "./schema";

export const productFeature = inventorySchema.table(
  "product_feature",
  {
    id: uuid("id").primaryKey(),
    projectId: uuid("project_id").notNull(),
    productId: uuid("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    isGroup: boolean("is_group").notNull().default(false),
    parentId: uuid("parent_id").references(
      (): AnyPgColumn => productFeature.id,
      { onDelete: "cascade" }
    ),
    sortIndex: integer("sort_index").notNull().default(0),
    slug: varchar("slug", { length: 255 }).notNull(),
  },
  (table) => [
    check(
      "feature_group_no_parent",
      sql`${table.isGroup} = false OR ${table.parentId} IS NULL`
    ),
    unique("product_feature_product_id_slug_key").on(
      table.productId,
      table.slug
    ),
    uniqueIndex("product_feature_root_sort_idx")
      .on(table.productId, table.sortIndex)
      .where(sql`${table.parentId} IS NULL`),
    uniqueIndex("product_feature_child_sort_idx")
      .on(table.productId, table.parentId, table.sortIndex)
      .where(sql`${table.parentId} IS NOT NULL`),
    index("idx_product_feature_product_id").on(table.productId),
    index("product_feature_children_idx").on(
      table.productId,
      table.parentId,
      table.sortIndex
    ),
  ]
);

export const productFeatureValue = inventorySchema.table(
  "product_feature_value",
  {
    id: uuid("id").primaryKey(),
    projectId: uuid("project_id").notNull(),
    featureId: uuid("feature_id")
      .notNull()
      .references(() => productFeature.id, { onDelete: "cascade" }),
    slug: varchar("slug", { length: 255 }).notNull(),
    sortIndex: integer("sort_index").notNull(),
  },
  (table) => [
    unique("product_feature_value_feature_id_slug_key").on(
      table.featureId,
      table.slug
    ),
    index("idx_product_feature_value_feature_id").on(table.featureId),
  ]
);

export type ProductFeature = typeof productFeature.$inferSelect;
export type NewProductFeature = typeof productFeature.$inferInsert;
export type ProductFeatureValue = typeof productFeatureValue.$inferSelect;
export type NewProductFeatureValue = typeof productFeatureValue.$inferInsert;
