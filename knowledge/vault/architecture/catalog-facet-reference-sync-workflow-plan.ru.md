# План DBOS workflow для синхронизации facet reference state

## Контекст

В catalog service уже есть модель facets:

- `facet_source.reference_status` хранит состояние ссылки facet source на raw source в каталоге;
- `facet_value.kind = 'source'` хранит raw source value;
- `facet_value.kind = 'display'` хранит пользовательскую display-группу;
- `facet_value.reference_status` имеет значения `VALID | STALE`;
- для `facet_value.kind = 'display'` в БД есть constraint: display value всегда должен иметь `reference_status = 'VALID'`.

Сейчас source value handles уже нормализованы через candidate views:

| Facet type | Source handle | Source value handle |
| --- | --- | --- |
| `TAG` | `tags` | `tag.handle` |
| `OPTION` | `product_option.slug` | `product_option.slug || ':' || product_option_value.slug` |
| `FEATURE` | `product_feature.slug` | `product_feature.slug || ':' || product_feature_value.slug` |

Существующие входные события:

- `productCreated`;
- `productUpdated`;
- `productDeleted`;
- `variantDeleted`;
- batch handlers через `@BatchEventHandler(...)`.

`productUpdated` уже содержит `product.tags` и `variants[*].options/lifecycle`, но не содержит изменения `product.options` и `product.features`. Отдельные mutations `productOption*` и `productFeature*` сейчас не эмитят `productUpdated`, поэтому без расширения event contract sync не увидит эти изменения.

## Цель

Добавить DBOS workflow `catalog.facetReferenceSync`, который синхронизирует facet reference state после изменений product/variant source data:

- определяет, затронули ли события `features`, `options`, `tags`, create/delete product или create/update/delete variant;
- находит affected facet source handles и facet value handles;
- обновляет `referenceStatus` для затронутых `facet_source` и source `facet_value`;
- корректно учитывает `facet_value.kind = 'display'`: display value не переводится в `STALE`, но изменения его source children считаются изменением effective display value;
- эмитит отдельное batched event `facetReferenceStateChanged` для изменений reference/effective facet state.

## Non-goals

- Не создавать новые facet values автоматически из raw catalog values.
- Не менять UI.
- Не включать `PRICE` и `IN_STOCK`: у них нет raw source values в текущей модели.
- Не переносить listing sync в этот workflow. Listing может подписаться на новые facet events отдельным шагом.

## Ключевые решения

### 1. Reference status считается по raw source data

`referenceStatus = VALID`, если в catalog найдена хотя бы одна живая raw сущность с тем же normalized handle.

Правила проверки:

| Type | VALID если |
| --- | --- |
| `TAG` | существует `catalog.tag` с `tag.handle = valueHandle` |
| `OPTION` source | существует active product с `product_option.slug = sourceHandle` |
| `OPTION` value | существует active product с парой `product_option.slug = sourceHandle` и `product_option_value.slug = rawValueHandle` |
| `FEATURE` source | существует active product с non-group `product_feature.slug = sourceHandle` |
| `FEATURE` value | существует active product с non-group `product_feature.slug = sourceHandle` и `product_feature_value.slug = rawValueHandle` |

Для `OPTION` и `FEATURE` active product означает `product.deleted_at IS NULL`. Это важно для soft delete: product-specific options/features физически остаются в БД, но не должны поддерживать reference state после удаления продукта из active catalog.

Для `TAG` product assignment сам по себе не делает tag stale, если tag entity продолжает существовать. События product tag assignment всё равно могут затрагивать listing facet selections, но reference status для tag value меняется только при появлении/исчезновении `tag.handle`.

### 2. Старые handles должны попадать в event payload

Точечный sync невозможен после rename/delete, если событие содержит только новое состояние.

Нужно расширить payload для option/feature mutations и product deletion:

```ts
type FacetSourceRef = {
  facetType: "TAG" | "OPTION" | "FEATURE";
  sourceHandle: string;
  valueHandle?: string;
  facetValueHandle?: string;
};
```

Для `OPTION`/`FEATURE`:

- `sourceHandle` = option/feature slug;
- `valueHandle` = option/feature value slug;
- `facetValueHandle` = `${sourceHandle}:${valueHandle}`.

Для `TAG`:

- `sourceHandle = "tags"`;
- `valueHandle = tag.handle`;
- `facetValueHandle = tag.handle`.

Event payload должен передавать both sides для rename:

```ts
type FacetReferenceChange = {
  before?: FacetSourceRef;
  after?: FacetSourceRef;
  reason:
    | "productCreated"
    | "productDeleted"
    | "sourceCreated"
    | "sourceUpdated"
    | "sourceDeleted"
    | "sourceValueCreated"
    | "sourceValueUpdated"
    | "sourceValueDeleted"
    | "assignmentChanged";
};
```

Минимально нужно добавить в `productUpdated`:

```ts
product?: {
  tags?: ProductTagFieldChanges;
  options?: { changed: true; refs: FacetReferenceChange[] };
  features?: { changed: true; refs: FacetReferenceChange[] };
}
```

И в `productDeleted`:

```ts
facetReferenceRefs?: FacetReferenceChange[];
```

`ProductDeleteScript` должен собрать refs до hard delete. Для soft delete тоже лучше передавать refs из pre-delete snapshot, чтобы workflow не зависел от физического состояния rows после удаления.

### 3. Display values остаются VALID, но effective state меняется

`facet_value.kind = 'display'` нельзя переводить в `STALE`.

Когда source child под display value меняет статус:

- обновляется только child source `facet_value.referenceStatus`;
- parent display value остается `VALID`;
- parent display value попадает в `affectedDisplayValueIds`;
- `facetReferenceStateChanged` должен содержать связь source child -> display parent.

Дополнительно нужно исправить effective facet value resolution в listing snapshot:

- сейчас `ListingSnapshotBuildScript.loadEffectiveFacetValues()` берет parent display value как effective value и проверяет status parent;
- для source child под display parent надо также требовать `source.referenceStatus = 'VALID'`;
- иначе stale source child продолжит попадать в listing через всегда-valid display parent.

## Триггеры

### Single events

Добавить обработку:

- `productCreated`;
- `productUpdated`;
- `productDeleted`;
- `variantDeleted`.

`productUpdated` запускает sync только если есть хотя бы одно условие:

- `payload.product?.tags?.changed`;
- `payload.product?.options?.changed`;
- `payload.product?.features?.changed`;
- любой `payload.variants[*].lifecycle` в `created | deleted`;
- любой `payload.variants[*].options`.

`productCreated` и `productDeleted` запускают sync всегда.

`variantDeleted` запускает sync, если нужно пересчитать effective facet selections. Для raw reference status он может дать no-op, потому что option/feature source values живут на product, а не на variant.

### Batch events

Для `.batch` нужно группировать события по `storeId` и запускать один workflow на store:

```ts
await broker.startWorkflow(
  "catalog.facetReferenceSync",
  {
    storeId,
    organizationId,
    events: normalizedEvents,
    trigger: "eventBatch",
  },
  {
    source: "content",
    tenantId: organizationId,
    resourceId: storeId,
    operation: "facetReferenceSyncBatch",
    content: {
      eventIds: normalizedEvents.map((event) => event.eventId).sort(),
    },
  },
);
```

Важно: текущие event handlers вызываются из `EventDispatchWorkflow` step. Если DBOS запрещает старт child workflow внутри `DBOS.runStep`, нужно сначала добавить workflow-backed event handler adapter в events service: dispatcher должен стартовать `catalog.facetReferenceSync` из body workflow, а не из handler step. До реализации это проверить коротким runtime smoke.

## Workflow input/output

```ts
export interface FacetReferenceSyncWorkflowInput {
  storeId: string;
  organizationId: string;
  userId?: string;
  trigger:
    | "productCreated"
    | "productUpdated"
    | "productDeleted"
    | "variantDeleted"
    | "eventBatch"
    | "manual";
  events: FacetReferenceSyncEventInput[];
}

export interface FacetReferenceSyncEventInput {
  eventId: string;
  eventType: string;
  timestamp: string;
  productId?: string;
  variantId?: string;
  refs?: FacetReferenceChange[];
  payload: unknown;
}

export interface FacetReferenceSyncWorkflowResult {
  storeId: string;
  affectedFacetIds: string[];
  affectedFacetValueIds: string[];
  affectedDisplayValueIds: string[];
  sourceStatusChanged: number;
  valueStatusChanged: number;
  emittedEventIds: string[];
}
```

## Workflow steps

### Step 1. Normalize events

Собрать normalized input:

- удалить duplicate `eventId`;
- отсортировать события по `timestamp`, затем `eventId`;
- определить общий `userId` для emitted events, если есть;
- отделить события, которые точно не затрагивают facets.

### Step 2. Collect affected refs

Источники refs:

1. `payload.product.options/features.refs` из расширенного `productUpdated`;
2. `payload.facetReferenceRefs` из `productDeleted`;
3. hydrate current product snapshot для `productCreated`;
4. hydrate current IDs из `productUpdated.product.tags.tagIds`;
5. hydrate option value IDs из `productUpdated.variants[*].options`;
6. fallback full product snapshot для soft-deleted product, если delete event пришел без refs и product row ещё доступен.

Fallback для hard delete без refs:

- не пытаться угадывать source handles по удаленному productId;
- запустить bounded full reconciliation для всех persisted source facet values выбранного store;
- залогировать warning, потому что это дороже и должно исчезнуть после расширения payload.

### Step 3. Resolve affected persisted facet rows

Нужен новый repository слой, например `FacetReferenceRepository`, с методами:

```ts
findAffectedSources(refs: FacetSourceRef[]): Promise<FacetSourceRow[]>;
findAffectedSourceValues(refs: FacetSourceRef[]): Promise<FacetValueRow[]>;
findDisplayParents(sourceValueIds: string[]): Promise<FacetValueRow[]>;
```

Поиск persisted rows:

- join `facet` -> `facet_source` по `facet_id`;
- source row матчится по `facet_type + sourceHandle`;
- source value row матчится по `facet_id + facetValueHandle + kind = 'source'`;
- display parent находится через `facet_value.parent_id`.

### Step 4. Compute current reference state

Нужны bulk queries:

```ts
findExistingTagHandles(handles: string[]): Promise<Set<string>>;
findExistingOptionSourceHandles(sourceHandles: string[]): Promise<Set<string>>;
findExistingOptionValueHandles(handles: string[]): Promise<Set<string>>;
findExistingFeatureSourceHandles(sourceHandles: string[]): Promise<Set<string>>;
findExistingFeatureValueHandles(handles: string[]): Promise<Set<string>>;
```

Для `OPTION`/`FEATURE` value handles нужно парсить `source:value`.

Проверки должны быть project-scoped:

- `project_id = storeId`;
- для option/feature join active `product`;
- для feature `is_group = false`.

### Step 5. Update reference statuses

Обновлять только rows, где status реально изменился или нужен `referenceCheckedAt` refresh.

Правила:

- `facet_source.referenceStatus = VALID | STALE`;
- source `facet_value.referenceStatus = VALID | STALE`;
- source `facet_value.referenceStatusChangedAt` меняется только при смене status;
- `referenceCheckedAt` обновляется при каждой проверке;
- display `facet_value` не обновляется в `STALE`.

Возвращать delta:

```ts
type ReferenceStatusDelta = {
  facetId: string;
  entityType: "facetSource" | "facetValue";
  entityId: string;
  handle: string;
  previousStatus: "VALID" | "STALE";
  nextStatus: "VALID" | "STALE";
  displayParentId?: string;
};
```

### Step 6. Build affected facets

Facet считается affected, если:

- изменился `facet_source.referenceStatus`;
- изменился source `facet_value.referenceStatus`;
- source value под display parent изменил status;
- source handle использовался в affected product/variant selection и persisted facet source существует.

Для каждого affected facet собрать:

- `facetId`;
- changed source ids;
- changed source value ids;
- affected display value ids;
- touched source handles;
- touched source value handles.

### Step 7. Emit batched facet reference events

Эмитить через `events.emit` из workflow.

Не переиспользовать существующее CRUD-событие `facetUpdated`: у него уже есть публичный payload для изменений настроек facet. Reference sync должен иметь отдельный event type, чтобы не ломать существующих consumers и типы.

Event type:

```ts
type FacetReferenceStateChangedPayload = {
  storeId: string;
  facetId: string;
  reasons: Array<
    | "referenceStateChanged"
    | "sourceSelectionChanged"
    | "sourceValueSelectionChanged"
  >;
  sourceChanges: ReferenceStatusDelta[];
  valueChanges: ReferenceStatusDelta[];
  changedFacetSourceIds: string[];
  changedFacetValueIds: string[];
  affectedDisplayValueIds: string[];
  touchedSourceHandles: string[];
  touchedSourceValueHandles: string[];
  triggerEventIds: string[];
};
```

Emit policy:

- если были reference deltas или изменился effective facet state, эмитить `facetReferenceStateChanged`;
- если workflow только проверил refs и не нашел изменений reference/effective state, event не эмитить;
- использовать deferred dispatch с одним batch key на workflow:

```ts
dispatch: {
  mode: "deferred",
  batchKey: `catalog:facet-reference-sync:${storeId}:${DBOS.workflowID}`,
  aggregateKey: `facet:${facetId}`,
}
```

После всех emits вызвать:

```ts
await broker.call("events.dispatch", {
  kind: "batch",
  tenantId: organizationId,
  batchKey,
});
```

`events.dispatch` сам сгруппирует records по `eventType`, поэтому можно не передавать `eventType`.

## Изменения по файлам

### Events package

`packages/events/src/types.ts`:

- расширить `ProductFieldChanges` полями `options` и `features`;
- добавить shared типы `FacetSourceRef`, `FacetReferenceChange`;
- расширить `ProductDeletedEvent.payload` полем `facetReferenceRefs`;
- добавить тип `FacetReferenceStateChangedEvent`;
- не менять payload существующего `FacetUpdatedEvent` для reference sync.

### Catalog scripts/resolvers

Нужно добавить сбор refs в местах, где raw source handles могут появиться, исчезнуть или переименоваться:

- `ProductCreateSaga`: для product create можно hydrate после create, потому это only-after состояние;
- `ProductDeleteScript`: собрать refs до delete;
- `OptionCreateScript`, `OptionUpdateScript`, `OptionDeleteScript`, `OptionsSyncScript`;
- `FeatureCreateScript`, `FeatureUpdateScript`, `FeatureDeleteScript`, `FeaturesSyncScript`;
- product tag add/remove paths могут передавать touched tag ids/handles как assignment refs.

Для option/feature mutations нужно эмитить `productUpdated` либо напрямую запускать общий facet sync workflow. Предпочтительно эмитить `productUpdated`, чтобы один event-driven path обслуживал все источники.

### Catalog workflow

Создать:

- `services/catalog/src/workflows/FacetReferenceSyncWorkflow.ts`;
- `services/catalog/src/workflows/dto/FacetReferenceSyncWorkflowDto.ts`;
- экспортировать workflow из `services/catalog/src/workflows/index.ts`.

Workflow должен наследоваться от `BrokerWorkflows`, как `ProductUpdateWorkflow`.

### Catalog repository

Добавить `FacetReferenceRepository` или расширить facet repositories:

- bulk resolve affected persisted `facet_source`;
- bulk resolve affected source `facet_value`;
- bulk compute raw source existence;
- bulk update statuses with delta return.

Лучше отдельный repository, потому логика относится не к CRUD facet, а к reconciliation.

### Catalog handlers

В `services/catalog/src/handlers/index.ts`:

- добавить facet sync trigger в single handlers;
- добавить batch grouping by store для batch handlers;
- не смешивать errors listing/category sync и facet sync: batch response должен агрегировать failedEventIds отдельно.

Если старт workflow из handler внутри event dispatch step окажется несовместим с DBOS, реализовать workflow-backed handler adapter в events service и перенести trigger туда.

### Listing snapshot

В `ListingSnapshotBuildScript.loadEffectiveFacetValues()`:

- source row должен быть `enabled = true` и `referenceStatus = VALID`;
- если есть display parent, parent тоже должен быть `enabled = true` и `referenceStatus = VALID`;
- stale source child под display parent не должен резолвиться в display value.

## Idempotency

Single event:

```ts
{
  source: "content",
  tenantId: event.context.tenantId,
  resourceId: event.eventId,
  operation: "facetReferenceSyncEvent",
  content: {
    eventId: event.eventId,
    eventType: event.eventType,
    timestamp: event.timestamp,
  },
}
```

Batch:

```ts
{
  source: "content",
  tenantId: organizationId,
  resourceId: storeId,
  operation: "facetReferenceSyncBatch",
  content: {
    eventIds: eventIds.sort(),
    eventTypes: eventTypes.sort(),
  },
}
```

Manual reconciliation:

```ts
{
  source: "content",
  tenantId: organizationId,
  resourceId: storeId,
  operation: "facetReferenceSyncManual",
  content: { refs, requestedAtBucket },
}
```

## Rollout plan

### Phase 1. Event contract и source refs

1. Добавить shared types в `packages/events`.
2. Расширить product update/delete payload.
3. Собрать before/after refs в option/feature scripts.
4. Добавить refs в product delete до hard delete.
5. Добавить emit `productUpdated` из option/feature mutations или прямой trigger общего sync path.

### Phase 2. Repository reconciliation

1. Добавить bulk queries raw source existence.
2. Добавить поиск affected persisted facet rows.
3. Добавить status update с delta output.
4. Добавить fallback full reconciliation для delete events без refs.

### Phase 3. DBOS workflow

1. Создать DTO и `FacetReferenceSyncWorkflow`.
2. Реализовать steps normalize -> collect refs -> resolve rows -> compute state -> update statuses -> emit events.
3. Подключить workflow в `workflows/index.ts`.
4. Добавить idempotency для single и batch triggers.

### Phase 4. Event handlers

1. Подключить trigger к `productCreated`, `productUpdated`, `productDeleted`, `variantDeleted`.
2. Подключить batch trigger к `.batch` handlers.
3. Проверить DBOS child workflow behavior из event handler.
4. Если нужно, вынести запуск в workflow-backed event handler adapter.

### Phase 5. Effective display semantics

1. Исправить `ListingSnapshotBuildScript.loadEffectiveFacetValues()`.
2. Добавить event payload fields для `affectedDisplayValueIds`.
3. Убедиться, что display value не получает `STALE`.

### Phase 6. Verification

По проектным правилам не запускать `test` и `tsc`.

Для проверки после реализации:

- запускать build, если нужна новая версия кода;
- проверить сценарии через targeted scripts/manual DB fixtures;
- отдельно проверить hard delete with refs и fallback без refs;
- проверить display group: stale child не должен попадать в effective listing value.

## Edge cases

- Rename option slug: нужно обновить old `size:m` в `STALE` и new `fit:m` в `VALID`, если оба есть в persisted facet values.
- Rename option value slug: old `size:m` -> `STALE`, new `size:medium` -> `VALID`.
- Delete единственного product с source value: value становится `STALE`, если больше нет active product с такой же slug-парой.
- Soft delete product: product-specific option/feature refs должны считаться inactive.
- Hard delete без refs: точный sync невозможен, нужен full reconciliation fallback.
- Display group с двумя children, где один стал stale: display остается visible, но stale child больше не должен резолвиться в display selection.
- Display group со всеми stale children: display остается `VALID`, но effective source selections для него исчезают.
- Duplicate source values across products: status остается `VALID`, пока существует хотя бы один active raw source value с таким же normalized handle.

## Открытые решения

1. Нужно ли считать tag value `STALE`, когда tag exists, но не назначен ни одному active product? Текущий план считает tag reference valid по наличию `tag.handle`, потому tag является global source entity.
2. Нужно ли `facetReferenceStateChanged` эмитить при assignment-only changes без reference deltas? Текущий план допускает это для downstream listing/search consumers, но `reasons` должен отличать `sourceSelectionChanged` от `referenceStateChanged`.
3. Нужно ли делать отдельный `facetReferenceReconcile` manual action для админского repair/backfill? Рекомендуется добавить после основного workflow.
