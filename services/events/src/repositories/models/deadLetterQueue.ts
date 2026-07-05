import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const deadLetterQueue = pgTable(
  "dead_letter_queue",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: text("event_id").notNull(),
    eventType: text("event_type").notNull(),
    handlerService: text("handler_service").notNull(),
    handlerAction: text("handler_action").notNull(),
    error: text("error").notNull(),
    errorCode: text("error_code"),
    attempts: integer("attempts").notNull(),
    organizationId: text("organization_id").notNull(),
    correlationId: text("correlation_id"),
    dbosWorkflowId: text("dbos_workflow_id"),
    dbosStepName: text("dbos_step_name"),
    status: text("status").notNull().default("failed"),
    failedAt: timestamp("failed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("dlq_event_handler_unique").on(
      table.eventId,
      table.handlerService,
      table.handlerAction
    ),
    index("idx_dlq_status").on(table.status),
    index("idx_dlq_event_type").on(table.eventType, table.status),
    index("idx_dlq_organization").on(table.organizationId, table.status),
  ]
);

export type DLQEntry = typeof deadLetterQueue.$inferSelect;
export type NewDLQEntry = typeof deadLetterQueue.$inferInsert;
