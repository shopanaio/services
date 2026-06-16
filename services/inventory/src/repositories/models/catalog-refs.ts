import { pgSchema, uuid, varchar, boolean, timestamp } from "drizzle-orm/pg-core";

/**
 * Cross-schema reference to Catalog service tables.
 * Used ONLY for SQL JOINs in read queries (e.g., InventoryWidgetRepository).
 * Not managed by Inventory migrations — owned by Catalog service.
 */
const catalogSchema = pgSchema("catalog");

export const catalogVariant = catalogSchema.table("variant", {
  projectId: uuid("project_id").notNull(),
  productId: uuid("product_id").notNull(),
  id: uuid("id").primaryKey(),
  isDefault: boolean("is_default"),
  handle: varchar("handle", { length: 255 }).notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
});
