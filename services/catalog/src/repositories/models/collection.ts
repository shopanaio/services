import {
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  jsonb,
  index,
  primaryKey,
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { catalogSchema } from "./schema";
import { product } from "./products";

export const collection = catalogSchema.table(
  "collection",
  {
    id: uuid("id").primaryKey(),
    projectId: uuid("project_id").notNull(),
    handle: varchar("handle", { length: 255 }),
    type: varchar("type", { length: 16 }).notNull(),
    defaultSort: varchar("default_sort", { length: 32 }).notNull().default("newest"),
    defaultSortDirection: varchar("default_sort_direction", { length: 4 })
      .notNull()
      .default("asc"),
    effectiveFrom: timestamp("effective_from", {
      withTimezone: true,
      mode: "string",
    }),
    effectiveTo: timestamp("effective_to", {
      withTimezone: true,
      mode: "string",
    }),
    publishedAt: timestamp("published_at", { withTimezone: true, mode: "string" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
  },
  (table) => [
    uniqueIndex("collection_project_id_handle_uniq")
      .on(table.projectId, table.handle)
      .where(sql`deleted_at IS NULL AND handle IS NOT NULL`),
    check("collection_type_check", sql`type IN ('manual', 'rule')`),
    check(
      "collection_default_sort_check",
      sql`default_sort IN ('manual', 'price', 'newest', 'name')`
    ),
    check(
      "collection_default_sort_direction_check",
      sql`default_sort_direction IN ('asc', 'desc')`
    ),
    check(
      "collection_rule_manual_sort_check",
      sql`type != 'rule' OR default_sort != 'manual'`
    ),
    check(
      "collection_effective_range_check",
      sql`effective_to IS NULL OR effective_from IS NULL OR effective_to > effective_from`
    ),
    index("idx_collection_scheduling").on(
      table.projectId,
      table.effectiveFrom,
      table.effectiveTo
    ),
  ]
);

export const collectionTranslation = catalogSchema.table(
  "collection_translation",
  {
    collectionId: uuid("collection_id")
      .notNull()
      .references(() => collection.id, { onDelete: "cascade" }),
    locale: varchar("locale", { length: 8 }).notNull(),
    projectId: uuid("project_id").notNull(),
    name: text("name").notNull(),
    descriptionText: text("description_text"),
    descriptionHtml: text("description_html"),
    descriptionJson: text("description_json"),
  },
  (table) => [
    primaryKey({ columns: [table.collectionId, table.locale] }),
    index("idx_collection_translation_project_locale").on(
      table.projectId,
      table.locale
    ),
  ]
);

export const collectionSeo = catalogSchema.table(
  "collection_seo",
  {
    collectionId: uuid("collection_id")
      .notNull()
      .references(() => collection.id, { onDelete: "cascade" }),
    locale: varchar("locale", { length: 8 }).notNull(),
    projectId: uuid("project_id").notNull(),
    seoTitle: varchar("seo_title", { length: 70 }),
    seoDescription: varchar("seo_description", { length: 160 }),
    ogTitle: varchar("og_title", { length: 95 }),
    ogDescription: text("og_description"),
    ogImageId: uuid("og_image_id"),
  },
  (table) => [
    primaryKey({ columns: [table.collectionId, table.locale] }),
    index("idx_collection_seo_project_locale").on(table.projectId, table.locale),
  ]
);

export const collectionMedia = catalogSchema.table(
  "collection_media",
  {
    collectionId: uuid("collection_id")
      .notNull()
      .references(() => collection.id, { onDelete: "cascade" }),
    fileId: uuid("file_id").notNull(),
    projectId: uuid("project_id").notNull(),
    sortIndex: integer("sort_index").notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.collectionId, table.fileId] })]
);

export const collectionItem = catalogSchema.table(
  "collection_item",
  {
    collectionId: uuid("collection_id")
      .notNull()
      .references(() => collection.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").notNull(),
    productId: uuid("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    lexoRank: varchar("lexo_rank", { length: 64 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.collectionId, table.productId] }),
    index("idx_collection_item_rank").on(table.collectionId, table.lexoRank),
  ]
);

export const collectionRule = catalogSchema.table(
  "collection_rule",
  {
    id: uuid("id").primaryKey(),
    collectionId: uuid("collection_id")
      .notNull()
      .references(() => collection.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").notNull(),
    field: varchar("field", { length: 64 }).notNull(),
    operator: varchar("operator", { length: 16 }).notNull(),
    value: jsonb("value").notNull(),
    sortIndex: integer("sort_index").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("idx_collection_rule_collection").on(table.collectionId)]
);

export type Collection = typeof collection.$inferSelect;
export type NewCollection = typeof collection.$inferInsert;
export type CollectionTranslation = typeof collectionTranslation.$inferSelect;
export type NewCollectionTranslation = typeof collectionTranslation.$inferInsert;
export type CollectionSeo = typeof collectionSeo.$inferSelect;
export type NewCollectionSeo = typeof collectionSeo.$inferInsert;
export type CollectionMedia = typeof collectionMedia.$inferSelect;
export type NewCollectionMedia = typeof collectionMedia.$inferInsert;
export type CollectionItem = typeof collectionItem.$inferSelect;
export type NewCollectionItem = typeof collectionItem.$inferInsert;
export type CollectionRule = typeof collectionRule.$inferSelect;
export type NewCollectionRule = typeof collectionRule.$inferInsert;
