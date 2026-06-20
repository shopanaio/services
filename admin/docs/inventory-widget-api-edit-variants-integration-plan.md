# План интеграции Inventory Widget API и Edit Inventory Variants Modal

## Цель

Подключить карточку Inventory в product details к реальному Admin GraphQL API и сделать сохранение из `EditVariantsModal` API-backed по той же frontend-архитектуре, которая уже используется для Pricing widget:

- widget data загружается через отдельный GraphQL query hook;
- UI-компоненты получают generated API types из `@/graphql/types`;
- модалка редактирования variants переиспользуется в restricted mode через `availableColumns`;
- save flow возвращает `false` при API-ошибках, чтобы модалка оставалась открытой;
- после успешного сохранения обновляются product details, variants connection и inventory widget.

## Текущий baseline

- Pricing widget уже подключен через `PRODUCT_PRICING_WIDGET_QUERY`, `useProductPricingWidget`, `PricingBlock`, `useProductVariantsLoader` и `useUpdateProduct`.
- `InventorySection` сейчас получает `stats` из `productDetailsMockData.inventory`.
- `InventorySection` уже открывает `EditVariantsModal` с inventory columns, но `onSave` возвращает mock-сообщение `Variant inventory updates are not API-backed yet`.
- Gateway schema и generated Admin types уже содержат:
  - `widgetQuery.inventory(productId: ID!): ProductInventoryWidget`;
  - `inventoryMutation.inventoryItemUpdate(input: InventoryItemUpdateInput!): InventoryItemUpdatePayload!`;
  - `ApiProductInventoryWidget`;
  - `ApiInventoryItemUpdateInput`.
- `InventoryItemUpdateInput` обновляет `InventoryItem` по `InventoryItem.id`, а не по `Variant.id`.
- Stock update требует `warehouseId`, поэтому product-level inventory edit не должен неявно притворяться, что редактирует агрегат по всем складам.

## Архитектурные правила

- Backend Admin GraphQL остаётся в service-owned boundary: Inventory widget и inventory item mutations принадлежат `services/inventory`.
- Frontend GraphQL operations для products module должны жить в `admin/src/domains/inventory/products/graphql`.
- Hooks должны владеть `useQuery`/`useMutation`, loading/error/refetch и нормализацией API errors.
- Components не должны создавать API-output view models; использовать generated API types напрямую.
- Mappers конвертируют UI editor rows в API input, но не выполняют GraphQL calls.
- Не использовать `catalogMutation.productUpdate` для inventory-owned fields. Для inventory fields использовать `inventoryMutation.inventoryItemUpdate`.
- Проверки реализации: не запускать `test` и `tsc`; при необходимости запускать build/codegen через Shopana CLI.

## API-контракты

### Inventory widget query

Добавить frontend operation рядом с pricing query:

```graphql
query ProductInventoryWidget($productId: ID!) {
  widgetQuery {
    inventory(productId: $productId) {
      quantities {
        availableForSale
        onHand
        reserved
        unavailable
      }
      availableChange7d
      skuStatus {
        total
        lowStock {
          count
          averageDays
        }
        outOfStock {
          count
          averageDays
        }
        backorder {
          count
          averageDays
        }
      }
      backorder {
        quantity
        etaAvgDays
      }
      alertThreshold {
        method
        minimumStock
      }
    }
  }
}
```

`widgetQuery.inventory` в Admin generated types nullable, поэтому frontend operation type должен явно моделировать `inventory: ApiProductInventoryWidget | null`, а UI должен трактовать `null` как no-data state, не как API error.

### Inventory item update mutation

Добавить frontend operation:

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

Важно: mutation должна возвращать обновлённый `inventoryItem`, но нельзя полагаться только на Apollo cache для пришивания `InventoryItem` к `Variant`, если до save `variant.inventoryItem` был `null`. Явные `onProductRefresh`, `refetchVariants` и `refetchInventoryWidget` остаются обязательными.

### Default warehouse query

Для stock updates нужен warehouse scope. Первый API-backed вариант должен редактировать default warehouse:

```graphql
query InventoryDefaultWarehouse {
  inventoryQuery {
    warehouses(first: 1, where: { isDefault: { _eq: true } }) {
      edges {
        node {
          id
          code
          name
          isDefault
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

Hook берёт первый edge из уже отфильтрованного результата; если default отсутствует, блокирует save и показывает понятную ошибку. Не сохранять stock без явного warehouse.

Не использовать `totalCount` для определения наличия default warehouse: текущий repository может считать `totalCount` без учёта `where`. Единственный источник для выбора default warehouse в hook — `edges[0]?.node`.

### Inventory item by variant query

Для variants без `inventoryItem` перед открытием inventory modal нужно явно гидрировать inventory items через существующий lazy-create API:

```graphql
query InventoryItemByVariant($variantId: ID!) {
  inventoryQuery {
    inventoryItemByVariant(variantId: $variantId) {
      ...InventoryItemFields
    }
  }
}
```

Эта query имеет side effect в backend (`inventoryItemByVariant` создаёт item при отсутствии), поэтому использовать её только в explicit edit preparation flow, а не в passive render Inventory card.

## Backend plan

### 1. Зафиксировать Global ID contract для `widgetQuery.inventory`

Файл: `services/inventory/src/resolvers/admin/InventoryWidgetResolver.ts`

Сейчас resolver передаёт `productId` напрямую в repository. Нужно декодировать GraphQL global Product ID так же, как pricing resolver декодирует `Variant.id`:

- импортировать `decodeGlobalIdByType` и `GlobalIdEntity`;
- в `WidgetQueryResolver.inventory(args)` декодировать `args.productId` как `GlobalIdEntity.Product`;
- передавать UUID в `InventoryWidgetResolver`.

Ожидаемый результат: `InventoryWidgetRepository.getWidget(productId)` получает UUID, совместимый с `catalogVariant.productId`.

### 2. Расширить GraphQL stock fields для modal baseline

Файлы:

- `services/inventory/src/api/graphql-admin/schema/stock.graphql`;
- `services/inventory/src/resolvers/admin/StockResolver.ts`;
- `admin/src/domains/inventory/products/graphql/fragments.ts`.

Для корректной загрузки и сравнения inventory rows editor должен знать не только `quantityOnHand`, но и warehouse + unavailable/reserved values. Добавить в `WarehouseStock` поля:

- `warehouseId: ID!`;
- `variantId: ID!`;
- `reservedQuantity: Int!`;
- `unavailableQuantity: Int!`;
- `availableForSale: Int!`.

В resolver:

- `reservedQuantity` возвращает `reservedQty`;
- `unavailableQuantity` возвращает `unavailableQty`;
- `availableForSale` возвращает `quantityOnHand - reservedQty - unavailableQty`;
- IDs должны соответствовать принятому GraphQL ID contract.

### 3. Привести `Warehouse.id` к mutation contract

Файлы:

- `services/inventory/src/resolvers/admin/WarehouseResolver.ts`;
- `services/inventory/src/resolvers/admin/QueryResolver.ts`;
- `services/inventory/src/api/graphql-admin/resolvers/types.ts`;
- `services/inventory/src/resolvers/admin/MutationResolver.ts`.

Сейчас `inventoryItemUpdate` декодирует `stock.warehouseId` как `GlobalIdEntity.Warehouse`, но `WarehouseResolver.id()` возвращает raw UUID. Нужно выбрать один контракт и применить его последовательно.

Предпочтительный вариант по federation pattern:

- `WarehouseResolver.id()` возвращает `encodeGlobalIdByType(this.$props, GlobalIdEntity.Warehouse)`;
- `StockResolver.warehouseId()` тоже возвращает global Warehouse ID;
- `StockResolver.id()` на первом шаге остаётся raw internal stock UUID, потому что в `GlobalIdEntity` сейчас нет отдельной entity для stock record. Не добавлять новый shared GUID entity в рамках этой интеграции: это отдельное cross-package schema/contract изменение;
- `WarehouseStock.id` не считать частью приведённого global ID boundary в этом scope. Если schema/comment описывает его как globally unique ID, wording нужно привести к фактическому контракту: это internal stock record ID, пригодный для cache identity/read display, но не ID, который frontend должен передавать в mutations;
- `WarehouseStock.warehouseId` и новый `WarehouseStock.variantId` должны быть global IDs, потому что они указывают на существующие GraphQL entities `Warehouse` и `Variant`;
- `inventoryQuery.warehouse(id:)` декодирует `GlobalIdEntity.Warehouse` перед loader/repository access;
- `inventoryQuery.node(id:)` пробует декодировать `GlobalIdEntity.Warehouse` перед загрузкой warehouse;
- `Warehouse.__resolveReference` декодирует global Warehouse ID перед `WarehouseResolver.load`;
- `InventoryItem.__resolveReference` декодирует `GlobalIdEntity.InventoryItem` перед `InventoryItemResolver.load`, потому что `InventoryItemResolver.id()` уже возвращает global ID;
- mutation продолжает декодировать Warehouse ID;
- `warehouseUpdate(input.id)` и `warehouseDelete(input.id)` декодируют global Warehouse ID перед вызовом scripts;
- `warehouseDelete.deletedWarehouseId` возвращается как global Warehouse ID, чтобы payload соответствовал GraphQL ID boundary.
- если используются GraphQL filters по ID (`WarehouseWhereInput.id`, `WarehouseStockWhereInput.id`, `warehouseId`, `variantId`), декодировать global IDs перед repository query либо явно задокументировать, что эти low-level filters временно принимают raw UUID и не входят в UI flow первого шага;
- добавить explicit normalize/decode layer для stock filters перед repository access. В частности, `WarehouseResolver.stock(args)` сейчас сам инжектит raw `warehouseId` в `where` filter для repository query. После перевода внешнего GraphQL boundary на global IDs нужно разделить:
  - injected internal constraints (`this.$props` warehouse UUID) остаются raw UUID;
  - user-provided GraphQL filters (`args.where.warehouseId`, `args.where.variantId`, `args.where.id`) нормализуются до raw UUID перед merge/execute;
  - resolver не должен смешивать global IDs и raw UUID в одном `where._and`, иначе часть nested paths `Warehouse.stock(...)` начнёт возвращать пустые данные.

Альтернатива только для совместимости: mutation использует safe decode и принимает raw UUID. Этот вариант хуже, потому что ослабляет GraphQL ID boundary.

### 4. Усилить `inventoryItemUpdate` server-side safety

Файл: `services/inventory/src/resolvers/admin/MutationResolver.ts`

Сейчас resolver содержит stock/SKU/cost business logic напрямую и не проверяет result `repository.stock.applyStockChange(...)`. Repository может вернуть `REJECTED`, но mutation всё равно вернёт success payload.

Перед frontend save flow нужно убрать риск partial save. `inventoryItemUpdate` должен выполняться как единый transactional use case, где stock/SKU/cost/physical changes из одного mutation input либо применяются вместе, либо возвращают `userErrors` без частичных side effects.

Предпочтительный вариант: перенести `inventoryItemUpdate` на существующий `InventoryItemUpdateScript`/script-level flow, чтобы использовать script validation/result handling и transactional boundary. При этом resolver сохраняет внешний GraphQL contract, но явно адаптирует GraphQL input к script params:

- декодирует `input.id` как `GlobalIdEntity.InventoryItem`;
- загружает `InventoryItem` по decoded item ID;
- использует `item.variantId` как raw `variantId` для script;
- декодирует `input.stock.warehouseId` как `GlobalIdEntity.Warehouse` только если stock branch есть в input;
- после success возвращает `InventoryItemResolver(item.id, ctx)`, а не stock/script result как основной GraphQL payload.

Текущий `InventoryItemUpdateScript` stock-oriented: он принимает `variantId`, обязательные `warehouseId`/`onHand` и не покрывает весь `InventoryItemUpdateInput`. Кроме того, простая замена resolver logic на текущий script не даёт полной атомарности всего mutation input: script сначала применяет stock branch, а затем пишет SKU/weight/cost. Перед использованием в `inventoryItemUpdate` нужно выбрать один из двух безопасных вариантов:

- расширить script params под optional SKU/stock/cost/physical branches и сделать этот script единым `@Transactional()` use case для всего `InventoryItemUpdateInput`;
- оставить script только для stock branch, но обернуть `inventoryItemUpdate` в отдельный `@Transactional()` use case, который сначала pre-validates SKU/cost/physical/stock, затем применяет writes без риска частичного save.

В выбранном варианте все validations должны выполняться до первого write:

- existence checks для `InventoryItem` и `Warehouse`;
- SKU uniqueness;
- quantity constraints для `onHand`/`unavailable`;
- validation cost currency/amount;
- validation dimensions/weight;
- stock delta calculation и проверка, что stock change не будет `REJECTED`.

Если stock rejection можно узнать только через `applyStockChange`, этот call должен выполняться внутри той же transaction boundary, что и остальные writes, и при `REJECTED` весь use case должен вернуть `userErrors` без commit SKU/cost/physical changes. Нельзя полагаться на текущий порядок writes в `InventoryItemUpdateScript` как на atomic flow.

Нельзя оставлять flow, где SKU обновляется до `applyStockChange`, а затем stock rejection возвращает ошибку при уже сохранённом SKU.

### 5. Не добавлять bulk backend mutation на первом шаге

Первый API-backed save может вызывать `inventoryItemUpdate` по одному разу на изменённый row и агрегировать результат в frontend hook. Это соответствует текущему backend API и не требует нового `inventoryItemsUpdate`.

Отдельный bulk mutation стоит добавлять позже, если:

- нужно атомарное сохранение всех rows;
- появятся реальные performance issues;
- нужно единое server-side validation summary.

Если backend mutation будет существенно дорабатываться, перенести бизнес-логику в script по project pattern вместо расширения resolver большим количеством логики.

### 6. Codegen и schema compose

После backend schema изменений:

1. Запустить codegen для inventory service через Shopana CLI.
2. Обновить composed Admin schema для `admin/schema.graphql`.
3. Запустить Admin GraphQL codegen, чтобы обновить `admin/src/graphql/types.ts`.
4. Не редактировать generated files вручную.

## Frontend plan

### 1. Добавить GraphQL operation types

Файл: `admin/src/domains/inventory/products/graphql/operation-types.ts`

Добавить types на основе generated API types:

- `ProductInventoryWidgetQueryData`;
- `ProductInventoryWidgetQueryVariables`;
- `InventoryDefaultWarehouseQueryData`;
- `InventoryDefaultWarehouseQueryVariables`;
- `InventoryItemByVariantQueryData`;
- `InventoryItemByVariantQueryVariables`;
- `InventoryItemUpdateMutationData`;
- `InventoryItemUpdateMutationVariables`.

Не re-export generated schema types из module barrels.

Для `ProductInventoryWidgetQueryData` не сужать `widgetQuery.inventory` до non-null: generated schema contract допускает `null`, и hook/UI должны сохранять эту nullable shape.

### 2. Добавить queries

Файл: `admin/src/domains/inventory/products/graphql/queries.ts`

Добавить:

- `PRODUCT_INVENTORY_WIDGET_QUERY`;
- `INVENTORY_DEFAULT_WAREHOUSE_QUERY`;
- `INVENTORY_ITEM_BY_VARIANT_QUERY`.

Запросы должны использовать `widgetQuery.inventory`, `inventoryQuery.warehouses` и `inventoryQuery.inventoryItemByVariant`, не mock data.

### 3. Добавить mutation

Файл: `admin/src/domains/inventory/products/graphql/mutations.ts`

Добавить `INVENTORY_ITEM_UPDATE_MUTATION` с `InventoryItemFields` и `UserErrorFields`.

Важно: mutation должна возвращать обновлённый `inventoryItem`, но Apollo cache не гарантирует автоматическое пришивание `InventoryItem` к cached `Variant`, если до save `variant.inventoryItem` был `null`. Явные refresh/refetch из save flow остаются обязательными.

### 4. Добавить hook `useProductInventoryWidget`

Новый файл: `admin/src/domains/inventory/products/hooks/use-product-inventory-widget.ts`

Contract:

- input: `productId: string | null`, `skip?: boolean`;
- output: `data: ApiProductInventoryWidget | null`, `isLoading`, `error`, `refetch`;
- `fetchPolicy: "cache-and-network"`;
- `skipToken` использовать при отсутствии `productId`;
- возвращать `previousData` как pricing hook, чтобы карточка не мигала при refresh.
- если query успешно вернула `inventory: null`, hook возвращает `data: null` и `error: null`; `InventorySection` показывает no-data state.

### 5. Добавить hook `useDefaultWarehouse`

Новый файл: `admin/src/domains/inventory/products/hooks/use-default-warehouse.ts`

Contract:

- грузит `warehouses(first: 1, where: { isDefault: { _eq: true } })`;
- возвращает `defaultWarehouse: ApiWarehouse | null` из `edges[0]?.node`;
- если default отсутствует, возвращает `defaultWarehouse: null`; save должен быть blocked с понятной ошибкой;
- не возвращать первый не-default warehouse через основное поле hook, потому что его легко случайно передать в save flow;
- если позже нужен read-only fallback для отображения, вернуть его отдельным полем (`fallbackWarehouse`/`firstWarehouse`) и не использовать для mutations;
- возвращает `defaultWarehouse`, `loading`, `error`, `refetch`.

### 6. Добавить hook `useEnsureVariantInventoryItems`

Новый файл: `admin/src/domains/inventory/products/hooks/use-ensure-variant-inventory-items.ts`

Contract:

```ts
ensureVariantInventoryItems(variants: ApiVariant[]): Promise<ApiVariant[]>
```

Поведение:

- найти variants без `inventoryItem`;
- для каждого missing item вызвать `INVENTORY_ITEM_BY_VARIANT_QUERY` с `variant.id`;
- вернуть `ApiVariant[]` той же API shape, но с заполненным `inventoryItem` для hydrated variants;
- если hydration падает или API не возвращает item, вернуть error; `InventorySection` показывает сообщение и не открывает modal;
- не переносить этот вызов в mapper, потому что mappers не выполняют GraphQL calls;
- использовать hook только в explicit `Edit inventory` preparation flow, чтобы lazy-create side effect не происходил при обычном render.

### 7. Добавить hook `useUpdateInventoryItems`

Новый файл: `admin/src/domains/inventory/products/hooks/use-update-inventory-items.ts`

Contract:

```ts
updateInventoryItems(inputs: ApiInventoryItemUpdateInput[]): Promise<{
  inventoryItems: ApiInventoryItem[];
  userErrors: ApiGenericUserError[];
  errors: ApiGenericUserError[];
}>
```

Поведение:

- если inputs пустой, mutation не вызывается;
- для первого implementation можно выполнять mutations последовательно, чтобы ошибки легче маппились к rows;
- собрать все `userErrors`;
- transport/runtime error превращать в `UNEXPECTED_ERROR`;
- вернуть единый result для `InventorySection`.

Не класть сравнение editor rows в hook; hook получает уже готовые API inputs.

### 8. Добавить mapper для inventory rows

Новый файл: `admin/src/domains/inventory/products/mappers/product-variant-inventory.mapper.ts`

Функция:

```ts
prepareChangedVariantInventoryInputs({
  rows,
  variants,
  warehouseId,
  defaultCurrency,
}): ApiInventoryItemUpdateInput[]
```

Правила:

- `row.id` сопоставлять с `ApiVariant.id`;
- брать `variant.inventoryItem?.id` как `input.id`;
- если `inventoryItem` отсутствует после pre-modal hydration, не строить update silently и вернуть/throw user-facing error;
- `sku` отправлять только если изменился;
- `stock` отправлять только если изменились `onHand` или `unavailable`;
- если отправляется `stock`, всегда включать оба значения `onHand` и `unavailable`: backend трактует отсутствующий `unavailable` как `0`, поэтому нельзя отправлять только изменённое вложенное поле;
- `reserved` не отправлять, потому что reserved управляется order/reservation flow;
- `available` не отправлять, потому что это calculated field;
- `barcode` не отправлять, потому что текущий API contract не содержит barcode;
- `unitCost` отправлять только если inventory mode будет включать `costPrice`; иначе не включать в первый scope;
- валидировать non-negative numeric values перед mutation.
- текущий frontend validator запрещает negative `available` (`onHand - unavailable - reserved < 0`). Первый API-backed inventory edit должен явно сохранить это ограничение, либо отдельно менять validator/UX, если backorder/continue-selling flow должен позволять отрицательную доступность.

### 9. Обновить modal payload и variant mapper для stock per warehouse

Файлы:

- `admin/src/domains/inventory/products/modals.ts`;
- `admin/src/domains/inventory/products/components/variants/edit-variants-modal.tsx`;
- `admin/src/domains/inventory/products/mappers/product-variant-editor.mapper.ts`.

Сейчас `onHand` берётся из `inventoryItem.totalAvailable`, что является агрегатом. Для API-backed edit нужно:

- добавить в `IEditVariantsModalPayload` optional warehouse scope, например `inventoryWarehouseId?: string` или `variantEditorScope?: { type: "inventory"; warehouseId: string }`;
- не делать warehouse scope обязательным для всех modal usages, чтобы pricing flow и full variants editor продолжали работать без изменений;
- в `EditVariantsModal` передавать warehouse scope из payload в `mapApiVariantsToEditorInputs`;
- принять optional `warehouseId` или `warehouseSelector`;
- выбрать stock row текущего warehouse из `variant.inventoryItem.stock`;
- заполнить:
  - `onHand` из `stock.quantityOnHand`;
  - `unavailable` из `stock.unavailableQuantity`;
  - `reserved` из `stock.reservedQuantity`;
  - `available` вычисляется editor grid;
- если stock row отсутствует, использовать `0` значения, чтобы mutation создала/seed stock через backend flow.

Для read-only display без warehouse можно продолжать использовать `totalAvailable`, но edit modal должен быть warehouse-scoped.

### 10. Обновить `InventorySection`

Файл: `admin/src/domains/inventory/products/components/product-details-card/sections/inventory-section.tsx`

Изменения:

- убрать обязательный prop `stats`;
- внутри секции использовать `useProductInventoryWidget({ productId: product.id })`;
- loading/no-data/error states строить от API hook;
- убрать `productDetailsMockData.inventory`;
- при `Edit inventory`:
  - загрузить all variants через `useProductVariantsLoader`, как PricingBlock;
  - перед открытием modal прогнать variants через `useEnsureVariantInventoryItems`, чтобы missing `inventoryItem` был lazy-created/loaded;
  - использовать hydrated variants при открытии modal и в `handleSaveInventory` closure;
  - загрузить default warehouse через `useDefaultWarehouse`;
  - открыть `EditVariantsModal`;
  - передать warehouse scope в modal payload (`inventoryWarehouseId`/`variantEditorScope.warehouseId`) из default warehouse;
  - передать `availableColumns: ["sku", "onHand", "unavailable", "reserved", "available"]`;
  - не показывать `barcode` в API-backed scope;
  - `reserved` и `available` оставить readonly через существующую column config;
  - `showColumnSettings: false`;
  - `onSave` должен возвращать `Promise<boolean>`.

### 11. Save flow в `InventorySection`

Поведение должно совпадать с pricing modal UX:

1. `handleEditInventory` подготавливает editor data, гидрирует missing `inventoryItem` через `inventoryItemByVariant` и показывает loading на menu action.
2. `handleSaveInventory(rows, editorVariants)` строит changed inputs через mapper.
3. Если changes нет, показать neutral message и закрыть modal.
4. Если нет default warehouse, показать error и вернуть `false`.
5. Вызвать `updateInventoryItems(inputs)`.
6. Если есть API/user/runtime errors:
   - показать первое полезное сообщение;
   - вернуть `false`, чтобы modal осталась открытой.
7. После успешного save:
   - `onProductRefresh?.()`;
   - `refetchInventoryWidget()`;
   - `refetchVariants()` или повторная загрузка variants connection;
   - показать success message;
   - вернуть `true`.

`editorVariants` должны передаваться в save через closure, как в `PricingBlock`; общий `IEditVariantsModalPayload.onSave` не нужно расширять вторым аргументом ради inventory flow.

### 12. Обновить `ProductDetailsCard` и `ProductModal`

Файлы:

- `admin/src/domains/inventory/products/components/product-details-card/product-details-card.tsx`;
- `admin/src/domains/inventory/products/modals/product-modal/product-modal.tsx`;
- `admin/src/domains/inventory/products/components/product-details-card/types.ts`.

Изменения:

- `InventorySection` больше не получает `supplementalData.inventory`;
- `ProductDetailsSupplementalData` можно оставить для reviews/attributes/bundles, но убрать inventory из обязательного contract или пометить как legacy mock-only;
- `ProductModal` продолжает передавать `onProductRefresh={refetch}`.

### 13. Обновить barrels

Файлы:

- `admin/src/domains/inventory/products/hooks/index.ts`;
- `admin/src/domains/inventory/products/mappers/index.ts`;
- `admin/src/domains/inventory/products/graphql/index.ts`.

Добавить exports для новых hooks/mappers/operations, но не re-export generated API types.

## UX decisions

- Inventory widget показывает product-level aggregate по всем variants/warehouses.
- Inventory edit modal в первом API-backed implementation редактирует stock default warehouse. Это должно быть ясно в internal implementation и, при необходимости, в modal title/secondary text.
- `reserved` readonly, потому что order/reservation subsystem владеет этим значением.
- `available` readonly, потому что вычисляется как `onHand - unavailable - reserved`.
- `barcode` исключить из API-backed modal, пока backend не добавит поле в `InventoryItem`.
- Если позже нужен multi-warehouse edit, добавить warehouse selector в header modal и перезаполнять rows для выбранного warehouse.

## Порядок реализации

Реализацию лучше разделить на два этапа/PR. Frontend не должен строиться поверх нестабильного GraphQL boundary: сначала нужно зафиксировать backend contracts, обновить schema и generated Admin types, затем подключать UI.

### Этап 1 / PR 1: Backend contract hardening

1. Исправить backend global ID handling для `widgetQuery.inventory(productId:)`.
2. Привести `Warehouse.id` и `inventoryItemUpdate.stock.warehouseId` к одному ID contract.
3. Привести `InventoryItem.__resolveReference` к global `InventoryItem.id` contract.
4. Добавить normalize/decode layer для Warehouse/Stock GraphQL ID filters перед repository access, включая nested `WarehouseResolver.stock(args)`.
5. Зафиксировать `WarehouseStock.id` как raw internal stock UUID в первом scope и поправить schema/comment wording, чтобы он не описывался как global ID.
6. Расширить `WarehouseStock` GraphQL fields для `reservedQuantity`, `unavailableQuantity`, `availableForSale`, `warehouseId`, `variantId`.
7. Исправить `inventoryItemUpdate` как единый transactional use case, чтобы rejected stock changes возвращали `userErrors` и не сохраняли частичные SKU/cost/physical changes.
8. Запустить inventory service codegen через Shopana CLI.
9. Обновить composed Admin schema для `admin/schema.graphql`.
10. Запустить Admin GraphQL codegen, чтобы обновить `admin/src/graphql/types.ts`.
11. Запустить build через Shopana CLI, если нужна проверка новой backend/schema версии.

### Этап 2 / PR 2: Frontend integration

1. Добавить frontend queries/mutation/operation types на основе обновлённых generated Admin types.
2. Добавить `useProductInventoryWidget`.
3. Добавить строгий `useDefaultWarehouse` с `defaultWarehouse: ApiWarehouse | null`.
4. Добавить `useEnsureVariantInventoryItems` и query `inventoryItemByVariant` для pre-modal hydration missing inventory items.
5. Добавить `useUpdateInventoryItems`.
6. Добавить `product-variant-inventory.mapper.ts`.
7. Обновить modal payload, `EditVariantsModal` и `product-variant-editor.mapper.ts`, чтобы inventory edit был warehouse-scoped.
8. Переподключить `InventorySection` к API hook, pre-modal inventory item hydration и API save flow.
9. Убрать mock inventory из `ProductDetailsCard` contract.
10. Проверить, что pricing flow не изменился.
11. Запустить build через Shopana CLI, если нужна проверка новой frontend версии.

## Acceptance criteria

- Product details Inventory card загружает данные из `widgetQuery.inventory`, а не из mocks.
- `ProductInventoryWidgetQueryData` и `useProductInventoryWidget` сохраняют nullable contract `widgetQuery.inventory`; `inventory: null` ведёт к no-data state без ошибки.
- Inventory card показывает loading/error/no-data states без падений.
- Inventory card корректно отображает проценты/secondary text при `skuStatus.total === 0` без `NaN`/`Infinity`.
- `Edit inventory` открывает `EditVariantsModal` с API-backed variants.
- Перед открытием inventory modal variants без `inventoryItem` гидрируются через `inventoryQuery.inventoryItemByVariant`; если hydration не удалась, modal не открывается и пользователь видит ошибку.
- Default warehouse загружается серверным фильтром `warehouses(first: 1, where: { isDefault: { _eq: true } })`, без client-side поиска среди первых N warehouses.
- Hook default warehouse выбирает warehouse только из `edges[0]?.node` и не использует `totalCount` как признак наличия default warehouse.
- Modal показывает только поддержанные inventory columns: `sku`, `onHand`, `unavailable`, `reserved`, `available`.
- Inventory modal получает warehouse scope через payload и заполняет editable stock rows из `variant.inventoryItem.stock` для выбранного warehouse, а не из aggregate `inventoryItem.totalAvailable`.
- `reserved` и `available` нельзя редактировать.
- Save вызывает `inventoryMutation.inventoryItemUpdate` только для changed rows.
- Unchanged rows не отправляются.
- При stock update input всегда содержит оба поля `stock.onHand` и `stock.unavailable`, даже если изменилось только одно из них.
- `barcode` не отправляется в API.
- При API `userErrors` modal остаётся открытой.
- При backend `applyStockChange` rejection mutation возвращает `userErrors`, а не success.
- При backend `applyStockChange` rejection mutation не сохраняет частичные изменения из того же input (`sku`, `unitCost`, `dimensions`, `weight`).
- `inventoryItemUpdate` resolver адаптирует GraphQL `InventoryItem.id` к script-level raw `variantId` через loaded `InventoryItem.variantId`; script не получает `InventoryItem.id` как `variantId`.
- Если `inventoryItemUpdate` использует `InventoryItemUpdateScript`, script/transactional wrapper поддерживает mutation inputs без stock branch и не требует `warehouseId`/`onHand` для SKU-only updates.
- При успешном save modal закрывается, product details, variants и inventory widget обновляются.
- `widgetQuery.inventory` работает с global `Product.id` из Admin UI.
- Stock save использует согласованный Warehouse ID format.
- Все Warehouse GraphQL boundary points используют один global ID contract: `Warehouse.id`, `stock.warehouseId`, `inventoryQuery.warehouse`, `inventoryQuery.node/nodes`, `Warehouse.__resolveReference`, `warehouseUpdate`, `warehouseDelete`, `deletedWarehouseId`.
- `InventoryItem.__resolveReference` принимает global `InventoryItem.id` и декодирует его перед loader/repository access.
- `WarehouseStock.id` в первом scope остаётся raw internal stock UUID; schema/comment wording не должен обещать global ID для stock record, пока в `GlobalIdEntity` нет отдельной stock entity.
- `WarehouseStock.warehouseId` и `WarehouseStock.variantId` возвращаются как global `Warehouse`/`Variant` IDs.

## Verification

- Не запускать `test` и `tsc` напрямую.
- После schema changes запускать только codegen/schema compose через Shopana CLI.
- Для финальной проверки новой версии кода запускать build через Shopana CLI.
- Минимальная ручная проверка:
  - открыть product details;
  - убедиться, что Inventory card делает GraphQL request `ProductInventoryWidget`;
  - открыть `Edit inventory`;
  - изменить `sku`, `onHand`, `unavailable`;
  - сохранить;
  - убедиться, что mutation request содержит `inventoryMutation.inventoryItemUpdate`;
  - убедиться, что Inventory card и variant rows обновились после save.

## Риски и открытые вопросы

- Без default warehouse нельзя корректно сохранить product-level stock edit. Нужно либо требовать default warehouse, либо добавить warehouse selector.
- Текущий backend mutation не bulk/atomic. Если нужна атомарность всех rows, потребуется отдельный `inventoryItemsUpdate` script/mutation.
- Если `InventoryItem` для variant отсутствует, frontend должен сначала получить/создать его через `inventoryQuery.inventoryItemByVariant` или backend должен поддержать update by `variantId`.
- Если business ожидает редактировать cost/weight/dimensions из этой же modal, scope нужно расширять отдельными mapper branches и API inputs, но первый inventory scope лучше ограничить stock/SKU.

## Строгий план выполнения

Ниже порядок выполнения без перестановок. Не переходить к frontend фазам, пока backend schema, composed schema и generated Admin types не обновлены.

### Фаза 1. Backend ID boundary

1. В `services/inventory/src/resolvers/admin/InventoryWidgetResolver.ts` декодировать `widgetQuery.inventory(productId:)` через `decodeGlobalIdByType(args.productId, GlobalIdEntity.Product)`.
2. Передавать в `InventoryWidgetResolver` и `InventoryWidgetRepository.getWidget(productId)` только raw Product UUID.
3. В `services/inventory/src/resolvers/admin/WarehouseResolver.ts` изменить `WarehouseResolver.id()` на global Warehouse ID через `encodeGlobalIdByType(this.$props, GlobalIdEntity.Warehouse)`.
4. В `services/inventory/src/resolvers/admin/StockResolver.ts` изменить `warehouseId()` на global Warehouse ID через `GlobalIdEntity.Warehouse`.
5. В `services/inventory/src/resolvers/admin/StockResolver.ts` изменить `variantId()` на global Variant ID через `GlobalIdEntity.Variant`.
6. Оставить `StockResolver.id()` raw internal stock UUID.
7. Поправить wording schema/comment для `WarehouseStock.id`, чтобы он не обещал global ID для stock record.
8. В `services/inventory/src/resolvers/admin/QueryResolver.ts` декодировать `inventoryQuery.warehouse(id:)` как `GlobalIdEntity.Warehouse` перед loader/repository access.
9. В `inventoryQuery.node(id:)` сначала пробовать decode/load Warehouse через `GlobalIdEntity.Warehouse`, затем decode/load InventoryItem через `GlobalIdEntity.InventoryItem`.
10. В `services/inventory/src/api/graphql-admin/resolvers/types.ts` декодировать `Warehouse.__resolveReference.id` как `GlobalIdEntity.Warehouse` перед `WarehouseResolver.load`.
11. В `services/inventory/src/api/graphql-admin/resolvers/types.ts` декодировать `InventoryItem.__resolveReference.id` как `GlobalIdEntity.InventoryItem` перед `InventoryItemResolver.load`.
12. В `services/inventory/src/resolvers/admin/MutationResolver.ts` декодировать `warehouseUpdate(input.id)` и `warehouseDelete(input.id)` как `GlobalIdEntity.Warehouse` перед script call.
13. Возвращать `warehouseDelete.deletedWarehouseId` как global Warehouse ID.

### Фаза 2. Backend filter normalization

1. Найти все resolver/repository entry points, где GraphQL `where` filters по `id`, `warehouseId`, `variantId` передаются в repository query.
2. Добавить helper для normalize/decode GraphQL ID filters перед repository access.
3. Для `WarehouseWhereInput.id` декодировать external value как `GlobalIdEntity.Warehouse`.
4. Для `WarehouseStockWhereInput.warehouseId` декодировать external value как `GlobalIdEntity.Warehouse`.
5. Для `WarehouseStockWhereInput.variantId` декодировать external value как `GlobalIdEntity.Variant`.
6. Для `WarehouseStockWhereInput.id` оставить raw UUID contract в первом scope и не декодировать как global ID.
7. В `WarehouseResolver.stock(args)` оставить injected internal constraint `{ warehouseId: { _eq: this.$props } }` raw UUID.
8. В `WarehouseResolver.stock(args)` нормализовать только user-provided `args.where` до raw UUID до merge с injected internal constraint.
9. Проверить, что ни один `where._and` не смешивает global Warehouse/Variant IDs с raw UUID для одного repository query.

### Фаза 3. Backend WarehouseStock schema fields

1. В `services/inventory/src/api/graphql-admin/schema/stock.graphql` добавить `WarehouseStock.warehouseId: ID!`.
2. В `services/inventory/src/api/graphql-admin/schema/stock.graphql` добавить `WarehouseStock.variantId: ID!`.
3. В `services/inventory/src/api/graphql-admin/schema/stock.graphql` добавить `WarehouseStock.reservedQuantity: Int!`.
4. В `services/inventory/src/api/graphql-admin/schema/stock.graphql` добавить `WarehouseStock.unavailableQuantity: Int!`.
5. В `services/inventory/src/api/graphql-admin/schema/stock.graphql` добавить `WarehouseStock.availableForSale: Int!`.
6. В `services/inventory/src/resolvers/admin/StockResolver.ts` вернуть `reservedQuantity` из `reservedQty`.
7. В `services/inventory/src/resolvers/admin/StockResolver.ts` вернуть `unavailableQuantity` из `unavailableQty`.
8. В `services/inventory/src/resolvers/admin/StockResolver.ts` вернуть `availableForSale` как `quantityOnHand - reservedQty - unavailableQty`.
9. Не добавлять новый `GlobalIdEntity` для stock record в этой фазе.

### Фаза 4. Backend transactional inventory item update

1. Создать или расширить script/use case для полного `InventoryItemUpdateInput`.
2. Пометить выбранный script/use case `@Transactional()`.
3. В resolver оставить только GraphQL input adaptation и result mapping.
4. В resolver декодировать `input.id` как `GlobalIdEntity.InventoryItem`.
5. Загрузить `InventoryItem` по decoded item ID.
6. Использовать `item.variantId` как raw `variantId` для script/use case.
7. Если `input.stock` есть, декодировать `input.stock.warehouseId` как `GlobalIdEntity.Warehouse`.
8. До первого write выполнить existence validation для `InventoryItem`.
9. До первого write выполнить existence validation для `Warehouse`, если есть stock branch.
10. До первого write выполнить SKU uniqueness validation, если `sku` передан.
11. До первого write выполнить validation для `onHand` и `unavailable`.
12. До первого write выполнить validation для cost currency/amount, если `unitCost` передан.
13. До первого write выполнить validation для dimensions/weight, если они переданы.
14. До первого write вычислить stock delta.
15. Если stock rejection можно определить только через `applyStockChange`, выполнять `applyStockChange` внутри той же transaction boundary.
16. При `applyStockChange.status === "REJECTED"` вернуть `userErrors` и rollback всех SKU/cost/physical writes.
17. Поддержать mutation inputs без stock branch.
18. Поддержать SKU-only update без требования `warehouseId`/`onHand`.
19. После success вернуть `InventoryItemResolver(item.id, ctx)`.
20. Убедиться, что resolver больше не игнорирует result `applyStockChange`.

### Фаза 5. Backend generation and schema compose

1. Запустить inventory service codegen через Shopana CLI.
2. Обновить composed Admin schema `admin/schema.graphql` через Shopana CLI.
3. Запустить Admin GraphQL codegen через Shopana CLI.
4. Не редактировать generated files вручную.
5. Не запускать `test` и `tsc`.
6. Запустить build через Shopana CLI только если нужна проверка новой backend/schema версии.

### Фаза 6. Frontend GraphQL operations

1. В `admin/src/domains/inventory/products/graphql/fragments.ts` обновить `InventoryItemFields.stock` новыми `WarehouseStock` fields.
2. В `admin/src/domains/inventory/products/graphql/operation-types.ts` добавить `ProductInventoryWidgetQueryData`.
3. В `admin/src/domains/inventory/products/graphql/operation-types.ts` добавить `ProductInventoryWidgetQueryVariables`.
4. В `admin/src/domains/inventory/products/graphql/operation-types.ts` добавить `InventoryDefaultWarehouseQueryData`.
5. В `admin/src/domains/inventory/products/graphql/operation-types.ts` добавить `InventoryDefaultWarehouseQueryVariables`.
6. В `admin/src/domains/inventory/products/graphql/operation-types.ts` добавить `InventoryItemByVariantQueryData`.
7. В `admin/src/domains/inventory/products/graphql/operation-types.ts` добавить `InventoryItemByVariantQueryVariables`.
8. В `admin/src/domains/inventory/products/graphql/operation-types.ts` добавить `InventoryItemUpdateMutationData`.
9. В `admin/src/domains/inventory/products/graphql/operation-types.ts` добавить `InventoryItemUpdateMutationVariables`.
10. В `admin/src/domains/inventory/products/graphql/queries.ts` добавить `PRODUCT_INVENTORY_WIDGET_QUERY`.
11. В `admin/src/domains/inventory/products/graphql/queries.ts` добавить `INVENTORY_DEFAULT_WAREHOUSE_QUERY`.
12. В `admin/src/domains/inventory/products/graphql/queries.ts` добавить `INVENTORY_ITEM_BY_VARIANT_QUERY`.
13. В `admin/src/domains/inventory/products/graphql/mutations.ts` добавить `INVENTORY_ITEM_UPDATE_MUTATION`.
14. Не re-export generated API types из module barrels.

### Фаза 7. Frontend hooks

1. Добавить `admin/src/domains/inventory/products/hooks/use-product-inventory-widget.ts`.
2. В `useProductInventoryWidget` использовать `skipToken`, если `productId` отсутствует.
3. В `useProductInventoryWidget` использовать `fetchPolicy: "cache-and-network"`.
4. В `useProductInventoryWidget` возвращать `previousData`, чтобы карточка не мигала при refresh.
5. В `useProductInventoryWidget` трактовать `inventory: null` как no-data, не как error.
6. Добавить `admin/src/domains/inventory/products/hooks/use-default-warehouse.ts`.
7. В `useDefaultWarehouse` запрашивать только `warehouses(first: 1, where: { isDefault: { _eq: true } })`.
8. В `useDefaultWarehouse` возвращать `defaultWarehouse: ApiWarehouse | null` только из `edges[0]?.node`.
9. Не возвращать первый не-default warehouse через основное поле hook.
10. Добавить `admin/src/domains/inventory/products/hooks/use-ensure-variant-inventory-items.ts`.
11. В `useEnsureVariantInventoryItems` вызывать `inventoryItemByVariant` только для variants без `inventoryItem`.
12. В `useEnsureVariantInventoryItems` использовать explicit edit preparation flow, не passive render.
13. В `useEnsureVariantInventoryItems` ограничить concurrency или выполнять hydration последовательно, чтобы lazy-create side effects не запускались массово без контроля.
14. Добавить `admin/src/domains/inventory/products/hooks/use-update-inventory-items.ts`.
15. В `useUpdateInventoryItems` выполнять mutations последовательно.
16. В `useUpdateInventoryItems` агрегировать `userErrors`.
17. В `useUpdateInventoryItems` превращать runtime/transport errors в `UNEXPECTED_ERROR`.

### Фаза 8. Frontend mappers and modal scope

1. Добавить `admin/src/domains/inventory/products/mappers/product-variant-inventory.mapper.ts`.
2. В `prepareChangedVariantInventoryInputs` сопоставлять `row.id` с `ApiVariant.id`.
3. В `prepareChangedVariantInventoryInputs` использовать `variant.inventoryItem.id` как `input.id`.
4. Если `inventoryItem` отсутствует после hydration, возвращать user-facing error.
5. Отправлять `sku` только если изменился.
6. Отправлять `stock` только если изменились `onHand` или `unavailable`.
7. Если отправляется `stock`, всегда включать `stock.onHand` и `stock.unavailable`.
8. Не отправлять `reserved`.
9. Не отправлять `available`.
10. Не отправлять `barcode`.
11. Не отправлять `unitCost` в первом inventory scope, если `costPrice` не включён в modal.
12. Валидировать non-negative numeric values до mutation.
13. Сохранить frontend constraint `onHand - unavailable - reserved >= 0`.
14. В `admin/src/domains/inventory/products/modals.ts` добавить optional warehouse scope в `IEditVariantsModalPayload`.
15. В `EditVariantsModal` передать warehouse scope в `mapApiVariantsToEditorInputs`.
16. В `product-variant-editor.mapper.ts` выбирать stock row по warehouse scope.
17. Заполнять `onHand` из `stock.quantityOnHand`.
18. Заполнять `unavailable` из `stock.unavailableQuantity`.
19. Заполнять `reserved` из `stock.reservedQuantity`.
20. Если stock row отсутствует, использовать `0` для `onHand`/`unavailable`/`reserved`.
21. Сохранить pricing flow без warehouse scope изменений.

### Фаза 9. Frontend InventorySection integration

1. Убрать обязательный prop `stats` из `InventorySection`.
2. Внутри `InventorySection` вызвать `useProductInventoryWidget({ productId: product.id })`.
3. Построить loading state из hook.
4. Построить error state из hook.
5. Построить no-data state при `data === null` без hook error.
6. Убрать использование `productDetailsMockData.inventory`.
7. Добавить preparing state для action `Edit inventory`.
8. При `Edit inventory` загрузить all variants через `useProductVariantsLoader`.
9. Затем прогнать variants через `useEnsureVariantInventoryItems`.
10. Затем получить `defaultWarehouse` из `useDefaultWarehouse`.
11. Если `defaultWarehouse === null`, показать error и не открывать modal.
12. Открыть `EditVariantsModal` с hydrated variants.
13. Передать warehouse scope из `defaultWarehouse.id`.
14. Передать `availableColumns: ["sku", "onHand", "unavailable", "reserved", "available"]`.
15. Передать `showColumnSettings: false`.
16. Не показывать `barcode`.
17. Оставить `reserved` readonly.
18. Оставить `available` readonly.
19. Реализовать `handleSaveInventory(rows, editorVariants)` через closure.
20. В save построить inputs через `prepareChangedVariantInventoryInputs`.
21. Если changes нет, показать neutral message и вернуть `true`.
22. Вызвать `updateInventoryItems(inputs)`.
23. Если есть `userErrors`/runtime errors, показать первую полезную ошибку и вернуть `false`.
24. После success вызвать `onProductRefresh?.()`.
25. После success вызвать `refetchInventoryWidget()`.
26. После success вызвать `refetchVariants()` или повторную загрузку variants connection.
27. После success показать success message и вернуть `true`.

### Фаза 10. Frontend cleanup and verification

1. Обновить `ProductDetailsCard`, чтобы он не передавал inventory mock в `InventorySection`.
2. Обновить `ProductDetailsSupplementalData`, чтобы inventory не был обязательным API-backed contract.
3. Обновить `ProductModal`, сохранив `onProductRefresh={refetch}`.
4. Обновить barrels для новых hooks/mappers/operations.
5. Не re-export generated API types из barrels.
6. Проверить вручную, что pricing edit modal открывается и сохраняет прежним flow.
7. Проверить вручную, что product details Inventory card делает GraphQL request `ProductInventoryWidget`.
8. Проверить вручную, что `Edit inventory` открывает modal с API-backed variants.
9. Проверить вручную, что save вызывает `inventoryMutation.inventoryItemUpdate`.
10. Проверить вручную, что API `userErrors` оставляют modal открытой.
11. Проверить вручную, что после success обновляются product details, variants и inventory widget.
12. Не запускать `test` и `tsc`.
13. Запустить build через Shopana CLI, если нужна финальная проверка новой frontend версии.
