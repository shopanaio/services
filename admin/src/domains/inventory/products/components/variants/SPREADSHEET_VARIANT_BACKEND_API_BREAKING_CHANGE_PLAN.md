# Backend API breaking change для spreadsheet variant operations

## Scope

Документ описывает только backend API часть утверждённого breaking change для
spreadsheet-создания вариантов.

Frontend, editor grid, draft rows, persisted store, modal save orchestration и
UI validation не входят в scope этого документа. Единственное frontend
следствие: все клиенты, которые отправляли старый
`ProductUpdateInput.variants: [VariantUpdateInput!]`, должны перейти на новый
operation-style contract, потому что backward compatibility не сохраняется.

## Approved breaking change

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
Отдельный additive field для создания вариантов не добавляется.

Целевой backend contract должен поддерживать `CREATE`, `UPDATE` и `DELETE`
variant operations внутри одной существующей mutation `productUpdate`.

## Backend goals

- `productUpdate` принимает один batch variant operations в
  `ProductUpdateInput.variants`.
- Backend декодирует и валидирует весь batch до любых write-side effects.
- `expectedRevision` проверяется до записи и не должен инкрементироваться, если
  batch-level validation падает.
- Variant create/update/delete выполняются внутри существующей модели
  `ProductUpdateWorkflow`.
- Результаты возвращаются через существующий `ProductUpdatePayload`:
  `product`, `operationResults`, `userErrors`.
- `operationResults` получает типы `variantCreate` и `variantDelete`, а create
  result возвращает `clientMutationId` и `entityId`.
- Отдельная mutation `variantCreate` не используется для spreadsheet-save
  contract, но может остаться как самостоятельный API для других flows, если
  она уже существует.

## Research results and resolved decisions

Текущий код был проверен перед реализацией плана:

- `ProductUpdateInput.variants` сейчас указывает на `VariantUpdateInput`.
- `OperationType` уже является GraphQL enum, не string scalar.
- `OperationResult` сейчас содержит только `type`, `applied`, `errors`.
- `productUpdate` и `productBulkUpdate` имеют отдельные mapper paths, которые
  оба считают каждый `variants[]` элемент `variantUpdate`.
- `ProductUpdateWorkflow` сейчас сначала инкрементирует optimistic revision и
  только потом выполняет операции.
- Bulk update является async job API: root mutation возвращает `job`, а
  per-operation результаты сохраняются в `BulkUpdateItem.status/errors`.
- Standalone `variantCreate` создаёт только variant row и option links; inventory
  item для созданного variant сейчас создаётся только в product create saga.
- Standalone `variantDelete` поддерживает `permanent`, но default behavior -
  soft delete.
- `productUpdated` consumers сейчас используют только ключи
  `payload.variants` как affected variant ids для search sync.

Resolved implementation decisions:

- Resolver layer отвечает за GraphQL-specific work: safe global ID decoding,
  cross-field shape validation for `action`, field-path construction and shared
  mapping for single/bulk. Resolver must not start `ProductUpdateWorkflow` when
  decode or action-shape validation fails.
- Workflow layer owns product-state batch validation. This keeps single
  `productUpdate` and async bulk jobs on the same invariant implementation.
- `ProductUpdateWorkflow` must run `stepPreValidateVariantBatch` before
  `stepAcquireRevision` whenever any variant operation exists.
- The operation result order is the mapped workflow operation order, not raw
  GraphQL object field order: one product-level operation if product fields are
  present, then categories in request order, then tags in request order, then
  variants in request order. Bulk items are created and resolved against this
  same order.
- On pre-validation failure, no writes are allowed. Return one
  `OperationResult` per mapped operation in mapped order with `applied: false`.
  Operations with specific validation errors receive those errors. Operations
  blocked only because the batch failed receive a general
  `BATCH_VALIDATION_FAILED` error so bulk item status cannot be marked
  succeeded by index fallback.
- Single-request field paths use the current resolver shape:
  `["operations", "variants", variantIndex, ...]`. Bulk paths use:
  `["input", "products", productIndex, "operations", "variants", variantIndex,
  ...]`.
- `VariantOperationInput.action: DELETE` inside `productUpdate` always uses
  soft-delete semantics. The existing standalone `variantDelete(permanent)` API
  can keep hard-delete support, but `ProductUpdateInput.variants` must not expose
  `permanent`.
- Variant creates inside `ProductUpdateWorkflow` must ensure an inventory item
  exists before applying `inventory` or `weight`, because the current
  inventory-update script loads by `variantId` and fails when no inventory item
  exists.
- `clientMutationId` is a per-request correlation key, not durable
  cross-request idempotency. Request-level idempotency is provided by the
  existing `x-idempotency-key` / `requestId` workflow id. Clients that need
  retry-safe save must send a stable `x-idempotency-key` for the save request.
- Bulk update does not expose `ProductUpdatePayload.operationResults` at the
  root mutation. It must extend job item op types and status/error mapping for
  `variantCreate` and `variantDelete`. Bulk create `entityId` is not exposed in
  this change; exposing it requires a separate nullable result field on
  `bulk_edit_item` and `BulkUpdateItem`.
- Bulk resolver decode/action-shape errors happen before job creation and fail
  the whole `productBulkUpdate` request with `userErrors`, matching current
  pre-job validation behavior. Product-state batch validation failures happen
  inside the job and fail only the affected product group's items.
- `productUpdated` must remain the event emitted by `ProductUpdateWorkflow`
  for create/update/delete variant operations. Standalone `variantDelete` keeps
  emitting its existing `variantDeleted` event.
- Event DTOs must be aligned before implementation: use a stable variant
  change shape with `lifecycle: "created" | "updated" | "deleted"`, `options`,
  `pricing`, `inventory`, `physical`, and `media`. Update both local
  `ProductChanges` and `packages/events` types instead of adding ad hoc payload
  fields.

## GraphQL schema changes

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

Reuse existing nested inputs where they already represent the target write
shape. Do not introduce duplicate input types unless current inputs are
semantically tied to the old `VariantUpdateInput`.

### GraphQL input validation rules

`action: CREATE`:

- `variantId` is forbidden.
- `clientMutationId` is required.
- `options` is required.
- `pricing`, `inventory`, `media`, `weight`, `dimensions` are allowed.

`action: UPDATE`:

- `variantId` is required.
- `clientMutationId` is optional but not needed by backend.
- `options`, `pricing`, `inventory`, `media`, `weight`, `dimensions` are allowed.

`action: DELETE`:

- `variantId` is required.
- All fields except `action` and `variantId` are forbidden.

Enforce these rules before workflow writes. Zod codegen can cover shape
constraints, but cross-field action validation must be implemented in the shared
resolver mapper before `ProductUpdateWorkflow` starts. Product-state checks
still belong to workflow pre-validation.

## Resolver mapping

Expected file:

- `services/catalog/src/resolvers/admin/MutationResolver.ts`

`productUpdate` remains the single mutation entry point. The resolver must map
each `ProductUpdateInput.variants[]` item to one workflow operation:

```ts
type ProductUpdateOperation =
  | { type: "productUpdate"; params: ProductUpdateParams }
  | { type: "productCategoryUpdate"; params: ProductCategoryUpdateParams }
  | { type: "productTagUpdate"; params: ProductTagUpdateParams }
  | { type: "variantCreate"; params: VariantCreateParams }
  | { type: "variantUpdate"; params: VariantUpdateParams }
  | { type: "variantDelete"; params: VariantDeleteParams };
```

Resolver responsibilities:

- Decode `productId` before workflow start. Use safe decoding and return
  `userErrors` instead of throwing GraphQL transport errors.
- Decode incoming global IDs for operation params:
  - `variantId`
  - `optionId`
  - `optionValueId`
  - `fileId`
  - `warehouseId`
- Validate `VariantOperationInput.action` field combinations before workflow
  start:
  - `CREATE`: no `variantId`, required `clientMutationId`, required `options`;
  - `UPDATE`: required `variantId`;
  - `DELETE`: required `variantId`, no other payload fields.
- Preserve mapped operation order:
  - one `productUpdate` operation first, if product-level fields are present;
  - `categories[]` in request order;
  - `tags[]` in request order;
  - `variants[]` in request order.
- Preserve `clientMutationId` for create operations.
- Attach field-path metadata to every mapped operation, at least variant
  operations, so workflow validation can return GraphQL input paths without
  knowing resolver argument structure.
- Return workflow result through `ProductUpdatePayload` without introducing a
  new payload type.

For single `productUpdate`, if global ID decoding fails, return a validation
error through `userErrors` and the corresponding `operationResults` entry. Do
not start the workflow and do not acquire product revision for requests that
fail decode/action-shape validation. Variant field paths must use
`["operations", "variants", variantIndex, ...]`.

## Workflow DTO changes

Expected file:

- `services/catalog/src/workflows/dto/ProductUpdateWorkflowDto.ts`

Extend `ProductUpdateOperation`:

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

Add create/delete params:

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

`meta.fieldPrefix` is created by the resolver mapper. Examples:

- single `productUpdate`: `["operations", "variants", "0"]`;
- bulk product item: `["input", "products", "2", "operations", "variants",
  "0"]`.

Extend `OperationResult`:

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

`entityId` is the internal variant id in workflow DTOs. The GraphQL response
layer must encode it as the public `ID`.

## Workflow changes

Expected files:

- `services/catalog/src/workflows/ProductUpdateWorkflow.ts`
- `services/catalog/src/workflows/PRODUCT_UPDATE_WORKFLOW.md`
- `services/catalog/src/scripts/types/ProductChanges.ts`
- `packages/events/src/types.ts`
- variant scripts under `services/catalog/src/scripts/variant/`
- repositories under `services/catalog/src/repositories/variant/` and
  `services/catalog/src/repositories/option/`, if new batch reads are needed

`ProductUpdateWorkflow` must support three variant operation types:

- `variantCreate`
- `variantUpdate`
- `variantDelete`

The workflow keeps the existing partial-failure model for operation execution,
but adds a pre-validation phase that runs before revision acquire/increment.

### Required workflow order

1. Receive already-decoded operation params from the resolver mapper.
2. Load current product state needed for validation before revision acquire:
   - product revision
   - existing variants
   - product options
   - option values
   - selected option links
   - inventory items for referenced variants where inventory/weight validation
     needs them
   - media/pricing data required by validators
3. Run batch-level validation.
4. If batch validation fails, return `userErrors` and per-operation
   `operationResults` without acquiring revision.
5. If validation succeeds, acquire/increment optimistic revision.
6. Execute operations in request order:
   - create variants
   - create option links for created variants
   - apply pricing/inventory/media/weight/dimensions for created variants
   - update existing variants
   - delete variants
7. Aggregate product/variant changes for domain events.
8. Emit domain events.
9. Return `ProductUpdateWorkflowResult`.

### Revision invariant

Batch validation must happen before any write-side effect, including optimistic
revision acquire/increment. If validation returns errors, `product.revision`
must not change.

This intentionally changes the current documented workflow order where
`stepAcquireRevision` is first. The new order is:

```text
stepPreValidateVariantBatch
stepAcquireRevision
operation steps
stepEmitEvent
```

If there are no variant operations, the existing product/category/tag flow can
keep its current behavior. If variant operations are present, validation must
run before revision acquire.

For requests that include variant operations, a failed variant batch blocks all
operations in that `productUpdate` request because no revision is acquired and no
writes are executed.

## Batch-level validation

Batch-level validation checks invariants that cannot be safely validated one
operation at a time.

Required checks:

- Resolver preflight checks:
  - Each operation has `action` and it is one of `CREATE`, `UPDATE`, `DELETE`.
  - `CREATE` operations do not contain `variantId`.
  - `CREATE` operations contain non-empty `clientMutationId`.
  - `CREATE` operations contain `options`.
  - `UPDATE` operations contain `variantId`.
  - `DELETE` operations contain only `action` and `variantId`.
  - All global IDs decode to the expected entity type.
- Workflow product-state checks:
  - `expectedRevision` matches current product revision.
- Every referenced `variantId` belongs to the target product.
- Every referenced option belongs to the target product.
- Every referenced option value belongs to the referenced option.
- Every `CREATE` operation contains one value for each product option.
- No create operation contains duplicate option ids.
- Existing variant count plus create operation count does not exceed total
  possible option combinations.
- `CREATE` combinations do not duplicate existing variants.
- `CREATE` combinations do not duplicate each other.
- `UPDATE` operations that change options do not duplicate existing variants
  after applying the full request.
- `UPDATE` operations that change options do not duplicate create combinations.
- `clientMutationId` is unique inside the request.
- Pricing, inventory, media, dimensions and weight inputs are valid.
- Referenced inventory warehouse ids are valid for the project/store constraints
  already used by current variant inventory update flow.
- Referenced media file ids are valid for the project/store constraints already
  used by existing media update scripts.

Batch-level validation errors must be attached to the relevant operation result.
Request-wide blocking errors must be attached to every blocked operation with
`BATCH_VALIDATION_FAILED` when there is no more specific operation error. Field
paths use GraphQL input paths, for example:

```ts
{
  message: "Variant option combination already exists",
  code: "VARIANT_COMBINATION_DUPLICATE",
  field: ["operations", "variants", "0", "options"]
}
```

For create operations, also include `clientMutationId` in the operation result.

## Operation-level behavior

After batch validation succeeds, operation execution may still produce
operation-level errors from existing script logic or repository constraints.

The workflow preserves current partial-failure semantics:

- one operation error does not automatically block unrelated operations;
- each operation returns its own `OperationResult`;
- `userErrors` aggregates operation errors for existing API behavior.

### `variantCreate`

`variantCreate` is partial inside one operation.

Main create portion:

- create variant row;
- create selected option links;
- build handle from selected option values.

The main create portion must be transactional. The current
`VariantCreateScript` creates the row and links but is not enough by itself for
spreadsheet-save, because additional create portions require inventory item
existence and partial-result metadata.

Additional portions:

- pricing;
- inventory;
- media;
- weight;
- dimensions.

Before applying `inventory` or `weight`, ensure an inventory item exists for the
created variant by calling the same inventory broker boundary used by product
create: `inventory.createItem`. If only `dimensions` is provided, no inventory
item is required by the current dimensions script because it writes physical
dimensions by `variantId`.

If the variant row and option links are created, but an additional portion
fails, return:

- `type: "variantCreate"`
- `applied: false`
- `clientMutationId`
- `entityId` with the created variant id
- `errors` for failed additional portions

This lets clients refetch the created variant while still matching backend
errors to the original draft operation.

If the main create portion fails, return:

- `applied: false`
- `clientMutationId`
- no `entityId`
- errors for the create failure

`clientMutationId` must not be treated as durable idempotency storage. It is
only a correlation key inside one GraphQL request/result. Retry safety for the
whole save request comes from the existing `x-idempotency-key` header, which is
used as `ServiceContext.requestId` and included in the DBOS workflow id.

### `variantUpdate`

`variantUpdate` keeps current behavior and can apply any supported subset of:

- `options`
- `pricing`
- `inventory`
- `media`
- `weight`
- `dimensions`

If options are changed, rebuild variant handle and include option changes in
the product update event payload.

Current workflow delegates inventory and dimensions through broker actions that
return success/errors but not change deltas. When those calls succeed, the
workflow must build event delta from the accepted params:

- `inventory` delta from `VariantInventoryParams`;
- `physical.dimensions` delta from `VariantDimensionsParams`;
- `physical.weight` delta from the weight update result or accepted weight
  param.

### `variantDelete`

`variantDelete` inside `productUpdate` always uses existing `VariantDeleteScript`
soft-delete semantics (`permanent: false`). Hard delete remains available only
through the standalone `variantDelete` mutation, which stays outside the
spreadsheet-save contract.

The delete operation result is:

- `type: "variantDelete"`
- `applied: true` on success
- `entityId` with deleted variant id
- `errors: []`

The workflow must emit `productUpdated` with the deleted variant id in
`variants` and `lifecycle: "deleted"` so existing `productUpdated` consumers can
refresh/remove search index rows through the affected variant id list.

## ProductUpdatePayload and operation results

The existing `ProductUpdatePayload` remains the response shape.

Ensure GraphQL schema exposes enough fields for new result metadata:

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

Research result: the current schema already uses `enum OperationType`, so extend
that enum with `VARIANT_CREATE` and `VARIANT_DELETE`. Do not introduce string
operation types and do not introduce a second result type.

The GraphQL response layer must encode workflow `entityId` values as public
global IDs:

- `variantCreate.entityId` -> `GlobalIdEntity.Variant`;
- `variantDelete.entityId` -> `GlobalIdEntity.Variant`.

## Domain events

`ProductUpdateWorkflow` currently emits `productUpdated` with partial snapshot
changes. Extend the variant changes payload so consumers can observe:

- created variant id and selected options;
- updated variant fields;
- deleted variant id;
- pricing/media/physical changes that were applied.

Use this stable event DTO shape for each changed variant:

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

Update both:

- `services/catalog/src/scripts/types/ProductChanges.ts`
- `packages/events/src/types.ts`

Current `packages/events` already uses `physical`, while local
`ProductChanges` currently has separate `dimensions` and `weight`; align local
workflow changes to the event package shape.

Do not emit `productUpdated` when batch validation fails before revision
acquire.

For partial create failures, event payload must include the created variant
and the additional fields that actually applied. Failed additional portions
must not be represented as applied changes.

For variant delete inside `productUpdate`, emit `productUpdated` rather than a
separate `variantDeleted` event. Existing search sync reads affected variant ids
from `Object.keys(payload.variants)`, and `SyncVariantIndexScript` deletes a
requested variant index when the variant no longer loads.

## Repositories and scripts

Prefer reusing existing scripts where possible:

- `VariantCreateScript`
- `VariantDeleteScript`
- `VariantUpdateMediaScript`
- `VariantUpdateOptionsScript`
- `VariantUpdatePricingScript`
- inventory, physical/dimensions scripts or broker calls used by current
  `variantUpdate`

Research findings:

- `VariantCreateScript` validates product/options and creates variant links, but
  it currently is not the complete spreadsheet create step because it does not
  create an inventory item and does not expose `clientMutationId`/partial-create
  result metadata.
- `VariantDeleteScript` is transactional and clears variant media on soft delete;
  call it with default `permanent: false`.
- `VariantUpdateMediaScript` requires variant media file ids to already be
  registered as product media through `product_media`.
- `VariantUpdatePricingScript` validates currency against `UAH`, `USD`, `EUR`
  and rejects negative amounts.
- `InventoryItemUpdateScript` validates warehouse existence, stock quantities,
  SKU uniqueness, positive weight, supported unit-cost currency, and non-negative
  unit cost.
- `InventoryItemUpdateDimensionsScript` validates positive dimensions but does
  not currently validate variant ownership by product by itself; workflow batch
  validation must do that before calling it.

Add repository methods only where batch validation would otherwise require
repeated per-operation reads.

Existing useful repository capabilities, combining methods where needed:

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

- make the variant row + option links create path transactional;
- centralize "create variant with option links" in one script/repository helper
  so transaction boundaries are not spread across workflow code;
- use `findByProductId` maps for ownership validation first; add explicit
  product ownership guard helpers only when they reduce duplicated validation
  code.

## Codegen and generated files

After schema edits, run project codegen through the project-approved toolchain:

```bash
shopana codegen --service catalog
```

Generated files expected to change:

- `services/catalog/src/resolvers/admin/generated/types.ts`
- `services/catalog/src/resolvers/admin/generated/schemas.ts`

Do not manually edit generated files except as a last resort; generated output
must come from codegen.

## Backward compatibility and migration

Backward compatibility is intentionally not provided.

## Bulk update impact

`ProductBulkUpdateInput` currently reuses `ProductUpdateInput` for each product
item. Because `ProductUpdateInput.variants` becomes
`[VariantOperationInput!]`, bulk update requests are affected by the same
breaking change.

There is no separate bulk variant API contract and no separate bulk workflow
design in scope. Bulk continues to reuse the same `ProductUpdateInput`
contract and the same `ProductUpdateWorkflow` operation types as single
`productUpdate`.

Required bulk update work:

- Ensure bulk product update schema/codegen picks up
  `ProductUpdateInput.variants: [VariantOperationInput!]`.
- Extract a shared `ProductUpdateInput` mapper used by both single
  `productUpdate` and `productBulkUpdate`. Current code has separate mapping
  paths and both currently assume variant update only.
- Keep request order within each product item's `operations` so bulk
  `operationResults` remain aligned with the input operations.
- Use bulk-aware field paths for validation and decode errors, for example:
  `["input", "products", productIndex, "operations", "variants", variantIndex,
  "options"]`.
- Preserve `clientMutationId` for bulk variant create operations.
- Keep existing inventory support for bulk variant updates and creates through
  `VariantOperationInput.inventory`.
- Do not introduce a separate bulk-only variant operation contract.
- Extend `BulkUpdateOpType` with `VARIANT_CREATE` and `VARIANT_DELETE`.
- Extend `BulkEditCreateJobScript.getOperationMetadata`:
  - `variantCreate`: `opType: "variantCreate"`, `variantId: null` at job
    creation time;
  - `variantUpdate`: `opType: "variantUpdate"`, `variantId`;
  - `variantDelete`: `opType: "variantDelete"`, `variantId`.
- Extend `BulkUpdateItemResolver.OP_TYPE_MAP` for `variantCreate` and
  `variantDelete`.
- Decode/action-shape errors found by the shared mapper happen before job
  creation and fail the whole `productBulkUpdate` mutation with `userErrors`.
  No product revision is acquired in that path.
- Product-state batch validation failures happen inside `ProductUpdateWorkflow`
  for a product group. They must mark that product group's items as failed,
  must not acquire/increment that product's revision, and must not stop unrelated
  product groups in the same job from being processed.

Bulk result surface decision:

- `ProductBulkUpdatePayload` remains `{ job, userErrors }`.
- Per-operation success/failure is observed through `BulkUpdateItem.status` and
  `BulkUpdateItem.errors`.
- Bulk create `entityId` is not exposed in this change. Adding it requires a
  separate nullable result field in `bulk_edit_item`, repository update methods,
  and `BulkUpdateItem` GraphQL schema.

Required backend migration work:

- Replace all backend references to old `VariantUpdateInput` as the
  `ProductUpdateInput.variants` item type.
- Ensure resolver mapping no longer assumes every `variants[]` item is an
  update.
- Ensure bulk resolver mapping no longer assumes every `variants[]` item is an
  update.
- Ensure generated validation schema requires `action`.
- Update docs/comments that describe `ProductUpdateInput.variants` as update
  only.
- Keep or separately deprecate standalone `variantCreate`; it is not part of
  the spreadsheet-save path.

Required client migration note:

- All clients that send `ProductUpdateInput.variants` must now send
  `VariantOperationInput` with explicit `action`.
- Existing variant edits must send `action: "UPDATE"` and `variantId`.
- New variant creation must send `action: "CREATE"` and `clientMutationId`.
- Variant deletion must send `action: "DELETE"` and `variantId`.
- Existing inventory edits inside `ProductUpdateInput.variants` remain supported,
  but must be sent inside a `VariantOperationInput` with explicit `action`.

## Backend acceptance criteria

- `ProductUpdateInput.variants` is `[VariantOperationInput!]`.
- Old `VariantUpdateInput` item shape is no longer accepted for
  `ProductUpdateInput.variants`.
- `VariantOperationAction` supports `CREATE`, `UPDATE`, `DELETE`.
- `productUpdate` maps variant operations to workflow operation types:
  `variantCreate`, `variantUpdate`, `variantDelete`.
- Single and bulk paths use the same `ProductUpdateInput` mapper.
- Workflow DTO includes `VariantCreateParams` and `VariantDeleteParams`.
- `OperationResult` includes `variantCreate`, `variantUpdate`,
  `variantDelete`, `clientMutationId`, and `entityId`.
- Batch validation runs before optimistic revision acquire/increment.
- Failed batch validation does not change `product.revision`.
- Duplicate option combinations are rejected before writes.
- Create operations create variant row and option links in the product update
  workflow.
- Create operations ensure an inventory item exists before applying inventory or
  weight fields.
- Create operations can apply pricing/inventory/media/weight/dimensions in the same
  workflow.
- Update operations keep existing inventory update support through
  `ProductUpdateInput.variants`.
- Delete operations run through the product update workflow.
- Delete operations use soft-delete semantics in `productUpdate`.
- Operation errors are returned through `ProductUpdatePayload.operationResults`
  and aggregated in `ProductUpdatePayload.userErrors`.
- Create operation results preserve `clientMutationId`.
- Create operation results return `entityId` when a variant was created.
- Bulk update accepts the same `VariantOperationInput` contract and maps
  `CREATE`, `UPDATE` and `DELETE` variant actions correctly.
- `BulkUpdateOpType` and bulk item resolver mappings expose `VARIANT_CREATE`
  and `VARIANT_DELETE`.
- Bulk validation errors use product-indexed field paths.
- `productUpdated` variant payload uses the aligned lifecycle/physical event
  shape in local and package event DTOs.
- No new spreadsheet-specific GraphQL mutation is introduced.

## Non-goals

- No frontend implementation.
- No UI draft row state design.
- No persisted zustand store changes.
- No `variantCreate` frontend orchestration.
- No additive compatibility field for creates.
- No backward-compatible support for old `variants: [VariantUpdateInput!]`.
