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
  check,
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
    deletionState: varchar("deletion_state", { length: 20 })
      .notNull()
      .default("ACTIVE"),
    deletionErrorCode: varchar("deletion_error_code", { length: 20 }),
    lastDeletionError: text("last_deletion_error"),
    deletingStartedAt: timestamp("deleting_started_at", {
      withTimezone: true,
      mode: "string",
    }),
    failedAt: timestamp("failed_at", { withTimezone: true, mode: "string" }),
  },
  (table) => [
    index("idx_files_asset_group")
      .on(table.assetGroupId)
      .where(sql`deleted_at IS NULL`),
    index("idx_files_provider")
      .on(table.assetGroupId, table.provider)
      .where(sql`deleted_at IS NULL`),
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
    index("idx_files_gc_soft_deleted")
      .on(table.deletedAt, table.id)
      .where(sql`deletion_state = 'SOFT_DELETED'`),
    index("idx_files_gc_soft_deleted_clean")
      .on(table.deletedAt, table.id)
      .where(sql`deletion_state = 'SOFT_DELETED' AND deletion_error_code IS NULL`),
    index("idx_files_stuck_deleting")
      .on(table.deletingStartedAt, table.id)
      .where(
        sql`deletion_state = 'DELETING' AND deleting_started_at IS NOT NULL`
      ),
    check(
      "chk_error_fields_paired",
      sql`(deletion_error_code IS NULL) = (failed_at IS NULL)`
    ),
    check(
      "chk_deleting_has_no_errors",
      sql`deletion_state <> 'DELETING' OR (deletion_error_code IS NULL AND failed_at IS NULL AND last_deletion_error IS NULL)`
    ),
    check(
      "chk_deleting_has_started_at",
      sql`deletion_state <> 'DELETING' OR deleting_started_at IS NOT NULL`
    ),
    check(
      "chk_active_has_no_deletion_fields",
      sql`deletion_state <> 'ACTIVE' OR (deleted_at IS NULL AND deleting_started_at IS NULL AND deletion_error_code IS NULL AND failed_at IS NULL AND last_deletion_error IS NULL)`
    ),
    check(
      "chk_deletion_state_valid",
      sql`deletion_state IN ('ACTIVE', 'SOFT_DELETED', 'DELETING')`
    ),
    check(
      "chk_deletion_error_code_valid",
      sql`deletion_error_code IS NULL OR deletion_error_code IN ('RETRYABLE', 'FATAL')`
    ),
  ]
);

export type File = typeof files.$inferSelect;
export type NewFile = typeof files.$inferInsert;

export type DeletionState = "ACTIVE" | "SOFT_DELETED" | "DELETING";
export type DeletionErrorCode = "RETRYABLE" | "FATAL";
