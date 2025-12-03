import {
  pgTable,
  uuid,
  varchar,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { buckets } from "./buckets";

export const bucketRotationLog = pgTable(
  "bucket_rotation_log",
  {
    id: uuid("id").primaryKey(),
    projectId: uuid("project_id").notNull(),
    oldBucketId: uuid("old_bucket_id").references(() => buckets.id, {
      onDelete: "set null",
    }),
    newBucketId: uuid("new_bucket_id").references(() => buckets.id, {
      onDelete: "set null",
    }),
    reason: varchar("reason", { length: 64 }).notNull(),
    details: jsonb("details"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_bucket_rotation_log_project").on(table.projectId, sql`${table.createdAt} DESC`),
  ]
);

export type BucketRotationLog = typeof bucketRotationLog.$inferSelect;
export type NewBucketRotationLog = typeof bucketRotationLog.$inferInsert;
