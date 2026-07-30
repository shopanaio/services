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
import { eq, sql } from "drizzle-orm";
import { catalogSchema } from "./schema";
import { vendor } from "./vendors";

export const productRegistry = catalogSchema.table(
  "product_registry",
  {
    storeId: uuid("store_id").notNull(),
    id: uuid("id").primaryKey(),
    handle: varchar("handle", { length: 255 }),
    publishedAt: timestamp("published_at", { withTimezone: true, mode: "string" }),
    ownerType: varchar("owner_type", { length: 16 }).notNull().default("NATIVE"),
    ownerAppCode: varchar("owner_app_code", { length: 128 }),
    ownerInstallationId: uuid("owner_installation_id"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
    revision: integer("revision").notNull().default(0),
  },
  (table) => [
    check(
      "product_registry_published_requires_handle",
      sql`published_at IS NULL OR handle IS NOT NULL`
    ),
    check(
      "product_registry_owner_type_check",
      sql`owner_type IN ('NATIVE', 'APP')`
    ),
    check(
      "product_registry_owner_consistency_check",
      sql`(
        owner_type = 'NATIVE'
        AND owner_app_code IS NULL
        AND owner_installation_id IS NULL
      ) OR (
        owner_type = 'APP'
        AND owner_app_code IS NOT NULL
        AND owner_installation_id IS NOT NULL
      )`
    ),
    uniqueIndex("product_registry_store_id_handle_key")
      .on(table.storeId, table.handle)
      .where(sql`deleted_at IS NULL AND handle IS NOT NULL`),
    unique("product_registry_store_id_id_unique").on(table.storeId, table.id),
    index("idx_product_registry_store_id").on(table.storeId),
    index("idx_product_registry_owner").on(
      table.storeId,
      table.ownerType,
      table.ownerAppCode
    ),
    index("idx_product_registry_owner_installation").on(
      table.ownerInstallationId
    ),
    index("idx_product_registry_created_at").on(table.createdAt),
    index("idx_product_registry_updated_at").on(table.updatedAt),
    index("idx_product_registry_deleted_at")
      .on(table.deletedAt)
      .where(sql`deleted_at IS NOT NULL`),
    index("idx_product_registry_revision").on(table.id, table.revision),
  ]
);

export const product = catalogSchema.table(
  "product",
  {
    storeId: uuid("store_id").notNull(),
    id: uuid("id").primaryKey(),
    vendorId: uuid("vendor_id"),
  },
  (table) => [
    unique("product_store_id_id_unique").on(table.storeId, table.id),
    index("idx_product_store_id").on(table.storeId),
    index("idx_product_vendor_id").on(table.vendorId),
    foreignKey({
      name: "product_registry_id_fk",
      columns: [table.id],
      foreignColumns: [productRegistry.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "product_vendor_fk",
      columns: [table.vendorId],
      foreignColumns: [vendor.id],
    }),
  ]
);

export const productReadView = catalogSchema.view("product_read_view").as((qb) =>
  qb
    .select({
      storeId: productRegistry.storeId,
      id: productRegistry.id,
      vendorId: product.vendorId,
      handle: productRegistry.handle,
      publishedAt: productRegistry.publishedAt,
      ownerType: productRegistry.ownerType,
      ownerAppCode: productRegistry.ownerAppCode,
      ownerInstallationId: productRegistry.ownerInstallationId,
      createdAt: productRegistry.createdAt,
      updatedAt: productRegistry.updatedAt,
      deletedAt: productRegistry.deletedAt,
      revision: productRegistry.revision,
    })
    .from(productRegistry)
    .innerJoin(product, eq(product.id, productRegistry.id))
);

export const variant = catalogSchema.table(
  "variant",
  {
    storeId: uuid("store_id").notNull(),
    productId: uuid("product_id").notNull(),
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
    uniqueIndex("variant_store_id_sku_key")
      .on(table.storeId, table.sku)
      .where(sql`deleted_at IS NULL AND sku IS NOT NULL`),
    uniqueIndex("variant_store_id_external_system_external_id_key")
      .on(table.storeId, table.externalSystem, table.externalId)
      .where(sql`deleted_at IS NULL AND external_id IS NOT NULL`),
    unique("variant_store_id_product_id_id_unique").on(
      table.storeId,
      table.productId,
      table.id
    ),
    index("idx_variant_store_id").on(table.storeId),
    index("idx_variant_product_id").on(table.productId),
    index("idx_variant_product_active")
      .on(table.productId)
      .where(sql`deleted_at IS NULL`),
    index("idx_variant_created_at").on(table.createdAt),
    index("idx_variant_updated_at").on(table.updatedAt),
    index("idx_variant_deleted_at")
      .on(table.deletedAt)
      .where(sql`deleted_at IS NOT NULL`),
  ]
);

export type ProductRegistry = typeof productRegistry.$inferSelect;
export type NewProductRegistry = typeof productRegistry.$inferInsert;
export type ProductRecord = typeof product.$inferSelect;
export type NewProductRecord = typeof product.$inferInsert;
export type Product = typeof productReadView.$inferSelect;
export type Variant = typeof variant.$inferSelect;
export type NewVariant = typeof variant.$inferInsert;
