import {
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  integer,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { catalogSchema } from "./schema";

/**
 * InventoryItem - единица учета запасов, 1:1 связь с Variant.
 *
 * Содержит все данные связанные с инвентарем:
 * - SKU (переносится из Variant)
 * - Track inventory settings
 * - Continue selling when out of stock
 *
 * Физические характеристики (dimensions, weight) и cost остаются
 * в отдельных таблицах, связанных через variantId (в будущем - inventoryItemId).
 */
export const inventoryItem = catalogSchema.table(
  "inventory_item",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id").notNull(),

    // Reference to Catalog.Variant (federated, no FK constraint)
    variantId: uuid("variant_id").notNull().unique(),

    // SKU (moved from Variant)
    sku: varchar("sku", { length: 255 }),

    // Tracking settings
    trackInventory: boolean("track_inventory").notNull().default(true),
    continueSellingWhenOutOfStock: boolean("continue_selling_when_out_of_stock")
      .notNull()
      .default(false),

    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // Index for variant lookup (federation)
    index("idx_inventory_item_variant").on(table.variantId),
    // Index for project
    index("idx_inventory_item_project").on(table.projectId),
    // SKU uniqueness per project
    unique("inventory_item_sku_unique").on(table.projectId, table.sku),
  ]
);

export const inventoryItemCatalogProjection = catalogSchema.table(
  "inventory_item_catalog_projection",
  {
    projectId: uuid("project_id").notNull(),
    id: uuid("id").primaryKey().defaultRandom(),

    variantId: uuid("variant_id").notNull(),
    productId: uuid("product_id").notNull(),
    productHandle: text("product_handle"),

    externalSystem: text("external_system"),
    externalId: text("external_id"),

    catalogRevision: integer("catalog_revision"),
    lastCatalogEventId: text("last_catalog_event_id"),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("inventory_item_catalog_projection_project_variant_key").on(
      table.projectId,
      table.variantId
    ),
    index("idx_inventory_item_catalog_projection_project_product").on(
      table.projectId,
      table.productId
    ),
    index("idx_inventory_item_catalog_projection_project_deleted").on(
      table.projectId,
      table.deletedAt
    ),
  ]
);

export type InventoryItem = typeof inventoryItem.$inferSelect;
export type NewInventoryItem = typeof inventoryItem.$inferInsert;
export type InventoryItemCatalogProjection =
  typeof inventoryItemCatalogProjection.$inferSelect;
export type NewInventoryItemCatalogProjection =
  typeof inventoryItemCatalogProjection.$inferInsert;
