import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  smallint,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { accounts } from "./accounts.js";
import { programVersions, programs } from "./programs.js";
import {
  actorTypeEnum,
  loyaltySchema,
  monetaryBalanceBucketEnum,
  monetaryTransactionKindEnum,
  monetaryWalletStatusEnum,
  monetaryWalletTypeEnum,
} from "./schema.js";

const createdAt = () =>
  timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow();

export const monetaryWallets = loyaltySchema.table(
  "monetary_wallet",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`uuidv7()`),
    storeId: uuid("store_id").notNull(),
    programId: uuid("program_id").notNull(),
    accountId: uuid("account_id").notNull(),
    walletType: monetaryWalletTypeEnum("wallet_type").notNull(),
    currencyCode: varchar("currency_code", { length: 3 }).notNull(),
    status: monetaryWalletStatusEnum("status").notNull().default("ACTIVE"),
    mergedIntoWalletId: uuid("merged_into_wallet_id"),
    revision: integer("revision").notNull().default(1),
    openedAt: timestamp("opened_at", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
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
      name: "loyalty_monetary_wallet_program_fk",
      columns: [table.programId],
      foreignColumns: [programs.id],
    }),
    foreignKey({
      name: "loyalty_monetary_wallet_account_fk",
      columns: [table.accountId],
      foreignColumns: [accounts.id],
    }),
    foreignKey({
      name: "loyalty_monetary_wallet_merged_into_fk",
      columns: [table.mergedIntoWalletId],
      foreignColumns: [table.id],
    }),
    unique("loyalty_monetary_wallet_identity_unique").on(
      table.accountId,
      table.walletType,
      table.currencyCode,
    ),
    unique("loyalty_monetary_wallet_id_program_unique").on(table.id, table.programId),
    index("loyalty_monetary_wallet_account_idx").on(
      table.storeId,
      table.accountId,
      table.status,
      table.currencyCode,
      table.id,
    ),
    check("loyalty_monetary_wallet_currency_check", sql`${table.currencyCode} ~ '^[A-Z]{3}$'`),
    check("loyalty_monetary_wallet_revision_check", sql`${table.revision} > 0`),
    check(
      "loyalty_monetary_wallet_merge_check",
      sql`(${table.status} = 'MERGED' AND ${table.mergedIntoWalletId} IS NOT NULL
          AND ${table.mergedIntoWalletId} <> ${table.id} AND ${table.closedAt} IS NOT NULL)
        OR (${table.status} = 'CLOSED' AND ${table.mergedIntoWalletId} IS NULL
          AND ${table.closedAt} IS NOT NULL)
        OR (${table.status} IN ('ACTIVE', 'SUSPENDED')
          AND ${table.mergedIntoWalletId} IS NULL AND ${table.closedAt} IS NULL)`,
    ),
  ],
);

export const monetaryTransactions = loyaltySchema.table(
  "monetary_transaction",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`uuidv7()`),
    storeId: uuid("store_id").notNull(),
    walletId: uuid("wallet_id").notNull(),
    programId: uuid("program_id").notNull(),
    programVersionId: uuid("program_version_id"),
    kind: monetaryTransactionKindEnum("kind").notNull(),
    sourceType: varchar("source_type", { length: 128 }).notNull(),
    sourceId: varchar("source_id", { length: 255 }),
    sourceRevision: varchar("source_revision", { length: 128 }),
    idempotencyKey: varchar("idempotency_key", { length: 255 }).notNull(),
    requestHash: varchar("request_hash", { length: 64 }).notNull(),
    actorType: actorTypeEnum("actor_type").notNull(),
    actorId: text("actor_id"),
    reasonCode: varchar("reason_code", { length: 128 }).notNull(),
    occurredAt: timestamp("occurred_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    effectiveAt: timestamp("effective_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    entriesFinalized: boolean("entries_finalized").notNull().default(false),
    createdAt: createdAt(),
  },
  (table) => [
    foreignKey({
      name: "loyalty_monetary_transaction_wallet_fk",
      columns: [table.walletId, table.programId],
      foreignColumns: [monetaryWallets.id, monetaryWallets.programId],
    }),
    foreignKey({
      name: "loyalty_monetary_transaction_program_version_fk",
      columns: [table.programVersionId],
      foreignColumns: [programVersions.id],
    }),
    unique("loyalty_monetary_transaction_id_wallet_unique").on(table.id, table.walletId),
    unique("loyalty_monetary_transaction_idempotency_unique").on(
      table.walletId,
      table.idempotencyKey,
    ),
    uniqueIndex("loyalty_monetary_transaction_source_operation_unique_idx")
      .on(table.walletId, table.sourceType, table.sourceId, table.sourceRevision, table.kind)
      .where(sql`${table.sourceId} IS NOT NULL`),
    index("loyalty_monetary_transaction_wallet_history_idx").on(
      table.storeId,
      table.walletId,
      table.occurredAt.desc(),
      table.id.desc(),
    ),
    check(
      "loyalty_monetary_transaction_names_check",
      sql`btrim(${table.sourceType}) <> ''
        AND btrim(${table.idempotencyKey}) <> ''
        AND btrim(${table.reasonCode}) <> ''`,
    ),
    check(
      "loyalty_monetary_transaction_source_pair_check",
      sql`(${table.sourceId} IS NULL) = (${table.sourceRevision} IS NULL)`,
    ),
    check(
      "loyalty_monetary_transaction_request_hash_check",
      sql`${table.requestHash} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      "loyalty_monetary_transaction_actor_check",
      sql`(${table.actorType} IN ('ADMIN_USER', 'CUSTOMER') AND ${table.actorId} IS NOT NULL)
        OR (${table.actorType} IN ('SERVICE', 'SYSTEM') AND ${table.actorId} IS NULL)`,
    ),
    check(
      "loyalty_monetary_transaction_time_check",
      sql`${table.effectiveAt} >= ${table.occurredAt}`,
    ),
    check(
      "loyalty_monetary_transaction_metadata_check",
      sql`jsonb_typeof(${table.metadata}) = 'object'`,
    ),
  ],
);

export const monetaryLedgerEntries = loyaltySchema.table(
  "monetary_ledger_entry",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`uuidv7()`),
    storeId: uuid("store_id").notNull(),
    transactionId: uuid("transaction_id").notNull(),
    walletId: uuid("wallet_id").notNull(),
    bucket: monetaryBalanceBucketEnum("bucket").notNull(),
    amountMinorDelta: bigint("amount_minor_delta", { mode: "bigint" }).notNull(),
    sequence: smallint("sequence").notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    foreignKey({
      name: "loyalty_monetary_ledger_entry_transaction_fk",
      columns: [table.transactionId, table.walletId],
      foreignColumns: [monetaryTransactions.id, monetaryTransactions.walletId],
    }),
    unique("loyalty_monetary_ledger_entry_transaction_sequence_unique").on(
      table.transactionId,
      table.sequence,
    ),
    index("loyalty_monetary_ledger_entry_wallet_bucket_idx").on(
      table.storeId,
      table.walletId,
      table.bucket,
      table.createdAt.desc(),
      table.id.desc(),
    ),
    check("loyalty_monetary_ledger_entry_amount_check", sql`${table.amountMinorDelta} <> 0`),
    check("loyalty_monetary_ledger_entry_sequence_check", sql`${table.sequence} > 0`),
  ],
);

export const monetaryCreditLots = loyaltySchema.table(
  "monetary_credit_lot",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`uuidv7()`),
    storeId: uuid("store_id").notNull(),
    walletId: uuid("wallet_id").notNull(),
    originEntryId: uuid("origin_entry_id").notNull(),
    amountIssuedMinor: bigint("amount_issued_minor", { mode: "bigint" }).notNull(),
    activatedAt: timestamp("activated_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    expiresAt: timestamp("expires_at", {
      withTimezone: true,
      mode: "string",
    }),
    createdAt: createdAt(),
  },
  (table) => [
    foreignKey({
      name: "loyalty_monetary_credit_lot_wallet_fk",
      columns: [table.walletId],
      foreignColumns: [monetaryWallets.id],
    }),
    foreignKey({
      name: "loyalty_monetary_credit_lot_origin_entry_fk",
      columns: [table.originEntryId],
      foreignColumns: [monetaryLedgerEntries.id],
    }),
    unique("loyalty_monetary_credit_lot_origin_unique").on(table.originEntryId),
    index("loyalty_monetary_credit_lot_fifo_idx").on(
      table.storeId,
      table.walletId,
      table.expiresAt.asc().nullsLast(),
      table.activatedAt,
      table.id,
    ),
    check("loyalty_monetary_credit_lot_amount_check", sql`${table.amountIssuedMinor} > 0`),
    check(
      "loyalty_monetary_credit_lot_expiry_check",
      sql`${table.expiresAt} IS NULL OR ${table.expiresAt} > ${table.activatedAt}`,
    ),
  ],
);

export const monetaryLotAllocations = loyaltySchema.table(
  "monetary_lot_allocation",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`uuidv7()`),
    storeId: uuid("store_id").notNull(),
    lotId: uuid("lot_id").notNull(),
    debitEntryId: uuid("debit_entry_id").notNull(),
    amountMinor: bigint("amount_minor", { mode: "bigint" }).notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    foreignKey({
      name: "loyalty_monetary_lot_allocation_lot_fk",
      columns: [table.lotId],
      foreignColumns: [monetaryCreditLots.id],
    }),
    foreignKey({
      name: "loyalty_monetary_lot_allocation_debit_entry_fk",
      columns: [table.debitEntryId],
      foreignColumns: [monetaryLedgerEntries.id],
    }),
    unique("loyalty_monetary_lot_allocation_entry_lot_unique").on(table.debitEntryId, table.lotId),
    check("loyalty_monetary_lot_allocation_amount_check", sql`${table.amountMinor} > 0`),
  ],
);

export const monetaryWalletBalances = loyaltySchema.table(
  "monetary_wallet_balance",
  {
    walletId: uuid("wallet_id").primaryKey(),
    storeId: uuid("store_id").notNull(),
    pendingAmountMinor: bigint("pending_amount_minor", { mode: "bigint" }).notNull().default(0n),
    availableAmountMinor: bigint("available_amount_minor", { mode: "bigint" })
      .notNull()
      .default(0n),
    reservedAmountMinor: bigint("reserved_amount_minor", { mode: "bigint" }).notNull().default(0n),
    debtAmountMinor: bigint("debt_amount_minor", { mode: "bigint" }).notNull().default(0n),
    revision: integer("revision").notNull().default(1),
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
      name: "loyalty_monetary_wallet_balance_wallet_fk",
      columns: [table.walletId],
      foreignColumns: [monetaryWallets.id],
    }),
    foreignKey({
      name: "loyalty_monetary_wallet_balance_transaction_fk",
      columns: [table.lastTransactionId, table.walletId],
      foreignColumns: [monetaryTransactions.id, monetaryTransactions.walletId],
    }),
    check(
      "loyalty_monetary_wallet_balance_values_check",
      sql`${table.pendingAmountMinor} >= 0
        AND ${table.availableAmountMinor} >= 0
        AND ${table.reservedAmountMinor} >= 0
        AND ${table.debtAmountMinor} >= 0
        AND ${table.revision} > 0`,
    ),
  ],
);

export type MonetaryWallet = typeof monetaryWallets.$inferSelect;
export type NewMonetaryWallet = typeof monetaryWallets.$inferInsert;
export type MonetaryTransaction = typeof monetaryTransactions.$inferSelect;
export type NewMonetaryTransaction = typeof monetaryTransactions.$inferInsert;
export type MonetaryLedgerEntry = typeof monetaryLedgerEntries.$inferSelect;
export type NewMonetaryLedgerEntry = typeof monetaryLedgerEntries.$inferInsert;
export type MonetaryCreditLot = typeof monetaryCreditLots.$inferSelect;
export type NewMonetaryCreditLot = typeof monetaryCreditLots.$inferInsert;
export type MonetaryLotAllocation = typeof monetaryLotAllocations.$inferSelect;
export type NewMonetaryLotAllocation = typeof monetaryLotAllocations.$inferInsert;
export type MonetaryWalletBalance = typeof monetaryWalletBalances.$inferSelect;
export type NewMonetaryWalletBalance = typeof monetaryWalletBalances.$inferInsert;
