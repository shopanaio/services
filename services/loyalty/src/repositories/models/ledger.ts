import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  foreignKey,
  index,
  jsonb,
  smallint,
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
  balanceBucketEnum,
  lotAllocationTypeEnum,
  loyaltySchema,
  transactionKindEnum,
  transactionSourceEnum,
} from "./schema.js";

const createdAt = () =>
  timestamp("created_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow();

export const transactions = loyaltySchema.table(
  "transaction",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    storeId: uuid("store_id").notNull(),
    accountId: uuid("account_id").notNull(),
    programId: uuid("program_id").notNull(),
    programVersionId: uuid("program_version_id"),
    kind: transactionKindEnum("kind").notNull(),
    source: transactionSourceEnum("source").notNull(),
    sourceId: varchar("source_id", { length: 255 }),
    sourceRevision: varchar("source_revision", { length: 128 }),
    idempotencyKey: varchar("idempotency_key", { length: 255 }).notNull(),
    requestHash: varchar("request_hash", { length: 64 }).notNull(),
    correlationId: varchar("correlation_id", { length: 255 }),
    causationId: varchar("causation_id", { length: 255 }),
    eventId: varchar("event_id", { length: 128 }),
    workflowId: varchar("workflow_id", { length: 255 }),
    actorType: actorTypeEnum("actor_type").notNull(),
    actorId: uuid("actor_id"),
    reasonCode: varchar("reason_code", { length: 128 }).notNull(),
    description: varchar("description", { length: 1000 }),
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
    createdAt: createdAt(),
  },
  (table) => [
    foreignKey({
      name: "loyalty_transaction_account_fk",
      columns: [table.accountId, table.programId, table.storeId],
      foreignColumns: [accounts.id, accounts.programId, accounts.storeId],
    }),
    foreignKey({
      name: "loyalty_transaction_program_fk",
      columns: [table.programId, table.storeId],
      foreignColumns: [programs.id, programs.storeId],
    }),
    foreignKey({
      name: "loyalty_transaction_program_version_fk",
      columns: [table.programVersionId, table.programId, table.storeId],
      foreignColumns: [
        programVersions.id,
        programVersions.programId,
        programVersions.storeId,
      ],
    }),
    unique("loyalty_transaction_id_store_unique").on(table.id, table.storeId),
    unique("loyalty_transaction_id_account_store_unique").on(
      table.id,
      table.accountId,
      table.storeId,
    ),
    unique("loyalty_transaction_store_idempotency_unique").on(
      table.storeId,
      table.idempotencyKey,
    ),
    uniqueIndex("loyalty_transaction_source_operation_unique_idx")
      .on(
        table.storeId,
        table.accountId,
        table.source,
        table.sourceId,
        table.sourceRevision,
        table.kind,
      )
      .where(sql`${table.sourceId} IS NOT NULL`),
    index("loyalty_transaction_account_history_idx").on(
      table.storeId,
      table.accountId,
      table.occurredAt.desc(),
      table.id.desc(),
    ),
    index("loyalty_transaction_source_idx").on(
      table.storeId,
      table.source,
      table.sourceId,
      table.sourceRevision,
    ),
    check(
      "loyalty_transaction_idempotency_check",
      sql`btrim(${table.idempotencyKey}) <> ''`,
    ),
    check(
      "loyalty_transaction_request_hash_check",
      sql`${table.requestHash} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      "loyalty_transaction_source_pair_check",
      sql`(${table.sourceId} IS NULL) = (${table.sourceRevision} IS NULL)`,
    ),
    check(
      "loyalty_transaction_actor_check",
      sql`(${table.actorType} IN ('ADMIN_USER', 'CUSTOMER') AND ${table.actorId} IS NOT NULL)
        OR (${table.actorType} IN ('SERVICE', 'SYSTEM'))`,
    ),
    check(
      "loyalty_transaction_reason_check",
      sql`btrim(${table.reasonCode}) <> ''`,
    ),
    check(
      "loyalty_transaction_time_check",
      sql`${table.effectiveAt} >= ${table.occurredAt}`,
    ),
    check(
      "loyalty_transaction_metadata_check",
      sql`jsonb_typeof(${table.metadata}) = 'object'`,
    ),
  ],
);

export const ledgerEntries = loyaltySchema.table(
  "ledger_entry",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    storeId: uuid("store_id").notNull(),
    transactionId: uuid("transaction_id").notNull(),
    accountId: uuid("account_id").notNull(),
    bucket: balanceBucketEnum("bucket").notNull(),
    pointsDelta: bigint("points_delta", { mode: "bigint" }).notNull(),
    sequence: smallint("sequence").notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    foreignKey({
      name: "loyalty_ledger_entry_transaction_fk",
      columns: [table.transactionId, table.accountId, table.storeId],
      foreignColumns: [transactions.id, transactions.accountId, transactions.storeId],
    }),
    foreignKey({
      name: "loyalty_ledger_entry_account_fk",
      columns: [table.accountId, table.storeId],
      foreignColumns: [accounts.id, accounts.storeId],
    }),
    unique("loyalty_ledger_entry_id_store_unique").on(table.id, table.storeId),
    unique("loyalty_ledger_entry_id_account_store_unique").on(
      table.id,
      table.accountId,
      table.storeId,
    ),
    unique("loyalty_ledger_entry_transaction_sequence_unique").on(
      table.transactionId,
      table.sequence,
    ),
    index("loyalty_ledger_entry_account_bucket_idx").on(
      table.storeId,
      table.accountId,
      table.bucket,
      table.createdAt.desc(),
      table.id.desc(),
    ),
    check(
      "loyalty_ledger_entry_points_check",
      sql`${table.pointsDelta} <> 0`,
    ),
    check("loyalty_ledger_entry_sequence_check", sql`${table.sequence} > 0`),
  ],
);

export const pointLots = loyaltySchema.table(
  "point_lot",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    storeId: uuid("store_id").notNull(),
    programId: uuid("program_id").notNull(),
    accountId: uuid("account_id").notNull(),
    originEntryId: uuid("origin_entry_id").notNull(),
    pointsIssued: bigint("points_issued", { mode: "bigint" }).notNull(),
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
      name: "loyalty_point_lot_program_fk",
      columns: [table.programId, table.storeId],
      foreignColumns: [programs.id, programs.storeId],
    }),
    foreignKey({
      name: "loyalty_point_lot_account_fk",
      columns: [table.accountId, table.programId, table.storeId],
      foreignColumns: [accounts.id, accounts.programId, accounts.storeId],
    }),
    foreignKey({
      name: "loyalty_point_lot_origin_entry_fk",
      columns: [table.originEntryId, table.accountId, table.storeId],
      foreignColumns: [ledgerEntries.id, ledgerEntries.accountId, ledgerEntries.storeId],
    }),
    unique("loyalty_point_lot_origin_entry_unique").on(table.originEntryId),
    unique("loyalty_point_lot_id_store_unique").on(table.id, table.storeId),
    index("loyalty_point_lot_fifo_idx").on(
      table.storeId,
      table.accountId,
      table.expiresAt.asc().nullsLast(),
      table.activatedAt,
      table.id,
    ),
    check("loyalty_point_lot_points_check", sql`${table.pointsIssued} > 0`),
    check(
      "loyalty_point_lot_expiry_check",
      sql`${table.expiresAt} IS NULL OR ${table.expiresAt} > ${table.activatedAt}`,
    ),
  ],
);

export const lotAllocations = loyaltySchema.table(
  "lot_allocation",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    storeId: uuid("store_id").notNull(),
    lotId: uuid("lot_id").notNull(),
    debitEntryId: uuid("debit_entry_id").notNull(),
    transactionId: uuid("transaction_id").notNull(),
    allocationType: lotAllocationTypeEnum("allocation_type").notNull(),
    points: bigint("points", { mode: "bigint" }).notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    foreignKey({
      name: "loyalty_lot_allocation_lot_fk",
      columns: [table.lotId, table.storeId],
      foreignColumns: [pointLots.id, pointLots.storeId],
    }),
    foreignKey({
      name: "loyalty_lot_allocation_debit_entry_fk",
      columns: [table.debitEntryId, table.storeId],
      foreignColumns: [ledgerEntries.id, ledgerEntries.storeId],
    }),
    foreignKey({
      name: "loyalty_lot_allocation_transaction_fk",
      columns: [table.transactionId, table.storeId],
      foreignColumns: [transactions.id, transactions.storeId],
    }),
    unique("loyalty_lot_allocation_entry_lot_unique").on(
      table.debitEntryId,
      table.lotId,
    ),
    index("loyalty_lot_allocation_lot_idx").on(
      table.lotId,
      table.createdAt,
      table.id,
    ),
    check("loyalty_lot_allocation_points_check", sql`${table.points} > 0`),
  ],
);

export type LoyaltyTransaction = typeof transactions.$inferSelect;
export type NewLoyaltyTransaction = typeof transactions.$inferInsert;
export type LedgerEntry = typeof ledgerEntries.$inferSelect;
export type NewLedgerEntry = typeof ledgerEntries.$inferInsert;
export type PointLot = typeof pointLots.$inferSelect;
export type NewPointLot = typeof pointLots.$inferInsert;
export type LotAllocation = typeof lotAllocations.$inferSelect;
export type NewLotAllocation = typeof lotAllocations.$inferInsert;
