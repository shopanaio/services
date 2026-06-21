# Product Variants Editor Read Path Integration Plan

## Цель

Интегрировать read path для variants в Admin UI product details:

- в `ProductDetailsCard -> VariantsTableSection` корректно показывать variants продукта из Admin GraphQL API с cursor pagination;
- при открытии `Edit variants` из variants section загружать полный список variants продукта;
- в `EditVariantsModal` корректно отображать все AG Grid колонки, которые уже поддерживает variants editor, на основе данных из API;
- не реализовывать save/write path в рамках этого плана.

## Scope

В scope входит только чтение и отображение:

- GraphQL fragments/query shape для `Product.variants`;
- page state для variants section;
- загрузчик всех variants перед открытием editor modal;
- API-to-editor mapping для AG Grid rows;
- loading/error/empty states для read flow;
- ручная проверка отображения.

Вне scope:

- `catalogMutation.productUpdate`;
- `variantCreate`, `variantDelete`, pricing/inventory/media mutations;
- bulk edit persistence;
- backend schema changes, если текущий Admin schema уже возвращает поля из `VariantFields`;
- changeset.

## Архитектурные правила

- GraphQL operations остаются в `admin/src/domains/inventory/products/graphql`.
- Hooks владеют `useQuery`, `client.query`, loading/error/refetch и не отдают наружу raw operation nesting.
- Components получают generated API types напрямую из `@/graphql/types`.
- Не добавлять API-output view models. UI-local row model допустим только внутри variants editor (`IVariantEditorInput`, `IVariantEditorRow`).
- Для денег использовать default currency из workspace/Admin context. Не брать currency рядом с price как источник отображаемой валюты для стандартного Admin UI. В рамках этого плана это касается и HTML variants table, и AG Grid price/cost columns.
- Не запускать `test` и `tsc`. Если нужна проверка сборки, использовать build через project tooling.

## Текущий baseline

- `ProductModal` вызывает `useProduct({ variantsFirst: 10, variantsAfter })` и хранит cursor history для variants pagination.
- `PRODUCT_DETAILS_QUERY` уже принимает `$variantsFirst` и `$variantsAfter`.
- `PRODUCT_DETAILS_FRAGMENT` уже запрашивает `variants(first: $variantsFirst, after: $variantsAfter)`.
- `VARIANT_FRAGMENT` уже содержит данные для основных read columns:
  - identity/title/handle/default timestamps;
  - selected options;
  - media;
  - current price;
  - `inventoryItem`, stock, weight, dimensions, unit cost.
- `VariantsTableSection` показывает текущую страницу variants в HTML table и имеет prev/next controls.
- `EditVariantsModal` уже использует `mapApiVariantsToEditorInputs` и `VariantsEditorGrid`.
- `useProductVariantsLoader` уже умеет загрузить все pages через `PRODUCT_VARIANTS_QUERY`.
- `useProductModals.editVariants` сейчас передаёт в modal только `getProductVariants(product)`, то есть только текущую страницу product details.

## API Read Contract

Использовать существующие frontend operations:

```graphql
query ProductDetails($id: ID!, $variantsFirst: Int, $variantsAfter: String) {
  catalogQuery {
    product(id: $id) {
      ...ProductDetailsFields
    }
  }
}
```

```graphql
query ProductVariants($id: ID!, $first: Int, $after: String) {
  catalogQuery {
    product(id: $id) {
      id
      variants(first: $first, after: $after) {
        edges {
          cursor
          node {
            ...VariantFields
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
}
```

`VariantFields` должен оставаться единым источником данных для variants table и variants editor. Если AG Grid column не получает данные, сначала расширять `VariantFields`, а не создавать отдельный mock/adapter contract.

## Variants Section Read Path

1. Оставить `ProductModal` владельцем pagination state:
   - `variantsPageIndex`;
   - `variantCursorHistory`;
   - текущий `variantsAfter`;
   - `handleVariantsPageChange`.

2. Убедиться, что при смене `entityId` pagination сбрасывается в первую страницу:
   - `setVariantsPageIndex(0)`;
   - `setVariantCursorHistory([null])`.

3. Передавать в `ProductDetailsCard` только API-backed table data:
   - `variants: product.variants.edges.map(edge => edge.node)`;
   - `pageInfo: product.variants.pageInfo`;
   - `totalCount: product.variants.totalCount`.

4. В `VariantsTableSection` отображать:
   - текущую страницу variants;
   - `totalCount`;
   - disabled prev/next по `pageInfo.hasPreviousPage` и `pageInfo.hasNextPage`;
   - empty state, если `variantsCount > 0`, но текущая страница пустая из-за некорректного cursor/page state.

   Готовое решение:
   - `ProductDetailsCard` не должен скрывать весь variants section только потому, что текущая page пустая. Render condition: `variantsTableData && (variantsTableData.totalCount > 0 || product.variantsCount > 0)`.
   - `VariantsTableSection` больше не возвращает `null`, если `variants.length === 0 && totalCount > 0`. Вместо этого он рендерит `Paper` header, total count, prev/next controls и empty state внутри body.
   - Если `totalCount === 0 && product.variantsCount === 0`, variants section можно не показывать.
   - Gate по `product.options.length > 0` убрать из условия показа section. Options нужны только для option labels/columns; отсутствие options не должно скрывать API-backed variants list.

5. Не смешивать данные variants section с `productDetailsMockData`. Для variants использовать только `ApiVariant[]`.

6. На page change не сбрасывать весь product modal в misleading empty state. Если текущий UX со `cache-and-network` показывает skeleton на каждой странице, отдельно решить, оставляем ли full skeleton или добавляем section-level loading state. Для первого read-path шага достаточно сохранить корректность данных и навигации.

   Готовое решение:
   - `ProductModal` показывает full skeleton только когда `loading && !product`.
   - Если `loading && product`, оставлять текущий product details на экране и передавать `isVariantsPageLoading` в `ProductDetailsCard -> VariantsTableSection`.
   - В `VariantsTableSection` во время page fetch disable prev/next и показывать loading на pagination/action area. Таблица может показывать previous page data до прихода новой page, потому `useProduct` уже использует `previousData`.
   - `handleVariantsPageChange` должен игнорировать повторный click, пока `isVariantsPageLoading === true`.

7. Для price rendering в variants section:
   - `ProductDetailsCard` получает `defaultCurrency` через `useDefaultCurrency()`.
   - `VariantsTableSection` принимает `defaultCurrency: CurrencyCode | null`.
   - `VariantRow` форматирует `variant.price.amountMinor` и `variant.price.compareAtMinor` только через `defaultCurrency`; если `defaultCurrency` или amount отсутствует, показывает fallback `—`.
   - Не использовать `useVariantPrice(variant.price)` и не передавать `variant.price.currency` в `formatPrice` внутри этого read path.

## Edit Variants Modal Read Path

1. Изменить открытие variants editor в `useProductModals.editVariants`:
   - использовать `useProductVariantsLoader`;
   - перед `openEditVariantsModal` вызвать `loadAllProductVariants(product)`;
   - в payload передавать полный `ApiVariant[]`, а не только текущую страницу.

2. Пока идёт загрузка всех variants:
   - заблокировать повторное открытие editor;
   - показать user-visible loading feedback на action/menu button или через message/loading state;
   - при ошибке показать message error и не открывать modal.

   Готовое решение:
   - `useProductModals` подключает `useProductVariantsLoader` и возвращает `isEditVariantsLoading`.
   - `handleEditVariants` становится `async`; если `isEditVariantsLoading`, он сразу возвращает управление.
   - `ProductDetailsCard` прокидывает `modals.isEditVariantsLoading` в `VariantsTableSection`.
   - `VariantsTableSection` принимает `isEditLoading?: boolean` и передает его в action.
   - `EditAction` расширить props `loading?: boolean` и `disabled?: boolean`; эти props должны disable menu item и button, а `loading` должен быть виден на button.
   - В `catch` показывать `message.error(err instanceof Error ? err.message : "Product variants could not be loaded")`; modal не открывать.

3. В payload modal передавать:
   - `productId: product.id`;
   - `variants: allLoadedVariants`;
   - `productOptions: product.options`;
   - `defaultCurrency` из workspace context.

   Готовое решение:
   - `ProductDetailsCard` получает `defaultCurrency` через `useDefaultCurrency()` и передает его в `useProductModals(product, { onProductRefresh, defaultCurrency })`.
   - `useProductModals.editVariants` передает этот `defaultCurrency` в `openEditVariantsModal`.
   - Fallback `typedPayload.defaultCurrency ?? useDefaultCurrency() ?? null` в `EditVariantsModal` оставить как защиту для других callers.

4. `onSave` оставить read-only stub:
   - вернуть `false`;
   - показать сообщение, что save/write path не входит в текущую интеграцию.

5. Не добавлять restricted `availableColumns` для общего variants editor. В отличие от pricing/inventory modal modes, editor из variants section должен иметь доступ ко всем колонкам.

## AG Grid Column Mapping

`mapApiVariantToEditorInput` должен покрывать все fields из `IVariantEditorInput`:

- display:
   - `id <- variant.id`;
   - `title <- variant.title ?? variant.handle`;
   - `imageUrl <- first variant media file url` после сортировки `variant.media` по `sortIndex`;
   - `media <- variant.media[].file.url` после сортировки `variant.media` по `sortIndex`;
- options:
  - `options <- variant.selectedOptions` через `productOptions`;
  - dynamic option columns строить из `productOptions`, а не только из реально выбранных values в rows, чтобы все product options из API были представлены в editor.
- inventory:
   - `sku <- variant.inventoryItem?.sku`;
   - `barcode <- null`, пока API не возвращает barcode;
  - если `variantEditorScope.warehouseId` задан:
    - `onHand <- warehouseStock.quantityOnHand`;
    - `reserved <- warehouseStock.reservedQuantity`;
    - `unavailable <- warehouseStock.unavailableQuantity`;
  - если warehouse scope не задан:
    - `onHand <- sum(inventoryItem.stock[].quantityOnHand)`;
    - `reserved <- sum(inventoryItem.stock[].reservedQuantity)`;
    - `unavailable <- sum(inventoryItem.stock[].unavailableQuantity)`;
    - если `inventoryItem.stock` пустой, fallback: `onHand <- inventoryItem.totalAvailable`, `reserved <- 0`, `unavailable <- 0`;
   - `available` считается в `VariantsEditorGrid`;
- pricing:
   - `price <- variant.price?.amountMinor`;
   - `compareAtPrice <- variant.price?.compareAtMinor`;
  - `costPrice <- variant.inventoryItem?.unitCost?.amountMinor`;
- shipping/attributes:
  - `weight`, `weightUnit` через `mapApiWeightToVariantFields`;
  - `length`, `width`, `height`, `dimensionUnit` через `mapApiDimensionsToVariantFields`.

Для общей variants modal inventory quantity columns являются aggregate across warehouses, рассчитанными из `inventoryItem.stock`. Для inventory-specific modal остается warehouse-specific режим через `variantEditorScope.warehouseId`.

## Column Availability

Для открытия из variants section ожидаемый AG Grid набор:

- pinned display column: `Title`;
- media: `Variant Media`;
- dynamic option columns from API product options;
- pricing: `Price`, `Compare at`, `Cost`;
- inventory: `SKU`, `Barcode`, `On hand`, `Unavailable`, `Reserved`, `Available`;
- attributes/shipping: `Weight`, `Length`, `Width`, `Height`.

Колонки, скрытые пользовательскими настройками, должны оставаться доступными через `VariantsColumnSettings`. Если требование именно "показать все колонки сразу", нужно в этом read-path шаге явно изменить default visibility или добавить режим `showAllColumnsByDefault` для открытия из variants section. Не использовать `availableColumns`, потому что он ограничивает набор колонок.

Готовое решение для этого плана:

- Не менять persisted default visibility глобально.
- Не передавать `availableColumns` при открытии из variants section.
- Все supported columns должны быть доступны через `VariantsColumnSettings`.
- Если нужно показать все columns сразу именно для variants section, добавить optional payload flag `showAllColumnsByDefault?: boolean` и обработать его в `EditVariantsModal -> VariantsEditorGrid -> useVariantsColumns` без изменения persisted user settings. Этот flag не нужен для минимальной read-path интеграции, если acceptance допускает включение скрытых columns через settings.

## Implementation Steps

1. Проверить `VariantFields` против списка AG Grid columns и добавить недостающие read fields только в `admin/src/domains/inventory/products/graphql/fragments.ts`.
2. Проверить `ProductDetailsQueryVariables` и `ProductVariantsQueryVariables`, чтобы pagination variables соответствовали API и не вводили UI-only names.
3. Оставить `ProductModal` source of truth для paginated variants section и реализовать section-level loading:
   - full skeleton только при `loading && !product`;
   - `isVariantsPageLoading = loading && !!product`;
   - disable pagination clicks while loading.
4. Обновить `useProductModals`:
   - подключить `useProductVariantsLoader`;
   - загружать все variants перед `openEditVariantsModal`;
   - передавать полный массив variants в modal.
5. Прокинуть loading state из `useProductModals` в `ProductDetailsCard`/`VariantsTableSection`, чтобы `Edit variants` action был disabled/loading.
6. Расширить `EditAction` props:
   - `loading?: boolean`;
   - `disabled?: boolean`;
   - disabled должен применяться и к dropdown menu item, и к button.
7. Проверить `mapApiVariantToEditorInput`:
   - убрать любые mock-only assumptions;
   - оставить API-shaped source objects;
   - не создавать новый output view model.
8. Обновить stock mapping в `mapApiVariantToEditorInput`:
   - warehouse scope использует stock конкретного warehouse;
   - общий scope агрегирует `inventoryItem.stock`;
   - fallback на `inventoryItem.totalAvailable` только если stock rows отсутствуют.
9. Обновить options source для AG Grid:
   - `optionGroups` строить из `productOptions`;
   - если `productOptions` пустой, fallback на `variantInputs` допустим для backward compatibility.
10. Проверить `VariantsEditorGrid`:
   - dynamic option columns строятся из API selected options/product options;
   - price headers используют default currency;
   - row data обновляется при новом `variants` payload;
   - убрать `useState(initialRows)` без setter или синхронизировать rows через `useEffect`; предпочтительно заменить на derived `const rows = initialRows`, потому edits уже живут в store.
11. Обновить variants section price formatting:
   - `ProductDetailsCard` получает `defaultCurrency`;
   - `VariantsTableSection`/`VariantRow` используют `defaultCurrency`;
   - не использовать `variant.price.currency`.
12. Проверить empty/fallback display:
   - no media;
   - no price;
   - no inventory item;
   - no unit cost;
   - no weight/dimensions;
   - unknown option value.
13. Не трогать save flow, кроме read-only stub сообщения при попытке сохранить.

## Verification

Не запускать `test` и `tsc`.

Ручная проверка:

- открыть product details для продукта с variants;
- variants section показывает первую страницу API variants и корректный `totalCount`;
- `Next` загружает следующую страницу, `Prev` возвращает предыдущую;
- disabled states соответствуют `pageInfo`;
- при page change product modal не превращается в full skeleton, pagination controls показывают loading/disabled;
- при cursor/page mismatch variants section показывает empty state, а не пропадает;
- строки показывают title/options, media, price, SKU/stock, weight/dimensions из API;
- price/compare-at в variants section отображаются с default currency из workspace context, а не с `variant.price.currency`;
- `Edit variants` открывает modal после загрузки всех variants, а не только текущей страницы;
- повторный click по `Edit variants` во время загрузки заблокирован;
- ошибка загрузки всех variants показывает message error и не открывает modal;
- AG Grid содержит строки для всех variants продукта;
- option columns соответствуют product options из API;
- повторное открытие modal для другого product/variants payload показывает новые rows, а не старый `useState(initialRows)` snapshot;
- pricing/inventory/attribute columns отображают значения из API или корректный fallback;
- general variants modal показывает aggregate stock values из `inventoryItem.stock`; inventory modal со scope продолжает показывать stock выбранного warehouse;
- пользовательские column settings позволяют включить скрытые columns;
- Save в modal не делает mutation и остаётся read-only.

Если нужна машинная проверка после реализации, запускать только build через project tooling, без `test`/`tsc`.
