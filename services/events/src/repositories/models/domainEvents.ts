import { jsonb, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const domainEvents = pgTable(
  "domain_events",
  {
    eventId: text("event_id").primaryKey(),
    eventType: text("event_type").notNull(),
    source: text("source").notNull(),
    timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),
    tenantId: text("tenant_id").notNull(),
    userId: text("user_id"),
    correlationId: text("correlation_id").notNull(),
    causationId: text("causation_id"),
    emitKey: text("emit_key").notNull(),
    parentWorkflowId: text("parent_workflow_id"),
    status: text("status").notNull().default("dispatching"),
    dispatchStartedAt: timestamp("dispatch_started_at", { withTimezone: true }),
    dispatchCompletedAt: timestamp("dispatch_completed_at", { withTimezone: true }),
    handlerResults: jsonb("handler_results"),
    subjectType: text("subject_type").notNull(),
    subjectId: text("subject_id").notNull(),
    related: jsonb("related")
      .$type<Array<{ type: string; id: string }>>()
      .notNull()
      .default([]),
    actorType: text("actor_type").notNull().default("service"),
    actorId: text("actor_id"),
    payloadHash: text("payload_hash"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_events_type").on(table.eventType),
    index("idx_events_correlation").on(table.correlationId),
    index("idx_events_parent_workflow").on(
      table.parentWorkflowId,
      table.eventType
    ),
    index("idx_events_tenant_timestamp").on(table.tenantId, table.timestamp),
    index("idx_events_subject_timeline").on(
      table.tenantId,
      table.subjectType,
      table.subjectId,
      table.timestamp
    ),
    index("idx_events_type_timestamp").on(
      table.tenantId,
      table.eventType,
      table.timestamp
    ),
  ]
);

export type DomainEventRecord = typeof domainEvents.$inferSelect;
export type NewDomainEventRecord = typeof domainEvents.$inferInsert;
