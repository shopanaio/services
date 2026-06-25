import { sql } from "drizzle-orm";
import {
  boolean,
  integer,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { catalogSchema } from "./schema";

const inventoryItemListViewColumns = {
  projectId: uuid("project_id").notNull(),
  id: uuid("id").notNull(),
  variantId: uuid("variant_id").notNull(),
  productId: uuid("product_id").notNull(),
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
      projection.product_id,
      projection.product_handle,
      translation.locale,
      translation.name AS product_name,
      item.sku,
      item.track_inventory,
      item.continue_selling_when_out_of_stock,
      projection.deleted_at,
      greatest(
        item.updated_at,
        coalesce(projection.updated_at, item.updated_at)
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
    JOIN catalog.inventory_item_catalog_projection projection
      ON projection.project_id = item.project_id
     AND projection.variant_id = item.variant_id
    JOIN catalog.inventory_product_translation translation
      ON translation.project_id = item.project_id
     AND translation.product_id = projection.product_id
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
      projection.product_id,
      projection.product_handle,
      translation.locale,
      translation.name AS product_name,
      warehouse.id AS warehouse_scope_id,
      item.sku,
      item.track_inventory,
      item.continue_selling_when_out_of_stock,
      projection.deleted_at,
      greatest(
        item.updated_at,
        coalesce(projection.updated_at, item.updated_at)
      ) AS updated_at,
      coalesce(stock.quantity_on_hand, 0)::integer AS quantity_on_hand,
      coalesce(stock.reserved_qty, 0)::integer AS reserved_quantity,
      coalesce(stock.unavailable_qty, 0)::integer AS unavailable_quantity,
      (
        coalesce(stock.quantity_on_hand, 0)
        - coalesce(stock.reserved_qty, 0)
        - coalesce(stock.unavailable_qty, 0)
      )::integer AS available_for_sale
    FROM catalog.inventory_item item
    JOIN catalog.inventory_item_catalog_projection projection
      ON projection.project_id = item.project_id
     AND projection.variant_id = item.variant_id
    JOIN catalog.inventory_product_translation translation
      ON translation.project_id = item.project_id
     AND translation.product_id = projection.product_id
    JOIN catalog.warehouses warehouse
      ON warehouse.project_id = item.project_id
    LEFT JOIN catalog.warehouse_stock stock
      ON stock.project_id = item.project_id
     AND stock.variant_id = item.variant_id
     AND stock.warehouse_id = warehouse.id
  `);

export type InventoryItemListAllStockView =
  typeof inventoryItemListAllStockView.$inferSelect;
export type InventoryItemListWarehouseStockView =
  typeof inventoryItemListWarehouseStockView.$inferSelect;
