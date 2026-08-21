import { sql } from "drizzle-orm";
import { bigint, check, foreignKey, index, timestamp, uuid } from "drizzle-orm/pg-core";
import { accounts } from "./accounts.js";
import { transactions } from "./ledger.js";
import { loyaltySchema } from "./schema.js";

export const accountBalances = loyaltySchema.table(
  "account_balance",
  {
    accountId: uuid("account_id").primaryKey(),
    storeId: uuid("store_id").notNull(),
    pendingPoints: bigint("pending_points", { mode: "bigint" }).notNull().default(0n),
    availablePoints: bigint("available_points", { mode: "bigint" }).notNull().default(0n),
    reservedPoints: bigint("reserved_points", { mode: "bigint" }).notNull().default(0n),
    debtPoints: bigint("debt_points", { mode: "bigint" }).notNull().default(0n),
    lifetimeEarnedPoints: bigint("lifetime_earned_points", {
      mode: "bigint",
    })
      .notNull()
      .default(0n),
    lifetimeRedeemedPoints: bigint("lifetime_redeemed_points", {
      mode: "bigint",
    })
      .notNull()
      .default(0n),
    lifetimeExpiredPoints: bigint("lifetime_expired_points", {
      mode: "bigint",
    })
      .notNull()
      .default(0n),
    lifetimeAdjustedPoints: bigint("lifetime_adjusted_points", {
      mode: "bigint",
    })
      .notNull()
      .default(0n),
    lastTransactionId: uuid("last_transaction_id"),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      name: "loyalty_account_balance_account_fk",
      columns: [table.accountId, table.storeId],
      foreignColumns: [accounts.id, accounts.storeId],
    }),
    foreignKey({
      name: "loyalty_account_balance_last_transaction_fk",
      columns: [table.lastTransactionId, table.accountId, table.storeId],
      foreignColumns: [transactions.id, transactions.accountId, transactions.storeId],
    }),
    index("loyalty_account_balance_store_available_idx").on(
      table.storeId,
      table.availablePoints.desc(),
      table.accountId,
    ),
    check(
      "loyalty_account_balance_nonnegative_check",
      sql`${table.pendingPoints} >= 0
        AND ${table.availablePoints} >= 0
        AND ${table.reservedPoints} >= 0
        AND ${table.debtPoints} >= 0
        AND ${table.lifetimeEarnedPoints} >= 0
        AND ${table.lifetimeRedeemedPoints} >= 0
        AND ${table.lifetimeExpiredPoints} >= 0`,
    ),
  ],
);

export const accountExpiringPoints = loyaltySchema
  .view("account_expiring_points", {
    storeId: uuid("store_id").notNull(),
    accountId: uuid("account_id").notNull(),
    lotId: uuid("lot_id").notNull(),
    expiresAt: timestamp("expires_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    remainingPoints: bigint("remaining_points", { mode: "bigint" }).notNull(),
  })
  .existing();

export type AccountBalance = typeof accountBalances.$inferSelect;
export type NewAccountBalance = typeof accountBalances.$inferInsert;
export type AccountExpiringPoint = typeof accountExpiringPoints.$inferSelect;
