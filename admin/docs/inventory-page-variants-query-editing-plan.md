# План интеграции Inventory Page через готовую Variants Query и редактирование в таблице

## Цель

Перевести страницу `Inventory` с mock data на текущий Admin GraphQL API без изменений backend.

Первый API-backed шаг должен:

- использовать готовую `catalogQuery.variants` как источник строк;
- показывать product context для каждой variant строки в плоской AG Grid таблице;
- сохранить текущий UX inventory page: cursor pagination, inline editing, floating save/discard panel, блокировку навигации при unsaved changes;
- редактировать только inventory-owned поля через `inventoryMutation.inventoryItemUpdate`;
- не добавлять backend bulk mutation, новую inventory connection или изменения контракта `catalogQuery.variants`.

## Текущий baseline

- Страница: `admin/src/domains/inventory/inventory/page/page.tsx`.
- Hook: `admin/src/domains/inventory/inventory/hooks/use-inventory.ts` сейчас имитирует API и читает `mockInventoryList`.
- Editing state: `useInventoryEditStore` хранит pending changes по `itemId` и полям `onHand`/`unavailable`.
- Текущий `validateFieldChange` проверяет stock consistency на UI side. При API-backed интеграции его нужно сузить до presentation guards или убрать из save authority path: backend должен решать, допустимо ли изменение.
- UI: таблица уже использует AG Grid `readOnlyEdit`, `FloatingPanelStack` для save/discard и блокирует pagination при unsaved changes.
- Product module уже содержит `InventoryItemFields`, `INVENTORY_ITEM_UPDATE_MUTATION`, `useUpdateInventoryItems` и `INVENTORY_DEFAULT_WAREHOUSE_QUERY`. Для inventory page нельзя неявно импортировать operation document из product module: нужно завести module-local operation document или явно оформить compatibility re-export.
- Существующий product `VariantFields` не включает весь product context, нужный inventory page, и не должен расширяться тяжелыми полями ради inventory page.
- В текущей Admin schema у `Variant` нет отдельного поля `containerId`; для inventory page `containerId` в UI row model равен `Variant.product.id`.

## Архитектурные правила

- GraphQL operation documents для inventory page должны жить в `admin/src/domains/inventory/inventory/graphql`.
- Hooks владеют Apollo `useQuery`/`useMutation`, loading/error/refetch и нормализацией API errors.
- Components не импортируют mocks и не объявляют ad hoc GraphQL response types.
- Generated API types импортируются напрямую из `@/graphql/types`.
- UI-local row model допустим только как editor/table state, потому что AG Grid нужны derived fields и product context.
- API-output view models не должны становиться вторым source of truth.
- `reserved` остается read-only system field.
- `available` может пересчитываться в UI только как preview/display value. Backend остается единственным источником бизнес-валидации и финального persisted state.
- UI не должен реализовывать backend business rules. Допустимы только presentation guards: number input, integer parsing, empty value handling и подсветка draft diff.
- Проверки реализации: не запускать `test` и `tsc`; при необходимости запускать build через project-approved flow.

## API-контракт чтения

Использовать готовую top-level variants connection:

```graphql
query InventoryVariants($first: Int, $after: String, $last: Int, $before: String) {
  catalogQuery {
    variants(first: $first, after: $after, last: $last, before: $before) {
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
            ...InventoryItemFields
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

Inventory page should define its own lightweight fragment, for example `InventoryVariantFields`, in `admin/src/domains/inventory/inventory/graphql/fragments.ts`. Do not extend product module `VariantFields` just to add inventory-page product context, because that fragment is shared by product screens and changing it can increase unrelated query payloads.

Примечания:

- `Variant.product` есть в schema и является обязательным полем, поэтому product context не требует дополнительного `products -> variants` обхода.
- `Variant.inventoryItem` читается прямо в `catalogQuery.variants` и является единственным source of truth для inventory item в первом шаге.
- Если `Variant.inventoryItem` вернул `null`, строка отображается read-only и не участвует в save.
- Фронтенд не добавляет новый backend contract: inventory page использует готовые query variables актуального `catalogQuery.variants` API.
- Стабильный product-first порядок не является backend default. Frontend обязан всегда передавать sorting в API: первым sort key идет `productId`, вторым идет активное поле сортировки таблицы.
- Если локальные generated types не отражают актуальный API, сначала нужно обновить generated GraphQL types через project-approved codegen/build flow, а не писать ad hoc types руками.

## Row model для таблицы

Создать UI-local type в inventory module, например `InventoryVariantRow`:

```ts
interface InventoryVariantRow {
  id: string; // Variant.id, используется как AG Grid row id
  variantId: string;
  containerId: string; // В первом шаге равно productId
  productId: string;
  productTitle: string;
  productHandle: string | null;
  variantTitle: string | null;
  variantHandle: string | null;
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

| UI field | API source | Rule |
|---|---|---|
| `id` | `Variant.id` | Keep global variant id for row identity. |
| `variantId` | `Variant.id` | Explicit variant key for mutation/error mapping context. |
| `containerId` | `Variant.product.id` | UI-only grouping/context key. Do not synthesize another id. |
| `productId` | `Variant.product.id` | Product context key. |
| `productTitle` | `Variant.product.title` | Product display label. |
| `productHandle` | `Variant.product.handle` | Optional secondary label/link context. |
| `variantTitle` | `Variant.title` | Display in variant column. |
| `variantHandle` | `Variant.handle` | Optional fallback/secondary label. |
| `imageUrl` | first variant media file url | Use empty state if absent. |
| `sku` | `Variant.inventoryItem.sku` | Show empty state if item is missing. |
| `inventoryItemId` | `Variant.inventoryItem.id` | Required for save. |
| `warehouseStockId` | selected stock row id | Optional display/debug field. |
| `warehouseId` | default warehouse stock row or default warehouse query | Required for stock update. |
| `onHand` | selected stock row `quantityOnHand` | First step edits default warehouse only. |
| `unavailable` | selected stock row `unavailableQuantity` | Editable. |
| `reserved` | selected stock row `reservedQuantity` | Read-only. |
| `available` | selected stock row `availableForSale` or UI preview | Do not trust stale derived value after local edits. |

Default warehouse rule:

- Load default warehouse inside `useInventoryVariants` via inventory-local query equivalent to `INVENTORY_DEFAULT_WAREHOUSE_QUERY`.
- For every variant row, prefer `inventoryItem.stock.find(stock.warehouseId === defaultWarehouse.id)`.
- If stock row for default warehouse is absent, display zero values but keep `warehouseId = defaultWarehouse.id`.
- If default warehouse is absent, table can render read-only, save is disabled, and the page shows a clear error.

`useInventoryVariants` should own both data dependencies needed to build rows:

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

`canEdit` is `false` when default warehouse is missing, required query data failed to load, or the page is in another read-only condition. Row mapping depends on `defaultWarehouse.id`, so this logic should not be deferred to the save hook.

## Product context в таблице

Первый API-backed шаг использует плоскую таблицу:

- Keep flat `rowData`: one row per `Variant`.
- Show product information in a visible Product/Variant column: product title, optional product handle, variant title, and variant media/empty state.
- Keep visible stock columns focused on variant inventory: `Product / Variant`, `SKU`, `On hand`, `Unavailable`, `Reserved`, `Available`.
- Do not present product-level totals in the first step. Full-catalog totals require server aggregation semantics and should be separate explicit work.

Pagination behavior:

- Continue using `CursorPagination`.
- `rangeStart`/`rangeEnd` are based on current page size, current page index tracked by UI, and loaded count.
- Navigation uses `pageInfo.startCursor`/`pageInfo.endCursor`.
- Navigation is disabled while there are pending edits, as current page already does.
- Changing page discards no data implicitly; user must save or discard first.

## Sorting в первом шаге

Backend не меняется в рамках этого плана. Inventory page использует готовый variants query API и передает sorting через его существующие variables. Страница не должна делать local loaded-page sorting для main list: cursor pagination делает такое поведение misleading.

First-step behavior:

- Keep AG Grid local sorting disabled; column sort changes are handled by updating variants query variables and refetching from the first page.
- Every variants query must include product-first sorting. The first order key is always `productId` ascending.
- The second order key is the active table sort field, for example variant `title`, `sku`, `onHand`, `unavailable`, `reserved`, or `available`, if the API supports that field.
- If the user clears column sorting, keep deterministic fallback sorting as `productId` first and a stable variant key second.
- Sort changes reset cursor pagination to the first page.
- Sort changes are disabled while there are pending edits.
- Columns that cannot be represented by the current API sort input must have AG Grid sort UI disabled.

Out of scope for this plan:

- `FilterWidget` integration;
- search UX;
- filter UX;
- mapping search/filter values to variants query variables.

Required sort shape:

```ts
const orderBy = [
  { productId: "ASC" },
  activeSort ?? { variantId: "ASC" },
];
```

The exact TypeScript field names must come from generated Admin API types. Do not invent frontend-only sort field names in the GraphQL variables.

## Inline editing flow

Keep the existing `readOnlyEdit` pattern:

1. User edits `onHand` or `unavailable`.
2. `handleCellEditRequest` parses the numeric draft value and applies presentation-only guards.
3. Store pending change in `useInventoryEditStore`.
4. `displayData` merges server rows with pending edits.
5. `availablePreview` recalculates immediately for display only.
6. Floating editing panel appears with change count.
7. Save maps changed rows to `ApiInventoryItemUpdateInput[]`.
8. Mutations run sequentially through inventory-local save hook.
9. On full success, clear edits and refetch variants.
10. On backend `userErrors`/runtime errors, keep unresolved edits and show errors.

Editable fields:

- `onHand` maps to `input.stock.onHand`.
- `unavailable` maps to `input.stock.unavailable`.

Read-only fields:

- `reserved`;
- `available`;
- rows without `inventoryItemId`;
- all rows when default warehouse is missing.

Backend-owned rules:

- non-negative stock constraints beyond input parsing;
- unavailable/reserved/on-hand consistency;
- backorder behavior;
- reserved quantity authority;
- stock change rejection;
- transactional behavior across stock/SKU/cost/physical fields.

UI may preview `available = onHand - unavailable - reserved`, but must not treat that preview as an authorization to save. The backend response decides whether the edit is accepted.

## Save input mapping

Add a mapper in `admin/src/domains/inventory/inventory/mappers`, for example `inventory-variant-edit.mapper.ts`.

Do not reuse `admin/src/domains/inventory/products/mappers/product-variant-inventory.mapper.ts` as-is. That mapper belongs to the product variant editor flow: it can update SKU and performs UI-side stock consistency checks such as negative availability rejection. The inventory page mapper must have a narrower scope:

- accept only pending `onHand`/`unavailable` edits;
- never send SKU, cost, weight, dimensions, `reserved`, or `available`;
- only parse/preserve integer draft values and calculate deltas;
- leave stock consistency and availability acceptance to `inventoryMutation.inventoryItemUpdate` `userErrors`.

Input to mapper:

- original API-backed rows;
- pending edits from `useInventoryEditStore`;
- default warehouse id.

Output:

```ts
ApiInventoryItemUpdateInput[]
```

Mapping example:

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

- Skip rows with no actual delta.
- Do not send `reserved`.
- Do not send `available`.
- Do not send SKU/cost/weight/dimensions from inventory page.
- If `inventoryItemId` is missing, skip that row from save and report that the variant has no inventory item loaded.
- Creating or backfilling missing inventory items must be a separate explicit flow, outside this page integration.

Partial save rule:

- Because first implementation runs per-row mutations, the save hook must return per-input success/error information.
- If every changed row succeeds, clear all edits and refetch.
- If some rows fail, clear edits only for rows confirmed successful, keep failed row edits, refetch, and show aggregated errors.
- Do not call `onSaveSuccess` blindly on partial success.

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

1. Add inventory module GraphQL operations: `InventoryVariants`, default warehouse query, and inventory-local `InventoryItemUpdate` mutation.
2. Add operation types derived from generated API types.
3. Add `useInventoryVariants`; the hook loads variants plus default warehouse and returns `rows`, `defaultWarehouse`, `pageInfo`, `totalCount`, `loading`, `error`, `canEdit`, `readOnlyReason`, and `refetch`.
4. Add row mapper from `Variant` edge to `InventoryVariantRow`.
5. Add edit mapper from pending changes to `ApiInventoryItemUpdateInput[]`.
6. Add inventory-local save hook, for example `useSaveInventoryVariantEdits`, instead of importing product module save hook directly.
7. Replace mock-backed `useInventory` usage in the page with API-backed hook.
8. Replace `IInventoryListItem` component typing with `InventoryVariantRow`.
9. Replace static pagination values with connection `pageInfo`/`totalCount`.
10. Render flat variant rows with product context.
11. Wire table sort controls to variants query variables; sorting must always prepend `productId` before the active table sort field.
12. Replace mock save delay with actual `inventoryItemUpdate` save flow.
13. Remove imports from `@/mocks/inventory/inventory-list` from inventory page flow.

## Error handling

- Query error: show page-level empty/error state through existing layout conventions.
- Missing default warehouse: table can render read-only; save action is disabled with message.
- Missing `inventoryItem`: allow display, keep row read-only, and show a clear error if a save is attempted for that row.
- Mutation `userErrors`: aggregate messages, keep failed row edits, do not clear all edits blindly.
- Runtime mutation errors: keep related edits and show an unexpected error message.
- Partial mutation failure: clear successful row edits only, keep failed row edits, refetch, and show unresolved errors.

## Deferred work

- `FilterWidget` integration.
- Search UX and mapping search values to variants query variables.
- Filter UX and mapping filter values to variants query variables.
- Additional sort fields not yet exposed by the current variants query API.
- Bulk `inventoryItemsUpdate` mutation with transactional all-or-nothing semantics.
- Multi-warehouse editing.
- Product-level full-catalog inventory totals.
- Import/export actions.
- Delete selected rows action.
- Creating/backfilling missing inventory items from the inventory table.

## Verification

- Manual review that inventory page no longer imports mock inventory data.
- Confirm generated schema/types expose the actual `catalogQuery.variants` fields used by `InventoryVariants`.
- Confirm `Variant.product` and `Variant.inventoryItem` are selected by the inventory-local operation.
- Confirm AG Grid does not perform local loaded-page sorting.
- Confirm variants query variables always include product-first sorting: `productId` first, active table sort field second.
- Confirm e2e coverage verifies product-first sorting behavior.
- Run project-approved build only if a code implementation is made.
- Do not run `test` or `tsc` directly.
