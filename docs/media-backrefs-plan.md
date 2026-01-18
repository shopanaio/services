# Media Service BackRefs Implementation Plan

## Overview

Implement back-references tracking in the media service to:
1. Track which entities (variants, users, orgs) reference each file
2. Display usage info in UI (with warning before delete)
3. **No auto-delete**: files remain even with refCount=0
4. **Deletion flow**: UI soft-delete → GC hard-delete (after retention)

**Design Decisions:**
- Entity-level tracking: `inventory:variant:uuid123`
- BackRefs are **tracking only** — no auto-deletion
- GC is independent: backRefs only live while file exists (FK cascade cleans up)

**Idempotency Rules:**
- `fileLink`: repeated call → OK, file not found → OK (WARN log)
- `fileUnlink`: backRef gone → OK, returns **actual refCount**
- `entityDeleted`: all backRefs for entity removed, returns count

**Soft-Deleted Files (`deletedAt != null`):**
- `fileLink`: treated as "file not found" — no insert, `refCount: 0`, WARN log
- `fileUnlink`: idempotent — `success: true, refCount: 0`
- Rationale: don't create new references to files pending GC

**`refCount` Semantics:**
- `refCount` = "active refs for active file" (not raw DB row count)
- Returns 0 when file is missing or soft-deleted, even if backRef rows exist in DB
- Use `fileExists` + `fileActive` flags to understand why `refCount` is 0
- UI can show: "file pending deletion" when `fileExists && !fileActive`

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
- `unlinkAllByEntity(entityRef)` - DELETE all backRefs for entity, returns count
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
  refCount: number;    // total refs for this file (0 if file missing/inactive)
  fileExists: boolean; // file row exists in DB
  fileActive: boolean; // file exists AND deletedAt == null
}

export interface FileUnlinkParams {
  fileId: string;
  entityRef: EntityRef;
  role: string;
}

export interface FileUnlinkResult {
  success: boolean;    // true = operation completed (idempotent)
  refCount: number;    // remaining refs (0 if file missing/inactive)
  fileExists: boolean; // file row exists in DB
  fileActive: boolean; // file exists AND deletedAt == null
}

export interface EntityDeletedParams {
  entityRef: EntityRef;  // unlinks ALL roles for this entity
}

export interface EntityDeletedResult {
  unlinkedCount: number;   // backRefs removed in this call
}
```

**Contract Semantics:**
- All operations are **idempotent** — safe to retry

**`fileLink`:**
| Case | success | refCount | fileExists | fileActive | Note |
|------|---------|----------|------------|------------|------|
| linked (new or existed) | true | actual | true | true | — |
| file not found | true | 0 | false | false | WARN log, no insert |
| file soft-deleted | true | 0 | true | false | WARN log, no insert |

**link() SQL pattern** (no FK violation if file missing or soft-deleted):
```sql
INSERT INTO file_back_refs (file_id, service, entity_type, entity_id, role, created_at)
SELECT $fileId, $service, $entityType, $entityId, $role, NOW()
FROM files WHERE id = $fileId AND deleted_at IS NULL
ON CONFLICT DO NOTHING
```
Returns 0 rows if file doesn't exist or is soft-deleted → `refCount=0`, WARN log.

**`fileUnlink`:**
| Case | success | refCount | fileExists | fileActive |
|------|---------|----------|------------|------------|
| backRef deleted | true | actual remaining | true | true |
| backRef didn't exist | true | actual remaining | true | true |
| file not found | true | 0 | false | false |
| file soft-deleted | true | 0 | true | false |
| file deleted concurrently | true | 0 | false | false |

**Note:** `refCount` equals 0 when `fileActive == false`. Use flags to distinguish:
- `fileExists: false` → file never existed or hard-deleted
- `fileExists: true, fileActive: false` → file pending GC (soft-deleted)
- File deleted concurrently → race condition, `fileExists: false`

**`entityDeleted`:**
- `unlinkedCount` = number of **backRef rows deleted** (not files)

**EntityDeletedScript algorithm:**
```typescript
// Delete all refs for entity
const { rowCount } = await db
  .delete(fileBackRefs)
  .where(and(eq(service, ?), eq(entityType, ?), eq(entityId, ?)));

return { unlinkedCount: rowCount };
```

**No auto-delete** — files remain even with refCount=0.

### 3.2 Scripts

**Files to create:**
- `services/media/src/scripts/backRef/FileLinkScript.ts`
- `services/media/src/scripts/backRef/FileUnlinkScript.ts`
- `services/media/src/scripts/backRef/FileLinkManyScript.ts`
- `services/media/src/scripts/backRef/EntityDeletedScript.ts`

**FileLinkScript algorithm:**
```typescript
// 1. Insert backRef only if file exists and is active
const inserted = await db.execute(sql`
  INSERT INTO file_back_refs (file_id, service, entity_type, entity_id, role, created_at)
  SELECT ${fileId}, ${service}, ${entityType}, ${entityId}, ${role}, NOW()
  FROM files WHERE id = ${fileId} AND deleted_at IS NULL
  ON CONFLICT DO NOTHING
`);

// 2. Check file status and count refs
const file = await db.query.files.findFirst({
  where: eq(files.id, fileId),
  columns: { id: true, deletedAt: true }
});

if (!file) {
  logger.warn(`fileLink: file not found`, { fileId });
  return { success: true, refCount: 0, fileExists: false, fileActive: false };
}

if (file.deletedAt !== null) {
  logger.warn(`fileLink: file is soft-deleted`, { fileId });
  return { success: true, refCount: 0, fileExists: true, fileActive: false };
}

const refCount = await backRefRepo.countByFileId(fileId);
return { success: true, refCount, fileExists: true, fileActive: true };
```

**FileUnlinkScript algorithm:**
```typescript
// 1. Delete backRef (idempotent - works even if file already deleted)
await db.delete(fileBackRefs).where(and(
  eq(fileBackRefs.fileId, fileId),
  eq(fileBackRefs.service, service),
  eq(fileBackRefs.entityType, entityType),
  eq(fileBackRefs.entityId, entityId),
  eq(fileBackRefs.role, role)
));

// 2. Check file status
const file = await db.query.files.findFirst({
  where: eq(files.id, fileId),
  columns: { id: true, deletedAt: true }
});

if (!file) {
  return { success: true, refCount: 0, fileExists: false, fileActive: false };
}

if (file.deletedAt !== null) {
  return { success: true, refCount: 0, fileExists: true, fileActive: false };
}

// 3. Count refs only for active files
const refCount = await backRefRepo.countByFileId(fileId);
return { success: true, refCount, fileExists: true, fileActive: true };
```

**No auto-delete** — file remains even with refCount=0. Deletion only through media UI → GC.

### 3.3 Broker Actions

**File:** `services/media/src/MediaBrokerActions.ts`

Add actions:
```typescript
@Action("fileLink")        // Link file to entity
@Action("fileUnlink")      // Unlink backRef
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
- **Only soft-delete allowed in UI** — hard-delete only via GC (after retention)

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
| EntityDeleted Script | `services/media/src/scripts/backRef/EntityDeletedScript.ts` |
| GraphQL Schema | `services/media/src/api/graphql-admin/file.graphql` |
| File Resolver | `services/media/src/resolvers/admin/FileResolver.ts` |
| Inventory Media | `services/inventory/src/scripts/media/VariantSetMediaScript.ts` |
