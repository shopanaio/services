# Фаза 5. Batch path для facet changes

## Цель

Изменить `FacetAffectedProductsResyncWorkflow`, чтобы массовые facet changes
запускали `listing.syncSellableItemIndexBatch` по страницам affected products,
а не создавали per-product sync workflow fan-out.

## Preconditions

Перед началом фазы должны быть завершены:

- Фаза 1: выбран comparable per-product `sourceSequence`;
- Фаза 3: batch writer;
- Фаза 4: batch workflow.

Если source sequence strategy не завершена, эту фазу начинать нельзя.

## Current flow

```text
Facet mutation workflow
  -> FacetAffectedProductsResyncWorkflow
  -> find affected products page
  -> emit listingFacetMembershipChanged per product
  -> event handler per product
  -> listing.syncSellableItemIndex per product
```

Проблемы:

- один DBOS workflow на product;
- `emittedEventIds` растет пропорционально affected products;
- facet reference state sync создает вторую волну per-product workflows.

## Target flow

```text
Facet mutation workflow
  -> FacetAffectedProductsResyncWorkflow
  -> find affected products page
  -> allocate/resolve sourceSequenceByProductId
  -> listing.syncSellableItemIndexBatch(page)
```

`listingFacetMembershipChanged` может остаться audit/compatibility event, но не
должен быть обязательным транспортом для массового reindex.

## Workflow output

Заменить large output:

```ts
{
  refsHash,
  affectedProductCount,
  emittedEventIds
}
```

на compact output:

```ts
{
  refsHash,
  affectedProductCount,
  batchWorkflowIds,
  startedBatchCount
}
```

Если audit events остаются, их ids не нужно хранить полностью в durable output
для больших операций. Достаточно счетчиков.

## Batch input construction

Для каждой affected page:

1. Нормализовать product ids до sorted unique.
2. Получить `sourceSequenceByProductId` выбранным в фазе 1 способом.
3. Построить stable `batchId`:

```text
facet-resync:<storeId>:<operationId>:<pageNo>:<refsHash>
```

4. Построить `operationId` из input facet workflow.
5. Установить `reason` из facet mutation reason.
6. Передать `source.service = "listing"`.

## Queue partition

Для facet page batch:

```text
storeId:facet-resync:operationId:pageNo
```

Partition не должен быть item-scoped. Correctness для item обеспечивают
`listing_index_item_state` locks в writer-е.

## Source sequence rules

Для direct facet batch запрещено использовать sequence исходного facet/facetValue
event, если этот sequence относится к subject facet/facetValue/operation.

Нужен sequence именно для каждого product subject или эквивалентная
арбитражная модель, заранее выбранная в фазе 1.

Критический сценарий:

```text
T1: facet_value_merged affects product A
T2: productUpdated for product A is emitted after merge
T3: productUpdated sync writes first
T4: delayed facet batch reaches product A
```

На T4 facet batch должен получить `ignored_stale`, если product update был
более свежим по comparable source sequence.

## Aggregated facet reference sync

После batch write нужно убрать вторую волну per-product sync там, где это
практично.

Target:

```text
batch writer result
  -> ListingBuildFacetReferenceSyncBatchPlanScript
  -> listing.syncFacetReferenceStateBatch
```

MVP fallback:

- оставить per-product `syncFacetReferenceState`, но явно отметить это как
  temporary degradation;
- не считать фазу performance-complete, пока per-product reference sync fan-out
  остается основным путем для больших facet changes.

## Compatibility behavior

Legacy/immediate `listingFacetMembershipChanged` handler остается для callers,
которые еще не используют direct batch path.

Нельзя допустить double indexing:

- если facet resync workflow сам стартует batch workflow, те же audit events не
  должны потом запускать single-item workflows;
- если event-based fallback используется, direct batch workflow для той же
  page не должен стартовать параллельно.

## Acceptance criteria

- `FacetAffectedProductsResyncWorkflow` стартует batch workflow per page.
- Durable output хранит counters и workflow ids, а не все event ids.
- Source sequence для каждого product сравним с product events.
- Legacy event path сохранен как fallback.
- Double indexing для одного facet page исключен.
- Batch reference sync strategy выбрана: target или explicit MVP fallback.
