import { sql } from "drizzle-orm";
import {
  check,
  index,
  jsonb,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { customer } from "./profiles.js";
import { customersSchema } from "./schema.js";

export const customerExternalReference = customersSchema.table(
  "customer_external_reference",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    storeId: uuid("store_id").notNull(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customer.id, { onDelete: "cascade" }),
    externalSystem: varchar("external_system", { length: 64 }).notNull(),
    externalType: varchar("external_type", { length: 64 })
      .notNull()
      .default("customer"),
    externalId: varchar("external_id", { length: 255 }).notNull(),
    metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
  },
  (table) => [
    check(
      "customer_external_reference_system_check",
      sql`length(btrim(${table.externalSystem})) > 0`
    ),
    check(
      "customer_external_reference_type_check",
      sql`length(btrim(${table.externalType})) > 0`
    ),
    check(
      "customer_external_reference_id_check",
      sql`length(btrim(${table.externalId})) > 0`
    ),
    uniqueIndex("customer_external_reference_lookup_unique")
      .on(
        table.storeId,
        table.externalSystem,
        table.externalType,
        table.externalId
      )
      .where(sql`${table.deletedAt} IS NULL`),
    uniqueIndex("customer_external_reference_customer_unique")
      .on(table.customerId, table.externalSystem, table.externalType)
      .where(sql`${table.deletedAt} IS NULL`),
    index("customer_external_reference_customer_idx").on(table.customerId),
  ]
);

export type CustomerExternalReference =
  typeof customerExternalReference.$inferSelect;
export type NewCustomerExternalReference =
  typeof customerExternalReference.$inferInsert;
