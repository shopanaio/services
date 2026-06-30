import {
  uuid,
  integer,
  primaryKey,
  index,
  timestamp,
  unique,
  foreignKey,
} from "drizzle-orm/pg-core";
import { catalogSchema } from "./schema";
import { product, variant } from "./products";

// ─────────────────────────────────────────────────────────────────────────────
// Product Media Registry
// ─────────────────────────────────────────────────────────────────────────────
// Registers media files on products. file_id references the Media service
// without a cross-service FK.

export const productMedia = catalogSchema.table(
  "product_media",
  {
    projectId: uuid("project_id").notNull(),
    productId: uuid("product_id").notNull(),
    id: uuid("id").primaryKey(),
    fileId: uuid("file_id").notNull(),
    sortIndex: integer("sort_index").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("product_media_project_id_product_id_file_id_unique").on(
      table.projectId,
      table.productId,
      table.fileId
    ),
    unique("product_media_project_id_product_id_id_unique").on(
      table.projectId,
      table.productId,
      table.id
    ),
    unique("product_media_project_id_id_unique").on(
      table.projectId,
      table.id
    ),
    index("idx_product_media_project").on(table.projectId),
    index("idx_product_media_product").on(table.projectId, table.productId),
    index("idx_product_media_file").on(table.projectId, table.fileId),
    index("idx_product_media_sort").on(
      table.projectId,
      table.productId,
      table.sortIndex
    ),
    foreignKey({
      name: "product_media_product_fk",
      columns: [table.projectId, table.productId],
      foreignColumns: [product.projectId, product.id],
    }).onDelete("cascade"),
  ]
);

// ─────────────────────────────────────────────────────────────────────────────
// Variant Media (many-to-many through product_media)
// ─────────────────────────────────────────────────────────────────────────────
// Links variants to registered product media entries and lets PostgreSQL enforce
// that a variant only attaches media from its own product.

export const variantMedia = catalogSchema.table(
  "variant_media",
  {
    projectId: uuid("project_id").notNull(),
    productId: uuid("product_id").notNull(),
    variantId: uuid("variant_id").notNull(),
    productMediaId: uuid("product_media_id").notNull(),
    sortIndex: integer("sort_index").notNull().default(0),
  },
  (table) => [
    primaryKey({
      columns: [table.projectId, table.variantId, table.productMediaId],
    }),
    index("idx_variant_media_project").on(table.projectId),
    index("idx_variant_media_product").on(table.projectId, table.productId),
    index("idx_variant_media_variant").on(table.projectId, table.variantId),
    index("idx_variant_media_product_media").on(
      table.projectId,
      table.productMediaId
    ),
    index("idx_variant_media_sort").on(
      table.projectId,
      table.variantId,
      table.sortIndex
    ),
    foreignKey({
      name: "variant_media_product_media_fk",
      columns: [table.projectId, table.productId, table.productMediaId],
      foreignColumns: [
        productMedia.projectId,
        productMedia.productId,
        productMedia.id,
      ],
    }).onDelete("cascade"),
    foreignKey({
      name: "variant_media_variant_fk",
      columns: [table.projectId, table.productId, table.variantId],
      foreignColumns: [variant.projectId, variant.productId, variant.id],
    }).onDelete("cascade"),
  ]
);

export type ProductMedia = typeof productMedia.$inferSelect;
export type NewProductMedia = typeof productMedia.$inferInsert;
export type VariantMedia = typeof variantMedia.$inferSelect;
export type NewVariantMedia = typeof variantMedia.$inferInsert;
