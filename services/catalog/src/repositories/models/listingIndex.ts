import {
  bigint,
  boolean,
  check,
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
import { catalogSchema } from "./schema";
import { product, productKindEnum, variant } from "./products";
import { facet, facetValue } from "./facet";

export const productListingIndex = catalogSchema.table(
  "product_listing_index",
  {
    projectId: uuid("project_id").notNull(),
    productId: uuid("product_id").notNull(),
    kind: productKindEnum("kind").notNull(),
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
    tagHandles: text("tag_handles")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    featureValueHandles: text("feature_value_handles")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    categoryHandles: text("category_handles")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
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
    primaryKey({
      name: "product_listing_index_pkey",
      columns: [table.productId],
    }),
    foreignKey({
      name: "fk_product_listing_product",
      columns: [table.productId],
      foreignColumns: [product.id],
    }).onDelete("cascade"),
    check(
      "chk_product_listing_status",
      sql`${table.status} IN ('published', 'draft')`
    ),
    index("idx_product_listing_project_product").on(
      table.projectId,
      table.productId
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
    index("idx_product_listing_category_handles_gin").using(
      "gin",
      table.categoryHandles
    ),
  ]
);

export const productListingPriceIndex = catalogSchema.table(
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
    primaryKey({
      name: "product_listing_price_index_pkey",
      columns: [table.productId, table.currency],
    }),
    foreignKey({
      name: "fk_product_listing_price_product",
      columns: [table.productId],
      foreignColumns: [productListingIndex.productId],
    }).onDelete("cascade"),
    index("idx_product_listing_price_visible_asc")
      .on(table.projectId, table.currency, table.minPriceMinor, table.productId)
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

export const variantListingIndex = catalogSchema.table(
  "variant_listing_index",
  {
    projectId: uuid("project_id").notNull(),
    productId: uuid("product_id").notNull(),
    variantId: uuid("variant_id").notNull(),
    kind: productKindEnum("kind").notNull(),
    variantCreatedAt: timestamp("variant_created_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    variantUpdatedAt: timestamp("variant_updated_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    optionValueHandles: text("option_value_handles")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
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
    primaryKey({
      name: "variant_listing_index_pkey",
      columns: [table.variantId],
    }),
    unique("variant_listing_product_variant_unique").on(
      table.productId,
      table.variantId
    ),
    foreignKey({
      name: "fk_variant_listing_product",
      columns: [table.productId],
      foreignColumns: [productListingIndex.productId],
    }).onDelete("cascade"),
    foreignKey({
      name: "fk_variant_listing_variant",
      columns: [table.variantId],
      foreignColumns: [variant.id],
    }).onDelete("cascade"),
    index("idx_variant_listing_project_product").on(
      table.projectId,
      table.productId
    ),
    index("idx_variant_listing_project_variant").on(
      table.projectId,
      table.variantId
    ),
    index("idx_variant_listing_in_stock").on(table.projectId, table.inStock),
  ]
);

export const variantListingPriceIndex = catalogSchema.table(
  "variant_listing_price_index",
  {
    projectId: uuid("project_id").notNull(),
    productId: uuid("product_id").notNull(),
    variantId: uuid("variant_id").notNull(),
    currency: varchar("currency", { length: 3 }).notNull(),
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
    primaryKey({
      name: "variant_listing_price_index_pkey",
      columns: [table.variantId, table.currency],
    }),
    foreignKey({
      name: "fk_variant_listing_price_variant",
      columns: [table.variantId],
      foreignColumns: [variantListingIndex.variantId],
    }).onDelete("cascade"),
    index("idx_variant_listing_price_product")
      .on(table.projectId, table.currency, table.productId, table.priceMinor)
      .where(sql`${table.hasPrice} = true`),
    index("idx_variant_listing_price_value")
      .on(table.projectId, table.currency, table.priceMinor)
      .where(sql`${table.hasPrice} = true`),
  ]
);

export const productListingFacetToken = catalogSchema.table(
  "product_listing_facet_token",
  {
    projectId: uuid("project_id").notNull(),
    productId: uuid("product_id").notNull(),
    facetId: uuid("facet_id").notNull(),
    facetValueId: uuid("facet_value_id").notNull(),
    facetType: varchar("facet_type", { length: 16 }).notNull(),
    indexedAt: timestamp("indexed_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({
      name: "product_listing_facet_token_pkey",
      columns: [table.productId, table.facetId, table.facetValueId],
    }),
    foreignKey({
      name: "fk_product_listing_facet_token_product",
      columns: [table.productId],
      foreignColumns: [productListingIndex.productId],
    }).onDelete("cascade"),
    foreignKey({
      name: "fk_product_listing_facet_token_facet",
      columns: [table.facetId],
      foreignColumns: [facet.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "fk_product_listing_facet_token_value",
      columns: [table.facetValueId],
      foreignColumns: [facetValue.id],
    }).onDelete("cascade"),
    check(
      "chk_product_listing_facet_token_type",
      sql`${table.facetType} IN ('tag', 'feature')`
    ),
    index("idx_product_listing_facet_token_count").on(
      table.projectId,
      table.facetId,
      table.facetValueId,
      table.productId
    ),
    index("idx_product_listing_facet_token_product").on(
      table.projectId,
      table.productId,
      table.facetId,
      table.facetValueId
    ),
  ]
);

export const variantListingFacetToken = catalogSchema.table(
  "variant_listing_facet_token",
  {
    projectId: uuid("project_id").notNull(),
    productId: uuid("product_id").notNull(),
    variantId: uuid("variant_id").notNull(),
    facetId: uuid("facet_id").notNull(),
    facetValueId: uuid("facet_value_id").notNull(),
    indexedAt: timestamp("indexed_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({
      name: "variant_listing_facet_token_pkey",
      columns: [table.variantId, table.facetId, table.facetValueId],
    }),
    foreignKey({
      name: "fk_variant_listing_facet_token_variant",
      columns: [table.variantId],
      foreignColumns: [variantListingIndex.variantId],
    }).onDelete("cascade"),
    foreignKey({
      name: "fk_variant_listing_facet_token_facet",
      columns: [table.facetId],
      foreignColumns: [facet.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "fk_variant_listing_facet_token_value",
      columns: [table.facetValueId],
      foreignColumns: [facetValue.id],
    }).onDelete("cascade"),
    index("idx_variant_listing_facet_token_count").on(
      table.projectId,
      table.facetId,
      table.facetValueId,
      table.productId,
      table.variantId
    ),
    index("idx_variant_listing_facet_token_variant").on(
      table.projectId,
      table.variantId,
      table.facetId,
      table.facetValueId
    ),
    index("idx_variant_listing_facet_token_product").on(
      table.projectId,
      table.productId,
      table.facetId,
      table.facetValueId
    ),
  ]
);

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
export type ProductListingFacetToken =
  typeof productListingFacetToken.$inferSelect;
export type NewProductListingFacetToken =
  typeof productListingFacetToken.$inferInsert;
export type VariantListingFacetToken =
  typeof variantListingFacetToken.$inferSelect;
export type NewVariantListingFacetToken =
  typeof variantListingFacetToken.$inferInsert;
