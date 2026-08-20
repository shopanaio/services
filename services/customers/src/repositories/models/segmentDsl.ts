import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  foreignKey,
  index,
  integer,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { customer } from "./profiles.js";
import { customerSegment } from "./classification.js";
import { customerSegmentMaterializationRunStatusEnum, customersSchema } from "./schema.js";

export const customerSegmentStoreContext = customersSchema.table(
  "customer_segment_store_context",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`uuidv7()`),
    storeId: uuid("store_id").notNull(),
    currencyCode: varchar("currency_code", { length: 3 }).notNull(),
    timeZone: varchar("time_zone", { length: 64 }).notNull(),
    configurationRevision: integer("configuration_revision").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull(),
  },
  (table) => [
    unique("customer_segment_store_context_store_unique").on(table.storeId),
    check(
      "customer_segment_store_context_currency_check",
      sql`${table.currencyCode} ~ '^[A-Z]{3}$'`,
    ),
    check(
      "customer_segment_store_context_revision_check",
      sql`${table.configurationRevision} >= 0`,
    ),
  ],
);

export const customerSegmentMaterializationRun = customersSchema.table(
  "customer_segment_materialization_run",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`uuidv7()`),
    storeId: uuid("store_id").notNull(),
    segmentId: uuid("segment_id")
      .notNull()
      .references(() => customerSegment.id, { onDelete: "cascade" }),
    definitionRevision: integer("definition_revision").notNull(),
    evaluationGeneration: integer("evaluation_generation").notNull(),
    status: customerSegmentMaterializationRunStatusEnum("status").notNull().default("PENDING"),
    causeSequence: bigint("cause_sequence", { mode: "bigint" }).notNull(),
    scanEffectiveAt: timestamp("scan_effective_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    scanCursor: text("scan_cursor"),
    scanCompletedAt: timestamp("scan_completed_at", { withTimezone: true, mode: "string" }),
    queueWatermark: bigint("queue_watermark", { mode: "bigint" }),
    publicationEffectiveAt: timestamp("publication_effective_at", {
      withTimezone: true,
      mode: "string",
    }),
    attemptCount: integer("attempt_count").notNull().default(0),
    leaseUntil: timestamp("lease_until", { withTimezone: true, mode: "string" }),
    claimedBy: text("claimed_by"),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.storeId, table.segmentId],
      foreignColumns: [customerSegment.storeId, customerSegment.id],
      name: "customer_segment_materialization_run_store_segment_fk",
    }).onDelete("cascade"),
    unique("customer_segment_materialization_run_generation_unique").on(
      table.storeId,
      table.segmentId,
      table.evaluationGeneration,
    ),
    check(
      "customer_segment_materialization_run_revision_check",
      sql`${table.definitionRevision} >= 0 AND ${table.evaluationGeneration} >= 0`,
    ),
    index("customer_segment_materialization_run_claim_idx").on(
      table.storeId,
      table.status,
      table.leaseUntil,
      table.createdAt,
    ),
  ],
);

export const customerSegmentEvaluationState = customersSchema.table(
  "customer_segment_evaluation_state",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`uuidv7()`),
    storeId: uuid("store_id").notNull(),
    segmentId: uuid("segment_id")
      .notNull()
      .references(() => customerSegment.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customer.id, { onDelete: "cascade" }),
    definitionRevision: integer("definition_revision").notNull(),
    evaluationGeneration: integer("evaluation_generation").notNull(),
    evaluatedAt: timestamp("evaluated_at", { withTimezone: true, mode: "string" }).notNull(),
    matched: boolean("matched").notNull(),
    causeSequence: bigint("cause_sequence", { mode: "bigint" }).notNull(),
    evaluatorToken: text("evaluator_token").notNull(),
    sourceEventId: text("source_event_id"),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.storeId, table.segmentId],
      foreignColumns: [customerSegment.storeId, customerSegment.id],
      name: "customer_segment_evaluation_state_store_segment_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.storeId, table.customerId],
      foreignColumns: [customer.storeId, customer.id],
      name: "customer_segment_evaluation_state_store_customer_fk",
    }).onDelete("cascade"),
    unique("customer_segment_evaluation_state_pair_unique").on(
      table.storeId,
      table.segmentId,
      table.customerId,
    ),
    check(
      "customer_segment_evaluation_state_revision_check",
      sql`${table.definitionRevision} >= 0 AND ${table.evaluationGeneration} >= 0`,
    ),
    index("customer_segment_evaluation_state_customer_idx").on(table.storeId, table.customerId),
    index("customer_segment_evaluation_state_generation_idx").on(
      table.storeId,
      table.segmentId,
      table.evaluationGeneration,
    ),
  ],
);

export const customerSegmentEvaluationLock = customersSchema.table(
  "customer_segment_evaluation_lock",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`uuidv7()`),
    storeId: uuid("store_id").notNull(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customer.id, { onDelete: "cascade" }),
    segmentId: uuid("segment_id")
      .notNull()
      .references(() => customerSegment.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.storeId, table.customerId],
      foreignColumns: [customer.storeId, customer.id],
      name: "customer_segment_evaluation_lock_store_customer_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.storeId, table.segmentId],
      foreignColumns: [customerSegment.storeId, customerSegment.id],
      name: "customer_segment_evaluation_lock_store_segment_fk",
    }).onDelete("cascade"),
    unique("customer_segment_evaluation_lock_pair_unique").on(
      table.storeId,
      table.customerId,
      table.segmentId,
    ),
  ],
);

export const customerSegmentTemporalSchedule = customersSchema.table(
  "customer_segment_temporal_schedule",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`uuidv7()`),
    storeId: uuid("store_id").notNull(),
    segmentId: uuid("segment_id")
      .notNull()
      .references(() => customerSegment.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customer.id, { onDelete: "cascade" }),
    definitionRevision: integer("definition_revision").notNull(),
    evaluationGeneration: integer("evaluation_generation").notNull(),
    evaluateAt: timestamp("evaluate_at", { withTimezone: true, mode: "string" }).notNull(),
    scheduleToken: varchar("schedule_token", { length: 64 }).notNull(),
    attemptCount: integer("attempt_count").notNull().default(0),
    leaseUntil: timestamp("lease_until", { withTimezone: true, mode: "string" }),
    claimedBy: text("claimed_by"),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.storeId, table.segmentId],
      foreignColumns: [customerSegment.storeId, customerSegment.id],
      name: "customer_segment_temporal_schedule_store_segment_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.storeId, table.customerId],
      foreignColumns: [customer.storeId, customer.id],
      name: "customer_segment_temporal_schedule_store_customer_fk",
    }).onDelete("cascade"),
    unique("customer_segment_temporal_schedule_pair_unique").on(
      table.storeId,
      table.segmentId,
      table.customerId,
    ),
    unique("customer_segment_temporal_schedule_token_unique").on(table.scheduleToken),
    check(
      "customer_segment_temporal_schedule_revision_check",
      sql`${table.definitionRevision} >= 0 AND ${table.evaluationGeneration} >= 0`,
    ),
    index("customer_segment_temporal_schedule_claim_idx").on(
      table.storeId,
      table.evaluateAt,
      table.leaseUntil,
    ),
    index("customer_segment_temporal_schedule_customer_idx").on(table.storeId, table.customerId),
    index("customer_segment_temporal_schedule_generation_idx").on(
      table.storeId,
      table.segmentId,
      table.evaluationGeneration,
    ),
  ],
);

export const customerSegmentReevaluationQueue = customersSchema.table(
  "customer_segment_reevaluation_queue",
  {
    sequence: bigint("sequence", { mode: "bigint" })
      .primaryKey()
      .default(sql`nextval('customers.customer_segment_evaluation_cause_sequence')`),
    storeId: uuid("store_id").notNull(),
    segmentId: uuid("segment_id")
      .notNull()
      .references(() => customerSegment.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customer.id, { onDelete: "cascade" }),
    definitionRevision: integer("definition_revision").notNull(),
    evaluationGeneration: integer("evaluation_generation").notNull(),
    sourceEventId: text("source_event_id").notNull(),
    requestedEffectiveAt: timestamp("requested_effective_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    availableAt: timestamp("available_at", { withTimezone: true, mode: "string" }).notNull(),
    attemptCount: integer("attempt_count").notNull().default(0),
    leaseUntil: timestamp("lease_until", { withTimezone: true, mode: "string" }),
    claimedBy: text("claimed_by"),
    completedAt: timestamp("completed_at", { withTimezone: true, mode: "string" }),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.storeId, table.segmentId],
      foreignColumns: [customerSegment.storeId, customerSegment.id],
      name: "customer_segment_reevaluation_queue_store_segment_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.storeId, table.customerId],
      foreignColumns: [customer.storeId, customer.id],
      name: "customer_segment_reevaluation_queue_store_customer_fk",
    }).onDelete("cascade"),
    unique("customer_segment_reevaluation_queue_event_unique").on(
      table.storeId,
      table.segmentId,
      table.customerId,
      table.definitionRevision,
      table.evaluationGeneration,
      table.sourceEventId,
    ),
    check(
      "customer_segment_reevaluation_queue_revision_check",
      sql`${table.definitionRevision} >= 0 AND ${table.evaluationGeneration} >= 0`,
    ),
    index("customer_segment_reevaluation_queue_claim_idx").on(
      table.storeId,
      table.definitionRevision,
      table.evaluationGeneration,
      table.completedAt,
      table.availableAt,
      table.leaseUntil,
      table.sequence,
    ),
    index("customer_segment_reevaluation_queue_cleanup_idx").on(
      table.storeId,
      table.completedAt,
      table.sequence,
    ),
    index("customer_segment_reevaluation_queue_customer_idx").on(table.storeId, table.customerId),
    index("customer_segment_reevaluation_queue_generation_idx").on(
      table.storeId,
      table.segmentId,
      table.evaluationGeneration,
    ),
  ],
);

export type CustomerSegmentStoreContext = typeof customerSegmentStoreContext.$inferSelect;
export type CustomerSegmentMaterializationRun =
  typeof customerSegmentMaterializationRun.$inferSelect;
export type CustomerSegmentEvaluationState = typeof customerSegmentEvaluationState.$inferSelect;
export type CustomerSegmentTemporalSchedule = typeof customerSegmentTemporalSchedule.$inferSelect;
export type CustomerSegmentReevaluationQueue = typeof customerSegmentReevaluationQueue.$inferSelect;
