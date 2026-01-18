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
    service: varchar("service", { length: 64 }).notNull(),       // "inventory", "iam", etc.
    entityType: varchar("entity_type", { length: 64 }).notNull(), // "variant", "user", "organization"
    entityId: varchar("entity_id", { length: 128 }).notNull(),   // varchar for flexibility (not all IDs are UUIDs)
    role: varchar("role", { length: 32 }).notNull(),             // "main", "gallery", "avatar", "logo", etc.
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // One file can only be linked once per entity+role combination
    primaryKey({ columns: [table.fileId, table.service, table.entityType, table.entityId, table.role] }),
    // For GC: count refs per file
    index("idx_fbr_file_id").on(table.fileId),
    // For entityDeleted: find all files for an entity (most important for cleanup)
    index("idx_fbr_entity").on(table.service, table.entityType, table.entityId),
  ]
);

// Helper to generate entityRef string for UI display (not stored in DB)
export function formatEntityRef(service: string, entityType: string, entityId: string): string {
  return `${service}:${entityType}:${entityId}`;
}
```

**Design notes:**
- No `entityRef` column - generated on-the-fly for UI to avoid sync issues
- `entityId` is varchar(128) for flexibility (not all services use UUIDs)
- `role` distinguishes different usages (main image vs gallery vs avatar)

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
export interface EntityRef {
  service: string;     // "inventory", "iam"
  entityType: string;  // "variant", "user", "organization"
  entityId: string;    // varchar, not necessarily UUID
}

export interface FileLinkParams {
  fileId: string;
  entityRef: EntityRef;
  role: string;        // "main", "gallery", "avatar", "logo"
}

export interface FileUnlinkParams {
  fileId: string;
  entityRef: EntityRef;
  role: string;
}

export interface FileUnlinkResult {
  success: boolean;
  refCount: number;
  deleted: boolean;  // true if hard-deleted
}

export interface EntityDeletedParams {
  entityRef: EntityRef;  // unlinks ALL roles for this entity
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

## Phase 4: Event Broadcasting

### 4.1 Add `file.deleted` event

**File:** `services/media/src/workflows/FileHardDeleteWorkflow.ts`

After successful hard-delete, emit event:
```typescript
await broker.emit("file.deleted", { fileId, deletedAt });
```

**File:** `services/media/src/scripts/backRef/FileUnlinkScript.ts`

When triggering immediate hard-delete (refCount=0), also emit event.

---

## Phase 5: GraphQL Extensions

### 5.1 Update schema

**File:** `services/media/src/api/graphql-admin/file.graphql`

```graphql
type FileBackRef {
  service: String!
  entityType: String!
  entityId: String!
  role: String!
  entityRef: String!   # Generated: "service:entityType:entityId"
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

### 5.2 Update resolver

**File:** `services/media/src/resolvers/admin/FileResolver.ts`

Add `backRefs` field resolver.

### 5.3 DataLoader (optional optimization)

**File:** `services/media/src/loaders/FileBackRefLoader.ts`

Batch load backRef counts for list views.

---

## Phase 6: Consumer Services Integration

### 6.1 Inventory Service

**Files to modify:**

1. Update `VariantSetMediaScript` to call link/unlink:
   - `services/inventory/src/scripts/media/VariantSetMediaScript.ts`

2. Call `media.entityDeleted` when variant is deleted

3. Add event handler for `file.deleted`:
   - Create: `services/inventory/src/events/MediaEventsHandler.ts`

### 6.2 IAM Service

**Files to modify:**

1. Update user avatar/org logo mutations to call link/unlink
2. Call `media.entityDeleted` when user/org is deleted

---

## Implementation Order

1. **Database & Repository** (Phase 1-2)
   - Schema, migration, repository

2. **Broker Actions** (Phase 3)
   - DTOs, scripts, MediaBrokerActions

3. **Event Broadcasting** (Phase 4)
   - Add `file.deleted` event emission

4. **GraphQL** (Phase 5)
   - Schema, resolver, DataLoader

5. **Consumer Integration** (Phase 6)
   - Inventory link/unlink calls
   - Event handlers

---

## Critical Files Summary

| Component | File Path |
|-----------|-----------|
| BackRefs Schema | `services/media/src/repositories/models/fileBackRefs.ts` |
| BackRefs Repository | `services/media/src/repositories/FileBackRefRepository.ts` |
| Broker Actions | `services/media/src/MediaBrokerActions.ts` |
| Link Script | `services/media/src/scripts/backRef/FileLinkScript.ts` |
| Unlink Script | `services/media/src/scripts/backRef/FileUnlinkScript.ts` |
| Hard Delete Workflow | `services/media/src/workflows/FileHardDeleteWorkflow.ts` |
| GraphQL Schema | `services/media/src/api/graphql-admin/file.graphql` |
| File Resolver | `services/media/src/resolvers/admin/FileResolver.ts` |
| Inventory Media | `services/inventory/src/scripts/media/VariantSetMediaScript.ts` |
