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
  foreignKey,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { catalogSchema, localeCodeEnum } from "./schema";
import { product } from "./products";

export const collection = catalogSchema.table(
  "collection",
  {
    id: uuid("id").primaryKey(),
    storeId: uuid("store_id").notNull(),
    handle: varchar("handle", { length: 255 }),
    type: varchar("type", { length: 16 }).notNull(),
    defaultSort: varchar("default_sort", { length: 32 }).notNull().default("newest"),
    defaultSortDirection: varchar("default_sort_direction", { length: 4 })
      .notNull()
      .default("desc"),
    effectiveFrom: timestamp("effective_from", {
      withTimezone: true,
      mode: "string",
    }),
    effectiveTo: timestamp("effective_to", {
      withTimezone: true,
      mode: "string",
    }),
    publishedAt: timestamp("published_at", { withTimezone: true, mode: "string" }),
    revision: integer("revision").notNull().default(0),
    listingRevision: integer("listing_revision").notNull().default(0),
    listingUpdatedAt: timestamp("listing_updated_at", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
  },
  (table) => [
    uniqueIndex("collection_store_id_handle_uniq")
      .on(table.storeId, table.handle)
      .where(sql`deleted_at IS NULL AND handle IS NOT NULL`),
    check("collection_type_check", sql`type IN ('manual', 'rule')`),
    check(
      "collection_default_sort_check",
      sql`default_sort IN ('manual', 'price', 'newest', 'name')`,
    ),
    check(
      "collection_default_sort_direction_check",
      sql`default_sort_direction IN ('asc', 'desc')`,
    ),
    check(
      "collection_default_sort_direction_pair_check",
      sql`(default_sort = 'manual' AND default_sort_direction = 'asc')
        OR (default_sort = 'newest' AND default_sort_direction = 'desc')
        OR (default_sort IN ('price', 'name') AND default_sort_direction IN ('asc', 'desc'))`,
    ),
    check("collection_rule_manual_sort_check", sql`type != 'rule' OR default_sort != 'manual'`),
    check(
      "collection_effective_range_check",
      sql`effective_to IS NULL OR effective_from IS NULL OR effective_to > effective_from`,
    ),
    check("collection_revision_check", sql`revision BETWEEN 0 AND 2147483646`),
    check("collection_listing_revision_check", sql`listing_revision BETWEEN 0 AND 2147483646`),
    uniqueIndex("collection_store_id_id_uniq").on(table.storeId, table.id),
    index("idx_collection_scheduling").on(table.storeId, table.effectiveFrom, table.effectiveTo),
  ],
);

export const collectionTranslation = catalogSchema.table(
  "collection_translation",
  {
    collectionId: uuid("collection_id")
      .notNull()
      .references(() => collection.id, { onDelete: "cascade" }),
    locale: localeCodeEnum("locale").notNull(),
    storeId: uuid("store_id").notNull(),
    name: text("name").notNull(),
    descriptionText: text("description_text"),
    descriptionHtml: text("description_html"),
    descriptionJson: text("description_json"),
    excerptText: text("excerpt_text"),
    excerptHtml: text("excerpt_html"),
    excerptJson: text("excerpt_json"),
  },
  (table) => [
    primaryKey({ columns: [table.collectionId, table.locale] }),
    index("idx_collection_translation_store_locale").on(table.storeId, table.locale),
  ],
);

export const collectionSeo = catalogSchema.table(
  "collection_seo",
  {
    collectionId: uuid("collection_id")
      .notNull()
      .references(() => collection.id, { onDelete: "cascade" }),
    locale: localeCodeEnum("locale").notNull(),
    storeId: uuid("store_id").notNull(),
    seoTitle: varchar("seo_title", { length: 70 }),
    seoDescription: varchar("seo_description", { length: 160 }),
    ogTitle: varchar("og_title", { length: 95 }),
    ogDescription: text("og_description"),
    ogImageId: uuid("og_image_id"),
  },
  (table) => [
    primaryKey({ columns: [table.collectionId, table.locale] }),
    index("idx_collection_seo_store_locale").on(table.storeId, table.locale),
  ],
);

export const collectionMedia = catalogSchema.table(
  "collection_media",
  {
    collectionId: uuid("collection_id")
      .notNull()
      .references(() => collection.id, { onDelete: "cascade" }),
    fileId: uuid("file_id").notNull(),
    storeId: uuid("store_id").notNull(),
    sortIndex: integer("sort_index").notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.collectionId, table.fileId] })],
);

export const collectionItem = catalogSchema.table(
  "collection_item",
  {
    collectionId: uuid("collection_id")
      .notNull()
      .references(() => collection.id, { onDelete: "cascade" }),
    storeId: uuid("store_id").notNull(),
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
    index("idx_collection_item_listing_scope").on(
      table.storeId,
      table.collectionId,
      table.lexoRank,
      table.productId,
    ),
  ],
);

export const collectionRule = catalogSchema.table(
  "collection_rule",
  {
    id: uuid("id").primaryKey(),
    collectionId: uuid("collection_id")
      .notNull()
      .references(() => collection.id, { onDelete: "cascade" }),
    storeId: uuid("store_id").notNull(),
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
  (table) => [
    index("idx_collection_rule_collection").on(table.storeId, table.collectionId, table.sortIndex),
    uniqueIndex("collection_rule_store_collection_sort_uniq").on(
      table.storeId,
      table.collectionId,
      table.sortIndex,
    ),
    check(
      "collection_rule_field_check",
      sql`field IN ('category', 'tag', 'vendor', 'feature', 'option', 'price', 'in_stock', 'created_at')`,
    ),
    check(
      "collection_rule_operator_check",
      sql`operator IN ('in', 'all', 'eq', 'gt', 'gte', 'lt', 'lte', 'between')`,
    ),
    check("collection_rule_sort_index_check", sql`sort_index >= 0`),
  ],
);

export const collectionMutationReceipt = catalogSchema.table(
  "collection_mutation_receipt",
  {
    storeId: uuid("store_id").notNull(),
    workflowId: text("workflow_id").notNull(),
    requestHash: text("request_hash").notNull(),
    mutationKind: varchar("mutation_kind", { length: 32 }).notNull(),
    resultJson: jsonb("result_json").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    completedAt: timestamp("completed_at", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.storeId, table.workflowId] }),
    check("collection_mutation_receipt_hash_check", sql`request_hash ~ '^sha256:v1:[0-9a-f]{64}$'`),
    index("idx_collection_mutation_receipt_cleanup").on(table.completedAt),
  ],
);

export const collectionProductSyncOperation = catalogSchema.table(
  "collection_product_sync_operation",
  {
    storeId: uuid("store_id").notNull(),
    operationId: uuid("operation_id").notNull(),
    workflowId: text("workflow_id").notNull(),
    collectionId: uuid("collection_id").notNull(),
    collectionRevision: integer("collection_revision").notNull(),
    reason: varchar("reason", { length: 16 }).notNull(),
    status: varchar("status", { length: 16 }).notNull().default("pending"),
    affectedCount: integer("affected_count").notNull(),
    emittedCount: integer("emitted_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    completedAt: timestamp("completed_at", {
      withTimezone: true,
      mode: "string",
    }),
  },
  (table) => [
    primaryKey({ columns: [table.storeId, table.operationId] }),
    foreignKey({
      name: "collection_product_sync_operation_collection_fk",
      columns: [table.storeId, table.collectionId],
      foreignColumns: [collection.storeId, collection.id],
    }).onDelete("cascade"),
    uniqueIndex("collection_product_sync_operation_workflow_uniq").on(
      table.storeId,
      table.workflowId,
    ),
    check(
      "collection_product_sync_operation_status_check",
      sql`status IN ('pending', 'completed')`,
    ),
    check(
      "collection_product_sync_operation_reason_check",
      sql`reason IN ('add', 'remove', 'move', 'rebalance', 'clear')`,
    ),
    check(
      "collection_product_sync_operation_counts_check",
      sql`affected_count >= 0 AND emitted_count >= 0 AND emitted_count <= affected_count`,
    ),
    index("idx_collection_product_sync_operation_cleanup")
      .on(table.status, table.completedAt)
      .where(sql`status = 'completed'`),
  ],
);

export const collectionProductSyncItem = catalogSchema.table(
  "collection_product_sync_item",
  {
    storeId: uuid("store_id").notNull(),
    operationId: uuid("operation_id").notNull(),
    productId: uuid("product_id").notNull(),
    emittedAt: timestamp("emitted_at", { withTimezone: true, mode: "string" }),
  },
  (table) => [
    primaryKey({
      columns: [table.storeId, table.operationId, table.productId],
    }),
    index("idx_collection_product_sync_item_pending")
      .on(table.storeId, table.operationId, table.productId)
      .where(sql`emitted_at IS NULL`),
  ],
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
export type CollectionMutationReceipt = typeof collectionMutationReceipt.$inferSelect;
export type CollectionProductSyncOperation = typeof collectionProductSyncOperation.$inferSelect;
export type CollectionProductSyncItem = typeof collectionProductSyncItem.$inferSelect;
