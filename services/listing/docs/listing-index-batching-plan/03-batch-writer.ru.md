# Фаза 3. Batch writer и merged write payload

## Цель

Добавить `ListingWriteIndexBatchActionScript`, который пишет несколько products
одним table-wise payload внутри chunk transaction, сохраняя item-level
stale/noop/idempotency checks.

## Scope

В фазу входят:

- `ListingWriteIndexBatchActionScript`;
- `ListingMergedSyncBatchWritePayload`;
- sorted item locks;
- per-item stale/noop/conflict decisions;
- table-wise physical writes;
- stale variant cleanup для applied products;
- projection block refresh по union variant doc ids;
- deterministic failed chunk narrowing.

В фазу не входят:

- catalog hydration;
- batch facet resolution;
- event handlers;
- facet resync routing.

## Input

```ts
type ListingPreparedSyncBatchWriteAction = {
  actions: Array<{
    action: ListingPreparedSyncAction;
    syncWriteModel: ListingSyncWriteModel;
  }>;
};
```

Правила:

- input actions должны быть unique по `itemKey`;
- writer сортирует actions по `itemKey.itemId`;
- writer не доверяет caller-у в вопросах sorted order;
- failed-before-write items не должны попадать в writer input.

## Transaction model

Один chunk = одна DB transaction.

Порядок:

```text
sort actions by itemId
  -> open transaction
  -> lock item states in sorted itemId order
  -> decide applied/noop/ignored_stale/conflict per item
  -> exclude noop/ignored_stale from physical writes
  -> allocate product doc ids for applied products
  -> allocate variant doc ids for applied variants
  -> read existing variants for applied products
  -> build merged payload
  -> write physical tables table-by-table
  -> upsert latest item states for applied items
  -> return per-item results
```

`noop` и `ignored_stale` не должны менять physical index tables.

## Item state locking

Если repository layer сейчас умеет только `lockByItem`, нужно добавить batch
method:

```ts
lockByItems(items: readonly ListingIndexItemKey[]): Promise<Map<string, State>>;
```

Требования:

- caller передает already sorted keys;
- method не меняет порядок lock acquisition;
- query использует deterministic order, чтобы batch/single конкуренция не
  создавала deadlocks;
- missing state возвращается как отсутствие row, а не ошибка.

Если batch lock method откладывается, writer может временно вызвать
`lockByItem` в sorted loop. Это хуже по round trips, но сохраняет correctness.

## Merged payload

`ListingMergedSyncBatchWritePayload` группирует writes по физическим таблицам:

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

  productBitmapMemberships: ProductMembershipBatchInput[];
  variantBitmapMemberships: VariantMembershipBatchInput[];

  staleVariants: Array<{
    variantId: string;
    variantDocId: number;
  }>;

  projectionVariantDocIdsToRefresh: number[];
  stateRows: ListingIndexItemStateRow[];
};
```

Payload является internal structure. Он не меняет public listing contract и не
заменяет item-level idempotency state.

## Physical write order

Writer должен использовать batch repository methods:

1. `productListingIndex.ensureBootstrapRows(rows)`;
2. `productListingIndex.upsertMany(rows)`;
3. `productListingPriceIndex.replaceForProducts(rowsByProductId)`;
4. `productTitleBm25SearchIndex.replaceForProducts(rowsByProductId)`;
5. `listingPostingProductSort.replaceForProducts(rowsByProductDocId)`;
6. `listingPostingBitmap.replaceProductMembershipsBatch(rows)`;
7. `variantListingIndex.upsertMany(rows)`;
8. `variantListingPriceIndex.replaceForVariants(rowsByVariantId)`;
9. `listingPostingVariantPrice.replaceForVariants(rowsByVariantDocId)`;
10. `listingPostingBitmap.replaceVariantMembershipsBatch(rows)`;
11. delete stale variant dependencies;
12. `variantListingIndex.deleteByVariantIds(staleVariantIds)`;
13. `listingPostingVariantProjectionBlock.refreshBlocksForVariantDocIds(ids)`;
14. upsert latest item states for applied items.

Если какой-то batch repository method отсутствует, сначала добавить его или
оставить временный local loop только для этой таблицы с явным TODO. Для bitmap
loop недопустим, потому что это ключевая оптимизация.

## Stale variants

Для applied products:

```text
staleVariants = existing variants by productId - variants from new snapshot
```

Правила:

- stale variants считаются только для applied items;
- noop/ignored stale products не участвуют в stale cleanup;
- projection refresh получает union current variant doc ids и stale variant doc ids;
- variant_product bitmap memberships stale variants должны быть удалены через
  existing delete dependency flow.

## Failed chunk narrowing

Если chunk transaction падает после начала physical writes, transaction
откатывается целиком. Writer/workflow не знает, какой item вызвал ошибку.

Алгоритм:

```text
normal chunk failed
  -> split to narrow chunks of 10 products
narrow chunk failed
  -> split to single-product chunks
single-product chunk failed
  -> return per-item failed
```

Требования:

- split deterministic;
- child chunk id включает `batchId + parentChunkId + level + index + productIdsHash`;
- child chunk заново выполняет item lock и stale/noop decision;
- completed DBOS steps не выполняются повторно на replay;
- retryable infrastructure errors остаются retryable;
- non-retryable single-item write/domain errors превращаются в per-item
  `failed`.

## Acceptance criteria

- Batch writer принимает prepared actions и write models.
- Writer не применяет writes sequentially as `for product -> all tables`.
- Writer делает table-wise merged writes.
- Item locks берутся в sorted order.
- `noop` и `ignored_stale` не меняют physical tables.
- Batch bitmap API используется для product и variant memberships.
- Chunk failure может быть сузжен до per-item failure.
- Single-item writer остается совместимым.
