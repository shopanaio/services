import {
  uuid,
  varchar,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { catalogSchema } from "./schema";
import { product } from "./products";

export const productSearchIndex = catalogSchema.table(
  "product_search_index",
  {
    projectId: uuid("project_id").notNull(),
    productId: uuid("product_id")
      .primaryKey()
      .references(() => product.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 16 }).notNull().default("draft"),
    tagHandles: text("tag_handles")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    featureSlugs: text("feature_slugs")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    categoryHandles: text("category_handles")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_product_search_index_project_status").on(
      table.projectId,
      table.status
    ),
    index("idx_product_search_index_created_at").on(
      table.projectId,
      table.createdAt
    ),
    index("idx_product_search_index_tag_handles_gin").using(
      "gin",
      table.tagHandles
    ),
    index("idx_product_search_index_feature_slugs_gin").using(
      "gin",
      table.featureSlugs
    ),
    index("idx_product_search_index_category_handles_gin").using(
      "gin",
      table.categoryHandles
    ),
  ]
);

export type ProductSearchIndex = typeof productSearchIndex.$inferSelect;
export type NewProductSearchIndex = typeof productSearchIndex.$inferInsert;
