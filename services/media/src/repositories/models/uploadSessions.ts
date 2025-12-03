import {
  pgTable,
  uuid,
  varchar,
  bigint,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { buckets } from "./buckets";

export const uploadSessions = pgTable(
  "upload_sessions",
  {
    id: uuid("id").primaryKey(),
    projectId: uuid("project_id").notNull(),
    bucketId: uuid("bucket_id")
      .notNull()
      .references(() => buckets.id, { onDelete: "cascade" }),
    objectKey: varchar("object_key", { length: 1024 }).notNull(),
    originalName: varchar("original_name", { length: 255 }),
    mimeType: varchar("mime_type", { length: 127 }),
    totalSizeBytes: bigint("total_size_bytes", { mode: "number" }).notNull(),
    uploadedBytes: bigint("uploaded_bytes", { mode: "number" })
      .notNull()
      .default(0),
    multipartUploadId: varchar("multipart_upload_id", { length: 255 }),
    status: varchar("status", { length: 32 }).notNull().default("pending"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_upload_sessions_project").on(table.projectId),
    index("idx_upload_sessions_expires")
      .on(table.expiresAt)
      .where(sql`status = 'pending'`),
  ]
);

export type UploadSession = typeof uploadSessions.$inferSelect;
export type NewUploadSession = typeof uploadSessions.$inferInsert;
