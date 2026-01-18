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
{
  service: "inventory",
  entityType: "variant",
  entityId: "<variant-uuid>",
  role: "gallery"           // always "gallery" for variant media
}
```

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

---

## Flow 1: Inventory → Media

### 1.1 VariantSetMediaScript

**When:** `variantSetMedia` mutation

**Logic:**
```typescript
async execute(params: VariantSetMediaParams): Promise<VariantSetMediaResult> {
  const { variantId, fileIds: newFileIds } = params;

  // 1. Validate variant exists
  const variant = await this.repository.variant.findById(variantId);
  if (!variant) throw NotFoundError;

  // 2. Get current media
  const currentMedia = await this.repository.media.getVariantMedia(variantId);
  const oldFileIds = currentMedia.map(m => m.fileId);

  // 3. Compute diff
  const toLink = newFileIds.filter(id => !oldFileIds.includes(id));
  const toUnlink = oldFileIds.filter(id => !newFileIds.includes(id));

  const entityRef = {
    service: "inventory",
    entityType: "variant",
    entityId: variantId,
  };

  // 4. Call Media broker (before DB update)
  if (toLink.length > 0) {
    await this.broker.call("media.fileLinkMany", {
      items: toLink.map(fileId => ({ fileId, role: "gallery" })),
      entityRef,
    });
  }

  if (toUnlink.length > 0) {
    await this.broker.call("media.fileUnlinkMany", {
      items: toUnlink.map(fileId => ({ fileId, role: "gallery" })),
      entityRef,
    });
  }

  // 5. Update local DB
  await this.repository.media.setVariantMedia(variantId, newFileIds);

  return { variant, userErrors: [] };
}
```

**Order of operations:**
1. Broker calls BEFORE local DB update
2. If broker fails — operation rolls back, variant_media unchanged
3. If local DB fails after broker — inconsistency (acceptably rare)

### 1.2 VariantDeleteScript (hard delete only)

**When:** `variantDelete(permanent: true)` mutation

**Logic:**
```typescript
async execute(params: VariantDeleteParams): Promise<VariantDeleteResult> {
  const { id, permanent } = params;

  const variant = await this.repository.variant.findById(id);
  if (!variant) throw NotFoundError;

  if (permanent) {
    // 1. Notify Media before delete
    const entityRef = {
      service: "inventory",
      entityType: "variant",
      entityId: id,
    };

    await this.broker.call("media.entityDeleted", { entityRef });

    // 2. Hard delete (cascades variant_media)
    await this.repository.variant.hardDelete(id);
  } else {
    // Soft delete: do nothing with Media
    await this.repository.variant.softDelete(id);
  }

  return { deletedId: id };
}
```

**Soft delete:** don't call `entityDeleted` — files remain linked, variant can be restored.

---

## Flow 2: Media → Inventory

### 2.1 File Soft Delete → Cleanup variant_media

**When:** user deletes file in Media UI

**Approach:** Media calls Inventory broker action to cleanup `variant_media`

**Media side:**
```typescript
// services/media/src/scripts/file/FileDeleteScript.ts

async execute(params: FileDeleteParams): Promise<FileDeleteResult> {
  const { fileId } = params;

  // 1. Soft delete file
  await this.repository.file.softDelete(fileId);

  // 2. Notify consumers to cleanup references (best-effort)
  try {
    await this.broker.call("inventory.fileDeleted", { fileId });
  } catch (error) {
    // Log but don't fail — file is already deleted
    this.logger.warn({ fileId, error }, "Failed to notify inventory about file deletion");
  }

  return { success: true };
}
```

**Inventory side — new broker action:**
```typescript
// services/inventory/src/InventoryBrokerActions.ts

@Action("fileDeleted")
async fileDeleted(params: FileDeletedParams): Promise<FileDeletedResult> {
  return this.kernel.runScript(FileDeletedScript, params);
}
```

```typescript
// services/inventory/src/scripts/media/FileDeletedScript.ts

interface FileDeletedParams {
  fileId: string;
}

interface FileDeletedResult {
  deletedCount: number;
}

async execute(params: FileDeletedParams): Promise<FileDeletedResult> {
  const { fileId } = params;

  const deletedCount = await this.repository.media.removeByFileId(fileId);

  this.logger.info({ fileId, deletedCount }, "Cleaned up variant_media for deleted file");

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

### 2.2 Graceful UI Handling

If broker call fails, UI should gracefully handle missing File:

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

**Federation gateway:** if File not found, returns `null` for that item.

**UI:** shows placeholder or filters out null items.

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

#### inventory.fileDeleted

New action to cleanup variant_media when file is deleted:

```typescript
// services/inventory/src/InventoryBrokerActions.ts

@Action("fileDeleted")
async fileDeleted(params: FileDeletedParams): Promise<FileDeletedResult> {
  return this.kernel.runScript(FileDeletedScript, params);
}
```

---

## Implementation Order

### Phase 1: Media Service — BackRefs
1. Create `file_back_refs` table (see `media-backrefs-plan.md`)
2. Create `FileBackRefRepository`
3. Create scripts: `FileLinkScript`, `FileUnlinkScript`, `FileLinkManyScript`, `FileUnlinkManyScript`, `EntityDeletedScript`
4. Add broker actions to `MediaBrokerActions`

### Phase 2: Inventory Service — Integration
1. Add `removeByFileId` to MediaRepository
2. Create `FileDeletedScript` + broker action
3. Update `VariantSetMediaScript` with broker calls
4. Update `VariantDeleteScript` with entityDeleted call

### Phase 3: Media Service — Notify Inventory
1. Update `FileDeleteScript` — call `inventory.fileDeleted`

### Phase 4: Testing
1. Unit tests for new scripts
2. Integration tests for broker calls
3. E2E test: delete file in Media → verify variant_media cleanup

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
| Update | `services/media/src/MediaBrokerActions.ts` — add backRef actions |
| Update | `services/media/src/scripts/file/FileDeleteScript.ts` — call inventory.fileDeleted |

### Inventory Service

| Action | File |
|--------|------|
| Create | `services/inventory/src/scripts/media/FileDeletedScript.ts` |
| Update | `services/inventory/src/InventoryBrokerActions.ts` — add fileDeleted |
| Update | `services/inventory/src/repositories/media/MediaRepository.ts` — add removeByFileId |
| Update | `services/inventory/src/scripts/variant/VariantSetMediaScript.ts` — add broker calls |
| Update | `services/inventory/src/scripts/variant/VariantDeleteScript.ts` — add entityDeleted |

---

## Sequence Diagrams

### Set Variant Media

```
User                Inventory               Media
 │                      │                      │
 │──variantSetMedia────▶│                      │
 │                      │                      │
 │                      │──media.fileLinkMany─▶│
 │                      │◀─────────────────────│
 │                      │                      │
 │                      │──media.fileUnlinkMany▶│
 │                      │◀─────────────────────│
 │                      │                      │
 │                      │ UPDATE variant_media │
 │                      │                      │
 │◀─────result──────────│                      │
```

### Delete File in Media

```
User                Media                  Inventory
 │                      │                      │
 │──deleteFile─────────▶│                      │
 │                      │                      │
 │                      │ SET deletedAt        │
 │                      │                      │
 │                      │──inventory.fileDeleted▶│
 │                      │◀─────────────────────│
 │                      │                      │ DELETE variant_media
 │◀─────result──────────│                      │ WHERE file_id = ?
```

### Delete Variant (hard)

```
User                Inventory               Media
 │                      │                      │
 │──variantDelete──────▶│                      │
 │   (permanent=true)   │                      │
 │                      │                      │
 │                      │──media.entityDeleted─▶│
 │                      │◀─────────────────────│
 │                      │                      │
 │                      │ DELETE variant       │
 │                      │ (cascades media)     │
 │                      │                      │
 │◀─────result──────────│                      │
```

---

## Summary

| Direction | Trigger | Broker Call | Purpose |
|-----------|---------|-------------|---------|
| Inventory → Media | Set variant media | `media.fileLinkMany` | Track new file refs |
| Inventory → Media | Set variant media | `media.fileUnlinkMany` | Remove old file refs |
| Inventory → Media | Hard delete variant | `media.entityDeleted` | Remove all refs for entity |
| Media → Inventory | Soft delete file | `inventory.fileDeleted` | Cleanup variant_media |
