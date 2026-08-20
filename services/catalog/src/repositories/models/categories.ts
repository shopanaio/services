import {
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  index,
  uniqueIndex,
  primaryKey,
  boolean,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { catalogSchema, localeCodeEnum } from "./schema";
import { product } from "./products";

// ─────────────────────────────────────────────────────────────────────────────
// Category
// ─────────────────────────────────────────────────────────────────────────────
// Hierarchical product categories with materialized path for fast queries

export const category = catalogSchema.table(
  "category",
  {
    storeId: uuid("store_id").notNull(),
    id: uuid("id").primaryKey(),

    // Hierarchy
    parentId: uuid("parent_id"),
    path: text("path").notNull(), // Materialized path: "root.parent.child"
    depth: integer("depth").notNull().default(0),

    // Identifier
    handle: varchar("handle", { length: 255 }).notNull(),

    // Listing sort defaults
    defaultSort: varchar("default_sort", { length: 32 }).notNull().default("manual"),
    defaultSortDirection: varchar("default_sort_direction", { length: 4 }).notNull().default("asc"),

    // Publication
    publishedAt: timestamp("published_at", { withTimezone: true, mode: "string" }),

    // Optimistic locking
    revision: integer("revision").notNull().default(0),

    // Denormalized product count for category listings
    productsCount: integer("products_count").notNull().default(0),

    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
  },
  (table) => [
    check("category_published_requires_handle", sql`published_at IS NULL OR handle IS NOT NULL`),
    check(
      "category_default_sort_check",
      sql`default_sort IN ('manual', 'price', 'newest', 'name')`,
    ),
    check("category_default_sort_direction_check", sql`default_sort_direction IN ('asc', 'desc')`),
    uniqueIndex("category_store_id_handle_key")
      .on(table.storeId, table.handle)
      .where(sql`deleted_at IS NULL`),
    index("idx_category_store_id").on(table.storeId),
    index("idx_category_parent_id").on(table.parentId),
    index("idx_category_path").on(table.path),
    index("idx_category_published")
      .on(table.storeId, table.publishedAt)
      .where(sql`deleted_at IS NULL`),
  ],
);

// ─────────────────────────────────────────────────────────────────────────────
// Category Media
// ─────────────────────────────────────────────────────────────────────────────
// Links categories to files in Media service

export const categoryMedia = catalogSchema.table(
  "category_media",
  {
    storeId: uuid("store_id").notNull(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => category.id, { onDelete: "cascade" }),
    fileId: uuid("file_id").notNull(), // FK to Media service (no constraint)
    sortIndex: integer("sort_index").notNull().default(0),
  },
  (table) => [
    primaryKey({ columns: [table.categoryId, table.fileId] }),
    index("idx_category_media_category").on(table.categoryId),
  ],
);

// ─────────────────────────────────────────────────────────────────────────────
// Category Translation
// ─────────────────────────────────────────────────────────────────────────────

export const categoryTranslation = catalogSchema.table(
  "category_translation",
  {
    storeId: uuid("store_id").notNull(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => category.id, { onDelete: "cascade" }),
    locale: localeCodeEnum("locale").notNull(),

    // Content
    name: text("name").notNull(),
    descriptionText: text("description_text"),
    descriptionHtml: text("description_html"),
    descriptionJson: text("description_json"), // EditorJS JSON
    excerptText: text("excerpt_text"),
    excerptHtml: text("excerpt_html"),
    excerptJson: text("excerpt_json"),
  },
  (table) => [
    primaryKey({ columns: [table.categoryId, table.locale] }),
    index("idx_category_translation_store").on(table.storeId),
    index("idx_category_translation_store_locale").on(table.storeId, table.locale),
  ],
);

// ─────────────────────────────────────────────────────────────────────────────
// Product Category (Many-to-Many)
// ─────────────────────────────────────────────────────────────────────────────

export const productCategory = catalogSchema.table(
  "product_category",
  {
    storeId: uuid("store_id").notNull(),
    productId: uuid("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => category.id, { onDelete: "cascade" }),

    // Is this the primary category for the product?
    isPrimary: boolean("is_primary").notNull().default(false),

    // Sort order within category
    lexoRank: varchar("lexo_rank", { length: 64 }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.productId, table.categoryId] }),
    // Only one primary category per product within a project
    uniqueIndex("product_category_one_primary_per_product_idx")
      .on(table.storeId, table.productId)
      .where(sql`is_primary = true`),
    index("idx_product_category_product").on(table.productId),
    index("idx_product_category_category").on(table.categoryId),
    index("idx_product_category_rank").on(table.categoryId, table.lexoRank),
    index("idx_product_category_listing_scope").on(
      table.storeId,
      table.categoryId,
      table.lexoRank,
      table.productId,
    ),
  ],
);

// ─────────────────────────────────────────────────────────────────────────────
// Type exports
// ─────────────────────────────────────────────────────────────────────────────

export type Category = typeof category.$inferSelect;
export type NewCategory = typeof category.$inferInsert;

export type CategoryMedia = typeof categoryMedia.$inferSelect;
export type NewCategoryMedia = typeof categoryMedia.$inferInsert;

export type CategoryTranslation = typeof categoryTranslation.$inferSelect;
export type NewCategoryTranslation = typeof categoryTranslation.$inferInsert;

export type ProductCategory = typeof productCategory.$inferSelect;
export type NewProductCategory = typeof productCategory.$inferInsert;
