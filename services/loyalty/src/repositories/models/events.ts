import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { accounts } from "./accounts.js";
import { transactions } from "./ledger.js";
import { earningRules } from "./programs.js";
import {
  loyaltyEventEvaluationDecisionEnum,
  loyaltySchema,
} from "./schema.js";

export const eventFacts = loyaltySchema.table(
  "event_fact",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    storeId: uuid("store_id").notNull(),
    producer: varchar("producer", { length: 128 }).notNull(),
    externalEventId: varchar("external_event_id", { length: 255 }).notNull(),
    eventType: varchar("event_type", { length: 128 }).notNull(),
    subjectType: varchar("subject_type", { length: 64 }).notNull(),
    subjectId: varchar("subject_id", { length: 255 }).notNull(),
    customerId: uuid("customer_id"),
    occurredAt: timestamp("occurred_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    payloadSchemaVersion: integer("payload_schema_version").notNull().default(1),
    payloadHash: varchar("payload_hash", { length: 64 }).notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    receivedAt: timestamp("received_at", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("loyalty_event_fact_identity_unique").on(
      table.storeId,
      table.producer,
      table.externalEventId,
    ),
    index("loyalty_event_fact_customer_history_idx")
      .on(
        table.storeId,
        table.customerId,
        table.occurredAt.desc(),
        table.id.desc(),
      )
      .where(sql`${table.customerId} IS NOT NULL`),
    index("loyalty_event_fact_type_history_idx").on(
      table.storeId,
      table.eventType,
      table.occurredAt.desc(),
      table.id.desc(),
    ),
    check(
      "loyalty_event_fact_names_check",
      sql`btrim(${table.producer}) <> ''
        AND btrim(${table.eventType}) <> ''
        AND btrim(${table.subjectType}) <> ''
        AND btrim(${table.subjectId}) <> ''
        AND btrim(${table.externalEventId}) <> ''`,
    ),
    check(
      "loyalty_event_fact_payload_check",
      sql`${table.payloadSchemaVersion} > 0
        AND ${table.payloadHash} ~ '^[0-9a-f]{64}$'
        AND jsonb_typeof(${table.payload}) = 'object'`,
    ),
  ],
);

export const eventEvaluations = loyaltySchema.table(
  "event_evaluation",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    storeId: uuid("store_id").notNull(),
    eventFactId: uuid("event_fact_id").notNull(),
    earningRuleId: uuid("earning_rule_id").notNull(),
    accountId: uuid("account_id").notNull(),
    decision: loyaltyEventEvaluationDecisionEnum("decision").notNull(),
    reasonCode: varchar("reason_code", { length: 128 }).notNull(),
    pointsAwarded: bigint("points_awarded", { mode: "bigint" }),
    monetaryAmountMinor: bigint("monetary_amount_minor", { mode: "bigint" }),
    currencyCode: varchar("currency_code", { length: 3 }),
    transactionId: uuid("transaction_id"),
    resultSchemaVersion: integer("result_schema_version").notNull().default(1),
    result: jsonb("result")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    evaluatedAt: timestamp("evaluated_at", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      name: "loyalty_event_evaluation_fact_fk",
      columns: [table.eventFactId],
      foreignColumns: [eventFacts.id],
    }),
    foreignKey({
      name: "loyalty_event_evaluation_rule_fk",
      columns: [table.earningRuleId],
      foreignColumns: [earningRules.id],
    }),
    foreignKey({
      name: "loyalty_event_evaluation_account_fk",
      columns: [table.accountId],
      foreignColumns: [accounts.id],
    }),
    foreignKey({
      name: "loyalty_event_evaluation_transaction_fk",
      columns: [table.transactionId],
      foreignColumns: [transactions.id],
    }),
    unique("loyalty_event_evaluation_once_unique").on(
      table.eventFactId,
      table.earningRuleId,
      table.accountId,
    ),
    index("loyalty_event_evaluation_account_history_idx").on(
      table.storeId,
      table.accountId,
      table.evaluatedAt.desc(),
      table.id.desc(),
    ),
    check(
      "loyalty_event_evaluation_reason_check",
      sql`btrim(${table.reasonCode}) <> ''`,
    ),
    check(
      "loyalty_event_evaluation_award_check",
      sql`(${table.decision} = 'AWARDED' AND (
          COALESCE(${table.pointsAwarded}, 0) > 0
          OR COALESCE(${table.monetaryAmountMinor}, 0) > 0
          OR ${table.transactionId} IS NOT NULL
          OR ${table.result} <> '{}'::jsonb))
        OR (${table.decision} <> 'AWARDED'
          AND ${table.pointsAwarded} IS NULL
          AND ${table.monetaryAmountMinor} IS NULL
          AND ${table.transactionId} IS NULL)`,
    ),
    check(
      "loyalty_event_evaluation_money_check",
      sql`(${table.monetaryAmountMinor} IS NULL) = (${table.currencyCode} IS NULL)
        AND (${table.monetaryAmountMinor} IS NULL OR ${table.monetaryAmountMinor} > 0)
        AND (${table.currencyCode} IS NULL OR ${table.currencyCode} ~ '^[A-Z]{3}$')`,
    ),
    check(
      "loyalty_event_evaluation_result_check",
      sql`${table.resultSchemaVersion} > 0 AND jsonb_typeof(${table.result}) = 'object'`,
    ),
  ],
);

export const earningRuleUsages = loyaltySchema.table(
  "earning_rule_usage",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    storeId: uuid("store_id").notNull(),
    earningRuleId: uuid("earning_rule_id").notNull(),
    scopeKey: varchar("scope_key", { length: 255 }).notNull(),
    windowStartedAt: timestamp("window_started_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    windowEndedAt: timestamp("window_ended_at", {
      withTimezone: true,
      mode: "string",
    }),
    occurrenceCount: bigint("occurrence_count", { mode: "bigint" })
      .notNull()
      .default(0n),
    pointsAwarded: bigint("points_awarded", { mode: "bigint" })
      .notNull()
      .default(0n),
    monetaryAmounts: jsonb("monetary_amounts")
      .$type<Record<string, string>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    revision: integer("revision").notNull().default(1),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      name: "loyalty_earning_rule_usage_rule_fk",
      columns: [table.earningRuleId],
      foreignColumns: [earningRules.id],
    }),
    unique("loyalty_earning_rule_usage_scope_unique").on(
      table.earningRuleId,
      table.scopeKey,
      table.windowStartedAt,
    ),
    index("loyalty_earning_rule_usage_scope_idx").on(
      table.storeId,
      table.scopeKey,
      table.windowStartedAt.desc(),
      table.id.desc(),
    ),
    check(
      "loyalty_earning_rule_usage_window_check",
      sql`${table.windowEndedAt} IS NULL OR ${table.windowEndedAt} > ${table.windowStartedAt}`,
    ),
    check(
      "loyalty_earning_rule_usage_values_check",
      sql`btrim(${table.scopeKey}) <> ''
        AND ${table.occurrenceCount} >= 0
        AND ${table.pointsAwarded} >= 0
        AND jsonb_typeof(${table.monetaryAmounts}) = 'object'
        AND ${table.revision} > 0`,
    ),
  ],
);

export type EventFact = typeof eventFacts.$inferSelect;
export type NewEventFact = typeof eventFacts.$inferInsert;
export type EventEvaluation = typeof eventEvaluations.$inferSelect;
export type NewEventEvaluation = typeof eventEvaluations.$inferInsert;
export type EarningRuleUsage = typeof earningRuleUsages.$inferSelect;
export type NewEarningRuleUsage = typeof earningRuleUsages.$inferInsert;
