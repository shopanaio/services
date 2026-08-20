import {
  foreignKey,
  index,
  integer,
  primaryKey,
  text,
  timestamp,
  unique,
  varchar,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { catalogSchema, localeCodeEnum } from "./schema";
import { product } from "./products";

export const productTitleBm25SearchIndex = catalogSchema.table(
  "product_title_bm25_search_index",
  {
    searchId: uuid("search_id").notNull(),
    storeId: uuid("store_id").notNull(),
    productId: uuid("product_id").notNull(),
    locale: localeCodeEnum("locale").notNull(),
    status: varchar("status", { length: 16 }).notNull(),
    publishedAt: timestamp("published_at", {
      withTimezone: true,
      mode: "string",
    }),
    productCreatedAt: timestamp("product_created_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    productUpdatedAt: timestamp("product_updated_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    productRevision: integer("product_revision").notNull().default(0),
    title: text("title").notNull().default(""),
    indexedAt: timestamp("indexed_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({
      name: "product_title_bm25_search_index_pkey",
      columns: [table.productId, table.locale],
    }),
    unique("product_title_bm25_search_id_unique").on(table.searchId),
    foreignKey({
      name: "fk_product_title_bm25_product",
      columns: [table.productId],
      foreignColumns: [product.id],
    }).onDelete("cascade"),
    index("idx_product_title_bm25_store_locale_product").on(
      table.storeId,
      table.locale,
      table.productId,
    ),
    index("idx_product_title_bm25_visible")
      .on(table.storeId, table.locale, table.publishedAt.desc(), table.productId)
      .where(sql`${table.status} = 'published'`),
    index("idx_product_title_bm25_search")
      .using(
        "bm25",
        table.searchId,
        table.storeId,
        table.locale,
        table.status,
        table.productId,
        table.title,
        table.publishedAt,
        table.productCreatedAt,
      )
      .with({ key_field: "search_id" }),
  ],
);

export type ProductTitleBm25SearchIndex = typeof productTitleBm25SearchIndex.$inferSelect;
export type NewProductTitleBm25SearchIndex = typeof productTitleBm25SearchIndex.$inferInsert;
