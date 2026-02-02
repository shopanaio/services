import {
  uuid,
  varchar,
  boolean,
  timestamp,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { inventorySchema } from "./schema";

/**
 * Variant table definition.
 *
 * NOTE: This is a reference-only model for foreign key relationships.
 * The variant entity is owned by the Catalog service.
 * This model is kept in Inventory service only for:
 * - Foreign key references from warehouse_stock
 * - SKU lookup (during transition period)
 *
 * In the future, this will be replaced by inventory_item table
 * that has a 1:1 relationship with Catalog.Variant.
 */
export const variant = inventorySchema.table(
  "variant",
  {
    projectId: uuid("project_id").notNull(),
    id: uuid("id").primaryKey(),
    productId: uuid("product_id").notNull(),
    isDefault: boolean("is_default").default(false),
    handle: varchar("handle", { length: 512 }).notNull(),
    sku: varchar("sku", { length: 255 }),
    externalSystem: varchar("external_system", { length: 64 }),
    externalId: varchar("external_id", { length: 255 }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
  },
  (table) => [
    index("idx_variant_project").on(table.projectId),
    index("idx_variant_product").on(table.projectId, table.productId),
    unique("variant_project_id_sku_key").on(table.projectId, table.sku),
  ]
);

export type Variant = typeof variant.$inferSelect;
export type NewVariant = typeof variant.$inferInsert;
