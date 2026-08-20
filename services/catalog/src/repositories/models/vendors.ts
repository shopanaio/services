import { index, unique, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { catalogSchema } from "./schema";

export const vendor = catalogSchema.table(
  "vendor",
  {
    storeId: uuid("store_id").notNull(),
    id: uuid("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
  },
  (table) => [
    uniqueIndex("vendor_store_id_name_key").on(table.storeId, table.name),
    unique("vendor_store_id_id_unique").on(table.storeId, table.id),
    index("idx_vendor_store_id").on(table.storeId),
  ],
);

export type Vendor = typeof vendor.$inferSelect;
export type NewVendor = typeof vendor.$inferInsert;
