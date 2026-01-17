# File Deletion Implementation Plan

> Strictly follows `file-deletion-mvp.md` v0.7.1

## Overview

This document outlines the implementation steps for the file deletion system.
Each task includes specific files to create/modify and acceptance criteria.

---

## Phase 1: Database Schema

### Task 1.1: Update Drizzle Schema

**File:** `services/media/src/repositories/models/files.ts`

```typescript
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

    // ========== NEW COLUMNS FOR FILE DELETION ==========
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
    // ========== EXISTING INDEXES ==========
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

    // ========== NEW INDEXES FOR GC ==========
    // GC query: all soft-deleted files
    index("idx_files_gc_soft_deleted")
      .on(table.deletedAt, table.id)
      .where(sql`deletion_state = 'SOFT_DELETED'`),
    // GC query: clean soft-deleted files (no error)
    index("idx_files_gc_soft_deleted_clean")
      .on(table.deletedAt, table.id)
      .where(sql`deletion_state = 'SOFT_DELETED' AND deletion_error_code IS NULL`),
    // Stuck detection: files in DELETING
    index("idx_files_stuck_deleting")
      .on(table.deletingStartedAt, table.id)
      .where(sql`deletion_state = 'DELETING' AND deleting_started_at IS NOT NULL`),

    // ========== CHECK CONSTRAINTS ==========
    // error_code and failed_at must be paired
    check(
      "chk_error_fields_paired",
      sql`(deletion_error_code IS NULL) = (failed_at IS NULL)`
    ),
    // DELETING state must have no error fields
    check(
      "chk_deleting_has_no_errors",
      sql`deletion_state <> 'DELETING' OR (deletion_error_code IS NULL AND failed_at IS NULL AND last_deletion_error IS NULL)`
    ),
    // DELETING state must have started_at
    check(
      "chk_deleting_has_started_at",
      sql`deletion_state <> 'DELETING' OR deleting_started_at IS NOT NULL`
    ),
    // ACTIVE state must have no deletion fields
    check(
      "chk_active_has_no_deletion_fields",
      sql`deletion_state <> 'ACTIVE' OR (deleted_at IS NULL AND deleting_started_at IS NULL AND deletion_error_code IS NULL AND failed_at IS NULL AND last_deletion_error IS NULL)`
    ),
    // Valid deletion_state values
    check(
      "chk_deletion_state_valid",
      sql`deletion_state IN ('ACTIVE', 'SOFT_DELETED', 'DELETING')`
    ),
    // Valid deletion_error_code values
    check(
      "chk_deletion_error_code_valid",
      sql`deletion_error_code IS NULL OR deletion_error_code IN ('RETRYABLE', 'FATAL')`
    ),
  ]
);

export type File = typeof files.$inferSelect;
export type NewFile = typeof files.$inferInsert;

// Type helpers for deletion
export type DeletionState = "ACTIVE" | "SOFT_DELETED" | "DELETING";
export type DeletionErrorCode = "RETRYABLE" | "FATAL";
```

**Acceptance criteria:**
- [ ] New columns added: `deletion_state`, `deletion_error_code`, `last_deletion_error`, `deleting_started_at`, `failed_at`
- [ ] New indexes added for GC queries
- [ ] CHECK constraints added
- [ ] TypeScript types exported

### Task 1.2: Generate Migration

```bash
cd services/media
pnpm db:generate
```

This will create a new migration file in `./migrations/` with the schema changes.

### Task 1.3: Add Data Migration

After `pnpm db:generate`, manually edit the generated migration to add data migration at the end:

```sql
-- Migrate existing soft-deleted files to SOFT_DELETED state
UPDATE media.files
SET deletion_state = 'SOFT_DELETED'
WHERE deleted_at IS NOT NULL AND deletion_state = 'ACTIVE';
```

**Acceptance criteria:**
- [ ] Migration file generated
- [ ] Data migration added
- [ ] `pnpm db:migrate` succeeds
- [ ] Existing soft-deleted files migrated

---

## Phase 2: Type Definitions

### Task 2.1: Create Deletion Types

**File:** `services/media/src/types/deletion.ts` (new)

```typescript
export type DeletionState = "ACTIVE" | "SOFT_DELETED" | "DELETING";
export type DeletionErrorCode = "RETRYABLE" | "FATAL";

export interface MarkDeletingResult {
  startedAt: Date;
}

export interface FindSoftDeletedForGCParams {
  cutoffDate: Date;
  errorCooldown: Date;
  limit: number;
}

export interface ResetStuckDeletingParams {
  stuckSince: Date;
  limit: number;
}

export interface RestoreResult {
  success: boolean;
  error?: "FILE_BEING_DELETED" | "INVALID_STATE";
}
```

---

## Phase 3: Repository Methods

### Task 3.1: Add softDeleteIfEligible

**File:** `services/media/src/repositories/FileRepository.ts`

```typescript
async softDeleteIfEligible(
  fileId: string,
  deletedAt: Date
): Promise<string | null> {
  const result = await this.db
    .update(files)
    .set({
      deletionState: "SOFT_DELETED",
      deletedAt: sql`COALESCE(${files.deletedAt}, ${deletedAt.toISOString()})`,
    })
    .where(
      and(eq(files.id, fileId), eq(files.deletionState, "ACTIVE"))
    )
    .returning({ id: files.id });

  return result[0]?.id ?? null;
}

async softDeleteManyIfEligible(
  fileIds: string[],
  deletedAt: Date
): Promise<string[]> {
  if (fileIds.length === 0) return [];

  const result = await this.db
    .update(files)
    .set({
      deletionState: "SOFT_DELETED",
      deletedAt: sql`COALESCE(${files.deletedAt}, ${deletedAt.toISOString()})`,
    })
    .where(
      and(inArray(files.id, fileIds), eq(files.deletionState, "ACTIVE"))
    )
    .returning({ id: files.id });

  return result.map((r) => r.id);
}
```

**Acceptance criteria:**
- [ ] Only transitions ACTIVE → SOFT_DELETED
- [ ] Does NOT overwrite existing `deletedAt`
- [ ] Returns affected IDs

### Task 3.2: Add markDeletingReturningStartedAt

**File:** `services/media/src/repositories/FileRepository.ts`

```typescript
async markDeletingReturningStartedAt(
  fileId: string
): Promise<MarkDeletingResult | null> {
  const result = await this.db
    .update(files)
    .set({
      deletionState: "DELETING",
      deletingStartedAt: sql`now()`,
      // Clear ALL error attributes (invariant!)
      deletionErrorCode: null,
      failedAt: null,
      lastDeletionError: null,
    })
    .where(
      and(eq(files.id, fileId), eq(files.deletionState, "SOFT_DELETED"))
    )
    .returning({ startedAt: files.deletingStartedAt });

  if (!result[0]?.startedAt) return null;
  return { startedAt: new Date(result[0].startedAt) };
}
```

**Acceptance criteria:**
- [ ] Only transitions SOFT_DELETED → DELETING
- [ ] Sets `deleting_started_at = now()`
- [ ] Clears ALL error attributes
- [ ] Returns `startedAt` timestamp
- [ ] Returns `null` if not in SOFT_DELETED

### Task 3.3: Add isDeletionLockValid

**File:** `services/media/src/repositories/FileRepository.ts`

```typescript
async isDeletionLockValid(
  fileId: string,
  expectedStartedAt: Date
): Promise<boolean> {
  const result = await this.db.execute<{ exists: boolean }>(sql`
    SELECT EXISTS (
      SELECT 1 FROM media.files
      WHERE id = ${fileId}
        AND deletion_state = 'DELETING'
        AND deleting_started_at = ${expectedStartedAt.toISOString()}
    ) as exists
  `);

  return result.rows[0]?.exists ?? false;
}
```

**Acceptance criteria:**
- [ ] Comparison happens in SQL (no JS roundtrip)
- [ ] Returns `true` only if state=DELETING AND startedAt matches exactly
- [ ] Returns `false` if row missing or state changed

### Task 3.4: Add markErrorAndRollback

**File:** `services/media/src/repositories/FileRepository.ts`

```typescript
async markErrorAndRollback(
  fileId: string,
  errorCode: DeletionErrorCode,
  errorMessage: string
): Promise<boolean> {
  const result = await this.db
    .update(files)
    .set({
      deletionState: "SOFT_DELETED",
      deletionErrorCode: errorCode,
      lastDeletionError: errorMessage,
      failedAt: sql`now()`,
      deletingStartedAt: null,
    })
    .where(
      and(eq(files.id, fileId), eq(files.deletionState, "DELETING"))
    )
    .returning({ id: files.id });

  return result.length > 0;
}
```

**Acceptance criteria:**
- [ ] Transitions DELETING → SOFT_DELETED
- [ ] Sets `error_code`, `failed_at`, `last_deletion_error` atomically
- [ ] Clears `deleting_started_at`
- [ ] Returns `false` if not in DELETING

### Task 3.5: Add hardDeleteIfDeleting

**File:** `services/media/src/repositories/FileRepository.ts`

```typescript
async hardDeleteIfDeleting(fileId: string): Promise<boolean> {
  const result = await this.db
    .delete(files)
    .where(
      and(eq(files.id, fileId), eq(files.deletionState, "DELETING"))
    )
    .returning({ id: files.id });

  return result.length > 0;
}
```

**Acceptance criteria:**
- [ ] Only deletes if state=DELETING
- [ ] Returns `true` if deleted, `false` otherwise

### Task 3.6: Add findSoftDeletedForGC

**File:** `services/media/src/repositories/FileRepository.ts`

```typescript
async findSoftDeletedForGC(
  params: FindSoftDeletedForGCParams
): Promise<File[]> {
  return this.db
    .select()
    .from(files)
    .where(
      and(
        eq(files.deletionState, "SOFT_DELETED"),
        lt(files.deletedAt, params.cutoffDate.toISOString()),
        or(
          // No error → eligible
          isNull(files.deletionErrorCode),
          // RETRYABLE + cooldown passed → eligible
          and(
            eq(files.deletionErrorCode, "RETRYABLE"),
            isNotNull(files.failedAt),
            lt(files.failedAt, params.errorCooldown.toISOString())
          )
          // FATAL is implicitly excluded (never matches)
        )
      )
    )
    .orderBy(files.deletedAt, files.id)
    .limit(params.limit);
}
```

**Acceptance criteria:**
- [ ] Never picks FATAL files
- [ ] Picks clean files past retention
- [ ] Picks RETRYABLE files after cooldown
- [ ] Ordered by `(deleted_at, id)`

### Task 3.7: Add resetStuckDeleting

**File:** `services/media/src/repositories/FileRepository.ts`

```typescript
async resetStuckDeleting(params: ResetStuckDeletingParams): Promise<number> {
  const result = await this.db.execute<{ id: string }>(sql`
    WITH cte AS (
      SELECT id FROM media.files
      WHERE deletion_state = 'DELETING'
        AND deleting_started_at IS NOT NULL
        AND deleting_started_at < ${params.stuckSince.toISOString()}
      ORDER BY deleting_started_at, id
      LIMIT ${params.limit}
    )
    UPDATE media.files f
    SET
      deletion_state = 'SOFT_DELETED',
      deleting_started_at = NULL,
      deletion_error_code = 'RETRYABLE',
      failed_at = now(),
      last_deletion_error = 'stuck deleting timeout'
    FROM cte
    WHERE f.id = cte.id
    RETURNING f.id
  `);

  return result.rowCount ?? 0;
}
```

**Acceptance criteria:**
- [ ] Resets DELETING → SOFT_DELETED
- [ ] Marks as RETRYABLE (goes through cooldown)
- [ ] Uses CTE for LIMIT
- [ ] Returns count of reset files

### Task 3.8: Add clearError

**File:** `services/media/src/repositories/FileRepository.ts`

```typescript
async clearError(fileId: string): Promise<boolean> {
  const result = await this.db
    .update(files)
    .set({
      deletionErrorCode: null,
      lastDeletionError: null,
      failedAt: null,
    })
    .where(
      and(
        eq(files.id, fileId),
        eq(files.deletionState, "SOFT_DELETED"),
        isNotNull(files.deletionErrorCode)
      )
    )
    .returning({ id: files.id });

  return result.length > 0;
}
```

**Acceptance criteria:**
- [ ] Only clears if SOFT_DELETED + has error
- [ ] Clears all three error fields
- [ ] Returns `false` if precondition fails

### Task 3.9: Update restore method

**File:** `services/media/src/repositories/FileRepository.ts`

```typescript
async restore(
  fileId: string
): Promise<RestoreResult> {
  // Check current state first
  const current = await this.findAnyById(fileId);
  if (!current) {
    return { success: false, error: "INVALID_STATE" };
  }
  if (current.deletionState === "DELETING") {
    return { success: false, error: "FILE_BEING_DELETED" };
  }
  if (current.deletionState === "ACTIVE") {
    return { success: false, error: "INVALID_STATE" };
  }

  // Restore: clear ALL fields
  await this.db
    .update(files)
    .set({
      deletionState: "ACTIVE",
      deletedAt: null,
      deletionErrorCode: null,
      lastDeletionError: null,
      failedAt: null,
      deletingStartedAt: null,
    })
    .where(eq(files.id, fileId));

  return { success: true };
}

async findAnyById(fileId: string): Promise<File | null> {
  const result = await this.db
    .select()
    .from(files)
    .where(eq(files.id, fileId))
    .limit(1);

  return result[0] ?? null;
}
```

**Acceptance criteria:**
- [ ] SOFT_DELETED → ACTIVE, clears ALL fields
- [ ] DELETING → FILE_BEING_DELETED error
- [ ] ACTIVE → INVALID_STATE error
- [ ] Clears error attributes

---

## Phase 4: Error Classification

### Task 4.1: Create classifyError utility

**File:** `services/media/src/utils/classifyError.ts` (new)

```typescript
import type { DeletionErrorCode } from "../types/deletion";

export class MissingMetadataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MissingMetadataError";
  }
}

const FATAL_S3_CODES = [
  "AccessDenied",
  "InvalidAccessKeyId",
  "SignatureDoesNotMatch",
  "NoSuchBucket",
];

function isS3Error(
  error: unknown
): error is { Code?: string; $metadata?: unknown } {
  return typeof error === "object" && error !== null && "$metadata" in error;
}

export function classifyError(error: unknown): DeletionErrorCode {
  // S3 errors
  if (isS3Error(error) && error.Code) {
    if (FATAL_S3_CODES.includes(error.Code)) {
      return "FATAL";
    }
    return "RETRYABLE";
  }

  // Missing metadata
  if (error instanceof MissingMetadataError) {
    return "FATAL";
  }

  // Default: assume retryable
  return "RETRYABLE";
}
```

**Acceptance criteria:**
- [ ] S3 AccessDenied/InvalidAccessKeyId/SignatureDoesNotMatch/NoSuchBucket → FATAL
- [ ] MissingMetadataError → FATAL
- [ ] All other errors → RETRYABLE

---

## Phase 5: Workflows

### Task 5.1: Create FileHardDeleteWorkflow

**File:** `services/media/src/workflows/FileHardDeleteWorkflow.ts` (new)

```typescript
import { DBOS } from "@dbos-inc/dbos-sdk";
import { classifyError, MissingMetadataError } from "../utils/classifyError";
import type { FileRepository } from "../repositories/FileRepository";
import type { S3ObjectRepository } from "../repositories/S3ObjectRepository";
import type { BucketRepository } from "../repositories/BucketRepository";
import type { S3Client } from "../infrastructure/S3Client";

interface Dependencies {
  fileRepo: FileRepository;
  s3ObjectRepo: S3ObjectRepository;
  bucketRepo: BucketRepository;
  s3Client: S3Client;
}

export class FileHardDeleteWorkflow {
  constructor(private deps: Dependencies) {}

  @DBOS.workflow()
  async run(fileId: string): Promise<void> {
    const logger = DBOS.logger;
    const { fileRepo, s3ObjectRepo, bucketRepo, s3Client } = this.deps;

    // 0. Guard: reject FATAL files (two-layer guard - GC also filters)
    const file = await fileRepo.findAnyById(fileId);
    if (!file) {
      logger.debug(`File ${fileId} not found, skipping`);
      return;
    }
    if (file.deletionState !== "SOFT_DELETED") {
      logger.debug(
        `File ${fileId} not in SOFT_DELETED (state=${file.deletionState}), skipping`
      );
      return;
    }
    if (file.deletionErrorCode === "FATAL") {
      logger.debug(
        `File ${fileId} has FATAL error, admin must clear first via fileClearError`
      );
      return;
    }

    // 1. Atomically lock: SOFT_DELETED -> DELETING
    const lockResult = await fileRepo.markDeletingReturningStartedAt(fileId);
    if (!lockResult) {
      logger.debug(`markDeleting skipped: file ${fileId} not in SOFT_DELETED`);
      return;
    }
    const { startedAt } = lockResult;

    try {
      // 2. Get S3 metadata and validate
      const s3Object = await s3ObjectRepo.findByFileId(fileId);
      if (!s3Object) {
        throw new MissingMetadataError(`File ${fileId} has no S3 metadata`);
      }
      const bucket = await bucketRepo.findById(s3Object.bucketId);
      if (!bucket) {
        throw new MissingMetadataError(
          `Bucket ${s3Object.bucketId} not found`
        );
      }

      // 3. RACE CONDITION GUARD: verify lock still valid before S3 delete
      const isLockValid = await fileRepo.isDeletionLockValid(fileId, startedAt);
      if (!isLockValid) {
        // Fetch current state for detailed logging
        const current = await fileRepo.findAnyById(fileId);
        const reason = !current
          ? "row_missing"
          : current.deletionState !== "DELETING"
            ? `state_changed:${current.deletionState}`
            : "startedAt_mismatch";
        logger.info(
          { fileId, reason },
          "Lock lost before S3 delete, aborting safely"
        );
        return;
      }

      // 4. Delete from S3 (idempotent: 404/NotFound is success)
      await s3Client.deleteObject({
        bucket: bucket.bucketName,
        key: s3Object.objectKey,
      });

      // 5. Hard delete DB row (conditional on state=DELETING)
      const deleted = await fileRepo.hardDeleteIfDeleting(fileId);
      if (!deleted) {
        logger.info(
          `hardDelete skipped: file ${fileId} no longer in DELETING`
        );
      }
    } catch (e: unknown) {
      // 6. Rollback to SOFT_DELETED + set error attributes
      const errorCode = classifyError(e);
      const errorMessage = e instanceof Error ? e.message : String(e);
      await fileRepo.markErrorAndRollback(fileId, errorCode, errorMessage);
      throw e; // Surface to DBOS for logging
    }
  }
}
```

**Acceptance criteria:**
- [ ] Guards against FATAL files at start
- [ ] Acquires lock and stores `startedAt`
- [ ] Validates lock before S3 delete (DB-side comparison)
- [ ] Logs abort reason (`row_missing`, `state_changed:X`, `startedAt_mismatch`)
- [ ] Rolls back with error classification on failure
- [ ] `hardDelete` logs at `info` level if returns false

### Task 5.2: Create FileGarbageCollectorWorkflow

**File:** `services/media/src/workflows/FileGarbageCollectorWorkflow.ts` (new)

```typescript
import { DBOS } from "@dbos-inc/dbos-sdk";
import pMap from "p-map";
import type { FileRepository } from "../repositories/FileRepository";
import { FileHardDeleteWorkflow } from "./FileHardDeleteWorkflow";

const STUCK_TIMEOUT_HOURS = 6;
const ERROR_COOLDOWN_HOURS = 6;
const RETENTION_DAYS = 30;
const BATCH_LIMIT = 100;
const MAX_RESET_BATCHES = 10;
const MAX_GC_BATCHES = 50;
const PARALLEL_WORKFLOWS = 10;

function hoursAgo(hours: number): Date {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

interface Dependencies {
  fileRepo: FileRepository;
  startHardDeleteWorkflow: (fileId: string) => Promise<void>;
}

export class FileGarbageCollectorWorkflow {
  constructor(private deps: Dependencies) {}

  @DBOS.workflow()
  async run(): Promise<void> {
    const logger = DBOS.logger;
    const { fileRepo, startHardDeleteWorkflow } = this.deps;

    // Phase 1: Reset stuck DELETING -> SOFT_DELETED (with error marking!)
    let totalStuck = 0;
    for (let i = 0; i < MAX_RESET_BATCHES; i++) {
      const count = await fileRepo.resetStuckDeleting({
        stuckSince: hoursAgo(STUCK_TIMEOUT_HOURS),
        limit: BATCH_LIMIT,
      });
      totalStuck += count;
      if (count === 0) break;
    }
    if (totalStuck > 0) {
      logger.warn(
        `Reset ${totalStuck} stuck DELETING files (marked as RETRYABLE)`
      );
    }

    // Phase 2: Pick SOFT_DELETED files for hard delete
    // FATAL guard: GC filters FATAL here (workflow also checks as safety net)
    let batchesProcessed = 0;
    while (batchesProcessed < MAX_GC_BATCHES) {
      const batch = await fileRepo.findSoftDeletedForGC({
        cutoffDate: daysAgo(RETENTION_DAYS),
        errorCooldown: hoursAgo(ERROR_COOLDOWN_HOURS),
        limit: BATCH_LIMIT,
      });

      if (batch.length === 0) break;

      // Start workflows in parallel with concurrency limit
      await pMap(
        batch,
        (file) => startHardDeleteWorkflow(file.id),
        { concurrency: PARALLEL_WORKFLOWS, stopOnError: false }
      );

      batchesProcessed++;
    }

    if (batchesProcessed === MAX_GC_BATCHES) {
      logger.info(
        `GC hit max batches limit (${MAX_GC_BATCHES}), will continue next run`
      );
    }
  }
}
```

**Acceptance criteria:**
- [ ] Phase 1: Reset stuck DELETING (with RETRYABLE marker)
- [ ] Phase 2: Pick SOFT_DELETED for hard delete
- [ ] Never picks FATAL files (two-layer guard)
- [ ] Parallel workflow starts (concurrency=10)
- [ ] Caps batches to prevent runaway

---

## Phase 6: Scripts

### Task 6.1: Update FileDeleteScript

**File:** `services/media/src/scripts/file/FileDeleteScript.ts`

Replace existing implementation:

```typescript
import { BaseScript } from "../../kernel/BaseScript";

export interface FileDeleteParams {
  id: string;
  permanent?: boolean;
}

export interface FileDeleteResult {
  success: boolean;
  error?: "FILE_NOT_FOUND" | "FILE_BEING_DELETED";
}

export class FileDeleteScript extends BaseScript<
  FileDeleteParams,
  FileDeleteResult
> {
  async execute(params: FileDeleteParams): Promise<FileDeleteResult> {
    const { id, permanent = false } = params;

    const file = await this.repo.file.findAnyById(id);
    if (!file) {
      return { success: false, error: "FILE_NOT_FOUND" };
    }

    if (file.deletionState === "DELETING") {
      return { success: false, error: "FILE_BEING_DELETED" };
    }

    // Soft delete if ACTIVE
    if (file.deletionState === "ACTIVE") {
      await this.repo.file.softDeleteIfEligible(id, new Date());
    }

    // Start hard delete workflow if permanent (fire-and-forget)
    if (permanent) {
      await this.startHardDeleteWorkflow(id);
    }

    return { success: true };
  }

  private async startHardDeleteWorkflow(fileId: string): Promise<void> {
    // TODO: Integrate with DBOS workflow start
    // await DBOS.startWorkflow(FileHardDeleteWorkflow).run(fileId);
  }
}
```

**Acceptance criteria:**
- [ ] DELETING → FILE_BEING_DELETED error
- [ ] Soft delete if ACTIVE
- [ ] Fire-and-forget workflow start if permanent

### Task 6.2: Create FileDeleteManyScript

**File:** `services/media/src/scripts/file/FileDeleteManyScript.ts` (new)

```typescript
import { BaseScript } from "../../kernel/BaseScript";
import type { File } from "../../repositories/models/files";

export interface FileDeleteManyParams {
  ids: string[];
  permanent?: boolean;
}

export interface FileDeleteManyResult {
  acceptedIds: string[];
  startedHardDeleteIds: string[];
  errors: Array<{ id: string; code: "FILE_NOT_FOUND" | "FILE_BEING_DELETED" }>;
}

export class FileDeleteManyScript extends BaseScript<
  FileDeleteManyParams,
  FileDeleteManyResult
> {
  async execute(params: FileDeleteManyParams): Promise<FileDeleteManyResult> {
    const { ids, permanent = false } = params;
    const now = new Date();

    const acceptedIds: string[] = [];
    const startedHardDeleteIds: string[] = [];
    const errors: FileDeleteManyResult["errors"] = [];

    // Check all files
    const filesMap = new Map<string, File>();
    for (const id of ids) {
      const file = await this.repo.file.findAnyById(id);
      if (!file) {
        errors.push({ id, code: "FILE_NOT_FOUND" });
        continue;
      }
      if (file.deletionState === "DELETING") {
        errors.push({ id, code: "FILE_BEING_DELETED" });
        continue;
      }
      filesMap.set(id, file);
    }

    // Soft delete ACTIVE files
    const activeIds = [...filesMap.entries()]
      .filter(([_, f]) => f.deletionState === "ACTIVE")
      .map(([id]) => id);

    if (activeIds.length > 0) {
      const softDeleted = await this.repo.file.softDeleteManyIfEligible(
        activeIds,
        now
      );
      acceptedIds.push(...softDeleted);
    }

    // Add already SOFT_DELETED to accepted (idempotent)
    const alreadySoftDeleted = [...filesMap.entries()]
      .filter(([_, f]) => f.deletionState === "SOFT_DELETED")
      .map(([id]) => id);
    acceptedIds.push(...alreadySoftDeleted);

    // Start hard delete workflows if permanent
    if (permanent) {
      const eligibleForHardDelete = [...filesMap.keys()];
      for (const id of eligibleForHardDelete) {
        await this.startHardDeleteWorkflow(id);
        startedHardDeleteIds.push(id);
      }
    }

    return { acceptedIds, startedHardDeleteIds, errors };
  }

  private async startHardDeleteWorkflow(fileId: string): Promise<void> {
    // TODO: Integrate with DBOS workflow start
  }
}
```

**Acceptance criteria:**
- [ ] Batch soft delete ACTIVE files
- [ ] SOFT_DELETED in acceptedIds (idempotent)
- [ ] DELETING → FILE_BEING_DELETED error
- [ ] Returns startedHardDeleteIds

### Task 6.3: Create FileRestoreScript

**File:** `services/media/src/scripts/file/FileRestoreScript.ts` (new)

```typescript
import { BaseScript } from "../../kernel/BaseScript";
import type { File } from "../../repositories/models/files";

export interface FileRestoreParams {
  id: string;
}

export interface FileRestoreResult {
  file?: File;
  error?: "FILE_NOT_FOUND" | "FILE_BEING_DELETED" | "INVALID_STATE";
}

export class FileRestoreScript extends BaseScript<
  FileRestoreParams,
  FileRestoreResult
> {
  async execute(params: FileRestoreParams): Promise<FileRestoreResult> {
    const file = await this.repo.file.findAnyById(params.id);
    if (!file) {
      return { error: "FILE_NOT_FOUND" };
    }

    const result = await this.repo.file.restore(params.id);
    if (!result.success) {
      return { error: result.error };
    }

    const restored = await this.repo.file.findById(params.id);
    return { file: restored! };
  }
}
```

### Task 6.4: Create FileClearErrorScript

**File:** `services/media/src/scripts/file/FileClearErrorScript.ts` (new)

```typescript
import { BaseScript } from "../../kernel/BaseScript";
import type { File } from "../../repositories/models/files";

export interface FileClearErrorParams {
  id: string;
}

export interface FileClearErrorResult {
  file?: File;
  error?: "FILE_NOT_FOUND" | "FILE_BEING_DELETED" | "INVALID_STATE";
}

export class FileClearErrorScript extends BaseScript<
  FileClearErrorParams,
  FileClearErrorResult
> {
  async execute(params: FileClearErrorParams): Promise<FileClearErrorResult> {
    const file = await this.repo.file.findAnyById(params.id);
    if (!file) {
      return { error: "FILE_NOT_FOUND" };
    }
    if (file.deletionState === "DELETING") {
      return { error: "FILE_BEING_DELETED" };
    }
    if (file.deletionState === "ACTIVE") {
      return { error: "INVALID_STATE" };
    }
    if (!file.deletionErrorCode) {
      return { error: "INVALID_STATE" };
    }

    const success = await this.repo.file.clearError(params.id);
    if (!success) {
      return { error: "INVALID_STATE" };
    }

    const updated = await this.repo.file.findAnyById(params.id);
    return { file: updated! };
  }
}
```

---

## Phase 7: GraphQL API

### Task 7.1: Update GraphQL Schema

**File:** `services/media/src/api/graphql-admin/file.graphql`

Add new types and mutations:

```graphql
# Add to File type
extend type File {
  deletionState: String!
  deletionErrorCode: String
  lastDeletionError: String
  failedAt: DateTime
}

input FileDeleteManyInput {
  ids: [ID!]!
  permanent: Boolean
}

type FileDeleteManyPayload {
  acceptedIds: [ID!]!
  startedHardDeleteIds: [ID!]!
  userErrors: [UserError!]!
}

input FileRestoreInput {
  id: ID!
}

type FileRestorePayload {
  file: File
  userErrors: [UserError!]!
}

input FileClearErrorInput {
  id: ID!
}

type FileClearErrorPayload {
  file: File
  userErrors: [UserError!]!
}

extend type MediaMutation {
  fileDeleteMany(input: FileDeleteManyInput!): FileDeleteManyPayload!
  fileRestore(input: FileRestoreInput!): FileRestorePayload!
  fileClearError(input: FileClearErrorInput!): FileClearErrorPayload!
}
```

### Task 7.2: Add Resolvers

**File:** `services/media/src/resolvers/admin/MediaMutationResolver.ts`

Add new mutation resolvers:

```typescript
@Mutation()
async fileDeleteMany(
  @Arg("input") input: FileDeleteManyInput
): Promise<FileDeleteManyPayload> {
  const result = await this.kernel.runScript(FileDeleteManyScript, {
    ids: input.ids,
    permanent: input.permanent ?? false,
  });

  return {
    acceptedIds: result.acceptedIds,
    startedHardDeleteIds: result.startedHardDeleteIds,
    userErrors: result.errors.map((e) => ({
      field: ["ids"],
      code: e.code,
      message: this.getErrorMessage(e.code),
    })),
  };
}

@Mutation()
async fileRestore(
  @Arg("input") input: FileRestoreInput
): Promise<FileRestorePayload> {
  const result = await this.kernel.runScript(FileRestoreScript, {
    id: input.id,
  });

  if (result.error) {
    return {
      file: null,
      userErrors: [
        {
          field: ["id"],
          code: result.error,
          message: this.getErrorMessage(result.error),
        },
      ],
    };
  }

  return { file: result.file, userErrors: [] };
}

@Mutation()
async fileClearError(
  @Arg("input") input: FileClearErrorInput
): Promise<FileClearErrorPayload> {
  const result = await this.kernel.runScript(FileClearErrorScript, {
    id: input.id,
  });

  if (result.error) {
    return {
      file: null,
      userErrors: [
        {
          field: ["id"],
          code: result.error,
          message: this.getErrorMessage(result.error),
        },
      ],
    };
  }

  return { file: result.file, userErrors: [] };
}

private getErrorMessage(code: string): string {
  const messages: Record<string, string> = {
    FILE_NOT_FOUND: "File not found",
    FILE_BEING_DELETED: "File is currently being deleted",
    INVALID_STATE: "Invalid file state for this operation",
  };
  return messages[code] ?? "Unknown error";
}
```

### Task 7.3: Update FileResolver

**File:** `services/media/src/resolvers/admin/FileResolver.ts`

Add field resolvers for new columns:

```typescript
@FieldResolver(() => String)
deletionState(@Root() file: File): string {
  return file.deletionState;
}

@FieldResolver(() => String, { nullable: true })
deletionErrorCode(@Root() file: File): string | null {
  return file.deletionErrorCode;
}

@FieldResolver(() => String, { nullable: true })
lastDeletionError(@Root() file: File): string | null {
  return file.lastDeletionError;
}

@FieldResolver(() => Date, { nullable: true })
failedAt(@Root() file: File): Date | null {
  return file.failedAt ? new Date(file.failedAt) : null;
}
```

---

## Phase 8: Tests

### Task 8.1: CHECK Constraint Tests

**File:** `services/media/src/__tests__/deletion/constraints.test.ts` (new)

```typescript
import { describe, it, expect } from "vitest";

describe("CHECK constraints", () => {
  it("rejects error_code without failed_at", async () => {
    await expect(
      db
        .update(files)
        .set({ deletionErrorCode: "RETRYABLE", failedAt: null })
        .where(eq(files.id, testFileId))
    ).rejects.toThrow(/chk_error_fields_paired/);
  });

  it("rejects failed_at without error_code", async () => {
    await expect(
      db
        .update(files)
        .set({ deletionErrorCode: null, failedAt: new Date().toISOString() })
        .where(eq(files.id, testFileId))
    ).rejects.toThrow(/chk_error_fields_paired/);
  });

  it("rejects DELETING with error fields", async () => {
    // First set to SOFT_DELETED
    await db
      .update(files)
      .set({ deletionState: "SOFT_DELETED", deletedAt: new Date().toISOString() })
      .where(eq(files.id, testFileId));

    // Try to set DELETING with error - should fail
    await expect(
      db.execute(sql`
        UPDATE media.files
        SET deletion_state = 'DELETING',
            deleting_started_at = now(),
            deletion_error_code = 'RETRYABLE',
            failed_at = now()
        WHERE id = ${testFileId}
      `)
    ).rejects.toThrow(/chk_deleting_has_no_errors/);
  });

  it("rejects DELETING without started_at", async () => {
    await expect(
      db.execute(sql`
        UPDATE media.files
        SET deletion_state = 'DELETING',
            deleting_started_at = NULL
        WHERE id = ${testFileId}
      `)
    ).rejects.toThrow(/chk_deleting_has_started_at/);
  });
});
```

### Task 8.2: Repository Tests

**File:** `services/media/src/__tests__/deletion/repository.test.ts` (new)

Tests for all repository methods.

### Task 8.3: Error Classification Tests

**File:** `services/media/src/__tests__/deletion/classifyError.test.ts` (new)

```typescript
import { describe, it, expect } from "vitest";
import { classifyError, MissingMetadataError } from "../../utils/classifyError";

describe("classifyError", () => {
  it("classifies NoSuchBucket as FATAL", () => {
    const error = { Code: "NoSuchBucket", $metadata: {} };
    expect(classifyError(error)).toBe("FATAL");
  });

  it("classifies AccessDenied as FATAL", () => {
    const error = { Code: "AccessDenied", $metadata: {} };
    expect(classifyError(error)).toBe("FATAL");
  });

  it("classifies MissingMetadataError as FATAL", () => {
    const error = new MissingMetadataError("test");
    expect(classifyError(error)).toBe("FATAL");
  });

  it("classifies S3 ServiceUnavailable as RETRYABLE", () => {
    const error = { Code: "ServiceUnavailable", $metadata: {} };
    expect(classifyError(error)).toBe("RETRYABLE");
  });

  it("classifies unknown errors as RETRYABLE", () => {
    expect(classifyError(new Error("timeout"))).toBe("RETRYABLE");
  });
});
```

### Task 8.4: Workflow Tests

**File:** `services/media/src/__tests__/deletion/workflows.test.ts` (new)

### Task 8.5: Race Condition Tests

**File:** `services/media/src/__tests__/deletion/race.test.ts` (new)

```typescript
import { describe, it, expect, vi } from "vitest";

describe("race conditions", () => {
  it("workflow aborts when isDeletionLockValid returns false", async () => {
    const s3Spy = vi.spyOn(s3Client, "deleteObject");
    const hardDeleteSpy = vi.spyOn(fileRepo, "hardDeleteIfDeleting");

    vi.spyOn(fileRepo, "isDeletionLockValid").mockResolvedValue(false);
    vi.spyOn(fileRepo, "findAnyById").mockResolvedValue({
      id: fileId,
      deletionState: "SOFT_DELETED",
    });

    await workflow.run(fileId);

    expect(s3Spy).not.toHaveBeenCalled();
    expect(hardDeleteSpy).not.toHaveBeenCalled();
  });

  it("logs row_missing when file already hard-deleted", async () => {
    const infoSpy = vi.spyOn(logger, "info");

    vi.spyOn(fileRepo, "markDeletingReturningStartedAt").mockResolvedValue({
      startedAt: new Date(),
    });
    vi.spyOn(fileRepo, "isDeletionLockValid").mockResolvedValue(false);
    vi.spyOn(fileRepo, "findAnyById")
      .mockResolvedValueOnce({ id: fileId, deletionState: "SOFT_DELETED" })
      .mockResolvedValueOnce(null);

    await workflow.run(fileId);

    expect(infoSpy).toHaveBeenCalledWith(
      expect.objectContaining({ reason: "row_missing" }),
      expect.any(String)
    );
  });

  it("logs state_changed:ACTIVE when file was restored", async () => {
    const infoSpy = vi.spyOn(logger, "info");

    vi.spyOn(fileRepo, "markDeletingReturningStartedAt").mockResolvedValue({
      startedAt: new Date(),
    });
    vi.spyOn(fileRepo, "isDeletionLockValid").mockResolvedValue(false);
    vi.spyOn(fileRepo, "findAnyById")
      .mockResolvedValueOnce({ id: fileId, deletionState: "SOFT_DELETED" })
      .mockResolvedValueOnce({ id: fileId, deletionState: "ACTIVE" });

    await workflow.run(fileId);

    expect(infoSpy).toHaveBeenCalledWith(
      expect.objectContaining({ reason: "state_changed:ACTIVE" }),
      expect.any(String)
    );
  });
});
```

---

## Phase 9: Integration

### Task 9.1: Update Existing Queries

Update all existing file queries to use `deletion_state`:

```typescript
// Before
.where(isNull(files.deletedAt))

// After
.where(eq(files.deletionState, "ACTIVE"))
```

### Task 9.2: Schedule GC Workflow

Add cron job for FileGarbageCollectorWorkflow:
- Suggested: Every 15 minutes
- Or: DBOS scheduled workflow

### Task 9.3: Remove Old Deletion Logic

Remove synchronous permanent delete from old FileDeleteScript.

---

## Checklist Summary

### Critical Path
- [ ] Phase 1: Database schema (1.1 → 1.3)
- [ ] Phase 2: Type definitions (2.1)
- [ ] Phase 3: Repository methods (3.1 → 3.9)
- [ ] Phase 4: Error classification (4.1)
- [ ] Phase 5: Workflows (5.1 → 5.2)
- [ ] Phase 6: Scripts (6.1 → 6.4)

### Parallel Work
- [ ] Phase 7: GraphQL API (7.1 → 7.3)
- [ ] Phase 8: Tests (8.1 → 8.5)

### Final Steps
- [ ] Phase 9: Integration (9.1 → 9.3)
