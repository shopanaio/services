# Product Variants Editor Write Path Integration Plan

## Контекст

`product-variants-editor-read-path-integration-plan.md` уже реализован: variants section читает API-backed variants, перед открытием `Edit variants` загружает все variants продукта и передаёт их в общий `EditVariantsModal`.

Следующий шаг - убрать read-only save stub при открытии модалки из variants section и подключить реальное сохранение всех API-backed полей, которые пользователь может вводить прямо в таблице. Pricing и inventory уже подключены в отдельных restricted modal flows; общий variants editor должен переиспользовать их API contracts/mappers, а не оставаться physical-only.

## Цель

Интегрировать API-backed save для общего `Edit variants` entry point из `ProductDetailsCard -> VariantsTableSection`:

- `Edit variants` открывает тот же `EditVariantsModal`, но больше не показывает read-only save message;
- все поля, которые можно изменить прямо в таблице и которые имеют текущий API-backed write contract, сохраняются по одному `Save`;
- картинки/media остаются вне scope этого шага;
- read-only/calculated fields не становятся draft edits;
- поля без API-backed write contract не должны быть editable, иначе появится illusion of save;
- после успешного сохранения product details, variants read path и затронутые widgets обновляются.

## Scope

В scope общего variants editor write path входят все API-backed editable table fields:

### Pricing-owned fields

- `price`;
- `compareAtPrice`.

Сохранять через существующий Catalog product update path и `prepareChangedVariantPricingInputs`.

### Inventory-owned item fields

- `sku`;
- `costPrice`;
- `weight`;
- `length`;
- `width`;
- `height`.

Сохранять через `inventoryMutation.inventoryItemUpdate`.

### Inventory-owned stock fields

- `onHand`;
- `unavailable`.

Сохранять через `inventoryMutation.inventoryItemUpdate.stock` для явно выбранного warehouse scope. Для общего variants editor использовать default warehouse, как это уже делает Inventory widget edit flow.

### Read-only table fields

Эти поля могут быть видимыми, но не являются direct table inputs и не должны попадать в draft edits:

- `reserved` - managed by order/reservation system;
- `available` - calculated;
- dynamic option columns - сейчас read-only, option value editing требует picker UX и options contract before making them editable;
- `title` / title column - display-only в текущем grid.

### Out of scope

- картинки/media reorder/upload - текущая grid media column остаётся read-only; для save нужен отдельный media editor flow через `variantUpdateMedia`.

### Schema gap

`barcode` сейчас есть в UI config как editable placeholder, но текущая Admin schema не возвращает и не обновляет barcode. Чтобы выполнить правило "всё, что вводится прямо в таблице, должно сохраняться", implementation должен выбрать один из двух вариантов:

1. сделать `barcode` read-only/hidden и убрать его из selectable/editable columns до появления API contract;
2. либо расширить backend/schema/read fragment/write mapper для barcode и включить его в этот же save path.

Нельзя оставлять `barcode` editable без API-backed save.

## Архитектурные правила

- Frontend GraphQL operations остаются в `admin/src/domains/inventory/products/graphql`.
- Hooks владеют `useQuery`/`useMutation`, loading/error/refetch и нормализацией API errors.
- Components получают generated API types напрямую из `@/graphql/types`.
- Mappers конвертируют editor rows в API inputs, но не выполняют GraphQL calls.
- Pricing-owned fields сохранять через существующий Catalog product update pricing branch.
- Inventory-owned fields сохранять через `inventoryMutation.inventoryItemUpdate`, а не через `catalogMutation.productUpdate`.
- Несмотря на наличие legacy branches `ProductUpdateInput.variants[].inventory/dimensions`, общий variants editor не должен писать inventory-owned fields через Catalog boundary.
- Не запускать `test` и `tsc`. Если нужна машинная проверка, использовать build через project tooling.

## Текущий baseline

- `useProductModals.editVariants` уже:
  - блокирует повторное открытие через `isEditVariantsLoading`;
  - загружает все variants через `useProductVariantsLoader`;
  - передаёт `productId`, `variants`, `productOptions`, `defaultCurrency` в `openEditVariantsModal`;
  - передаёт `onSave` stub с сообщением `Variant save is read-only in this integration`.
- `EditVariantsModal` уже:
  - принимает `onSave?: (rows) => boolean | void | Promise<boolean | void>`;
  - показывает submit loading;
  - закрывается только если `onSave` не вернул `false`;
  - сохраняет edits в store при `false`.
- `InventorySection` уже показывает пример API-backed save через:
  - `useDefaultWarehouse`;
  - `useEnsureVariantInventoryItems`;
  - `useUpdateInventoryItems`;
  - `prepareChangedVariantInventoryInputs`;
  - `variantEditorScope` для warehouse-specific stock values.
- `PricingBlock` уже показывает пример API-backed save через:
  - `useUpdateProduct`;
  - `prepareChangedVariantPricingInputs`;
  - restricted `availableColumns`.

## API Write Contracts

### Pricing

Использовать существующий Catalog product update contract:

```ts
const operations: ApiProductUpdateInput = {
  variants: prepareChangedVariantPricingInputs(
    rows,
    hydratedVariants,
    defaultCurrency,
  ),
};
```

Rules:

- `price` is required when pricing changes.
- `compareAtPrice` can be set or cleared.
- `defaultCurrency` is required when a pricing change is sent.
- Не отправлять pricing branch, если `price` и `compareAtPrice` не изменились.

### Inventory item, stock, cost, physical fields

Использовать существующую mutation:

```graphql
mutation InventoryItemUpdate($input: InventoryItemUpdateInput!) {
  inventoryMutation {
    inventoryItemUpdate(input: $input) {
      inventoryItem {
        ...InventoryItemFields
      }
      userErrors {
        ...UserErrorFields
      }
    }
  }
}
```

Для одного variant строить один merged `ApiInventoryItemUpdateInput` с изменёнными branches:

```ts
const input: ApiInventoryItemUpdateInput = {
  id: inventoryItem.id,
  sku,
  stock: {
    warehouseId,
    onHand,
    unavailable,
  },
  unitCost: {
    currency: defaultCurrency,
    amountMinor: row.costPrice,
  },
  weight: {
    weightGrams: row.weight,
  },
  dimensions: {
    lengthMm: row.length,
    widthMm: row.width,
    heightMm: row.height,
  },
};
```

Rules:

- `id` - `variant.inventoryItem.id`, не `variant.id`.
- Если API variant не имеет `inventoryItem`, перед открытием edit modal явно гидрировать его через `useEnsureVariantInventoryItems`.
- `inventoryItemByVariant` имеет backend side effect, поэтому использовать его только в explicit edit preparation flow, не в passive render.
- `stock.warehouseId` - default warehouse id, resolved before opening editor.
- `onHand` and `unavailable` are non-negative integers.
- `sku` can be set or cleared (`""` -> `null`).
- `costPrice` maps to `unitCost.amountMinor`; `defaultCurrency` is required when cost changes.
- `costPrice` can be set to `0`; clearing an existing unit cost is not supported by current API input and must keep the modal open with an error.
- `weight.weightGrams` хранится и редактируется в base unit `g`.
- `dimensions.*Mm` хранятся и редактируются в base unit `mm`.
- `weight`, `length`, `width`, `height` must be positive integers when sent.
- Because `InventoryItemDimensionsInput` requires all three dimensions, saving dimensions requires all of `length`, `width`, and `height`.
- Clearing existing weight/dimensions is not supported by current API input and must keep the modal open with an error.
- Не отправлять `trackInventory` или `continueSellingWhenOutOfStock` из общего variants save.

## Field Support Matrix

| Column | General variants modal save | Owner/API |
|---|---:|---|
| `price` | yes | `ProductUpdateInput.variants[].pricing.amountMinor` |
| `compareAtPrice` | yes | `ProductUpdateInput.variants[].pricing.compareAtMinor` |
| `sku` | yes | `InventoryItemUpdateInput.sku` |
| `onHand` | yes | `InventoryItemUpdateInput.stock.onHand` |
| `unavailable` | yes | `InventoryItemUpdateInput.stock.unavailable` |
| `costPrice` | yes | `InventoryItemUpdateInput.unitCost.amountMinor` |
| `weight` | yes | `InventoryItemUpdateInput.weight.weightGrams` |
| `length` | yes | `InventoryItemUpdateInput.dimensions.lengthMm` |
| `width` | yes | `InventoryItemUpdateInput.dimensions.widthMm` |
| `height` | yes | `InventoryItemUpdateInput.dimensions.heightMm` |
| `media` | no | pictures/media flow is out of scope |
| option columns | no while read-only | not direct table inputs in current grid |
| `reserved` | no | read-only/order-managed |
| `available` | no | calculated |
| `barcode` | no until schema contract exists | must not remain editable without API-backed save |
| `title` | no | display-only column |

## Modal Editability Contract

The general variants modal should allow editing every API-backed table input covered by this plan:

```ts
editableColumns: [
  "price",
  "compareAtPrice",
  "sku",
  "onHand",
  "unavailable",
  "costPrice",
  "weight",
  "length",
  "width",
  "height",
]
```

Keep `availableColumns` separate from write scope:

- `availableColumns` controls visibility for restricted modal modes.
- `editableColumns` controls which visible fields can enter draft edits.
- For the general variants entry point, all read-path columns can remain visible according to user column settings.
- Pricing and Inventory restricted modals keep their current behavior by passing their own restricted `availableColumns` and either omitting `editableColumns` or passing the same list.

Implementation must guard every write path into the editor store:

- AG Grid `editable`;
- custom cell selection paste/delete/increment;
- direct `onSetFieldValue`.

Save button must reflect only edits from fields with API-backed save support. A non-saveable visible field must not create local draft edits.

## Inventory/Variant Mapper

Replace the physical-only mapper idea with a combined inventory item mapper, for example:

```text
admin/src/domains/inventory/products/mappers/product-variant-inventory-item.mapper.ts
```

Suggested API:

```ts
interface PrepareChangedVariantInventoryItemInputsParams {
  rows: VariantEditorSaveRow[];
  variants: ApiVariant[];
  warehouseId: string;
  defaultCurrency?: CurrencyCode | null;
}

function prepareChangedVariantInventoryItemInputs(
  params: PrepareChangedVariantInventoryItemInputsParams,
): ApiInventoryItemUpdateInput[]
```

Mapping rules:

- Build `variantsById` from loaded `ApiVariant[]`.
- Skip rows whose variant is not in the loaded variants list.
- Require `variant.inventoryItem`; if missing after hydration, throw a user-visible error.
- Compare `sku` against `variant.inventoryItem.sku ?? null`.
- Compare stock against the warehouse stock row matching `warehouseId`.
- Validate stock values as non-negative integers and reject negative availability.
- Compare `costPrice` against `variant.inventoryItem.unitCost?.amountMinor ?? null`.
- Compare physical fields against:
  - `variant.inventoryItem.weight?.weightGrams ?? null`;
  - `variant.inventoryItem.dimensions?.lengthMm ?? null`;
  - `variant.inventoryItem.dimensions?.widthMm ?? null`;
  - `variant.inventoryItem.dimensions?.heightMm ?? null`.
- Emit at most one `ApiInventoryItemUpdateInput` per inventory item, merging changed `sku`, `stock`, `unitCost`, `weight`, and `dimensions` branches.
- If no inventory-owned fields changed, return an empty input list.
- Do not include price, media, options, title, or barcode in this mapper.

Keep the existing `prepareChangedVariantInventoryInputs` for the restricted Inventory widget flow unless the implementation can extend it without changing its behavior.

## Pricing Mapper

Reuse existing `prepareChangedVariantPricingInputs`.

Required adjustment:

- Ensure it only reads `price` and `compareAtPrice`.
- Do not include inventory-owned fields.
- If no pricing fields changed, return an empty input list.

## Save Flow

Update `useProductModals`:

1. Import and use:
   - `useDefaultWarehouse`;
   - `useEnsureVariantInventoryItems`;
   - `useUpdateInventoryItems`;
   - `useUpdateProduct`;
   - `prepareChangedVariantPricingInputs`;
   - `prepareChangedVariantInventoryItemInputs`.
2. In `handleEditVariants`:
   - keep a preparing guard covering the full preparation flow, not only `loadAllProductVariants`;
   - `loadAllProductVariants(product)`;
   - `ensureVariantInventoryItems(loadedVariants)`;
   - resolve default warehouse via `defaultWarehouse ?? refetchDefaultWarehouse()`;
   - open `EditVariantsModal` with hydrated variants, default warehouse scope, and full API-backed `editableColumns`.
3. Pass `variantEditorScope: { type: "inventory", warehouseId }` so `onHand`/`unavailable` rows represent the same default warehouse that save will update.
4. Replace read-only `onSave` stub with async save:
   - build `pricingUpdates` via `prepareChangedVariantPricingInputs(rows, hydratedVariants, defaultCurrency)`;
   - build `inventoryInputs` via `prepareChangedVariantInventoryItemInputs({ rows, variants: hydratedVariants, warehouseId, defaultCurrency })`;
   - if any mapper throws, show `message.error(...)` and return `false`;
   - if both lists are empty, show `message.info("No variant changes to save")` and return `true`;
   - if `pricingUpdates.length > 0`, call `updateProduct({ productId, expectedRevision, operations: { variants: pricingUpdates } })`;
   - if pricing update returns errors, show the first error and return `false` before inventory mutation;
   - if `inventoryInputs.length > 0`, call `updateInventoryItems(inventoryInputs)`;
   - if inventory update returns errors, show the first normalized error and return `false`;
   - refresh product details via `options.onProductRefresh?.()`;
   - refresh/load variants read path after success if Apollo cache does not make rows visible immediately;
   - refresh pricing widget when pricing changed;
   - refresh inventory widget when stock, SKU, cost, or physical fields changed;
   - show success/warning based on refresh result;
   - return `true` to let `EditVariantsModal` close and reset edits.

Suggested messages:

- no changes: `No variant changes to save`;
- success: `Variant changes saved`;
- save failure: first API/user error message;
- refresh failure: `Variant changes saved, but refresh failed`.

Partial failure note:

- There is no single transaction across Catalog product update and Inventory item updates.
- Run Catalog pricing update first. If it fails, do not run Inventory updates.
- If pricing succeeds and inventory fails, keep the modal open, show the inventory error, and refresh data so already-applied pricing changes are visible.

## Refresh And Cache

After successful save:

- `ProductUpdate` returns product mutation result fields and updates pricing data by variant.
- `InventoryItemUpdate` returns `...InventoryItemFields`, so Apollo can update normalized `InventoryItem` records by ID.
- `onProductRefresh` remains required because product details, variants table, and single-variant shipping section read nested `variant.inventoryItem` fields through product queries.
- Pricing widget refresh is required when `price` or `compareAtPrice` changed.
- Inventory widget refresh is required when `sku`, `onHand`, `unavailable`, `costPrice`, `weight`, or dimensions changed.

## Implementation Steps

1. Add `editableColumns?: VariantColumnField[]` to `IEditVariantsModalPayload`.
2. Pass `editableColumns` through `EditVariantsModal` and `VariantsEditorGrid`.
3. Update `useVariantsColumns` so editability is scoped independently from column visibility.
4. Guard `VariantsEditorGrid.handleSetFieldValue` so non-editable fields cannot enter `useVariantsEditorStore.edits`.
5. Pass a filtered `selectableColumns` list to `EditorGrid` so paste/delete/increment cannot edit fields outside `editableColumns`.
6. Resolve the `barcode` schema gap:
   - either make `barcode` non-editable/remove from selectable columns;
   - or add API-backed read/write contract and mapper support before enabling it.
7. Add `product-variant-inventory-item.mapper.ts` and export it from `mappers/index.ts`.
8. Implement inventory item mapper validation and changed-input detection for `sku`, `onHand`, `unavailable`, `costPrice`, `weight`, `length`, `width`, `height`.
9. Reuse `prepareChangedVariantPricingInputs` for `price` and `compareAtPrice`.
10. Update `useProductModals.editVariants`:
    - hydrate missing inventory items before opening;
    - resolve default warehouse before opening;
    - pass `variantEditorScope` and full API-backed `editableColumns`;
    - replace read-only save stub with API-backed save for pricing + inventory item fields.
11. Keep Pricing and Inventory restricted flows unchanged.
12. Check that every field editable in the general variants modal is included in save logic.
13. Verify manual behavior. Do not add or edit a changeset file.

## Verification

Не запускать `test` и `tsc`.

Manual checks:

- Open product details for a product with multiple variants.
- `Edit variants` loads all variants, hydrates inventory items, resolves default warehouse, and opens the modal.
- Editable table inputs are: `price`, `compareAtPrice`, `sku`, `onHand`, `unavailable`, `costPrice`, `weight`, `length`, `width`, `height`.
- Media/picture column is not editable from this general entry point.
- `barcode` is not editable unless API-backed barcode support was implemented in the same change.
- Saving changed price calls Catalog product update with `variants[].pricing`.
- Saving changed SKU calls `inventoryMutation.inventoryItemUpdate` with `sku`.
- Saving changed on-hand/unavailable calls `inventoryMutation.inventoryItemUpdate` with `stock`.
- Saving changed cost calls `inventoryMutation.inventoryItemUpdate` with `unitCost`.
- Saving changed weight calls `inventoryMutation.inventoryItemUpdate` with `weight.weightGrams`.
- Saving changed dimensions calls `inventoryMutation.inventoryItemUpdate` with all `lengthMm`, `widthMm`, and `heightMm`.
- No mutation is sent when there are no supported changes.
- Clearing unsupported required physical/cost values shows an error and keeps the modal open.
- API user errors keep the modal open and preserve edits.
- Successful save closes the modal, refreshes product details, and updated values appear in variants table/widgets.
- Pricing modal still saves only price fields.
- Inventory modal still saves only its restricted inventory fields.

Если нужна машинная проверка после реализации, запускать только build через project tooling, без `test`/`tsc`.
