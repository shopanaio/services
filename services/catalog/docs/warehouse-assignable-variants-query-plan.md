# Warehouse Assignable Variants Query Plan

## Context

Inventory warehouse page needs a modal for adding variants to a warehouse.
The modal should list variants that can still be added to the selected warehouse:

- variants without an `InventoryItem`;
- variants with an `InventoryItem`, but without a `warehouse_stock` row for the selected warehouse.

This list does not need stock quantities. It only needs stable Relay pagination,
search/filter/order support compatible with the existing variant picker, and enough data for
the existing `Variant` resolvers to render product, media, SKU, and inventory item fields.

## Current State

`catalogQuery.variants(where:)` is backed by `variantRelayQuery` over the `variant` table.
Its generated `VariantWhereInput` only exposes variant columns:

- `productId`;
- `id`;
- `isDefault`;
- `handle`;
- `externalSystem`;
- `externalId`;
- `updatedAt`;
- `createdAt`.

It cannot express "no stock row exists in warehouse X". The current Admin variant picker receives
`queryMeta.warehouseId`, loads normal variants, and disables rows client-side when
`variant.inventoryItem.stock` contains that warehouse. This works for small pages, but it can produce
pages full of disabled rows and cannot guarantee that selectable rows are returned early.

`inventoryItems(meta: { warehouseScope })` is not the right API shape for this modal because variants
without an `InventoryItem` must be returned. An `InventoryItemConnection` cannot represent those rows.

## Decision

Add a dedicated `VariantConnection` query under `InventoryQuery`:

```graphql
type InventoryQuery {
  warehouseAssignableVariants(
    warehouseId: ID!
    first: Int
    after: String
    last: Int
    before: String
    where: VariantWhereInput
    orderBy: [VariantOrderByInput!]
  ): VariantConnection!
}
```

The query returns `Variant` nodes. Existing `VariantResolver.inventoryItem`,
`VariantResolver.product`, media, pricing, dimensions, and selected option resolvers remain unchanged.

## Data Model

Add a lightweight Drizzle view for candidate rows. The view should not calculate stock quantities.

Suggested SQL shape:

```sql
CREATE VIEW catalog.variant_warehouse_candidate_view AS
SELECT
  v.project_id,
  w.id AS warehouse_scope_id,
  v.product_id,
  v.id,
  v.is_default,
  v.handle,
  v.external_system,
  v.external_id,
  v.updated_at,
  v.created_at,
  v.deleted_at,
  p.deleted_at AS product_deleted_at,
  ii.id AS inventory_item_id
FROM catalog.variant v
JOIN catalog.product p
  ON p.project_id = v.project_id
 AND p.id = v.product_id
JOIN catalog.warehouses w
  ON w.project_id = v.project_id
LEFT JOIN catalog.inventory_item ii
  ON ii.project_id = v.project_id
 AND ii.variant_id = v.id
LEFT JOIN catalog.warehouse_stock ws
  ON ws.project_id = v.project_id
 AND ws.variant_id = v.id
 AND ws.warehouse_id = w.id
WHERE ws.id IS NULL;
```

This creates one candidate row per `(warehouse, variant)` pair where the variant is not stocked in
that warehouse. Repository filters will add:

- `projectId = storeId`;
- `warehouseScopeId = decoded warehouseId`;
- `deletedAt IS NULL`;
- `productDeletedAt IS NULL`;
- user-provided `where`.

## Backend Steps

1. Add Drizzle model `variantWarehouseCandidateView`.
   - Put it near variant/product list views, or in a dedicated `variantWarehouseCandidateView.ts`.
   - Export it from `services/catalog/src/repositories/models/index.ts`.
   - Include fields needed by `VariantWhereInput` and `VariantOrderByInput`.
   - Include `warehouseScopeId` as repository-owned field, not public filter input.

2. Add migration SQL.
   - Create the new view.
   - Do not edit existing changeset files manually.
   - Prefer project migration generation if available; otherwise add a normal migration file consistent with existing catalog migrations.

3. Add relay query in `VariantRepository`.
   - Create `warehouseAssignableVariantRelayQuery` over `variantWarehouseCandidateView`.
   - Map global ID filters for `id` and `productId` the same way `variantRelayQuery` does.
   - Include `id` and `productId`.
   - Use the same default ordering as `getConnection`: `createdAt desc`, `id desc`.

4. Add repository method:

```ts
async getWarehouseAssignableConnection(
  warehouseId: string,
  args: VariantRelayInput,
): Promise<VariantConnectionResult>
```

The method should:

- merge repository-owned filters and user `where`;
- execute relay query and count with the same `mergedWhere`;
- return `{ cursor, nodeId }` edges, where `nodeId` is `variant.id`.

5. Add GraphQL schema field under `InventoryQuery`.
   - `warehouseId: ID!`;
   - same pagination, `where`, and `orderBy` args as root `catalogQuery.variants`.
   - return `VariantConnection!`.

6. Add resolver method in `InventoryQueryResolver`.
   - Decode `warehouseId` as `GlobalIdEntity.Warehouse`.
   - Optionally verify warehouse existence through loader/repository. If not found, return an empty connection.
   - Normalize variant `where` the same way root variants currently rely on `mapWhereFields`; avoid passing raw global IDs to repository if additional normalizer becomes necessary.
   - Return `VariantConnectionResolver` with a meta/product-like routing flag, or add a dedicated connection resolver if cleaner.

7. Regenerate GraphQL outputs through project tooling.
   - Backend catalog generated resolver types/schemas if the service codegen flow is required.
   - Composed/admin schema if needed by Admin codegen.
   - Admin GraphQL types after updating Admin query documents.

## Admin Steps

1. Add a picker-specific query that calls:

```graphql
inventoryQuery {
  warehouseAssignableVariants(
    warehouseId: $warehouseId
    first: $first
    after: $after
    last: $last
    before: $before
    where: $where
    orderBy: $orderBy
  ) {
    edges {
      cursor
      node {
        ...VariantFields
        product {
          id
          title
          handle
          media {
            ...ProductMediaItemFields
          }
        }
      }
    }
    pageInfo {
      hasNextPage
      hasPreviousPage
      startCursor
      endCursor
    }
    totalCount
  }
}
```

2. Update `variant-picker-config.tsx`.
   - If `queryMeta.warehouseId` exists, use `warehouseAssignableVariants`.
   - If it does not exist, keep using normal `catalogQuery.variants`.
   - Remove or keep `hasStockInWarehouse` as a defensive UI guard. It should normally be false for this query.

3. Keep `excludeIds` behavior.
   - Continue adding `{ id: { _notIn: excludeIds } }` to `where`.
   - This remains useful for already-selected rows in the modal.

## Why Not Use Existing Filters

Existing `VariantWhereInput` cannot express an anti-join against `warehouse_stock`.
Adding a naive join to `variantRelayQuery` is risky because `warehouse_stock` is one-to-many by
variant and warehouse. It can produce duplicate variant rows and incorrect Relay pagination/counts.

A view makes the query source cardinality explicit: one candidate row per `(warehouse, variant)`.
That keeps Relay pagination, ordering, and total count stable.

## Acceptance Criteria

- Query returns variants without an inventory item.
- Query returns variants with an inventory item but no stock row in the selected warehouse.
- Query excludes variants already stocked in the selected warehouse.
- Query excludes deleted variants and variants whose product is deleted.
- Relay pagination and `totalCount` are scoped by the same filters.
- Existing `VariantWhereInput` search/filter and `VariantOrderByInput` ordering continue to work.
- Admin picker with `queryMeta.warehouseId` shows selectable candidates instead of disabled stocked rows.

## Verification

Do not run `test` or `tsc` for verification.

Recommended checks:

- run project build only when a new code version is needed;
- manually inspect generated GraphQL schema for `inventoryQuery.warehouseAssignableVariants`;
- manually verify Admin picker query variables use GraphQL global warehouse ID;
- manually query a fixture with:
  - variant without inventory item;
  - variant with inventory item and stock in another warehouse;
  - variant with stock in selected warehouse.
