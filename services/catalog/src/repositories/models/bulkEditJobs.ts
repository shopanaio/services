import { uuid, timestamp, index } from "drizzle-orm/pg-core";
import { catalogSchema } from "./schema";

export const bulkEditJobStatusEnum = catalogSchema.enum(
  "bulk_edit_job_status",
  ["QUEUED", "RUNNING", "COMPLETED", "CANCELLED"]
);

export const bulkEditJob = catalogSchema.table(
  "bulk_edit_job",
  {
    id: uuid("id").primaryKey(),
    projectId: uuid("project_id").notNull(),
    status: bulkEditJobStatusEnum("status").notNull().default("QUEUED"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    startedAt: timestamp("started_at", { withTimezone: true, mode: "string" }),
    finishedAt: timestamp("finished_at", { withTimezone: true, mode: "string" }),
  },
  (table) => [
    index("bulk_edit_job_project_created_idx").on(
      table.projectId,
      table.createdAt
    ),
    index("bulk_edit_job_project_status_idx").on(
      table.projectId,
      table.status
    ),
  ]
);

export type BulkEditJob = typeof bulkEditJob.$inferSelect;
export type NewBulkEditJob = typeof bulkEditJob.$inferInsert;
