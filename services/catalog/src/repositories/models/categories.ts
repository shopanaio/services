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
import { inventorySchema } from "./schema";
import { product } from "./products";

// ─────────────────────────────────────────────────────────────────────────────
// Category
// ─────────────────────────────────────────────────────────────────────────────
// Hierarchical product categories with materialized path for fast queries

export const category = inventorySchema.table(
  "category",
  {
    projectId: uuid("project_id").notNull(),
    id: uuid("id").primaryKey(),

    // Hierarchy
    parentId: uuid("parent_id"),
    path: text("path").notNull(), // Materialized path: "root.parent.child"
    depth: integer("depth").notNull().default(0),

    // Identifier
    handle: varchar("handle", { length: 255 }).notNull(),

    // Publication
    publishedAt: timestamp("published_at", { withTimezone: true, mode: "string" }),

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
    check(
      "category_published_requires_handle",
      sql`published_at IS NULL OR handle IS NOT NULL`
    ),
    uniqueIndex("category_project_id_handle_key")
      .on(table.projectId, table.handle)
      .where(sql`deleted_at IS NULL`),
    index("idx_category_project_id").on(table.projectId),
    index("idx_category_parent_id").on(table.parentId),
    index("idx_category_path").on(table.path),
    index("idx_category_published")
      .on(table.projectId, table.publishedAt)
      .where(sql`deleted_at IS NULL`),
  ]
);

// ─────────────────────────────────────────────────────────────────────────────
// Category Media
// ─────────────────────────────────────────────────────────────────────────────
// Links categories to files in Media service

export const categoryMedia = inventorySchema.table(
  "category_media",
  {
    projectId: uuid("project_id").notNull(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => category.id, { onDelete: "cascade" }),
    fileId: uuid("file_id").notNull(), // FK to Media service (no constraint)
    sortIndex: integer("sort_index").notNull().default(0),
  },
  (table) => [
    primaryKey({ columns: [table.categoryId, table.fileId] }),
    index("idx_category_media_category").on(table.categoryId),
  ]
);

// ─────────────────────────────────────────────────────────────────────────────
// Category Translation
// ─────────────────────────────────────────────────────────────────────────────

export const categoryTranslation = inventorySchema.table(
  "category_translation",
  {
    projectId: uuid("project_id").notNull(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => category.id, { onDelete: "cascade" }),
    locale: varchar("locale", { length: 8 }).notNull(),

    // Content
    name: text("name").notNull(),
    descriptionText: text("description_text"),
    descriptionHtml: text("description_html"),
    descriptionJson: text("description_json"), // EditorJS JSON
  },
  (table) => [
    primaryKey({ columns: [table.categoryId, table.locale] }),
    index("idx_category_translation_project").on(table.projectId),
    index("idx_category_translation_project_locale").on(
      table.projectId,
      table.locale
    ),
  ]
);

// ─────────────────────────────────────────────────────────────────────────────
// Product Category (Many-to-Many)
// ─────────────────────────────────────────────────────────────────────────────

export const productCategory = inventorySchema.table(
  "product_category",
  {
    projectId: uuid("project_id").notNull(),
    productId: uuid("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => category.id, { onDelete: "cascade" }),

    // Is this the primary category for the product?
    isPrimary: boolean("is_primary").notNull().default(false),

    // Sort order within category
    sortIndex: integer("sort_index").notNull().default(0),
  },
  (table) => [
    primaryKey({ columns: [table.productId, table.categoryId] }),
    // Only one primary category per product
    uniqueIndex("idx_product_category_primary")
      .on(table.productId)
      .where(sql`is_primary = true`),
    index("idx_product_category_product").on(table.productId),
    index("idx_product_category_category").on(table.categoryId),
  ]
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
