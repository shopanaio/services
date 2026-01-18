# Media Service BackRefs Implementation Plan

## Overview

Implement back-references tracking in the media service to:
1. Track which entities (variants, users, orgs) reference each file
2. Display usage info in UI (with warning before delete)
3. **Auto hard-delete**: when refCount→0 after unlink/entityDeleted
4. **Manual hard-delete**: allowed anytime from library (even if refCount>0; cascade removes refs)

**Design Decisions:**
- Entity-level tracking: `inventory:variant:uuid123`
- Immediate deletion when backRefs=0 (no 30-day retention)
- GC is independent: backRefs only live while file exists (FK cascade cleans up)

**Idempotency Rules:**
- `fileLink`: repeated call → OK, file not found → OK (WARN log)
- `fileUnlink`: backRef gone → OK, returns **actual refCount** (not 0)
- `hardDelete`: returns `didDelete` (true = actually deleted, false = already gone)

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
    entityId: varchar("entity_id", { length: 255 }).notNull(),   // varchar for flexibility (external IDs, composites)
    role: varchar("role", { length: 32 }).notNull(),             // "main", "gallery", "avatar", "logo", etc.
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // One file can only be linked once per entity+role combination
    primaryKey({ columns: [table.fileId, table.service, table.entityType, table.entityId, table.role] }),
    // For counting refs per file
    index("idx_fbr_file_id").on(table.fileId),
    // For entityDeleted: find all files for an entity
    index("idx_fbr_entity").on(table.service, table.entityType, table.entityId),
    // For UI: show refs sorted by createdAt (simpler index, works with ORDER BY)
    index("idx_fbr_file_created").on(table.fileId, table.createdAt),
  ]
);

// Helper to generate entityRef string for UI display (not stored in DB)
export function formatEntityRef(service: string, entityType: string, entityId: string): string {
  return `${service}:${entityType}:${entityId}`;
}
```

**Design notes:**
- No `entityRef` column - generated on-the-fly for UI to avoid sync issues
- `entityId` is varchar(255) for flexibility (external IDs, composites)
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
- `link(fileId, entityRef, role)` - **INSERT ... SELECT FROM files WHERE id=?** (no FK error if file missing), returns refCount
- `linkMany(fileIds, entityRef, role)` - batch link via INSERT SELECT, returns linkedCount
- `unlink(fileId, entityRef, role)` - DELETE + count, returns `{ remainingCount }`
- `unlinkAllByEntity(entityRef)` - **DELETE ... RETURNING file_id** → batch count → fileIds with 0 refs
- `countByFileId(fileId)` - single file count
- `countByFileIds(fileIds)` - batch counts (for entityDeleted optimization)
- `findByFileId(fileId, limit=100)` - **ORDER BY created_at DESC, entity_id ASC** (stable sort)

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

export interface FileLinkResult {
  success: boolean;    // true = linked (or already existed)
  refCount: number;    // total refs for this file after operation
}

export interface FileUnlinkParams {
  fileId: string;
  entityRef: EntityRef;
  role: string;
}

export interface FileUnlinkResult {
  success: boolean;    // true = operation completed (idempotent)
  refCount: number;    // remaining refs (0 if file deleted or didn't exist)
  deleted: boolean;    // true ONLY if THIS call triggered hard-delete (didDelete=true)
}

export interface EntityDeletedParams {
  entityRef: EntityRef;  // unlinks ALL roles for this entity
}

export interface EntityDeletedResult {
  unlinkedCount: number;   // backRefs removed in this call
  deletedFileIds: string[]; // files where: refCount→0 AND hardDelete returned didDelete=true
}
```

**Contract Semantics:**
- All operations are **idempotent** — safe to retry

**`fileLink`:**
| Case | success | refCount | Note |
|------|---------|----------|------|
| linked (new or existed) | true | actual count | — |
| file not found | true | 0 | WARN log, no insert |

**link() SQL pattern** (no FK violation if file missing):
```sql
INSERT INTO file_back_refs (file_id, service, entity_type, entity_id, role, created_at)
SELECT $fileId, $service, $entityType, $entityId, $role, NOW()
FROM files WHERE id = $fileId
ON CONFLICT DO NOTHING
```
Returns 0 rows if file doesn't exist → `refCount=0`, WARN log.

**`fileUnlink`:**
| Case | success | refCount | deleted |
|------|---------|----------|---------|
| backRef deleted | true | actual remaining | false (or true if triggered hardDelete) |
| backRef didn't exist | true | actual remaining | false |
| file not found | true | 0 | false |
| file deleted concurrently | true | 0 | false |
| hardDelete triggered by THIS call | true | 0 | true |

**Note:** `refCount` is best-effort, equals 0 when:
- file not found (never existed or already deleted)
- file deleted concurrently
- FK cascade removed refs

**`entityDeleted`:**
- `unlinkedCount` = number of **backRef rows deleted** (not files)
- `deletedFileIds` = files where refCount→0 AND hardDelete returned didDelete=true

**EntityDeletedScript algorithm:**
```typescript
// 1. Delete all refs for entity, get affected fileIds
const { rows, rowCount } = await db
  .delete(fileBackRefs)
  .where(and(eq(service, ?), eq(entityType, ?), eq(entityId, ?)))
  .returning({ fileId: fileBackRefs.fileId });

const unlinkedCount = rowCount;
const affectedFileIds = [...new Set(rows.map(r => r.fileId))];

// 2. Batch count remaining refs for affected files
const counts = await backRefRepo.countByFileIds(affectedFileIds);
const zeroRefFileIds = affectedFileIds.filter(id => counts.get(id) === 0);

// 3. Hard delete files with 0 refs
const deletedFileIds = [];
for (const fileId of zeroRefFileIds) {
  const { didDelete } = await FileHardDeleteWorkflow.run(fileId);
  if (didDelete) deletedFileIds.push(fileId);
}

return { unlinkedCount, deletedFileIds };
```

### 3.2 Scripts

**Files to create:**
- `services/media/src/scripts/backRef/FileLinkScript.ts`
- `services/media/src/scripts/backRef/FileUnlinkScript.ts`
- `services/media/src/scripts/backRef/FileLinkManyScript.ts`
- `services/media/src/scripts/backRef/EntityDeletedScript.ts`

**FileUnlinkScript algorithm:**
```typescript
// 1. Delete backRef (idempotent - works even if file already deleted)
DELETE FROM file_back_refs
WHERE file_id = ? AND service = ? AND entity_type = ? AND entity_id = ? AND role = ?

// 2. Count remaining refs (best-effort: 0 if file deleted concurrently)
const refCount = await backRefRepo.countByFileId(fileId);

// 3. If 0 refs → call hard delete workflow (idempotent)
if (refCount === 0) {
  const { didDelete } = await FileHardDeleteWorkflow.run(fileId);
  return { success: true, refCount: 0, deleted: didDelete };
}

return { success: true, refCount, deleted: false };
```

**No `exists()` check needed** — DELETE is idempotent, COUNT returns 0 if file gone, workflow is idempotent.

**FileHardDeleteWorkflow returns:**
```typescript
interface HardDeleteResult {
  didDelete: boolean;  // true = actually deleted, false = already gone
}

// Correct order: S3 first, then DB
// 1. Delete from S3 (idempotent - ignore NotFound)
await s3Client.deleteObject({ bucket, key });  // no error if already gone

// 2. Delete DB row - didDelete based on rowCount
const { rowCount } = await db.delete(files).where(eq(files.id, fileId));
const didDelete = rowCount === 1;

return { didDelete };
```

**Why S3 first:** If DB delete succeeds but S3 fails, we lose the reference to clean up S3. Reverse order is safer.

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

## Phase 4: GraphQL Extensions

### 4.1 Update schema

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
  refs: [FileBackRef!]!  # Server-side limit: max 100 (prevents admin UI explosion)
}

extend type File {
  backRefs: FileBackRefsSummary!
}
```

**Note:**
- `refs` limited to 100 on server, sorted by `created_at DESC, entity_id ASC` (stable order)
- `totalCount` from separate `COUNT(*)` query — shows real count for UI warning

### 4.2 Update resolver

**File:** `services/media/src/resolvers/admin/FileResolver.ts`

Add `backRefs` field resolver.

### 4.3 UX hint for Media Library

Before "Delete" button, show warning if `backRefs.totalCount > 0`:
- "This file is used in N places"
- Still allow deletion (delete + notify async)

### 4.4 DataLoader (optional optimization)

**File:** `services/media/src/loaders/FileBackRefLoader.ts`

Batch load backRef counts for list views.

---

## Phase 5: Consumer Services Integration

**Best-effort rule:** `fileLink`/`fileUnlink` errors should NOT block business operations.
- Log errors, retry a few times, but don't fail variant update or avatar change
- Dangling links are acceptable (user can manually clean up in media library)

### 5.1 Inventory Service

**Files to modify:**

1. Update `VariantSetMediaScript` to call link/unlink:
   - `services/inventory/src/scripts/media/VariantSetMediaScript.ts`
   - Wrap in try/catch, log errors, don't block variant save

2. Call `media.entityDeleted` when variant is deleted

### 5.2 IAM Service

**Files to modify:**

1. Update user avatar/org logo mutations to call link/unlink (best-effort)
2. Call `media.entityDeleted` when user/org is deleted

---

## Implementation Order

1. **Database & Repository** (Phase 1-2)
   - Schema, migration, repository

2. **Broker Actions** (Phase 3)
   - DTOs, scripts, MediaBrokerActions

3. **GraphQL** (Phase 4)
   - Schema, resolver, DataLoader

4. **Consumer Integration** (Phase 5)
   - Inventory link/unlink calls

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
