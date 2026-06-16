# File Deletion Architecture Plan

> **Version 2.1** - Added COALESCE deletedAt, best-effort logging, categorized rejections, operational endpoints

## Overview

Enterprise-grade file deletion system for Media Service using DBOS durable workflows.

### Goals

- **Consistency**: Ensure DB and S3 stay in sync (no orphans in either direction)
- **Performance**: Batch operations, non-blocking API
- **Reliability**: Automatic retry and recovery
- **Scalability**: Handle bulk deletions efficiently
- **Recoverability**: Grace period for accidental deletions

### Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Double guard check** | Prevents race between restore and hard delete |
| **Deletion token** | Unique ID per deletion request, cleared on restore |
| **Keyset pagination** | Stable cursor on (sortField, id) for GC batches |
| **Batch markFailed** | Single UPDATE with SQL CASE, no N+1 queries |
| **Deterministic backoff** | No Math.random() in DBOS steps |
| **Separate error log** | Keeps files table clean, allows detailed tracking |
| **COALESCE deletedAt** | Preserve original deletion time on re-delete |
| **Best-effort error log** | Error logging failures don't break deletion |
| **Categorized rejections** | Separate restored/notFound/conflict in response |

---

## Current Problems

| Problem               | Impact                                   |
| --------------------- | ---------------------------------------- |
| Synchronous S3 delete | Blocks HTTP request (~200ms)             |
| No batch delete       | O(n) API calls to S3                     |
| No retry logic        | Failed S3 deletes are lost               |
| Weak consistency      | S3 deleted but DB fails = orphan records |
| No grace period       | Accidental deletes cannot be recovered   |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         DELETE FLOW (DBOS)                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  1. SINGLE FILE DELETE                                            │   │
│  │     fileDelete(id, permanent: false)                              │   │
│  │          ↓                                                        │   │
│  │     Soft delete (sync) → deletionState = SOFT_DELETED            │   │
│  │                                                                   │   │
│  │     fileDelete(id, permanent: true)                               │   │
│  │          ↓                                                        │   │
│  │     FileHardDeleteWorkflow.run()                                  │   │
│  │          ├→ Step: Guard check (not restored?)                    │   │
│  │          ├→ Step: Mark DELETING                                  │   │
│  │          ├→ Step: S3 delete                                      │   │
│  │          └→ Step: Hard delete from DB                            │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  2. BATCH DELETE                                                  │   │
│  │     fileDeleteMany(ids: [..100], permanent: true)                 │   │
│  │          ↓                                                        │   │
│  │     FileBatchDeleteWorkflow.run()                                 │   │
│  │          ├→ Step: Soft delete all (SOFT_DELETED)                 │   │
│  │          ├→ Step: Mark all DELETING                              │   │
│  │          ├→ Step: S3 batch delete (parse partial errors)         │   │
│  │          ├→ Step: Hard delete ONLY succeeded from DB             │   │
│  │          └→ Step: Mark failed as FAILED with error               │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  3. GARBAGE COLLECTOR (scheduled)                                 │   │
│  │     Runs daily via cron                                           │   │
│  │          ↓                                                        │   │
│  │     FileGarbageCollectorWorkflow.run()                           │   │
│  │          ├→ Step: Find SOFT_DELETED older than grace period      │   │
│  │          ├→ Step: Find FAILED with next_attempt_at <= now        │   │
│  │          └→ Step: Process via FileBatchDeleteWorkflow            │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  4. RESTORE                                                       │   │
│  │     fileRestore(id)                                               │   │
│  │          ↓                                                        │   │
│  │     Check deletionState != DELETING (race protection)            │   │
│  │     Reset deletedAt = NULL, deletionState = ACTIVE               │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Database Schema Changes

### New fields in `files` table

```sql
-- Add deletion state tracking
ALTER TABLE media.files ADD COLUMN deletion_state VARCHAR(20) NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE media.files ADD COLUMN deletion_attempts INT NOT NULL DEFAULT 0;
ALTER TABLE media.files ADD COLUMN last_deletion_error TEXT;
ALTER TABLE media.files ADD COLUMN next_deletion_attempt_at TIMESTAMPTZ;
ALTER TABLE media.files ADD COLUMN deletion_token UUID; -- For race protection

-- Index for GC queries (SOFT_DELETED by deletedAt)
CREATE INDEX idx_files_gc_soft_deleted
  ON media.files (deleted_at, id)
  WHERE deletion_state = 'SOFT_DELETED';

-- Index for GC queries (FAILED by next_attempt)
CREATE INDEX idx_files_gc_failed
  ON media.files (next_deletion_attempt_at, id)
  WHERE deletion_state = 'FAILED' AND deletion_attempts < 5;

-- Index for PERMANENTLY_FAILED (for alerting/manual review)
CREATE INDEX idx_files_permanently_failed
  ON media.files (updated_at)
  WHERE deletion_state = 'PERMANENTLY_FAILED';

-- Enum values
COMMENT ON COLUMN media.files.deletion_state IS
  'ACTIVE | SOFT_DELETED | DELETING | FAILED | PERMANENTLY_FAILED';
```

### Deletion State Machine

```
    ┌─────────┐
    │ ACTIVE  │ ◄─────────────────────┐
    └────┬────┘                       │
         │ soft delete                │ restore
         ▼                            │
  ┌──────────────┐              ┌─────┴─────┐
  │ SOFT_DELETED │─────────────►│  (check)  │
  └──────┬───────┘   restore    └───────────┘
         │ permanent delete
         ▼
    ┌──────────┐
    │ DELETING │ ◄───────┐
    └────┬─────┘         │ retry
         │               │
    ┌────┴────┐     ┌────┴───┐
    │ success │     │ FAILED │
    └────┬────┘     └────────┘
         │
         ▼
    [HARD DELETE]
```

---

## Components

### 1. FileHardDeleteWorkflow

Single file permanent deletion with **double guard check** against restore race.

**File:** `workflows/FileHardDeleteWorkflow.ts`

```typescript
export interface FileHardDeleteInput {
  fileId: string;
  provider: string;
  objectKey?: string;
  bucketName?: string;
  deletionToken: string; // UUID generated at workflow start
}

export interface FileHardDeleteOutput {
  success: boolean;
  fileId: string;
  error?: string;
  abortReason?: "RESTORED" | "TOKEN_MISMATCH" | "NOT_FOUND";
}

export class FileHardDeleteWorkflow extends BaseWorkflow {
  static workflowID(fileId: string): string {
    return `file:hard-delete:${fileId}`;
  }

  @DBOS.workflow()
  async run(input: FileHardDeleteInput): Promise<FileHardDeleteOutput> {
    const { fileId, provider, objectKey, bucketName, deletionToken } = input;

    // Step 1: Initial guard - verify file marked for deletion with our token
    const initialCheck = await this.guardCheck(fileId, deletionToken, ["SOFT_DELETED"]);
    if (!initialCheck.canProceed) {
      return {
        success: false,
        fileId,
        error: `Aborted: ${initialCheck.reason}`,
        abortReason: initialCheck.reason,
      };
    }

    // Step 2: Atomically mark as DELETING (only if still SOFT_DELETED with our token)
    const marked = await this.markDeletingAtomic(fileId, deletionToken);
    if (!marked) {
      return {
        success: false,
        fileId,
        error: "File was restored during state transition",
        abortReason: "RESTORED",
      };
    }

    // Step 3: Delete from S3 (if S3 provider)
    if (provider === "S3" && objectKey && bucketName) {
      const s3Result = await this.deleteFromS3(objectKey, bucketName);
      if (!s3Result.success && !s3Result.notFound) {
        // Mark failed and get current attempts for backoff calculation
        const attempts = await this.markFailedAndGetAttempts(fileId, s3Result.error!);
        return { success: false, fileId, error: s3Result.error };
      }
    }

    // Step 4: CRITICAL - Final guard before DB delete
    // Verify file is still DELETING with our token (restore sets state=ACTIVE, token=null)
    const finalCheck = await this.guardCheck(fileId, deletionToken, ["DELETING"]);
    if (!finalCheck.canProceed) {
      // File was somehow restored after S3 delete - rare but possible
      // S3 object is gone but file record preserved - log this anomaly
      return {
        success: false,
        fileId,
        error: `Final guard failed: ${finalCheck.reason}. S3 object may be orphaned.`,
        abortReason: finalCheck.reason,
      };
    }

    // Step 5: Hard delete from DB
    await this.hardDeleteFromDB(fileId, provider);

    return { success: true, fileId };
  }

  /**
   * Guard check - verifies file state and token match
   * Returns detailed reason for rejection
   */
  @DBOS.step()
  async guardCheck(
    fileId: string,
    deletionToken: string,
    allowedStates: string[]
  ): Promise<{ canProceed: boolean; reason?: "RESTORED" | "TOKEN_MISMATCH" | "NOT_FOUND" }> {
    const file = await this.repository.file.findForDeletion(fileId);

    if (!file) {
      return { canProceed: false, reason: "NOT_FOUND" };
    }

    if (!allowedStates.includes(file.deletionState)) {
      // State changed (e.g., restored to ACTIVE, or already FAILED)
      return { canProceed: false, reason: "RESTORED" };
    }

    if (file.deletionToken !== deletionToken) {
      // Another deletion process owns this file, or restore cleared token
      return { canProceed: false, reason: "TOKEN_MISMATCH" };
    }

    return { canProceed: true };
  }

  /**
   * Atomically transition SOFT_DELETED -> DELETING only if token matches
   * Uses conditional UPDATE to prevent race with restore
   */
  @DBOS.step()
  async markDeletingAtomic(fileId: string, deletionToken: string): Promise<boolean> {
    const updated = await this.repository.file.transitionState(fileId, {
      fromState: "SOFT_DELETED",
      toState: "DELETING",
      requiredToken: deletionToken,
    });
    return updated;
  }

  @DBOS.step({ retries_allowed: true, interval_seconds: 5, max_attempts: 3 })
  async deleteFromS3(
    objectKey: string,
    bucketName: string
  ): Promise<{ success: boolean; notFound?: boolean; error?: string }> {
    try {
      const s3Client = getS3Client();
      await s3Client.removeObject(bucketName, objectKey);
      return { success: true };
    } catch (error: any) {
      if (error.code === "NoSuchKey" || error.code === "NotFound") {
        return { success: true, notFound: true };
      }
      if (error.code === "AccessDenied") {
        return { success: false, error: `AccessDenied: ${error.message}` };
      }
      throw error; // Retry other errors
    }
  }

  /**
   * Mark as failed and return current attempts count for backoff calculation
   */
  @DBOS.step()
  async markFailedAndGetAttempts(fileId: string, error: string): Promise<number> {
    const result = await this.repository.file.markFailedReturning(fileId, error);
    // Calculate next attempt based on actual attempts from DB
    const nextAttempt = this.calculateNextAttempt(result.deletionAttempts);
    await this.repository.file.setNextAttempt(fileId, nextAttempt);
    return result.deletionAttempts;
  }

  @DBOS.step()
  async hardDeleteFromDB(fileId: string, provider: string): Promise<void> {
    if (provider === "S3") {
      await this.repository.s3Object.delete(fileId);
    } else if (["YOUTUBE", "VIMEO", "URL"].includes(provider)) {
      await this.repository.externalMedia.delete(fileId);
    }
    await this.repository.file.hardDelete(fileId);
  }

  /**
   * Deterministic backoff calculation (no random in step)
   * Jitter is applied at scheduling time, not here
   */
  private calculateNextAttempt(currentAttempts: number): Date {
    const delays = [5, 15, 45, 120, 360]; // minutes
    const idx = Math.min(currentAttempts, delays.length - 1);
    return new Date(Date.now() + delays[idx] * 60 * 1000);
  }
}
```

---

### 2. FileBatchDeleteWorkflow

Batch deletion with proper partial failure handling and **double guard check**.

**File:** `workflows/FileBatchDeleteWorkflow.ts`

```typescript
export interface FileBatchDeleteInput {
  fileIds: string[];
  permanent: boolean;
  requestId?: string; // For idempotency
}

export interface FileBatchDeleteOutput {
  deletedIds: string[];
  failedIds: Array<{ id: string; error: string }>;
  pendingIds: string[]; // Soft deleted, waiting for GC

  // Categorized rejections (for debugging/metrics)
  rejections: {
    restored: string[];    // File was restored (state changed to ACTIVE)
    notFound: string[];    // File ID doesn't exist
    conflict: string[];    // Token mismatch (another deletion in progress)
  };
}

export class FileBatchDeleteWorkflow extends BaseWorkflow {
  private readonly S3_BATCH_SIZE = 1000;
  private readonly MAX_FILES_PER_REQUEST = 100;

  /**
   * Idempotent workflow ID based on sorted file IDs hash or client requestId
   */
  static workflowID(fileIds: string[], permanent: boolean, requestId?: string): string {
    if (requestId) {
      return `file:batch-delete:${requestId}`;
    }
    const sorted = [...fileIds].sort();
    const hash = createHash("sha256")
      .update(sorted.join(",") + permanent)
      .digest("hex")
      .substring(0, 16);
    return `file:batch-delete:${hash}`;
  }

  @DBOS.workflow()
  async run(input: FileBatchDeleteInput): Promise<FileBatchDeleteOutput> {
    const { fileIds, permanent } = input;

    // Step 1: Generate deletion token for this batch
    const deletionToken = await this.generateDeletionToken();

    // Step 2: Fetch files with metadata + categorize not found
    const filesWithMeta = await this.fetchFilesWithMeta(fileIds);
    const existingIds = filesWithMeta.map((f) => f.id);
    const notFoundIds = fileIds.filter((id) => !existingIds.includes(id));

    // Step 3: Soft delete all + set deletion token (preserves original deletedAt)
    await this.softDeleteBatch(existingIds, deletionToken);

    if (!permanent) {
      return {
        deletedIds: [],
        failedIds: [],
        pendingIds: existingIds,
        rejections: { restored: [], notFound: notFoundIds, conflict: [] },
      };
    }

    // Step 4: Atomically mark as DELETING (only files still SOFT_DELETED with our token)
    const transitionResult = await this.markDeletingBatchAtomic(existingIds, deletionToken);

    // Step 5: Separate S3 and non-S3 files (only from marked ones)
    const markedFiles = filesWithMeta.filter((f) => transitionResult.marked.includes(f.id));
    const s3Files = markedFiles.filter((f) => f.provider === "S3" && f.s3Object);
    const nonS3Files = markedFiles.filter((f) => f.provider !== "S3");
    const s3FilesByBucket = this.groupByBucket(s3Files);

    // Step 6: Delete from S3 with partial error handling
    const s3Results = await this.deleteFromS3Batched(s3FilesByBucket);

    // Step 7: CRITICAL - Final guard before DB delete
    const succeededS3Ids = s3Results.succeeded;
    const nonS3Ids = nonS3Files.map((f) => f.id);
    const candidateIds = [...succeededS3Ids, ...nonS3Ids];

    const finalGuardResult = await this.finalGuardAndDelete(
      candidateIds,
      deletionToken,
      filesWithMeta
    );

    // Step 8: Mark S3-failed files as FAILED (batch update)
    if (s3Results.failed.length > 0) {
      await this.markFailedBatch(s3Results.failed.map((f) => f.id));
    }

    // Step 9: Best-effort error logging (doesn't fail workflow)
    if (s3Results.failed.length > 0) {
      await this.logDeletionErrorsBestEffort(s3Results.failed);
    }

    // Merge all rejection categories
    return {
      deletedIds: finalGuardResult.deleted,
      failedIds: s3Results.failed,
      pendingIds: [],
      rejections: {
        restored: [...transitionResult.restored, ...finalGuardResult.aborted],
        notFound: notFoundIds,
        conflict: transitionResult.conflict,
      },
    };
  }

  @DBOS.step()
  async generateDeletionToken(): Promise<string> {
    return uuidv7();
  }

  @DBOS.step()
  async fetchFilesWithMeta(fileIds: string[]): Promise<FileWithMeta[]> {
    const files = await this.repository.file.findByIdsIncludeDeleted(fileIds);
    const s3ObjectsMap = await this.repository.s3Object.findByFileIds(
      files.map((f) => f.id)
    );

    return files.map((file) => ({
      ...file,
      s3Object: s3ObjectsMap.get(file.id) ?? null,
    }));
  }

  @DBOS.step()
  async softDeleteBatch(fileIds: string[], deletionToken: string): Promise<void> {
    await this.repository.file.softDeleteMany(fileIds, {
      deletionState: "SOFT_DELETED",
      deletionToken,
      deletedAt: new Date(),
    });
  }

  /**
   * Atomically mark files as DELETING only if they're still SOFT_DELETED with our token.
   * Returns categorized results: marked, restored (state changed), conflict (token mismatch).
   */
  @DBOS.step()
  async markDeletingBatchAtomic(
    fileIds: string[],
    deletionToken: string
  ): Promise<{ marked: string[]; restored: string[]; conflict: string[] }> {
    return await this.repository.file.transitionStateManyWithReasons(fileIds, {
      fromState: "SOFT_DELETED",
      toState: "DELETING",
      requiredToken: deletionToken,
    });
  }

  @DBOS.step({ retries_allowed: true, interval_seconds: 15, max_attempts: 3 })
  async deleteFromS3Batched(
    byBucket: Map<string, S3DeleteItem[]>
  ): Promise<{
    succeeded: string[];
    failed: Array<{ id: string; error: string }>;
  }> {
    const succeeded: string[] = [];
    const failed: Array<{ id: string; error: string }> = [];

    for (const [bucketName, items] of byBucket) {
      for (const chunk of this.chunk(items, this.S3_BATCH_SIZE)) {
        try {
          const s3Client = getS3Client();
          const objectKeys = chunk.map((item) => item.objectKey);

          // MinIO removeObjects returns a stream of errors (partial failures)
          const errors = await this.collectS3DeleteErrors(
            s3Client,
            bucketName,
            objectKeys
          );

          const errorMap = new Map(errors.map((e) => [e.name, e.message]));

          for (const item of chunk) {
            const error = errorMap.get(item.objectKey);
            if (error) {
              // NoSuchKey = already deleted = success
              if (!error.includes("NoSuchKey") && !error.includes("NotFound")) {
                failed.push({ id: item.fileId, error });
                continue;
              }
            }
            succeeded.push(item.fileId);
          }
        } catch (error) {
          // Total chunk failure
          for (const item of chunk) {
            failed.push({ id: item.fileId, error: String(error) });
          }
        }
      }
    }

    return { succeeded, failed };
  }

  private async collectS3DeleteErrors(
    s3Client: MinioClient,
    bucketName: string,
    objectKeys: string[]
  ): Promise<Array<{ name: string; message: string }>> {
    const errors: Array<{ name: string; message: string }> = [];
    const errorStream = await s3Client.removeObjects(bucketName, objectKeys);

    return new Promise((resolve, reject) => {
      errorStream.on("data", (err: { name: string; message: string }) => {
        errors.push(err);
      });
      errorStream.on("end", () => resolve(errors));
      errorStream.on("error", reject);
    });
  }

  /**
   * Final guard: only hard delete files still in DELETING state with our token.
   * This protects against restore happening between S3 delete and DB delete.
   */
  @DBOS.step()
  async finalGuardAndDelete(
    candidateIds: string[],
    deletionToken: string,
    filesWithMeta: FileWithMeta[]
  ): Promise<{ deleted: string[]; aborted: string[] }> {
    if (candidateIds.length === 0) {
      return { deleted: [], aborted: [] };
    }

    // Check which files are still DELETING with our token
    const stillDeletingIds = await this.repository.file.findIdsInState(
      candidateIds,
      "DELETING",
      deletionToken
    );

    const aborted = candidateIds.filter((id) => !stillDeletingIds.includes(id));

    if (stillDeletingIds.length > 0) {
      // Delete provider records first (FK order)
      const s3Ids = filesWithMeta
        .filter((f) => stillDeletingIds.includes(f.id) && f.provider === "S3")
        .map((f) => f.id);
      const externalIds = filesWithMeta
        .filter(
          (f) =>
            stillDeletingIds.includes(f.id) &&
            ["YOUTUBE", "VIMEO", "URL"].includes(f.provider)
        )
        .map((f) => f.id);

      if (s3Ids.length > 0) {
        await this.repository.s3Object.deleteMany(s3Ids);
      }
      if (externalIds.length > 0) {
        await this.repository.externalMedia.deleteMany(externalIds);
      }

      // Hard delete file records
      await this.repository.file.hardDeleteMany(stillDeletingIds);
    }

    return { deleted: stillDeletingIds, aborted };
  }

  /**
   * Batch update: mark all as FAILED, increment attempts, set next_attempt_at
   * Single UPDATE query, no per-file loop
   */
  @DBOS.step()
  async markFailedBatch(fileIds: string[]): Promise<void> {
    if (fileIds.length === 0) return;

    // Batch update with calculated next_attempt_at based on current attempts
    await this.repository.file.markFailedMany(fileIds);
  }

  /**
   * Best-effort error logging - failures here don't break the deletion workflow.
   * Wrapped in try/catch to ensure deletion succeeds even if logging fails.
   */
  @DBOS.step()
  async logDeletionErrorsBestEffort(
    failures: Array<{ id: string; error: string }>
  ): Promise<void> {
    try {
      await this.repository.deletionErrorLog.insertMany(
        failures.map((f) => ({
          fileId: f.id,
          error: f.error,
          occurredAt: new Date(),
        }))
      );
    } catch (logError) {
      // Log to structured logger but don't throw
      this.logger.warn(
        { failedToLog: failures.length, error: logError },
        "Failed to write deletion errors to log table"
      );
    }
  }

  private groupByBucket(files: FileWithMeta[]): Map<string, S3DeleteItem[]> {
    const result = new Map<string, S3DeleteItem[]>();

    for (const file of files) {
      if (!file.s3Object) continue;

      const bucket = file.s3Object.bucketName ?? getBucketName();
      if (!result.has(bucket)) {
        result.set(bucket, []);
      }
      result.get(bucket)!.push({
        fileId: file.id,
        objectKey: file.s3Object.objectKey,
      });
    }

    return result;
  }

  private chunk<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}
```

---

### 3. FileGarbageCollectorWorkflow

Scheduled cleanup with **proper keyset pagination** and retry limit.

**File:** `workflows/FileGarbageCollectorWorkflow.ts`

```typescript
export interface GCInput {
  gracePeriodDays?: number; // Default: 30
  batchSize?: number; // Default: 500
  maxRetries?: number; // Default: 5
  dryRun?: boolean;
}

export interface GCOutput {
  processedCount: number;
  deletedCount: number;
  failedCount: number;
  skippedCount: number; // Exceeded max retries
  dryRun: boolean;
}

/**
 * Cursor for keyset pagination - must include all sort fields
 */
interface SoftDeletedCursor {
  deletedAt: Date;
  id: string;
}

interface FailedCursor {
  nextDeletionAttemptAt: Date;
  id: string;
}

export class FileGarbageCollectorWorkflow extends BaseWorkflow {
  private readonly DEFAULT_GRACE_PERIOD_DAYS = 30;
  private readonly DEFAULT_BATCH_SIZE = 500;
  private readonly DEFAULT_MAX_RETRIES = 5;

  static workflowID(runId: string): string {
    return `file:gc:${runId}`;
  }

  @DBOS.workflow()
  async run(input: GCInput = {}): Promise<GCOutput> {
    const gracePeriodDays = input.gracePeriodDays ?? this.DEFAULT_GRACE_PERIOD_DAYS;
    const batchSize = input.batchSize ?? this.DEFAULT_BATCH_SIZE;
    const maxRetries = input.maxRetries ?? this.DEFAULT_MAX_RETRIES;
    const dryRun = input.dryRun ?? false;

    let totalProcessed = 0;
    let totalDeleted = 0;
    let totalFailed = 0;
    let totalSkipped = 0;

    // Phase 1: Process expired SOFT_DELETED files
    let softDeletedCursor: SoftDeletedCursor | null = null;
    while (true) {
      const batch = await this.findExpiredSoftDeleted(
        gracePeriodDays,
        batchSize,
        softDeletedCursor
      );

      if (batch.length === 0) break;

      totalProcessed += batch.length;

      // Update cursor with BOTH sort fields from last item
      const lastItem = batch[batch.length - 1];
      softDeletedCursor = {
        deletedAt: lastItem.deletedAt,
        id: lastItem.id,
      };

      if (!dryRun) {
        const result = await this.processBatch(batch.map((f) => f.id));
        totalDeleted += result.deleted;
        totalFailed += result.failed;
      }
    }

    // Phase 2: Retry FAILED files (with retry limit)
    let failedCursor: FailedCursor | null = null;
    while (true) {
      const batch = await this.findRetryableFailed(
        batchSize,
        maxRetries,
        failedCursor
      );

      if (batch.length === 0) break;

      totalProcessed += batch.length;

      const lastItem = batch[batch.length - 1];
      failedCursor = {
        nextDeletionAttemptAt: lastItem.nextDeletionAttemptAt,
        id: lastItem.id,
      };

      if (!dryRun) {
        const result = await this.processBatch(batch.map((f) => f.id));
        totalDeleted += result.deleted;
        totalFailed += result.failed;
      }
    }

    // Phase 3: Mark files exceeding max retries as permanently failed
    const skipped = await this.markPermanentlyFailed(maxRetries);
    totalSkipped = skipped;

    return {
      processedCount: totalProcessed,
      deletedCount: totalDeleted,
      failedCount: totalFailed,
      skippedCount: totalSkipped,
      dryRun,
    };
  }

  @DBOS.step()
  async findExpiredSoftDeleted(
    gracePeriodDays: number,
    limit: number,
    cursor: SoftDeletedCursor | null
  ): Promise<Array<{ id: string; deletedAt: Date }>> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - gracePeriodDays);

    // Proper keyset pagination: cursor on (deletedAt, id)
    return await this.repository.file.findSoftDeletedForGC({
      cutoffDate,
      cursor,
      limit,
    });
  }

  @DBOS.step()
  async findRetryableFailed(
    limit: number,
    maxRetries: number,
    cursor: FailedCursor | null
  ): Promise<Array<{ id: string; nextDeletionAttemptAt: Date }>> {
    return await this.repository.file.findFailedForGC({
      now: new Date(),
      maxAttempts: maxRetries,
      cursor,
      limit,
    });
  }

  @DBOS.step()
  async processBatch(
    fileIds: string[]
  ): Promise<{ deleted: number; failed: number }> {
    const workflow = new FileBatchDeleteWorkflow("gc-inner", {
      kernel: this.kernel,
    });

    // Deterministic requestId: hash of sorted file IDs (no Math.random)
    const requestId = this.generateBatchRequestId(fileIds);

    const result = await workflow.run({
      fileIds,
      permanent: true,
      requestId,
    });

    return {
      deleted: result.deletedIds.length,
      failed: result.failedIds.length,
    };
  }

  /**
   * Generate deterministic request ID from file IDs.
   * Same set of files always produces same ID (idempotent).
   */
  private generateBatchRequestId(fileIds: string[]): string {
    const sorted = [...fileIds].sort();
    const hash = createHash("sha256")
      .update(sorted.join(","))
      .digest("hex")
      .substring(0, 16);
    return `gc-${hash}`;
  }

  @DBOS.step()
  async markPermanentlyFailed(maxRetries: number): Promise<number> {
    return await this.repository.file.markPermanentlyFailed(maxRetries);
  }
}
```

---

### 4. FileRestoreScript

Restore soft-deleted files with race protection.

**File:** `scripts/file/FileRestoreScript.ts`

```typescript
export interface FileRestoreParams {
  id: string;
}

export interface FileRestoreResult {
  file: File | null;
  userErrors: UserError[];
}

export class FileRestoreScript extends BaseScript<FileRestoreParams, FileRestoreResult> {
  protected async execute(params: FileRestoreParams): Promise<FileRestoreResult> {
    const { id } = params;

    // Find file including soft-deleted
    const file = await this.repository.file.findByIdIncludeDeleted(id);

    if (!file) {
      return {
        file: null,
        userErrors: [{ message: "File not found", code: "NOT_FOUND", field: ["id"] }],
      };
    }

    // Check deletion state
    if (file.deletionState === "ACTIVE") {
      return {
        file: null,
        userErrors: [{ message: "File is not deleted", code: "INVALID_STATE" }],
      };
    }

    if (file.deletionState === "DELETING") {
      return {
        file: null,
        userErrors: [
          {
            message: "File is being permanently deleted and cannot be restored",
            code: "DELETION_IN_PROGRESS",
          },
        ],
      };
    }

    // Restore: clear deletion fields
    const restored = await this.repository.file.restore(id);

    if (!restored) {
      return {
        file: null,
        userErrors: [{ message: "Failed to restore file", code: "INTERNAL_ERROR" }],
      };
    }

    return { file: restored, userErrors: [] };
  }
}
```

---

### 5. Updated FileDeleteScript

**File:** `scripts/file/FileDeleteScript.ts`

```typescript
export class FileDeleteScript extends BaseScript<FileDeleteParams, FileDeleteResult> {
  protected async execute(params: FileDeleteParams): Promise<FileDeleteResult> {
    const { id, permanent = false } = params;

    const file = await this.repository.file.findById(id);
    if (!file) {
      if (permanent) {
        // Check soft-deleted files for permanent delete
        const deletedFile = await this.repository.file.findDeletedById(id);
        if (deletedFile) {
          return await this.runHardDeleteWorkflow(deletedFile);
        }
      }
      return {
        deletedFileId: null,
        userErrors: [{ message: "File not found", code: "NOT_FOUND" }],
      };
    }

    if (!permanent) {
      // Soft delete only
      await this.repository.file.softDelete(id, {
        deletionState: "SOFT_DELETED",
        deletedAt: new Date(),
      });
      return { deletedFileId: id, userErrors: [] };
    }

    return await this.runHardDeleteWorkflow(file);
  }

  private async runHardDeleteWorkflow(file: File): Promise<FileDeleteResult> {
    const workflow =
      this.services.workflow.get<FileHardDeleteWorkflow>("fileHardDelete");

    // Get S3 metadata
    let objectKey: string | undefined;
    let bucketName: string | undefined;

    if (file.provider === "S3") {
      const s3Object = await this.repository.s3Object.findByFileId(file.id);
      if (s3Object) {
        objectKey = s3Object.objectKey;
        bucketName = s3Object.bucketName ?? getBucketName();
      }
    }

    // Generate deletion token for race protection
    const deletionToken = uuidv7();

    // Set deletion token before starting workflow
    await this.repository.file.updateDeletionState(file.id, {
      deletionState: "SOFT_DELETED",
      deletionToken,
      deletedAt: file.deletedAt ?? new Date(),
    });

    const result = await workflow.run({
      fileId: file.id,
      provider: file.provider,
      objectKey,
      bucketName,
      deletionToken,
    });

    if (!result.success) {
      return {
        deletedFileId: null,
        userErrors: [{ message: result.error ?? "Delete failed", code: "DELETE_FAILED" }],
      };
    }

    return { deletedFileId: file.id, userErrors: [] };
  }
}
```

---

### 6. FileDeleteManyScript

**File:** `scripts/file/FileDeleteManyScript.ts`

```typescript
export interface FileDeleteManyParams {
  ids: string[];
  permanent?: boolean;
  requestId?: string; // Client-provided for idempotency
}

export interface FileDeleteManyResult {
  deletedFileIds: string[];
  pendingFileIds: string[];
  failedIds: Array<{ id: string; reason: string }>;
  userErrors: UserError[];
}

export class FileDeleteManyScript extends BaseScript<
  FileDeleteManyParams,
  FileDeleteManyResult
> {
  private readonly MAX_BATCH_SIZE = 100;

  protected async execute(params: FileDeleteManyParams): Promise<FileDeleteManyResult> {
    const { ids, permanent = false, requestId } = params;

    if (ids.length === 0) {
      return {
        deletedFileIds: [],
        pendingFileIds: [],
        failedIds: [],
        userErrors: [{ message: "No file IDs provided", code: "INVALID_INPUT" }],
      };
    }

    if (ids.length > this.MAX_BATCH_SIZE) {
      return {
        deletedFileIds: [],
        pendingFileIds: [],
        failedIds: [],
        userErrors: [
          {
            message: `Maximum ${this.MAX_BATCH_SIZE} files per request`,
            code: "BATCH_TOO_LARGE",
          },
        ],
      };
    }

    const workflow =
      this.services.workflow.get<FileBatchDeleteWorkflow>("fileBatchDelete");

    const result = await workflow.run({
      fileIds: ids,
      permanent,
      requestId,
    });

    return {
      deletedFileIds: result.deletedIds,
      pendingFileIds: result.pendingIds,
      failedIds: result.failedIds,
      userErrors: [],
    };
  }
}
```

---

### 7. Repository Methods

**File:** `repositories/FileRepository.ts`

```typescript
// ============================================
// BASIC CRUD
// ============================================

async findByIdIncludeDeleted(fileId: string): Promise<File | null> {
  const [file] = await this.db
    .select()
    .from(files)
    .where(eq(files.id, fileId))
    .limit(1);
  return file ?? null;
}

async findByIdsIncludeDeleted(fileIds: string[]): Promise<File[]> {
  if (fileIds.length === 0) return [];
  return await this.db
    .select()
    .from(files)
    .where(inArray(files.id, fileIds));
}

async hardDelete(fileId: string): Promise<void> {
  await this.db.delete(files).where(eq(files.id, fileId));
}

async hardDeleteMany(fileIds: string[]): Promise<void> {
  if (fileIds.length === 0) return;
  await this.db.delete(files).where(inArray(files.id, fileIds));
}

// ============================================
// SOFT DELETE
// ============================================

/**
 * Soft delete files. Uses COALESCE to preserve original deletedAt
 * if file was already soft-deleted (prevents "freshening" old deletes).
 */
async softDeleteMany(fileIds: string[], state: SoftDeleteInput): Promise<void> {
  if (fileIds.length === 0) return;
  await this.db
    .update(files)
    .set({
      // Preserve original deletion time if already set
      deletedAt: sql`COALESCE(deleted_at, ${state.deletedAt})`,
      deletionState: state.deletionState,
      deletionToken: state.deletionToken,
      updatedAt: new Date(),
    })
    .where(inArray(files.id, fileIds));
}

// ============================================
// STATE TRANSITIONS (Atomic with conditions)
// ============================================

/**
 * Atomically transition single file state.
 * Returns true if transition succeeded, false if conditions not met.
 */
async transitionState(
  fileId: string,
  params: { fromState: string; toState: string; requiredToken: string }
): Promise<boolean> {
  const result = await this.db
    .update(files)
    .set({
      deletionState: params.toState,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(files.id, fileId),
        eq(files.deletionState, params.fromState),
        eq(files.deletionToken, params.requiredToken)
      )
    );
  return (result.rowCount ?? 0) > 0;
}

/**
 * Atomically transition multiple files.
 * Returns IDs that were successfully transitioned.
 */
async transitionStateMany(
  fileIds: string[],
  params: { fromState: string; toState: string; requiredToken: string }
): Promise<string[]> {
  if (fileIds.length === 0) return [];

  const updated = await this.db
    .update(files)
    .set({
      deletionState: params.toState,
      updatedAt: new Date(),
    })
    .where(
      and(
        inArray(files.id, fileIds),
        eq(files.deletionState, params.fromState),
        eq(files.deletionToken, params.requiredToken)
      )
    )
    .returning({ id: files.id });

  return updated.map((r) => r.id);
}

/**
 * Transition with categorized rejection reasons.
 * Returns: marked (success), restored (wrong state), conflict (wrong token).
 */
async transitionStateManyWithReasons(
  fileIds: string[],
  params: { fromState: string; toState: string; requiredToken: string }
): Promise<{ marked: string[]; restored: string[]; conflict: string[] }> {
  if (fileIds.length === 0) {
    return { marked: [], restored: [], conflict: [] };
  }

  // First, do the transition
  const updated = await this.db
    .update(files)
    .set({
      deletionState: params.toState,
      updatedAt: new Date(),
    })
    .where(
      and(
        inArray(files.id, fileIds),
        eq(files.deletionState, params.fromState),
        eq(files.deletionToken, params.requiredToken)
      )
    )
    .returning({ id: files.id });

  const marked = updated.map((r) => r.id);
  const notMarked = fileIds.filter((id) => !marked.includes(id));

  if (notMarked.length === 0) {
    return { marked, restored: [], conflict: [] };
  }

  // Query why not marked: check current state and token
  const notMarkedFiles = await this.db
    .select({
      id: files.id,
      deletionState: files.deletionState,
      deletionToken: files.deletionToken,
    })
    .from(files)
    .where(inArray(files.id, notMarked));

  const restored: string[] = [];
  const conflict: string[] = [];

  for (const file of notMarkedFiles) {
    if (file.deletionState !== params.fromState) {
      // State changed (e.g., ACTIVE means restored, FAILED means already failed)
      restored.push(file.id);
    } else if (file.deletionToken !== params.requiredToken) {
      // Same state but different token = another deletion owns it
      conflict.push(file.id);
    }
  }

  // Files in notMarked but not in notMarkedFiles = deleted between calls (rare)
  // Treat as "restored" (gone from perspective of this workflow)
  const foundIds = notMarkedFiles.map((f) => f.id);
  const disappeared = notMarked.filter((id) => !foundIds.includes(id));
  restored.push(...disappeared);

  return { marked, restored, conflict };
}

/**
 * Find IDs that are in specific state with specific token.
 * Used for final guard check before hard delete.
 */
async findIdsInState(
  fileIds: string[],
  state: string,
  token: string
): Promise<string[]> {
  if (fileIds.length === 0) return [];

  const result = await this.db
    .select({ id: files.id })
    .from(files)
    .where(
      and(
        inArray(files.id, fileIds),
        eq(files.deletionState, state),
        eq(files.deletionToken, token)
      )
    );

  return result.map((r) => r.id);
}

// ============================================
// FAILURE HANDLING
// ============================================

/**
 * Mark single file as failed and return updated attempts count.
 */
async markFailedReturning(
  fileId: string,
  error: string
): Promise<{ deletionAttempts: number }> {
  const [result] = await this.db
    .update(files)
    .set({
      deletionState: "FAILED",
      lastDeletionError: error,
      deletionAttempts: sql`deletion_attempts + 1`,
      updatedAt: new Date(),
    })
    .where(eq(files.id, fileId))
    .returning({ deletionAttempts: files.deletionAttempts });

  return result ?? { deletionAttempts: 1 };
}

/**
 * Set next deletion attempt time (separate from markFailed for determinism)
 */
async setNextAttempt(fileId: string, nextAttempt: Date): Promise<void> {
  await this.db
    .update(files)
    .set({ nextDeletionAttemptAt: nextAttempt })
    .where(eq(files.id, fileId));
}

/**
 * Batch mark as FAILED with calculated backoff.
 * Uses SQL CASE to compute next_attempt_at based on current attempts.
 */
async markFailedMany(fileIds: string[]): Promise<void> {
  if (fileIds.length === 0) return;

  // Exponential backoff: 5, 15, 45, 120, 360 minutes
  await this.db
    .update(files)
    .set({
      deletionState: "FAILED",
      deletionAttempts: sql`deletion_attempts + 1`,
      nextDeletionAttemptAt: sql`
        NOW() + INTERVAL '1 minute' * CASE
          WHEN deletion_attempts = 0 THEN 5
          WHEN deletion_attempts = 1 THEN 15
          WHEN deletion_attempts = 2 THEN 45
          WHEN deletion_attempts = 3 THEN 120
          ELSE 360
        END
      `,
      updatedAt: new Date(),
    })
    .where(inArray(files.id, fileIds));
}

async markPermanentlyFailed(maxRetries: number): Promise<number> {
  const result = await this.db
    .update(files)
    .set({
      deletionState: "PERMANENTLY_FAILED",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(files.deletionState, "FAILED"),
        gte(files.deletionAttempts, maxRetries)
      )
    );
  return result.rowCount ?? 0;
}

// ============================================
// RESTORE
// ============================================

/**
 * Restore soft-deleted file. Fails if file is in DELETING state.
 * Clears deletion token to break any running workflow's guard check.
 */
async restore(fileId: string): Promise<File | null> {
  const [restored] = await this.db
    .update(files)
    .set({
      deletedAt: null,
      deletionState: "ACTIVE",
      deletionToken: null, // CRITICAL: breaks workflow guard
      deletionAttempts: 0,
      lastDeletionError: null,
      nextDeletionAttemptAt: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(files.id, fileId),
        ne(files.deletionState, "DELETING") // Cannot restore if DELETING
      )
    )
    .returning();
  return restored ?? null;
}

// ============================================
// GC QUERIES (Proper Keyset Pagination)
// ============================================

/**
 * Find SOFT_DELETED files older than cutoff with proper keyset pagination.
 * Cursor is (deletedAt, id) to match ORDER BY.
 */
async findSoftDeletedForGC(params: {
  cutoffDate: Date;
  cursor: { deletedAt: Date; id: string } | null;
  limit: number;
}): Promise<Array<{ id: string; deletedAt: Date }>> {
  const { cutoffDate, cursor, limit } = params;

  // Base conditions
  const conditions = [
    eq(files.deletionState, "SOFT_DELETED"),
    lt(files.deletedAt, cutoffDate),
  ];

  // Keyset pagination: (deletedAt > cursor.deletedAt) OR (deletedAt = cursor.deletedAt AND id > cursor.id)
  if (cursor) {
    conditions.push(
      or(
        gt(files.deletedAt, cursor.deletedAt),
        and(eq(files.deletedAt, cursor.deletedAt), gt(files.id, cursor.id))
      )!
    );
  }

  return await this.db
    .select({ id: files.id, deletedAt: files.deletedAt })
    .from(files)
    .where(and(...conditions))
    .orderBy(asc(files.deletedAt), asc(files.id))
    .limit(limit);
}

/**
 * Find FAILED files ready for retry with proper keyset pagination.
 * Cursor is (nextDeletionAttemptAt, id) to match ORDER BY.
 */
async findFailedForGC(params: {
  now: Date;
  maxAttempts: number;
  cursor: { nextDeletionAttemptAt: Date; id: string } | null;
  limit: number;
}): Promise<Array<{ id: string; nextDeletionAttemptAt: Date }>> {
  const { now, maxAttempts, cursor, limit } = params;

  const conditions = [
    eq(files.deletionState, "FAILED"),
    lt(files.nextDeletionAttemptAt, now),
    lt(files.deletionAttempts, maxAttempts),
  ];

  if (cursor) {
    conditions.push(
      or(
        gt(files.nextDeletionAttemptAt, cursor.nextDeletionAttemptAt),
        and(
          eq(files.nextDeletionAttemptAt, cursor.nextDeletionAttemptAt),
          gt(files.id, cursor.id)
        )
      )!
    );
  }

  return await this.db
    .select({
      id: files.id,
      nextDeletionAttemptAt: files.nextDeletionAttemptAt,
    })
    .from(files)
    .where(and(...conditions))
    .orderBy(asc(files.nextDeletionAttemptAt), asc(files.id))
    .limit(limit);
}

// ============================================
// GUARD CHECKS
// ============================================

async findForDeletion(fileId: string): Promise<DeletionCheckResult | null> {
  const [file] = await this.db
    .select({
      id: files.id,
      deletionState: files.deletionState,
      deletionToken: files.deletionToken,
      deletionAttempts: files.deletionAttempts,
    })
    .from(files)
    .where(eq(files.id, fileId))
    .limit(1);
  return file ?? null;
}
```

**File:** `repositories/DeletionErrorLogRepository.ts` (new)

```typescript
/**
 * Separate table for deletion error details (keeps files table clean)
 */
async insertMany(
  errors: Array<{ fileId: string; error: string; occurredAt: Date }>
): Promise<void> {
  if (errors.length === 0) return;

  await this.db.insert(deletionErrorLog).values(errors);
}

async findByFileId(fileId: string): Promise<DeletionError[]> {
  return await this.db
    .select()
    .from(deletionErrorLog)
    .where(eq(deletionErrorLog.fileId, fileId))
    .orderBy(desc(deletionErrorLog.occurredAt));
}
```

---

### 8. GraphQL Schema

**File:** `api/graphql-admin/file.graphql`

```graphql
enum FileDeletionState {
  ACTIVE
  SOFT_DELETED
  DELETING
  FAILED
  PERMANENTLY_FAILED
}

extend type File {
  """
  Current deletion state
  """
  deletionState: FileDeletionState!

  """
  Number of deletion attempts (for FAILED state)
  """
  deletionAttempts: Int!

  """
  Last deletion error message
  """
  lastDeletionError: String
}

input FileDeleteManyInput {
  """
  File IDs to delete (max 100)
  """
  ids: [ID!]!

  """
  Permanently delete files (removes from S3). If false, files are soft-deleted.
  """
  permanent: Boolean

  """
  Client-provided request ID for idempotency
  """
  requestId: String
}

type FileDeleteManyPayload {
  """
  Files that were permanently deleted
  """
  deletedFileIds: [ID!]!

  """
  Files that are soft-deleted and pending GC
  """
  pendingFileIds: [ID!]!

  """
  Files that failed to delete
  """
  failedIds: [FileDeleteError!]!

  userErrors: [UserError!]!
}

type FileDeleteError {
  id: ID!
  reason: String!
}

input FileRestoreInput {
  """
  File ID to restore
  """
  id: ID!
}

type FileRestorePayload {
  """
  Restored file (null if restore failed)
  """
  file: File

  userErrors: [UserError!]!
}

extend type MediaMutation {
  """
  Delete multiple files at once (max 100).
  Returns immediately for soft delete, or after S3 cleanup for permanent delete.
  """
  fileDeleteMany(input: FileDeleteManyInput!): FileDeleteManyPayload!

  """
  Restore a soft-deleted file. Cannot restore files in DELETING state.
  """
  fileRestore(input: FileRestoreInput!): FileRestorePayload!
}
```

---

## Implementation Plan

| #   | Task                           | Files                                                                      | Priority | Notes                                    |
| --- | ------------------------------ | -------------------------------------------------------------------------- | -------- | ---------------------------------------- |
| 1   | DB migration                   | `migrations/XXXX_deletion_state.sql`                                       | Critical | deletion_state, token, indexes           |
| 2   | DB migration (error log)       | `migrations/XXXX_deletion_error_log.sql`                                   | Medium   | Separate table for error details         |
| 3   | Repository methods             | `FileRepository.ts`                                                        | Critical | transitionState, keyset pagination, etc. |
| 4   | Repository (error log)         | `DeletionErrorLogRepository.ts`                                            | Medium   | New repository                           |
| 5   | `FileHardDeleteWorkflow`       | `workflows/FileHardDeleteWorkflow.ts`                                      | Critical | Double guard check                       |
| 6   | `FileBatchDeleteWorkflow`      | `workflows/FileBatchDeleteWorkflow.ts`                                     | Critical | Final guard, batch markFailed            |
| 7   | `FileGarbageCollectorWorkflow` | `workflows/FileGarbageCollectorWorkflow.ts`                                | High     | Keyset cursor, deterministic requestId   |
| 8   | `FileRestoreScript`            | `scripts/file/FileRestoreScript.ts`                                        | High     | Token clearing                           |
| 9   | Update `FileDeleteScript`      | `scripts/file/FileDeleteScript.ts`                                         | High     | Token generation                         |
| 10  | `FileDeleteManyScript`         | `scripts/file/FileDeleteManyScript.ts`                                     | Medium   | With requestId                           |
| 11  | GraphQL schema + resolver      | `file.graphql`, `MediaMutationResolver.ts`                                 | Medium   | New types, mutations                     |
| 12  | Register workflows             | `media.nest-service.ts`                                                    | High     | All 3 workflows                          |
| 13  | GC cron job                    | `bootstrap/src/jobs/mediaGarbageCollector.ts`                              | Medium   | Daily schedule                           |
| 14  | Unit tests                     | `__tests__/workflows/`                                                     | Critical | Guard checks, pagination, idempotency    |
| 15  | Integration tests              | `__tests__/integration/`                                                   | High     | Race conditions, E2E flows               |

### Migration SQL

```sql
-- Migration 1: Add deletion state tracking to files
ALTER TABLE media.files
  ADD COLUMN deletion_state VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN deletion_attempts INT NOT NULL DEFAULT 0,
  ADD COLUMN last_deletion_error TEXT,
  ADD COLUMN next_deletion_attempt_at TIMESTAMPTZ,
  ADD COLUMN deletion_token UUID;

-- Backfill existing soft-deleted files
UPDATE media.files
SET deletion_state = 'SOFT_DELETED'
WHERE deleted_at IS NOT NULL;

-- Indexes for GC
CREATE INDEX idx_files_gc_soft_deleted
  ON media.files (deleted_at, id)
  WHERE deletion_state = 'SOFT_DELETED';

CREATE INDEX idx_files_gc_failed
  ON media.files (next_deletion_attempt_at, id)
  WHERE deletion_state = 'FAILED' AND deletion_attempts < 5;

CREATE INDEX idx_files_permanently_failed
  ON media.files (updated_at)
  WHERE deletion_state = 'PERMANENTLY_FAILED';

-- Migration 2: Error log table (no FK to files - file may be hard deleted)
CREATE TABLE media.deletion_error_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL,
  error TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_deletion_error_log_file
  ON media.deletion_error_log (file_id, occurred_at DESC);

-- Auto-cleanup old errors (optional, via pg_cron or scheduled job)
-- DELETE FROM media.deletion_error_log WHERE occurred_at < NOW() - INTERVAL '30 days';
```

---

## Critical Test Cases

### Must-have tests

```typescript
describe("FileBatchDeleteWorkflow", () => {
  it("should hard delete ONLY files that succeeded in S3", async () => {
    // 10 files, 3 S3 errors → DB hard delete only 7
    // 3 remain as FAILED with error message
  });

  it("should be idempotent with same requestId", async () => {
    // Call twice with same requestId → second call returns same result
  });

  it("should handle partial S3 batch errors", async () => {
    // S3 returns errors for some keys → correctly categorize succeeded/failed
  });

  it("should treat NoSuchKey as success", async () => {
    // File already deleted from S3 → still hard delete from DB
  });

  it("should abort files restored between markDeleting and S3 delete", async () => {
    // 1. Start workflow with 5 files
    // 2. markDeletingBatchAtomic succeeds for all 5
    // 3. Before S3 delete, restore file #3 (sets state=ACTIVE, token=null)
    // 4. S3 delete succeeds for all (file #3 object deleted - acceptable)
    // 5. finalGuardAndDelete finds only 4 files with correct state/token
    // 6. Only 4 files hard deleted, file #3 in abortedIds
  });

  it("should not mark as DELETING if file was restored after soft delete", async () => {
    // 1. softDeleteBatch sets SOFT_DELETED + token
    // 2. Restore called → state=ACTIVE, token=null
    // 3. markDeletingBatchAtomic fails (wrong state)
    // 4. File appears in abortedIds, not processed
  });
});

describe("FileHardDeleteWorkflow", () => {
  it("should abort if file restored before initial guard", async () => {
    // File restored before workflow starts
    // Guard check fails → abortReason = RESTORED
  });

  it("should abort if file restored between S3 delete and DB delete", async () => {
    // 1. Initial guard passes (SOFT_DELETED + token)
    // 2. markDeletingAtomic succeeds (DELETING)
    // 3. S3 delete succeeds
    // 4. Restore somehow called (should fail for DELETING, but test edge case)
    // 5. Final guard fails → S3 object gone but file record preserved
    // 6. Workflow returns error with "S3 object may be orphaned"
  });

  it("should use correct backoff based on DB attempts", async () => {
    // File with 3 attempts in DB
    // markFailedAndGetAttempts returns 4
    // Next attempt scheduled for 120 minutes (4th delay)
  });
});

describe("FileRestore", () => {
  it("should clear deletion token to break running workflow", async () => {
    // 1. File in SOFT_DELETED with token=ABC
    // 2. Workflow starts, passes initial guard
    // 3. restore() called → state=ACTIVE, token=null
    // 4. Workflow's markDeletingAtomic fails (token mismatch)
    // 5. File preserved
  });

  it("should reject restore for DELETING state", async () => {
    // File in DELETING state
    // restore() returns null (WHERE ne(state, DELETING))
    // userError: "cannot restore"
  });
});

describe("GarbageCollector", () => {
  it("should use keyset pagination correctly for SOFT_DELETED", async () => {
    // Create 1500 files with various deletedAt values
    // Run GC with batchSize=500
    // Should process in 3 batches
    // Each file processed exactly once (no duplicates, no skips)
    // Verify cursor updates correctly: (deletedAt, id)
  });

  it("should use keyset pagination correctly for FAILED", async () => {
    // Create 1000 FAILED files with various nextDeletionAttemptAt
    // Run GC with batchSize=500
    // Cursor uses (nextDeletionAttemptAt, id)
    // No duplicates, no skips
  });

  it("should not retry files exceeding maxRetries", async () => {
    // File with 5 attempts, maxRetries=5
    // Should be marked PERMANENTLY_FAILED in phase 3
    // Not included in phase 2 (findRetryableFailed filters by attempts < max)
  });

  it("should use deterministic requestId in processBatch", async () => {
    // Verify requestId doesn't use Math.random
    // Two runs with same fileIds produce same requestId
  });
});

describe("Repository - transitionStateMany", () => {
  it("should only transition files matching fromState and token", async () => {
    // 5 files: 3 with correct state+token, 2 with wrong token
    // transitionStateMany returns only 3 IDs
  });

  it("should be atomic - no partial transitions on conflict", async () => {
    // Concurrent calls with same files
    // Only one succeeds, other returns empty
  });
});

describe("Repository - keyset pagination", () => {
  it("should handle null cursor correctly", async () => {
    // First call with cursor=null returns first N items
  });

  it("should handle boundary case: same deletedAt, different id", async () => {
    // 3 files with same deletedAt
    // Cursor points to middle one
    // Next batch returns only the one with higher id
  });
});
```

---

## Monitoring

### DBOS System Tables

```sql
-- Active deletion workflows
SELECT workflow_id, status, created_at, updated_at
FROM dbos.workflow_status
WHERE workflow_id LIKE 'file:%'
  AND status NOT IN ('SUCCESS', 'ERROR')
ORDER BY created_at DESC;

-- Failed workflows for investigation
SELECT workflow_id, status, error, created_at
FROM dbos.workflow_status
WHERE workflow_id LIKE 'file:%'
  AND status = 'ERROR'
ORDER BY created_at DESC
LIMIT 100;
```

### Application Metrics

```
# File operations
media_files_soft_deleted_total{} counter
media_files_hard_deleted_total{} counter
media_files_restored_total{} counter
media_files_deletion_failed_total{reason} counter

# Rejection categories (for debugging)
media_files_deletion_rejected_total{reason} counter
  # reason: restored, not_found, conflict, final_guard_failed

# Guard check anomalies (should be ~0 in normal operation)
media_deletion_guard_failed_total{phase,reason} counter
  # phase: initial, transition, final
  # reason: restored, token_mismatch, not_found

# GC metrics
media_gc_runs_total{} counter
media_gc_files_processed{} gauge
media_gc_files_deleted{} gauge
media_gc_files_failed{} gauge
media_gc_files_skipped{} gauge  # Exceeded max retries
media_gc_duration_seconds{} histogram

# S3 operations
media_s3_batch_delete_total{bucket} counter
media_s3_batch_delete_errors_total{bucket,error_type} counter
  # error_type: access_denied, not_found, timeout, other

# Backlog gauges (query periodically)
media_files_backlog{state} gauge
  # state: soft_deleted, failed, permanently_failed
```

### Backlog Query (for gauge)

```sql
SELECT
  deletion_state as state,
  COUNT(*) as count
FROM media.files
WHERE deletion_state IN ('SOFT_DELETED', 'FAILED', 'PERMANENTLY_FAILED')
GROUP BY deletion_state;
```

### Alerts

| Alert                            | Condition                                  | Severity |
| -------------------------------- | ------------------------------------------ | -------- |
| FileDeletionBacklogHigh          | FAILED files > 1000                        | Warning  |
| FileDeletionPermanentlyFailed    | PERMANENTLY_FAILED files > 0              | Critical |
| GCNotRunning                     | No GC workflow in 48 hours                 | Warning  |
| S3DeleteErrorRateHigh            | Error rate > 5% over 1 hour                | Warning  |

---

## Error Handling Summary

| Scenario                      | Handling                                                |
| ----------------------------- | ------------------------------------------------------- |
| S3 NoSuchKey                  | Treat as success, proceed with DB delete                |
| S3 AccessDenied               | Mark FAILED, no retry (config issue)                    |
| S3 ServiceUnavailable         | Retry with exponential backoff                          |
| S3 partial batch failure      | Hard delete succeeded only, mark failed as FAILED       |
| File restored during delete   | Guard check fails, abort workflow, file preserved       |
| DB connection lost            | DBOS auto-recovery                                      |
| DB deadlock                   | DBOS retry                                              |
| Max retries exceeded          | Mark PERMANENTLY_FAILED, alert, manual intervention     |

---

## Operational Endpoints (Admin)

### Requeue Failed Files

Force retry of FAILED files without waiting for next_attempt_at:

```graphql
mutation AdminRequeueFailedFiles($fileIds: [ID!]!) {
  adminRequeueFailedFiles(input: { fileIds: $fileIds }) {
    requeuedCount
    userErrors { message }
  }
}
```

```typescript
// Implementation
async requeue(fileIds: string[]): Promise<number> {
  const result = await this.db
    .update(files)
    .set({
      nextDeletionAttemptAt: new Date(), // Now
      updatedAt: new Date(),
    })
    .where(
      and(
        inArray(files.id, fileIds),
        eq(files.deletionState, "FAILED")
      )
    );
  return result.rowCount ?? 0;
}
```

### Reset Permanently Failed

Move PERMANENTLY_FAILED back to FAILED for another round of retries:

```typescript
async resetPermanentlyFailed(fileIds: string[]): Promise<number> {
  const result = await this.db
    .update(files)
    .set({
      deletionState: "FAILED",
      deletionAttempts: 0,
      nextDeletionAttemptAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        inArray(files.id, fileIds),
        eq(files.deletionState, "PERMANENTLY_FAILED")
      )
    );
  return result.rowCount ?? 0;
}
```

### GC Run Limit

Add optional max files per GC run to prevent long-running jobs:

```typescript
interface GCInput {
  gracePeriodDays?: number;
  batchSize?: number;
  maxRetries?: number;
  maxFilesPerRun?: number; // NEW: stop after processing this many
  dryRun?: boolean;
}

// In workflow:
if (maxFilesPerRun && totalProcessed >= maxFilesPerRun) {
  break; // Stop early, will continue in next scheduled run
}
```
