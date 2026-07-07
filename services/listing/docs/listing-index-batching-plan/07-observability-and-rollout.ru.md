# Фаза 7. Observability, rollout и финальная стабилизация

## Цель

Сделать batch path наблюдаемым, управляемым и безопасным для постепенного
включения. Фаза завершает внедрение после writer/workflow/routing изменений.

## Scope

В фазу входят:

- structured logs;
- metrics/counters;
- rollout flags или conservative enablement;
- degraded fallback logs;
- финальная cleanup-документация;
- build verification, когда нужна новая версия кода.

В фазу не входят:

- новые функциональные изменения writer-а;
- расширение storefront query model;
- batching delete path.

## Logs

Batch workflow и batch writer должны логировать:

- `batchId`;
- `operationId`;
- `reason`;
- `storeId`;
- `productCount`;
- `variantCount`;
- `chunkId`;
- `chunkLevel`;
- `applied`;
- `noop`;
- `ignoredStale`;
- `missing`;
- `failed`;
- `durationMs`;
- `catalogHydrationMs`;
- `facetResolutionMs`;
- `writeMs`.

Для failed chunks:

- original chunk id;
- child chunk ids;
- retry/narrowing level;
- error code;
- whether error is retryable.

## Bitmap metrics

Batch bitmap API должен отдавать счетчики:

- `bitmapValueKeysAdded`;
- `bitmapValueKeysRemoved`;
- `bitmapDocIdsAdded`;
- `bitmapDocIdsRemoved`;
- `bitmapTouchedDocIds`;
- `bitmapTouchedRows`;
- `bitmapDeletedEmptyRows`, если repository это возвращает.

Эти counters агрегируются на writer chunk и batch workflow level.

## Rollout controls

Минимальный набор flags:

```ts
{
  facetResyncBatchEnabled: boolean;
  productEventBatchEnabled: boolean;
  batchReferenceSyncEnabled: boolean;
}
```

Если централизованный config для listing service пока не готов, допустим
поэтапный rollout через explicit caller changes:

- сначала все callers продолжают использовать старый path;
- новый workflow доступен только manual/internal invocation;
- затем включается facet resync path;
- затем включаются выбранные product event producers.

## Rollout order

1. Deploy batch bitmap API и batch writer без producer routing changes.
2. Deploy batch workflow без real traffic.
3. Включить batch path для одного controlled facet scenario.
4. Проверить counters: `applied/noop/ignoredStale/missing/failed`.
5. Включить batch path для остальных facet changes.
6. Включить product event batching для одного bulk/import path.
7. Расширить producer coverage.
8. После стабилизации уменьшить legacy per-product fan-out usage.

## Degraded modes

Допустимые fallback-и:

- immediate product event остается single-item;
- legacy `listingFacetMembershipChanged` handler остается single-item;
- batch reference sync может временно fallback-нуться на per-product sync;
- failed chunk может сузиться до single-product chunks.

Каждый fallback должен логироваться как degraded mode, чтобы было видно, где
batch path не сработал.

## Cleanup

После стабилизации:

- удалить временные TODO around local loops, если они остались;
- обновить основной `listing-index-batching-plan.ru.md` статусом реализации;
- добавить ссылки на фазовые документы;
- не редактировать changeset вручную;
- если нужен changeset, запускать только проектную генерацию changeset через
  npm, по правилам проекта.

## Verification

По проектному правилу:

- не запускать `test`;
- не запускать `tsc`;
- запускать `build`, когда нужна новая версия кода.

Для runtime implementation phases build должен идти через проектный
development tooling. Документационные изменения build не требуют.

## Acceptance criteria

- Batch path имеет structured logs.
- Writer и bitmap API возвращают полезные counters.
- Есть clear rollout/fallback policy.
- Legacy path остается доступен до завершения rollout.
- Нельзя получить silent fallback без log.
- Финальная проверка соответствует проектным правилам.
