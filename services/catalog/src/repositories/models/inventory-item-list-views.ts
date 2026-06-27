import { sql } from "drizzle-orm";
import {
  boolean,
  integer,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { productKindEnum } from "./products";
import { catalogSchema } from "./schema";

const inventoryItemListViewColumns = {
  projectId: uuid("project_id").notNull(),
  id: uuid("id").notNull(),
  variantId: uuid("variant_id").notNull(),
  productId: uuid("product_id").notNull(),
  kind: productKindEnum("kind").notNull(),
  productHandle: text("product_handle"),
  locale: varchar("locale", { length: 8 }).notNull(),
  productName: text("product_name").notNull(),
  sku: varchar("sku", { length: 255 }),
  trackInventory: boolean("track_inventory").notNull(),
  continueSellingWhenOutOfStock: boolean(
    "continue_selling_when_out_of_stock"
  ).notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
  updatedAt: timestamp("updated_at", {
    withTimezone: true,
    mode: "string",
  }).notNull(),
  quantityOnHand: integer("quantity_on_hand").notNull(),
  reservedQuantity: integer("reserved_quantity").notNull(),
  unavailableQuantity: integer("unavailable_quantity").notNull(),
  availableForSale: integer("available_for_sale").notNull(),
};

export const inventoryItemListAllStockView = catalogSchema
  .view("inventory_item_list_all_stock_view", inventoryItemListViewColumns)
  .as(sql`
    SELECT
      item.project_id,
      item.id,
      item.variant_id,
      product.id AS product_id,
      variant.kind,
      product.handle AS product_handle,
      translation.locale,
      translation.name AS product_name,
      item.sku,
      item.track_inventory,
      item.continue_selling_when_out_of_stock,
      coalesce(variant.deleted_at, product.deleted_at) AS deleted_at,
      greatest(
        item.updated_at,
        product.updated_at,
        variant.updated_at
      ) AS updated_at,
      coalesce(stock.quantity_on_hand, 0)::integer AS quantity_on_hand,
      coalesce(stock.reserved_quantity, 0)::integer AS reserved_quantity,
      coalesce(stock.unavailable_quantity, 0)::integer AS unavailable_quantity,
      (
        coalesce(stock.quantity_on_hand, 0)
        - coalesce(stock.reserved_quantity, 0)
        - coalesce(stock.unavailable_quantity, 0)
      )::integer AS available_for_sale
    FROM catalog.inventory_item item
    JOIN catalog.variant variant
      ON variant.project_id = item.project_id
     AND variant.id = item.variant_id
    JOIN catalog.product product
      ON product.project_id = item.project_id
     AND product.id = variant.product_id
    JOIN catalog.product_translation translation
      ON translation.project_id = item.project_id
     AND translation.product_id = product.id
    LEFT JOIN (
      SELECT
        project_id,
        variant_id,
        sum(quantity_on_hand)::integer AS quantity_on_hand,
        sum(reserved_qty)::integer AS reserved_quantity,
        sum(unavailable_qty)::integer AS unavailable_quantity
      FROM catalog.warehouse_stock
      GROUP BY project_id, variant_id
    ) stock
      ON stock.project_id = item.project_id
     AND stock.variant_id = item.variant_id
  `);

export const inventoryItemListWarehouseStockView = catalogSchema
  .view("inventory_item_list_warehouse_stock_view", {
    ...inventoryItemListViewColumns,
    warehouseScopeId: uuid("warehouse_scope_id").notNull(),
  })
  .as(sql`
    SELECT
      item.project_id,
      item.id,
      item.variant_id,
      product.id AS product_id,
      variant.kind,
      product.handle AS product_handle,
      translation.locale,
      translation.name AS product_name,
      stock.warehouse_id AS warehouse_scope_id,
      item.sku,
      item.track_inventory,
      item.continue_selling_when_out_of_stock,
      coalesce(variant.deleted_at, product.deleted_at) AS deleted_at,
      greatest(
        item.updated_at,
        product.updated_at,
        variant.updated_at
      ) AS updated_at,
      stock.quantity_on_hand::integer AS quantity_on_hand,
      stock.reserved_qty::integer AS reserved_quantity,
      stock.unavailable_qty::integer AS unavailable_quantity,
      (
        stock.quantity_on_hand
        - stock.reserved_qty
        - stock.unavailable_qty
      )::integer AS available_for_sale
    FROM catalog.inventory_item item
    JOIN catalog.variant variant
      ON variant.project_id = item.project_id
     AND variant.id = item.variant_id
    JOIN catalog.product product
      ON product.project_id = item.project_id
     AND product.id = variant.product_id
    JOIN catalog.product_translation translation
      ON translation.project_id = item.project_id
     AND translation.product_id = product.id
    JOIN catalog.warehouse_stock stock
      ON stock.project_id = item.project_id
     AND stock.variant_id = item.variant_id
  `);

export type InventoryItemListAllStockView =
  typeof inventoryItemListAllStockView.$inferSelect;
export type InventoryItemListWarehouseStockView =
  typeof inventoryItemListWarehouseStockView.$inferSelect;
