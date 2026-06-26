import { sql } from "drizzle-orm";
import {
  boolean,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { catalogSchema } from "./schema";

export const variantWarehouseCandidateView = catalogSchema
  .view("variant_warehouse_candidate_view", {
    projectId: uuid("project_id").notNull(),
    warehouseScopeId: uuid("warehouse_scope_id").notNull(),
    productId: uuid("product_id").notNull(),
    locale: varchar("locale", { length: 8 }).notNull(),
    productName: text("product_name").notNull(),
    id: uuid("id").notNull(),
    isDefault: boolean("is_default").notNull(),
    handle: varchar("handle", { length: 255 }).notNull(),
    sku: varchar("sku", { length: 64 }),
    externalSystem: varchar("external_system", { length: 32 }),
    externalId: text("external_id"),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
    productDeletedAt: timestamp("product_deleted_at", {
      withTimezone: true,
      mode: "string",
    }),
    inventoryItemId: uuid("inventory_item_id"),
  })
  .as(sql`
    SELECT
      variant.project_id,
      warehouse.id AS warehouse_scope_id,
      variant.product_id,
      translation.locale,
      translation.name AS product_name,
      variant.id,
      variant.is_default,
      variant.handle,
      variant.sku,
      variant.external_system,
      variant.external_id,
      variant.updated_at,
      variant.created_at,
      variant.deleted_at,
      product.deleted_at AS product_deleted_at,
      item.id AS inventory_item_id
    FROM catalog.variant variant
    JOIN catalog.product product
      ON product.project_id = variant.project_id
     AND product.id = variant.product_id
    JOIN catalog.warehouses warehouse
      ON warehouse.project_id = variant.project_id
    JOIN catalog.product_translation translation
      ON translation.project_id = variant.project_id
     AND translation.product_id = product.id
    LEFT JOIN catalog.inventory_item item
      ON item.project_id = variant.project_id
     AND item.variant_id = variant.id
    LEFT JOIN catalog.warehouse_stock stock
      ON stock.project_id = variant.project_id
     AND stock.variant_id = variant.id
     AND stock.warehouse_id = warehouse.id
    WHERE stock.id IS NULL
  `);

export type VariantWarehouseCandidateView =
  typeof variantWarehouseCandidateView.$inferSelect;
