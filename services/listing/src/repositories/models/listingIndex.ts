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
    projectId: uuid("project_id").notNull(),
    nextProductDocId: integer("next_product_doc_id").notNull().default(1),
    nextVariantDocId: integer("next_variant_doc_id").notNull().default(1),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.projectId] }),
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

export const productListingIndex = listingSchema.table(
  "product_listing_index",
  {
    projectId: uuid("project_id").notNull(),
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
    unique("product_listing_project_doc_unique").on(
      table.projectId,
      table.productDocId
    ),
    unique("product_listing_project_product_unique").on(
      table.projectId,
      table.productId
    ),
    unique("product_listing_project_doc_product_unique").on(
      table.projectId,
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
    index("idx_product_listing_project_product").on(
      table.projectId,
      table.productId
    ),
    index("idx_product_listing_project_doc").on(
      table.projectId,
      table.productDocId
    ),
    index("idx_product_listing_visible_newest")
      .on(
        table.projectId,
        table.inStock.desc(),
        table.publishedAt.desc().nullsLast(),
        table.productCreatedAt.desc(),
        table.productId
      )
      .where(sql`${table.status} = 'published'`),
    index("idx_product_listing_visible_created")
      .on(
        table.projectId,
        table.inStock.desc(),
        table.productCreatedAt.desc(),
        table.productId
      )
      .where(sql`${table.status} = 'published'`),
    index("idx_product_listing_vendor")
      .on(table.projectId, table.vendorId)
      .where(sql`${table.vendorId} IS NOT NULL`),
    index("idx_product_listing_in_stock").on(table.projectId, table.inStock),
  ]
);

export const productListingPriceIndex = listingSchema.table(
  "product_listing_price_index",
  {
    projectId: uuid("project_id").notNull(),
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
      name: "fk_product_listing_price_project_product",
      columns: [table.projectId, table.productId],
      foreignColumns: [
        productListingIndex.projectId,
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
        table.projectId,
        table.currency,
        table.minPriceMinor.asc(),
        table.productId
      )
      .where(sql`${table.hasPrice} = true`),
    index("idx_product_listing_price_visible_desc")
      .on(
        table.projectId,
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
    projectId: uuid("project_id").notNull(),
    productId: uuid("product_id").notNull(),
    productDocId: integer("product_doc_id").notNull(),
    variantId: uuid("variant_id").primaryKey(),
    variantDocId: integer("variant_doc_id").notNull(),
    signatureKey: text("signature_key"),
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
    unique("variant_listing_project_product_variant_unique").on(
      table.productId,
      table.variantId
    ),
    unique("variant_listing_project_variant_unique").on(
      table.projectId,
      table.variantId
    ),
    unique("variant_listing_project_doc_unique").on(
      table.projectId,
      table.variantDocId
    ),
    unique("variant_listing_project_doc_variant_unique").on(
      table.projectId,
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
      columns: [table.projectId, table.productDocId, table.productId],
      foreignColumns: [
        productListingIndex.projectId,
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
    index("idx_variant_listing_project_product").on(
      table.projectId,
      table.productId
    ),
    index("idx_variant_listing_project_variant").on(
      table.projectId,
      table.variantId
    ),
    index("idx_variant_listing_project_doc").on(
      table.projectId,
      table.variantDocId
    ),
    index("idx_variant_listing_in_stock").on(table.projectId, table.inStock),
    index("idx_variant_listing_in_stock_product_variant")
      .on(
        table.projectId,
        table.productDocId,
        table.productId,
        table.variantDocId,
        table.variantId
      )
      .where(sql`${table.inStock} = true`),
    index("idx_variant_listing_signature")
      .on(
        table.projectId,
        table.signatureKey,
        table.variantDocId,
        table.productDocId
      )
      .where(sql`${table.signatureKey} IS NOT NULL`),
  ]
);

export const variantListingPriceIndex = listingSchema.table(
  "variant_listing_price_index",
  {
    projectId: uuid("project_id").notNull(),
    variantId: uuid("variant_id").notNull(),
    currency: varchar("currency", { length: 3 }).notNull(),
    variantDocId: integer("variant_doc_id"),
    productDocId: integer("product_doc_id"),
    productId: uuid("product_id"),
    signatureKey: text("signature_key"),
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
      name: "fk_variant_listing_price_project_variant",
      columns: [table.projectId, table.variantId],
      foreignColumns: [
        variantListingIndex.projectId,
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
      sql`${table.variantDocId} IS NULL OR ${table.variantDocId} > 0`
    ),
    check(
      "chk_variant_listing_price_product_doc_positive",
      sql`${table.productDocId} IS NULL OR ${table.productDocId} > 0`
    ),
    index("idx_variant_listing_price_value")
      .on(table.projectId, table.currency, table.priceMinor)
      .where(sql`${table.hasPrice} = true`),
    index("idx_variant_listing_price_variant")
      .on(table.projectId, table.currency, table.variantId, table.priceMinor)
      .where(sql`${table.hasPrice} = true`),
    index("idx_variant_listing_price_value_variant")
      .on(table.projectId, table.currency, table.priceMinor, table.variantId)
      .where(sql`${table.hasPrice} = true`),
    index("idx_variant_listing_price_signature_range")
      .on(
        table.projectId,
        table.signatureKey,
        table.currency,
        table.priceMinor,
        table.productDocId,
        table.variantDocId
      )
      .where(sql`${table.hasPrice} = true AND ${table.signatureKey} IS NOT NULL`),
  ]
);

export const listingOptionSignature = listingSchema.table(
  "listing_option_signature",
  {
    optionSignatureId: uuid("option_signature_id").notNull(),
    projectId: uuid("project_id").notNull(),
    signatureKey: text("signature_key").notNull(),
    optionValueCount: integer("option_value_count").notNull(),
    productBitmap: roaringbitmap("product_bitmap").notNull(),
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
      name: "listing_option_signature_pkey",
      columns: [table.optionSignatureId],
    }),
    unique("listing_option_signature_project_signature_unique").on(
      table.projectId,
      table.signatureKey
    ),
    check(
      "chk_listing_option_signature_key_nonempty",
      sql`length(btrim(${table.signatureKey})) > 0`
    ),
    check(
      "chk_listing_option_signature_value_count_positive",
      sql`${table.optionValueCount} > 0`
    ),
    check(
      "chk_listing_option_signature_cardinality_nonnegative",
      sql`${table.cardinality} >= 0`
    ),
  ]
);

export const listingOptionSignatureValue = listingSchema.table(
  "listing_option_signature_value",
  {
    optionSignatureId: uuid("option_signature_id").notNull(),
    projectId: uuid("project_id").notNull(),
    signatureKey: text("signature_key").notNull(),
    facetId: uuid("facet_id").notNull(),
    valueKey: text("value_key").notNull(),
  },
  (table) => [
    primaryKey({
      name: "listing_option_signature_value_pkey",
      columns: [table.optionSignatureId, table.valueKey],
    }),
    foreignKey({
      name: "fk_listing_option_signature_value_signature",
      columns: [table.optionSignatureId],
      foreignColumns: [listingOptionSignature.optionSignatureId],
    }).onDelete("cascade"),
    check(
      "chk_listing_option_signature_value_signature_key_nonempty",
      sql`length(btrim(${table.signatureKey})) > 0`
    ),
    check(
      "chk_listing_option_signature_value_value_key_nonempty",
      sql`length(btrim(${table.valueKey})) > 0`
    ),
    index("idx_listing_option_signature_value_lookup").on(
      table.projectId,
      table.valueKey,
      table.signatureKey
    ),
  ]
);

export const listingOptionSignatureProductMembership = listingSchema.table(
  "listing_option_signature_product_membership",
  {
    optionSignatureId: uuid("option_signature_id").notNull(),
    projectId: uuid("project_id").notNull(),
    signatureKey: text("signature_key").notNull(),
    productDocId: integer("product_doc_id").notNull(),
    variantCount: integer("variant_count").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({
      name: "listing_option_signature_product_membership_pkey",
      columns: [table.optionSignatureId, table.productDocId],
    }),
    foreignKey({
      name: "fk_listing_option_signature_membership_signature",
      columns: [table.optionSignatureId],
      foreignColumns: [listingOptionSignature.optionSignatureId],
    }).onDelete("cascade"),
    check(
      "chk_listing_option_signature_membership_signature_key_nonempty",
      sql`length(btrim(${table.signatureKey})) > 0`
    ),
    check(
      "chk_listing_option_signature_membership_product_doc_positive",
      sql`${table.productDocId} > 0`
    ),
    check(
      "chk_listing_option_signature_membership_variant_count_positive",
      sql`${table.variantCount} > 0`
    ),
    index("idx_listing_option_signature_membership_lookup").on(
      table.projectId,
      table.signatureKey,
      table.productDocId
    ),
  ]
);

export const listingPostingBitmap = listingSchema.table(
  "listing_posting_bitmap",
  {
    projectId: uuid("project_id").notNull(),
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
      columns: [table.projectId, table.entityType, table.field, table.valueKey],
    }),
    check(
      "chk_listing_posting_bitmap_entity_type",
      sql`${table.entityType} IN ('product', 'variant')`
    ),
  ]
);

export const listingPostingProductSort = listingSchema.table(
  "listing_posting_product_sort",
  {
    projectId: uuid("project_id").notNull(),
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
        table.projectId,
        table.productDocId,
        table.sortKind,
        table.locale,
        table.currency,
        table.manualScopeId,
      ],
    }),
    foreignKey({
      name: "fk_listing_posting_product_sort_doc",
      columns: [table.projectId, table.productDocId, table.productId],
      foreignColumns: [
        productListingIndex.projectId,
        productListingIndex.productDocId,
        productListingIndex.productId,
      ],
    }).onDelete("cascade"),
    // SQL migration adds INCLUDE (product_doc_id); Drizzle cannot express INCLUDE.
    index("idx_listing_posting_product_sort_newest").on(
      table.projectId,
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
      table.projectId,
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
      table.projectId,
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
      table.projectId,
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

export const listingPostingVariantPrice = listingSchema.table(
  "listing_posting_variant_price",
  {
    projectId: uuid("project_id").notNull(),
    currency: varchar("currency", { length: 3 }).notNull(),
    variantDocId: integer("variant_doc_id").notNull(),
    productDocId: integer("product_doc_id").notNull(),
    productId: uuid("product_id").notNull(),
    priceMinor: bigint("price_minor", { mode: "number" }).notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.projectId, table.currency, table.variantDocId],
    }),
    foreignKey({
      name: "fk_listing_posting_variant_price_doc",
      columns: [
        table.projectId,
        table.variantDocId,
        table.productDocId,
        table.productId,
      ],
      foreignColumns: [
        variantListingIndex.projectId,
        variantListingIndex.variantDocId,
        variantListingIndex.productDocId,
        variantListingIndex.productId,
      ],
    }).onDelete("cascade"),
    index("idx_listing_posting_variant_price_range").on(
      table.projectId,
      table.currency,
      table.priceMinor,
      table.productId,
      table.variantDocId,
      table.productDocId
    ),
    index("idx_listing_posting_variant_price_desc").on(
      table.projectId,
      table.currency,
      table.priceMinor.desc(),
      table.productId,
      table.variantDocId,
      table.productDocId
    ),
    index("idx_listing_posting_variant_price_product_order").on(
      table.projectId,
      table.currency,
      table.productId,
      table.priceMinor,
      table.variantDocId,
      table.productDocId
    ),
  ]
);

export const listingPostingVariantProjectionBlock = listingSchema.table(
  "listing_posting_variant_projection_block",
  {
    projectId: uuid("project_id").notNull(),
    blockId: integer("block_id").notNull(),
    variantDocFrom: integer("variant_doc_from").notNull(),
    variantDocTo: integer("variant_doc_to").notNull(),
    variantBitmap: roaringbitmap("variant_bitmap").notNull(),
    productBitmap: roaringbitmap("product_bitmap").notNull(),
    variantCount: integer("variant_count").notNull(),
    productCount: integer("product_count").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.projectId, table.blockId] }),
    check(
      "chk_listing_projection_block_id_nonnegative",
      sql`${table.blockId} >= 0`
    ),
    check(
      "chk_listing_projection_block_range",
      sql`${table.variantDocFrom} >= 0 AND ${table.variantDocTo} > ${table.variantDocFrom}`
    ),
    check(
      "chk_listing_projection_block_counts_nonnegative",
      sql`${table.variantCount} >= 0 AND ${table.productCount} >= 0`
    ),
    index("idx_listing_projection_block_range").on(
      table.projectId,
      table.variantDocFrom,
      table.variantDocTo
    ),
  ]
);

export const productTitleBm25SearchIndex = listingSchema.table(
  "product_title_bm25_search_index",
  {
    searchId: uuid("search_id").notNull(),
    projectId: uuid("project_id").notNull(),
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
    index("idx_product_title_bm25_project_locale_product").on(
      table.projectId,
      table.locale,
      table.productId
    ),
    index("idx_product_title_bm25_visible")
      .on(
        table.projectId,
        table.locale,
        table.publishedAt.desc(),
        table.productId
      )
      .where(sql`${table.status} = 'published'`),
    index("idx_product_title_bm25_search")
      .using(
        "bm25",
        table.searchId,
        table.projectId,
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

export type ListingOptionSignature =
  typeof listingOptionSignature.$inferSelect;
export type NewListingOptionSignature =
  typeof listingOptionSignature.$inferInsert;

export type ListingOptionSignatureValue =
  typeof listingOptionSignatureValue.$inferSelect;
export type NewListingOptionSignatureValue =
  typeof listingOptionSignatureValue.$inferInsert;

export type ListingOptionSignatureProductMembership =
  typeof listingOptionSignatureProductMembership.$inferSelect;
export type NewListingOptionSignatureProductMembership =
  typeof listingOptionSignatureProductMembership.$inferInsert;

export type ListingPostingBitmap = typeof listingPostingBitmap.$inferSelect;
export type NewListingPostingBitmap = typeof listingPostingBitmap.$inferInsert;

export type ListingPostingProductSort =
  typeof listingPostingProductSort.$inferSelect;
export type NewListingPostingProductSort =
  typeof listingPostingProductSort.$inferInsert;

export type ListingPostingVariantPrice =
  typeof listingPostingVariantPrice.$inferSelect;
export type NewListingPostingVariantPrice =
  typeof listingPostingVariantPrice.$inferInsert;

export type ListingPostingVariantProjectionBlock =
  typeof listingPostingVariantProjectionBlock.$inferSelect;
export type NewListingPostingVariantProjectionBlock =
  typeof listingPostingVariantProjectionBlock.$inferInsert;

export type ProductTitleBm25SearchIndex =
  typeof productTitleBm25SearchIndex.$inferSelect;
export type NewProductTitleBm25SearchIndex =
  typeof productTitleBm25SearchIndex.$inferInsert;
