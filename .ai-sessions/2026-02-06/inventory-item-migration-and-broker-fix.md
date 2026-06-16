# Inventory Item Migration & Broker Actions Fix

## Context

After moving inventory item creation into `ProductCreateSaga` (see `2026-02-06-inventory-item-creation-to-saga.md`), the `createInventoryItems` saga step failed at runtime with:

```
StepExecutionError: Step "createInventoryItems" failed: Failed query:
select "id", "project_id", "variant_id", "sku", "track_inventory", "continue_selling_when_out_of_stock", "created_at", "updated_at"
from "inventory"."inventory_item"
where ("inventory"."inventory_item"."project_id" = $1 and "inventory"."inventory_item"."variant_id" = $2) limit $3
```

## Root Cause

The Drizzle ORM model for `inventory_item` was added (`services/inventory/src/repositories/models/inventory-item.ts`) but **no database migration was generated**. The table did not exist in PostgreSQL.

## What Was Done

### 1. Created migration: `services/inventory/migrations/0002_add_inventory_item.sql`

Hand-written migration (drizzle-kit `generate` was unusable because it also detected removed catalog tables and generated destructive `DROP TABLE CASCADE` statements). The migration creates:

- Table `inventory.inventory_item` with columns: `id`, `project_id`, `variant_id`, `sku`, `track_inventory`, `continue_selling_when_out_of_stock`, `created_at`, `updated_at`
- `UNIQUE` constraint on `variant_id`
- Index `idx_inventory_item_variant` on `variant_id`
- Index `idx_inventory_item_project` on `project_id`
- Unique index `inventory_item_sku_unique` on `(project_id, sku)`

### 2. Created migration metadata

- Updated `migrations/meta/_journal.json` with entry for `0002_add_inventory_item`
- Generated `migrations/meta/0002_snapshot.json` programmatically (based on `0001_snapshot.json` + new table definition)

### 3. Fixed `InventoryBrokerActions.ts` — `getVariantCost` action

**Before (broken):**
```typescript
async getVariantCost(params: GetVariantCostParams): Promise<VariantCost | null> {
  const services = this.kernel.getServicesForProject(params.projectId); // TS2339: method doesn't exist
  const cost = await services.repository.cost.getCurrentCost({...});
  // ... instanceof Date checks on string fields (TS2358)
}
```

**After (fixed):**
```typescript
async getVariantCost(params: GetVariantCostParams): Promise<VariantCost | null> {
  return this.runWithStoreContext(params.projectId, async () => {
    const cost = await this.kernel.repository.cost.getCurrentCost({...});
    // ... simplified new Date() calls (fields are always strings from Drizzle)
  });
}
```

Changes:
- Replaced non-existent `this.kernel.getServicesForProject()` with `this.runWithStoreContext()` pattern (same as `createItem` and `deleteItemByVariantId`)
- Removed `instanceof Date` guards — Drizzle timestamps with `mode: "string"` are always strings

### 4. Build & Migrate

- Inventory service builds cleanly (0 type errors)
- Migration applied successfully, `inventory.inventory_item` table verified in database

## Key Lessons

- **`shopana db migrate` reads from `dist/migrations`**, not source `migrations/`. Must `shopana build` before `shopana db migrate`.
- **drizzle-kit `generate` is dangerous** when the Drizzle schema has diverged from the database (e.g. after service rename). It will generate `DROP TABLE CASCADE` for tables it no longer sees in the schema. Hand-written migrations are safer in this case.
- **drizzle-kit `generate` is interactive** — requires `expect` to automate (piping stdin doesn't work with its prompt library).
- Migration tracking table is per-service: `drizzle.__drizzle_migrations_{serviceName}`.

## Files Changed

| File | Change |
|------|--------|
| `services/inventory/migrations/0002_add_inventory_item.sql` | NEW — creates `inventory_item` table |
| `services/inventory/migrations/meta/_journal.json` | Added entry for migration 0002 |
| `services/inventory/migrations/meta/0002_snapshot.json` | NEW — snapshot with `inventory_item` table added |
| `services/inventory/src/InventoryBrokerActions.ts` | Fixed `getVariantCost`: use `runWithStoreContext` instead of non-existent `getServicesForProject`, simplified Date conversions |

## Build Status

- Inventory service: builds cleanly
- Migration: applied, table verified
