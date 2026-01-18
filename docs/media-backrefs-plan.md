# Media Service BackRefs Implementation Plan

## Overview

Implement back-references tracking in the media service to:
1. Track which entities (variants, users, orgs) reference each file
2. Display usage info in UI
3. Enable immediate hard-delete when backRefs=0
4. Broadcast `file.deleted` events for consuming services

**Design Decisions:**
- Entity-level tracking: `inventory:variant:uuid123`
- Delete + notify async: delete immediately, broadcast event
- Immediate deletion when backRefs=0 (no 30-day retention)

---

## Phase 1: Database Schema

### 1.1 Create `file_back_refs` table

**File:** `services/media/src/repositories/models/fileBackRefs.ts`

```typescript
export const fileBackRefs = mediaSchema.table(
  "file_back_refs",
  {
    fileId: uuid("file_id")
      .notNull()
      .references(() => files.id, { onDelete: "cascade" }),
    entityRef: varchar("entity_ref", { length: 512 }).notNull(),  // "service:entity:id"
    service: varchar("service", { length: 64 }).notNull(),
    entityType: varchar("entity_type", { length: 64 }).notNull(),
    entityId: uuid("entity_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.fileId, table.entityRef] }),
    index("idx_fbr_file_id").on(table.fileId),
    index("idx_fbr_entity_ref").on(table.entityRef),
    index("idx_fbr_service").on(table.service),
    index("idx_fbr_entity_id").on(table.entityId),
  ]
);
```

**Files to modify:**
- Create: `services/media/src/repositories/models/fileBackRefs.ts`
- Update: `services/media/src/repositories/models/index.ts` (add export)
- Run: `shopana db:generate --service media`

---

## Phase 2: Repository Layer

### 2.1 Create `FileBackRefRepository`

**File:** `services/media/src/repositories/FileBackRefRepository.ts`

Key methods:
- `link(fileId, entityRef)` - idempotent (ON CONFLICT DO NOTHING)
- `linkMany(fileIds, entityRef)` - batch link
- `unlink(fileId, entityRef)` - returns `{ deleted, remainingCount }`
- `unlinkAllByEntity(entityRef)` - returns fileIds with 0 refs
- `countByFileId(fileId)` - single file count
- `countByFileIds(fileIds)` - batch counts (for GC)
- `findByFileId(fileId)` - get all refs for UI

**Files to modify:**
- Create: `services/media/src/repositories/FileBackRefRepository.ts`
- Update: `services/media/src/repositories/Repository.ts` (add instance)

---

## Phase 3: Broker Actions (Link/Unlink API)

### 3.1 DTOs

**File:** `services/media/src/scripts/backRef/dto/index.ts`

```typescript
export interface FileLinkParams {
  fileId: string;
  entityRef: { service: string; entityType: string; entityId: string };
}

export interface FileUnlinkParams {
  fileId: string;
  entityRef: { service: string; entityType: string; entityId: string };
}

export interface FileUnlinkResult {
  success: boolean;
  refCount: number;
  deleted: boolean;  // true if hard-deleted
}

export interface EntityDeletedParams {
  entityRef: { service: string; entityType: string; entityId: string };
}

export interface EntityDeletedResult {
  unlinkedCount: number;
  deletedFileIds: string[];
}
```

### 3.2 Scripts

**Files to create:**
- `services/media/src/scripts/backRef/FileLinkScript.ts`
- `services/media/src/scripts/backRef/FileUnlinkScript.ts` (triggers hard-delete if refCount=0)
- `services/media/src/scripts/backRef/FileLinkManyScript.ts`
- `services/media/src/scripts/backRef/EntityDeletedScript.ts`

### 3.3 Broker Actions

**File:** `services/media/src/MediaBrokerActions.ts`

Add actions:
```typescript
@Action("fileLink")        // Link file to entity
@Action("fileUnlink")      // Unlink, hard-delete if refCount=0
@Action("fileLinkMany")    // Batch link
@Action("entityDeleted")   // Unlink all files from entity
```

---

## Phase 4: GC Modifications

### 4.1 Update `FileGarbageCollectorWorkflow`

**File:** `services/media/src/workflows/FileGarbageCollectorWorkflow.ts`

Modify Phase 2 to filter out files with backRefs > 0:

```typescript
const batch = await fileDeletionStateRepo.findSoftDeletedForGC({...});
const fileIds = batch.map((s) => s.fileId);
const backRefCounts = await this.repository.fileBackRef.countByFileIds(fileIds);
const eligibleForDeletion = batch.filter(
  (s) => (backRefCounts.get(s.fileId) ?? 0) === 0
);
```

---

## Phase 5: Event Broadcasting

### 5.1 Add `file.deleted` event

**File:** `services/media/src/workflows/FileHardDeleteWorkflow.ts`

After successful hard-delete, emit event:
```typescript
await broker.emit("file.deleted", { fileId, deletedAt });
```

**File:** `services/media/src/scripts/backRef/FileUnlinkScript.ts`

When triggering immediate hard-delete (refCount=0), also emit event.

---

## Phase 6: GraphQL Extensions

### 6.1 Update schema

**File:** `services/media/src/api/graphql-admin/file.graphql`

```graphql
type FileBackRef {
  entityRef: String!
  service: String!
  entityType: String!
  entityId: ID!
  createdAt: DateTime!
}

type FileBackRefsSummary {
  totalCount: Int!
  refs: [FileBackRef!]!
}

extend type File {
  backRefs: FileBackRefsSummary!
}
```

### 6.2 Update resolver

**File:** `services/media/src/resolvers/admin/FileResolver.ts`

Add `backRefs` field resolver.

### 6.3 DataLoader (optional optimization)

**File:** `services/media/src/loaders/FileBackRefLoader.ts`

Batch load backRef counts for list views.

---

## Phase 7: Consumer Services Integration

### 7.1 Inventory Service

**Files to modify:**

1. Update `VariantSetMediaScript` to call link/unlink:
   - `services/inventory/src/scripts/media/VariantSetMediaScript.ts`

2. Call `media.entityDeleted` when variant is deleted

3. Add event handler for `file.deleted`:
   - Create: `services/inventory/src/events/MediaEventsHandler.ts`

### 7.2 IAM Service

**Files to modify:**

1. Update user avatar/org logo mutations to call link/unlink
2. Call `media.entityDeleted` when user/org is deleted

---

## Phase 8: Migration (backfill existing refs)

### 8.1 Inventory variant_media backfill

Create one-time migration script:
- Read all `variant_media` records
- Call `media.fileLinkMany` for each variant's files

### 8.2 IAM avatars/logos backfill

Create one-time migration script:
- Read users with avatars, orgs with logos
- Call `media.fileLink` for each

---

## Implementation Order

1. **Database & Repository** (Phase 1-2)
   - Schema, migration, repository

2. **Broker Actions** (Phase 3)
   - DTOs, scripts, MediaBrokerActions

3. **GC & Events** (Phase 4-5)
   - Update GC workflow, add event emission

4. **GraphQL** (Phase 6)
   - Schema, resolver, DataLoader

5. **Consumer Integration** (Phase 7)
   - Inventory link/unlink calls
   - Event handlers

6. **Migration** (Phase 8)
   - Backfill scripts

---

## Critical Files Summary

| Component | File Path |
|-----------|-----------|
| BackRefs Schema | `services/media/src/repositories/models/fileBackRefs.ts` |
| BackRefs Repository | `services/media/src/repositories/FileBackRefRepository.ts` |
| Broker Actions | `services/media/src/MediaBrokerActions.ts` |
| Link Script | `services/media/src/scripts/backRef/FileLinkScript.ts` |
| Unlink Script | `services/media/src/scripts/backRef/FileUnlinkScript.ts` |
| GC Workflow | `services/media/src/workflows/FileGarbageCollectorWorkflow.ts` |
| Hard Delete Workflow | `services/media/src/workflows/FileHardDeleteWorkflow.ts` |
| GraphQL Schema | `services/media/src/api/graphql-admin/file.graphql` |
| File Resolver | `services/media/src/resolvers/admin/FileResolver.ts` |
| Inventory Media | `services/inventory/src/scripts/media/VariantSetMediaScript.ts` |
