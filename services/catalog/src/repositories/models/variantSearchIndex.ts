import {
  uuid,
  varchar,
  bigint,
  boolean,
  integer,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { catalogSchema } from "./schema";
import { variant, product } from "./products";

export const variantSearchIndex = catalogSchema.table(
  "variant_search_index",
  {
    projectId: uuid("project_id").notNull(),
    variantId: uuid("variant_id")
      .primaryKey()
      .references(() => variant.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    priceCurrency: varchar("price_currency", { length: 3 }).notNull(),
    priceMinor: bigint("price_minor", { mode: "number" }),
    inStock: boolean("in_stock").notNull().default(false),
    totalStock: integer("total_stock").notNull().default(0),
    optionSlugs: text("option_slugs")
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
    index("idx_variant_search_index_project_product").on(
      table.projectId,
      table.productId
    ),
    index("idx_variant_search_index_project_in_stock").on(
      table.projectId,
      table.inStock
    ),
    index("idx_variant_search_index_project_price").on(
      table.projectId,
      table.priceCurrency,
      table.priceMinor
    ),
    index("idx_variant_search_index_option_slugs_gin").using(
      "gin",
      table.optionSlugs
    ),
  ]
);

export type VariantSearchIndex = typeof variantSearchIndex.$inferSelect;
export type NewVariantSearchIndex = typeof variantSearchIndex.$inferInsert;
