import { pgSchema, uuid, varchar, boolean, timestamp } from "drizzle-orm/pg-core";

/**
 * Compatibility reference copied from Inventory service.
 * Catalog owns this table via products.ts, so this file is intentionally not
 * exported from the Drizzle migration barrel.
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
