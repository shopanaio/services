import { index, integer, unique, uuid, varchar } from "drizzle-orm/pg-core";
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
    slug: varchar("slug", { length: 255 }).notNull(),
  },
  (table) => [
    unique("product_feature_product_id_slug_key").on(
      table.productId,
      table.slug
    ),
    index("idx_product_feature_product_id").on(table.productId),
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
