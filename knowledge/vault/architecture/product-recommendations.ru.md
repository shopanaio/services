---
tags: [architecture, listing, recommendations, related-products, frequently-bought-together, ranking]
related: [architecture/overview, architecture/multi-tenancy, patterns/federation, listing/facets-architecture]
---

# Архитектура Product Recommendations

## Статус и назначение

Документ фиксирует canonical product architecture для `Related Products` и
`Frequently Bought Together` (FBT). Обе возможности принадлежат Listing и
используют общий recommendation/ranking pipeline, но имеют разные источники и
разные жизненные циклы данных:

- `Related Products` — curated merchandising signal, который создаёт merchant;
- `Frequently Bought Together` — behavioral signal, рассчитанный из
  подтверждённых продаж;
- ranking snapshot — опубликованный результат объединения сигналов для одного
  storefront placement.

Проект работает с clean database. Legacy relation tables, backfill, dual-read и
dual-write не поддерживаются.

## Продуктовые цели

Система должна:

- позволять merchant явно закреплять, усиливать и исключать товары;
- находить статистически значимые совместные покупки без online-агрегации
  заказов;
- объединять curated и behavioral signals по прозрачной policy;
- возвращать storefront готовый детерминированный список Product references;
- обеспечивать cold-start fallback для новых товаров и магазинов;
- сохранять provenance результата: policy version, model version, monotonic
  ingestion watermark и использованные features;
- публиковать новый ranking атомарно, не показывая частично рассчитанный набор;
- в дальнейшем использовать те же pair/context features для cart cross-sell,
  checkout upsell и search rerank.

## Не входит в домен

Recommendation domain не владеет:

- product title, category, tag, feature, publication или inventory state;
- физической совместимостью товаров;
- ценой, скидкой или promotion eligibility;
- cart mutation и добавлением нескольких lines;
- заказом и его финансовым состоянием;
- доставкой domain events.

Объективная совместимость, например «фильтр подходит к этой кофемашине», должна
быть отдельным canonical Catalog fact. Merchant recommendation означает
редакционное намерение показать товар, а не доказательство совместимости.

## Владение сервисов

| Сервис | Ответственность |
| --- | --- |
| `listing` | Policies, manual recommendations, order facts projection, FBT calculations, ranking snapshots, storefront recommendation fields |
| `catalog` | Canonical Product identity и product lifecycle events |
| `orders` | Источник факта подтверждённой продажи, коррекции и reversal |
| `events` | Надёжное сохранение и доставка событий, но не recommendation logic |
| `pricing` | Цена и скидки для уже выбранных товаров |
| `checkout` | Batch add/remove lines и пересчёт checkout |

Listing не читает таблицы Catalog или Orders и не выполняет runtime fan-out в
Orders на product page. Межсервисные данные поступают через самодостаточные
events или broker contracts.

## Термины

| Термин | Значение |
| --- | --- |
| `anchor` | Товар, контекст которого породил recommendation request |
| `target` | Товар-кандидат для показа рядом с anchor |
| `placement` | Продуктовый контекст и отдельная ranking policy |
| `source` | Происхождение сигнала: manual, FBT, similarity, popularity или fallback |
| `policy` | Merchant/system configuration объединения источников |
| `calculation run` | Версионированный воспроизводимый расчёт behavioral statistics |
| `snapshot` | Неизменяемый опубликованный ranked list для anchor + placement |
| `ingestion watermark` | Монотонная позиция append-only projection log, до которой включительно прочитаны события |
| `event-time watermark` | Наблюдаемая верхняя граница business timestamps; используется для monitoring, но не доказывает полноту ingestion |

Связь является направленной: рекомендация `A -> B` не создаёт автоматически
`B -> A`. FBT calculation материализует оба направления отдельно, потому что
`confidence(A -> B)` и `confidence(B -> A)` различаются.

## Placements

Canonical placement codes:

| Placement | Назначение |
| --- | --- |
| `PRODUCT_RELATED` | Основной Related Products block на PDP |
| `FREQUENTLY_BOUGHT_TOGETHER` | Совместно покупаемые товары на PDP |
| `CART_CROSS_SELL` | Рекомендации из состава корзины |
| `CHECKOUT_UPSELL` | Ограниченный upsell до завершения заказа |
| `HOME_PERSONALIZED` | Будущий personalized home feed |
| `SEARCH_RERANK` | Будущий contextual feature для поискового rerank |

Placement — это не UI label. Он определяет candidate sources, policy, limits,
ranking semantics, caching и analytics attribution. Один target может иметь
разный rank в разных placements.

## Merchant configuration

### Placement policy

`recommendation_placement_policy` задаёт store-level поведение placement:

- `enabled` полностью выключает placement;
- `strategy` определяет объединение curated и automated candidates;
- `minimum_results` задаёт порог, ниже которого применяется fallback;
- `maximum_results` ограничивает опубликованный snapshot;
- `fallback_chain` хранит упорядоченный список зарегистрированных fallback
  sources;
- immutable policy identifier/version используется только для snapshot provenance и никогда не
  принимается или сравнивается как CAS precondition для write.

`fallback_chain` должен валидироваться application layer как JSON array
уникальных зарегистрированных source codes. Неизвестный source code является
write error, а не молча пропускаемым значением.

Canonical strategies:

| Strategy | Поведение |
| --- | --- |
| `CURATED_ONLY` | Только активные manual candidates |
| `CURATED_FIRST` | Pins первыми, свободные места заполняются automation/fallback |
| `BLENDED` | Manual и automated features участвуют в общем score |
| `AUTOMATED_ONLY` | Manual pins/boosts не участвуют; exclusions остаются safety rule |

Default strategy — `CURATED_FIRST`: она сохраняет merchant intent и даёт
предсказуемый cold-start.

### Manual recommendation

`manual_product_recommendation` хранит одну направленную связь
`anchor_product_id -> target_product_id` для placement.

Actions:

- `PIN` — target занимает уникальную фиксированную `position`;
- `BOOST` — target получает положительный ranking feature `boost`;
- `EXCLUDE` — target запрещён в placement независимо от automated score.

Один target имеет не более одного одновременно активного action внутри anchor +
placement. Anchor не может рекомендовать сам себя. `starts_at` и `ends_at`
задают полуоткрытый editorial interval `[starts_at, ends_at)`; null означает
бесконечную границу. `enabled = false` выключает запись без её удаления.

PostgreSQL exclusion constraints с `btree_gist` запрещают пересечения:

- intervals одного target внутри anchor + placement;
- intervals двух `PIN` на одной position внутри anchor + placement.

Выключенные и `STALE` records не резервируют position. Непересекающиеся
scheduled records могут повторно использовать target или position; окончание
одного interval ровно в момент начала следующего не считается конфликтом.

`anchor_reference_status` и `target_reference_status` принимают `VALID` или
`STALE`. Product deletion/unpublication handler не удаляет editorial intent, а
помечает ссылку stale и инициирует rebuild. Если товар снова становится valid,
конфигурацию можно восстановить без повторного ручного ввода.

Manual records не содержат title, image, price или availability snapshots.
Presentation всегда разрешается из текущего Product entity.

## Behavioral facts

### Canonical order events

FBT считает только подтверждённые продажи. `orderCreated` не является sales
fact: заказ может остаться неоплаченным или быть отменён.

Orders должен публиковать самодостаточный факт следующего смысла:

```typescript
interface OrderSaleCommittedEvent {
  eventType: "orderSaleCommitted";
  payload: {
    orderId: string;
    storeId: string;
    orderRevision: number;
    committedAt: string;
    lines: readonly {
      productId: string;
      quantity: number;
    }[];
  };
}
```

Reversal/correction должен содержать те же stable identifiers, новую
`orderRevision` и effective timestamp. Listing не должен восстанавливать состав
заказа дополнительным запросом в Orders.

### Order fact projection

`recommendation_order_fact` является append-only log минимальных обезличенных
sales facts. Каждая order revision хранится отдельной записью:

- `COMMITTED` или `REVERSED`;
- monotonic revision внутри order;
- локальная глобально возрастающая `ingestion_position`;
- timestamps;
- event ID;
- canonical payload hash для идемпотентности.

`recommendation_order_product_fact` агрегирует повторяющиеся lines одного
product внутри конкретной committed revision в
`(order_fact_id, product_id, quantity)`. Customer ID, email, address, payment
data и line price не сохраняются, поскольку они не нужны для pair statistics.

`recommendation_ingestion_cursor` хранит последний committed position отдельно
для каждого store. Event handler в одной транзакции:

1. блокирует cursor row через `SELECT ... FOR UPDATE`;
2. повторно проверяет event/revision idempotency;
3. увеличивает `last_position` на один;
4. вставляет immutable order fact с выделенной position;
5. commit-ит fact и cursor вместе.

Run читает watermark под тем же cursor lock. Поэтому watermark обозначает
непрерывный префикс закоммиченных facts; обычный PostgreSQL sequence/identity
для этого недостаточен, поскольку position может быть выделена до commit и
создать временный gap.

Ingestion position не зависит от business event time или порядка доставки
broker. Повтор с тем же event ID и payload является успешным no-op. Тот же event
ID или order revision с другим payload hash является integrity error.
Late/stale revisions разрешено дописать для диагностики, но effective order
state выбирается по максимальной `order_revision`, доступной на зафиксированной
ingestion position; поэтому старая revision не может откатить более новую.

## FBT calculation

### Calculation window

Каждый `recommendation_calculation_run` фиксирует:

- store и calculation type;
- `algorithm_version`;
- `[window_started_at, window_ended_at)`;
- `source_ingestion_watermark`;
- optional диагностический `source_event_time_watermark`;
- idempotency key;
- product/pair counts;
- lifecycle timestamps и failure code.

Расчёт сначала ограничивает append-only facts условием
`ingestion_position <= source_ingestion_watermark`, затем выбирает максимальную
`order_revision` каждого order. В расчёт входят только resulting `COMMITTED`
orders с `committed_at` внутри окна. Resulting `REVERSED` orders исключаются.
Product учитывается один раз на заказ для pair frequency; `quantity` сохраняется
отдельно и может стать feature, но не размножает одну покупку в несколько
совместных покупок.

Timestamp не является границей полноты: late event может иметь старый
`committed_at`, но новую ingestion position. Повторный run с тем же ingestion
watermark поэтому видит тот же набор revisions. Event-time watermark остаётся
nullable диагностическим показателем lag и не заменяет ingestion cursor. Он не
участвует в допуске или активации run и может быть меньше `window_ended_at`.

Run lifecycle:

```text
BUILDING -> READY -> ACTIVE -> SUPERSEDED
    |
    +-----------------------> FAILED
```

На store + calculation type существует ровно один `ACTIVE` run. Новый run
строится рядом со старым и активируется одной транзакцией: текущий становится
`SUPERSEDED`, новый — `ACTIVE`. Storefront никогда не читает `BUILDING` или
`READY` statistics.

### Product и pair statistics

`recommendation_product_stat` хранит purchase frequency продукта внутри run.
`recommendation_product_pair_stat` хранит направленные пары и готовые features:

```text
support(A, B) = orders(A and B) / storeOrders
confidence(A -> B) = orders(A and B) / orders(A)
lift(A -> B) = confidence(A -> B) / (orders(B) / storeOrders)
```

`recency_score` использует time decay. `source_score` является готовым
детерминированным FBT score конкретной версии алгоритма. Сырые counts хранятся
вместе с нормализованными значениями для объяснимости и повторной проверки.

Минимальный rules-based score:

```text
source_score =
  confidence
  * log(1 + ordersTogether)
  * min(lift, liftCap)
  * recencyScore
```

Кандидат отбрасывается до ranking, если не прошёл minimum pair orders,
confidence/lift thresholds или product lifecycle filters. Thresholds входят в
`algorithm_version`; изменение thresholds создаёт новый run и не меняет старый.

## Candidate generation и ranking

Для одного anchor + placement pipeline выполняет:

```text
active placement policy
  -> active scheduled manual actions
  -> active FBT run
  -> registered similarity/popularity fallbacks
  -> deduplicate by target product
  -> apply EXCLUDE
  -> apply publication/availability eligibility
  -> apply strategy
  -> rank with deterministic tie-breaker
  -> build immutable snapshot
  -> atomically activate snapshot
```

Manual и automated source tables не объединяются физически. Ranker собирает
candidate features в памяти или batch query, а опубликованный результат хранит
в `recommendation_snapshot_item`.

Rules ranker может использовать:

```typescript
interface RecommendationFeatures {
  isManual: boolean;
  manualPosition: number | null;
  manualBoost: string | null;
  fbtOrdersTogether: string | null;
  fbtConfidence: string | null;
  fbtLift: string | null;
  fbtRecencyScore: string | null;
  sameCategory: boolean;
  sharedTaxonomyScore: string;
  popularityScore: string;
  conversionScore: string;
  availabilityScore: string;
}
```

Decimal features передаются строками на boundary и не рассчитываются через
JavaScript floating point. ML ranker может быть добавлен без изменения
storefront contract: меняются `ranker_type`, `model_version` и feature schema.

### Determinism

При одинаковом score итоговый порядок использует `target_product_id ASC`.
`PIN` обрабатывается отдельной policy phase и не эмулируется искусственно
огромным score. Rank внутри snapshot непрерывен и начинается с `1`.

## Ranking snapshots

`recommendation_snapshot` является immutable generation для одного
store + anchor + placement. Он сохраняет:

- strategy и policy version;
- calculation run lineage;
- ranker/model version;
- build idempotency key;
- typed source watermarks object;
- generated/activated/expiry timestamps;
- ожидаемое число items.

Snapshot lifecycle повторяет calculation run lifecycle:

```text
BUILDING -> READY -> ACTIVE -> SUPERSEDED
    |
    +-----------------------> FAILED
```

`source_watermarks` хранит объект positions/versions всех источников, например
orders ingestion position и manual configuration version. Timestamp без
монотонной позиции не является допустимым единственным watermark.

`recommendation_snapshot_item` содержит target, rank, final score,
`primary_source`, `pinned`, feature object и source breakdown. Features и source
breakdown предназначены для explain/debug/admin tooling; storefront не обязан
публиковать их.

На anchor + placement может существовать только один `ACTIVE` snapshot.
Активация выполняется в одной транзакции после проверки:

- число items совпадает с `item_count`;
- ranks уникальны и образуют диапазон `1..item_count`;
- targets уникальны и не содержат anchor;
- snapshot не превышает policy `maximum_results`;
- каждый target принадлежит store и прошёл eligibility;
- policy/calculation lineage относится к тому же store.

DB constraints обеспечивают уникальность и tenant ownership связей: каждый FK
между store-scoped aggregate entities включает `store_id` с обеих сторон.
Инварианты, которые нельзя полностью выразить constraint-ами, дополнительно
проверяет application script.

## Storefront serving

Listing расширяет federation entity `Product`:

```graphql
extend type Product @key(fields: "id") {
  id: ID! @external

  relatedProducts(first: Int = 12): ProductRecommendationConnection!

  frequentlyBoughtTogether(
    first: Int = 3
  ): ProductRecommendationConnection!
}

type ProductRecommendation {
  product: Product!
  source: ProductRecommendationSource!
}

enum ProductRecommendationSource {
  MANUAL
  FREQUENTLY_BOUGHT_TOGETHER
  CONTENT_SIMILARITY
  POPULARITY
  FALLBACK
}
```

Оба поля используют один application service с разными placements:

```typescript
recommend({ anchorProductId, placement: "PRODUCT_RELATED", first });
recommend({ anchorProductId, placement: "FREQUENTLY_BOUGHT_TOGETHER", first });
```

Read path:

1. получает active snapshot;
2. читает items по `rank`;
3. повторно применяет дешёвые live eligibility checks к Product listing index;
4. пропускает stale, unpublished и недоступные targets;
5. при недостаточном количестве может читать следующий уже рассчитанный item,
   но не запускает синхронный FBT calculation;
6. возвращает federation Product references.

Read-time validation нужна, потому что inventory/publication могут измениться
после snapshot activation. Она не должна менять сохранённый snapshot.

Пустой snapshot является корректным результатом и должен кэшироваться. Cache
key обязан включать store, anchor, placement, active snapshot ID и storefront
eligibility context. Snapshot ID автоматически инвалидирует старый cache после
activation.

## Cold start и fallback

Recommended default chains:

```text
PRODUCT_RELATED:
  manual -> content similarity -> category popularity -> store popularity

FREQUENTLY_BOUGHT_TOGETHER:
  FBT -> manual complementary candidates -> category popularity
```

Если данных недостаточно для minimum results:

- `CURATED_ONLY` возвращает имеющиеся manual candidates без fallback;
- остальные strategies последовательно вызывают registered fallback sources;
- один target добавляется только один раз, даже если пришёл из нескольких
  sources;
- provenance всех contributing sources сохраняется в `source_breakdown`.

Fallback никогда не ослабляет `EXCLUDE`, tenant isolation, publication или
availability rules.

## Admin experience

Минимальный management flow:

1. merchant открывает Recommendation configuration продукта;
2. выбирает placement;
3. выбирает strategy;
4. добавляет targets через Product picker;
5. задаёт `PIN`, `BOOST` или `EXCLUDE`, schedule и position/boost;
7. успешная запись инициирует snapshot rebuild;
8. Admin показывает состояние последнего build и preview active snapshot.

Preview должен различать:

- текущий active snapshot;
- draft result, рассчитанный из ещё не опубликованной policy/configuration;
- причину удаления кандидата: stale, unpublished, unavailable, excluded,
  insufficient support или limit.

Admin mutation не принимает `store_id`: он берётся из trusted context. Product
IDs декодируются из Global ID и валидируются batch broker call в Catalog или
Listing product projection.

## Pricing и Add all

Recommendation не является promotion. FBT block может показать сумму текущих
цен, но не создаёт скидку и не обещает её.

Поток `Add all`:

```text
recommendation snapshot
  -> storefront выбирает concrete variants
  -> checkout batch add
  -> checkout pipeline валидирует merchandise/availability
  -> pricing независимо применяет подходящие promotions
```

Если merchant хочет скидку на комбинацию, Pricing хранит отдельное promotion
rule. Recommendation source может быть feature для предложения promotion, но не
заменяет pricing condition.

## Product lifecycle

Product events обрабатываются следующим образом:

- create/update/publication инициирует eligibility refresh и при необходимости
  rebuild затронутых anchors;
- delete помечает manual references `STALE` и исключает product из новых
  snapshots;
- target deletion использует reverse indexes manual/snapshot tables;
- anchor deletion supersede-ит active snapshots, но не удаляет calculation run;
- восстановление product переводит валидные ссылки обратно в `VALID` только
  после tenant ownership проверки.

FBT statistics могут сохранять deleted product IDs до удаления старого run по
retention policy. Они являются историческим агрегатом и не означают storefront
eligibility.

## Consistency и идемпотентность

- Все persisted UUID — UUIDv7, генерируемые application layer.
- `store_id` обязателен на всех records store-scoped aggregate; каждый FK между
  такими entities является составным и включает `store_id` с обеих сторон.
- Stable UUIDv7 `id` может оставаться PK; referenced tables предоставляют
  `UNIQUE (store_id, id)` для tenant-safe composite FK.
- Repository всегда фильтрует root records по trusted store context.
- Events применяются revision-aware и payload-hash-aware.
- Calculation run и snapshot имеют idempotency keys.
- READY data не обслуживает storefront до atomic activation.
- Старый ACTIVE остаётся доступен, пока новый build не готов.
- Failure нового build не повреждает текущую выдачу.
- Build retry с тем же key не создаёт вторую generation.

## Privacy и retention

Recommendation projection не хранит customer identity. Для FBT достаточно
order ID, product IDs, quantity и timestamps. Это уменьшает privacy surface и
не позволяет использовать таблицы рекомендаций как customer purchase history.

Retention выполняется только после появления нового ACTIVE поколения:

- append-only order facts старше maximum calculation window можно удалять после
  учёта reversal/correction SLA и только когда их ingestion positions не нужны
  сохраняемым runs;
- тяжёлые product/pair statistics SUPERSEDED run можно удалить отдельно и
  зафиксировать `statistics_purged_at`, сохранив маленький run header;
- FK snapshot -> calculation run использует `ON DELETE RESTRICT`: run header
  нельзя удалить, пока на него ссылается сохраняемый snapshot;
- FK snapshot -> placement policy также использует `ON DELETE RESTRICT`, чтобы
  не потерять policy lineage;
- run header удаляется только после удаления/истечения всех referencing
  snapshots;
- SUPERSEDED/FAILED snapshots удаляются по отдельному operational TTL;
- ACTIVE run/snapshot никогда не удаляется retention job;
- manual configuration не удаляется автоматическим retention.

Retention operation должна быть batch, store-scoped и resumable.

## Observability

Минимальные metrics:

- event projection lag, current ingestion position и late/stale revision count;
- committed/reversed order facts;
- calculation duration, products/pairs processed и run failures;
- snapshot build duration и activation failures;
- candidates per source до и после dedup/filtering;
- empty/expired/missing snapshot rate;
- recommendation impressions, clicks, add-to-cart и attributed purchases;
- coverage: доля published anchors с непустым active snapshot;
- manual pin/exclusion usage;
- FBT support/confidence/lift distributions.

Logs должны содержать `storeId`, `anchorProductId`, `placement`, `runId`,
`snapshotId`, `modelVersion` и correlation/workflow ID, но не customer PII.

## Failure semantics

| Failure | Поведение |
| --- | --- |
| Order event временно не обработан | Events retry; active run остаётся неизменным |
| Calculation упал | Run становится `FAILED`; предыдущий ACTIVE продолжает обслуживаться |
| Snapshot build упал | Snapshot становится `FAILED`; предыдущий ACTIVE не меняется |
| Active snapshot истёк | Read path применяет configured stale-serve window или возвращает empty; синхронный rebuild запрещён |
| Product стал unavailable | Read-time filter исключает его; async rebuild уплотняет ranks |
| Manual target stale | Запись сохраняется, target не попадает в candidates |
| Model version неизвестна runtime | Generation не активируется |

## Physical model

```text
recommendation_placement_policy

manual_product_recommendation
  anchor_product_id -> target_product_id

recommendation_order_fact
  └── recommendation_order_product_fact

recommendation_ingestion_cursor

recommendation_calculation_run
  ├── recommendation_product_stat
  └── recommendation_product_pair_stat

recommendation_snapshot
  └── recommendation_snapshot_item
```

Migration files:

- `services/listing/migrations/domains/9100_recommendations/9100_recommendations__configuration.sql`;
- `services/listing/migrations/domains/9100_recommendations/9101_recommendations__order_facts.sql`;
- `services/listing/migrations/domains/9100_recommendations/9102_recommendations__calculation_runs.sql`;
- `services/listing/migrations/domains/9100_recommendations/9103_recommendations__ranking_snapshots.sql`.

## Implementation order

1. Добавить Drizzle runtime models для всех migration tables.
2. Зафиксировать committed/reversed order event contracts.
3. Реализовать revision-aware order fact projection.
4. Реализовать placement policy и manual recommendation management scripts.
5. Реализовать deterministic FBT calculation run и atomic activation.
6. Реализовать candidate merger/rules ranker и snapshot activation.
7. Добавить Listing federation fields и DataLoader/batch read path.
8. Добавить Admin management/preview API.
9. Добавить impression/click/add-to-cart attribution events.
10. После накопления данных оценить ML ranker без изменения public contract.

## Canonical invariants

1. Catalog owns products; Listing owns recommendation decisions.
2. Related Products и FBT используют общий ranking pipeline, но не общие source
   tables.
3. Manual `EXCLUDE` является hard rule для любого ranking strategy.
4. `PIN` задаёт policy position, а не искусственно высокий score.
5. FBT строится только из confirmed sales facts и учитывает reversals.
6. Воспроизводимость calculation run определяется ingestion position, а не
   business timestamp.
7. Customer identity не сохраняется в recommendation projection.
8. Storefront читает только ACTIVE immutable snapshot.
9. Новый run/snapshot активируется атомарно и не разрушает предыдущий active.
10. Active или сохраняемый snapshot не может потерять calculation run lineage.
11. Live publication/availability повторно проверяются при serving.
12. Recommendation не создаёт цену, скидку или cart mutation.
13. Ranking всегда детерминирован и имеет stable tie-breaker.
14. Любой результат объясним через policy/model version, features и source
    breakdown.
