import { eq, and, inArray, sql, lt, or, isNull, isNotNull } from "drizzle-orm";
import type { Database } from "../infrastructure/db/database";
import {
  fileDeletionStates,
  files,
  type FileDeletionState,
  type NewFileDeletionState,
} from "./models";
import type {
  DeletionErrorCode,
  FindSoftDeletedForGCParams,
  MarkDeletingResult,
  ResetStuckDeletingParams,
  RestoreResult,
} from "../types/deletion.js";

// ---- Types ----

export interface FileWithDeletionState {
  file: typeof files.$inferSelect;
  deletionState: FileDeletionState;
}

// ---- Repository ----

export class FileDeletionStateRepository {
  constructor(private readonly db: Database) {}

  // ---- Read methods ----

  /**
   * Find deletion state by file ID
   */
  async findByFileId(fileId: string): Promise<FileDeletionState | null> {
    const result = await this.db
      .select()
      .from(fileDeletionStates)
      .where(eq(fileDeletionStates.fileId, fileId))
      .limit(1);

    return result[0] ?? null;
  }

  /**
   * Find deletion states by multiple file IDs (batch load for DataLoader)
   */
  async findByFileIds(fileIds: string[]): Promise<Map<string, FileDeletionState>> {
    if (fileIds.length === 0) {
      return new Map();
    }

    const result = await this.db
      .select()
      .from(fileDeletionStates)
      .where(inArray(fileDeletionStates.fileId, fileIds));

    const map = new Map<string, FileDeletionState>();
    for (const state of result) {
      map.set(state.fileId, state);
    }

    return map;
  }

  // ---- Write methods ----

  /**
   * Create initial deletion state for a file (ACTIVE by default)
   */
  async create(fileId: string): Promise<FileDeletionState> {
    const newState: NewFileDeletionState = {
      fileId,
      deletionState: "ACTIVE",
    };

    const result = await this.db
      .insert(fileDeletionStates)
      .values(newState)
      .returning();

    return result[0];
  }

  /**
   * Soft delete a file if it is ACTIVE
   */
  async softDeleteIfEligible(fileId: string): Promise<string | null> {
    const result = await this.db
      .update(fileDeletionStates)
      .set({
        deletionState: "SOFT_DELETED",
      })
      .where(
        and(
          eq(fileDeletionStates.fileId, fileId),
          eq(fileDeletionStates.deletionState, "ACTIVE")
        )
      )
      .returning({ fileId: fileDeletionStates.fileId });

    return result[0]?.fileId ?? null;
  }

  /**
   * Soft delete multiple files if they are ACTIVE
   */
  async softDeleteManyIfEligible(fileIds: string[]): Promise<string[]> {
    if (fileIds.length === 0) {
      return [];
    }

    const result = await this.db
      .update(fileDeletionStates)
      .set({
        deletionState: "SOFT_DELETED",
      })
      .where(
        and(
          inArray(fileDeletionStates.fileId, fileIds),
          eq(fileDeletionStates.deletionState, "ACTIVE")
        )
      )
      .returning({ fileId: fileDeletionStates.fileId });

    return result.map((row) => row.fileId);
  }

  /**
   * Mark a SOFT_DELETED file as DELETING and return the started_at timestamp
   */
  async markDeletingReturningStartedAt(
    fileId: string
  ): Promise<MarkDeletingResult | null> {
    const result = await this.db
      .update(fileDeletionStates)
      .set({
        deletionState: "DELETING",
        deletingStartedAt: sql`now()`,
        deletionErrorCode: null,
        failedAt: null,
        lastDeletionError: null,
      })
      .where(
        and(
          eq(fileDeletionStates.fileId, fileId),
          eq(fileDeletionStates.deletionState, "SOFT_DELETED")
        )
      )
      .returning({ startedAt: fileDeletionStates.deletingStartedAt });

    if (!result[0]?.startedAt) {
      return null;
    }

    return { startedAt: new Date(result[0].startedAt) };
  }

  /**
   * Verify DELETING lock with DB-side timestamp comparison
   */
  async isDeletionLockValid(
    fileId: string,
    expectedStartedAt: Date
  ): Promise<boolean> {
    const result = await this.db.execute<{ exists: boolean }>(sql`
      SELECT EXISTS (
        SELECT 1 FROM media.file_deletion_states
        WHERE file_id = ${fileId}
          AND deletion_state = 'DELETING'
          AND deleting_started_at = ${expectedStartedAt.toISOString()}
      ) as exists
    `);

    return result[0]?.exists ?? false;
  }

  /**
   * Roll back a DELETING file to SOFT_DELETED with error attributes
   */
  async markErrorAndRollback(
    fileId: string,
    errorCode: DeletionErrorCode,
    errorMessage: string
  ): Promise<boolean> {
    const result = await this.db
      .update(fileDeletionStates)
      .set({
        deletionState: "SOFT_DELETED",
        deletionErrorCode: errorCode,
        lastDeletionError: errorMessage,
        failedAt: sql`now()`,
        deletingStartedAt: null,
      })
      .where(
        and(
          eq(fileDeletionStates.fileId, fileId),
          eq(fileDeletionStates.deletionState, "DELETING")
        )
      )
      .returning({ fileId: fileDeletionStates.fileId });

    return result.length > 0;
  }

  /**
   * Find SOFT_DELETED files eligible for GC (returns file IDs)
   */
  async findSoftDeletedForGC(
    params: FindSoftDeletedForGCParams
  ): Promise<FileDeletionState[]> {
    return this.db
      .select()
      .from(fileDeletionStates)
      .innerJoin(files, eq(files.id, fileDeletionStates.fileId))
      .where(
        and(
          eq(fileDeletionStates.deletionState, "SOFT_DELETED"),
          lt(files.deletedAt, params.cutoffDate.toISOString()),
          or(
            isNull(fileDeletionStates.deletionErrorCode),
            and(
              eq(fileDeletionStates.deletionErrorCode, "RETRYABLE"),
              isNotNull(fileDeletionStates.failedAt),
              lt(fileDeletionStates.failedAt, params.errorCooldown.toISOString())
            )
          )
        )
      )
      .orderBy(files.deletedAt, fileDeletionStates.fileId)
      .limit(params.limit)
      .then((rows) => rows.map((r) => r.file_deletion_states));
  }

  /**
   * Reset DELETING files that are stuck beyond timeout
   */
  async resetStuckDeleting(params: ResetStuckDeletingParams): Promise<number> {
    const result = await this.db.execute<{ file_id: string }>(sql`
      WITH cte AS (
        SELECT file_id FROM media.file_deletion_states
        WHERE deletion_state = 'DELETING'
          AND deleting_started_at IS NOT NULL
          AND deleting_started_at < ${params.stuckSince.toISOString()}
        ORDER BY deleting_started_at, file_id
        LIMIT ${params.limit}
      )
      UPDATE media.file_deletion_states fds
      SET
        deletion_state = 'SOFT_DELETED',
        deleting_started_at = NULL,
        deletion_error_code = 'RETRYABLE',
        failed_at = now(),
        last_deletion_error = 'stuck deleting timeout'
      FROM cte
      WHERE fds.file_id = cte.file_id
      RETURNING fds.file_id
    `);

    return result.length;
  }

  /**
   * Clear error attributes on SOFT_DELETED files
   */
  async clearError(fileId: string): Promise<boolean> {
    const result = await this.db
      .update(fileDeletionStates)
      .set({
        deletionErrorCode: null,
        lastDeletionError: null,
        failedAt: null,
      })
      .where(
        and(
          eq(fileDeletionStates.fileId, fileId),
          eq(fileDeletionStates.deletionState, "SOFT_DELETED"),
          isNotNull(fileDeletionStates.deletionErrorCode)
        )
      )
      .returning({ fileId: fileDeletionStates.fileId });

    return result.length > 0;
  }

  /**
   * Restore a soft-deleted file to ACTIVE state
   */
  async restore(fileId: string): Promise<RestoreResult> {
    const current = await this.findByFileId(fileId);
    if (!current) {
      return { success: false, error: "INVALID_STATE" };
    }
    if (current.deletionState === "DELETING") {
      return { success: false, error: "FILE_BEING_DELETED" };
    }
    if (current.deletionState === "ACTIVE") {
      return { success: false, error: "INVALID_STATE" };
    }

    await this.db
      .update(fileDeletionStates)
      .set({
        deletionState: "ACTIVE",
        deletionErrorCode: null,
        lastDeletionError: null,
        failedAt: null,
        deletingStartedAt: null,
      })
      .where(eq(fileDeletionStates.fileId, fileId));

    return { success: true };
  }

  /**
   * Delete deletion state row (used when file is hard deleted)
   */
  async delete(fileId: string): Promise<void> {
    await this.db
      .delete(fileDeletionStates)
      .where(eq(fileDeletionStates.fileId, fileId));
  }

  /**
   * Check if deletion state exists
   */
  async exists(fileId: string): Promise<boolean> {
    const result = await this.db
      .select({ fileId: fileDeletionStates.fileId })
      .from(fileDeletionStates)
      .where(eq(fileDeletionStates.fileId, fileId))
      .limit(1);

    return result.length > 0;
  }
}
