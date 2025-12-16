import {
  uuid,
  varchar,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { customersSchema } from "./schema";

export const customer = customersSchema.table(
  "customer",
  {
    projectId: uuid("project_id").notNull(),
    id: uuid("id").primaryKey(),
    email: varchar("email", { length: 255 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("customer_project_id_email_key")
      .on(table.projectId, table.email)
      .where(sql`deleted_at IS NULL`),
    index("idx_customer_project_id").on(table.projectId),
    index("idx_customer_created_at").on(table.createdAt),
    index("idx_customer_updated_at").on(table.updatedAt),
    index("idx_customer_deleted_at")
      .on(table.deletedAt)
      .where(sql`deleted_at IS NOT NULL`),
  ]
);

export type Customer = typeof customer.$inferSelect;
export type NewCustomer = typeof customer.$inferInsert;
