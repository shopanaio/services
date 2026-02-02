import {
  uuid,
  varchar,
  text,
  timestamp,
  index,
  uniqueIndex,
  primaryKey,
} from "drizzle-orm/pg-core";
import { inventorySchema } from "./schema";
import { product } from "./products";
import { category } from "./categories";

// ─────────────────────────────────────────────────────────────────────────────
// Tag
// ─────────────────────────────────────────────────────────────────────────────
// Simple tags for product filtering and organization

export const tag = inventorySchema.table(
  "tag",
  {
    projectId: uuid("project_id").notNull(),
    id: uuid("id").primaryKey(),

    // Identifier (URL-safe slug)
    handle: varchar("handle", { length: 255 }).notNull(),

    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("tag_project_id_handle_key").on(table.projectId, table.handle),
    index("idx_tag_project_id").on(table.projectId),
  ]
);

// ─────────────────────────────────────────────────────────────────────────────
// Tag Translation
// ─────────────────────────────────────────────────────────────────────────────

export const tagTranslation = inventorySchema.table(
  "tag_translation",
  {
    projectId: uuid("project_id").notNull(),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tag.id, { onDelete: "cascade" }),
    locale: varchar("locale", { length: 8 }).notNull(),

    // Display name
    name: text("name").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.tagId, table.locale] }),
    index("idx_tag_translation_project").on(table.projectId),
  ]
);

// ─────────────────────────────────────────────────────────────────────────────
// Product Tag (Many-to-Many)
// ─────────────────────────────────────────────────────────────────────────────

export const productTag = inventorySchema.table(
  "product_tag",
  {
    projectId: uuid("project_id").notNull(),
    productId: uuid("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tag.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.productId, table.tagId] }),
    index("idx_product_tag_product").on(table.productId),
    index("idx_product_tag_tag").on(table.tagId),
  ]
);

// ─────────────────────────────────────────────────────────────────────────────
// Category Tag (Many-to-Many, optional)
// ─────────────────────────────────────────────────────────────────────────────

export const categoryTag = inventorySchema.table(
  "category_tag",
  {
    projectId: uuid("project_id").notNull(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => category.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tag.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.categoryId, table.tagId] }),
    index("idx_category_tag_category").on(table.categoryId),
    index("idx_category_tag_tag").on(table.tagId),
  ]
);

// ─────────────────────────────────────────────────────────────────────────────
// Type exports
// ─────────────────────────────────────────────────────────────────────────────

export type Tag = typeof tag.$inferSelect;
export type NewTag = typeof tag.$inferInsert;

export type TagTranslation = typeof tagTranslation.$inferSelect;
export type NewTagTranslation = typeof tagTranslation.$inferInsert;

export type ProductTag = typeof productTag.$inferSelect;
export type NewProductTag = typeof productTag.$inferInsert;

export type CategoryTag = typeof categoryTag.$inferSelect;
export type NewCategoryTag = typeof categoryTag.$inferInsert;
