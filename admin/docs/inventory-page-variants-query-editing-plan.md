# План интеграции Inventory Page через Variants Query и редактирование в таблице

## Цель

Перевести страницу `Inventory` с mock data на Admin GraphQL API так, чтобы таблица показывала список variants с product context и позволяла редактировать stock-поля прямо в AG Grid с batch save.

Первый API-backed шаг должен:

- использовать `catalogQuery.variants` как основной источник строк;
- показывать product context для каждой variant строки в плоской таблице;
- сохранить текущий UX inventory page: фильтры, cursor pagination, inline editing, floating save/discard panel;
- редактировать только inventory-owned fields через `inventoryMutation.inventoryItemUpdate`;
- не добавлять bulk backend mutation до подтверждения необходимости.

## Текущий baseline

- Страница: `admin/src/domains/inventory/inventory/page/page.tsx`.
- Hook: `admin/src/domains/inventory/inventory/hooks/use-inventory.ts` сейчас имитирует API и читает `mockInventoryList`.
- Editing state: `useInventoryEditStore` уже хранит pending changes по `itemId` и полям `onHand`/`unavailable`.
- Текущий `validateFieldChange` проверяет stock consistency на UI side. При API-backed интеграции его нужно сузить до presentation guards или убрать из save authority path: backend должен решать, допустимо ли изменение.
- UI: таблица уже использует AG Grid `readOnlyEdit`, `FloatingPanelStack` для save/discard и блокирует pagination при unsaved changes.
- Product module уже содержит `VariantFields`, `InventoryItemFields`, `INVENTORY_ITEM_UPDATE_MUTATION`, `useUpdateInventoryItems` и `INVENTORY_DEFAULT_WAREHOUSE_QUERY`. Для inventory page нельзя неявно импортировать mutation document из product module: нужно либо завести module-local operation document, либо явно оформить compatibility re-export. Существующий product `VariantFields` не включает `product` context и не должен расширяться тяжелыми полями ради inventory page.
- В текущей Admin schema у `Variant` нет отдельного поля `containerId`; доступен `Variant.product.id`. Если backend-домен использует термин `container id` для стабильного product-first порядка вариантов, API должен явно отдать этот идентификатор или зафиксировать, что для inventory page container id равен `Variant.product.id`.

## Архитектурные правила

- GraphQL operation documents для inventory page должны жить в `admin/src/domains/inventory/inventory/graphql`.
- Hooks владеют Apollo `useQuery`/`useMutation`, loading/error/refetch и нормализацией API errors.
- Components не импортируют mocks и не объявляют ad hoc GraphQL response types.
- Generated API types импортируются напрямую из `@/graphql/types`.
- UI-local row model допустим только как editor/table state, потому что таблице нужны derived fields и product context. Sorting/filtering/search для inventory list должны быть backend-side only.
- API-output view models не должны становиться вторым source of truth.
- `reserved` остается read-only system field.
- `available` может пересчитываться в UI только как preview/display value. Backend остается единственным источником бизнес-валидации и финального persisted state.
- UI не должен реализовывать backend business rules. Допустимы только presentation guards: number input, integer parsing, empty value handling и подсветка очевидного draft diff. Ограничения вроде stock consistency, unavailable <= onHand, reserved constraints, backorder policy и partial update atomicity должны проверяться backend use case и возвращаться через `userErrors`.
- Проверки реализации: не запускать `test` и `tsc`; при необходимости запускать build через project-approved flow.

## API-контракт чтения

Использовать top-level variants connection только если backend гарантирует стабильный default order по `containerId`/`product.id` и `variantId`:

Inventory page should define its own lightweight fragment, for example `InventoryVariantFields`, in `admin/src/domains/inventory/inventory/graphql/fragments.ts`. Do not extend the product module `VariantFields` just to add `product`, because that fragment is shared by product screens and changing it can increase unrelated query payloads.

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

Примечания:

- Search/filter UI не должен работать локально по загруженной странице. Если Admin generated schema/query types для `catalogQuery.variants` не поддерживают `where`/`orderBy`, search/filter/sort controls должны быть disabled или скрыты до обновления GraphQL contract/codegen.
- Если `catalogQuery.variants` не гарантирует default order по `product.id` + `variant.id`, для inventory page нужен backend change до UI-интеграции: добавить stable ordering в существующую connection или ввести `inventoryQuery.inventoryVariants`.
- `Variant.product` есть в schema и является обязательным полем, поэтому product context не требует дополнительного `products -> variants` обхода.
- `Variant.inventoryItem` читается прямо в `catalogQuery.variants` и является единственным source of truth для inventory item в первом шаге. Если поле вернуло `null`, строка отображается read-only и не участвует в save.

## Row model для таблицы

Создать UI-local type в inventory module, например `InventoryVariantRow`:

```ts
interface InventoryVariantRow {
  id: string; // Variant.id, используется как AG Grid row id
  variantId: string;
  containerId: string; // В первом шаге равно productId, если API не отдаёт отдельный container id
  productId: string;
  productTitle: string;
  productHandle: string | null;
  variantTitle: string | null;
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
}
```

Mapping rules:

| UI field | API source | Rule |
|---|---|---|
| `id` | `Variant.id` | Keep global variant id for row identity. |
| `containerId` | `Variant.product.id` or explicit API `containerId` | Required stable product-first sorting key. Do not synthesize a different container id in UI. |
| `productId` | `Variant.product.id` | Product context key. |
| `productTitle` | `Variant.product.title` | Product display label. |
| `variantTitle` | `Variant.title` | Display in variant column. |
| `sku` | `Variant.inventoryItem.sku` | Show empty state if item is missing. |
| `inventoryItemId` | `Variant.inventoryItem.id` | Required for save. |
| `warehouseStockId` | first relevant stock row id | Optional display/debug field. |
| `warehouseId` | default warehouse stock row or default warehouse query | Required for stock update. |
| `onHand` | `InventoryItem.stock[].quantityOnHand` | First step edits default warehouse only. |
| `unavailable` | `InventoryItem.stock[].unavailableQuantity` | Editable. |
| `reserved` | `InventoryItem.stock[].reservedQuantity` | Read-only. |
| `available` | calculated from row fields | Do not trust stale derived value after local edits. |

Default warehouse rule:

- Load default warehouse inside the query hook, preferably `useInventoryVariants`, via `INVENTORY_DEFAULT_WAREHOUSE_QUERY`.
- For every variant row, prefer `inventoryItem.stock.find(stock.warehouseId === defaultWarehouse.id)`.
- If stock row for default warehouse is absent, display zero values but keep `warehouseId = defaultWarehouse.id`.
- If default warehouse is absent, disable save and show a clear error.

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

`canEdit` is `false` when the default warehouse is missing, required query data failed to load, or the page is in another read-only condition. Row mapping depends on `defaultWarehouse.id`, so this logic should not be deferred to the save hook. The save hook receives rows/pending edits/default warehouse context that has already been resolved by `useInventoryVariants`.

## Product context в таблице

Первый API-backed шаг использует плоскую таблицу:

- Keep flat `rowData`: one row per `Variant`.
- Show product information in a visible Product/Variant column: product title, optional product handle, variant title, and variant media/empty state.
- Keep `containerId`/`productId` as hidden or non-primary data fields only when needed for stable product-first backend ordering.
- Keep visible stock columns focused on variant inventory: `Product / Variant`, `SKU`, `On hand`, `Unavailable`, `Reserved`, `Available`.
- Do not present product-level totals in the first step. Full-catalog totals require server filtering/pagination support; loaded-page totals can be added later as a separate explicit UI feature.

Pagination behavior:

- Continue using `CursorPagination`.
- `rangeStart`/`rangeEnd` are based on current page size and loaded count.
- Navigation is disabled while there are pending edits, as current page already does.
- Changing page discards no data implicitly; user must save or discard first.

## Сортировка и фильтрация

Sorting, filtering, and search are backend-side only. The inventory page must not implement local loaded-page sorting/filtering/search for the main list because cursor pagination makes that behavior misleading.

Backend/API contract needed for first API-backed step:

- `catalogQuery.variants` must accept Relay pagination plus `where` and `orderBy`, or the page must use a dedicated inventory-owned connection with equivalent cursor-stable filtering/sorting;
- generated Admin types must expose those variables before UI controls are enabled;
- filters/search from `FilterWidget` must map to backend `where` variables;
- AG Grid sort changes must map to backend `orderBy` variables and reset cursor pagination to the first page;
- if a column cannot be sorted backend-side, its sort UI must be disabled.

Обязательный default ordering для product-first inventory page:

- primary: `containerId` ascending;
- secondary: `variantId` ascending or backend-created stable variant order;
- cursor должен строиться по тем же ключам, иначе product context/order будет прыгать между страницами.

Если `containerId` не равен `Variant.product.id`, текущий GraphQL contract недостаточен: backend должен добавить поле в `Variant` или предоставить inventory-owned connection, где `containerId` является частью edge/node.

Первый шаг:

- request variants with backend `orderBy` beginning with `containerId`/`productId` and ending in stable variant key;
- treat user sort/filter/search changes as backend query changes;
- reset cursor pagination state when backend sort/filter/search changes;
- disable page navigation and backend sort/filter/search changes while there are pending edits;
- keep AG Grid local sorting disabled unless it is wired to backend `orderBy`.

Локально сортируемые колонки:

| Column | Field | Scope |
|---|---|---|
| Container ID | `containerId` | Backend-side only; default server/API order должен быть по этому ключу |
| Product | `productTitle` | Backend-side only if API supports product title sort/search |
| Variant | `variantTitle` | Backend-side only if API supports variant title sort/search |
| SKU | `sku` | Backend-side only через inventory-owned/search projection; disable until supported |
| On hand | `onHand` | Backend-side only через inventory-owned/search projection; disable until supported |
| Unavailable | `unavailable` | Backend-side only через inventory-owned/search projection; disable until supported |
| Reserved | `reserved` | Backend-side only через inventory-owned/search projection; disable until supported |
| Available | `available` | Backend-side only через inventory-owned/search projection; disable until supported |

Deferred backend-side sorting/filtering:

Для настоящей сортировки всей inventory выборки нужен backend/API контракт, например:

```graphql
query InventoryVariants(
  $first: Int
  $after: String
  $last: Int
  $before: String
  $orderBy: [InventoryVariantOrderBy!]
) {
  inventoryQuery {
    inventoryVariants(
      first: $first
      after: $after
      last: $last
      before: $before
      orderBy: $orderBy
    ) {
      edges {
        cursor
        node {
          containerId
          id
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

Backend-side sort/filter/search должен быть cursor-stable и начинаться с `containerId` для product-first page. Для inventory columns это не catalog-only задача: `onHand`, `unavailable`, `reserved`, `available` живут в inventory service и требуют либо inventory-owned variants inventory connection, либо materialized/search projection. До появления такого контракта пользовательская сортировка/фильтрация/search по этим колонкам должны быть disabled.

## Inline editing flow

Keep the existing `readOnlyEdit` pattern:

1. User edits `onHand` or `unavailable`.
2. `handleCellEditRequest` parses the numeric draft value and may show presentation-only warnings.
3. Store pending change in `useInventoryEditStore`.
4. `displayData` merges server rows with pending edits.
5. `availablePreview` recalculates immediately for display only.
6. Floating editing panel appears with change count.
7. Save maps changed rows to `InventoryItemUpdateInput[]`.
8. Mutations run sequentially through `useUpdateInventoryItems`.
9. On success, clear edits and refetch variants.
10. On backend `userErrors`/runtime errors, keep edits and show errors.

Editable fields:

- `onHand` maps to `input.stock.onHand`.
- `unavailable` maps to `input.stock.unavailable`.

Read-only fields:

- `reserved`;
- `available`;
- rows without `inventoryItemId` until edit preparation creates/loads an item.

Backend-owned rules:

- non-negative stock constraints;
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
- Creating or backfilling missing inventory items must be a separate explicit backend/UI flow, outside this page integration.

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
    filter-schema.ts
    page.tsx
  components/
```

Implementation steps:

1. Add inventory module GraphQL operations, including an inventory-local `InventoryVariantFields` fragment with `product` context and inventory-local `mutations.ts` for `inventoryItemUpdate` or an explicit compatibility re-export from the product module.
2. Add operation types derived from generated API types.
3. Replace mock-backed `useInventory` with `useInventoryVariants`; the hook loads variants plus default warehouse and returns `rows`, `defaultWarehouse`, `pageInfo`, `totalCount`, `loading`, `error`, `canEdit`, `readOnlyReason`, and `refetch`.
4. Add row mapper from `Variant` edge to `InventoryVariantRow`.
5. Add edit mapper from pending changes to `ApiInventoryItemUpdateInput[]`.
6. Keep default warehouse resolution in `useInventoryVariants`; save hook uses the already resolved row/default warehouse context and does not perform read-side row mapping.
7. Replace static pagination values with connection `pageInfo`/`totalCount`.
8. Render flat variant rows with product context and backend-side product-first sorting.
9. Wire FilterWidget/search and AG Grid sort only to backend `where`/`orderBy`; disable or hide controls for fields without backend support and reset cursor pagination when backend query variables change.
10. Replace mock save delay with `useUpdateInventoryItems`.
11. Remove imports from `@/mocks/inventory/inventory-list` from inventory page flow.

## Error handling

- Query error: show page-level empty/error state through existing layout conventions.
- Missing default warehouse: table can render read-only; save action is disabled with message.
- Missing `inventoryItem`: allow display, keep row read-only, and show a clear error if a save is attempted for that row.
- Mutation `userErrors`: aggregate messages, keep pending changes, do not call `onSaveSuccess`.
- Partial mutation failure: keep all pending changes. Because first implementation runs per-row mutations, the UI must refetch after any partial success and still show unresolved errors. Later bulk mutation can make this atomic.

## Deferred work

- Backend-side filters/search/sort for inventory-owned fields that are not supported by `catalogQuery.variants`.
- Bulk `inventoryItemsUpdate` mutation with transactional all-or-nothing semantics.
- Multi-warehouse editing.
- Product-level full-catalog inventory totals.
- Import/export actions.
- Delete selected rows action.

## Verification

- Manual review that inventory page no longer imports mock inventory data.
- Confirm generated schema supports `Variant.product` and `Variant.inventoryItem`.
- Run project-approved build only if a code implementation is made.
- Do not run `test` or `tsc` directly.
