import { index, integer, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { domainEvents } from "./domainEvents.js";

export const eventHandlerJobs = pgTable(
  "event_handler_jobs",
  {
    jobId: text("job_id").primaryKey(),
    eventId: text("event_id")
      .notNull()
      .references(() => domainEvents.eventId, { onDelete: "cascade" }),
    organizationId: text("organization_id").notNull(),
    eventType: text("event_type").notNull(),
    batchKey: text("batch_key"),
    aggregateKey: text("aggregate_key"),
    handlerService: text("handler_service").notNull(),
    handlerAction: text("handler_action").notNull(),
    handlerKind: text("handler_kind").notNull(),
    status: text("status").notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull(),
    intervalSeconds: integer("interval_seconds").notNull(),
    backoffRate: integer("backoff_rate").notNull(),
    timeoutMs: integer("timeout_ms"),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }).notNull().defaultNow(),
    lockedBy: text("locked_by"),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    lastError: text("last_error"),
    lastErrorCode: text("last_error_code"),
    succeededAt: timestamp("succeeded_at", { withTimezone: true }),
    failedAt: timestamp("failed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("event_handler_jobs_event_action_unique").on(table.eventId, table.handlerAction),
    index("idx_event_handler_jobs_event").on(table.eventId),
    index("idx_event_handler_jobs_ready").on(table.status, table.nextAttemptAt),
    index("idx_event_handler_jobs_batch").on(
      table.organizationId,
      table.eventType,
      table.batchKey,
      table.handlerAction,
      table.status,
      table.nextAttemptAt,
    ),
  ],
);

export type EventHandlerJobRecord = typeof eventHandlerJobs.$inferSelect;
export type NewEventHandlerJobRecord = typeof eventHandlerJobs.$inferInsert;
