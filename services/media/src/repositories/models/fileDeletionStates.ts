import { uuid, varchar, text, timestamp, index, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { mediaSchema } from "./schema";
import { files } from "./files";

/**
 * File deletion states table - 1:1 relationship with files.
 * Tracks the deletion lifecycle of files for garbage collection.
 */
export const fileDeletionStates = mediaSchema.table(
  "file_deletion_states",
  {
    fileId: uuid("file_id")
      .primaryKey()
      .references(() => files.id, { onDelete: "cascade" }),
    // State machine: ACTIVE | SOFT_DELETED | DELETING
    deletionState: varchar("deletion_state", { length: 20 })
      .notNull()
      .default("ACTIVE"),
    // Error classification: RETRYABLE | FATAL (null = no error)
    deletionErrorCode: varchar("deletion_error_code", { length: 20 }),
    // Error details (message or JSON)
    lastDeletionError: text("last_deletion_error"),
    // When hard delete started (for stuck detection)
    deletingStartedAt: timestamp("deleting_started_at", {
      withTimezone: true,
      mode: "string",
    }),
    // When last error occurred (for cooldown)
    failedAt: timestamp("failed_at", { withTimezone: true, mode: "string" }),
  },
  (table) => [
    // GC query: all soft-deleted files
    index("idx_fds_gc_soft_deleted")
      .on(table.fileId)
      .where(sql`deletion_state = 'SOFT_DELETED'`),
    // GC query: clean soft-deleted files (no error)
    index("idx_fds_gc_soft_deleted_clean")
      .on(table.fileId)
      .where(
        sql`deletion_state = 'SOFT_DELETED' AND deletion_error_code IS NULL`
      ),
    // Stuck detection: files in DELETING
    index("idx_fds_stuck_deleting")
      .on(table.deletingStartedAt, table.fileId)
      .where(
        sql`deletion_state = 'DELETING' AND deleting_started_at IS NOT NULL`
      ),

    // ========== CHECK CONSTRAINTS ==========
    // error_code and failed_at must be paired
    check(
      "chk_fds_error_fields_paired",
      sql`(deletion_error_code IS NULL) = (failed_at IS NULL)`
    ),
    // DELETING state must have no error fields
    check(
      "chk_fds_deleting_has_no_errors",
      sql`deletion_state <> 'DELETING' OR (deletion_error_code IS NULL AND failed_at IS NULL AND last_deletion_error IS NULL)`
    ),
    // DELETING state must have started_at
    check(
      "chk_fds_deleting_has_started_at",
      sql`deletion_state <> 'DELETING' OR deleting_started_at IS NOT NULL`
    ),
    // ACTIVE state must have no deletion fields
    check(
      "chk_fds_active_has_no_deletion_fields",
      sql`deletion_state <> 'ACTIVE' OR (deleting_started_at IS NULL AND deletion_error_code IS NULL AND failed_at IS NULL AND last_deletion_error IS NULL)`
    ),
    // Valid deletion_state values
    check(
      "chk_fds_deletion_state_valid",
      sql`deletion_state IN ('ACTIVE', 'SOFT_DELETED', 'DELETING')`
    ),
    // Valid deletion_error_code values
    check(
      "chk_fds_deletion_error_code_valid",
      sql`deletion_error_code IS NULL OR deletion_error_code IN ('RETRYABLE', 'FATAL')`
    ),
  ]
);

export type FileDeletionState = typeof fileDeletionStates.$inferSelect;
export type NewFileDeletionState = typeof fileDeletionStates.$inferInsert;

// Type helpers for deletion
export type DeletionState = "ACTIVE" | "SOFT_DELETED" | "DELETING";
export type DeletionErrorCode = "RETRYABLE" | "FATAL";
