# File Deletion MVP Plan

> Version 0.7.1 - Moved lock validation to DB-side (`isDeletionLockValid`), added explicit abort reasons, added CHECK for DELETING→startedAt, improved race test mocking

## Goals

- Consistency: avoid S3 orphans and stale DB rows.
- Simplicity: 3 states only, error = attributes, minimal GC phases.
- Safety: DELETING is a hard lock; no restore or delete while in progress.
- Operability: errors visible in `deletion_error_code` + `last_deletion_error`.

## Key Decisions

| Decision                           | Rationale                                                                    |
| ---------------------------------- | ---------------------------------------------------------------------------- |
| Only 3 states                      | `ACTIVE \| SOFT_DELETED \| DELETING` — no FAILED state.                      |
| Error = attributes, not state      | On error: rollback to SOFT_DELETED + set `failed_at`, `deletion_error_code`. |
| 2 error codes only                 | `RETRYABLE \| FATAL` — details in `last_deletion_error`.                     |
| `deletion_state` = source of truth | Single field determines file status; `deleted_at` only for retention calc.   |
| GC skips recent errors             | Files with fresh `failed_at` or FATAL error skipped until admin clears.      |
| Add deleting_started_at            | Track when DELETING started for stuck detection (auto-reset after 6hr).      |
| Conditional hardDelete             | `DELETE WHERE state='DELETING'` prevents accidental deletion; returns bool.  |
| Per-object S3 delete               | Simpler error handling than batch deleteObjects.                             |
| No async API for clients           | deleteMany is fire-and-forget; no jobId.                                     |
| Restore only from SOFT_DELETED     | Simpler contract; clear rules for each state.                                |
| CTE for batch updates              | PostgreSQL requires CTE for UPDATE with LIMIT.                               |
| Parallel workflow start            | Start up to N workflows concurrently for better throughput.                  |
| 2 GC phases only                   | Reset stuck + pick for deletion. No separate "failed reset" phase.           |
| Admin clear error endpoint         | Manual endpoint to clear error attributes for retry.                         |
| Two-layer FATAL guard              | GC filters FATAL + workflow rejects FATAL (safety net for manual starts).    |
| Pre-S3 lock validation (DB-side)   | Before S3 delete, call `isDeletionLockValid(fileId, startedAt)` — comparison in SQL avoids JS/PG timestamp precision issues. |

---

## Key Invariants (no exceptions!)

### Timestamp Semantics

| Field                 | Meaning                                         | Set When                           |
| --------------------- | ----------------------------------------------- | ---------------------------------- |
| `deleted_at`          | When file was soft-deleted (for retention calc) | ACTIVE → SOFT_DELETED              |
| `deleting_started_at` | When hard delete started (for stuck detection)  | SOFT_DELETED → DELETING            |
| `failed_at`           | When last hard delete attempt failed            | DELETING → SOFT_DELETED on error   |

**Critical rules:**

- `deleted_at` is set **once per soft-delete cycle**: set on ACTIVE → SOFT_DELETED, not updated while file remains SOFT_DELETED/DELETING. Cleared on restore (SOFT_DELETED → ACTIVE), then set again on next soft delete.
- `failed_at` = "time of last failed hard delete attempt" (not a state indicator).
- `deleting_started_at` is used for **race condition protection**: workflow stores it locally and validates via `isDeletionLockValid(fileId, startedAt)` before S3 delete. **Comparison happens in SQL** to avoid JS/PG timestamp precision mismatches.

### Error Attribute Invariants

| Condition                         | Must Be True                                        |
| --------------------------------- | --------------------------------------------------- |
| `deletion_error_code IS NOT NULL` | `failed_at IS NOT NULL` (and vice versa ⇔)          |
| `deletion_state = 'DELETING'`     | `deletion_error_code IS NULL AND failed_at IS NULL` |
| `deletion_state = 'ACTIVE'`       | All error fields NULL                               |

**No "active error" in DELETING**: error attributes are always cleared when entering DELETING.

### Retry Rules (single source of truth)

| Error Code  | GC Behavior                                           |
| ----------- | ----------------------------------------------------- |
| `NULL`      | Pick for hard delete if retention passed              |
| `RETRYABLE` | Pick for hard delete if `failed_at < cooldown`        |
| `FATAL`     | **Never** pick automatically; admin must `clearError` |

---

## State Machine

```
ACTIVE -> SOFT_DELETED -> DELETING -> HARD DELETE
SOFT_DELETED -> ACTIVE (restore)
DELETING -> SOFT_DELETED (on error, with error attributes)
DELETING -> SOFT_DELETED (stuck timeout via GC only; mutations forbidden)
```

**Note**: `resetStuckDeleting` is the ONLY legal way to exit DELETING without hardDelete. Direct mutations (restore, delete, update) are forbidden while in DELETING state.

### Status Checks (single source of truth: `deletion_state`)

| Question                 | Answer                            |
| ------------------------ | --------------------------------- |
| Is file deleted?         | `deletion_state != ACTIVE`        |
| Can restore?             | `deletion_state == SOFT_DELETED`  |
| Can soft delete?         | `deletion_state == ACTIVE`        |
| Is locked (don't touch)? | `deletion_state == DELETING`      |
| Has error?               | `deletion_error_code IS NOT NULL` |

---

## Database Schema Changes

### Required columns (keep minimal)

```sql
ALTER TABLE media.files
  ADD COLUMN deletion_state VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN deletion_error_code VARCHAR(20),      -- RETRYABLE | FATAL
  ADD COLUMN last_deletion_error TEXT,
  ADD COLUMN deleting_started_at TIMESTAMPTZ,
  ADD COLUMN failed_at TIMESTAMPTZ;                -- last error timestamp (not a state!)

UPDATE media.files
SET deletion_state = 'SOFT_DELETED'
WHERE deleted_at IS NOT NULL;

-- CHECK constraints: enforce field invariants at DB level
ALTER TABLE media.files
  ADD CONSTRAINT chk_error_fields_paired
  CHECK ((deletion_error_code IS NULL) = (failed_at IS NULL));

ALTER TABLE media.files
  ADD CONSTRAINT chk_deleting_has_no_errors
  CHECK (
    deletion_state <> 'DELETING'
    OR (deletion_error_code IS NULL AND failed_at IS NULL AND last_deletion_error IS NULL)
  );

ALTER TABLE media.files
  ADD CONSTRAINT chk_deleting_has_started_at
  CHECK (
    deletion_state <> 'DELETING'
    OR deleting_started_at IS NOT NULL
  );

ALTER TABLE media.files
  ADD CONSTRAINT chk_active_has_no_deletion_fields
  CHECK (
    deletion_state <> 'ACTIVE'
    OR (deleted_at IS NULL AND deleting_started_at IS NULL AND deletion_error_code IS NULL AND failed_at IS NULL AND last_deletion_error IS NULL)
  );

-- Enum value constraints: restrict to valid values only
ALTER TABLE media.files
  ADD CONSTRAINT chk_deletion_state_valid
  CHECK (deletion_state IN ('ACTIVE', 'SOFT_DELETED', 'DELETING'));

ALTER TABLE media.files
  ADD CONSTRAINT chk_deletion_error_code_valid
  CHECK (deletion_error_code IS NULL OR deletion_error_code IN ('RETRYABLE', 'FATAL'));

-- GC query: soft deleted files ready for hard delete
-- Excludes files with recent errors or FATAL errors
CREATE INDEX idx_files_gc_soft_deleted
  ON media.files (deleted_at, id)
  WHERE deletion_state = 'SOFT_DELETED';

-- GC query: clean SOFT_DELETED files (no error) for faster queries
CREATE INDEX idx_files_gc_soft_deleted_clean
  ON media.files (deleted_at, id)
  WHERE deletion_state = 'SOFT_DELETED'
    AND deletion_error_code IS NULL;

-- Stuck detection: files in DELETING for too long
CREATE INDEX idx_files_stuck_deleting
  ON media.files (deleting_started_at, id)
  WHERE deletion_state = 'DELETING'
    AND deleting_started_at IS NOT NULL;

-- Optional: index for retryable files with cooldown filtering (useful at scale)
-- CREATE INDEX idx_files_gc_retryable
--   ON media.files (failed_at, id)
--   WHERE deletion_state = 'SOFT_DELETED'
--     AND deletion_error_code = 'RETRYABLE';

COMMENT ON COLUMN media.files.deletion_state IS
  'ACTIVE | SOFT_DELETED | DELETING (only 3 states, no FAILED)';
COMMENT ON COLUMN media.files.deletion_error_code IS
  'Error type: RETRYABLE | FATAL. NULL = no error. Details in last_deletion_error.';
COMMENT ON COLUMN media.files.deleting_started_at IS
  'Set when entering DELETING; used for stuck detection';
COMMENT ON COLUMN media.files.failed_at IS
  'Last error timestamp; used for cooldown. NOT a state indicator.';
```

### Error Codes (only 2)

| Code      | Auto-retry | Description                                      |
| --------- | ---------- | ------------------------------------------------ |
| RETRYABLE | Yes        | Transient error (timeout, 5xx, etc.)             |
| FATAL     | No         | Permanent error (AccessDenied, missing metadata) |

- `RETRYABLE`: GC will retry after cooldown period.
- `FATAL`: Requires admin to clear error via `fileClearError` mutation.
- Details are always in `last_deletion_error` (structured JSON or string).

---

## Workflows and Scripts (MVP)

### FileHardDeleteWorkflow

Single file hard delete with a linear sequence. On error → rollback to SOFT_DELETED + set error attributes.

```typescript
@DBOS.workflow()
async run(fileId: string) {
  // 0. Guard: reject manual starts for files with FATAL error
  //    (safety net for admin/script calls that bypass GC filtering)
  const file = await Repo.file.findAnyById(fileId);  // includes all states
  if (!file) {
    logger.debug(`File ${fileId} not found, skipping`);
    return;
  }
  if (file.deletionState !== 'SOFT_DELETED') {
    logger.debug(`File ${fileId} not in SOFT_DELETED (state=${file.deletionState}), skipping`);
    return;
  }
  if (file.deletionErrorCode === 'FATAL') {
    logger.debug(`File ${fileId} has FATAL error, admin must clear first via fileClearError`);
    return;
  }

  // 1. Atomically move SOFT_DELETED -> DELETING
  //    Sets deleting_started_at = now()
  //    Clears ALL error attributes (invariant!)
  //    RETURNS startedAt for race condition protection!
  const lockResult = await Repo.markDeletingReturningStartedAt(fileId);
  if (!lockResult) {
    logger.debug(`markDeleting skipped: file ${fileId} not in SOFT_DELETED`);
    return;
  }
  const { startedAt } = lockResult;  // ← store locally for validation

  try {
    // 2. Get S3 metadata and validate
    const s3Object = await Repo.s3Object.findByFileId(fileId);
    if (!s3Object) {
      throw new MissingMetadataError(`File ${fileId} has no S3 metadata`);
    }
    const bucket = await Repo.bucket.findById(s3Object.bucketId);
    if (!bucket) {
      throw new MissingMetadataError(`Bucket ${s3Object.bucketId} not found`);
    }

    // 3. RACE CONDITION GUARD: verify lock is still ours before S3 delete
    //    Uses DB-side comparison to avoid JS/PG timestamp precision issues
    const isLockValid = await Repo.isDeletionLockValid(fileId, startedAt);
    if (!isLockValid) {
      // Fetch current state for detailed logging (helps debugging)
      const current = await Repo.file.findAnyById(fileId);
      const reason = !current
        ? 'row_missing'                                        // already hard-deleted
        : current.deletionState !== 'DELETING'
          ? `state_changed:${current.deletionState}`           // restored or reset
          : 'startedAt_mismatch';                              // GC reset and re-locked
      logger.info({ fileId, reason }, `Lock lost before S3 delete, aborting safely`);
      return;  // ← exit WITHOUT deleting S3 or marking error
    }

    // 4. Delete from S3 using bucket/key (idempotent: 404/NotFound is ignored)
    await S3.deleteObject({ bucket: bucket.bucketName, key: s3Object.objectKey });

    // 5. Hard delete DB row (conditional on state=DELETING)
    const deleted = await Repo.hardDelete(fileId);
    if (!deleted) {
      logger.info(`hardDelete skipped: file ${fileId} no longer in DELETING`);  // ← info, not warn
    }
  } catch (e: any) {
    // 6. Rollback to SOFT_DELETED + set error attributes
    const errorCode = classifyError(e);
    await Repo.markErrorAndRollback(fileId, errorCode, e.message ?? String(e));
    throw e; // Surface to DBOS for logging
  }
}
```

Notes:

- **No FAILED state**: on error, file goes back to `SOFT_DELETED` with error attributes.
- **DELETING is a hard lock**: all operations (restore, delete, update metadata) must reject if state is DELETING.
- **Two-layer FATAL guard**: GC filters FATAL + workflow rejects FATAL (safety net for manual starts).
- **S3 delete uses bucket/key**: always fetch metadata first; `MissingMetadataError` → FATAL.
- **Race condition protection (DB-side)**: workflow stores `startedAt` locally and calls `isDeletionLockValid(fileId, startedAt)` — comparison happens in SQL to avoid JS/PG timestamp precision issues. If lock is lost, workflow aborts safely with explicit reason (`row_missing`, `state_changed:X`, `startedAt_mismatch`).
- `hardDelete` returns bool; false means GC reset the state (rare but possible); **logs at `info` level** (not `warn`).

### Repeated Retry Behavior

Each failed attempt **overwrites** error attributes:

- `failed_at` → updated to now()
- `deletion_error_code` → may change (e.g., RETRYABLE → FATAL if error type changes)
- `last_deletion_error` → updated with new error details

This means: if a transient error becomes permanent (e.g., credentials revoked), the error_code
will update to FATAL on the next attempt, and the file will be blocked from auto-retry.

### FileGarbageCollectorWorkflow (GC)

**Only 2 phases**: stuck reset + pick for hard delete.

```typescript
const STUCK_TIMEOUT_HOURS = 6;     // Conservative: longer than worst-case DBOS retries
const ERROR_COOLDOWN_HOURS = 6;    // Skip files with recent errors
const RETENTION_DAYS = 30;
const BATCH_LIMIT = 100;
const MAX_RESET_BATCHES = 10;      // Cap for phase 1 loop
const MAX_GC_BATCHES = 50;         // Cap for phase 2 loop
const PARALLEL_WORKFLOWS = 10;     // Concurrent workflow starts per batch

@DBOS.workflow()
async run() {
  // Phase 1: Reset stuck DELETING -> SOFT_DELETED (with error marking!)
  // Marks as RETRYABLE so files go through cooldown before retry
  let totalStuck = 0;
  for (let i = 0; i < MAX_RESET_BATCHES; i++) {
    const count = await Repo.resetStuckDeleting({
      stuckSince: hoursAgo(STUCK_TIMEOUT_HOURS),
      limit: BATCH_LIMIT,
    });
    totalStuck += count;
    if (count === 0) break;
  }
  if (totalStuck > 0) {
    logger.warn(`Reset ${totalStuck} stuck DELETING files (marked as RETRYABLE)`);
  }

  // Phase 2: Pick SOFT_DELETED files for hard delete
  // FATAL guard: GC filters FATAL here (workflow also checks as safety net)
  // Skips:
  //   - FATAL error (require admin clear)
  //   - Recent RETRYABLE error (cooldown not passed)
  let batchesProcessed = 0;
  while (batchesProcessed < MAX_GC_BATCHES) {
    const batch = await Repo.findSoftDeletedForGC({
      cutoffDate: daysAgo(RETENTION_DAYS),
      errorCooldown: hoursAgo(ERROR_COOLDOWN_HOURS),
      limit: BATCH_LIMIT,
    });

    if (batch.length === 0) break;

    // Start workflows in parallel with concurrency limit
    await pMap(
      batch,
      (file) =>
        this.services.workflow
          .get<FileHardDeleteWorkflow>("fileHardDelete")
          .start({ fileId: file.id }),
      { concurrency: PARALLEL_WORKFLOWS, stopOnError: false }
    );

    batchesProcessed++;
  }

  if (batchesProcessed === MAX_GC_BATCHES) {
    logger.info(`GC hit max batches limit (${MAX_GC_BATCHES}), will continue next run`);
  }
}
```

Notes:

- **Only 2 phases** (not 3): no separate "failed reset" phase.
- **Two-layer FATAL guard**: GC filters FATAL here + workflow rejects FATAL as safety net.
- Stuck detection: `DELETING` for > 6 hours → reset to SOFT_DELETED **with RETRYABLE error marker**.
  This prevents immediate ping-pong: stuck files go through cooldown before retry.
- GC query excludes:
  - `FATAL` error → skip forever (requires admin `fileClearError`)
  - `RETRYABLE` error with `failed_at` within cooldown → skip until cooldown passes

### FileDeleteScript

- Soft delete: ACTIVE → SOFT_DELETED, set `deleted_at` (idempotent: SOFT_DELETED → no-op, `deleted_at` unchanged).
- Permanent delete: start FileHardDeleteWorkflow in background (fire-and-forget).
- DELETING → FILE_BEING_DELETED error.

### FileDeleteManyScript

- Soft delete: mark all ACTIVE files → SOFT_DELETED (set `deleted_at`), SOFT_DELETED → no-op (in acceptedIds).
- Permanent delete: start a workflow per eligible file and return 200 OK.
- DELETING files → FILE_BEING_DELETED userError (not in acceptedIds).

### FileRestoreScript

Simple matrix (no "wait for GC" messages):

| Current State | Action                                                 |
| ------------- | ------------------------------------------------------ |
| SOFT_DELETED  | → ACTIVE, clear ALL fields (`deleted_at`, error attrs) |
| DELETING      | → error `FILE_BEING_DELETED`                           |
| ACTIVE        | → error `INVALID_STATE` (already active)               |

Note: Since there's no FAILED state, files with errors are in SOFT_DELETED and can be restored normally.
Restore **clears** error attributes — user doesn't need to call `fileClearError` first.

---

## Repository Methods (MVP)

Minimum required methods in FileRepository:

```typescript
// ============================================================
// SOFT DELETE
// ============================================================

softDeleteIfEligible(fileId, deletedAt)
// UPDATE files SET deletion_state = 'SOFT_DELETED',
//   deleted_at = COALESCE(deleted_at, $2)   -- ← set ONLY if NULL!
// WHERE id = $1 AND deletion_state = 'ACTIVE'
// RETURNING id
// NOTE: deleted_at is NEVER overwritten on repeat calls

softDeleteManyIfEligible(fileIds, deletedAt)
// Same logic for batch: only set deleted_at if currently NULL

// ============================================================
// MARK DELETING (atomic lock) - returns startedAt for race protection!
// ============================================================

markDeletingReturningStartedAt(fileId): { startedAt: Date } | null
// CLEARS error attributes to maintain invariant!
// Does NOT filter by error_code - workflow guard handles FATAL check before this
// UPDATE files SET
//   deletion_state = 'DELETING',
//   deleting_started_at = now(),
//   deletion_error_code = NULL,        -- ← clear!
//   failed_at = NULL,                  -- ← clear!
//   last_deletion_error = NULL         -- ← clear!
// WHERE id = $1 AND deletion_state = 'SOFT_DELETED'
// RETURNING deleting_started_at       -- ← IMPORTANT: return timestamp!
// Returns { startedAt } if updated, null if not in SOFT_DELETED
// Workflow stores startedAt locally for race condition validation

// ============================================================
// VALIDATE DELETION LOCK (DB-side comparison for race protection)
// ============================================================

isDeletionLockValid(fileId, expectedStartedAt): boolean
// Comparison happens in SQL to avoid JS/PG timestamp precision issues!
// SELECT EXISTS (
//   SELECT 1 FROM media.files
//   WHERE id = $1
//     AND deletion_state = 'DELETING'
//     AND deleting_started_at = $2    -- ← exact match in PG, no JS roundtrip
// )
// Returns true if lock is still valid, false otherwise
// Used by workflow before S3 delete to prevent orphaned deletions after GC reset

// ============================================================
// MARK ERROR AND ROLLBACK (on workflow failure)
// ============================================================

markErrorAndRollback(fileId, errorCode, errorMessage): void
// Sets error attributes atomically when rolling back
// UPDATE files SET
//   deletion_state = 'SOFT_DELETED',
//   deletion_error_code = $2,          -- ← RETRYABLE or FATAL
//   last_deletion_error = $3,          -- ← error details
//   failed_at = now(),                 -- ← required if error_code set!
//   deleting_started_at = NULL         -- ← clear
// WHERE id = $1 AND deletion_state = 'DELETING'
// If rowCount=0 → log debug "not in DELETING (GC already reset?)"
//
// INVARIANT: After this, error_code IS NOT NULL AND failed_at IS NOT NULL

// ============================================================
// HARD DELETE (conditional)
// ============================================================

hardDelete(fileId): boolean
// DELETE FROM files WHERE id = $1 AND deletion_state = 'DELETING'
// Returns rowCount > 0
// If false → log info "not in DELETING (GC reset?)"  ← info, not warn!

// ============================================================
// GC QUERY (FATAL guard - GC filters here, workflow also checks)
// ============================================================

findSoftDeletedForGC({ cutoffDate, errorCooldown, limit }): File[]
// GC filters FATAL here; workflow also rejects FATAL as safety net for manual starts.
// SELECT * FROM files
// WHERE deletion_state = 'SOFT_DELETED'
//   AND deleted_at < $1                              -- retention passed
//   AND (
//     deletion_error_code IS NULL                    -- no error
//     OR (
//       deletion_error_code = 'RETRYABLE'            -- retryable
//       AND failed_at IS NOT NULL                    -- invariant check
//       AND failed_at < $2                           -- cooldown passed
//     )
//     -- FATAL is implicitly excluded (never matches)
//   )
// ORDER BY deleted_at, id
// LIMIT $3

// ============================================================
// RESET STUCK DELETING (GC phase 1)
// ============================================================

resetStuckDeleting({ stuckSince, limit }): number
// Resets stuck DELETING with RETRYABLE error marker for operability
// WITH cte AS (
//   SELECT id FROM media.files
//   WHERE deletion_state = 'DELETING'
//     AND deleting_started_at IS NOT NULL
//     AND deleting_started_at < $1
//   ORDER BY deleting_started_at, id
//   LIMIT $2
// )
// UPDATE media.files f
// SET deletion_state = 'SOFT_DELETED',
//     deleting_started_at = NULL,
//     deletion_error_code = 'RETRYABLE',             -- ← mark as error!
//     failed_at = now(),                             -- ← required
//     last_deletion_error = 'stuck deleting timeout' -- ← diagnostic
// FROM cte WHERE f.id = cte.id
// RETURNING f.id
//
// WHY mark as error? So it goes through cooldown before retry,
// preventing immediate ping-pong if issue persists.

// ============================================================
// ADMIN: CLEAR ERROR
// ============================================================

clearError(fileId): void
// Precondition: deletion_state = 'SOFT_DELETED' AND deletion_error_code IS NOT NULL
// UPDATE files SET
//   deletion_error_code = NULL,
//   last_deletion_error = NULL,
//   failed_at = NULL
// WHERE id = $1
//   AND deletion_state = 'SOFT_DELETED'
//   AND deletion_error_code IS NOT NULL   -- ← only if has error
// Throws INVALID_STATE if precondition fails
// After: GC can pick up file on next run

// ============================================================
// RESTORE
// ============================================================

restore(fileId): void
// UPDATE files SET
//   deletion_state = 'ACTIVE',
//   deleted_at = NULL,
//   deletion_error_code = NULL,
//   last_deletion_error = NULL,
//   failed_at = NULL,
//   deleting_started_at = NULL
// WHERE id = $1 AND deletion_state = 'SOFT_DELETED'
// Throws FILE_BEING_DELETED if state = 'DELETING'
// Throws INVALID_STATE if state = 'ACTIVE'
```

### Field Invariants (only 3 states!)

| State                | deleting_started_at | failed_at | deletion_error_code | last_deletion_error |
| -------------------- | ------------------- | --------- | ------------------- | ------------------- |
| ACTIVE               | NULL                | NULL      | NULL                | NULL                |
| SOFT_DELETED (clean) | NULL                | NULL      | NULL                | NULL                |
| SOFT_DELETED (error) | NULL                | set       | set (R/F)           | set                 |
| DELETING             | set                 | NULL      | NULL                | NULL                |

**Key invariants:**

- `deletion_error_code IS NOT NULL` ⇔ `failed_at IS NOT NULL` (always paired)
- `deletion_state = 'DELETING'` ⇒ all error fields NULL (cleared on entry)
- `deletion_state = 'ACTIVE'` ⇒ all fields NULL

All methods avoid token logic and next_attempt scheduling.

---

## S3 Error Handling

- Delete one object per call using `bucket` and `object_key` from file metadata.
- **S3 DeleteObject is idempotent**: usually returns success (200) even if object doesn't exist. Handle any 404/NotFound as success (object already gone).
- **NoSuchBucket = FATAL** (bucket misconfiguration requires admin intervention).
- Most S3 errors are from permissions/throttling, not "object not found".

### Error Classification (only 2 codes)

```typescript
type DeletionErrorCode = "RETRYABLE" | "FATAL";

function classifyError(error: Error): DeletionErrorCode {
  // S3 errors
  if (isS3Error(error)) {
    switch (error.Code) {
      case "AccessDenied":
      case "InvalidAccessKeyId":
      case "SignatureDoesNotMatch":
      case "NoSuchBucket":               // ← Bucket doesn't exist = FATAL
        return "FATAL"; // Permissions/creds issue, needs admin
      default:
        return "RETRYABLE"; // ServiceUnavailable, SlowDown, InternalError, timeouts
    }
  }

  // Missing metadata
  if (error instanceof MissingMetadataError) {
    return "FATAL"; // File has no bucket/object_key
  }

  // Default: assume retryable
  return "RETRYABLE";
}
```

Details are always stored in `last_deletion_error` (original error message or structured JSON).

---

## GraphQL Changes (MVP)

Remove async jobId and status polling. Keep input/output minimal.

```graphql
input FileDeleteManyInput {
  ids: [ID!]!
  permanent: Boolean
}

type FileDeleteManyPayload {
  acceptedIds: [ID!]!           # Files that were eligible and transitioned to SOFT_DELETED
  startedHardDeleteIds: [ID!]!  # Files for which hard delete workflow was actually started
  userErrors: [UserError!]!
}

input FileRestoreInput {
  id: ID!
}

type FileRestorePayload {
  file: File
  userErrors: [UserError!]!
}

extend type MediaMutation {
  fileDeleteMany(input: FileDeleteManyInput!): FileDeleteManyPayload!
  fileRestore(input: FileRestoreInput!): FileRestorePayload!

  # Admin only: clear error attributes to allow retry
  fileClearError(input: FileClearErrorInput!): FileClearErrorPayload! @admin
}

input FileClearErrorInput {
  id: ID!
}

type FileClearErrorPayload {
  file: File
  userErrors: [UserError!]!
}
```

### UserError Codes (simplified)

| Code               | When                             |
| ------------------ | -------------------------------- |
| FILE_NOT_FOUND     | File does not exist              |
| FILE_BEING_DELETED | File is in DELETING state        |
| INVALID_STATE      | Generic invalid state transition |

Note: No `FILE_DELETION_FAILED` code needed — files with errors are in `SOFT_DELETED` state, so restore works normally.

### Forbidden Operations During DELETING

When `deletion_state = 'DELETING'`, the following operations are **always rejected** with `FILE_BEING_DELETED`:

| Operation               | Allowed?              |
| ----------------------- | --------------------- |
| fileRestore             | ❌ FILE_BEING_DELETED |
| fileDeleteMany          | ❌ FILE_BEING_DELETED |
| fileClearError          | ❌ FILE_BEING_DELETED |
| fileUpdate (metadata)   | ❌ FILE_BEING_DELETED |
| Any other file mutation | ❌ FILE_BEING_DELETED |

**Rationale**: DELETING is a hard lock. The workflow is running and may complete at any moment.
No other operation should interfere.

### API Behavior Matrix

**fileRestore(id)**
| State | Result |
|--------------|--------------------------------------------------|
| SOFT_DELETED | → ACTIVE, clear ALL fields (deleted_at, errors) |
| DELETING | → `FILE_BEING_DELETED` error |
| ACTIVE | → `INVALID_STATE` error |

**fileDeleteMany(ids, permanent=false)**
| State | Result |
|--------------|--------------------------------------------------|
| ACTIVE | → SOFT_DELETED, set deleted_at (in acceptedIds) |
| SOFT_DELETED | → no-op, do NOT update deleted_at (idempotent) |
| DELETING | → `FILE_BEING_DELETED` userError |

Note: `deleted_at` is set **only on first soft delete** (retention anchor).

**fileDeleteMany(ids, permanent=true)**

- For ACTIVE files: transition to SOFT_DELETED first, then start workflow.
- For SOFT_DELETED files: start hard delete workflow in background.
- For DELETING files: return `FILE_BEING_DELETED` userError.
- Returns `startedHardDeleteIds` with IDs for which workflow was actually started.

**fileClearError(id)** (admin only)
| State | Result |
|---------------------|--------------------------------------------------|
| SOFT_DELETED + error| → Clear error attributes, return file |
| SOFT_DELETED (clean)| → `INVALID_STATE` (no error to clear) |
| DELETING | → `FILE_BEING_DELETED` error |
| ACTIVE | → `INVALID_STATE` error |

---

## Implementation Plan (MVP)

| #   | Task               | Files                                                                           | Priority | Notes                                                                          |
| --- | ------------------ | ------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------ |
| 1   | DB migration       | migrations/XXXX_deletion_state.sql                                              | Critical | 3 states, 2 error codes, CHECK constraints, idx_gc_soft_deleted_clean          |
| 2   | Repository methods | repositories/FileRepository.ts                                                  | Critical | markDeleting, markErrorAndRollback, hardDelete, resetStuckDeleting, clearError |
| 3   | Workflows          | workflows/FileHardDeleteWorkflow.ts, workflows/FileGarbageCollectorWorkflow.ts  | Critical | linear flow, 2-phase GC, error classification (RETRYABLE/FATAL)                |
| 4   | Scripts            | scripts/file/FileDeleteScript.ts, FileDeleteManyScript.ts, FileRestoreScript.ts | High     | fire-and-forget for permanent delete                                           |
| 5   | GraphQL            | api/graphql-admin/file.graphql, resolvers                                       | Medium   | fileDeleteMany (+ startedHardDeleteIds), fileRestore, fileClearError           |
| 6   | Tests              | **tests**/workflows                                                             | High     | state transitions, error attributes, stuck recovery, admin clear               |

---

## Automated Tests (Minimum 10)

| #   | Test Case                                  | Description                                                                        |
| --- | ------------------------------------------ | ---------------------------------------------------------------------------------- |
| 1   | CHECK constraint: error fields paired      | Verify DB rejects `error_code` without `failed_at` and vice versa                  |
| 2   | `markDeleting` clears error fields         | Verify `error_code`, `failed_at`, `last_deletion_error` are NULL after markDeleting |
| 3   | `NoSuchBucket` classified as FATAL         | Verify `classifyError` returns `FATAL` for `NoSuchBucket` S3 error                 |
| 4   | S3 delete uses bucket/key                  | Verify `deleteObject` is called with `{ bucket, key }` not `fileId`                |
| 5   | `hardDelete=false` logs at info level      | Verify log level is `info` (not `warn`) when hardDelete returns false              |
| 6   | GC selects correct files                   | Verify GC picks: clean + retryable after cooldown; never picks FATAL               |
| 7   | Workflow rejects FATAL files               | Verify workflow skips files with `deletion_error_code = 'FATAL'`                   |
| 8   | **Race: isDeletionLockValid=false**        | Workflow aborts when `isDeletionLockValid` returns false, logs reason              |
| 9   | **Race: restore detection (ACTIVE)**       | Workflow aborts when file state changed to ACTIVE, logs `state_changed:ACTIVE`     |
| 10  | **Race: row_missing detection**            | Workflow aborts when file already hard-deleted, logs `row_missing`                 |

```typescript
// Example test structure
describe("FileDeletion", () => {
  describe("CHECK constraints", () => {
    it("rejects error_code without failed_at", async () => {
      await expect(
        db.update(files).set({ deletionErrorCode: "RETRYABLE", failedAt: null })
      ).rejects.toThrow(/chk_error_fields_paired/);
    });

    it("rejects failed_at without error_code", async () => {
      await expect(
        db.update(files).set({ deletionErrorCode: null, failedAt: new Date() })
      ).rejects.toThrow(/chk_error_fields_paired/);
    });
  });

  describe("markDeleting", () => {
    it("clears all error attributes", async () => {
      // Setup: file with error
      await setupFileWithError(fileId, "RETRYABLE");

      // Act
      await repo.markDeleting(fileId);

      // Assert
      const file = await repo.findById(fileId);
      expect(file.deletionErrorCode).toBeNull();
      expect(file.failedAt).toBeNull();
      expect(file.lastDeletionError).toBeNull();
    });
  });

  describe("classifyError", () => {
    it("classifies NoSuchBucket as FATAL", () => {
      const error = new S3Error("NoSuchBucket", "Bucket does not exist");
      expect(classifyError(error)).toBe("FATAL");
    });
  });

  describe("S3 delete", () => {
    it("calls deleteObject with bucket and key", async () => {
      const spy = vi.spyOn(s3Client, "deleteObject");

      await workflow.run(fileId);

      expect(spy).toHaveBeenCalledWith({
        bucket: "test-bucket",
        key: "path/to/object.jpg"
      });
    });
  });

  describe("hardDelete race", () => {
    it("logs at info level when file already reset by GC", async () => {
      const infoSpy = vi.spyOn(logger, "info");

      // Simulate race: GC resets file from DELETING before hardDelete
      await repo.markDeleting(fileId);
      await repo.resetStuckDeleting({ stuckSince: new Date(0), limit: 1 });

      const result = await repo.hardDelete(fileId);

      expect(result).toBe(false);
      expect(infoSpy).toHaveBeenCalledWith(
        expect.objectContaining({ fileId }),
        expect.stringContaining("no longer in DELETING")
      );
    });
  });

  describe("GC file selection", () => {
    it("picks clean files past retention", async () => {
      await setupFile({ deletionState: "SOFT_DELETED", deletedAt: daysAgo(31) });

      const files = await repo.findSoftDeletedForGC({ cutoffDate: daysAgo(30) });

      expect(files).toHaveLength(1);
    });

    it("picks retryable files after cooldown", async () => {
      await setupFile({
        deletionState: "SOFT_DELETED",
        deletedAt: daysAgo(31),
        deletionErrorCode: "RETRYABLE",
        failedAt: hoursAgo(7)
      });

      const files = await repo.findSoftDeletedForGC({
        cutoffDate: daysAgo(30),
        errorCooldown: hoursAgo(6)
      });

      expect(files).toHaveLength(1);
    });

    it("never picks FATAL files", async () => {
      await setupFile({
        deletionState: "SOFT_DELETED",
        deletedAt: daysAgo(31),
        deletionErrorCode: "FATAL",
        failedAt: daysAgo(30)
      });

      const files = await repo.findSoftDeletedForGC({
        cutoffDate: daysAgo(30),
        errorCooldown: hoursAgo(6)
      });

      expect(files).toHaveLength(0);
    });
  });

  describe("workflow FATAL guard", () => {
    it("skips files with FATAL error", async () => {
      const debugSpy = vi.spyOn(logger, "debug");

      await setupFile({
        id: fileId,
        deletionState: "SOFT_DELETED",
        deletionErrorCode: "FATAL",
        failedAt: hoursAgo(1)
      });

      await workflow.run(fileId);

      // Should not call markDeleting
      expect(repo.markDeleting).not.toHaveBeenCalled();
      expect(debugSpy).toHaveBeenCalledWith(
        expect.stringContaining("FATAL error")
      );
    });
  });

  // ============================================================
  // RACE CONDITION TESTS (critical for data integrity!)
  // Uses proper mocking to verify actual workflow behavior
  // ============================================================

  describe("race: GC reset vs workflow S3 delete", () => {
    it("workflow aborts S3 delete when isDeletionLockValid returns false", async () => {
      const s3Spy = vi.spyOn(s3Client, "deleteObject");
      const hardDeleteSpy = vi.spyOn(repo, "hardDelete");
      const infoSpy = vi.spyOn(logger, "info");

      // Setup: file with S3 metadata
      await setupFile({ id: fileId, deletionState: "SOFT_DELETED" });
      await setupS3Object({ fileId, bucketId, objectKey: "test/file.jpg" });

      // Mock: markDeletingReturningStartedAt succeeds
      const fakeStartedAt = new Date("2024-01-01T12:00:00Z");
      vi.spyOn(repo, "markDeletingReturningStartedAt").mockResolvedValue({ startedAt: fakeStartedAt });

      // Mock: isDeletionLockValid returns FALSE (simulates GC reset during workflow)
      vi.spyOn(repo, "isDeletionLockValid").mockResolvedValue(false);

      // Mock: findAnyById returns SOFT_DELETED (for abort reason logging)
      vi.spyOn(repo.file, "findAnyById").mockResolvedValue({
        id: fileId, deletionState: "SOFT_DELETED"
      });

      // Act: run the actual workflow
      await workflow.run(fileId);

      // Assert: S3 delete was NOT called (race protection worked)
      expect(s3Spy).not.toHaveBeenCalled();

      // Assert: hardDelete was NOT called
      expect(hardDeleteSpy).not.toHaveBeenCalled();

      // Assert: logged with correct reason
      expect(infoSpy).toHaveBeenCalledWith(
        expect.objectContaining({ fileId, reason: "state_changed:SOFT_DELETED" }),
        expect.stringContaining("Lock lost")
      );
    });
  });

  describe("race: restore after GC reset is safe", () => {
    it("workflow aborts when file was restored (state=ACTIVE)", async () => {
      const s3Spy = vi.spyOn(s3Client, "deleteObject");
      const infoSpy = vi.spyOn(logger, "info");

      // Setup: file with S3 metadata
      await setupFile({ id: fileId, deletionState: "SOFT_DELETED" });
      await setupS3Object({ fileId, bucketId, objectKey: "test/file.jpg" });

      // Mock: markDeletingReturningStartedAt succeeds
      const fakeStartedAt = new Date("2024-01-01T12:00:00Z");
      vi.spyOn(repo, "markDeletingReturningStartedAt").mockResolvedValue({ startedAt: fakeStartedAt });

      // Mock: isDeletionLockValid returns FALSE
      vi.spyOn(repo, "isDeletionLockValid").mockResolvedValue(false);

      // Mock: file was restored while workflow was running
      vi.spyOn(repo.file, "findAnyById").mockResolvedValue({
        id: fileId, deletionState: "ACTIVE", deletedAt: null
      });

      // Act: run the actual workflow
      await workflow.run(fileId);

      // Assert: S3 delete was NOT called
      expect(s3Spy).not.toHaveBeenCalled();

      // Assert: logged with state_changed:ACTIVE reason
      expect(infoSpy).toHaveBeenCalledWith(
        expect.objectContaining({ fileId, reason: "state_changed:ACTIVE" }),
        expect.stringContaining("Lock lost")
      );
    });

    it("workflow aborts when file was hard-deleted by another worker", async () => {
      const s3Spy = vi.spyOn(s3Client, "deleteObject");
      const infoSpy = vi.spyOn(logger, "info");

      // Mock: markDeletingReturningStartedAt succeeds
      vi.spyOn(repo, "markDeletingReturningStartedAt").mockResolvedValue({ startedAt: new Date() });

      // Mock: isDeletionLockValid returns FALSE
      vi.spyOn(repo, "isDeletionLockValid").mockResolvedValue(false);

      // Mock: file no longer exists (already hard-deleted)
      vi.spyOn(repo.file, "findAnyById").mockResolvedValue(null);

      // Act
      await workflow.run(fileId);

      // Assert: S3 delete was NOT called
      expect(s3Spy).not.toHaveBeenCalled();

      // Assert: logged with row_missing reason
      expect(infoSpy).toHaveBeenCalledWith(
        expect.objectContaining({ fileId, reason: "row_missing" }),
        expect.stringContaining("Lock lost")
      );
    });
  });
});
```

---

## MVP Test Cases

### State transitions (only 3 states!)

- softDeleteIfEligible: ACTIVE → SOFT_DELETED, sets `deleted_at` = now().
- softDeleteIfEligible: SOFT_DELETED → no-op, does NOT update `deleted_at`.
- markDeleting: SOFT_DELETED → DELETING, sets `deleting_started_at`, **clears all error fields**.
- markDeleting: does NOT filter by error_code (workflow guard checks FATAL before calling).
- markDeleting: returns false if not SOFT_DELETED; logs debug.
- markErrorAndRollback: DELETING → SOFT_DELETED + sets error attributes atomically.
- markErrorAndRollback: invariant: `error_code IS NOT NULL ⇔ failed_at IS NOT NULL`.
- markErrorAndRollback: logs debug if rowCount=0 (GC already reset).
- hardDelete: returns true if deleted, false if not in DELETING; **logs `info` (not `warn`)** if false.
- restore: SOFT_DELETED → ACTIVE, clears ALL fields (deleted_at, errors, timestamps).
- restore: DELETING → FILE_BEING_DELETED error.
- restore: ACTIVE → INVALID_STATE error.

### GC workflow (only 2 phases!)

- Phase 1: reset stuck DELETING (loop with cap 10).
- Phase 2: pick SOFT_DELETED for hard delete (loop with cap 50).
- **Two-layer FATAL guard**: GC filters FATAL in findSoftDeletedForGC + workflow rejects FATAL.
- Skips files with FATAL error (admin must clear).
- Skips files with RETRYABLE error if `failed_at` within cooldown period.
- Includes files with NULL error_code (normal case).
- Selects SOFT_DELETED with `deleted_at < cutoff`, ORDER BY `(deleted_at, id)`.
- Starts up to 10 workflows in parallel per batch.

### Stuck recovery (with error marking!)

- resetStuckDeleting: DELETING where `deleting_started_at < 6hr ago` → SOFT_DELETED.
- Sets `deletion_error_code = 'RETRYABLE'`, `failed_at = now()`, `last_deletion_error = 'stuck deleting timeout'`.
- This prevents immediate ping-pong: file goes through cooldown before retry.
- Uses CTE for LIMIT in PostgreSQL.

### Repeated retries

- Each failed attempt **overwrites** error attributes (not appends).
- `deletion_error_code` can change: RETRYABLE → FATAL if error type changes.
- Previous error details lost; only `last_deletion_error` preserved.

### Error classification (only 2 codes!)

- S3 AccessDenied/InvalidAccessKeyId/SignatureDoesNotMatch/NoSuchBucket → `FATAL`.
- S3 transient errors (5xx, timeout, etc.) → `RETRYABLE`.
- Missing metadata → `FATAL`.
- RETRYABLE: auto-retry after cooldown.
- FATAL: requires admin `fileClearError` mutation.

### Field invariants (strict!)

- `deletion_error_code IS NOT NULL` ⇔ `failed_at IS NOT NULL` (always paired).
- `deletion_state = 'DELETING'` ⇒ all error fields NULL.
- `deletion_state = 'ACTIVE'` ⇒ all fields NULL.
- `deleted_at` set only once on first soft delete; never updated.

### API semantics

- fileDeleteMany.acceptedIds = files transitioned to SOFT_DELETED (idempotent).
- fileDeleteMany.startedHardDeleteIds = files for which hard delete workflow was actually started.
- fileDeleteMany does NOT update `deleted_at` for already SOFT_DELETED files.
- fileRestore works for SOFT_DELETED **even if it has error attributes** (clears them).
- fileClearError (admin): only allowed if SOFT_DELETED + error_code IS NOT NULL.
- All mutations return FILE_BEING_DELETED for DELETING state.

### Forbidden during DELETING

- fileRestore → FILE_BEING_DELETED
- fileDeleteMany → FILE_BEING_DELETED
- fileClearError → FILE_BEING_DELETED
- fileUpdate (metadata) → FILE_BEING_DELETED
