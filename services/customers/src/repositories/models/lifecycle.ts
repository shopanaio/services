import { sql } from "drizzle-orm";
import {
  check,
  index,
  jsonb,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { customer } from "./profiles.js";
import {
  customerDataRequestStatusEnum,
  customerDataRequestTypeEnum,
  customerMergeStatusEnum,
  customersSchema,
} from "./schema.js";

export const customerMerge = customersSchema.table(
  "customer_merge",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`uuidv7()`),
    storeId: uuid("store_id").notNull(),
    sourceCustomerId: uuid("source_customer_id")
      .notNull()
      .references(() => customer.id, { onDelete: "restrict" }),
    targetCustomerId: uuid("target_customer_id")
      .notNull()
      .references(() => customer.id, { onDelete: "restrict" }),
    status: customerMergeStatusEnum("status").notNull().default("REQUESTED"),
    reason: text("reason"),
    requestedByType: varchar("requested_by_type", { length: 32 }).notNull().default("system"),
    requestedById: text("requested_by_id"),
    idempotencyKey: text("idempotency_key").notNull(),
    resolution: jsonb("resolution")
      .notNull()
      .default(sql`'{}'::jsonb`),
    errorCode: varchar("error_code", { length: 128 }),
    errorMessage: text("error_message"),
    requestedAt: timestamp("requested_at", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
    startedAt: timestamp("started_at", {
      withTimezone: true,
      mode: "string",
    }),
    finishedAt: timestamp("finished_at", {
      withTimezone: true,
      mode: "string",
    }),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "customer_merge_distinct_customers_check",
      sql`${table.sourceCustomerId} <> ${table.targetCustomerId}`,
    ),
    check(
      "customer_merge_started_at_check",
      sql`${table.startedAt} IS NULL OR ${table.startedAt} >= ${table.requestedAt}`,
    ),
    check(
      "customer_merge_finished_at_check",
      sql`${table.finishedAt} IS NULL OR ${table.finishedAt} >= COALESCE(${table.startedAt}, ${table.requestedAt})`,
    ),
    check(
      "customer_merge_terminal_status_check",
      sql`(${table.status} IN ('COMPLETED', 'FAILED') AND ${table.finishedAt} IS NOT NULL)
        OR (${table.status} NOT IN ('COMPLETED', 'FAILED') AND ${table.finishedAt} IS NULL)`,
    ),
    uniqueIndex("customer_merge_idempotency_unique").on(table.storeId, table.idempotencyKey),
    uniqueIndex("customer_merge_source_active_unique")
      .on(table.sourceCustomerId)
      .where(sql`${table.status} IN ('REQUESTED', 'IN_PROGRESS')`),
    index("customer_merge_store_status_idx").on(
      table.storeId,
      table.status,
      table.requestedAt,
      table.id,
    ),
    index("customer_merge_job_target_idx").on(table.targetCustomerId, table.requestedAt, table.id),
  ],
);

export const customerDataRequest = customersSchema.table(
  "customer_data_request",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`uuidv7()`),
    storeId: uuid("store_id").notNull(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customer.id, { onDelete: "restrict" }),
    type: customerDataRequestTypeEnum("type").notNull(),
    status: customerDataRequestStatusEnum("status").notNull().default("PENDING"),
    requestedByType: varchar("requested_by_type", { length: 32 }).notNull(),
    requestedById: text("requested_by_id"),
    idempotencyKey: text("idempotency_key").notNull(),
    legalBasis: varchar("legal_basis", { length: 128 }),
    requestMetadata: jsonb("request_metadata")
      .notNull()
      .default(sql`'{}'::jsonb`),
    resultFileId: uuid("result_file_id"),
    rejectionReason: text("rejection_reason"),
    requestedAt: timestamp("requested_at", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
    dueAt: timestamp("due_at", { withTimezone: true, mode: "string" }),
    startedAt: timestamp("started_at", {
      withTimezone: true,
      mode: "string",
    }),
    finishedAt: timestamp("finished_at", {
      withTimezone: true,
      mode: "string",
    }),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "customer_data_request_due_at_check",
      sql`${table.dueAt} IS NULL OR ${table.dueAt} >= ${table.requestedAt}`,
    ),
    check(
      "customer_data_request_started_at_check",
      sql`${table.startedAt} IS NULL OR ${table.startedAt} >= ${table.requestedAt}`,
    ),
    check(
      "customer_data_request_finished_at_check",
      sql`${table.finishedAt} IS NULL OR ${table.finishedAt} >= COALESCE(${table.startedAt}, ${table.requestedAt})`,
    ),
    check(
      "customer_data_request_terminal_status_check",
      sql`(${table.status} IN ('COMPLETED', 'REJECTED', 'CANCELLED') AND ${table.finishedAt} IS NOT NULL)
        OR (${table.status} NOT IN ('COMPLETED', 'REJECTED', 'CANCELLED') AND ${table.finishedAt} IS NULL)`,
    ),
    check(
      "customer_data_request_rejection_reason_check",
      sql`${table.status} <> 'REJECTED' OR ${table.rejectionReason} IS NOT NULL`,
    ),
    uniqueIndex("customer_data_request_idempotency_unique").on(table.storeId, table.idempotencyKey),
    index("customer_data_request_store_status_idx").on(
      table.storeId,
      table.status,
      table.requestedAt,
      table.id,
    ),
    index("customer_data_request_customer_idx").on(
      table.customerId,
      table.requestedAt.desc(),
      table.id,
    ),
    index("customer_data_request_due_idx")
      .on(table.dueAt, table.id)
      .where(sql`${table.status} IN ('PENDING', 'PROCESSING') AND ${table.dueAt} IS NOT NULL`),
  ],
);

export type CustomerMerge = typeof customerMerge.$inferSelect;
export type NewCustomerMerge = typeof customerMerge.$inferInsert;
export type CustomerDataRequest = typeof customerDataRequest.$inferSelect;
export type NewCustomerDataRequest = typeof customerDataRequest.$inferInsert;
