# Inventory Federation Resolvers Fix

## Context

After all previous work (inventory item migration, broker fix, saga integration), the `product-create.spec.ts` e2e tests were failing — 4 out of 10 tests returned `null` for `variant.inventoryItem`.

## Root Cause

The inventory service declared `extend type Variant @key(fields: "id")` in its GraphQL schema with an `inventoryItem` field, and had a `VariantFederationResolver` class with `@SubgraphReference()` decorator — but **never registered it in the Apollo resolvers map**.

The `@SubgraphReference()` decorator adds `__resolveReference` to the class prototype, but Apollo Server requires the resolver to be explicitly listed in the resolvers object:

```typescript
// BEFORE (broken) — Variant not in resolvers
export const resolvers = {
  Query: QueryResolver,
  Mutation: MutationResolver,
  ...typeResolvers, // only Node + UserError
};
```

Without `Variant.__resolveReference`, when the Apollo Router (gateway) sent `_entities` queries to the Inventory subgraph for Variant references, the service couldn't resolve them → returned `null` for all Inventory-owned fields (`inventoryItem`, `sku`, `dimensions`, etc.).

## Why Variant.__resolveReference is needed in Inventory

This is how **Apollo Federation** works:

1. Gateway sends mutation to **Catalog** → gets `{ id, handle }` for variants
2. Gateway sees `inventoryItem` belongs to **Inventory** (from supergraph: `@join__field(graph: INVENTORY_ADMIN)`)
3. Gateway sends `_entities([{ __typename: "Variant", id: "..." }])` to **Inventory**
4. Inventory must respond via `Variant.__resolveReference` — this doesn't "load the variant from DB", it just accepts the variant ID and creates a resolver that can reach Inventory-owned fields
5. The resolver's `inventoryItem()` method looks up `inventory_item` by `variant_id` in Inventory's own DB

**Every service that does `extend type X @key(fields: "id")` MUST have `__resolveReference` for that type.**

## What Was Fixed

**File: `services/inventory/src/api/graphql-admin/resolvers/types.ts`**

Added federation `__resolveReference` resolvers for all extended types:

```typescript
import { parseGraphqlInfo } from "@shopana/type-resolver";
import { VariantFederationResolver } from "../../../resolvers/admin/VariantFederationResolver.js";
import { InventoryItemResolver } from "../../../resolvers/admin/InventoryItemResolver.js";
import { WarehouseResolver } from "../../../resolvers/admin/WarehouseResolver.js";

export const typeResolvers = {
  // ... existing Node, UserError ...

  // Federation reference resolvers
  Variant: {
    __resolveReference: async (reference, ctx, info) => {
      const fieldInfo = parseGraphqlInfo(info);
      return VariantFederationResolver.load(reference.id, fieldInfo, ctx);
    },
  },
  InventoryItem: {
    __resolveReference: async (reference, ctx, info) => {
      const fieldInfo = parseGraphqlInfo(info);
      return InventoryItemResolver.load(reference.id, fieldInfo, ctx);
    },
  },
  Warehouse: {
    __resolveReference: async (reference, ctx, info) => {
      const fieldInfo = parseGraphqlInfo(info);
      return WarehouseResolver.load(reference.id, fieldInfo, ctx);
    },
  },
};
```

Pattern taken from the **Media service** which correctly registers `File.__resolveReference` in its `types.ts`.

## Debugging Journey

1. Ran `product-create.spec.ts` — 4 tests failed with `variant.inventoryItem` being `null`
2. Verified GQL queries request `inventoryItem { id sku trackInventory }` — correct
3. Checked DB directly — `inventory.inventory_item` rows exist with correct `project_id` and `variant_id`
4. Created debug test — confirmed `inventoryItem` is `null` both in mutation response AND in separate query
5. Traced federation flow: gateway → `_entities` → Inventory subgraph → `Variant.__resolveReference` → missing!
6. Found `VariantFederationResolver` has `@SubgraphReference()` but is **not imported or registered** in resolvers
7. Added `__resolveReference` to `typeResolvers` → all 10 tests pass

## Key Lesson

**`@SubgraphReference()` decorator is NOT sufficient by itself.** It only adds `__resolveReference` to the class prototype. The class must still be registered in the Apollo resolvers map under the correct type name. The decorator's comment "handled automatically" was misleading — it's only half the work.

## Test Results

- `product-create.spec.ts`: **10/10 passed** (was 6/10)

## E2E Test Progress

Tests run so far:
- `product-create.spec.ts` — 10/10 PASS

Remaining to test:
- `product-update.spec.ts`
- `product-query.spec.ts`
- `pricing.spec.ts`
- `stock.spec.ts`
- `physical.spec.ts`
- `warehouse.spec.ts`
- `warehouse-pagination.spec.ts`
- `warehouse-stock-pagination.spec.ts`
- `widget.inventory.spec.ts`
- `widget-pricing.spec.ts`
- `pricing-history-pagination.spec.ts`
- `media.spec.ts`
- `features-sync.spec.ts`
- `options-sync.spec.ts`
- `product-bulk-edit.spec.ts`

## Files Changed

| File | Change |
|------|--------|
| `services/inventory/src/api/graphql-admin/resolvers/types.ts` | Added `Variant`, `InventoryItem`, `Warehouse` federation `__resolveReference` resolvers |
