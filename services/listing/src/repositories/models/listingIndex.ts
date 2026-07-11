import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { listingSchema } from "./schema.js";
import { roaringbitmap } from "./postgresTypes.js";

export const listingDocIdAllocator = listingSchema.table(
  "listing_doc_id_allocator",
  {
    storeId: uuid("store_id").notNull(),
    nextProductDocId: integer("next_product_doc_id").notNull().default(1),
    nextVariantDocId: integer("next_variant_doc_id").notNull().default(1),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.storeId] }),
    check(
      "chk_listing_doc_id_allocator_product_positive",
      sql`${table.nextProductDocId} > 0`
    ),
    check(
      "chk_listing_doc_id_allocator_variant_positive",
      sql`${table.nextVariantDocId} > 0`
    ),
  ]
);

export const listingIndexItemState = listingSchema.table(
  "listing_index_item_state",
  {
    storeId: uuid("store_id").notNull(),
    itemId: uuid("item_id").notNull(),
    eventSequence: integer("event_sequence").notNull(),
    payloadHash: text("payload_hash").notNull(),
    lifecycleStatus: varchar("lifecycle_status", { length: 32 }).notNull(),
    lastEffectiveIdempotencyKey: text("last_effective_idempotency_key")
      .notNull(),
    lastOperationId: text("last_operation_id").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.storeId, table.itemId],
    }),
    check(
      "chk_listing_index_item_state_event_sequence",
      sql`${table.eventSequence} > 0`
    ),
    check(
      "chk_listing_index_item_state_lifecycle_status",
      sql`${table.lifecycleStatus} IN ('indexed', 'deleted')`
    ),
  ]
);

export const productListingIndex = listingSchema.table(
  "product_listing_index",
  {
    storeId: uuid("store_id").notNull(),
    productId: uuid("product_id").primaryKey(),
    productDocId: integer("product_doc_id").notNull(),
    kind: varchar("kind", { length: 16 }).notNull(),
    vendorId: uuid("vendor_id"),
    handle: varchar("handle", { length: 255 }),
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
    inStock: boolean("in_stock").notNull().default(false),
    totalStock: integer("total_stock").notNull().default(0),
    indexedAt: timestamp("indexed_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("product_listing_store_doc_unique").on(
      table.storeId,
      table.productDocId
    ),
    unique("product_listing_store_product_unique").on(
      table.storeId,
      table.productId
    ),
    unique("product_listing_store_doc_product_unique").on(
      table.storeId,
      table.productDocId,
      table.productId
    ),
    check("chk_product_listing_kind", sql`${table.kind} IN ('BASE', 'BUNDLE')`),
    check(
      "chk_product_listing_status",
      sql`${table.status} IN ('published', 'draft')`
    ),
    check("chk_product_listing_doc_positive", sql`${table.productDocId} > 0`),
    check(
      "chk_product_listing_total_stock_nonnegative",
      sql`${table.totalStock} >= 0`
    ),
    index("idx_product_listing_store_product").on(
      table.storeId,
      table.productId
    ),
    index("idx_product_listing_store_doc").on(
      table.storeId,
      table.productDocId
    ),
    index("idx_product_listing_visible_newest")
      .on(
        table.storeId,
        table.inStock.desc(),
        table.publishedAt.desc().nullsLast(),
        table.productCreatedAt.desc(),
        table.productId
      )
      .where(sql`${table.status} = 'published'`),
    index("idx_product_listing_visible_created")
      .on(
        table.storeId,
        table.inStock.desc(),
        table.productCreatedAt.desc(),
        table.productId
      )
      .where(sql`${table.status} = 'published'`),
    index("idx_product_listing_vendor")
      .on(table.storeId, table.vendorId)
      .where(sql`${table.vendorId} IS NOT NULL`),
    index("idx_product_listing_in_stock").on(table.storeId, table.inStock),
  ]
);

export const productListingPriceIndex = listingSchema.table(
  "product_listing_price_index",
  {
    storeId: uuid("store_id").notNull(),
    productId: uuid("product_id").notNull(),
    currency: varchar("currency", { length: 3 }).notNull(),
    minPriceMinor: bigint("min_price_minor", { mode: "number" }),
    maxPriceMinor: bigint("max_price_minor", { mode: "number" }),
    hasPrice: boolean("has_price").notNull().default(false),
    indexedAt: timestamp("indexed_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.productId, table.currency] }),
    foreignKey({
      name: "fk_product_listing_price_product",
      columns: [table.productId],
      foreignColumns: [productListingIndex.productId],
    }).onDelete("cascade"),
    foreignKey({
      name: "fk_product_listing_price_store_product",
      columns: [table.storeId, table.productId],
      foreignColumns: [
        productListingIndex.storeId,
        productListingIndex.productId,
      ],
    }).onDelete("cascade"),
    check(
      "chk_product_listing_price_state",
      sql`(
        (${table.hasPrice} = false AND ${table.minPriceMinor} IS NULL AND ${table.maxPriceMinor} IS NULL)
        OR
        (${table.hasPrice} = true AND ${table.minPriceMinor} IS NOT NULL AND ${table.maxPriceMinor} IS NOT NULL AND ${table.minPriceMinor} >= 0 AND ${table.maxPriceMinor} >= ${table.minPriceMinor})
      )`
    ),
    index("idx_product_listing_price_visible_asc")
      .on(
        table.storeId,
        table.currency,
        table.minPriceMinor.asc(),
        table.productId
      )
      .where(sql`${table.hasPrice} = true`),
    index("idx_product_listing_price_visible_desc")
      .on(
        table.storeId,
        table.currency,
        table.maxPriceMinor.desc(),
        table.productId
      )
      .where(sql`${table.hasPrice} = true`),
  ]
);

export const variantListingIndex = listingSchema.table(
  "variant_listing_index",
  {
    storeId: uuid("store_id").notNull(),
    productId: uuid("product_id").notNull(),
    productDocId: integer("product_doc_id").notNull(),
    variantId: uuid("variant_id").primaryKey(),
    variantDocId: integer("variant_doc_id").notNull(),
    inStock: boolean("in_stock").notNull().default(false),
    totalStock: integer("total_stock").notNull().default(0),
    indexedAt: timestamp("indexed_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("variant_listing_store_product_variant_unique").on(
      table.productId,
      table.variantId
    ),
    unique("variant_listing_store_variant_unique").on(
      table.storeId,
      table.variantId
    ),
    unique("variant_listing_store_doc_unique").on(
      table.storeId,
      table.variantDocId
    ),
    unique("variant_listing_store_doc_variant_unique").on(
      table.storeId,
      table.variantDocId,
      table.productDocId,
      table.productId
    ),
    foreignKey({
      name: "fk_variant_listing_product",
      columns: [table.productId],
      foreignColumns: [productListingIndex.productId],
    }).onDelete("cascade"),
    foreignKey({
      name: "fk_variant_listing_product_doc",
      columns: [table.storeId, table.productDocId, table.productId],
      foreignColumns: [
        productListingIndex.storeId,
        productListingIndex.productDocId,
        productListingIndex.productId,
      ],
    }).onDelete("cascade"),
    check("chk_variant_listing_doc_positive", sql`${table.variantDocId} > 0`),
    check(
      "chk_variant_listing_product_doc_positive",
      sql`${table.productDocId} > 0`
    ),
    check(
      "chk_variant_listing_total_stock_nonnegative",
      sql`${table.totalStock} >= 0`
    ),
    index("idx_variant_listing_store_product").on(
      table.storeId,
      table.productId
    ),
    index("idx_variant_listing_store_variant").on(
      table.storeId,
      table.variantId
    ),
    index("idx_variant_listing_store_doc").on(
      table.storeId,
      table.variantDocId
    ),
    index("idx_variant_listing_in_stock").on(table.storeId, table.inStock),
    index("idx_variant_listing_in_stock_product_variant")
      .on(
        table.storeId,
        table.productDocId,
        table.productId,
        table.variantDocId,
        table.variantId
      )
      .where(sql`${table.inStock} = true`),
  ]
);

export const variantListingPriceIndex = listingSchema.table(
  "variant_listing_price_index",
  {
    storeId: uuid("store_id").notNull(),
    variantId: uuid("variant_id").notNull(),
    currency: varchar("currency", { length: 3 }).notNull(),
    variantDocId: integer("variant_doc_id").notNull(),
    productDocId: integer("product_doc_id").notNull(),
    productId: uuid("product_id").notNull(),
    priceMinor: bigint("price_minor", { mode: "number" }),
    hasPrice: boolean("has_price").notNull().default(false),
    indexedAt: timestamp("indexed_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.variantId, table.currency] }),
    foreignKey({
      name: "fk_variant_listing_price_variant",
      columns: [table.variantId],
      foreignColumns: [variantListingIndex.variantId],
    }).onDelete("cascade"),
    foreignKey({
      name: "fk_variant_listing_price_store_variant",
      columns: [table.storeId, table.variantId],
      foreignColumns: [
        variantListingIndex.storeId,
        variantListingIndex.variantId,
      ],
    }).onDelete("cascade"),
    check(
      "chk_variant_listing_price_state",
      sql`(
        (${table.hasPrice} = false AND ${table.priceMinor} IS NULL)
        OR
        (${table.hasPrice} = true AND ${table.priceMinor} IS NOT NULL AND ${table.priceMinor} >= 0)
      )`
    ),
    check(
      "chk_variant_listing_price_variant_doc_positive",
      sql`${table.variantDocId} > 0`
    ),
    check(
      "chk_variant_listing_price_product_doc_positive",
      sql`${table.productDocId} > 0`
    ),
    index("idx_variant_listing_price_value")
      .on(table.storeId, table.currency, table.priceMinor)
      .where(sql`${table.hasPrice} = true`),
    index("idx_variant_listing_price_variant")
      .on(table.storeId, table.currency, table.variantId, table.priceMinor)
      .where(sql`${table.hasPrice} = true`),
    index("idx_variant_listing_price_value_variant")
      .on(table.storeId, table.currency, table.priceMinor, table.variantId)
      .where(sql`${table.hasPrice} = true`),
    index("idx_variant_listing_price_range_covering")
      .on(
        table.storeId,
        table.currency,
        table.priceMinor,
        table.productId,
        table.variantDocId,
        table.productDocId
      )
      .where(sql`${table.hasPrice} = true`),
    index("idx_variant_listing_price_desc_covering")
      .on(
        table.storeId,
        table.currency,
        table.priceMinor.desc(),
        table.productId,
        table.variantDocId,
        table.productDocId
      )
      .where(sql`${table.hasPrice} = true`),
    index("idx_variant_listing_price_product_order")
      .on(
        table.storeId,
        table.currency,
        table.productId,
        table.priceMinor,
        table.variantDocId,
        table.productDocId
      )
      .where(sql`${table.hasPrice} = true`),
  ]
);

export const listingPostingBitmap = listingSchema.table(
  "listing_posting_bitmap",
  {
    storeId: uuid("store_id").notNull(),
    entityType: varchar("entity_type", { length: 16 }).notNull(),
    field: varchar("field", { length: 64 }).notNull(),
    valueKey: text("value_key").notNull(),
    bitmap: roaringbitmap("bitmap").notNull(),
    cardinality: bigint("cardinality", { mode: "number" }).notNull(),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({
      columns: [table.storeId, table.entityType, table.field, table.valueKey],
    }),
    check(
      "chk_listing_posting_bitmap_entity_type",
      sql`${table.entityType} IN ('product', 'variant')`
    ),
    check(
      "chk_listing_posting_bitmap_no_collection_field",
      sql`${table.field} <> 'collection'`
    ),
    check(
      "chk_listing_posting_bitmap_entity_field",
      sql`(
        (${table.entityType} = 'product' AND ${table.field} IN ('category', 'vendor', 'facet'))
        OR
        (${table.entityType} = 'variant' AND ${table.field} IN ('term', 'variant_product'))
      )`
    ),
  ]
);

export const listingPostingProductSort = listingSchema.table(
  "listing_posting_product_sort",
  {
    storeId: uuid("store_id").notNull(),
    productDocId: integer("product_doc_id").notNull(),
    productId: uuid("product_id").notNull(),
    sortKind: varchar("sort_kind", { length: 32 }).notNull(),
    locale: varchar("locale", { length: 16 }).notNull().default(""),
    currency: varchar("currency", { length: 3 }).notNull().default(""),
    manualScopeId: uuid("manual_scope_id")
      .notNull()
      .default(sql`'00000000-0000-0000-0000-000000000000'::uuid`),
    boolValue: boolean("bool_value"),
    timestamptzValue: timestamp("timestamptz_value", {
      withTimezone: true,
      mode: "string",
    }),
    timestamptzValue2: timestamp("timestamptz_value_2", {
      withTimezone: true,
      mode: "string",
    }),
    bigintValue: bigint("bigint_value", { mode: "number" }),
    textValue: text("text_value"),
    numericValue: numeric("numeric_value", { mode: "string" }),
  },
  (table) => [
    primaryKey({
      columns: [
        table.storeId,
        table.productDocId,
        table.sortKind,
        table.locale,
        table.currency,
        table.manualScopeId,
      ],
    }),
    foreignKey({
      name: "fk_listing_posting_product_sort_doc",
      columns: [table.storeId, table.productDocId, table.productId],
      foreignColumns: [
        productListingIndex.storeId,
        productListingIndex.productDocId,
        productListingIndex.productId,
      ],
    }).onDelete("cascade"),
    // SQL migration adds INCLUDE (product_doc_id); Drizzle cannot express INCLUDE.
    index("idx_listing_posting_product_sort_newest").on(
      table.storeId,
      table.sortKind,
      table.locale,
      table.currency,
      table.manualScopeId,
      table.boolValue.desc(),
      table.timestamptzValue.desc().nullsLast(),
      table.timestamptzValue2.desc().nullsLast(),
      table.productId
    ),
    // SQL migration adds INCLUDE (product_doc_id); Drizzle cannot express INCLUDE.
    index("idx_listing_posting_product_sort_text").on(
      table.storeId,
      table.sortKind,
      table.locale,
      table.currency,
      table.manualScopeId,
      table.boolValue.desc(),
      table.textValue.asc().nullsLast(),
      table.productId
    ),
    // SQL migration adds INCLUDE (product_doc_id); Drizzle cannot express INCLUDE.
    index("idx_listing_posting_product_sort_bigint_asc").on(
      table.storeId,
      table.sortKind,
      table.locale,
      table.currency,
      table.manualScopeId,
      table.boolValue.desc(),
      table.bigintValue.asc().nullsLast(),
      table.productId
    ),
    // SQL migration adds INCLUDE (product_doc_id); Drizzle cannot express INCLUDE.
    index("idx_listing_posting_product_sort_bigint_desc").on(
      table.storeId,
      table.sortKind,
      table.locale,
      table.currency,
      table.manualScopeId,
      table.boolValue.desc(),
      table.bigintValue.desc().nullsLast(),
      table.productId
    ),
  ]
);

export const listingPostingVariantProjectionBlock = listingSchema.table(
  "listing_posting_variant_storeion_block",
  {
    storeId: uuid("store_id").notNull(),
    blockId: integer("block_id").notNull(),
    variantDocFrom: integer("variant_doc_from").notNull(),
    variantDocTo: integer("variant_doc_to").notNull(),
    variantBitmap: roaringbitmap("variant_bitmap").notNull(),
    productBitmap: roaringbitmap("product_bitmap").notNull(),
    variantCount: integer("variant_count").notNull(),
    productCount: integer("product_count").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.storeId, table.blockId] }),
    check(
      "chk_listing_storeion_block_id_nonnegative",
      sql`${table.blockId} >= 0`
    ),
    check(
      "chk_listing_storeion_block_range",
      sql`${table.variantDocFrom} >= 0 AND ${table.variantDocTo} > ${table.variantDocFrom}`
    ),
    check(
      "chk_listing_storeion_block_counts_nonnegative",
      sql`${table.variantCount} >= 0 AND ${table.productCount} >= 0`
    ),
    index("idx_listing_storeion_block_range").on(
      table.storeId,
      table.variantDocFrom,
      table.variantDocTo
    ),
  ]
);

export const productTitleBm25SearchIndex = listingSchema.table(
  "product_title_bm25_search_index",
  {
    searchId: uuid("search_id").notNull(),
    storeId: uuid("store_id").notNull(),
    productId: uuid("product_id").notNull(),
    locale: varchar("locale", { length: 8 }).notNull(),
    kind: varchar("kind", { length: 16 }).notNull(),
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
      foreignColumns: [productListingIndex.productId],
    }).onDelete("cascade"),
    check(
      "chk_product_title_bm25_kind",
      sql`${table.kind} IN ('BASE', 'BUNDLE')`
    ),
    check(
      "chk_product_title_bm25_status",
      sql`${table.status} IN ('published', 'draft')`
    ),
    index("idx_product_title_bm25_store_locale_product").on(
      table.storeId,
      table.locale,
      table.productId
    ),
    index("idx_product_title_bm25_visible")
      .on(
        table.storeId,
        table.locale,
        table.publishedAt.desc(),
        table.productId
      )
      .where(sql`${table.status} = 'published'`),
    index("idx_product_title_bm25_search")
      .using(
        "bm25",
        table.searchId,
        table.storeId,
        table.locale,
        table.status,
        table.kind,
        table.productId,
        table.title,
        table.publishedAt,
        table.productCreatedAt
      )
      .with({ key_field: "search_id" }),
  ]
);

export type ListingDocIdAllocator = typeof listingDocIdAllocator.$inferSelect;
export type NewListingDocIdAllocator = typeof listingDocIdAllocator.$inferInsert;

export type ListingIndexItemState = typeof listingIndexItemState.$inferSelect;
export type NewListingIndexItemState =
  typeof listingIndexItemState.$inferInsert;

export type ProductListingIndex = typeof productListingIndex.$inferSelect;
export type NewProductListingIndex = typeof productListingIndex.$inferInsert;

export type ProductListingPriceIndex =
  typeof productListingPriceIndex.$inferSelect;
export type NewProductListingPriceIndex =
  typeof productListingPriceIndex.$inferInsert;

export type VariantListingIndex = typeof variantListingIndex.$inferSelect;
export type NewVariantListingIndex = typeof variantListingIndex.$inferInsert;

export type VariantListingPriceIndex =
  typeof variantListingPriceIndex.$inferSelect;
export type NewVariantListingPriceIndex =
  typeof variantListingPriceIndex.$inferInsert;

export type ListingPostingBitmap = typeof listingPostingBitmap.$inferSelect;
export type NewListingPostingBitmap = typeof listingPostingBitmap.$inferInsert;

export type ListingPostingProductSort =
  typeof listingPostingProductSort.$inferSelect;
export type NewListingPostingProductSort =
  typeof listingPostingProductSort.$inferInsert;

export type ListingPostingVariantProjectionBlock =
  typeof listingPostingVariantProjectionBlock.$inferSelect;
export type NewListingPostingVariantProjectionBlock =
  typeof listingPostingVariantProjectionBlock.$inferInsert;

export type ProductTitleBm25SearchIndex =
  typeof productTitleBm25SearchIndex.$inferSelect;
export type NewProductTitleBm25SearchIndex =
  typeof productTitleBm25SearchIndex.$inferInsert;
