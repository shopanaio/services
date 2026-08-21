import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  primaryKey,
  smallint,
  text,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/pg-core";
import {
  auditActionEnum,
  auditActorTypeEnum,
  auditOperationActionEnum,
  auditSchema,
} from "./schema.js";

export const auditEntries = auditSchema.table(
  "audit_entries",
  {
    eventId: text("event_id").primaryKey(),
    organizationId: text("organization_id").notNull(),
    storeId: text("store_id").notNull(),
    eventSequence: integer("event_sequence").notNull(),
    eventType: varchar("event_type", { length: 128 }).notNull(),
    aggregateType: varchar("aggregate_type", { length: 64 }).notNull(),
    aggregateId: text("aggregate_id").notNull(),
    action: auditActionEnum("action").notNull(),
    command: varchar("command", { length: 128 }).notNull(),
    actorType: auditActorTypeEnum("actor_type").notNull(),
    actorId: text("actor_id"),
    sourceService: varchar("source_service", { length: 64 }).notNull(),
    parentWorkflowId: text("parent_workflow_id"),
    correlationId: text("correlation_id").notNull(),
    schemaVersion: smallint("schema_version").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true, mode: "string" }).notNull(),
    recordedAt: timestamp("recorded_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    retentionUntil: timestamp("retention_until", { withTimezone: true, mode: "string" }),
    recordDigest: varchar("record_digest", { length: 64 }),
  },
  (table) => [
    check("audit_entries_event_sequence_positive", sql`${table.eventSequence} > 0`),
    check("audit_entries_schema_version_positive", sql`${table.schemaVersion} > 0`),
    check(
      "audit_entries_actor_identity",
      sql`(${table.actorType} = 'USER' AND ${table.actorId} IS NOT NULL) OR ${table.actorType} <> 'USER'`,
    ),
    unique("audit_entries_subject_sequence_unique").on(
      table.organizationId,
      table.aggregateType,
      table.aggregateId,
      table.eventSequence,
    ),
    index("audit_entries_store_timeline_idx").on(
      table.organizationId,
      table.storeId,
      table.occurredAt.desc(),
      table.eventId,
    ),
    index("audit_entries_aggregate_timeline_idx").on(
      table.organizationId,
      table.aggregateType,
      table.aggregateId,
      table.eventSequence.desc(),
    ),
    index("audit_entries_actor_timeline_idx").on(
      table.organizationId,
      table.actorType,
      table.actorId,
      table.occurredAt.desc(),
    ),
  ],
);

export const auditOperations = auditSchema.table(
  "audit_operations",
  {
    eventId: text("event_id")
      .notNull()
      .references(() => auditEntries.eventId, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    operationType: varchar("operation_type", { length: 128 }).notNull(),
    action: auditOperationActionEnum("action").notNull(),
    targetType: varchar("target_type", { length: 64 }),
    targetId: text("target_id"),
    changes: jsonb("changes").$type<readonly Record<string, unknown>[]>().notNull().default([]),
  },
  (table) => [
    primaryKey({ columns: [table.eventId, table.position] }),
    check("audit_operations_position_non_negative", sql`${table.position} >= 0`),
    check(
      "audit_operations_target_identity",
      sql`(${table.targetType} IS NULL AND ${table.targetId} IS NULL)
        OR (${table.targetType} IS NOT NULL AND ${table.targetId} IS NOT NULL)`,
    ),
  ],
);

export const auditTargets = auditSchema.table(
  "audit_targets",
  {
    eventId: text("event_id")
      .notNull()
      .references(() => auditEntries.eventId, { onDelete: "cascade" }),
    organizationId: text("organization_id").notNull(),
    targetType: varchar("target_type", { length: 64 }).notNull(),
    targetId: text("target_id").notNull(),
    isRoot: boolean("is_root").notNull().default(false),
  },
  (table) => [
    primaryKey({ columns: [table.eventId, table.targetType, table.targetId] }),
    index("audit_targets_timeline_idx").on(
      table.organizationId,
      table.targetType,
      table.targetId,
      table.eventId,
    ),
  ],
);

export type AuditEntryRecord = typeof auditEntries.$inferSelect;
export type NewAuditEntryRecord = typeof auditEntries.$inferInsert;
export type AuditOperationRecord = typeof auditOperations.$inferSelect;
export type NewAuditOperationRecord = typeof auditOperations.$inferInsert;
export type AuditTargetRecord = typeof auditTargets.$inferSelect;
export type NewAuditTargetRecord = typeof auditTargets.$inferInsert;
