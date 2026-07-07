# Оркестрация внедрения batching для listing index

Исходный документ: `../listing-index-batching-plan.ru.md`.

Этот документ задает короткий порядок выполнения работ. Детали каждой фазы
вынесены в отдельные документы рядом с ним.

## Цель оркестрации

Внедрить batch path для переиндексации listing index без поломки текущего
single-item path:

- сохранить item-level stale/idempotency guarantees;
- уменьшить количество DBOS workflows при facet changes и bulk product updates;
- заменить мелкие bitmap membership writes на batch delta;
- оставить `productDeleted` item-level;
- не менять публичную storefront query модель.

## Фазы

| Фаза | Документ | Результат |
| --- | --- | --- |
| 1 | `01-contracts-and-source-sequence.ru.md` | Зафиксированы batch contracts, idempotency и сравнимый per-product `sourceSequence`. |
| 2 | `02-bitmap-batch-api.ru.md` | Добавлен batch API для posting bitmap memberships. |
| 3 | `03-batch-writer.ru.md` | Добавлен batch writer с merged table-wise payload и chunk transactions. |
| 4 | `04-batch-workflow.ru.md` | Добавлен `listing.syncSellableItemIndexBatch` workflow: hydration, resolution, prepare/build/write. |
| 5 | `05-facet-resync-path.ru.md` | `FacetAffectedProductsResyncWorkflow` запускает batch workflows вместо per-product sync fan-out. |
| 6 | `06-product-event-batching.ru.md` | Product create/update events используют durable deferred batch transport. |
| 7 | `07-observability-and-rollout.ru.md` | Добавлены метрики, logs, rollout controls и финальная проверка сборкой. |

## Gate-условия

Фаза 1 является обязательным gate для всех фаз, которые запускают batch writes.
Нельзя внедрять direct facet batch path, пока не выбран и не описан механизм
сравнимого `sourceSequence` для каждого product.

Фазы 2 и 3 можно делать до изменения event/workflow routing. Это снижает риск:
сначала появляется batch-capable storage layer, затем новый workflow, и только
после этого меняются источники нагрузки.

Фазы 5 и 6 не должны включаться одновременно. Сначала нужно включить один
источник batch traffic, проверить поведение writer-а и только потом подключать
второй источник.

## Рекомендуемый порядок

1. Зафиксировать контракты и арбитраж `sourceSequence`.
2. Реализовать batch bitmap API и сохранить совместимость single-item методов.
3. Реализовать batch writer и проверить, что single-item writer не изменился.
4. Реализовать batch workflow, но пока не подключать его к producers.
5. Подключить facet resync batch path.
6. Подключить product event batching для bulk/import/admin операций.
7. Добавить observability, cleanup старого fan-out и финальную сборку.

## Rollout policy

На время внедрения batch path должен быть выключаемым на уровне listing service
configuration или conservative runtime flag:

- `facetResyncBatchEnabled`;
- `productEventBatchEnabled`;
- `batchReferenceSyncEnabled`.

Если flag отсутствует в текущей configuration-модели, сначала допустимо
использовать кодовый fallback: оставить старый single-item path как default,
а новый path включать только из явно измененных callers.

## Проверка

По проектному правилу не запускать `test` и `tsc` для проверки. Когда нужна
новая версия кода после реализации фаз, запускать `build` через проектный
инструмент разработки.

Для документационной фазы build не требуется.
