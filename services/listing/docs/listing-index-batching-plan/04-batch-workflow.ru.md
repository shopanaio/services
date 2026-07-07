# Фаза 4. Batch workflow pipeline

## Цель

Добавить `listing.syncSellableItemIndexBatch`, который обрабатывает page of
products через batch hydration, batch facet resolution, prepare/build и batch
writer chunks.

Workflow пока можно не подключать к real producers. Он должен быть готов как
новый internal capability.

## Scope

В фазу входят:

- `ListingSyncSellableItemIndexBatchWorkflow`;
- batch catalog hydration;
- batch facet resolution script;
- prepare/build orchestration;
- post-hydration chunk planning по products и variants;
- вызов batch writer;
- aggregation result;
- registration в listing module.

В фазу не входят:

- изменение facet mutation routing;
- product event batch handlers;
- producer changes в catalog.

## Workflow input validation

Перед первым external call workflow должен проверить:

- `organizationId` задан;
- `storeId` задан;
- `productIds` unique sorted;
- `sourceSequenceByProductId` содержит positive integer для каждого product;
- `batchId` и `operationId` заданы;
- `reason` входит в allowed enum.

Если caller передал unsorted/duplicate ids, предпочтительно fail fast. Это
делает idempotency и chunk ids предсказуемыми.

## Hydration step

Workflow должен один раз получить store context:

```ts
project.getStoreById({ id: storeId })
```

И одним catalog query получить products:

```ts
where: {
  id: { _in: productIds }
}
```

Правила:

- отсутствующие products получают `missing` или `noop` result;
- product с другим `storeId` считается item-level failure;
- результат catalog query мапится в `Listing.SyncSellableItemParams`;
- order hydrated actions должен соответствовать sorted `productIds`;
- hydrate step возвращает также `variantCountByProductId`.

## Chunk planning

Chunking по products можно делать до hydration только по hard cap products.
Chunking по variants делается после hydration.

Правила:

- product не делится между chunks;
- chunk сохраняет sorted product order;
- лимиты:
  - `maxProductsPerChunk`;
  - `maxVariantsPerChunk`;
- если один product превышает `maxVariantsPerChunk`, он идет отдельным chunk;
- missing/failed-before-write items не входят в write chunks, но входят в общий
  batch result.

## Batch facet resolution

Добавить:

```ts
ListingResolveFacetSelectionsBatchScript
```

Он должен делать то же, что single-item `ListingResolveFacetSelectionsScript`,
но для массива hydrated sync actions:

1. Собрать source refs со всех product и variant facets.
2. Одним repository/service call получить valid source values.
3. Одним repository/service call получить display parents.
4. Построить shared resolved map.
5. Применить map к каждому item snapshot.
6. Вернуть warnings per item.

Ошибки одного item не должны ломать весь batch, если они являются domain
validation errors. Infrastructure errors остаются retryable для step.

## Prepare/build orchestration

Prepare можно оставить item-level pure operation:

```ts
for (const action of resolvedActions) {
  prepare(action);
}
```

Но это должно происходить внутри одного workflow step или внутри
детерминированной последовательности steps с предсказуемым result.

Build write model также может остаться item-level pure operation, пока batch
writer получает уже готовые write models.

Правила:

- item-level validation errors превращаются в `failed`;
- successful prepared actions идут дальше;
- failed items не передаются в writer;
- warnings агрегируются в batch result.

## Write steps

Для каждого chunk workflow вызывает batch writer.

Требования к DBOS compatibility:

- chunk descriptors строятся deterministic;
- каждый write step получает stable `chunkId`;
- replay не должен повторять completed chunk writes;
- failed chunk narrowing использует deterministic child chunk descriptors.

Если текущий DBOS wrapper не позволяет надежно именовать dynamic child steps,
нужно вынести chunk write в child workflow с deterministic workflow id.

## Result aggregation

Workflow агрегирует:

- hydration missing results;
- prepare/build failed results;
- writer chunk results;
- warnings from facet resolution;
- bitmap counters from writer, если они доступны.

Для больших batches не хранить полный список `applied` results в DBOS output.

## Registration

Workflow должен быть зарегистрирован так, чтобы broker action name был:

```text
listing.syncSellableItemIndexBatch
```

Single-item workflows остаются:

- `listing.syncSellableItemIndex`;
- `listing.deleteSellableItemIndex`.

## Acceptance criteria

- Новый workflow доступен через broker.
- Workflow не меняет existing single-item behavior.
- Hydration делает один store call и один catalog query на page/chunk.
- Batch facet resolution убирает repeated lookups.
- Chunking по variants выполняется после hydration.
- Writer вызывается chunk-by-chunk.
- Batch result содержит корректные counters.
