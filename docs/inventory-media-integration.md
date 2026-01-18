# Inventory ↔ Media Integration Plan

## Overview

Integration between Inventory and Media services for:
1. **Inventory → Media**: notify about file link/unlink when variant media changes
2. **Media → Inventory**: cleanup `variant_media` when files are deleted

**Architecture:** DBOS workflows + synchronous broker calls (no RabbitMQ events)

---

## Current State

### Inventory Service

**Table `variant_media`:**
```typescript
{
  projectId: uuid,
  variantId: uuid,       // FK → variant.id (CASCADE)
  fileId: uuid,          // NO FK to Media (loose coupling)
  sortIndex: integer,
}
```

**Key files:**
- `services/inventory/src/repositories/models/media.ts` — schema
- `services/inventory/src/repositories/media/MediaRepository.ts` — repository
- `services/inventory/src/scripts/variant/VariantSetMediaScript.ts` — set media
- `services/inventory/src/scripts/variant/VariantDeleteScript.ts` — delete variant

### Media Service

**BackRefs system** (see `docs/media-backrefs-plan.md`):
- Table `file_back_refs` for tracking file usage
- Broker actions: `fileLink`, `fileUnlink`, `fileLinkMany`, `entityDeleted`

---

## Integration Design

### EntityRef Format

```typescript
// EntityRef identifies the entity (WHO is linking)
interface EntityRef {
  service: string;      // "inventory"
  entityType: string;   // "variant"
  entityId: string;     // "<variant-uuid>"
}

// FileLinkItem describes the link (WHAT file and HOW it's used)
interface FileLinkItem {
  fileId: string;
  role: string;         // "gallery", "main", "avatar", etc.
}
```

**Separation of concerns:**
- `EntityRef` = "какая сущность" (who)
- `item.role` = "как использует файл" (how)

### Error Handling Strategy

**Idempotent operations** (success: true):
- File linked/unlinked successfully
- File not found (INFO log)
- File soft-deleted (INFO log)
- Already linked/unlinked

**Blocking errors** (throw, retry):
- Network/broker timeout
- Internal DB error in Media
- Validation error (bad entityRef format)

**DBOS provides automatic retry** — broker calls inside `@DBOS.step()` will be retried on transient failures.

**Retryable errors** (DBOS will retry):
- Network timeout
- 5xx responses
- Connection refused

**Non-retryable errors** (fail immediately):
- 4xx responses (validation, not found)
- Schema validation errors

---

## Flow 1: Inventory → Media

### 1.1 VariantSetMediaScript + BackRefNotifyWorkflow

**When:** `variantSetMedia` mutation

**Architecture:**
- Script handles sync business logic (DB update)
- Workflow handles async notification (DBOS durability + retries)

**Script (sync):**
```typescript
// services/inventory/src/scripts/variant/VariantSetMediaScript.ts

async execute(params: VariantSetMediaParams): Promise<VariantSetMediaResult> {
  const { variantId, fileIds: newFileIds } = params;

  // 1. Validate variant exists
  const variant = await this.repository.variant.findById(variantId);
  if (!variant) throw NotFoundError;

  // 2. Get current media
  const currentMedia = await this.repository.media.getVariantMedia(variantId);
  const oldFileIds = currentMedia.map(m => m.fileId);

  // 3. Compute diff (O(n) with Set)
  const oldSet = new Set(oldFileIds);
  const newSet = new Set(newFileIds);
  const toLink = newFileIds.filter(id => !oldSet.has(id));
  const toUnlink = oldFileIds.filter(id => !newSet.has(id));

  // 4. Update local DB (sync, source of truth)
  await this.repository.media.setVariantMedia(variantId, newFileIds);

  // 5. Start background workflow for Media notification (async, durable)
  if (toLink.length > 0 || toUnlink.length > 0) {
    const workflow = this.workflow.get<BackRefNotifyWorkflow>("backRefNotify");
    await DBOS.startWorkflow(workflow).run({
      entityRef: {
        service: "inventory",
        entityType: "variant",
        entityId: variantId,
      },
      toLink: toLink.map(fileId => ({ fileId, role: "gallery" })),
      toUnlink: toUnlink.map(fileId => ({ fileId, role: "gallery" })),
    });
  }

  return { variant, userErrors: [] };
}
```

**Workflow (async, durable):**
```typescript
// services/inventory/src/workflows/BackRefNotifyWorkflow.ts

export interface BackRefNotifyInput {
  entityRef: EntityRef;
  toLink: Array<{ fileId: string; role: string }>;
  toUnlink: Array<{ fileId: string; role: string }>;
}

export class BackRefNotifyWorkflow extends BaseWorkflow {

  @DBOS.workflow()
  async run(input: BackRefNotifyInput): Promise<void> {
    const { entityRef, toLink, toUnlink } = input;

    if (toLink.length > 0) {
      await this.linkFiles(toLink, entityRef);
    }

    if (toUnlink.length > 0) {
      await this.unlinkFiles(toUnlink, entityRef);
    }
  }

  @DBOS.step()
  async linkFiles(items: Array<{ fileId: string; role: string }>, entityRef: EntityRef): Promise<void> {
    const result = await this.broker.call("media.fileLinkMany", { items, entityRef });
    // Log result but don't throw — best-effort tracking
    this.logger.info({ linkedCount: result.linkedCount }, "BackRef link completed");
  }

  @DBOS.step()
  async unlinkFiles(items: Array<{ fileId: string; role: string }>, entityRef: EntityRef): Promise<void> {
    const result = await this.broker.call("media.fileUnlinkMany", { items, entityRef });
    this.logger.info({ unlinkedCount: result.unlinkedCount }, "BackRef unlink completed");
  }
}
```

**Order of operations:**
1. Script updates `variant_media` (sync, source of truth)
2. Script starts `BackRefNotifyWorkflow` in background
3. Mutation returns immediately — user sees success
4. Workflow runs async with DBOS durability:
   - If Media unavailable → DBOS retries with backoff
   - Steps are persisted → survives service restart
   - Eventually consistent backRefs

### 1.1.1 Alternative: Reset + Relink (simpler, race-safe)

Instead of computing diff, simpler approach for eventually consistent tracking:

```typescript
// BackRefNotifyWorkflow — simpler version

@DBOS.workflow()
async run(input: BackRefResetInput): Promise<void> {
  const { entityRef, newFileIds } = input;

  // Step 1: Clear all existing backRefs for this entity
  await this.clearBackRefs(entityRef);

  // Step 2: Link all current files
  if (newFileIds.length > 0) {
    await this.linkFiles(newFileIds, entityRef);
  }
}

@DBOS.step()
async clearBackRefs(entityRef: EntityRef): Promise<void> {
  await this.broker.call("media.entityDeleted", { entityRef });
}

@DBOS.step()
async linkFiles(fileIds: string[], entityRef: EntityRef): Promise<void> {
  const items = fileIds.map(fileId => ({ fileId, role: "gallery" }));
  await this.broker.call("media.fileLinkMany", { items, entityRef });
}
```

**Pros:**
- No diff calculation
- Race-safe: concurrent updates don't corrupt backRefs
- Simpler to reason about

**Cons:**
- More broker calls (always 2 calls vs 0-2 with diff)
- entityDeleted + linkMany not atomic (brief window with 0 refs)

**Recommendation:** Start with reset+relink, optimize to diff later if needed.

### 1.2 VariantDeleteScript (hard delete only)

**When:** `variantDelete(permanent: true)` mutation

**Architecture:**
- Script handles hard delete synchronously
- Background workflow notifies Media about entity deletion

**Logic:**
```typescript
// services/inventory/src/scripts/variant/VariantDeleteScript.ts

async execute(params: VariantDeleteParams): Promise<VariantDeleteResult> {
  const { id, permanent } = params;

  const variant = await this.repository.variant.findById(id);
  if (!variant) throw NotFoundError;

  if (permanent) {
    // 1. Hard delete first (cascades variant_media)
    await this.repository.variant.hardDelete(id);

    // 2. Start background workflow to notify Media
    const workflow = this.workflow.get<EntityDeletedNotifyWorkflow>("entityDeletedNotify");
    await DBOS.startWorkflow(workflow).run({
      entityRef: {
        service: "inventory",
        entityType: "variant",
        entityId: id,
      },
    });
  } else {
    // Soft delete: do nothing with Media
    await this.repository.variant.softDelete(id);
  }

  return { deletedId: id };
}
```

**Workflow:**
```typescript
// services/inventory/src/workflows/EntityDeletedNotifyWorkflow.ts

export class EntityDeletedNotifyWorkflow extends BaseWorkflow {

  @DBOS.workflow()
  async run(input: { entityRef: EntityRef }): Promise<void> {
    await this.notifyMedia(input.entityRef);
  }

  @DBOS.step()
  async notifyMedia(entityRef: EntityRef): Promise<void> {
    const result = await this.broker.call("media.entityDeleted", { entityRef });
    this.logger.info({ unlinkedCount: result.unlinkedCount }, "Entity deleted notification sent");
  }
}
```

**Soft delete:** don't call `entityDeleted` — files remain linked, variant can be restored.

---

## Flow 2: Media → Inventory

### 2.1 File Lifecycle & Cleanup

**Important:** Don't cleanup `variant_media` on soft-delete!

| File State | variant_media | UI Behavior | Rationale |
|------------|---------------|-------------|-----------|
| Active | kept | shows normally | — |
| Soft-deleted | **kept** | File resolves to null, UI shows placeholder | file can be restored, retention period |
| Hard-deleted (GC) | **cleaned up** | rows removed | file is permanently gone |

**Why not cleanup on soft-delete:**
- Soft-delete is reversible (admin can restore file)
- Retention period exists (30 days before GC)
- Cleaning up immediately breaks undo capability
- BackRefs remain anyway, so inventory should too

### 2.2 Hard Delete (GC) → Cleanup variant_media

**When:** GC workflow hard-deletes file after retention period

**Solution: Two separate DBOS workflows (no outbox needed)**

DBOS provides built-in retry policy for steps:
- `retriesAllowed: true`
- `maxAttempts: number`
- `intervalSeconds: number` (base interval)
- `backoffRate: number` (exponential multiplier)
- When exhausted → throws `DBOSMaxStepRetriesError`

**Architecture:**
1. `FileHardDeleteWorkflow` — handles S3 + DB deletion, then starts cleanup workflow
2. `FileDeleteCleanupWorkflow` — handles consumer notifications with retries

This separation ensures GC doesn't hang waiting for inventory.

#### 2.2.1 FileHardDeleteWorkflow (updated)

```typescript
// services/media/src/workflows/FileHardDeleteWorkflow.ts

@DBOS.workflow()
async run(fileId: string): Promise<void> {
  // ... existing logic: fetch file, verify state, lock ...

  // Step 1: Delete from S3
  await this.deleteFromS3(fileId, file.s3Key);

  // Step 2: Hard delete from DB
  await this.hardDeleteFromDb(fileId);

  // Step 3: Start cleanup workflow (fire-and-forget, durable)
  await this.startCleanupWorkflow(fileId);
}

@DBOS.step()
async startCleanupWorkflow(fileId: string): Promise<void> {
  const workflow = this.workflow.get<FileDeleteCleanupWorkflow>("fileDeleteCleanup");
  // Deterministic ID for deduplication
  await DBOS.startWorkflow(workflow, {
    workflowID: FileDeleteCleanupWorkflow.workflowID(fileId)
  }).run(fileId);
}
```

#### 2.2.2 FileDeleteCleanupWorkflow (new)

```typescript
// services/media/src/workflows/FileDeleteCleanupWorkflow.ts

export class FileDeleteCleanupWorkflow extends BaseWorkflow {

  /**
   * Deterministic workflow ID for deduplication.
   * Same fileId always gets same workflow ID → prevents duplicates.
   */
  static workflowID(fileId: string): string {
    return `file:cleanup:${fileId}`;
  }

  @DBOS.workflow()
  async run(fileId: string): Promise<void> {
    try {
      await this.notifyInventory(fileId);
    } catch (error) {
      if (error instanceof DBOSMaxStepRetriesError) {
        // All retries exhausted → log alert, workflow completes
        await this.markNeedsAttention(fileId, error);
        return;
      }
      throw error;
    }
  }

  /**
   * Step with automatic retry policy.
   * DBOS will retry on transient errors with exponential backoff.
   * Don't catch errors here — let DBOS handle retries.
   */
  @DBOS.step({
    retriesAllowed: true,
    maxAttempts: 10,
    intervalSeconds: 60,      // Start with 1 minute
    backoffRate: 2,           // 1m, 2m, 4m, 8m, 16m, 32m, 64m...
  })
  async notifyInventory(fileId: string): Promise<void> {
    const result = await this.broker.call("inventory.fileHardDeleted", { fileId });
    this.logger.info({ fileId, deletedCount: result.deletedCount }, "Inventory notified");
    // Don't catch errors — DBOS will retry transient failures
  }

  @DBOS.step()
  async markNeedsAttention(fileId: string, error: Error): Promise<void> {
    this.logger.error(
      { fileId, error: error.message },
      "File cleanup failed after max retries, needs manual attention"
    );
    // Optional: write to alerts table, send to monitoring, etc.
  }
}
```

**Guarantees:**
- Cleanup workflow is durable — survives service restarts
- Deterministic workflow ID prevents duplicate cleanup attempts
- Exponential backoff: 1m → 2m → 4m → ... up to ~17 hours total retry window
- After 10 attempts → logs alert, workflow completes (doesn't hang forever)
- GC workflow completes immediately after starting cleanup (no blocking)

**Inventory side — new broker action:**
```typescript
// services/inventory/src/InventoryBrokerActions.ts

@Action("fileHardDeleted")
async fileHardDeleted(params: FileHardDeletedParams): Promise<FileHardDeletedResult> {
  return this.kernel.runScript(FileHardDeletedScript, params);
}
```

```typescript
// services/inventory/src/scripts/media/FileHardDeletedScript.ts

interface FileHardDeletedParams {
  fileId: string;
}

interface FileHardDeletedResult {
  deletedCount: number;
}

async execute(params: FileHardDeletedParams): Promise<FileHardDeletedResult> {
  const { fileId } = params;

  // Just cleanup, do NOT call back to media (avoid cycles)
  const deletedCount = await this.repository.media.removeByFileId(fileId);

  this.logger.info({ fileId, deletedCount }, "Cleaned up variant_media for hard-deleted file");

  return { deletedCount };
}
```

**New method in MediaRepository:**
```typescript
// services/inventory/src/repositories/media/MediaRepository.ts

async removeByFileId(fileId: string): Promise<number> {
  const result = await this.db
    .delete(variantMedia)
    .where(eq(variantMedia.fileId, fileId));

  return result.rowCount ?? 0;
}
```

### 2.3 Graceful UI Handling (during soft-delete period)

While file is soft-deleted (before GC), `variant_media` still exists but File won't resolve:

```typescript
// GraphQL resolver
async media(): Promise<VariantMediaItem[]> {
  const mediaItems = await this.$ctx.loaders.variantMedia.load(this.$props);

  return mediaItems.map((m) => ({
    file: { __typename: "File", id: m.fileId },  // Federation resolves
    sortIndex: m.sortIndex,
  }));
}
```

**Federation gateway:** if File soft-deleted or not found, returns `null`.

**UI behavior:**
- Shows placeholder for missing files
- Or filters out null items from gallery
- User sees "some images unavailable" if needed

---

## New Broker Actions Required

### Media Service

#### media.fileUnlinkMany

Symmetric action for batch unlink:

```typescript
// services/media/src/scripts/backRef/FileUnlinkManyScript.ts

interface FileUnlinkManyParams {
  items: Array<{ fileId: string; role: string }>;
  entityRef: EntityRef;
}

interface FileUnlinkManyResult {
  unlinkedCount: number;   // successfully unlinked
  skippedCount: number;    // file not found or already unlinked
}
```

**Add to MediaBrokerActions:**
```typescript
@Action("fileUnlinkMany")
async fileUnlinkMany(params: FileUnlinkManyParams): Promise<FileUnlinkManyResult> {
  return this.kernel.runScript(FileUnlinkManyScript, params);
}
```

### Inventory Service

#### inventory.fileHardDeleted

New action to cleanup variant_media when file is permanently deleted by GC:

```typescript
// services/inventory/src/InventoryBrokerActions.ts

@Action("fileHardDeleted")
async fileHardDeleted(params: FileHardDeletedParams): Promise<FileHardDeletedResult> {
  return this.kernel.runScript(FileHardDeletedScript, params);
}
```

**Important:** This script must NOT call back to media (no unlink calls) — just cleanup local data.

---

## Implementation Order

### Phase 1: Media Service — BackRefs
1. Create `file_back_refs` table (see `media-backrefs-plan.md`)
2. Create `FileBackRefRepository`
3. Create scripts: `FileLinkScript`, `FileUnlinkScript`, `FileLinkManyScript`, `FileUnlinkManyScript`, `EntityDeletedScript`
4. Add broker actions to `MediaBrokerActions`

### Phase 2: Inventory Service — Integration
1. Add `removeByFileId` to MediaRepository
2. Create `FileHardDeletedScript` + broker action
3. Update `VariantSetMediaScript` with broker calls (DB first, then notify)
4. Update `VariantDeleteScript` with entityDeleted call

### Phase 3: Media Service — GC Notification
1. Update `FileHardDeleteWorkflow` — call `inventory.fileHardDeleted` after hard delete

### Phase 4: Testing
1. Unit tests for new scripts
2. Integration tests for broker calls
3. E2E test: GC hard-delete file → verify variant_media cleanup

---

## Files to Modify/Create

### Media Service

| Action | File |
|--------|------|
| Create | `services/media/src/repositories/models/fileBackRefs.ts` |
| Create | `services/media/src/repositories/FileBackRefRepository.ts` |
| Create | `services/media/src/scripts/backRef/FileLinkScript.ts` |
| Create | `services/media/src/scripts/backRef/FileUnlinkScript.ts` |
| Create | `services/media/src/scripts/backRef/FileLinkManyScript.ts` |
| Create | `services/media/src/scripts/backRef/FileUnlinkManyScript.ts` |
| Create | `services/media/src/scripts/backRef/EntityDeletedScript.ts` |
| Create | `services/media/src/workflows/FileDeleteCleanupWorkflow.ts` |
| Update | `services/media/src/MediaBrokerActions.ts` — add backRef actions |
| Update | `services/media/src/workflows/FileHardDeleteWorkflow.ts` — start cleanup workflow |
| Update | `services/media/src/media.nest-service.ts` — register FileDeleteCleanupWorkflow |

### Inventory Service

| Action | File |
|--------|------|
| Create | `services/inventory/src/workflows/BackRefNotifyWorkflow.ts` |
| Create | `services/inventory/src/workflows/EntityDeletedNotifyWorkflow.ts` |
| Create | `services/inventory/src/scripts/media/FileHardDeletedScript.ts` |
| Update | `services/inventory/src/InventoryBrokerActions.ts` — add fileHardDeleted |
| Update | `services/inventory/src/repositories/media/MediaRepository.ts` — add removeByFileId |
| Update | `services/inventory/src/scripts/variant/VariantSetMediaScript.ts` — start BackRefNotifyWorkflow |
| Update | `services/inventory/src/scripts/variant/VariantDeleteScript.ts` — start EntityDeletedNotifyWorkflow |
| Update | `services/inventory/src/inventory.nest-service.ts` — register workflows |

---

## Sequence Diagrams

### Set Variant Media

```
User                Inventory               Media             DBOS
 │                      │                      │                │
 │──variantSetMedia────▶│                      │                │
 │                      │                      │                │
 │                      │ UPDATE variant_media │                │
 │                      │ (sync)               │                │
 │                      │                      │                │
 │                      │──startWorkflow──────────────────────▶│
 │                      │                      │                │ (async)
 │◀─────result──────────│                      │                │
 │                      │                      │                │
 │                      │                      │◀───linkFiles───│
 │                      │                      │───result──────▶│
 │                      │                      │                │
 │                      │                      │◀──unlinkFiles──│
 │                      │                      │───result──────▶│
```

### Soft Delete File in Media (no cleanup)

```
User                Media                  Inventory
 │                      │                      │
 │──deleteFile─────────▶│                      │
 │                      │                      │
 │                      │ SET deletedAt        │
 │                      │ (soft delete)        │
 │                      │                      │
 │◀─────result──────────│                      │
 │                      │                      │
 │  (variant_media kept, File resolves to null in UI)
```

### Hard Delete File (GC) → Cleanup (with separate DBOS workflow)

```
GC Scheduler        FileHardDelete         FileDeleteCleanup       Inventory
 │                   Workflow               Workflow                  │
 │                      │                      │                      │
 │──start──────────────▶│                      │                      │
 │                      │                      │                      │
 │                      │ DELETE from S3       │                      │
 │                      │ DELETE from DB       │                      │
 │                      │                      │                      │
 │                      │──startWorkflow──────▶│                      │
 │                      │  (fire-and-forget)   │                      │
 │◀─────done────────────│                      │                      │
 │                      │                      │                      │
 │                      │                      │──fileHardDeleted────▶│
 │                      │                      │◀──────(success)──────│
 │                      │                      │                      │ DELETE variant_media
 │                      │                      │ done                 │
 │                      │                      │                      │
 ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ if delivery failed, DBOS auto-retries ─ ─ ─ ─
 │                      │                      │                      │
 │                      │                      │──fileHardDeleted────▶│
 │                      │                      │  (retry #2, backoff) │
 │                      │                      │◀──────(success)──────│
 │                      │                      │ done                 │
```

### Delete Variant (hard)

```
User                Inventory               Media             DBOS
 │                      │                      │                │
 │──variantDelete──────▶│                      │                │
 │   (permanent=true)   │                      │                │
 │                      │                      │                │
 │                      │ DELETE variant       │                │
 │                      │ (cascades media)     │                │
 │                      │                      │                │
 │                      │──startWorkflow──────────────────────▶│
 │                      │                      │                │ (async)
 │◀─────result──────────│                      │                │
 │                      │                      │                │
 │                      │                      │◀─entityDeleted─│
 │                      │                      │───result──────▶│
```

---

## Summary

| Direction | Trigger | Broker Call | Delivery |
|-----------|---------|-------------|----------|
| Inventory → Media | Set variant media | `media.entityDeleted` + `media.fileLinkMany` | DBOS workflow (async) |
| Inventory → Media | Hard delete variant | `media.entityDeleted` | DBOS workflow (async) |
| Media → Inventory | Hard delete (GC) | `inventory.fileHardDeleted` | DBOS workflow with step retries |

**Key guarantees:**
- **DBOS durability**: All workflows survive service restarts
- **Automatic retries**: `@DBOS.step({ retriesAllowed: true, maxAttempts: 10, backoffRate: 2 })`
- **Deduplication**: Deterministic workflow IDs prevent duplicate processing
- **Bounded retries**: After max attempts → `DBOSMaxStepRetriesError` → alert, workflow completes
- **All operations idempotent** — safe to retry

**No outbox needed** — DBOS workflows provide durability + retries out of the box.

**Note:** Soft delete does NOT trigger cleanup — file can be restored during retention period.

Sources:
- [DBOS Steps Documentation](https://docs.dbos.dev/typescript/tutorials/step-tutorial)
- [DBOS Workflows Reference](https://docs.dbos.dev/typescript/reference/workflows-steps)
