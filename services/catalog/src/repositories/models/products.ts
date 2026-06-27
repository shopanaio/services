import {
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  index,
  unique,
  uniqueIndex,
  check,
  foreignKey,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { catalogSchema } from "./schema";
import { vendor } from "./vendors";

export const productKindEnum = catalogSchema.enum("product_kind", [
  "BASE",
  "BUNDLE",
]);

export const product = catalogSchema.table(
  "product",
  {
    projectId: uuid("project_id").notNull(),
    id: uuid("id").primaryKey(),
    vendorId: uuid("vendor_id"),
    handle: varchar("handle", { length: 255 }),
    publishedAt: timestamp("published_at", { withTimezone: true, mode: "string" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
    revision: integer("revision").notNull().default(0),
    kind: productKindEnum("kind").notNull().default("BASE"),
  },
  (table) => [
    check(
      "product_published_requires_handle",
      sql`published_at IS NULL OR handle IS NOT NULL`
    ),
    uniqueIndex("product_project_id_handle_key")
      .on(table.projectId, table.handle)
      .where(sql`deleted_at IS NULL AND handle IS NOT NULL`),
    uniqueIndex("product_id_kind_unique").on(table.id, table.kind),
    unique("product_project_id_id_unique").on(table.projectId, table.id),
    index("idx_product_project_id").on(table.projectId),
    index("idx_product_vendor_id").on(table.vendorId),
    index("idx_product_created_at").on(table.createdAt),
    index("idx_product_updated_at").on(table.updatedAt),
    index("idx_product_deleted_at")
      .on(table.deletedAt)
      .where(sql`deleted_at IS NOT NULL`),
    index("idx_product_revision").on(table.id, table.revision),
    foreignKey({
      name: "product_vendor_fk",
      columns: [table.projectId, table.vendorId],
      foreignColumns: [vendor.projectId, vendor.id],
    }),
  ]
);

export const variant = catalogSchema.table(
  "variant",
  {
    projectId: uuid("project_id").notNull(),
    productId: uuid("product_id").notNull(),
    kind: productKindEnum("kind").notNull().default("BASE"),
    id: uuid("id").primaryKey(),
    isDefault: boolean("is_default").notNull().default(false),
    handle: varchar("handle", { length: 255 }).notNull(),
    sku: varchar("sku", { length: 64 }),
    externalSystem: varchar("external_system", { length: 32 }),
    externalId: text("external_id"),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
  },
  (table) => [
    check(
      "variant_handle_required_if_not_default",
      sql`is_default = true OR length(handle) > 0`
    ),
    uniqueIndex("variant_product_id_default_key")
      .on(table.productId)
      .where(sql`is_default = true AND deleted_at IS NULL`),
    uniqueIndex("variant_product_id_handle_key")
      .on(table.productId, table.handle)
      .where(sql`deleted_at IS NULL`),
    uniqueIndex("variant_project_id_sku_key")
      .on(table.projectId, table.sku)
      .where(sql`deleted_at IS NULL AND sku IS NOT NULL`),
    uniqueIndex("variant_project_id_external_system_external_id_key")
      .on(table.projectId, table.externalSystem, table.externalId)
      .where(sql`deleted_at IS NULL AND external_id IS NOT NULL`),
    unique("variant_project_id_product_id_id_unique").on(
      table.projectId,
      table.productId,
      table.id
    ),
    index("idx_variant_project_id").on(table.projectId),
    index("idx_variant_product_id").on(table.productId),
    index("idx_variant_product_active")
      .on(table.productId)
      .where(sql`deleted_at IS NULL`),
    index("idx_variant_created_at").on(table.createdAt),
    index("idx_variant_updated_at").on(table.updatedAt),
    index("idx_variant_deleted_at")
      .on(table.deletedAt)
      .where(sql`deleted_at IS NOT NULL`),
    foreignKey({
      name: "variant_product_kind_fk",
      columns: [table.productId, table.kind],
      foreignColumns: [product.id, product.kind],
    }).onDelete("cascade"),
  ]
);

export type Product = typeof product.$inferSelect;
export type NewProduct = typeof product.$inferInsert;
export type Variant = typeof variant.$inferSelect;
export type NewVariant = typeof variant.$inferInsert;
