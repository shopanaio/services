import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  bigint,
  boolean,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const files = pgTable(
  "files",
  {
    id: uuid("id").primaryKey(),
    projectId: uuid("project_id").notNull(),
    provider: varchar("provider", { length: 32 }).notNull(),
    url: text("url").notNull(),
    mimeType: varchar("mime_type", { length: 127 }),
    ext: varchar("ext", { length: 16 }),
    sizeBytes: bigint("size_bytes", { mode: "number" }).notNull().default(0),
    originalName: varchar("original_name", { length: 255 }),
    width: integer("width"),
    height: integer("height"),
    durationMs: integer("duration_ms"),
    altText: varchar("alt_text", { length: 255 }),
    sourceUrl: text("source_url"),
    idempotencyKey: varchar("idempotency_key", { length: 255 }),
    isProcessed: boolean("is_processed").notNull().default(false),
    meta: jsonb("meta"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_files_project_id")
      .on(table.projectId)
      .where(sql`deleted_at IS NULL`),
    index("idx_files_provider")
      .on(table.projectId, table.provider)
      .where(sql`deleted_at IS NULL`),
    index("idx_files_created_at")
      .on(table.projectId, sql`${table.createdAt} DESC`)
      .where(sql`deleted_at IS NULL`),
    index("idx_files_deleted_at")
      .on(table.deletedAt)
      .where(sql`deleted_at IS NOT NULL`),
    uniqueIndex("idx_files_source_url")
      .on(table.projectId, table.sourceUrl)
      .where(sql`deleted_at IS NULL AND source_url IS NOT NULL`),
    uniqueIndex("idx_files_idempotency_key")
      .on(table.projectId, table.idempotencyKey)
      .where(sql`deleted_at IS NULL AND idempotency_key IS NOT NULL`),
  ]
);

export type File = typeof files.$inferSelect;
export type NewFile = typeof files.$inferInsert;
