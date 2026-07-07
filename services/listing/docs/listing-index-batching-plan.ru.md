# План батчинга переиндексации listing index

## Контекст

Сейчас listing index обновляется через item-level DBOS workflows:

- `productCreated` и `productUpdated` в `ListingProductEventHandlers`
  запускают `listing.syncSellableItemIndex` на один product;
- `productDeleted` запускает `listing.deleteSellableItemIndex` на один item;
- `FacetAffectedProductsResyncWorkflow` находит affected products постранично,
  но затем эмитит `listingFacetMembershipChanged` для каждого product;
- каждый `listingFacetMembershipChanged` снова превращается в single-product
  `listing.syncSellableItemIndex`;
- `ListingWriteIndexActionScript` пишет все физические таблицы индекса внутри
  item-level transaction;
- posting bitmap memberships заменяются по одному doc id и по одному
  `valueKey`.

Такая модель корректна для одиночных live updates, потому что сохраняет порядок
по `storeId + entityType + itemId`, но плохо масштабируется для массовых
изменений:

- facet merge/unmerge может затронуть тысячи products;
- bulk product import/update может создать очередь из тысяч DBOS workflows;
- roaring bitmap update делает много мелких SQL операций;
- facet reference state sync создает вторую волну per-product workflows.

## Цель

Добавить batch path для переиндексации products, не ломая существующий
single-item path.

Новая архитектура должна:

- обрабатывать facet changes постраничными batch workflows;
- группировать `productCreated`/`productUpdated` события в batch event handler;
- сохранять stale/idempotency guarantees на уровне каждого product;
- уменьшить количество DBOS workflows, catalog queries и bitmap writes;
- оставить `productDeleted` item-level;
- не менять публичную storefront query модель;
- не требовать глобального rebuild как основного способа синхронизации.

## Non-goals

- Не переписывать весь listing index storage.
- Не добавлять partial patch semantics для listing snapshot.
- Не менять contract `ListingSellableItemSnapshot`: snapshot остается полным.
- Не батчить `productDeleted`, потому что delete path имеет более сложные
  stale/order конфликты.
- Не запускать `test` или `tsc` как часть реализации по проектному правилу.

## Основное решение

Ввести отдельный batch workflow:

```ts
listing.syncSellableItemIndexBatch
```

Он будет использоваться для двух источников:

1. batch facet changes: `FacetAffectedProductsResyncWorkflow` вместо
   per-product event fan-out запускает batch workflow на каждую страницу
   affected product ids;
2. batch product event handler: существующий events service доставляет
   deferred `productCreated`/`productUpdated` события через `@BatchEventHandler`,
   а listing handler coalesce-ит события внутри полученной пачки и запускает
   `listing.syncSellableItemIndexBatch`.

Single-item workflows остаются:

- fallback для низкого traffic;
- путь для `productDeleted`;
- инструмент точечной переиндексации одного item;
- совместимый путь для старых callers.

## Инварианты

- `sourceSequence` остается монотонным для конкретного
  `storeId + entityType + itemId`.
- Решение `applied | noop | ignored_stale` принимается отдельно для каждого
  product.
- Item state lock берется на каждый product, но внутри batch locks всегда
  сортируются по `itemId`, чтобы избежать deadlocks.
- Batch workflow не должен держать одну огромную transaction на тысячи
  products. Batch page ограничивается размером и количеством variants.
- Physical writes внутри batch должны быть idempotent на database уровне.
- Ошибка одного product в массовом facet/bulk batch не должна отменять
  успешную запись остальных products.
- Для batch product events с live updates допускается retry whole batch, если
  ошибка инфраструктурная; item-level validation errors должны попадать в
  per-item result.
- Queue partition для batch не должен быть item-scoped, иначе batch снова
  распадется на одиночное выполнение.

## Batch workflow contract

### Input

```ts
type ListingIndexBatchReason =
  | "facet_created"
  | "facet_deleted"
  | "facet_value_created"
  | "facet_value_updated"
  | "facet_value_deleted"
  | "facet_value_merged"
  | "facet_value_unmerged"
  | "product_created"
  | "product_updated"
  | "bulk_product_update"
  | "manual_reindex";

type ListingSyncSellableItemIndexBatchInput = {
  organizationId: string;
  storeId: string;
  reason: ListingIndexBatchReason;
  operationId: string;
  batchId: string;
  productIds: string[];
  sourceSequenceByProductId: Record<string, number>;
  expectedRevisionByProductId?: Record<string, number>;
  occurredAt: string;
  source: {
    service: "catalog" | "listing";
    actor: "system" | "admin" | "migration" | "api";
    requestId?: string;
    workflowId?: string;
  };
};
```

Правила:

- `productIds` должен быть unique и отсортирован до запуска workflow.
- `sourceSequenceByProductId` обязателен. Значения могут быть одинаковыми для
  разных products, например при одном facet event. Нельзя принимать
  stale/idempotency decision один раз на уровне batch: sequence должен
  проверяться отдельно для каждого product.
- `batchId` стабилен для одной страницы/окна батчинга и участвует в
  idempotency context batch workflow.
- Item-level `effectiveIdempotencyKey` строится по тем же правилам, что и в
  single-item path: `rawIdempotencyKey + storeId + itemId + actionType +
  sourceSequence`.

### Result

```ts
type ListingSyncSellableItemIndexBatchResult = {
  operationId: string;
  batchId: string;
  storeId: string;
  total: number;
  applied: number;
  noop: number;
  ignoredStale: number;
  missing: number;
  failed: number;
  results: Listing.ListingUpdateResult[];
  warnings: Listing.ListingUpdateWarning[];
};
```

Для больших batches `results` можно ограничить только failed/missing/noop
items, если DBOS history size станет проблемой. Полный массив допустим только
при небольшом размере страницы.

## Размеры batch

Рекомендуемые лимиты:

| Источник | Default | Hard cap | Дополнительное ограничение |
| --- | ---: | ---: | --- |
| facet changes | 100 products | 250 products | не больше 2000 variants на batch |
| product create/update batch handler | 50 products | 100 products | общий deferred `batchKey` / dispatch window |
| manual reindex | 100 products | 250 products | shard/page based |

Если страница products превышает `maxVariantsPerBatch`, workflow должен
разделить ее на меньшие chunks перед hydration/write.

## Chunking contract

Chunk - это подмножество products из одного batch input, которое записывается
одним write step и одной DB transaction.

Правила:

- product не делится между chunks;
- `productIds` перед chunking должны быть unique и отсортированы;
- порядок products внутри chunks сохраняет sorted `productIds`;
- chunk строится по двум лимитам:
  - `maxProductsPerChunk`;
  - `maxVariantsPerChunk`;
- если добавление следующего product превышает любой лимит, workflow закрывает
  текущий chunk и начинает новый;
- если один product сам превышает `maxVariantsPerChunk`, он идет отдельным
  chunk;
- hydration может выполняться на batch page, но write выполняется chunk-by-chunk;
- каждый write chunk является отдельным DBOS step;
- каждый chunk возвращает per-item results;
- workflow агрегирует chunk results в общий batch result;
- retry failed chunk не должен повторять chunks, которые уже persisted как
  completed DBOS steps.

## Batch workflow pipeline

```text
input product ids
  -> fetch store context once
  -> fetch catalog snapshots by product ids
  -> map catalog products to listing snapshots
  -> resolve facet selections for all snapshots in one step
  -> prepare item actions
  -> build write models
  -> write batch index
  -> start aggregated facet reference sync
```

### Step 1. Hydration

Добавить batch catalog selection:

```ts
where: {
  id: { _in: productIds }
}
```

Workflow должен:

- один раз вызвать `project.getStoreById`;
- одним catalog query получить products page;
- пометить отсутствующие products как `missing/noop`;
- проверить `product.storeId === input.storeId`;
- построить `Listing.SyncSellableItemParams` для каждого найденного product.

### Step 2. Batch facet resolution

Добавить script:

```ts
ListingResolveFacetSelectionsBatchScript
```

Он делает то же, что `ListingResolveFacetSelectionsScript`, но для массива
actions:

1. собрать source refs со всех product и variant facets;
2. одним запросом получить valid source values;
3. одним запросом получить display parents;
4. построить shared resolved map;
5. применить map к каждому item snapshot;
6. вернуть warnings per item.

Это убирает повторные lookup-и одинаковых facet values для сотен products.

### Step 3. Prepare и build write model

Prepare можно оставить item-level pure operation, но выполнить внутри одного
batch step:

```ts
for (const action of resolvedActions) {
  prepare(action);
  buildWriteModel(action);
}
```

Ошибки делятся на два класса:

- fatal infrastructure error: workflow retry;
- item validation error: item result `failed`, остальные items продолжают
  обрабатываться.

### Step 4. Batch write

Добавить script:

```ts
ListingWriteIndexBatchActionScript
```

Вход:

```ts
type ListingPreparedSyncBatchWriteAction = {
  actions: Array<{
    action: ListingPreparedSyncAction;
    syncWriteModel: ListingSyncWriteModel;
  }>;
};
```

Writer не должен применять `syncWriteModel` последовательно как
`for product -> write all tables`. Он должен сначала принять per-item decisions,
затем собрать merged write payload по таблицам и выполнить physical writes
table-by-table внутри transaction.

Порядок внутри script:

1. Отсортировать actions по `itemKey.itemId`.
2. В transaction взять locks `listingIndexItemState.lockByItem(...)`.
3. Для каждого item принять stale/noop/conflict decision.
4. Исключить `ignored_stale` и `noop` из physical writes.
5. Для applied items одним вызовом выделить product doc ids.
6. Для applied variants одним вызовом выделить variant doc ids.
7. Собрать `ListingMergedSyncBatchWritePayload`.
8. Выполнить batch writes по таблицам из merged payload.
9. Выполнить batch replace posting memberships.
10. Удалить stale variants по всем applied products.
11. Refresh projection blocks по union измененных variant doc ids.
12. Upsert latest item state для applied items.
13. Вернуть per-item results.

## Merged batch write payload

`ListingMergedSyncBatchWritePayload` - это промежуточная структура внутри batch
writer. Она не меняет public listing contract и не заменяет per-item
idempotency state. Ее задача - превратить набор applied item write models в
один payload, сгруппированный по физическим таблицам.

Пример формы:

```ts
type ListingMergedSyncBatchWritePayload = {
  items: Array<{
    action: ListingPreparedSyncAction;
    syncWriteModel: ListingSyncWriteModel;
    productDocId: number;
    variantDocIdsByVariantId: Map<string, number>;
    statePayloadHash: string;
  }>;

  productBootstrapRows: ProductListingBootstrapRowInput[];
  productRows: ProductListingIndexUpsertInput[];
  productPriceRowsByProductId: Map<string, ProductListingPriceRowInput[]>;
  productTitleRowsByProductId: Map<string, ProductTitleBm25RowInput[]>;
  productSortRowsByProductDocId: Map<number, ProductSortRowInput[]>;

  variantRows: VariantListingIndexUpsertInput[];
  variantPriceRowsByVariantId: Map<string, VariantListingPriceRowInput[]>;
  runtimePriceRowsByVariantDocId: Map<number, RuntimeVariantPriceRowInput[]>;

  productBitmapMemberships: Array<{
    productDocId: number;
    field: "category" | "vendor" | "facet";
    nextValueKeys: string[];
    valueKeyPrefixes?: string[];
  }>;

  variantBitmapMemberships: Array<{
    variantDocId: number;
    field: "facet" | "variant_product";
    nextValueKeys: string[];
    valueKeyPrefixes?: string[];
  }>;

  staleVariants: Array<{
    variantId: string;
    variantDocId: number;
  }>;

  projectionVariantDocIdsToRefresh: number[];
  stateRows: ListingIndexItemStateRow[];
};
```

Правила merge:

- каждый product сохраняет отдельный `action`, `sourceSequence`,
  `effectiveIdempotencyKey` и `statePayloadHash`;
- `ignored_stale`, `noop` и failed-before-write items не попадают в merged
  physical write payload;
- product rows, price rows, title rows, sort rows, variant rows и runtime price
  rows группируются по соответствующим repository batch input shapes;
- posting bitmap memberships не выполняются по одному product/variant, а
  сначала собираются в `productBitmapMemberships` и
  `variantBitmapMemberships`;
- stale variants считаются по applied products: existing variants minus variants
  из нового snapshot;
- projection refresh получает union актуальных и stale `variantDocId`;
- state rows создаются только для applied items после успешных physical writes.

Порядок physical writes в transaction:

```text
lock item states in sorted productId order
  -> decide applied/noop/ignored_stale/conflict per item
  -> allocate product doc ids for applied products
  -> allocate variant doc ids for applied variants
  -> build merged write payload
  -> ensure product bootstrap rows
  -> upsert product rows
  -> replace product price/title/sort rows
  -> batch replace product bitmap memberships
  -> upsert variant rows
  -> replace variant price/runtime price rows
  -> batch replace variant bitmap memberships
  -> delete stale variant dependencies
  -> refresh projection blocks
  -> upsert item states for applied items
```

## Batch writes по таблицам

Большая часть repository layer уже поддерживает batch методы. Batch writer
должен использовать их вместо item-level wrappers:

- `listingDocIdAllocator.allocateProductDocIds(productIds)`;
- `listingDocIdAllocator.allocateVariantDocIds(variantIds)`;
- `productListingIndex.ensureBootstrapRows(rows)`;
- `productListingIndex.upsertMany(rows)`;
- `productListingPriceIndex.replaceForProducts(rowsByProductId)`;
- `productTitleBm25SearchIndex.replaceForProducts(rowsByProductId)`;
- `listingPostingProductSort.replaceForProducts(rowsByProductDocId)`;
- `variantListingIndex.upsertMany(rows)`;
- `variantListingPriceIndex.replaceForVariants(rowsByVariantId)`;
- `listingPostingVariantPrice.replaceForVariants(rowsByVariantDocId)`;
- `listingPostingVariantProjectionBlock.refreshBlocksForVariantDocIds(docIds)`.

Эти вызовы должны получать данные из `ListingMergedSyncBatchWritePayload`, а не
из item-level loop, чтобы один chunk выполнял один набор операций по каждой
таблице.

## Batch bitmap delta API

Самая важная оптимизация: добавить batch replace memberships в
`ListingPostingBitmapRepository`.

Новые методы:

```ts
replaceProductMembershipsBatch(input: Array<{
  productDocId: number;
  field: PostingField;
  nextValueKeys: readonly string[];
  valueKeyPrefixes?: readonly string[];
}>): Promise<PostingMembershipReplaceResult>;

replaceVariantMembershipsBatch(input: Array<{
  variantDocId: number;
  field: PostingField;
  nextValueKeys: readonly string[];
  valueKeyPrefixes?: readonly string[];
}>): Promise<PostingMembershipReplaceResult>;
```

Алгоритм:

1. Сгруппировать input по `entityType + field`.
2. Одним SQL запросом получить current memberships для всех doc ids группы.
3. Для каждого doc id вычислить:
   - `valueKeysToAdd`;
   - `valueKeysToRemove`.
4. Перевернуть delta в формат:
   - `Map<valueKey, docIdsToAdd[]>`;
   - `Map<valueKey, docIdsToRemove[]>`.
5. Для каждого `valueKey` вызвать существующий `addDocIds` или
   `removeDocIds`, но передать массив doc ids.

Текущая сложность примерно:

```text
products * fields * valueKeys * SQL
```

После batch delta:

```text
changedValueKeys * SQL
```

## Batch для facet changes

### Текущий поток

```text
Facet mutation workflow
  -> FacetAffectedProductsResyncWorkflow
  -> find affected products page
  -> emit listingFacetMembershipChanged per product
  -> event handler per product
  -> listing.syncSellableItemIndex per product
```

### Новый поток

```text
Facet mutation workflow
  -> FacetAffectedProductsResyncWorkflow
  -> find affected products page
  -> listing.syncSellableItemIndexBatch(page)
```

`listingFacetMembershipChanged` можно оставить как compatibility/audit event,
но он не должен быть обязательным транспортом для массового reindex.

### Изменения в FacetAffectedProductsResyncWorkflow

1. Убрать накопление всех `emittedEventIds` в workflow output для больших
   операций.
2. Для каждой страницы affected products стартовать batch workflow:

```ts
await broker.startWorkflow(
  "listing.syncSellableItemIndexBatch",
  batchInput,
  idempotencyCtx,
  {
    queueName: LISTING_INDEX_ACTIONS_QUEUE,
    enqueueOptions: {
      queuePartitionKey: [
        storeId,
        "facet-resync",
        operationId,
        pageNo,
      ].join(":"),
    },
    workflowId,
  }
);
```

3. Результат workflow должен хранить счетчики:

```ts
{
  refsHash,
  affectedProductCount,
  batchWorkflowIds,
  startedBatchCount
}
```

4. `limit` по умолчанию оставить 100.

### Source sequence для facet changes

Facet changes не приходят из catalog product revision. Для них нужен stable
listing source sequence per product.

Текущая реализация `events.emit` уже назначает `domain_events.event_sequence`
как монотонный счетчик в рамках одного subject:

```text
organizationId + subject.type + subject.id
```

Для существующего event-based пути это означает, что `productUpdated` и
`listingFacetMembershipChanged` сравнимы между собой, если оба события имеют
одинаковый product subject:

```ts
subject: { type: "product", id: productId }
```

Именно так сейчас эмитится `listingFacetMembershipChanged`, поэтому его
`eventSequence` можно использовать как `sourceSequence` для того же product.

Рекомендуемый вариант:

- использовать `eventSequence` события `listingFacetMembershipChanged`, если
  compatibility event остается;
- для direct batch path нельзя использовать sequence из исходного facet mutation
  workflow/event, если этот sequence относится к subject facet/facetValue/operation,
  а не к `product:<productId>`;
- direct batch path должен либо выделять per-product `sourceSequence` через тот
  же per-product domain event stream, либо использовать отдельный monotonic
  sequence allocator для listing index item state;
- одинаковый sequence ожидаем для affected products одного facet event;
- одинаковый sequence разрешен для разных products, потому что stale/noop
  decision принимается отдельно по каждому product.

Важно: если после facet batch приходит более свежий `productUpdated` с большим
sourceSequence, facet batch должен стать `ignored_stale` для этого product.

Если direct batch path обходит per-product `events.emit`, нужно явно сохранить
эту же сравнимость sequence. Иначе batch facet changes могут конкурировать с
product updates и stale/noop decision в writer будет принимать решение по числам
из разных sequence streams.

## Batch product events

### Цель

Снизить количество workflows при burst updates:

- product import;
- bulk editor;
- массовое создание variants/options/prices;
- sequential product updates в рамках одного admin operation.

### Новый компонент

Добавить batch handlers в существующий listing event handler слой:

```ts
@BatchEventHandler("productCreated", { retry: { maxAttempts: 5 } })
@BatchEventHandler("productUpdated", { retry: { maxAttempts: 5 } })
```

Можно реализовать отдельным классом `ListingProductBatchEventHandlers` или
добавить методы в `ListingProductEventHandlers`.

Важно: отдельная таблица `listing_index_event_buffer` не нужна. В проекте уже
есть durable batch transport в events service:

- `events.emit` принимает `dispatch: { mode: "deferred", batchKey }`;
- событие сохраняется в `events.domain_events` с `dispatch_mode = deferred`;
- `events.dispatch` с `kind = "batch"` вызывает `claimBatch`;
- `claimBatch` выбирает pending rows по `organizationId + eventType + batchKey`
  через `FOR UPDATE SKIP LOCKED`;
- `EventDispatchWorkflow` вызывает action `${eventType}:batch`;
- `EventHandlers` регистрирует `@BatchEventHandler("productUpdated")` как
  broker action `productUpdated:batch`.

`productDeleted` остается single-item delete workflow. Для delete batch path не
вводится, потому что delete имеет более сложные stale/order конфликты.

### Требование к producer-ам product events

Batch product events появятся только если producer эмитит события как deferred:

```ts
await broker.runWorkflow("events.emit", {
  eventType: "productUpdated",
  ...,
  dispatch: {
    mode: "deferred",
    batchKey,
    aggregateKey: `product:${productId}`,
  },
});
```

Для bulk/import/admin batch операций catalog должен использовать стабильный
`batchKey`, общий для окна/операции, например:

```text
catalog:product-index:<storeId>:<operationId>
```

или time-bucket key, если upstream operation id нет:

```text
catalog:product-index:<storeId>:<floor(timestamp / 2s)>
```

После записи deferred events producer или orchestrator должен стартовать
dispatch:

```ts
await broker.call("events.dispatch", {
  kind: "batch",
  organizationId,
  eventType: "productUpdated",
  batchKey,
  limit: 100,
});
```

Immediate `productCreated`/`productUpdated` остаются совместимым single-item
path и обрабатываются текущими `@EventHandler`.

### Coalescing rules

При вызове listing batch handler:

1. получить `params.events` от `EventDispatchWorkflow`;
2. отфильтровать/разделить events по `storeId`;
3. сгруппировать по `productId`;
4. оставить только event с максимальным `eventSequence` для каждого product;
5. older events того же product считаются coalesced внутри handler response;
6. создать batch workflow для latest events.

Events service уже сделал durable claim rows перед вызовом handler:

1. выбрать pending rows по `organizationId + eventType + batchKey`, oldest first;
2. сгруппировать claimed records по `eventType`;
3. вызвать `productUpdated:batch`/`productCreated:batch`;
4. пометить dispatched только events, не попавшие в `failedEventIds`.

Coalescing по `productId` не является ответственностью events service. Это
listing-specific logic внутри batch handler-а.

Это важно: если один product обновился 10 раз за короткое окно, listing должен
переиндексировать только последнее состояние.

### Fallback

Если batch handler не может построить batch input для части events, он должен
вернуть `success: false` и `failedEventIds` только для этих events. Events
service повторит failed subset по retry policy batch handler-а.

Если producer отправил событие immediate, оно не попадает в batch dispatch и
обрабатывается текущим single-item handler-ом через
`enqueueListingSyncItemIndexWorkflow`.

Fallback должен логироваться как degraded mode.

## Очереди и partition keys

Использовать существующую queue:

```ts
listing_index_actions
```

Partition keys:

| Path | Partition key |
| --- | --- |
| single sync | `storeId:product:itemId` |
| single delete | `storeId:product:itemId` |
| facet batch page | `storeId:facet-resync:operationId:pageNo` |
| product event batch | `storeId:product-event-batch:batchKeyHash` |
| batch write workflow | `storeId:batch:batchId` |

Для batch workflows `concurrency: 1` внутри partition защищает только сам batch.
Item-level correctness обеспечивается locks в `listing_index_item_state`.

## Concurrency contract

Batch workflow и single-item workflows могут выполняться параллельно, потому
что batch partition не item-scoped. Корректность для конкретного product
обеспечивается только item lock в `listing_index_item_state`.

Правила:

- batch writer берет `listing_index_item_state` lock для каждого product;
- locks внутри batch всегда берутся в сортированном порядке по `itemId`;
- stale/noop/conflict decision выполняется после взятия item lock;
- physical writes выполняются только для items со статусом `applied`;
- `ignored_stale` и `noop` items не должны менять физические таблицы индекса;
- если single-item `productUpdated` с большим `sourceSequence` записался раньше,
  соответствующий item внутри batch получает `ignored_stale`;
- если batch item записался раньше, последующий single-item `productUpdated` с
  большим `sourceSequence` применяется как более свежий update.

## Aggregated facet reference sync

После batch write не нужно запускать `syncFacetReferenceState` на каждый product.

Добавить batch plan:

```ts
ListingBuildFacetReferenceSyncBatchPlanScript
```

Он собирает:

- old facet value keys для affected product/variant doc ids;
- new facet value keys из write models;
- refs через `facet.getSourceRefsByPostingValueKeys`.

Затем стартует один workflow:

```ts
listing.syncFacetReferenceState
```

или новый:

```ts
listing.syncFacetReferenceStateBatch
```

Можно оставить per-product sync, если нужно снизить объем изменения, но это
сохранит заметную часть workflow amplification.

## Idempotency

### Batch workflow id

Batch workflow id строится от:

```text
workflowName + storeId + batchId + operationId + reason + productIdsHash
```

`productIdsHash` нужен, чтобы случайное повторное использование `batchId` с
другим составом products не склеило разные workflows.

### Item effective idempotency

Для каждого product внутри batch:

```text
hash(
  rawIdempotencyKey,
  storeId,
  "product",
  productId,
  "syncSellableItem",
  sourceSequence
)
```

Raw idempotency key для batch product events берется из каждого domain event,
как в single-item path:

```text
catalog:<eventType>:<storeId>:product:<productId>:<revision>:<eventId>
```

Raw idempotency key для facet changes:

```text
listing:<reason>:<storeId>:product:<productId>:<operationId>:<refsHash>:<sourceSequence>
```

## Transaction boundaries

Основной вариант:

- workflow делит batch page на write chunks;
- один DB transaction на один chunk;
- внутри chunk payload мержится в `ListingMergedSyncBatchWritePayload`;
- каждый chunk возвращает per-item results.

Более безопасный вариант для больших tenants:

- transaction на 25-50 products;
- workflow агрегирует chunk results;
- failed chunk retry не повторяет уже persisted DBOS step results.

Ошибки делятся по границе merge/write:

- item-level validation/domain errors должны быть пойманы до physical write
  transaction и возвращены как per-item `failed`;
- после начала physical writes любая SQL/infrastructure ошибка откатывает весь
  chunk transaction;
- retry chunk повторяет только failed DBOS write step, уже completed chunks не
  выполняются повторно.

## Failed chunk rescheduling

Если write chunk падает после начала physical writes, workflow не может
безопасно определить, какой item внутри chunk был причиной ошибки: transaction
откатилась целиком. Поэтому batch workflow должен уметь рескедулить failed
chunk меньшими chunks, пока не изолирует проблемный item.

Цель:

- не блокировать весь batch из-за одного проблемного product;
- сохранить atomic write для каждого retry chunk;
- не повторять chunks, которые уже persisted как completed DBOS steps;
- получить per-item `failed` только после того, как ошибка воспроизведена на
  chunk size `1`.

Алгоритм:

```text
initial chunk size: 25-50 products

write chunk failed
  -> if chunk size > 10:
       split failed chunk into chunks of 10 products
       schedule/write each subchunk as separate DBOS step
  -> if chunk size <= 10 and > 1:
       split failed chunk into single-product chunks
       schedule/write each item as separate DBOS step
  -> if chunk size == 1:
       mark item result as failed
       include error code/message in batch result
```

Rescheduled chunks должны сохранять deterministic identity:

```text
batchId + parentChunkId + retryLevel + chunkIndex + productIdsHash
```

Рекомендуемые уровни:

| Level | Chunk size | Назначение |
| --- | ---: | --- |
| `normal` | 25-50 | основной throughput |
| `narrow` | 10 | снизить blast radius failed chunk |
| `single` | 1 | изолировать problematic item |

Правила:

- порядок product ids внутри failed chunk сохраняется;
- split deterministic: одинаковый failed chunk всегда дает одинаковые child
  chunk ids;
- каждый child chunk является отдельным DBOS step, чтобы completed child chunks
  не повторялись при replay;
- child chunks используют тот же write алгоритм: lock item states, stale/noop
  decision, merge payload, physical writes, state upsert;
- если `single` chunk падает инфраструктурной retryable ошибкой, DBOS retry
  применяется по обычной retry policy;
- если `single` chunk стабильно падает non-retryable write/domain ошибкой,
  item получает `failed`, остальные single chunks продолжают выполняться;
- batch result агрегирует results из completed normal/narrow/single chunks.

Важно: single fallback не должен обходить stale/noop/idempotency checks. Даже
после split до одного product writer обязан заново взять item lock и принять
decision относительно актуального `listing_index_item_state`.

## Задачи внедрения

- Добавить `replaceProductMembershipsBatch`.
- Добавить `replaceVariantMembershipsBatch`.
- Добавить helper для чтения current memberships по массиву doc ids.
- Не менять существующий single-item API.
- Добавить `ListingWriteIndexBatchActionScript`.
- Добавить `ListingMergedSyncBatchWritePayload`.
- В batch writer выполнять merge write models в table-wise payload перед
  physical writes.
- Добавить deterministic failed chunk rescheduling:
  - failed normal chunk дробить до chunks по 10 products;
  - failed narrow chunk дробить до single-product chunks;
  - failed single-product chunk возвращать как per-item `failed`;
  - completed child chunks не выполнять повторно на DBOS replay.
- Использовать существующие batch repository методы.
- Сохранить item-level stale/noop/conflict checks.
- Возвращать per-item results.
- Добавить `ListingSyncSellableItemIndexBatchWorkflow`.
- Добавить batch hydration.
- Добавить `ListingResolveFacetSelectionsBatchScript`.
- Добавить batch build/write pipeline.
- Зарегистрировать workflow в listing module.
- Добавить `@BatchEventHandler("productCreated")` для listing.
- Добавить `@BatchEventHandler("productUpdated")` для listing.
- В batch handlers:
  - группировать events по `storeId`;
  - coalesce по `productId`;
  - брать latest event по `eventSequence`;
  - строить batch input;
  - стартовать `listing.syncSellableItemIndexBatch`.
- Обновить catalog producers/import/bulk paths, чтобы они эмитили product events
  через `dispatch.mode = "deferred"` с общим `batchKey`, когда операция batch.
- Для immediate product events оставить текущий single-item handler.
- Изменить `FacetAffectedProductsResyncWorkflow`:
  - не эмитить обязательный event per product;
  - стартовать batch workflow per affected page;
  - хранить счетчики и workflow ids вместо всех event ids.
- Compatibility event оставить опциональным.
- Добавить batch reference sync plan.
- Уменьшить per-product child workflow fan-out.
- Добавить метрики/log fields:

  - `batchId`;
  - `operationId`;
  - `reason`;
  - `productCount`;
  - `variantCount`;
  - `applied/noop/ignoredStale/missing/failed`;
  - `bitmapValueKeysAdded`;
  - `bitmapValueKeysRemoved`;
  - `bitmapDocIdsAdded`;
  - `bitmapDocIdsRemoved`;
  - `durationMs`;
  - `catalogHydrationMs`;
  - `writeMs`.

## Implementation constraints

- Locks для batch items всегда брать в sorted `itemId` order.
- Batch page ограничивать по products и variants; oversized pages писать chunks.
- Batch result не должен хранить полный per-item payload для больших batches.
- Product event batching должен использовать существующий durable events
  transport: deferred `domain_events` + `events.dispatch` batch +
  `@BatchEventHandler`. In-memory debounce не использовать как transport.
- Source sequences от catalog/listing events должны быть сравнимы между собой
  или заменены явной arbitration policy.
- Posting bitmap updates должны использовать batch delta по
  `valueKey -> docIds[]`.
- Item-level validation/domain errors должны возвращаться как per-item
  `failed` result и не отменять successful items.
