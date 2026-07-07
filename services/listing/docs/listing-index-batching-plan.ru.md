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
2. batch product event handler: `productCreated`/`productUpdated` складываются
   в short debounce/outbox buffer и обрабатываются группами.

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
| product create/update event handler | 50 products | 100 products | debounce 500-2000 ms |
| manual reindex | 100 products | 250 products | shard/page based |

Если страница products превышает `maxVariantsPerBatch`, workflow должен
разделить ее на меньшие chunks перед hydration/write.

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

Порядок внутри script:

1. Отсортировать actions по `itemKey.itemId`.
2. В transaction взять locks `listingIndexItemState.lockByItem(...)`.
3. Для каждого item принять stale/noop/conflict decision.
4. Исключить `ignored_stale` и `noop` из physical writes.
5. Одним вызовом выделить product doc ids.
6. Одним вызовом выделить variant doc ids.
7. Batch upsert обычных таблиц.
8. Batch replace posting memberships.
9. Удалить stale variants по всем products.
10. Refresh projection blocks по union измененных variant doc ids.
11. Upsert latest item state для applied items.
12. Вернуть per-item results.

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

Рекомендуемый вариант:

- использовать `eventSequence` события `listingFacetMembershipChanged`, если
  compatibility event остается;
- для direct batch path использовать sequence из исходного facet mutation
  workflow/event;
- одинаковый sequence ожидаем для affected products одного facet event;
- одинаковый sequence разрешен для разных products, потому что stale/noop
  decision принимается отдельно по каждому product.

Важно: если после facet batch приходит более свежий `productUpdated` с большим
sourceSequence, facet batch должен стать `ignored_stale` для этого product.

Если единая event sequence между catalog product events и listing facet events
не гарантирована, нужно добавить отдельный monotonic sequence allocator для
listing index item state или перейти на source timestamp/revision arbitration.
Без этого batch facet changes могут конкурировать с product updates.

## Batch event handler для product create/update

### Цель

Снизить количество workflows при burst updates:

- product import;
- bulk editor;
- массовое создание variants/options/prices;
- sequential product updates в рамках одного admin operation.

### Новый компонент

Добавить handler/buffer:

```ts
ListingProductBatchEventHandler
```

Он подписывается на:

- `productCreated`;
- `productUpdated`.

`productDeleted` остается в `ListingProductEventHandlers` и запускает
single-item delete workflow.

### Буферизация

Буферизация должна использовать durable outbox table, а не in-memory debounce,
чтобы не терять events при restart.

Новая таблица:

```sql
listing.listing_index_event_buffer
```

Поля:

```text
store_id uuid not null
organization_id uuid not null
event_id text not null
event_type text not null
product_id uuid not null
source_sequence bigint not null
expected_revision bigint null
occurred_at timestamptz not null
payload_hash text not null
status text not null -- pending, claimed, processed, failed
claim_id text null
claimed_at timestamptz null
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

Indexes:

```text
unique(event_id)
index(store_id, status, created_at)
index(store_id, product_id, source_sequence)
```

### Coalescing rules

При flush batch:

1. выбрать pending rows по `storeId`, oldest first;
2. сгруппировать по `productId`;
3. оставить только row с максимальным `sourceSequence` для каждого product;
4. older rows того же product пометить `processed/coalesced`;
5. создать batch workflow для latest rows.

Это важно: если один product обновился 10 раз за короткое окно, listing должен
переиндексировать только последнее состояние.

### Flush workflow

Добавить workflow:

```ts
listing.flushProductIndexEventBatch
```

Input:

```ts
type ListingFlushProductIndexEventBatchInput = {
  storeId: string;
  organizationId: string;
  maxEvents: number;
  maxProducts: number;
  debounceMs: number;
};
```

Pipeline:

```text
claim pending events
  -> coalesce by productId
  -> start listing.syncSellableItemIndexBatch
  -> mark claimed events processed after batch accepted
```

Claim должен использовать `FOR UPDATE SKIP LOCKED` или эквивалент Drizzle raw
SQL, чтобы несколько workers не забрали одни и те же events.

### Trigger flush

Handler `productCreated/productUpdated` после записи event buffer может:

- стартовать `listing.flushProductIndexEventBatch` с deterministic id по
  `storeId + time bucket`;
- или полагаться на periodic scheduler.

Рекомендуемый вариант:

```text
timeBucket = floor(event.createdAt / 2 seconds)
workflowId = hash(storeId, "product-index-batch", timeBucket)
```

Так несколько events в одном коротком окне стартуют один flush workflow.

### Fallback

Если запись в buffer или старт flush workflow падает, handler может fallback-ом
запустить текущий `enqueueListingSyncItemIndexWorkflow` для одного product.

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
| product event flush | `storeId:product-event-batch:timeBucket` |
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

Raw idempotency key для batch product events:

```text
catalog:<eventType>:<storeId>:product:<productId>:<revision>:<eventId>
```

Raw idempotency key для facet changes:

```text
listing:<reason>:<storeId>:product:<productId>:<operationId>:<refsHash>:<sourceSequence>
```

## Transaction boundaries

Основной вариант:

- один DB transaction на batch page до 100 products;
- если batch page слишком большой, workflow делит его на write chunks;
- каждый chunk возвращает per-item results.

Более безопасный вариант для больших tenants:

- transaction на 25-50 products;
- workflow агрегирует chunk results;
- failed chunk retry не повторяет уже persisted DBOS step results.

## Задачи внедрения

- Добавить `replaceProductMembershipsBatch`.
- Добавить `replaceVariantMembershipsBatch`.
- Добавить helper для чтения current memberships по массиву doc ids.
- Не менять существующий single-item API.
- Добавить `ListingWriteIndexBatchActionScript`.
- Использовать существующие batch repository методы.
- Сохранить item-level stale/noop/conflict checks.
- Возвращать per-item results.
- Добавить `ListingSyncSellableItemIndexBatchWorkflow`.
- Добавить batch hydration.
- Добавить `ListingResolveFacetSelectionsBatchScript`.
- Добавить batch build/write pipeline.
- Зарегистрировать workflow в listing module.
- Изменить `FacetAffectedProductsResyncWorkflow`:
  - не эмитить обязательный event per product;
  - стартовать batch workflow per affected page;
  - хранить счетчики и workflow ids вместо всех event ids.
- Compatibility event оставить опциональным.
- Добавить `listing_index_event_buffer`.
- Добавить repository для claim/coalesce/mark processed.
- Добавить `ListingProductBatchEventHandler`.
- Добавить `listing.flushProductIndexEventBatch`.
- Перевести `productCreated/productUpdated` на buffer + flush.
- Оставить single-item fallback.
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
- Product event buffering должен быть durable; in-memory debounce не использовать
  как единственный transport.
- Source sequences от catalog/listing events должны быть сравнимы между собой
  или заменены явной arbitration policy.
- Posting bitmap updates должны использовать batch delta по
  `valueKey -> docIds[]`.
- Item-level validation/domain errors должны возвращаться как per-item
  `failed` result и не отменять successful items.
