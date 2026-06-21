# План интеграции Inventory Page через `catalogQuery.variants`

## Цель

Перевести страницу `Inventory` с mock data на существующий Admin GraphQL API без изменений backend.

В scope этого шага:

- читать строки через `catalogQuery.variants`;
- использовать cursor pagination из `VariantConnection` через общий FE API-backed Relay pagination слой;
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
| Variant id fallback | `id` | Supported |
| Default variant | `isDefault` | Supported |
| Created date | `createdAt` | Supported |
| Updated date | `updatedAt` | Supported |
| External system/id | `externalSystem`, `externalId` | Supported if shown |
| Variant title | none in current `VariantOrderField` | Do not expose as API sort |
| SKU | none in current `VariantOrderField` | Do not expose as API sort |
| On hand / unavailable / reserved / available | none in current `VariantOrderField` | Do not expose as API sort |

Sort changes:

- reset cursor pagination to the first page;
- are disabled while there are pending edits;
- refetch through `InventoryVariants` with the new `orderBy`.

## API-backed cursor pagination

Inventory page must not implement bespoke cursor/page state. Relay cursor pagination must be handled by a shared FE abstraction reused by all table pages that integrate with Relay Connection APIs.

Use or introduce a shared API-backed pagination layer, for example:

```text
admin/src/ui-kit/cursor-pagination/
  cursor-pagination.tsx          # existing presentational controls
  relay-cursor-pagination.tsx    # shared API-backed wrapper
  use-relay-cursor-pagination.ts # shared Relay cursor state/query variables
```

Naming/location can follow the existing `ui-kit/cursor-pagination` structure, but the behavior must be generic and not inventory-specific.

Shared responsibilities:

- keep `pageSize`;
- expose Relay query variables: `{ first, after, last, before }`;
- support next page with `{ first: pageSize, after: pageInfo.endCursor }`;
- support previous page with `{ last: pageSize, before: pageInfo.startCursor }`;
- clear the opposite cursor/direction variables on navigation;
- reset to first page when sort, filter, search, or another caller-provided reset key changes;
- reset to first page when page size changes;
- derive `rangeStart` and `rangeEnd` from current page position, loaded rows count, `pageSize`, and `totalCount`;
- use `pageInfo.hasNextPage` and `pageInfo.hasPreviousPage` for navigation availability;
- support disabling pagination while caller reports unsaved edits or saving state;
- accept generic `ApiPageInfo`/Relay `PageInfo` shape and `totalCount`, not inventory-specific types.

Inventory-specific wiring:

- `InventoryPage` uses the shared Relay pagination hook/component.
- `useInventoryVariants` receives pagination variables from the shared hook and passes them directly to `InventoryVariants`.
- `useInventoryVariants` returns `pageInfo`, `totalCount`, and current page rows, but does not own cursor stack, page index, or range calculation.
- Static pagination values must be removed.
- Pagination must be API-backed: changing page or page size triggers `InventoryVariants` with new Relay variables; the grid row order and page contents always come from the API response.
- Pagination controls are disabled while there are unsaved edits.

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
2. `handleCellEditRequest` parses integer input and keeps the existing FE `validateFieldChange` behavior.
3. UI stores pending change in `useInventoryEditStore`.
4. `displayData` merges API rows with pending edits.
5. `available` preview recalculates as `onHand - unavailable - reserved`.
6. Floating save/discard panel appears.
7. Save maps pending row edits to `InventoryItemUpdateInput[]`.
8. Mutations run sequentially through inventory-local save hook.
9. Full success clears edits and refetches variants.
10. Failed rows keep their edits and show backend `userErrors` or runtime errors.

FE keeps the current `validateFieldChange` consistency guard for inline edits: edits that make `onHand`, `unavailable`, or calculated `available` invalid are rejected before entering the pending edit store. Backend remains the final authority during save and may return additional `userErrors`.

## Edit store migration

`useInventoryEditStore` must be extended before wiring the real save flow. The current store only tracks `edits` and `status`; API-backed partial save needs row-level error state so failed rows can remain pending while successful rows are cleared.

Add store state:

```ts
type InventoryRowSaveError = {
  message: string;
  code?: string | null;
  field?: readonly string[] | null;
};

interface InventoryEditStore {
  edits: Record<string, ItemEdits>;
  rowErrors: Record<string, InventoryRowSaveError[]>;
  status: "idle" | "saving";
}
```

Add or equivalent store actions:

- `setRowErrors(rowId, errors)` stores backend `userErrors` or runtime errors for one row;
- `clearRowErrors(rowId)` clears errors when the row is edited again or discarded;
- `clearSuccessfulEdits(rowIds)` removes only successfully saved row edits and their errors;
- `finishSaving()` sets `status` back to `"idle"` without clearing all edits;
- keep `onSaveSuccess()` only for full success, where all edits and row errors are cleared.

Rules:

- `setFieldValue` clears `rowErrors[itemId]` when the user changes that row after a failed save;
- `discardItem` clears both `edits[itemId]` and `rowErrors[itemId]`;
- `discardAll` clears all edits, all row errors, and resets status;
- partial failure must not call `onSaveSuccess()`;
- the floating panel may show aggregated error text, but row-level errors remain in the store as the source of truth for failed rows.

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
3. Add or reuse shared API-backed Relay cursor pagination hook/component for table pages.
4. Add `useInventoryVariants` with variants query, default warehouse query, explicit `orderBy`, shared Relay pagination variables, loading/error handling, and row mapping. Do not put inventory-local cursor stack/range logic into this hook.
5. Add row mapper from `VariantEdge` to `InventoryVariantRow`.
6. Add sort mapper from AG Grid sort state to `VariantOrderByInput[]`, always prepending `{ field: "productId", direction: "asc" }`.
7. Add edit mapper to `ApiInventoryItemUpdateInput[]`.
8. Migrate `useInventoryEditStore` to track row-level save errors and partial-success cleanup actions.
9. Add inventory-local save hook for sequential `inventoryItemUpdate`.
10. Replace mock-backed `useInventory` usage in the page with `useInventoryVariants`.
11. Replace `IInventoryListItem` typing in inventory table components with `InventoryVariantRow`.
12. Replace static pagination with the shared Relay cursor pagination layer wired to `pageInfo`/`totalCount`.
13. Disable sort UI on columns that do not map to `VariantOrderField`.
14. Remove imports from `@/mocks/inventory/inventory-list` from inventory page flow.

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
- Cursor pagination is driven by the shared API-backed Relay pagination hook/component, not inventory-local state.
- Next page sends `{ first: pageSize, after: pageInfo.endCursor }`.
- Previous page sends `{ last: pageSize, before: pageInfo.startCursor }`.
- Page size changes reset to first page.
- Cursor pagination resets to first page after sort changes.
- Sort is disabled while edits are pending.
- Pagination is disabled while edits are pending.
- Columns without `VariantOrderField` mapping are not sortable.
- Save sends only `InventoryItemUpdateInput.stock` for `onHand`/`unavailable`.
- Full save success clears all edits and all row errors.
- Partial save success clears only successful row edits and keeps failed row edits plus row errors.
- Editing or discarding a failed row clears that row's stored save errors.
- Run project-approved build only if code is implemented.
- Do not run `test` or `tsc` directly.
