import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  smallint,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { contentItem } from "./content.js";
import {
  contentStatusEnum,
  moderationActionEnum,
  moderationCaseStatusEnum,
  moderationVerdictEnum,
  reviewsSchema,
} from "./schema.js";

export const moderationCase = reviewsSchema.table(
  "moderation_case",
  {
    id: uuid("id").primaryKey(),
    storeId: uuid("store_id").notNull(),
    contentId: uuid("content_id")
      .notNull()
      .references(() => contentItem.id, { onDelete: "cascade" }),
    status: moderationCaseStatusEnum("status").notNull().default("OPEN"),
    priority: smallint("priority").notNull().default(50),
    reasonCode: varchar("reason_code", { length: 64 }).notNull(),
    assignedToPrincipalId: text("assigned_to_principal_id"),
    dueAt: timestamp("due_at", { withTimezone: true, mode: "string" }),
    resolutionCode: varchar("resolution_code", { length: 64 }),
    resolutionNote: varchar("resolution_note", { length: 2000 }),
    resolvedByPrincipalId: text("resolved_by_principal_id"),
    resolvedAt: timestamp("resolved_at", { withTimezone: true, mode: "string" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("moderation_case_active_content_unique")
      .on(table.contentId)
      .where(sql`${table.status} IN ('OPEN', 'IN_REVIEW')`),
    index("moderation_case_store_queue_idx").on(
      table.storeId,
      table.status,
      table.priority,
      table.createdAt,
      table.id
    ),
    index("moderation_case_assignee_queue_idx")
      .on(
        table.assignedToPrincipalId,
        table.status,
        table.priority,
        table.createdAt,
        table.id
      )
      .where(sql`${table.assignedToPrincipalId} IS NOT NULL`),
    index("moderation_case_due_idx")
      .on(table.dueAt, table.id)
      .where(
        sql`${table.status} IN ('OPEN', 'IN_REVIEW') AND ${table.dueAt} IS NOT NULL`
      ),
  ]
);

export const moderationEvent = reviewsSchema.table(
  "moderation_event",
  {
    id: uuid("id").primaryKey(),
    storeId: uuid("store_id").notNull(),
    contentId: uuid("content_id")
      .notNull()
      .references(() => contentItem.id, { onDelete: "cascade" }),
    caseId: uuid("case_id").references(() => moderationCase.id, {
      onDelete: "set null",
    }),
    action: moderationActionEnum("action").notNull(),
    fromStatus: contentStatusEnum("from_status"),
    toStatus: contentStatusEnum("to_status"),
    actorType: varchar("actor_type", { length: 32 }).notNull(),
    actorId: text("actor_id"),
    reasonCode: varchar("reason_code", { length: 64 }),
    note: varchar("note", { length: 2000 }),
    isAutomated: boolean("is_automated").notNull().default(false),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("moderation_event_content_time_idx").on(
      table.contentId,
      table.createdAt,
      table.id
    ),
    index("moderation_event_store_action_time_idx").on(
      table.storeId,
      table.action,
      table.createdAt,
      table.id
    ),
    index("moderation_event_case_time_idx")
      .on(table.caseId, table.createdAt, table.id)
      .where(sql`${table.caseId} IS NOT NULL`),
  ]
);

export const contentRevision = reviewsSchema.table(
  "content_revision",
  {
    id: uuid("id").primaryKey(),
    storeId: uuid("store_id").notNull(),
    contentId: uuid("content_id")
      .notNull()
      .references(() => contentItem.id, { onDelete: "cascade" }),
    revision: integer("revision").notNull(),
    snapshot: jsonb("snapshot").$type<Record<string, unknown>>().notNull(),
    changedByType: varchar("changed_by_type", { length: 32 }).notNull(),
    changedById: text("changed_by_id"),
    changeReason: varchar("change_reason", { length: 500 }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("content_revision_number_unique").on(table.contentId, table.revision),
    index("content_revision_store_created_idx").on(
      table.storeId,
      table.createdAt,
      table.id
    ),
  ]
);

export const moderationSignal = reviewsSchema.table(
  "moderation_signal",
  {
    id: uuid("id").primaryKey(),
    storeId: uuid("store_id").notNull(),
    contentId: uuid("content_id")
      .notNull()
      .references(() => contentItem.id, { onDelete: "cascade" }),
    provider: varchar("provider", { length: 64 }).notNull(),
    signalType: varchar("signal_type", { length: 64 }).notNull(),
    score: numeric("score", { precision: 6, scale: 5, mode: "number" }),
    verdict: moderationVerdictEnum("verdict").notNull(),
    modelVersion: varchar("model_version", { length: 128 }),
    evidence: jsonb("evidence")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("moderation_signal_content_time_idx").on(
      table.contentId,
      table.createdAt,
      table.id
    ),
    index("moderation_signal_store_verdict_idx").on(
      table.storeId,
      table.verdict,
      table.createdAt,
      table.id
    ),
    index("moderation_signal_provider_type_idx").on(
      table.provider,
      table.signalType,
      table.createdAt,
      table.id
    ),
  ]
);

export type ModerationCase = typeof moderationCase.$inferSelect;
export type NewModerationCase = typeof moderationCase.$inferInsert;
export type ModerationEvent = typeof moderationEvent.$inferSelect;
export type NewModerationEvent = typeof moderationEvent.$inferInsert;
export type ContentRevision = typeof contentRevision.$inferSelect;
export type NewContentRevision = typeof contentRevision.$inferInsert;
export type ModerationSignal = typeof moderationSignal.$inferSelect;
export type NewModerationSignal = typeof moderationSignal.$inferInsert;
