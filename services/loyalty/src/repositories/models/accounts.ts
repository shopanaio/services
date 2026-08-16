import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  integer,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { accountStatusEnum, loyaltySchema } from "./schema.js";
import { programs } from "./programs.js";

export const accounts = loyaltySchema.table(
  "account",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    storeId: uuid("store_id").notNull(),
    programId: uuid("program_id").notNull(),
    customerId: uuid("customer_id").notNull(),
    status: accountStatusEnum("status").notNull().default("ACTIVE"),
    revision: integer("revision").notNull().default(1),
    mergedIntoAccountId: uuid("merged_into_account_id"),
    suspendedReason: varchar("suspended_reason", { length: 500 }),
    openedAt: timestamp("opened_at", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
    suspendedAt: timestamp("suspended_at", {
      withTimezone: true,
      mode: "string",
    }),
    closedAt: timestamp("closed_at", {
      withTimezone: true,
      mode: "string",
    }),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      name: "loyalty_account_program_fk",
      columns: [table.programId, table.storeId],
      foreignColumns: [programs.id, programs.storeId],
    }),
    foreignKey({
      name: "loyalty_account_merged_into_fk",
      columns: [table.mergedIntoAccountId, table.storeId],
      foreignColumns: [table.id, table.storeId],
    }),
    unique("loyalty_account_program_customer_unique").on(
      table.programId,
      table.customerId,
    ),
    unique("loyalty_account_id_store_unique").on(table.id, table.storeId),
    unique("loyalty_account_id_program_store_unique").on(
      table.id,
      table.programId,
      table.storeId,
    ),
    index("loyalty_account_store_customer_idx").on(
      table.storeId,
      table.customerId,
      table.status,
      table.id,
    ),
    index("loyalty_account_store_program_status_idx").on(
      table.storeId,
      table.programId,
      table.status,
      table.openedAt.desc(),
      table.id.desc(),
    ),
    check("loyalty_account_revision_check", sql`${table.revision} > 0`),
    check(
      "loyalty_account_merge_check",
      sql`(${table.status} = 'MERGED' AND ${table.mergedIntoAccountId} IS NOT NULL
          AND ${table.mergedIntoAccountId} <> ${table.id} AND ${table.closedAt} IS NOT NULL)
        OR (${table.status} <> 'MERGED' AND ${table.mergedIntoAccountId} IS NULL)`,
    ),
    check(
      "loyalty_account_suspension_check",
      sql`(${table.status} = 'SUSPENDED' AND ${table.suspendedAt} IS NOT NULL
          AND btrim(COALESCE(${table.suspendedReason}, '')) <> '')
        OR (${table.status} <> 'SUSPENDED' AND ${table.suspendedAt} IS NULL)`,
    ),
    check(
      "loyalty_account_close_check",
      sql`(${table.status} IN ('CLOSED', 'MERGED') AND ${table.closedAt} IS NOT NULL)
        OR (${table.status} NOT IN ('CLOSED', 'MERGED') AND ${table.closedAt} IS NULL)`,
    ),
  ],
);

export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;
