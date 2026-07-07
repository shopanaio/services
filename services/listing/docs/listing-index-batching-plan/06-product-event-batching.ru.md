# Фаза 6. Batch product event handlers

## Цель

Снизить количество listing workflows при burst `productCreated` и
`productUpdated` событий, используя существующий durable deferred event
transport.

## Preconditions

Перед началом фазы должны быть завершены:

- Фаза 1: batch contracts и source sequence rules;
- Фаза 4: `listing.syncSellableItemIndexBatch`;
- Фаза 7 minimum logging для batch workflow, если включение идет на реальных
  producer paths.

Фаза не должна менять `productDeleted`: delete остается single-item.

## Current flow

Immediate events:

```text
events.emit(productUpdated)
  -> EventDispatchWorkflow
  -> ListingProductEventHandlers.handleProductUpdated
  -> listing.syncSellableItemIndex per product
```

Этот flow остается совместимым fallback.

## Target flow

Deferred batch events:

```text
catalog bulk/import/admin operation
  -> events.emit(productUpdated, dispatch.mode = deferred, batchKey)
  -> events.dispatch(kind = batch, eventType = productUpdated, batchKey)
  -> productUpdated:batch
  -> listing.syncSellableItemIndexBatch
```

## Listing handlers

Добавить batch handlers:

```ts
@BatchEventHandler("productCreated", { retry: { maxAttempts: 5 } })
@BatchEventHandler("productUpdated", { retry: { maxAttempts: 5 } })
```

Можно реализовать отдельный class:

```ts
ListingProductBatchEventHandlers
```

или добавить методы в `ListingProductEventHandlers`, если это не ухудшает
читаемость.

## Handler algorithm

Для `params.events`:

1. Validate event shape.
2. Разделить events по `storeId`.
3. Сгруппировать по `productId`.
4. В каждой группе оставить event с максимальным `eventSequence`.
5. Older events считать coalesced.
6. Построить `sourceSequenceByProductId` из latest events.
7. Построить `expectedRevisionByProductId`, если revision есть.
8. Построить batch input.
9. Стартовать `listing.syncSellableItemIndexBatch`.
10. Вернуть `failedEventIds` только для events, по которым batch input не был
    построен или workflow не был стартован.

Coalescing является ответственностью listing handler-а, не events service.

## Batch id

Для event batch:

```text
product-event:<eventType>:<storeId>:<batchKeyHash>:<claimedWindowHash>
```

`claimedWindowHash` нужен, если один `batchKey` dispatch-ится несколькими
страницами `limit`.

Если events service already exposes dispatch id или claim id, предпочтительно
использовать его вместо собственного hash.

## Producer requirements

Batch появится только для producers, которые эмитят deferred events:

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

Bulk/import/admin paths должны использовать stable batch key:

```text
catalog:product-index:<storeId>:<operationId>
```

Если upstream operation id нет, допустим time bucket key:

```text
catalog:product-index:<storeId>:<floor(timestamp / 2s)>
```

После записи deferred events producer или orchestrator должен вызвать:

```ts
await broker.call("events.dispatch", {
  kind: "batch",
  organizationId,
  eventType: "productUpdated",
  batchKey,
  limit: 100,
});
```

## Producer discovery

Перед изменением producers нужно найти все paths, которые создают или
обновляют products и variants:

- product create/update mutation workflows;
- bulk editor workflows;
- import workflows;
- variant update paths;
- price update paths, если они эмитят `productUpdated`;
- option/feature/tag changes, если они приводят к product event.

Для low-traffic paths можно оставить immediate dispatch.

## Fallback

Если event был immediate, он обрабатывается текущим single-item handler.

Если batch handler не смог построить input для части events:

- вернуть `success: false`;
- заполнить `failedEventIds` только проблемными events;
- events service повторит failed subset по retry policy.

Если batch workflow start вернул duplicate workflow id, handler считает это
success для соответствующих events.

## Product deleted

`productDeleted` не батчится в этой фазе.

Причины:

- delete path имеет отдельный physical cleanup;
- stale/order conflicts сложнее;
- ошибочный delete batch имеет больший blast radius.

## Acceptance criteria

- Добавлены `productCreated:batch` и `productUpdated:batch` handlers.
- Handler coalesce-ит events по productId.
- Latest event выбирается по `eventSequence`.
- Batch input содержит per-product source sequence и expected revision.
- Immediate product events продолжают работать через single-item path.
- Product deleted path не изменен.
- Изменены только выбранные bulk/import/admin producers.
