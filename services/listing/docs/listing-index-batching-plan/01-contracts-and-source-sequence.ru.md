# Фаза 1. Contracts, idempotency и source sequence

## Цель

Зафиксировать безопасный контракт batch workflow до реализации writer-а и
routing-а. Главный результат фазы - доказуемо сравнимый `sourceSequence` для
каждого `storeId + entityType + itemId`.

Без этой фазы direct batch path может некорректно конкурировать с текущими
single-item `productUpdated` workflows.

## Scope

В фазу входят:

- финальный тип `ListingSyncSellableItemIndexBatchInput`;
- финальный тип `ListingSyncSellableItemIndexBatchResult`;
- правила normalization для `productIds`;
- правила `batchId`, `operationId`, `productIdsHash`;
- item-level `effectiveIdempotencyKey`;
- стратегия `sourceSequenceByProductId`;
- лимиты batch page/chunk;
- поведение для `missing`, `noop`, `ignored_stale`, `failed`.

В фазу не входят:

- physical writes;
- изменение `FacetAffectedProductsResyncWorkflow`;
- изменение product event producers;
- batch bitmap SQL.

## Batch input

Контракт должен оставаться близким к исходному плану:

```ts
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

- `productIds` нормализуются до unique sorted массива до старта workflow;
- `sourceSequenceByProductId` обязателен для каждого product;
- workflow должен отклонять input, если есть product без sequence;
- batch-level stale decision запрещен;
- stale/noop/conflict decision всегда принимается отдельно для item.

## Batch result

Результат должен возвращать счетчики и ограниченный список item results:

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

Для больших batches полный `results` массив не обязателен. Достаточно хранить:

- `failed`;
- `missing`;
- `noop`, если нужен audit;
- `ignored_stale`, если нужен debug stale arbitration.

`applied` можно агрегировать счетчиком, чтобы не раздувать DBOS history.

## Source sequence problem

Текущий single-item path использует `events.domain_events.event_sequence`.
Последовательность монотонна в рамках subject:

```text
organizationId + subject.type + subject.id
```

Сейчас `listingFacetMembershipChanged` эмитится с product subject:

```ts
subject: { type: "product", id: productId }
```

Поэтому `productUpdated` и `listingFacetMembershipChanged` сравнимы для одного
product. Direct batch path не должен терять это свойство.

## Обязательное решение до следующих фаз

Нужно выбрать один из вариантов и зафиксировать его в реализации.

### Вариант A. Batch sequence allocation через events service

Добавить durable API в events service, который выделяет sequence для набора
product subjects в той же subject sequence stream, что и `events.emit`.

Требования:

- sequence выделяется для каждого product отдельно;
- sequence сравним с `productCreated`/`productUpdated`;
- allocation idempotent по `operationId + productId + reason + refsHash`;
- allocation не запускает per-product listing sync workflow;
- audit event допустим, но dispatch этого event не должен быть обязательным
  транспортом переиндексации.

Это наиболее чистый вариант, если events service готов поддержать такой API.

### Вариант B. Compatibility event как sequence source

Оставить emission `listingFacetMembershipChanged` per product, но не
использовать его как per-product workflow fan-out.

Требования:

- event все еще создается с `subject: product`;
- batch input берет `eventSequence` из созданных events;
- dispatch не должен повторно запускать single-item sync для тех же events;
- старый `@EventHandler("listingFacetMembershipChanged")` остается fallback
  только для legacy/immediate path.

Этот вариант проще концептуально, но требует аккуратной защиты от двойной
переиндексации.

### Вариант C. Listing-local sequence allocator

Ввести собственный allocator для listing index item state и перевести на него
все sync paths, включая product events.

Требования:

- single-item product events больше не сравниваются raw `eventSequence`;
- allocator должен сохранять порядок product events относительно facet changes;
- older product event не должен получать более свежий listing sequence только
  из-за поздней доставки;
- нужна явная arbitration policy по revision/event timestamp/eventSequence.

Этот вариант самый рискованный и должен использоваться только если невозможно
расширить events service.

## Рекомендуемое решение

Предпочтительный порядок выбора:

1. Вариант A, если можно добавить batch allocation в events service.
2. Вариант B, если нужно минимизировать изменение events service.
3. Вариант C только как отдельный архитектурный change.

Фазы 3-6 должны считать `sourceSequenceByProductId` уже готовым входом и не
изобретать локальную замену внутри writer-а.

## Idempotency

Batch workflow id:

```text
workflowName + storeId + batchId + operationId + reason + productIdsHash
```

`productIdsHash` обязателен, чтобы случайное повторное использование `batchId`
с другим составом products не склеило разные workflows.

Item effective idempotency:

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

Правила conflict:

- если `sourceSequence < current.sourceSequence`, item получает
  `ignored_stale`;
- если `sourceSequence === current.sourceSequence` и
  `effectiveIdempotencyKey` отличается, это `REVISION_CONFLICT`;
- если sequence и idempotency совпали, но payload hash совпал, это `noop`;
- если sequence и idempotency совпали, но payload hash отличается, поведение
  должно повторять single-item writer contract.

## Batch limits

Рекомендуемые лимиты:

| Источник | Default | Hard cap |
| --- | ---: | ---: |
| facet changes | 100 products | 250 products |
| product event batch | 50 products | 100 products |
| manual reindex | 100 products | 250 products |

Ограничение по variants применяется после hydration, потому что до catalog
query количество variants неизвестно.

## Acceptance criteria

- Описан и выбран механизм получения comparable `sourceSequenceByProductId`.
- Batch input валидирует sorted unique `productIds`.
- Batch input валидирует наличие positive integer sequence для каждого product.
- Определен workflow id и item idempotency key.
- Определены лимиты page/chunk.
- Фазы writer/workflow/facet/product events могут ссылаться на этот контракт
  без дополнительных предположений.
