import {
  index,
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { catalogSchema } from "./schema";

export const vendor = catalogSchema.table(
  "vendor",
  {
    projectId: uuid("project_id").notNull(),
    id: uuid("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
  },
  (table) => [
    uniqueIndex("vendor_project_id_name_key").on(table.projectId, table.name),
    unique("vendor_project_id_id_unique").on(table.projectId, table.id),
    index("idx_vendor_project_id").on(table.projectId),
  ]
);

export type Vendor = typeof vendor.$inferSelect;
export type NewVendor = typeof vendor.$inferInsert;
