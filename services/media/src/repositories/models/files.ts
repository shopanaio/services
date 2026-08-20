import {
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
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { mediaSchema } from "./schema";
import { assetGroups } from "./assetGroups";

export const files = mediaSchema.table(
  "files",
  {
    id: uuid("id").primaryKey(),
    assetGroupId: uuid("asset_group_id")
      .notNull()
      .references(() => assetGroups.id, { onDelete: "cascade" }),
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
    mediaType: varchar("media_type", { length: 32 }).notNull().default("GENERIC_FILE"),
    previewFileId: uuid("preview_file_id").references((): AnyPgColumn => files.id, {
      onDelete: "set null",
    }),
    thumbhash: text("thumbhash"),
    processingStatus: varchar("processing_status", { length: 32 }).notNull().default("PENDING"),
    processingError: text("processing_error"),
    processedAt: timestamp("processed_at", {
      withTimezone: true,
      mode: "string",
    }),
    sourceUrl: text("source_url"),
    idempotencyKey: varchar("idempotency_key", { length: 255 }),
    isProcessed: boolean("is_processed").notNull().default(false),
    meta: jsonb("meta"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
  },
  (table) => [
    index("idx_files_asset_group")
      .on(table.assetGroupId)
      .where(sql`deleted_at IS NULL`),
    index("idx_files_provider")
      .on(table.assetGroupId, table.provider)
      .where(sql`deleted_at IS NULL`),
    index("idx_files_media_type")
      .on(table.assetGroupId, table.mediaType)
      .where(sql`deleted_at IS NULL`),
    index("idx_files_preview_file").on(table.previewFileId),
    index("idx_files_created_at")
      .on(table.assetGroupId, sql`${table.createdAt} DESC`)
      .where(sql`deleted_at IS NULL`),
    index("idx_files_deleted_at")
      .on(table.deletedAt)
      .where(sql`deleted_at IS NOT NULL`),
    uniqueIndex("idx_files_source_url")
      .on(table.assetGroupId, table.sourceUrl)
      .where(sql`deleted_at IS NULL AND source_url IS NOT NULL`),
    uniqueIndex("idx_files_idempotency_key")
      .on(table.assetGroupId, table.idempotencyKey)
      .where(sql`deleted_at IS NULL AND idempotency_key IS NOT NULL`),
  ],
);

export type File = typeof files.$inferSelect;
export type NewFile = typeof files.$inferInsert;
