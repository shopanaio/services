# Backend API breaking change для spreadsheet variant operations

## Область

Документ описывает только backend API часть утвержденного breaking change для
spreadsheet-создания вариантов.

Frontend, editor grid, draft rows, persisted store, modal save orchestration и
UI validation не входят в область этого документа. Единственное frontend
следствие: все клиенты, которые отправляли старый
`ProductUpdateInput.variants: [VariantUpdateInput!]`, должны перейти на новый
operation-style contract, потому что обратная совместимость не сохраняется.

## Утвержденный breaking change

Старый GraphQL contract:

```graphql
input ProductUpdateInput {
  variants: [VariantUpdateInput!]
}
```

заменяется на operation-style contract:

```graphql
input ProductUpdateInput {
  variants: [VariantOperationInput!]
}
```

Старый shape `variants: [VariantUpdateInput!]` больше не поддерживается.
Отдельное additive field для создания вариантов не добавляется.

Целевой backend contract должен поддерживать `CREATE`, `UPDATE` и `DELETE`
variant operations внутри одной существующей mutation `productUpdate`.

## Цели backend

- `productUpdate` принимает один batch variant operations в
  `ProductUpdateInput.variants`.
- Backend декодирует и валидирует весь batch до любых write-side effects.
- `expectedRevision` обязателен для любых variant operations, проверяется до
  записи и не должен инкрементироваться, если batch-level validation падает.
- Variant create/update/delete выполняются внутри существующей модели
  `ProductUpdateWorkflow`.
- Результаты возвращаются через существующий `ProductUpdatePayload`:
  `product`, `operationResults`, `userErrors`.
- `operationResults` получает типы `variantCreate` и `variantDelete`, а create
  result возвращает `clientMutationId` и `entityId`.
- Отдельная mutation `variantCreate` не используется для spreadsheet-save
  contract, но может остаться как самостоятельный API для других flows, если она
  уже существует.

## Результаты исследования и принятые решения

Текущий код был проверен перед реализацией плана:

- `ProductUpdateInput.variants` сейчас указывает на `VariantUpdateInput`.
- `OperationType` уже является GraphQL enum, а не string scalar.
- `OperationResult` сейчас содержит только `type`, `applied`, `errors`.
- `productUpdate` и `productBulkUpdate` имеют отдельные mapper paths, которые оба
  считают каждый `variants[]` элемент `variantUpdate`.
- `ProductUpdateWorkflow` сейчас сначала инкрементирует optimistic revision и
  только потом выполняет операции.
- Bulk update является async job API: root mutation возвращает `job`, а
  per-operation результаты сохраняются в `BulkUpdateItem.status/errors`.
- Standalone `variantCreate` создает только variant row и option links;
  inventory item для созданного variant сейчас создается только в product create
  saga.
- Standalone `variantDelete` поддерживает `permanent`, но default behavior -
  soft delete.
- `productUpdated` consumers сейчас используют только ключи `payload.variants`
  как affected variant ids для search sync.

Принятые implementation decisions:

- Resolver layer отвечает за GraphQL-specific work: safe global ID decoding,
  cross-field shape validation for `action`, field-path construction и shared
  mapping для single/bulk. Resolver не должен запускать `ProductUpdateWorkflow`,
  если decode или action-shape validation падает.
- Requests с непустым `ProductUpdateInput.variants` обязаны передавать
  `expectedRevision`. Отсутствующий `expectedRevision` является resolver
  preflight validation error и не должен запускать `ProductUpdateWorkflow`.
- Workflow layer владеет product-state batch validation. Это держит single
  `productUpdate` и async bulk jobs на одной реализации invariants.
- `ProductUpdateWorkflow` должен выполнять `stepPreValidateVariantBatch` до
  `stepAcquireRevision` всякий раз, когда есть variant operation.
- Operation result order - это mapped workflow operation order, а не raw GraphQL
  object field order: одна product-level operation, если присутствуют product
  fields, затем categories в request order, затем tags в request order, затем
  variants в request order. Bulk items создаются и resolve-ятся относительно
  этого же порядка.
- При pre-validation failure любые writes запрещены. Нужно вернуть один
  `OperationResult` на каждую mapped operation в mapped order с
  `applied: false`. Operations со специфическими validation errors получают эти
  errors. Operations, заблокированные только потому, что batch failed, получают
  общий `BATCH_VALIDATION_FAILED` error, чтобы bulk item status не мог быть
  отмечен succeeded через index fallback.
- Field paths для single-request используют текущую resolver shape:
  `["operations", "variants", variantIndex, ...]`. Bulk paths используют:
  `["input", "products", productIndex, "operations", "variants", variantIndex,
  ...]`.
- `VariantOperationInput.action: DELETE` внутри `productUpdate` всегда использует
  soft-delete semantics. Существующий standalone `variantDelete(permanent)` API
  может сохранить hard-delete support, но `ProductUpdateInput.variants` не должен
  expose-ить `permanent`.
- Variant creates внутри `ProductUpdateWorkflow` должны гарантировать наличие
  inventory item перед применением `inventory` или `weight`, потому что текущий
  inventory-update script загружает item по `variantId` и падает, если inventory
  item не существует.
- `clientMutationId` - это per-request correlation key, а не durable
  cross-request idempotency. Request-level idempotency обеспечивается существующим
  `x-idempotency-key` / `requestId` workflow id. Клиенты, которым нужен
  retry-safe save, должны отправлять стабильный `x-idempotency-key` для save
  request.
- Bulk update не expose-ит `ProductUpdatePayload.operationResults` в root
  mutation. Он должен расширить job item op types и status/error mapping для
  `variantCreate` и `variantDelete`. Bulk create `entityId` не expose-ится в этом
  change; для этого требуется отдельное nullable result field на `bulk_edit_item`
  и `BulkUpdateItem`.
- Bulk resolver decode/action-shape errors происходят до job creation и fail-ят
  весь `productBulkUpdate` request через `userErrors`, что соответствует текущему
  pre-job validation behavior. Product-state batch validation failures происходят
  внутри job и fail-ят только affected product group's items.
- `productUpdated` должен оставаться event, который `ProductUpdateWorkflow`
  emits для create/update/delete variant operations. Standalone `variantDelete`
  продолжает emit-ить существующий `variantDeleted` event.
- Event DTOs должны быть выровнены до реализации: использовать стабильный variant
  change shape с `lifecycle: "created" | "updated" | "deleted"`, `options`,
  `pricing`, `inventory`, `physical` и `media`. Обновить и local
  `ProductChanges`, и `packages/events` types вместо добавления ad hoc payload
  fields.

## Изменения GraphQL schema

Изменить admin GraphQL schema в catalog service.

Ожидаемые файлы:

- `services/catalog/src/api/graphql-admin/schema/product.graphql`
- `services/catalog/src/api/graphql-admin/schema/variant.graphql`
- `services/catalog/src/api/graphql-admin/schema/bulk.graphql`
- generated files после codegen:
  - `services/catalog/src/resolvers/admin/generated/types.ts`
  - `services/catalog/src/resolvers/admin/generated/schemas.ts`

Целевой schema contract:

```graphql
input ProductUpdateInput {
  handle: String
  title: String
  vendorId: ID
  content: ProductContentInput
  seo: ProductSeoInput
  status: ProductStatus
  media: ProductMediaInput
  categories: [ProductCategoryOperationInput!]
  tags: [ProductTagOperationInput!]
  variants: [VariantOperationInput!]
}

enum VariantOperationAction {
  CREATE
  UPDATE
  DELETE
}

input VariantOperationInput {
  action: VariantOperationAction!
  variantId: ID
  clientMutationId: String
  options: VariantOptionsOpInput
  pricing: VariantPricingOpInput
  inventory: VariantInventoryOpInput
  media: VariantMediaOpInput
  weight: Int
  dimensions: VariantDimensionsOpInput
}
```

Переиспользовать существующие nested inputs там, где они уже представляют целевой
write shape. Не вводить duplicate input types, если текущие inputs не привязаны
семантически к старому `VariantUpdateInput`.

### Правила GraphQL input validation

`action: CREATE`:

- `variantId` запрещен.
- `clientMutationId` обязателен.
- `options` обязателен.
- `pricing`, `inventory`, `media`, `weight`, `dimensions` разрешены.

`action: UPDATE`:

- `variantId` обязателен.
- `clientMutationId` optional, но backend он не нужен.
- `options`, `pricing`, `inventory`, `media`, `weight`, `dimensions` разрешены.

`action: DELETE`:

- `variantId` обязателен.
- Все поля, кроме `action` и `variantId`, запрещены.

Enforce-ить эти правила до workflow writes. Zod codegen может покрывать shape
constraints, но cross-field action validation должна быть реализована в shared
resolver mapper до старта `ProductUpdateWorkflow`. Product-state checks все еще
принадлежат workflow pre-validation.

## Resolver mapping

Ожидаемый файл:

- `services/catalog/src/resolvers/admin/MutationResolver.ts`

`productUpdate` остается единственной mutation entry point. Resolver должен
маппить каждый `ProductUpdateInput.variants[]` item в одну workflow operation:

```ts
type ProductUpdateOperation =
  | { type: "productUpdate"; params: ProductUpdateParams }
  | { type: "productCategoryUpdate"; params: ProductCategoryUpdateParams }
  | { type: "productTagUpdate"; params: ProductTagUpdateParams }
  | { type: "variantCreate"; params: VariantCreateParams }
  | { type: "variantUpdate"; params: VariantUpdateParams }
  | { type: "variantDelete"; params: VariantDeleteParams };
```

Ответственность resolver:

- Decode `productId` до старта workflow. Использовать safe decoding и возвращать
  `userErrors` вместо throwing GraphQL transport errors.
- Decode incoming global IDs для operation params:
  - `variantId`
  - `optionId`
  - `optionValueId`
  - `fileId`
  - `warehouseId`
- Валидировать `VariantOperationInput.action` field combinations до старта
  workflow:
  - `CREATE`: нет `variantId`, required `clientMutationId`, required `options`;
  - `UPDATE`: required `variantId`;
  - `DELETE`: required `variantId`, нет других payload fields.
- Валидировать, что `expectedRevision` передан, если `variants[]` содержит хотя
  бы одну operation. При отсутствии `expectedRevision` вернуть validation error
  через `userErrors` и не запускать workflow.
- Сохранять mapped operation order:
  - одна `productUpdate` operation первой, если есть product-level fields;
  - `categories[]` в request order;
  - `tags[]` в request order;
  - `variants[]` в request order.
- Сохранять `clientMutationId` для create operations.
- Прикреплять field-path metadata к каждой mapped operation, как минимум variant
  operations, чтобы workflow validation могла возвращать GraphQL input paths, не
  зная resolver argument structure.
- Возвращать workflow result через `ProductUpdatePayload` без введения нового
  payload type.

Для single `productUpdate`, если global ID decoding падает, вернуть validation
error через `userErrors` и соответствующий `operationResults` entry. Не запускать
workflow и не acquire-ить product revision для requests, которые fail-ят
decode/action-shape validation. Variant field paths должны использовать
`["operations", "variants", variantIndex, ...]`.

## Изменения Workflow DTO

Ожидаемый файл:

- `services/catalog/src/workflows/dto/ProductUpdateWorkflowDto.ts`

Расширить `ProductUpdateOperation`:

```ts
export interface ProductUpdateOperationMeta {
  fieldPrefix?: string[];
}

export type ProductUpdateOperation =
  | {
      type: "productUpdate";
      params: ProductUpdateParams;
      meta?: ProductUpdateOperationMeta;
    }
  | {
      type: "productCategoryUpdate";
      params: ProductCategoryUpdateParams;
      meta?: ProductUpdateOperationMeta;
    }
  | {
      type: "productTagUpdate";
      params: ProductTagUpdateParams;
      meta?: ProductUpdateOperationMeta;
    }
  | {
      type: "variantCreate";
      params: VariantCreateParams;
      meta?: ProductUpdateOperationMeta;
    }
  | {
      type: "variantUpdate";
      params: VariantUpdateParams;
      meta?: ProductUpdateOperationMeta;
    }
  | {
      type: "variantDelete";
      params: VariantDeleteParams;
      meta?: ProductUpdateOperationMeta;
    };
```

Добавить create/delete params:

```ts
export interface VariantCreateParams {
  productId: string;
  clientMutationId: string;
  options: VariantOptionsParams;
  pricing?: VariantPricingParams;
  inventory?: VariantInventoryParams;
  dimensions?: VariantDimensionsParams;
  weight?: number | null;
  media?: VariantMediaParams;
}

export interface VariantDeleteParams {
  variantId: string;
}
```

`meta.fieldPrefix` создается resolver mapper. Примеры:

- single `productUpdate`: `["operations", "variants", "0"]`;
- bulk product item: `["input", "products", "2", "operations", "variants",
  "0"]`.

Расширить `OperationResult`:

```ts
export interface OperationResult {
  type:
    | "productUpdate"
    | "productCategoryUpdate"
    | "productTagUpdate"
    | "variantCreate"
    | "variantUpdate"
    | "variantDelete";
  applied: boolean;
  clientMutationId?: string;
  entityId?: string;
  errors: UserError[];
}
```

`entityId` - это internal variant id в workflow DTOs. GraphQL response layer
должен encode-ить его как public `ID`.

## Изменения Workflow

Ожидаемые файлы:

- `services/catalog/src/workflows/ProductUpdateWorkflow.ts`
- `services/catalog/src/workflows/PRODUCT_UPDATE_WORKFLOW.md`
- `services/catalog/src/scripts/types/ProductChanges.ts`
- `packages/events/src/types.ts`
- variant scripts under `services/catalog/src/scripts/variant/`
- repositories under `services/catalog/src/repositories/variant/` and
  `services/catalog/src/repositories/option/`, если нужны новые batch reads

`ProductUpdateWorkflow` должен поддерживать три variant operation types:

- `variantCreate`
- `variantUpdate`
- `variantDelete`

Workflow сохраняет существующую partial-failure model для operation execution,
но добавляет pre-validation phase, которая выполняется до revision
acquire/increment.

### Требуемый workflow order

1. Получить уже decoded operation params из resolver mapper.
2. Загрузить current product state, нужный для validation до revision acquire:
   - product revision
   - existing variants
   - product options
   - option values
   - selected option links
   - inventory items для referenced variants, где inventory/weight validation
     нуждается в них
   - media/pricing data, required by validators
3. Выполнить batch-level validation.
4. Если batch validation падает, вернуть `userErrors` и per-operation
   `operationResults` без acquiring revision.
5. Если validation проходит, acquire/increment optimistic revision.
6. Выполнить operations в request order:
   - create variants
   - create option links для created variants
   - apply pricing/inventory/media/weight/dimensions для created variants
   - update existing variants
   - delete variants
7. Aggregate product/variant changes для domain events.
8. Emit domain events.
9. Вернуть `ProductUpdateWorkflowResult`.

### Revision invariant

Batch validation должна происходить до любых write-side effects, включая
optimistic revision acquire/increment. Если validation возвращает errors,
`product.revision` не должен изменяться.

Это намеренно меняет текущий документированный workflow order, где
`stepAcquireRevision` идет первым. Новый порядок:

```text
stepPreValidateVariantBatch
stepAcquireRevision
operation steps
stepEmitEvent
```

Если variant operations отсутствуют, существующий product/category/tag flow
может сохранить текущее поведение. Если variant operations присутствуют,
`expectedRevision` обязателен, validation должна выполняться до revision acquire,
а `stepAcquireRevision` должен использовать CAS по этому `expectedRevision`.

Для requests, которые включают variant operations, failed variant batch блокирует
все operations в этом `productUpdate` request, потому что revision не acquired и
writes не выполняются.

## Batch-level validation

Batch-level validation проверяет invariants, которые нельзя безопасно
валидировать по одной operation за раз.

Обязательные проверки:

- Resolver preflight checks:
  - Каждая operation имеет `action`, и он один из `CREATE`, `UPDATE`, `DELETE`.
  - `CREATE` operations не содержат `variantId`.
  - `CREATE` operations содержат non-empty `clientMutationId`.
  - `CREATE` operations содержат `options`.
  - `UPDATE` operations содержат `variantId`.
  - `DELETE` operations содержат только `action` и `variantId`.
  - Все global IDs decode-ятся в expected entity type.
- Workflow product-state checks:
  - `expectedRevision` совпадает с current product revision.
- Каждый referenced `variantId` принадлежит target product.
- Каждый referenced option принадлежит target product.
- Каждый referenced option value принадлежит referenced option.
- Каждая `CREATE` operation содержит одно value для каждой product option.
- Create operation не содержит duplicate option ids.
- Existing variant count плюс create operation count не превышает total possible
  option combinations.
- `CREATE` combinations не дублируют existing variants.
- `CREATE` combinations не дублируют друг друга.
- `UPDATE` operations, которые меняют options, не дублируют existing variants
  после применения full request.
- `UPDATE` operations, которые меняют options, не дублируют create combinations.
- `clientMutationId` уникален внутри request.
- Pricing, inventory, media, dimensions и weight inputs валидны.
- Referenced inventory warehouse ids валидны для project/store constraints,
  которые уже используются текущим variant inventory update flow.
- Referenced media file ids валидны для project/store constraints, которые уже
  используются existing media update scripts.

Batch-level validation errors должны быть привязаны к relevant operation result.
Request-wide blocking errors должны быть привязаны к каждой blocked operation с
`BATCH_VALIDATION_FAILED`, когда нет более specific operation error. Field paths
используют GraphQL input paths, например:

```ts
{
  message: "Variant option combination already exists",
  code: "VARIANT_COMBINATION_DUPLICATE",
  field: ["operations", "variants", "0", "options"]
}
```

Для create operations также включать `clientMutationId` в operation result.

## Operation-level behavior

После успешной batch validation operation execution все еще может выдавать
operation-level errors из существующей script logic или repository constraints.

Workflow сохраняет текущую partial-failure semantics:

- ошибка одной operation не блокирует автоматически unrelated operations;
- каждая operation возвращает свой `OperationResult`;
- `userErrors` aggregates operation errors для existing API behavior.

### `variantCreate`

`variantCreate` является partial внутри одной operation.

Основная create portion:

- создать variant row;
- создать selected option links;
- построить handle из selected option values.

Основная create portion должна быть transactional. Текущий
`VariantCreateScript` создает row и links, но сам по себе недостаточен для
spreadsheet-save, потому что additional create portions требуют inventory item
existence и partial-result metadata.

Additional portions:

- pricing;
- inventory;
- media;
- weight;
- dimensions.

Перед применением `inventory` или `weight` гарантировать, что inventory item
существует для created variant, вызвав тот же inventory broker boundary, который
использует product create: `inventory.createItem`. Если предоставлен только
`dimensions`, inventory item не требуется текущим dimensions script, потому что
он пишет physical dimensions по `variantId`.

Если variant row и option links созданы, но additional portion падает, вернуть:

- `type: "variantCreate"`
- `applied: false`
- `clientMutationId`
- `entityId` с created variant id
- `errors` для failed additional portions

Это позволяет clients refetch-ить created variant и при этом сопоставлять backend
errors с исходной draft operation.

Если основная create portion падает, вернуть:

- `applied: false`
- `clientMutationId`
- без `entityId`
- errors для create failure

`clientMutationId` не должен рассматриваться как durable idempotency storage. Это
только correlation key внутри одного GraphQL request/result. Retry safety для
всего save request обеспечивается существующим `x-idempotency-key` header,
который используется как `ServiceContext.requestId` и включается в DBOS workflow
id.

### `variantUpdate`

`variantUpdate` сохраняет текущее поведение и может применять любой supported
subset из:

- `options`
- `pricing`
- `inventory`
- `media`
- `weight`
- `dimensions`

Если options изменены, rebuild variant handle и включить option changes в
product update event payload.

Текущий workflow делегирует inventory и dimensions через broker actions, которые
возвращают success/errors, но не change deltas. Когда эти calls успешны, workflow
должен построить event delta из accepted params:

- `inventory` delta из `VariantInventoryParams`;
- `physical.dimensions` delta из `VariantDimensionsParams`;
- `physical.weight` delta из weight update result или accepted weight param.

### `variantDelete`

`variantDelete` внутри `productUpdate` всегда использует существующий
`VariantDeleteScript` soft-delete semantics (`permanent: false`). Hard delete
остается доступным только через standalone `variantDelete` mutation, которая
остается вне spreadsheet-save contract.

Delete operation result:

- `type: "variantDelete"`
- `applied: true` при success
- `entityId` с deleted variant id
- `errors: []`

Workflow должен emit-ить `productUpdated` с deleted variant id в `variants` и
`lifecycle: "deleted"`, чтобы existing `productUpdated` consumers могли
refresh/remove search index rows через affected variant id list.

## ProductUpdatePayload и operation results

Существующий `ProductUpdatePayload` остается response shape.

Убедиться, что GraphQL schema expose-ит достаточно fields для новой result
metadata:

```graphql
type OperationResult {
  type: OperationType!
  applied: Boolean!
  clientMutationId: String
  entityId: ID
  errors: [GenericUserError!]!
}

enum OperationType {
  PRODUCT_UPDATE
  PRODUCT_CATEGORY_UPDATE
  PRODUCT_TAG_UPDATE
  VARIANT_CREATE
  VARIANT_UPDATE
  VARIANT_DELETE
}
```

Research result: текущая schema уже использует `enum OperationType`, поэтому
расширить этот enum значениями `VARIANT_CREATE` и `VARIANT_DELETE`. Не вводить
string operation types и не вводить второй result type.

GraphQL response layer должен encode-ить workflow `entityId` values как public
global IDs:

- `variantCreate.entityId` -> `GlobalIdEntity.Variant`;
- `variantDelete.entityId` -> `GlobalIdEntity.Variant`.

## Domain events

`ProductUpdateWorkflow` сейчас emit-ит `productUpdated` с partial snapshot
changes. Расширить variant changes payload так, чтобы consumers могли наблюдать:

- created variant id и selected options;
- updated variant fields;
- deleted variant id;
- pricing/media/physical changes, которые были applied.

Использовать этот stable event DTO shape для каждого changed variant:

```ts
interface VariantFieldChanges {
  lifecycle?: "created" | "updated" | "deleted";
  pricing?: { currency: string; amount: number; compareAt?: number | null };
  inventory?: {
    warehouseId: string;
    onHand: number;
    unavailable: number;
    sku?: string | null;
    unitCostMinor?: number | null;
    costCurrency?: string | null;
  };
  physical?: {
    width?: number;
    height?: number;
    length?: number;
    weight?: number;
  };
  media?: { fileIds: string[] };
  options?: Array<{ optionId: string; valueId: string }>;
}
```

Обновить оба файла:

- `services/catalog/src/scripts/types/ProductChanges.ts`
- `packages/events/src/types.ts`

Текущий `packages/events` уже использует `physical`, а local `ProductChanges`
сейчас имеет отдельные `dimensions` и `weight`; выровнять local workflow changes
с event package shape.

Не emit-ить `productUpdated`, когда batch validation падает до revision acquire.

Для partial create failures event payload должен включать created variant и
additional fields, которые фактически applied. Failed additional portions не
должны быть представлены как applied changes.

Для variant delete внутри `productUpdate` emit-ить `productUpdated`, а не
отдельный `variantDeleted` event. Existing search sync читает affected variant
ids из `Object.keys(payload.variants)`, а `SyncVariantIndexScript` удаляет
requested variant index, когда variant больше не загружается.

## Repositories и scripts

Предпочитать переиспользование existing scripts, где возможно:

- `VariantCreateScript`
- `VariantDeleteScript`
- `VariantUpdateMediaScript`
- `VariantUpdateOptionsScript`
- `VariantUpdatePricingScript`
- inventory, physical/dimensions scripts или broker calls, используемые текущим
  `variantUpdate`

Research findings:

- `VariantCreateScript` валидирует product/options и создает variant links, но
  сейчас не является complete spreadsheet create step, потому что не создает
  inventory item и не expose-ит `clientMutationId`/partial-create result
  metadata.
- `VariantDeleteScript` transactional и очищает variant media при soft delete;
  вызывать его с default `permanent: false`.
- `VariantUpdateMediaScript` требует, чтобы variant media file ids уже были
  registered как product media через `product_media`.
- `VariantUpdatePricingScript` валидирует currency against `UAH`, `USD`, `EUR` и
  reject-ит negative amounts.
- `InventoryItemUpdateScript` валидирует warehouse existence, stock quantities,
  SKU uniqueness, positive weight, supported unit-cost currency и non-negative
  unit cost.
- `InventoryItemUpdateDimensionsScript` валидирует positive dimensions, но сам
  сейчас не валидирует variant ownership by product; workflow batch validation
  должна сделать это до вызова.

Добавлять repository methods только там, где batch validation иначе потребовала
бы repeated per-operation reads.

Существующие полезные repository capabilities, комбинировать methods при
необходимости:

- load all variants for product with option links;
- load product options and option values;
- check variant ownership by product;
- load media ids needed for validation;
- load warehouse ids for validation.

Concrete current-method coverage:

- `VariantRepository.findByProductId(productId)`
- `VariantRepository.getByIds(variantIds)`
- `VariantRepository.getSelectedOptionsByVariantIds(variantIds)`
- `OptionRepository.findByProductId(productId)`
- `OptionRepository.findValuesByOptionIds(optionIds)`
- `OptionRepository.findVariantLinks(variantIds)`
- `OptionRepository.getValuesByIds(valueIds)`
- `MediaRepository.getProductMediaByFileIds(productId, fileIds)`
- `MediaRepository.getVariantMediaByVariantIds(variantIds)`
- `WarehouseRepository.getByIds(warehouseIds)` / `exists(warehouseId)`

Required additions/refactors:

- сделать variant row + option links create path transactional;
- централизовать "create variant with option links" в одном script/repository
  helper, чтобы transaction boundaries не были размазаны по workflow code;
- использовать `findByProductId` maps для ownership validation first; добавлять
  explicit product ownership guard helpers только если они уменьшают duplicated
  validation code.

## Codegen и generated files

После schema edits запускать project codegen через project-approved toolchain:

```bash
shopana codegen --service catalog
```

Ожидаемые generated files:

- `services/catalog/src/resolvers/admin/generated/types.ts`
- `services/catalog/src/resolvers/admin/generated/schemas.ts`

Не редактировать generated files вручную, кроме как в крайнем случае; generated
output должен приходить из codegen.

## Backward compatibility и migration

Backward compatibility намеренно не предоставляется.

## Влияние на bulk update

`ProductBulkUpdateInput` сейчас переиспользует `ProductUpdateInput` для каждого
product item. Так как `ProductUpdateInput.variants` становится
`[VariantOperationInput!]`, bulk update requests затронуты тем же breaking
change.

Отдельного bulk variant API contract и отдельного bulk workflow design в scope
нет. Bulk продолжает переиспользовать тот же `ProductUpdateInput` contract и те
же `ProductUpdateWorkflow` operation types, что и single `productUpdate`.

Обязательная работа для bulk update:

- Убедиться, что bulk product update schema/codegen подхватывает
  `ProductUpdateInput.variants: [VariantOperationInput!]`.
- Extract-ить shared `ProductUpdateInput` mapper, используемый и single
  `productUpdate`, и `productBulkUpdate`. Current code имеет отдельные mapping
  paths, и оба сейчас предполагают только variant update.
- Сохранять request order внутри каждого product item's `operations`, чтобы bulk
  `operationResults` оставались aligned с input operations.
- Использовать bulk-aware field paths для validation и decode errors, например:
  `["input", "products", productIndex, "operations", "variants", variantIndex,
  "options"]`.
- Сохранять `clientMutationId` для bulk variant create operations.
- Сохранять existing inventory support для bulk variant updates и creates через
  `VariantOperationInput.inventory`.
- Не вводить отдельный bulk-only variant operation contract.
- Расширить `BulkUpdateOpType` значениями `VARIANT_CREATE` и `VARIANT_DELETE`.
- Расширить `BulkEditCreateJobScript.getOperationMetadata`:
  - `variantCreate`: `opType: "variantCreate"`, `variantId: null` при job
    creation time;
  - `variantUpdate`: `opType: "variantUpdate"`, `variantId`;
  - `variantDelete`: `opType: "variantDelete"`, `variantId`.
- Расширить `BulkUpdateItemResolver.OP_TYPE_MAP` для `variantCreate` и
  `variantDelete`.
- Decode/action-shape errors, найденные shared mapper, происходят до job
  creation и fail-ят всю `productBulkUpdate` mutation через `userErrors`. В этом
  path product revision не acquired.
- Product-state batch validation failures происходят внутри
  `ProductUpdateWorkflow` для product group. Они должны marked failed для items
  этой product group, не должны acquire/increment product revision и не должны
  останавливать unrelated product groups в том же job.

Решение по bulk result surface:

- `ProductBulkUpdatePayload` остается `{ job, userErrors }`.
- Per-operation success/failure наблюдается через `BulkUpdateItem.status` и
  `BulkUpdateItem.errors`.
- Bulk create `entityId` не expose-ится в этом change. Чтобы expose-ить его,
  нужно отдельное nullable result field в `bulk_edit_item`, repository update
  methods и `BulkUpdateItem` GraphQL schema.

Обязательная backend migration work:

- Заменить все backend references на старый `VariantUpdateInput` как item type
  `ProductUpdateInput.variants`.
- Убедиться, что resolver mapping больше не предполагает, что каждый
  `variants[]` item является update.
- Убедиться, что bulk resolver mapping больше не предполагает, что каждый
  `variants[]` item является update.
- Убедиться, что generated validation schema требует `action`.
- Обновить docs/comments, которые описывают `ProductUpdateInput.variants` как
  update only.
- Оставить или отдельно deprecate-ить standalone `variantCreate`; он не является
  частью spreadsheet-save path.

Обязательная client migration note:

- Все клиенты, которые отправляют `ProductUpdateInput.variants`, теперь должны
  отправлять `VariantOperationInput` с explicit `action`.
- Existing variant edits должны отправлять `action: "UPDATE"` и `variantId`.
- New variant creation должна отправлять `action: "CREATE"` и
  `clientMutationId`.
- Variant deletion должен отправлять `action: "DELETE"` и `variantId`.
- Existing inventory edits внутри `ProductUpdateInput.variants` остаются
  supported, но должны отправляться внутри `VariantOperationInput` с explicit
  `action`.

## Backend acceptance criteria

- `ProductUpdateInput.variants` является `[VariantOperationInput!]`.
- Old `VariantUpdateInput` item shape больше не accepted для
  `ProductUpdateInput.variants`.
- `VariantOperationAction` поддерживает `CREATE`, `UPDATE`, `DELETE`.
- `productUpdate` maps variant operations в workflow operation types:
  `variantCreate`, `variantUpdate`, `variantDelete`.
- Single и bulk paths используют один shared `ProductUpdateInput` mapper.
- Workflow DTO включает `VariantCreateParams` и `VariantDeleteParams`.
- `OperationResult` включает `variantCreate`, `variantUpdate`,
  `variantDelete`, `clientMutationId` и `entityId`.
- Batch validation выполняется до optimistic revision acquire/increment.
- `expectedRevision` обязателен для любых `ProductUpdateInput.variants`
  operations; отсутствие revision возвращает validation error без запуска
  workflow.
- Failed batch validation не меняет `product.revision`.
- Duplicate option combinations reject-ятся до writes.
- Create operations создают variant row и option links в product update workflow.
- Create operations гарантируют наличие inventory item перед применением
  inventory или weight fields.
- Create operations могут apply pricing/inventory/media/weight/dimensions в том
  же workflow.
- Update operations сохраняют existing inventory update support через
  `ProductUpdateInput.variants`.
- Delete operations выполняются через product update workflow.
- Delete operations используют soft-delete semantics в `productUpdate`.
- Operation errors возвращаются через `ProductUpdatePayload.operationResults` и
  aggregated в `ProductUpdatePayload.userErrors`.
- Create operation results сохраняют `clientMutationId`.
- Create operation results возвращают `entityId`, когда variant был создан.
- Bulk update принимает тот же `VariantOperationInput` contract и корректно maps
  `CREATE`, `UPDATE` и `DELETE` variant actions.
- `BulkUpdateOpType` и bulk item resolver mappings expose-ят `VARIANT_CREATE` и
  `VARIANT_DELETE`.
- Bulk validation errors используют product-indexed field paths.
- `productUpdated` variant payload использует aligned lifecycle/physical event
  shape в local и package event DTOs.
- Новая spreadsheet-specific GraphQL mutation не вводится.

## Non-goals

- Нет frontend implementation.
- Нет UI draft row state design.
- Нет persisted zustand store changes.
- Нет `variantCreate` frontend orchestration.
- Нет additive compatibility field для creates.
- Нет backward-compatible support для старого `variants: [VariantUpdateInput!]`.
