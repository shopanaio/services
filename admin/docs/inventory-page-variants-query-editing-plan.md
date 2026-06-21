# План интеграции Inventory Page через `catalogQuery.variants`

## Цель

Перевести страницу `Inventory` с mock data на существующий Admin GraphQL API без изменений backend.

В scope этого шага:

- читать строки через `catalogQuery.variants`;
- использовать cursor pagination из `VariantConnection`;
- показывать product context в плоской таблице, одна строка = один `Variant`;
- сортировать через API `orderBy`, без локальной сортировки загруженной страницы;
- всегда передавать `productId` первым sort key для product-first порядка;
- редактировать `onHand` и `unavailable` через `inventoryMutation.inventoryItemUpdate`;
- сохранить текущий inline editing UX: `readOnlyEdit`, pending edits store, floating save/discard panel, блокировку pagination/sort при unsaved changes.

Out of scope:

- backend changes;
- новая inventory-owned variants connection;
- bulk inventory update mutation;
- `FilterWidget`, search UX и filter UX;
- сортировка inventory-owned колонок через `catalogQuery.variants`.

## Фактический API-контракт

Source of truth:

- `services/catalog/src/api/graphql-admin/schema/base.graphql`
- `services/catalog/src/api/graphql-admin/schema/__generated__/filters.graphql`
- `services/catalog/src/api/graphql-admin/schema/variant.graphql`
- `services/inventory/src/api/graphql-admin/schema/inventory-item.graphql`
- `services/inventory/src/api/graphql-admin/schema/stock.graphql`
- `e2e/queries/catalog-api/VariantFindMany.gql`
- `e2e/tests/inventory-api/variant-query.spec.ts`

`catalogQuery.variants` уже поддерживает Relay pagination, `where` и `orderBy`:

```graphql
variants(
  first: Int
  after: String
  last: Int
  before: String
  where: VariantWhereInput
  orderBy: [VariantOrderByInput!]
): VariantConnection!
```

`VariantOrderByInput`:

```graphql
input VariantOrderByInput {
  field: VariantOrderField!
  direction: SortDirection!
}
```

Доступные `VariantOrderField` в текущем API:

```graphql
enum VariantOrderField {
  productId
  id
  isDefault
  handle
  externalSystem
  externalId
  updatedAt
  createdAt
}
```

`sku`, `price`, `availableQuantity` и `totalAvailable` не являются `VariantOrderField`; это зафиксировано e2e тестом `inventory-api/variant-query.spec.ts`.

`VariantWhereInput` доступен на API уровне, но search/filter UI не входит в этот план. Для первого шага `where` используется только если странице нужен технический API-фильтр. `FilterWidget` не мапится.

## Query для страницы

Inventory module должен объявить собственную operation в `admin/src/domains/inventory/inventory/graphql`, не расширяя product module fragments.

```graphql
query InventoryVariants(
  $first: Int
  $after: String
  $last: Int
  $before: String
  $where: VariantWhereInput
  $orderBy: [VariantOrderByInput!]
) {
  catalogQuery {
    variants(
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
          id
          title
          handle
          isDefault
          product {
            id
            title
            handle
          }
          selectedOptions {
            optionId
            optionValueId
          }
          media {
            sortIndex
            file {
              id
              url
              originalName
              mimeType
            }
          }
          inventoryItem {
            id
            variantId
            sku
            trackInventory
            continueSellingWhenOutOfStock
            totalAvailable
            stock {
              id
              warehouseId
              variantId
              quantityOnHand
              reservedQuantity
              unavailableQuantity
              availableForSale
              createdAt
              updatedAt
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
}
```

Notes:

- `Variant.product` comes from Catalog API and is required for row context.
- `Variant.inventoryItem` comes from Inventory federation extension.
- A row with `inventoryItem: null` renders read-only and is skipped by save.
- The page must pass explicit `orderBy`; it must not rely on repository default ordering.

## Sorting contract

Inventory page sorting is server-side only.

Rules:

- AG Grid must not perform local loaded-page sorting.
- Every `InventoryVariants` request must include `orderBy`.
- `orderBy[0]` is always `{ field: "productId", direction: "asc" }`.
- `orderBy[1]` is the active supported table sort field.
- If no user sort is active, use deterministic fallback:

```ts
[
  { field: "productId", direction: "asc" },
  { field: "id", direction: "asc" },
]
```

Supported table sort mapping in this step:

| Table intent | API order field | Status |
|---|---|---|
| Product-first grouping | `productId` | Always first key |
| Variant text/order fallback | `handle` | Supported |
| Variant id fallback | `id` | Supported |
| Default variant | `isDefault` | Supported |
| Created date | `createdAt` | Supported |
| Updated date | `updatedAt` | Supported |
| External system/id | `externalSystem`, `externalId` | Supported if shown |
| Variant title | none in current `VariantOrderField` | Do not expose as API sort |
| SKU | none in current `VariantOrderField` | Do not expose as API sort |
| On hand / unavailable / reserved / available | none in current `VariantOrderField` | Do not expose as API sort |

If the UI shows a sortable Product/Variant column in this step, its API sort must map to `handle`, not `title`. Columns without API sort mapping must have AG Grid sort UI disabled.

Sort changes:

- reset cursor pagination to the first page;
- are disabled while there are pending edits;
- refetch through `InventoryVariants` with the new `orderBy`.

## Row model

Create a UI-local row type in the inventory module, for example `InventoryVariantRow`. This is allowed because AG Grid needs editor state and derived fields; it must not become a second API source of truth.

```ts
interface InventoryVariantRow {
  id: string;
  variantId: string;
  productId: string;
  productTitle: string;
  productHandle: string | null;
  variantTitle: string | null;
  variantHandle: string;
  imageUrl: string | null;
  sku: string | null;
  inventoryItemId: string | null;
  warehouseStockId: string | null;
  warehouseId: string | null;
  onHand: number;
  unavailable: number;
  reserved: number;
  available: number;
  trackInventory: boolean;
  continueSellingWhenOutOfStock: boolean;
  cursor: string;
  readOnly: boolean;
  readOnlyReason: string | null;
}
```

Mapping rules:

| UI field | API source |
|---|---|
| `id`, `variantId` | `Variant.id` |
| `productId` | `Variant.product.id` |
| `productTitle` | `Variant.product.title` |
| `productHandle` | `Variant.product.handle` |
| `variantTitle` | `Variant.title` |
| `variantHandle` | `Variant.handle` |
| `imageUrl` | first `Variant.media` item by `sortIndex`, then `file.url` |
| `sku` | `Variant.inventoryItem.sku` |
| `inventoryItemId` | `Variant.inventoryItem.id` |
| `warehouseStockId` | selected `InventoryItem.stock[].id` |
| `warehouseId` | selected stock warehouse id or default warehouse id |
| `onHand` | selected stock `quantityOnHand` |
| `unavailable` | selected stock `unavailableQuantity` |
| `reserved` | selected stock `reservedQuantity` |
| `available` | selected stock `availableForSale`, then UI preview after edits |

## Default warehouse

The first implementation edits one warehouse: the default warehouse.

Rules:

- `useInventoryVariants` loads default warehouse with an inventory-local operation equivalent to `INVENTORY_DEFAULT_WAREHOUSE_QUERY`.
- Row mapping selects `inventoryItem.stock.find(stock.warehouseId === defaultWarehouse.id)`.
- If stock for the default warehouse is absent, show zero values and keep `warehouseId = defaultWarehouse.id`.
- If default warehouse is absent, render table read-only and disable save.

`useInventoryVariants` return shape:

```ts
interface UseInventoryVariantsReturn {
  rows: InventoryVariantRow[];
  defaultWarehouse: ApiWarehouse | null;
  pageInfo: ApiPageInfo | null;
  totalCount: number;
  loading: boolean;
  error: Error | null;
  canEdit: boolean;
  readOnlyReason: string | null;
  refetch: () => Promise<void>;
}
```

## Inline editing

Editable fields:

- `onHand`
- `unavailable`

Read-only fields:

- `reserved`
- `available`
- rows without `inventoryItemId`
- all rows when default warehouse is missing

Flow:

1. User edits `onHand` or `unavailable`.
2. `handleCellEditRequest` parses integer input and handles empty/invalid presentation states.
3. UI stores pending change in `useInventoryEditStore`.
4. `displayData` merges API rows with pending edits.
5. `available` preview recalculates as `onHand - unavailable - reserved`.
6. Floating save/discard panel appears.
7. Save maps pending row edits to `InventoryItemUpdateInput[]`.
8. Mutations run sequentially through inventory-local save hook.
9. Full success clears edits and refetches variants.
10. Failed rows keep their edits and show backend `userErrors` or runtime errors.

Backend remains the authority for stock consistency. UI must not block save based on business rules like `unavailable <= onHand` except for basic input parsing.

## Save mapping

Add inventory-local mapper:

```text
admin/src/domains/inventory/inventory/mappers/inventory-variant-edit.mapper.ts
```

Input:

- current `InventoryVariantRow[]`
- pending edits from `useInventoryEditStore`
- default warehouse id

Output:

```ts
ApiInventoryItemUpdateInput[]
```

Mutation input:

```ts
{
  id: row.inventoryItemId,
  stock: {
    warehouseId: row.warehouseId ?? defaultWarehouse.id,
    onHand: nextOnHand,
    unavailable: nextUnavailable,
  },
}
```

Rules:

- send only changed rows;
- send only `stock.warehouseId`, `stock.onHand`, `stock.unavailable`;
- do not send SKU, cost, weight, dimensions, `reserved`, or `available`;
- skip rows without `inventoryItemId` and report them as unsavable;
- do not reuse product variant inventory mapper if it carries product-editor behavior or UI stock consistency validation.

Partial save:

- save hook returns per-row success/error state;
- full success clears all edits;
- partial success clears only successful row edits, keeps failed row edits, refetches, and shows aggregated errors;
- do not call global `onSaveSuccess` on partial failure.

## Module changes

Target structure:

```text
admin/src/domains/inventory/inventory/
  graphql/
    fragments.ts
    queries.ts
    mutations.ts
    operation-types.ts
    index.ts
  hooks/
    use-inventory.ts
    use-inventory-edit-store.ts
    use-inventory-variants.ts
    use-save-inventory-variant-edits.ts
    index.ts
  mappers/
    inventory-variant-row.mapper.ts
    inventory-variant-edit.mapper.ts
    index.ts
  page/
    page.tsx
  components/
```

Implementation steps:

1. Add inventory-local GraphQL fragments, `InventoryVariants`, default warehouse query, and `InventoryItemUpdate` mutation.
2. Add operation response/variable types based on Admin API types used by the frontend.
3. Add `useInventoryVariants` with variants query, default warehouse query, explicit `orderBy`, pagination state, loading/error handling, and row mapping.
4. Add row mapper from `VariantEdge` to `InventoryVariantRow`.
5. Add sort mapper from AG Grid sort state to `VariantOrderByInput[]`, always prepending `{ field: "productId", direction: "asc" }`.
6. Add edit mapper to `ApiInventoryItemUpdateInput[]`.
7. Add inventory-local save hook for sequential `inventoryItemUpdate`.
8. Replace mock-backed `useInventory` usage in the page with `useInventoryVariants`.
9. Replace `IInventoryListItem` typing in inventory table components with `InventoryVariantRow`.
10. Replace static pagination with `pageInfo`/`totalCount`.
11. Disable sort UI on columns that do not map to `VariantOrderField`.
12. Remove imports from `@/mocks/inventory/inventory-list` from inventory page flow.

## Deferred work

- `FilterWidget` integration.
- Search UX.
- Filter UX.
- Sorting by inventory-owned fields such as SKU, on-hand, unavailable, reserved, available.
- Bulk `inventoryItemsUpdate` mutation.
- Multi-warehouse editing.
- Product-level inventory totals.
- Import/export actions.
- Delete selected rows action.
- Creating/backfilling missing inventory items from the inventory table.

## Verification

- Inventory page no longer imports mock inventory data.
- `InventoryVariants` passes `orderBy` on every request.
- `orderBy[0]` is always `{ field: "productId", direction: "asc" }`.
- AG Grid does not sort locally.
- Cursor pagination resets to first page after sort changes.
- Sort is disabled while edits are pending.
- Columns without `VariantOrderField` mapping are not sortable.
- Save sends only `InventoryItemUpdateInput.stock` for `onHand`/`unavailable`.
- Run project-approved build only if code is implemented.
- Do not run `test` or `tsc` directly.
