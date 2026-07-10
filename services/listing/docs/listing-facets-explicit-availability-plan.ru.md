# План перевода listing facets на явную variant availability-семантику

Дата: 2026-07-11

Статус: implementation plan, revised architecture contract

## Контекст

Сейчас отсутствие `ListingProductFilter.available` трактуется неодинаково:

```text
page without variant filters     -> все published products
facet counts                     -> только in-stock products
option filter                    -> только in-stock variants
price filter                     -> только in-stock priced variants
price virtual facet              -> только in-stock prices
```

Неявный `in-stock` зашит одновременно в query compilers и physical index:

- `compileFacetCountsQuerySql.ts` пересекает facet scope с
  `product_listing_index.in_stock = true`;
- option signatures строятся только из `variant.inStock = true`;
- option filter без явного availability использует `plan.inStock ?? true`;
- `compileFiltersSql.ts` неявно добавляет bitmap in-stock variants при OPTION
  или PRICE;
- `listing_posting_variant_price` содержит только priced active available
  variants;
- matched-price sorting, price range и price-related option counts опираются на
  этот in-stock-only posting.

Изменение должно убрать implicit stock filtering и сделать availability одним
явным variant-level predicate во всех listing branches.

## Архитектурное решение

### Availability относится к matching variant

Публичный input сохраняется:

```graphql
input ListingProductFilter {
  available: Boolean
}
```

Его семантика:

```text
available отсутствует -> availability не ограничивает варианты
available = true      -> matching variant.available = true
available = false     -> matching variant.available = false
```

Listing возвращает products, поэтому variant predicate всегда применяется до
variant-to-product projection.

Для запроса `available:false` это означает «существует matching unavailable
variant», а не «у продукта нет available variants».

Следствия:

- mixed product с available и unavailable variants входит и в `available:true`,
  и в `available:false`;
- buckets `true` и `false` могут пересекаться на уровне products;
- `trueCount + falseCount` может быть больше числа distinct products;
- одновременный input `true` и `false` остается validation error, потому что
  request выбирает один availability mode;
- published product без индексируемых variants входит в `ALL`, но не входит ни
  в `true`, ни в `false`.

Если storefront понадобится отдельный фильтр «product полностью out of stock»,
это другой product-level contract. Его нельзя выражать контекстной заменой
variant predicate на `product.in_stock = false`.

### Монотонность conjunctive constraints

При добавлении нового AND-group, сужении PRICE range или переходе из `ALL` в
explicit availability должен выполняться инвариант:

```text
matches(filters AND X) ⊆ matches(filters)
```

Поэтому availability нельзя применять к product aggregate без OPTION/PRICE и к
variant с OPTION/PRICE. Во всех explicit modes должен существовать variant
witness.

Это правило не относится к добавлению второго value/ID внутрь уже существующей
OR-group: расширение `color=red` до `color=red OR blue` или vendor list может
расширить результат и является ожидаемым поведением.

### Канонический query contract

```text
productBase =
  published scope
  & TAG/FEATURE/vendor filters

variantCandidates =
  active variants of productBase
  & availability predicate, если mode != ALL
  & OPTION groups
  & PRICE range

needsVariantWitness =
  availability mode != ALL
  OR OPTION filter exists
  OR PRICE filter exists

productMatches =
  needsVariantWitness
    ? productBase & projectDistinctProducts(variantCandidates)
    : productBase
```

Page, totalCount, discrete counts, virtual facets и price sort должны выводиться
из этого контракта, а не собирать собственную availability-семантику.

## Цели

После изменения:

1. Listing и facets без `available` работают по всем published products и всем
   индексируемым variants.
2. `available:true` возвращает products с matching available variant.
3. `available:false` возвращает products с matching unavailable variant.
4. OPTION + PRICE + availability применяются к одной variant row.
5. Добавление нового conjunctive filter group не может расширить result set;
   расширение OR-group описывается отдельно.
6. Facet isolation исключает только текущий facet и сохраняет остальные
   filters.
7. Metadata никогда не теряет active selected value; несовместимое selected
   value возвращается с count `0`.
8. Availability-first product ordering сохраняется и не становится скрытым
   membership filter.
9. Page и totalCount имеют одинаковый membership при любом sort, включая
   products без eligible price.
10. Все read branches одного request видят один database snapshot.

## Non-goals

В рамках этой работы не нужно:

- превращать availability в persisted `listing.facet_value`;
- переносить facet counts обратно в Catalog;
- менять публичные `facet.slug` / `facet_value.handle`;
- отказываться от roaring bitmap, option signatures или projection blocks;
- добавлять Redis/cache для listing query;
- поддерживать v1 и v2 physical index одновременно;
- вводить product-level фильтр «нет ни одного available variant»;
- сохранять code-only rollback после начала v2 writes: возврат к v1 требует
  совместимых v1 schema/state и rebuild v1 index.

Stage/prod данных и пользователей нет, поэтому выбран offline destructive
cutover. Несмотря на это, migration, reindex и readiness должны быть
реализованы как повторяемые операции, а не как ручной набор SQL-команд.

## Термины

### Availability mode

```ts
type ListingAvailabilityMode =
  | "ALL"
  | "AVAILABLE"
  | "UNAVAILABLE";
```

Маппинг выполняется один раз после normalization direct `available` и virtual
`IN_STOCK` facet inputs:

```text
normalized available отсутствует -> ALL
normalized available = true      -> AVAILABLE
normalized available = false     -> UNAVAILABLE
```

`undefined` запрещено заменять на `true` downstream helpers.

Для `IN_STOCK` нет persisted `facet_value`, но существующий публичный path
через configured `facet.slug` сохраняется как virtual resolution: resolver
проверяет существование store-scoped `facet` row типа `IN_STOCK` и парсит
поддерживаемый boolean-like handle в ту же boolean value. У `facet` нет
`enabled` lifecycle field, поэтому такой check не выдумывается. Direct и facet
inputs объединяются до вычисления mode; противоречие true/false дает validation
error. Downstream не различает источник filter. Canonical reusable output
остается `{ available: true | false }`, поэтому новые clients не зависят от
aliases.

### Indexable variant

В runtime index участвует только variant с:

```text
variant.status = active
```

`inactive` и `archived` variants отсутствуют в:

- variant facet postings;
- option signatures;
- runtime price posting;
- availability candidates;
- product availability aggregate.

Catalog snapshot содержит только текущие non-deleted variants, и mapper создает
для них active listing variants. Listing broker contract дополнительно
разрешает inactive/archived, поэтому write model обязан защищать инвариант и не
индексировать такие rows. Удаление Catalog variant представлено исчезновением
из следующего snapshot и stale-variant cleanup.

### Canonical variant availability

Availability означает upstream sellable-state, включая backorder:

```text
variant.in_stock = variant.availability.availableForSale
```

Имя physical column `in_stock` сохраняется для совместимости, но его contract —
`availableForSale`, а не `totalQuantity > 0`.

`totalQuantity` не участвует в boolean availability. Для существующего
non-negative `total_stock` хранится:

```text
normalizedTotalStock = max(0, totalQuantity ?? 0)
```

Signed inventory quantity, если она понадобится для diagnostics, должна иметь
отдельное поле. Нельзя писать отрицательное значение в `total_stock` и
нарушать DB check.

### Product availability aggregate

`product_listing_index.in_stock` вычисляется только из canonical indexable
variants:

```text
product.in_stock = any(indexable variant.in_stock = true)
product.total_stock = sum(indexable variant.normalizedTotalStock)
```

Upstream product availability snapshot используется для diagnostics/parity
warning, но не является независимым source of truth.

Product aggregate разрешено использовать только для:

- availability-first sorting;
- cursor key;
- diagnostics и invariant audit.

Он не участвует в membership, metadata или counts. Это особенно важно для
`UNAVAILABLE`, потому что mixed product может иметь `product.in_stock = true` и
matching unavailable variant.

### Availability-first sort

Первый ключ product ordering:

```text
product_listing_index.in_stock DESC
```

`listing_posting_product_sort.bool_value` должен быть байт-в-байт равен
`product_listing_index.in_stock`.

Для mixed product в `available:false` sort key может оставаться `true`: это
product ordering, а не membership predicate.

## Целевая семантика

### Базовая матрица

| Mode | Product base | Variant witness | Price source |
|---|---|---|---|
| `ALL` | все published products в scope | не нужен без OPTION/PRICE | все priced active variants |
| `AVAILABLE` | тот же published product base | существует matching `variant.in_stock = true` | priced matching available variants |
| `UNAVAILABLE` | тот же published product base | существует matching `variant.in_stock = false` | priced matching unavailable variants |

### Матрица facet-типов

| Facet | `ALL` | `AVAILABLE` | `UNAVAILABLE` |
|---|---|---|---|
| `TAG` | published products; variant witness только при OPTION/PRICE | products с available variant witness | products с unavailable variant witness |
| `FEATURE` | published products; variant witness только при OPTION/PRICE | products с available variant witness | products с unavailable variant witness |
| `OPTION` | values/counts по всем active variants | по available matching variants | по unavailable matching variants |
| `PRICE` | range/filter по всем priced active variants | по priced available variants | по priced unavailable variants |
| `AVAILABLE` | два isolated counts | собственный filter исключается | собственный filter исключается |

### Mixed product invariant

```text
variant A: color=red,  in_stock=false, price=100
variant B: color=blue, in_stock=true,  price=200
```

Ожидания:

```text
без availability                   -> matches
available=true                     -> matches через variant B
available=false                    -> matches через variant A
color=red                          -> matches
color=red + available=true         -> does not match
color=red + available=false        -> matches
color=red + price=100              -> matches
color=red + price=100 + true       -> does not match
color=red + price=100 + false      -> matches
color=blue + price=200 + true      -> matches
color=blue + price=200 + false     -> does not match
```

Такой контракт сохраняет same-variant и монотонность: `color=red + false` —
подмножество `false`, потому что mixed product уже входит в `false`.

### Facet isolation

Для target facet `X`:

```text
count(value X) = distinct products satisfying:
  scope
  & published
  & product filters кроме X
  & option filters кроме X, если X = OPTION
  & target value X
  & price filter, если X != PRICE
  & availability, если X != AVAILABLE
```

Все variant-level predicates в одной count branch применяются к одной variant
candidate relation до projection.

Правила:

- OR внутри одного facet и AND между разными facets сохраняются;
- TAG/FEATURE target value применяется на product после variant witness;
- OPTION target value, остальные OPTION, PRICE и availability совпадают на
  одном variant;
- PRICE range исключает активный price filter, но сохраняет OPTION и
  availability;
- AVAILABLE facet исключает собственный filter и отдельно считает `true` и
  `false`;
- counts всегда считают distinct products, а не variants или price rows.

## Текущее состояние, которое нужно удалить

### Implicit in-stock base

Удалить безусловные:

```text
scope & published & product.in_stock=true
```

и:

```text
OPTION/PRICE exists -> variant.in_stock=true
```

Base должен начинаться с `scope & published`. Explicit availability всегда
добавляется как variant witness.

### `plan.inStock ?? true`

Выражение должно исчезнуть. Helper получает `ListingAvailabilityMode` и для
`ALL` не добавляет availability predicate.

### Product stock membership

Удалить использование `product_listing_index.in_stock` из:

- page membership;
- totalCount membership;
- TAG/FEATURE metadata и counts;
- option counts scope;
- virtual facet membership;
- price eligibility.

Оставшиеся product stock reads допустимы только в sort/cursor/diagnostics.

### In-stock-only signatures и price posting

Write paths больше не фильтруют signatures или price rows по stock. Stock
сохраняется как отдельный bucket/predicate.

## Целевая physical index model

### Product и variant indexes

Поля сохраняются:

```text
product_listing_index.in_stock
variant_listing_index.in_stock
```

Инварианты:

```text
variant.in_stock = upstream availableForSale для active variant
product.in_stock = bool_or(indexable variant.in_stock)
sort.bool_value = product.in_stock
```

Variant status transition в inactive/archived удаляет variant из runtime index
и всех dependent postings.

### Option signature membership

`listing_option_signature_product_membership` хранит:

```text
variant_count
available_variant_count
unavailable_variant_count
```

DB checks:

```text
variant_count > 0
available_variant_count >= 0
unavailable_variant_count >= 0
variant_count = available_variant_count + unavailable_variant_count
```

`listing_option_signature` хранит:

```text
product_bitmap
available_product_bitmap
unavailable_product_bitmap
```

Семантика:

```text
product_bitmap:
  membership.variant_count > 0

available_product_bitmap:
  membership.available_variant_count > 0

unavailable_product_bitmap:
  membership.unavailable_variant_count > 0
```

Инварианты:

```text
product_bitmap = available_product_bitmap | unavailable_product_bitmap
available_product_bitmap и unavailable_product_bitmap могут пересекаться
```

Query helper выбирает:

```text
ALL         -> product_bitmap
AVAILABLE   -> available_product_bitmap
UNAVAILABLE -> unavailable_product_bitmap
```

Simple, candidate-only, heavy и forced-heavy paths обязаны использовать один
helper.

### Variant price posting

Новый contract `listing.listing_posting_variant_price`:

```text
одна row на каждый priced active variant + currency
```

`priced` означает canonical price с non-null `amountMinor`; builder валидирует
единственность `(variantId, currency)` до записи.

Добавить:

```text
in_stock boolean NOT NULL
```

Значение копируется из canonical `variant_listing_index.in_stock`. Out-of-stock
row не удаляется только из-за availability.

Индексы должны поддерживать:

```text
(store_id, currency, price_minor ASC,  product_id, variant_doc_id)
(store_id, currency, price_minor DESC, product_id, variant_doc_id)
(store_id, currency, in_stock, price_minor ASC,  product_id, variant_doc_id)
(store_id, currency, in_stock, price_minor DESC, product_id, variant_doc_id)
(store_id, currency, product_id, in_stock, price_minor, variant_doc_id)
```

Нужны ли все indexes или partial variants, определяется через `EXPLAIN
ANALYZE`; correctness не зависит от конкретного index set.

`variant_listing_price_index` остается source/debug table. Runtime filter,
range, matched sort и price-related counts читают expanded posting.

### Product price aggregates и sort rows

All-variant product price aggregate остается полезен только как optimization
для mode `ALL`. Он не является correctness source и не может сам определять
membership.

Aggregate пересчитывается из priced indexable variants и хранит
`min/max`. Price sort key для обоих directions — `min`; `max` используется для
range/diagnostics.

При explicit availability или OPTION price sort выбирает цену из той же
matching variant relation. Нельзя сортировать `available:true` по цене
unavailable variant.

Sort не меняет membership:

- product без eligible price остается в page с `NULL` price key;
- `NULL` price идет last;
- `totalCount` остается равен полной пагинации для любого sort.

Поэтому любой price-sort collector сначала идет от `productMatches`, а затем
делает left lookup matching variant price. Collector, который начинает с price
rows, запрещен: он теряет products без price.

Если dynamic left join к matching prices не проходит performance budget,
добавляются bucket-specific product price aggregates. Это optimization после
измерений, а не альтернативная семантика.

### Index contract и readiness state

Добавить store-level state, например:

```text
listing.listing_index_store_state
  store_id
  index_contract_version
  reindex_epoch
  status = BUILDING | READY | FAILED
  source_barrier
  catchup_barrier
  catchup_applied_at
  expected_count
  processed_count
  applied_count
  noop_count
  missing_count
  failed_count
  last_cursor
  updated_at
```

Read path обслуживает store только при:

```text
status = READY
index_contract_version = 2
```

Reindex может перейти в READY только при:

```text
processed_count = expected_count
applied_count + noop_count + missing_count = processed_count
failed_count = 0
missing_count = 0
Events deliveries through opaque catchup_barrier = drained
Listing apply-completion through catchup_barrier = confirmed
structural/semantic audit = passed
```

Для нового store zero-row READY bootstrap выполняется только надежным,
idempotent store-provisioning path: durable `storeCreated` delivery либо
явный вызов Listing из provisioning workflow. Текущий best-effort/non-critical
emit недостаточен для этого инварианта. Если product event обгоняет bootstrap,
writer возвращает retryable `LISTING_INDEX_STATE_MISSING`; он не создает READY
самостоятельно. Missing state существующего store также никогда не считается
empty READY и устраняется только full reindex.

Bootstrap выполняет только conditional insert `ON CONFLICT DO NOTHING`,
проверяет, что store все еще существует, и принимает только v2 provisioning
event/action, созданный после contract activation. Duplicate или поздний
`storeCreated` никогда не перезаписывает существующий BUILDING/FAILED/READY
state и его counters.

`reindex_epoch` обязателен и меняется при каждом reset/reindex. New-store
bootstrap и direct seed создают собственный epoch; обычные incremental writes
его не меняют.

`listing_index_item_state` получает `index_contract_version` и
`sequence_origin = EVENT | REINDEX_BASELINE`. Для v2 его `event_sequence`
допускает `0` только как internal reindex fence, когда у subject еще не было
domain event; обычные broker events по-прежнему обязаны иметь positive
sequence.

`ListingSyncWriteModel.version = 2` является runtime contract, а не только
частью hash.

## Изменения write path

### `ListingBuildSyncWriteModelScript`

1. Отфильтровать `variant.status !== active` до построения runtime rows.
2. Вычислить canonical variant availability только из `availableForSale`.
3. Нормализовать `totalStock` через `max(0, quantity)`.
4. Вычислить product `inStock/totalStock` из canonical indexable variants.
5. Пересчитать product price ranges/min sort key из priced indexable variants,
   не использовать upstream `item.priceRanges` как независимый aggregate.
6. Использовать то же product `inStock` во всех sort rows.
7. Строить option signature inputs из всех indexable variants.
8. Строить runtime price rows из всех priced indexable variants.
9. Добавить `inStock` в каждую runtime price row.
10. Поднять write model/hash version до `2`.
11. Сохранить deterministic ordering всех arrays/maps.

Для sellable kind без variants отдельный adapter должен явно создать variant
witness либо документировать отсутствие availability match. Скрытый fallback к
product snapshot запрещен.

### Single и batch writers

Оба path используют общий normalized builder и общий state classifier.

Обязательные свойства:

- runtime guard отклоняет write model version != 2;
- v1 persisted DBOS step не может записать v2 index;
- normal event с sequence меньше current state -> `ignored_stale`;
- normal event с sequence, равным sequence state с origin
  `REINDEX_BASELINE`, -> `ignored_stale` независимо от event idempotency
  key/hash: snapshot был прочитан после fence;
- normal event с sequence больше baseline применяется и меняет origin на
  `EVENT`;
- для origin `EVENT`: same sequence + тот же event/key/hash -> noop;
- для origin `EVENT`: same sequence + другой event/key/hash -> revision
  conflict;
- contract upgrade разрешен только explicit reindex action;
- single и batch создают одинаковые rows во всех derived tables;
- replace product/variants/postings/signatures и item-state update выполняются
  одной item transaction;
- store readiness меняет только reindex/store-lifecycle orchestrator отдельной
  store-level transaction; item writer никогда самостоятельно не ставит
  `READY`.

Workflow/step names и workflow-id namespace, содержащие persisted write model,
версионируются для v2. Перед cutover все v1 workflows должны быть drained.

### `ListingOptionSignatureRepository`

1. `OptionSignatureVariantInput` получает `inStock`.
2. Normalization считает total/available/unavailable counters.
3. Upsert membership пишет три counters.
4. Refresh строит три bitmaps и проверяет union invariant.
5. Delete/replace пересчитывает bitmaps под теми же advisory locks.
6. Signature row удаляется только при полном отсутствии membership.
7. Empty bucket сохраняется как non-null empty roaring bitmap.

### `ListingPostingVariantPriceRepository`

1. Input/output types получают `inStock`.
2. Insert/upsert пишет `in_stock`.
3. `ON CONFLICT DO UPDATE` обновляет stock state.
4. Replace удаляет row только при отсутствии active priced variant/currency, а
   не при availability=false.

### Index transitions

Один product sync обязан атомарно покрывать:

```text
available -> unavailable
unavailable -> available
backorder on/off при quantity <= 0
active -> inactive/archived
inactive/archived -> active
price add/update/delete в обоих buckets
option signature add/update/delete в обоих buckets
variant delete
product unpublish/delete
```

## Изменения read path

### Нормализация input

1. Normalize direct `available` без потери `false`.
2. Resolve configured virtual `IN_STOCK` boolean-like handles без создания
   `facet_value`.
3. Вернуть validation error при conflicting direct/facet inputs true/false.
4. Вычислить `ListingAvailabilityMode` один раз после resolution.
5. Передать mode в каждый SQL compiler и filter hash.

### Общие SQL helpers

Добавить централизованные helpers:

```text
compileVariantAvailabilityPredicate(alias, mode)
compileVariantAvailabilityBitmap(mode)
compileAvailabilityProductProjection(mode, variantPredicate)
compilePriceAvailabilityPredicate(alias, mode)
compileOptionSignatureBitmapColumn(mode)
```

Для `ALL` helpers не добавляют predicate/bitmap.

`compileProductAvailabilityBitmap()` в membership path не создается.

### Core filter CTEs

```text
scope_product_base  = scope & published
product_filters     = TAG/FEATURE/vendor
variant_filters     = OPTION + PRICE + optional availability
projected_products  = distinct project(variant_filters), если нужен witness
```

Product aggregate stock отсутствует в filter CTEs.

### Page и totalCount

Page и total строят один `productMatches` bitmap по канонической формуле.

Collectors отличаются только ordering/pagination:

- product sort collector — non-price sort в `ALL` без variant predicates;
- variant witness + product sort — non-price sort при explicit availability,
  OPTION или PRICE;
- matched variant price collector — любой price sort; он всегда стартует от
  `productMatches` и left join-ит eligible variant price;
- relevance collector — membership тот же, relevance только sort key.

`totalCount` — cardinality того же bitmap без sort/pagination.

Обязательный инвариант:

```text
totalCount = число distinct products, получаемых полной пагинацией
```

### Price sort и cursor

Канонический product price sort key — minimum price среди matching variants.
Он одинаков для ASC и DESC; direction меняет порядок products, а не способ
выбора variant. Maximum price используется только как верхняя граница virtual
PRICE range.

Сначала bitmap `productMatches` разворачивается в distinct product ids. Для
каждого product выполняется `LEFT JOIN LATERAL` к той же variant candidate
relation и выбирается один matching price row:

```text
candidate order per product:
  price ASC
  variant_doc_id ASC
```

Если eligible price отсутствует, outer product row сохраняется, product
получает `NULL` price/variant key и остается в result.

Финальный tuple:

```text
product.in_stock DESC
matched_price direction NULLS LAST
product_id ASC
variant_doc_id ASC NULLS LAST
```

Cursor и seek повторяют весь tuple. Нельзя использовать только
`priceMinor/productId/variantDocId` и нельзя подменять product sort key на
`priceRow.in_stock`.

Cursor payload поднимается до v2; поле рекомендуется назвать
`productAvailable`, а filter hash различает `ALL/AVAILABLE/UNAVAILABLE`.
Каждый cursor также содержит `indexContractVersion` и `reindexEpoch` из
store readiness row. Они проверяются внутри того же repeatable-read snapshot
до seek. Cursor другого epoch отклоняется как stale: reset переаллоцирует
`product_doc_id/variant_doc_id`, поэтому старый tie key нельзя безопасно
переиспользовать даже при неизменном filter hash.

Product aggregate price row разрешено использовать как measured fast path
только если parity test доказывает эквивалентность outer collector, включая
NULL-last products. Для ALL fast path использует тот же minimum price key в
обоих directions.

### Facet metadata

Metadata discovery является широким candidate set, а не вторым count engine:

```text
TAG/FEATURE candidates -> configured values с posting в published scope
OPTION candidates      -> all-signature product_bitmap в published scope
selected candidates    -> успешно resolved TAG/FEATURE/OPTION selections
```

Virtual IN_STOCK alias полностью поглощается при mode normalization и не
попадает в discrete metadata union: у него нет `facet_value_id/value_key`.
PRICE также формируется только собственной virtual branch.

Discovery намеренно stock-neutral. Availability и остальные filters
применяются в counts.

После merge metadata + counts наружу возвращаются values, для которых:

```text
count > 0 OR selected = true
```

Это suppression rule относится к configured discrete TAG/FEATURE/OPTION
values. Virtual AVAILABLE всегда возвращает оба boolean values, даже если один
или оба counts равны нулю; PRICE имеет собственную range shape.

Это обеспечивает одновременно:

- out-of-stock-only value виден в `ALL`;
- он скрыт в `AVAILABLE`, если count=0;
- он виден в `UNAVAILABLE`, если count>0;
- selected несовместимое value не исчезает и возвращается с count=0;
- counts не запускают per-value catalog joins.

### Product facet counts: TAG/FEATURE

Для каждого target facet:

1. Начать со `scope & published`.
2. Исключить только active group target facet.
3. Применить остальные product filters.
4. Построить одну variant candidate relation с OPTION/PRICE/availability.
5. Выполнить projection distinct products.
6. Пересечь с target product value bitmap.

Product aggregate availability не применяется ни до, ни после projection.
Если `needsVariantWitness = false`, шаги 4-5 не добавляют constraint: в `ALL`
без OPTION/PRICE product facet продолжает считать published products без active
variants.

### Option facet counts

Все стратегии используют общий availability-aware signature helper:

- simple;
- price-only;
- candidate-only;
- heavy;
- forced-heavy parity/profile.

Требования:

1. Удалить `available=false -> force_zero`.
2. Без price выбирать all/available/unavailable signature bitmap.
3. С price применять stock predicate к той же price/option variant row.
4. Текущий OPTION facet исключать из required groups.
5. Остальные OPTION + PRICE + availability совпадают на одном variant.
6. Результат — distinct product cardinality.
7. Mixed product может одновременно входить в available и unavailable bitmap.

### Virtual PRICE facet

Range и `priceEligibleCount` вычисляются без active price range, но с:

- scope/published;
- TAG/FEATURE/vendor;
- OPTION;
- explicit availability.

Source:

```text
expanded listing_posting_variant_price
```

```text
ALL         -> stock predicate отсутствует
AVAILABLE   -> vp.in_stock = true
UNAVAILABLE -> vp.in_stock = false
```

При OPTION range и count используют те же matching variants.

`priceEligibleCount` — count distinct products с хотя бы одной eligible priced
variant. Он не зависит от active price filter и не равен автоматически
`result.totalCount`.

### Virtual AVAILABLE facet

Virtual facet возвращает два значения:

```text
facet.id = available
facet.type = BOOLEAN
facet.uiType = RADIO

value true:
  input = { available: true }
  count = availabilityTrueCount
  selected = mode == AVAILABLE

value false:
  input = { available: false }
  count = availabilityFalseCount
  selected = mode == UNAVAILABLE
```

Оба counts исключают active availability filter и сохраняют остальные filters:

```text
availabilityTrueCount =
  cardinality(project(matching variants & in_stock=true) & productBase)

availabilityFalseCount =
  cardinality(project(matching variants & in_stock=false) & productBase)
```

Они считают distinct products и могут пересекаться.

GraphQL schema shape не меняется, но mapper/result types получают второй count
и второй reusable value.

### Request-level snapshot consistency

Write transaction atomicity недостаточна: пять независимых statements в
`READ COMMITTED` могут увидеть разные commits.

`getStorefrontListing()` открывает `REPEATABLE READ READ ONLY` transaction до
readiness check и `resolveFilterPlan()`. Store state, facet/value resolution,
page, total, metadata, counts и virtual facets должны видеть один snapshot.

Pure input normalization, не читающая DB, может выполняться до transaction.

Допустимые реализации:

1. Одна read-only transaction и отдельные compilers внутри нее.
2. Один SQL statement с несколькими result branches.
3. Exported snapshot для parallel connections, если измерения докажут
   необходимость.

Текущий `Promise.all` поверх pool без общего snapshot запрещен. Сохранение
пяти логических compilers не означает пять независимых snapshots.

## Аудит legacy paths

Для каждого repository/helper в `services/listing/src/repositories/storefront/`
выбрать один исход:

1. Production path — перевести на `ListingAvailabilityMode` и canonical variant
   witness.
2. Не используется — удалить repository, dependency и wiring.

Финальный audit:

```text
rg "in_stock = true|inStock \?\? true|force_zero|inStockVariantBitmap|product.*in_stock"
   services/listing/src/repositories/storefront
```

Допустимые product stock matches:

- availability-first ORDER BY/seek;
- cursor mapping;
- diagnostics/assertions.

Любой product stock predicate в membership/count/metadata является ошибкой.

## Migration tooling

### Текущее ограничение

Listing использует raw `node-pg-migrate`, но сейчас не имеет `db:generate`
script. Поэтому утверждение «сгенерировать listing migration текущим
`shopana db generate`» неверно.

До schema change нужно выбрать и реализовать поддерживаемый путь:

1. Добавить listing `db:generate` support в Shopana CLI/MCP; либо
2. Формализовать создание нового node-pg-migrate SQL-файла как штатную Shopana
   команду.

Ручное редактирование release `.changeset` по-прежнему запрещено. SQL migration
и package changeset — разные artifacts.

### Migration contents

Новая migration должна:

1. Добавить signature membership counters.
2. Добавить available/unavailable signature bitmaps.
3. Добавить `listing_posting_variant_price.in_stock`.
4. Добавить `listing_index_item_state.index_contract_version` и
   `sequence_origin`.
5. Изменить item-state check на `event_sequence >= 0`, зарезервировав `0`
   только для reindex baseline.
6. Создать `listing_index_store_state`.
7. Добавить checks/indexes.
8. Не создавать READY state для существующих stores: migration может
   backfill-ить только BUILDING, а reindex обязан upsert-ить BUILDING до reset.
9. Быть применимой к clean DB и заполненной v1 dev DB.

Compatibility initialization для старых v1 rows допустима:

```text
item sequence_origin = EVENT
available_variant_count = variant_count
unavailable_variant_count = 0
available_product_bitmap = product_bitmap
unavailable_product_bitmap = empty bitmap
variant price in_stock = true
```

Это только позволяет применить `NOT NULL`; оно не восстанавливает
отсутствующие unavailable memberships. Readiness остается `BUILDING` до full
reset/reindex. Transitional defaults разрешены только внутри migration:
после backfill нужно установить checks/`NOT NULL` и удалить defaults, чтобы v1
writer не мог молча создавать семантически неверные v2 rows.

### Events ordering migration

До full reindex Events migration создает durable subject counter и переводит
`persistPendingEvent` с `MAX(domain_events)` на atomic counter increment.
Backfill использует maximum retained sequence, затем offline reconciliation
поднимает counter до maximum известных consumer fences, включая
`listing_index_item_state.event_sequence`. Cutover блокируется, если любой
consumer fence выше Events counter после reconciliation.

Порядок обязателен: установить и проверить durable counters, переключить Events
writer, затем запускать Listing reset/reindex. Cleanup event history до этого
audit запрещен. При заявленном отсутствии stage/prod data reconciliation
должен быть пустым, но clean и populated-dev smoke остаются обязательными.

### Build/migrate order

Migrator читает `services/listing/dist/migrations`, поэтому порядок:

1. Создать source migration и обновить Drizzle models.
2. Выполнить listing build через Shopana tooling, чтобы migration попала в
   `dist/migrations`.
3. Проверить source/dist migration identity.
4. Выполнить migrate на clean temporary DB.
5. Выполнить migrate на temporary DB с v1 rows.
6. Только затем переходить к runtime/e2e verification.

Порядок «migrate, затем build» запрещен.

## Full reindex и cutover

### Обязательный prerequisite

В repository сейчас нет штатного full listing reindex workflow/CLI. Его нужно
реализовать до переключения read path, например:

```text
shopana listing reindex --store <storeId> --contract-version 2
```

Команда должна быть доступна через Shopana CLI MCP.

### `ListingFullReindexWorkflow`

Workflow обязан:

1. Создать уникальный `reindexEpoch` и перевести store в `BUILDING`.
2. Остановить новые listing workflow starts и получить opaque durable
   `sourceBarrier` в Events. Это barrier доставки, а не числовой
   `eventSequence`: sequence монотонен только внутри
   `(organizationId, subjectType, subjectId)` и несравним между products.
3. Перечислить IDs всех sellable items store стабильной keyset-пагинацией,
   включая drafts.
4. Для каждого batch сначала получить из Events текущий per-subject
   `eventSequenceFence`, затем прочитать Catalog snapshots для этих IDs.
   Такой порядок гарантирует, что snapshot не старее fence; более новые events
   будут безопасно переиграны после reindex.
5. Выполнять reset только при остановленных new workflow starts.
6. Писать только write model version 2 и сохранять `eventSequenceFence` в
   `listing_index_item_state.event_sequence` с origin `REINDEX_BASELINE`.
7. Обрабатывать items resumable batches.
8. Хранить source/catch-up barriers и
   expected/processed/applied/noop/missing/failed/last cursor.
9. Поддерживать interruption/resume и empty store.
10. Reconcile исчезнувший между enumeration и hydration item как explicit
    delete/noop; `missing` остается transient failure и не допускается в
    READY.
11. Запускать structural/semantic audit.
12. Оставляя store в `BUILDING`, возобновить v2 consumers, получить новый
    opaque `catchupBarrier` и дождаться подтверждения Events, что все
    listing-affecting deliveries до barrier переданы handlers.
13. Отдельно дождаться Listing apply-completion barrier: каждый target subject
    должен иметь terminal workflow result и item-state sequence не меньше
    target sequence. Сам факт успешного enqueue/start workflow не считается
    применением.
14. Повторить audit после apply-completion.
15. Переводить state в `READY` только при полном counter invariant,
    `missing=0`, drained delivery/apply barriers и успешном audit.

Explicit reindex action использует собственный idempotency namespace и не
маскируется обычным product-event classifier. Обычный bump hash не является
reindex mechanism.

После reset `listing_index_item_state` reindex обязан восстановить реальный
per-subject ordering fence каждого product. Произвольный synthetic sequence и
единый числовой store watermark запрещены: они могут сделать следующий
настоящий event stale или conflict. Для этого нужны batch broker contracts:

```text
Events.captureListingDeliveryBarrier(store) -> opaque barrier
Events.getSubjectSequenceFences(subjectRefs[]) -> ref + eventSequence
Events.awaitListingDeliveryBarrier(store, barrier) -> deliveries drained
Events.getBarrierSubjectTargets(store, barrier) -> ref + max eventSequence
Catalog.listListingItemIds(store, after, limit) -> stable keyset page
Catalog.getListingSnapshots(store, ids[]) -> found + missing
Listing.awaitAppliedBarrier(store, barrier, targets) -> workflows terminal + item state reached
```

Events должен хранить durable current sequence отдельно от retention-bound
`domain_events`, например в `event_subject_sequence`. Вычисление следующего
sequence через `MAX(domain_events.event_sequence)` не является допустимым
source of truth: cleanup истории может сбросить sequence и сделать все новые
events stale для Listing. `persistPendingEvent` атомарно increment-ит durable
subject counter, а fence action читает его; отсутствие row дает fence `0`.

`getSubjectSequenceFences` выполняется до `getListingSnapshots` для каждого
batch. Events с sequence `<= fence` после reindex классифицируются как stale;
events с sequence `> fence` применяются обычным classifier. Тесты обязаны
проверять оба направления. Если Events/Catalog пока не предоставляют этот
protocol, full reindex не готов к cutover; очистка item state без fence
запрещена.

Event handler сейчас подтверждает delivery после запуска DBOS workflow,
поэтому Events barrier сам по себе недостаточен. Listing apply barrier хранит
durable terminal acknowledgements (`applied/noop/ignored_stale/deleted`) либо
эквивалентно доказывает для каждого target, что workflow завершен, а
`listing_index_item_state.event_sequence >= targetSequence`. Failed/in-flight
workflow запрещает READY даже при полностью drained Events deliveries.

Protocol предполагает, что listing-affecting Catalog mutation становится
видимой в Catalog до публикации соответствующего domain event, а delivery
barrier закрывает все события, опубликованные до него. Если этот ordering не
гарантирован инфраструктурой, reindex разрешен только под freeze таких
mutations. Выбранный ниже offline cutover использует freeze независимо от
наличия production traffic.

### Reset scope

Transactional reset очищает derived listing data:

```text
product_title_bm25_search_index
listing_posting_variant_projection_block
listing_posting_variant_price
listing_posting_product_sort
listing_posting_bitmap
listing_option_signature_product_membership
listing_option_signature_value
listing_option_signature
variant_listing_price_index
listing_index_item_state
variant_listing_index
product_listing_price_index
product_listing_index
listing_doc_id_allocator
```

Facet configuration (`listing.facet*`, translations, sources, values,
swatches) не очищается.

### Offline cutover

1. Зафиксировать v1 correctness/performance baseline.
2. Build v2 artifacts и проверить migration assets в `dist`.
3. Заблокировать listing reads, listing-affecting Catalog/facet mutations и
   Project store create/delete.
4. Применить Events ordering migration, reconcile durable subject counters и
   переключить Events writer с `MAX(domain_events)` на counter.
5. Зафиксировать полный список Project stores, остановить новые listing
   workflow starts и зафиксировать opaque `sourceBarrier`.
6. Drain всех in-flight v1 workflows; новые event deliveries остаются в
   backlog до запуска v2 consumers.
7. Применить Listing migration.
8. Запустить v2 service со store state `BUILDING`.
9. Выполнить transactional reset.
10. Выполнить full reindex каждого store из frozen списка, включая empty, с
   per-item sequence fences.
11. Проверить initial counters, bitmaps и posting parity.
12. Оставляя reads закрытыми и state `BUILDING`, возобновить v2 consumers.
13. Зафиксировать opaque `catchupBarrier`, дождаться Events delivery drain и
    затем Listing apply-completion всех target workflows.
14. Повторить counters, invariant audit и page/count smoke matrix.
15. Перевести store в `READY/version=2`.
16. Включить reads, затем снять freeze Catalog/facet и Project store lifecycle
    mutations.

Migration считается forward-only. Rollback после начала v2 writes не является
возвратом binary: старый writer не заполняет новые NOT NULL columns/checks.
Возврат к v1 требует восстановления совместимых v1 schema + DB snapshot либо
явной reverse migration, остановки, очистки derived index и полного v1 rebuild.
Запуск v1 writer поверх v2 schema запрещен.

## План реализации

### Этап 0. Подготовить tooling

1. Добавить поддерживаемый listing migration workflow в Shopana CLI/MCP.
2. Реализовать Events delivery barrier/per-subject fence, Listing
   apply-completion barrier и Catalog keyset snapshot batch contracts.
3. Реализовать `ListingFullReindexWorkflow`, CLI command и readiness state.
4. Добавить versioned, conditional store-created bootstrap для empty
   `READY/version=2` state.
5. Добавить build -> migrate smoke для clean и v1 DB.
6. Версионировать v2 DBOS workflow/step IDs.

### Этап 1. Зафиксировать contract fixtures

Минимальные products:

```text
P1: один available variant
P2: один unavailable variant
P3: red unavailable + blue available
P4: одна signature одновременно available и unavailable
P5: priced available + priced unavailable с разными prices
P6: unavailable-only TAG/FEATURE/OPTION values
P7: backorder variant, quantity=0/negative, availableForSale=true
P8: direct Listing broker snapshot с inactive/archived priced variant
P9: available variant без price + unavailable priced variant
P10: published product без active variants, с TAG/FEATURE values
P11: selected value, несовместимое с availability
P12: два available variants с prices 100/300
P13: available competitor с price 200
```

Зафиксировать `ALL/AVAILABLE/UNAVAILABLE`, overlap mixed product и monotonicity.

### Этап 2. Ввести canonical availability

1. Добавить `ListingAvailabilityMode`.
2. Normalize mode один раз после facet resolution.
3. Ввести `indexableVariants` и canonical availability helpers.
4. Убрать quantity из boolean availability.
5. Вычислять product aggregate и sort bool из canonical variants.
6. Передать mode в filter hash и SQL requests.

### Этап 3. Расширить physical index

1. Создать migration поддерживаемым workflow.
2. Обновить `listingIndex.ts`.
3. Добавить signature counters/bitmaps.
4. Добавить stock в variant price posting.
5. Добавить store/item contract version state.
6. Обновить repository input/output types.

### Этап 4. Переписать write paths

1. Write model version 2 + runtime guard.
2. Signatures всех active variants с bucket counters.
3. Prices всех priced active variants со stock state.
4. Общий single/batch classifier и normalized payload builder.
5. Проверить replace/delete/status/stock transitions.
6. Добиться row-level single/batch parity.

### Этап 5. Переписать page, total и sort

1. Explicit AVAILABLE/UNAVAILABLE всегда создают variant witness.
2. Удалить implicit/product stock membership.
3. Сделать OPTION/PRICE/availability одной candidate relation.
4. Сохранить products без eligible price как NULL-last.
5. Добавить product availability в matched-price order/cursor/seek.
6. Проверить total/page parity и monotonicity.

### Этап 6. Переписать metadata и discrete counts

1. Stock-neutral metadata candidate discovery.
2. Union resolved selected values.
3. Filter output по `count > 0 OR selected`.
4. TAG/FEATURE counts через canonical variant projection.
5. Все option strategies через stock-aware signature helper.
6. Candidate/heavy parity.

### Этап 7. Переписать virtual facets

1. PRICE range/count из matching variant prices.
2. `priceEligibleCount` как distinct products.
3. AVAILABLE возвращает true и false values/counts.
4. Mapper корректно отражает selected mode.

### Этап 8. Обеспечить snapshot consistency

1. Выполнять logical branches в одном repeatable-read snapshot.
2. Удалить независимый pool `Promise.all`.
3. Сравнить transaction vs single-statement implementation по latency.

### Этап 9. Reindex и docs

1. Выполнить offline cutover на disposable environment.
2. Проверить interruption/resume, empty/new store и counter invariant.
3. Проверить stale-before-fence, newer-after-fence и catch-up barrier.
4. Обновить `knowledge/vault/listing/facets-architecture.ru.md`.
5. Обновить price/index contract docs.
6. Удалить комментарии/tests с implicit in-stock semantics.

## Основные файлы

### Contract/read path

- `services/listing/src/api/graphql-admin/schema/listing.graphql`
- `services/listing/src/resolvers/admin/listingInput.ts`
- `services/listing/src/resolvers/admin/listingFacetMapper.ts`
- `services/listing/src/repositories/storefront/types.ts`
- `services/listing/src/repositories/storefront/cursor.ts`
- `services/listing/src/repositories/storefront/StorefrontListingQueryRepository.ts`
- `services/listing/src/repositories/storefront/StorefrontFacetResolutionRepository.ts`
- `services/listing/src/repositories/storefront/sql/compileListingInputSql.ts`
- `services/listing/src/repositories/storefront/sql/compileFacetResolutionSql.ts`
- `services/listing/src/repositories/storefront/sql/compileFiltersSql.ts`
- `services/listing/src/repositories/storefront/sql/compileListingProductMatchesSql.ts`
- `services/listing/src/repositories/storefront/sql/compilePageQuerySql.ts`
- `services/listing/src/repositories/storefront/sql/compileTotalCountQuerySql.ts`
- `services/listing/src/repositories/storefront/sql/compileFacetsQuerySql.ts`
- `services/listing/src/repositories/storefront/sql/compileFacetCountsQuerySql.ts`
- `services/listing/src/repositories/storefront/sql/compileVirtualFacetsQuerySql.ts`
- `services/listing/src/repositories/storefront/sql/resultMappers.ts`
- `packages/shared-kernel/src/TransactionManager.ts` либо listing-local
  repeatable-read transaction wrapper

### Index/write/reindex

- `packages/broker-types/src/actions/catalog.ts`
- `packages/broker-types/src/actions/listing.ts`
- `packages/events/src/types.ts`
- `services/events/src/actions/index.ts` и
  `services/events/src/repositories/Repository.ts` для delivery barriers и
  batched per-subject sequence fences
- `services/events/src/repositories/models/` и `services/events/migrations/`
  для durable subject sequence state, независимого от event retention
- `services/catalog/src/actions/index.ts` для stable item-ID pages и batched
  listing snapshots
- `services/listing/src/handlers/ListingProductEventHandlers.ts`
- `services/listing/src/handlers/ListingProductBatchEventHandlers.ts`
- new `services/listing/src/handlers/ListingStoreEventHandlers.ts`
- new Listing apply-barrier action/repository for durable terminal workflow
  acknowledgements
- `services/project/src/sagas/StoreCreateSaga.ts` для guaranteed store
  provisioning delivery
- `services/listing/src/repositories/models/listingIndex.ts`
- `services/listing/src/repositories/listing/listingRepositoryTypes.ts`
- `services/listing/src/repositories/listing/ListingOptionSignatureRepository.ts`
- `services/listing/src/repositories/listing/ListingPostingVariantPriceRepository.ts`
- `services/listing/src/repositories/listing/ListingIndexItemStateRepository.ts`
- new `ListingIndexStoreStateRepository`
- `services/listing/src/scripts/listingIndexActionTypes.ts`
- `services/listing/src/scripts/ListingBuildSyncWriteModelScript.ts`
- `services/listing/src/scripts/ListingWriteIndexActionScript.ts`
- `services/listing/src/workflows/ListingBatchProductIndexWorkflow/stepFetchCatalogListingSnapshotsBatch.ts`
- `services/listing/src/workflows/ListingBatchProductIndexWorkflow/stepWriteListingBatchSyncIndexAction.ts`
- new `ListingFullReindexWorkflow`
- `services/listing/migrations/domains/0100_listing_index/`
- `packages/cli/src/`
- `packages/shopana-cli-mcp/src/`

### Tests/performance

- `e2e/fixtures/listing/seed.ts`
- `e2e/utils/listingSeed.ts`
- `e2e/scripts/listing-price-facet-perf.mjs`
- `e2e/tests/listing-api/listing.spec.ts`
- `e2e/tests/listing-api/listing-auto-indexing.spec.ts`
- `e2e/tests/listing-api/listing-service-no-filters-perf.spec.ts`
- `e2e/tests/listing-api/listing-service-perf.spec.ts`
- `e2e/tests/listing-api/listing-service-matrix-perf.spec.ts`

## Test tooling changes

`e2e/utils/listingSeed.ts` переводится на модель:

```text
product
  variants[]
    variantId
    status
    availableForSale
    totalQuantity
    prices[]
    optionValueKeys[]
```

Seeder должен:

- писать product/variant facet postings независимо от availability;
- поддерживать несколько variants одного product;
- писать `listing_posting_variant_price.in_stock`;
- считать total/available/unavailable signature counters;
- строить all/available/unavailable bitmaps;
- не создавать runtime rows для inactive/archived variants;
- в той же transaction завершать direct seed записью
  `listing_index_store_state = READY/version=2` с новым `reindexEpoch`.

Perf seeder выполняет тот же readiness transition после полной загрузки и
`ANALYZE` preparation. Auto-indexing specs не выставляют READY вручную: они
проверяют обычный store bootstrap/event path.

Для store, созданного уже после v2 cutover, store lifecycle handler создает
empty `READY/version=2` state с нулевыми counters через guaranteed provisioning
delivery. Тест с product event, пришедшим раньше store bootstrap, ожидает
retry, затем успешное применение без потери item. Existing store без v2 state
не инициализируется лениво в READY — он обязан пройти full reindex.
Duplicate/late `storeCreated` проверяется отдельно: conditional insert не
меняет уже существующий READY/BUILDING/FAILED state. Event без v2 provisioning
version и event для уже удаленного store не создают state.

Auto-indexing tests проверяют реальный Catalog -> event -> writer path; direct
seed используется только для детерминированной read-path matrix. Listing broker
fixture отдельно проверяет defensive handling `inactive/archived`, потому что
текущий Catalog snapshot представляет live variants как active, а delete — как
исчезновение variant из следующего snapshot.

Perf dataset:

```text
25% products -> только available variants
25% products -> только unavailable variants
50% products -> mixed variants
```

Prices и повторяющиеся signatures присутствуют в обоих buckets.

## Test matrix

### Page и total

Для category и search:

1. `ALL` содержит все published products.
2. `AVAILABLE` содержит products с available witness.
3. `UNAVAILABLE` содержит products с unavailable witness.
4. Mixed product входит в оба explicit modes.
5. Product без active variants входит только в `ALL`.
6. Новый conjunctive group, tighter PRICE и `ALL -> explicit mode` дают subset
   предыдущего result; расширение OR-group проверяется отдельно.
7. `totalCount` равен полной пагинации для каждого sort.
8. Cursor нельзя переносить между modes.
9. Cursor, выпущенный до нового reindex epoch, отклоняется после READY нового
   epoch.

### Product facets

Для TAG/FEATURE:

1. Counts используют variant witness выбранного mode.
2. Current product facet исключается из собственного base.
3. OPTION/PRICE/availability остаются active.
4. Mixed product не теряется в `UNAVAILABLE`.
5. Selected incompatible value возвращается с count=0.
6. Unselected zero-count value скрывается.
7. В ALL без OPTION/PRICE TAG/FEATURE P10 участвуют в metadata/count; explicit
   availability или другой variant witness исключает P10.

### Option facets

1. Unavailable-only value виден в `ALL` и `UNAVAILABLE`.
2. В `AVAILABLE` он скрыт при count=0, если не selected.
3. Same value в двух stock buckets считает product один раз внутри bucket.
4. Mixed product может считаться в обоих availability buckets.
5. OR внутри option facet и AND между option facets сохраняются.
6. Simple/candidate/heavy/forced-heavy counts совпадают.
7. Selected zero-count value остается reusable.

### Price

1. Default range включает все priced active variants.
2. AVAILABLE/UNAVAILABLE range используют соответствующий bucket.
3. Active price filter исключен из range и `priceEligibleCount`.
4. `priceEligibleCount` считает distinct products.
5. OPTION + PRICE + availability совпадают на одном variant.
6. Price sort использует price matching bucket, а не другой variant.
7. Product без eligible price остается в page как NULL-last.
8. Asc/desc cursor не пропускает и не дублирует products на stock и NULL
   boundaries.
9. Для P12/P13 оба directions используют один min key: ASC ставит P12(100)
   перед P13(200), DESC — P13(200) перед P12(100), игнорируя P12 max=300 как
   sort key.

### Availability output

1. Facet возвращает `true` и `false` reusable inputs.
2. В ALL оба `selected=false`.
3. В AVAILABLE selected только true.
4. В UNAVAILABLE selected только false.
5. True/false counts изолируют собственный filter.
6. Mixed product входит в оба counts.
7. Conflicting true/false input возвращает validation error.
8. Configured IN_STOCK boolean-like input дает тот же mode/result/hash, что и
   canonical direct `available`; unknown handle дает validation error.

### Write transitions

После каждого transition проверить page, metadata, counts, range, sort и оба
availability counts:

```text
available <-> unavailable
backorder on/off при zero/negative quantity
direct broker active <-> inactive/archived
Catalog variant delete/recreate
price add/update/delete
signature add/update/delete
same signature меняет bucket
variant/product delete
product publish/unpublish
```

### Migration/reindex

1. Migration проходит на clean DB.
2. Migration проходит на v1-populated DB.
3. v1 write model отклоняется v2 writer.
4. Full reindex работает для empty/populated store.
5. Reindex возобновляется после interruption.
6. Readiness не становится READY при failed items.
7. Readiness не становится READY при `missing > 0` или нарушенном counter
   invariant.
8. Event с sequence до per-item fence игнорируется как stale.
9. Event с sequence ровно fence игнорируется как stale для
   `REINDEX_BASELINE` в single и batch paths, даже при другом key/hash.
10. Event с sequence после per-item fence применяется и меняет origin на
    `EVENT`.
11. Subject sequence не сбрасывается после cleanup старых `domain_events`;
    fence `0` для нового subject принимает первый event с sequence `1`.
12. Event delivery acknowledged, но искусственно задержанный index workflow не
    разрешает READY до terminal apply acknowledgement.
13. Event backlog до opaque catch-up barrier применяется без потерь до READY.
14. Повторный epoch не создает duplicates.
15. Новый store получает empty READY v2 state; existing store без state не
    получает его лениво.
16. Duplicate/late store-created bootstrap не меняет существующий state;
    product-event-before-bootstrap успешно retry-ится.
17. Cursor предыдущего epoch отклоняется после завершения следующего reindex.

### Snapshot consistency

Concurrent stock transition между logical branch starts не может дать response,
где page/total/facets относятся к разным commits.

## Performance verification

Перед изменениями сохранить warm v1 baseline. Для 10k dataset измерить:

```text
ALL
AVAILABLE
UNAVAILABLE
```

Сценарии:

- no filters;
- product facets;
- one/multiple option facets;
- price-only;
- option + price;
- price asc/desc с NULL prices;
- heavy option strategy;
- selected zero-count metadata.

Проверять:

- отсутствие per-value N+1;
- отсутствие unbounded scan без store/currency bounds;
- правильный signature bitmap column;
- candidate/heavy parity;
- отсутствие temp spill;
- размер signature/price indexes;
- влияние repeatable-read orchestration.

Начальные budgets, которые фиксируются до implementation:

- AVAILABLE median после warmup не хуже v1 equivalent более чем на 25%;
- ALL и UNAVAILABLE не медленнее AVAILABLE более чем в 1.5 раза на одном
  representative scenario;
- любое изменение budget требует сохраненного EXPLAIN и явного решения, а не
  формулировки «приемлемо на глаз».

### Write/reindex profile

Расширение одной signature до трех bitmaps нельзя оценивать только read
benchmarks. На том же 10k dataset добавить:

- single availability flip для product в common signature с высокой
  cardinality;
- batch из availability flips;
- 8 parallel products, разделяющих одну signature/advisory lock;
- full v2 reindex empty/populated store;
- price add/delete при полном наборе новых indexes.

Собирать p50/p95 write latency, products/sec, advisory-lock wait, retries и
deadlocks, WAL bytes, rows touched, DB/index size и время bitmap refresh.
Начальные budgets относительно сохраненного v1 write/reindex baseline:

- single flip p95 не хуже более чем в 2 раза;
- parallel shared-signature throughput и full-reindex throughput не ниже 60%;
- deadlocks/lock timeouts отсутствуют;
- WAL на 1000 flips не выше 3x, общий Listing index size не выше 2.5x.

Если полный `rb_build_agg` трех bitmaps на каждое изменение common signature
не проходит budget, repository должен перейти на корректный delta refresh под
тем же lock: обновлять bucket bitmap только при переходе per-product counter
`0 <-> >0`. Выбор full rebuild или delta подтверждается profile и parity
tests; ослабление availability semantics не является optimization.

## Observability

Каждый listing request логирует:

```text
indexContractVersion
availabilityMode
collectorKind
snapshotStrategy
branch durations
candidate/returned facet values
priceEligibleCount
```

Reindex логирует:

```text
storeId
reindexEpoch
expected/processed/applied/noop/missing/failed
last cursor
sourceBarrier/catchupBarrier
deliveryDrained/applyCompleted
readiness transition
```

Diagnostics audit проверяет:

```text
membership.total = available + unavailable
signature.product_bitmap = available_bitmap | unavailable_bitmap
price posting stock = variant index stock
product.in_stock = bool_or(active variant.in_stock)
sort.bool_value = product.in_stock
```

## Риски и меры

### Непонимание overlap buckets

`available:false` не означает complement `available:true` на уровне products.

Меры:

- явно описать matching-variant semantics в GraphQL description;
- вернуть оба values/counts;
- mixed fixture обязателен;
- отдельный product-level out-of-stock filter не смешивать с этим input.

### Backorder regression

Quantity-based boolean исключит sellable backorder variant.

Меры:

- availability только из `availableForSale`;
- zero/negative quantity fixtures;
- product/variant/sort parity assertions.

### Same-variant regression

Меры:

- один canonical variant candidate relation;
- availability до projection;
- mixed option/price fixtures;
- запрет product stock membership predicates.

### Index growth

Меры:

- stock bitmaps в одной signature row;
- price stock column вместо второй table;
- indexes только после EXPLAIN;
- storage comparison на 10k dataset.

### Single/batch divergence

Меры:

- общий builder/classifier;
- row-level parity test;
- одинаковая contract version.

### Mixed read snapshots

Меры:

- repeatable-read request boundary;
- concurrent transition test;
- readiness guard во время rebuild.

### Incomplete reindex

Меры:

- full reindex является отдельным deliverable;
- BUILDING/READY state;
- resumable counters/cursor;
- `processed=expected`, полный applied/noop/missing invariant;
- `failed=0`, `missing=0`, drained delivery + apply barriers и повторный audit
  до READY.

## Проверка реализации

Следовать project rules:

- development/build/migrate/codegen/e2e запускать через Shopana CLI/MCP;
- не запускать `test`, `tsc` напрямую;
- Playwright запускать по одному spec-файлу;
- build выполнять до migrate, потому что listing migrations читаются из dist;
- release changeset вручную не редактировать; при необходимости генерировать
  разрешенной npm-командой.

Порядок:

1. Build v2 tooling, Events, Catalog и Listing.
2. Events durable-sequence migration/retention smoke.
3. Clean Listing DB migration smoke.
4. v1-populated Listing DB migration smoke.
5. Targeted listing read semantics spec.
6. Auto-indexing transition spec.
7. Single/batch parity.
8. Reindex empty/interruption/resume/fence specs.
9. Candidate/heavy parity.
10. 10k performance matrix.
11. Offline cutover rehearsal и post-backlog smoke.

## Acceptance criteria

Работа завершена, когда:

1. Отсутствующий `available` нигде не превращается в `true`.
2. Direct `available` и configured virtual IN_STOCK aliases нормализуются в
   один mode; conflicting values отклоняются.
3. Availability всегда применяется к matching active variant до projection.
4. Mixed product входит и в AVAILABLE, и в UNAVAILABLE без других variant
   filters.
5. Добавление нового OPTION/product facet group, tighter PRICE или explicit
   availability не расширяет result set; добавление value в OR-group может
   расширять его.
6. OPTION + PRICE + availability используют одну variant row.
7. Product aggregate stock не участвует в membership/metadata/counts.
8. Product aggregate, sort bool и canonical variants проходят parity audit.
9. Backorder availableForSale=true остается available при zero/negative
   quantity.
10. Inactive/archived variants из Listing broker contract отсутствуют во всех
    runtime postings; Catalog delete очищает stale variant dependencies.
11. TAG/FEATURE/OPTION/PRICE по умолчанию учитывают оба stock buckets;
    TAG/FEATURE в ALL без variant filters считают product без active variants.
12. Metadata сохраняет selected zero-count values и скрывает unselected zero
    discrete values.
13. AVAILABLE facet всегда возвращает true/false counts, reusable inputs и
    selected state, включая zero counts.
14. Price range/count/sort используют matching availability bucket; ASC и
    DESC сортируют один canonical minimum matching price key.
15. Price sort не меняет membership; NULL prices остаются в page.
16. Matched-price cursor включает product availability и полный nullable price
    tuple.
17. Page и totalCount сохраняют parity для всех modes/scopes/sorts.
18. Cursor hash различает ALL/AVAILABLE/UNAVAILABLE, а payload проверяет
    `indexContractVersion/reindexEpoch`; cursor прошлого epoch отклоняется.
19. Option signature index содержит all/available/unavailable counters и
    bitmaps с union invariant.
20. Variant price posting содержит все priced active variants обоих buckets.
21. Single и batch writers дают одинаковый normalized index и одинаково
    классифицируют exact-fence baseline event.
22. v1 write model не может записаться в v2 index.
23. Все logical read branches видят один repeatable snapshot.
24. Supported Listing/Events migration workflow проверен на clean/v1 DB и
    event-retention scenario.
25. Full reindex CLI/workflow существует, resumable и доступен через Shopana
    tooling.
26. Empty-store reindex завершается READY.
27. Populated-store reindex завершается только при
    `processed=expected`, `applied+noop+missing=processed`, `failed=0` и
    `missing=0`.
28. Reindex пишет `REINDEX_BASELINE`: sequence меньше или равный fence
    игнорируется как stale, sequence больше fence применяется и меняет origin
    на EVENT, а fence `0` принимает первый positive event.
29. Durable subject sequence переживает cleanup event history и не может быть
    вычислен из `MAX` retained events.
30. Readiness не включается до Events delivery drain, Listing terminal
    apply-completion и повторного structural/semantic audit.
31. Новый store получает empty `READY/version=2` только conditional v2
    bootstrap insert; duplicate/late event не меняет state, а existing store
    без v2 state требует full reindex.
32. Direct seed поддерживает mixed multi-variant products, новый epoch и новые
    NOT NULL columns.
33. Auto-indexing покрывает availability/status/price/signature transitions.
34. Candidate/heavy counts сохраняют parity.
35. Read и write/reindex performance matrix укладывается в budgets без N+1,
    unbounded scans, temp spill, deadlocks и неприемлемого WAL/lock wait.
36. Knowledge base и index contract docs обновлены после успешного audit.
