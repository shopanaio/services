import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { accounts } from "./accounts.js";
import { transactions } from "./ledger.js";
import { programVersions, programs } from "./programs.js";
import {
  actorTypeEnum,
  loyaltySchema,
  reservationEventTypeEnum,
  reservationStatusEnum,
} from "./schema.js";

export const reservations = loyaltySchema.table(
  "reservation",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`uuidv7()`),
    storeId: uuid("store_id").notNull(),
    programId: uuid("program_id").notNull(),
    programVersionId: uuid("program_version_id").notNull(),
    accountId: uuid("account_id").notNull(),
    checkoutId: uuid("checkout_id").notNull(),
    quoteId: uuid("quote_id").notNull(),
    quoteRevision: varchar("quote_revision", { length: 64 }).notNull(),
    points: bigint("points", { mode: "bigint" }).notNull(),
    discountAmountMinor: bigint("discount_amount_minor", {
      mode: "bigint",
    }).notNull(),
    currencyCode: varchar("currency_code", { length: 3 }).notNull(),
    status: reservationStatusEnum("status").notNull().default("ACTIVE"),
    idempotencyKey: varchar("idempotency_key", { length: 255 }).notNull(),
    requestHash: varchar("request_hash", { length: 64 }).notNull(),
    expiresAt: timestamp("expires_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    orderId: uuid("order_id"),
    orderRevision: integer("order_revision"),
    committedAt: timestamp("committed_at", {
      withTimezone: true,
      mode: "string",
    }),
    releasedAt: timestamp("released_at", {
      withTimezone: true,
      mode: "string",
    }),
    expiredAt: timestamp("expired_at", {
      withTimezone: true,
      mode: "string",
    }),
    reversedAt: timestamp("reversed_at", {
      withTimezone: true,
      mode: "string",
    }),
    revision: integer("revision").notNull().default(1),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      name: "loyalty_reservation_program_fk",
      columns: [table.programId, table.storeId],
      foreignColumns: [programs.id, programs.storeId],
    }),
    foreignKey({
      name: "loyalty_reservation_program_version_fk",
      columns: [table.programVersionId, table.programId, table.storeId],
      foreignColumns: [programVersions.id, programVersions.programId, programVersions.storeId],
    }),
    foreignKey({
      name: "loyalty_reservation_account_fk",
      columns: [table.accountId, table.programId, table.storeId],
      foreignColumns: [accounts.id, accounts.programId, accounts.storeId],
    }),
    unique("loyalty_reservation_id_store_unique").on(table.id, table.storeId),
    unique("loyalty_reservation_store_idempotency_unique").on(table.storeId, table.idempotencyKey),
    uniqueIndex("loyalty_reservation_one_active_checkout_idx")
      .on(table.storeId, table.accountId, table.checkoutId)
      .where(sql`${table.status} = 'ACTIVE'`),
    index("loyalty_reservation_expiry_idx")
      .on(table.storeId, table.expiresAt, table.id)
      .where(sql`${table.status} = 'ACTIVE'`),
    index("loyalty_reservation_order_idx")
      .on(table.storeId, table.orderId, table.id)
      .where(sql`${table.orderId} IS NOT NULL`),
    check("loyalty_reservation_checkout_version_check", sql`${table.checkoutVersion} > 0`),
    check("loyalty_reservation_points_check", sql`${table.points} > 0`),
    check("loyalty_reservation_discount_check", sql`${table.discountAmountMinor} > 0`),
    check("loyalty_reservation_currency_check", sql`${table.currencyCode} ~ '^[A-Z]{3}$'`),
    check("loyalty_reservation_request_hash_check", sql`${table.requestHash} ~ '^[0-9a-f]{64}$'`),
    check(
      "loyalty_reservation_quote_revision_check",
      sql`${table.quoteRevision} ~ '^[0-9a-f]{64}$'`,
    ),
    check("loyalty_reservation_expiry_check", sql`${table.expiresAt} > ${table.createdAt}`),
    check("loyalty_reservation_revision_check", sql`${table.revision} > 0`),
    check(
      "loyalty_reservation_order_pair_check",
      sql`(${table.orderId} IS NULL) = (${table.orderRevision} IS NULL)`,
    ),
    check(
      "loyalty_reservation_state_check",
      sql`(${table.status} = 'ACTIVE' AND ${table.committedAt} IS NULL
          AND ${table.releasedAt} IS NULL AND ${table.expiredAt} IS NULL
          AND ${table.reversedAt} IS NULL AND ${table.orderId} IS NULL)
        OR (${table.status} = 'COMMITTED' AND ${table.committedAt} IS NOT NULL
          AND ${table.orderId} IS NOT NULL AND ${table.releasedAt} IS NULL
          AND ${table.expiredAt} IS NULL AND ${table.reversedAt} IS NULL)
        OR (${table.status} = 'RELEASED' AND ${table.releasedAt} IS NOT NULL
          AND ${table.committedAt} IS NULL AND ${table.expiredAt} IS NULL
          AND ${table.reversedAt} IS NULL AND ${table.orderId} IS NULL)
        OR (${table.status} = 'EXPIRED' AND ${table.expiredAt} IS NOT NULL
          AND ${table.committedAt} IS NULL AND ${table.releasedAt} IS NULL
          AND ${table.reversedAt} IS NULL AND ${table.orderId} IS NULL)
        OR (${table.status} = 'REVERSED' AND ${table.committedAt} IS NOT NULL
          AND ${table.reversedAt} IS NOT NULL AND ${table.orderId} IS NOT NULL
          AND ${table.releasedAt} IS NULL AND ${table.expiredAt} IS NULL)`,
    ),
  ],
);

export const reservationEvents = loyaltySchema.table(
  "reservation_event",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`uuidv7()`),
    storeId: uuid("store_id").notNull(),
    reservationId: uuid("reservation_id").notNull(),
    eventType: reservationEventTypeEnum("event_type").notNull(),
    previousStatus: reservationStatusEnum("previous_status"),
    status: reservationStatusEnum("status").notNull(),
    transactionId: uuid("transaction_id").notNull(),
    eventId: varchar("event_id", { length: 128 }),
    idempotencyKey: varchar("idempotency_key", { length: 255 }).notNull(),
    reasonCode: varchar("reason_code", { length: 128 }).notNull(),
    actorType: actorTypeEnum("actor_type").notNull(),
    actorId: text("actor_id"),
    occurredAt: timestamp("occurred_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      name: "loyalty_reservation_event_reservation_fk",
      columns: [table.reservationId, table.storeId],
      foreignColumns: [reservations.id, reservations.storeId],
    }),
    foreignKey({
      name: "loyalty_reservation_event_transaction_fk",
      columns: [table.transactionId, table.storeId],
      foreignColumns: [transactions.id, transactions.storeId],
    }),
    unique("loyalty_reservation_event_idempotency_unique").on(
      table.reservationId,
      table.idempotencyKey,
    ),
    index("loyalty_reservation_event_history_idx").on(
      table.reservationId,
      table.occurredAt,
      table.id,
    ),
    check("loyalty_reservation_event_reason_check", sql`btrim(${table.reasonCode}) <> ''`),
    check(
      "loyalty_reservation_event_metadata_check",
      sql`jsonb_typeof(${table.metadata}) = 'object'`,
    ),
  ],
);

export type Reservation = typeof reservations.$inferSelect;
export type NewReservation = typeof reservations.$inferInsert;
export type ReservationEvent = typeof reservationEvents.$inferSelect;
export type NewReservationEvent = typeof reservationEvents.$inferInsert;
