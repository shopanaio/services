import {
  uuid,
  text,
  timestamp,
  integer,
  jsonb,
  boolean,
  index,
} from "drizzle-orm/pg-core";
import { inventorySchema } from "./schema";
import { bulkEditJob } from "./bulkEditJobs";

export const bulkEditItemStatusEnum = inventorySchema.enum(
  "bulk_edit_item_status",
  [
    "PENDING",
    "RUNNING",
    "SUCCEEDED",
    "FAILED",
    "CANCELLED",
    "SUPERSEDED",
  ]
);

export const bulkEditCancelReasonEnum = inventorySchema.enum(
  "bulk_edit_cancel_reason",
  ["USER", "SUPERSEDED", "SYSTEM"]
);

export const bulkEditItem = inventorySchema.table(
  "bulk_edit_item",
  {
    id: uuid("id").primaryKey(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => bulkEditJob.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").notNull(),
    productId: uuid("product_id").notNull(),
    variantId: uuid("variant_id"),
    opType: text("op_type").notNull(),
    opIndex: integer("op_index").notNull(),
    chunkIndex: integer("chunk_index").notNull(),
    params: jsonb("params").notNull(),
    status: bulkEditItemStatusEnum("status").notNull().default("PENDING"),
    fenceToken: text("fence_token").notNull(),
    cancelRequested: boolean("cancel_requested").notNull().default(false),
    cancelReason: bulkEditCancelReasonEnum("cancel_reason"),
    supersededByJobId: uuid("superseded_by_job_id"),
    errors: jsonb("errors"),
    startedAt: timestamp("started_at", { withTimezone: true, mode: "string" }),
    finishedAt: timestamp("finished_at", { withTimezone: true, mode: "string" }),
  },
  (table) => [
    index("bulk_edit_item_project_product_status_idx").on(
      table.projectId,
      table.productId,
      table.status
    ),
    index("bulk_edit_item_job_chunk_op_idx").on(
      table.jobId,
      table.chunkIndex,
      table.opIndex
    ),
    index("bulk_edit_item_job_status_idx").on(table.jobId, table.status),
  ]
);

export type BulkEditItem = typeof bulkEditItem.$inferSelect;
export type NewBulkEditItem = typeof bulkEditItem.$inferInsert;
