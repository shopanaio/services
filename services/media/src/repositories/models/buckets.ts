import {
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { mediaSchema } from "./schema";

export const buckets = mediaSchema.table(
  "buckets",
  {
    id: uuid("id").primaryKey(),
    projectId: uuid("project_id").notNull(),
    bucketName: varchar("bucket_name", { length: 63 }).notNull().unique(),
    region: varchar("region", { length: 32 }).notNull().default("us-east-1"),
    status: varchar("status", { length: 16 }).notNull().default("active"),
    priority: integer("priority").notNull().default(0),
    endpointUrl: text("endpoint_url"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_buckets_project_id").on(table.projectId),
    index("idx_buckets_status")
      .on(table.status)
      .where(sql`deleted_at IS NULL`),
  ]
);

export type Bucket = typeof buckets.$inferSelect;
export type NewBucket = typeof buckets.$inferInsert;
