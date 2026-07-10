# План перевода listing facets на явную availability-семантику

Дата: 2026-07-11

Статус: implementation plan

## Контекст

Сейчас listing без фильтров возвращает все опубликованные продукты, включая
out-of-stock, но facet counts и часть variant-level query path работают только
по in-stock данным.

Это поведение закреплено в нескольких независимых местах:

- `compileFacetCountsQuerySql.ts` всегда пересекает facet scope с
  `product_listing_index.in_stock = true`;
- option signatures строятся только из `variant.inStock = true`;
- option filter без явного availability использует `plan.inStock ?? true`;
- `compileFiltersSql.ts` неявно добавляет bitmap in-stock variants, когда есть
  option или price filter;
- `listing_posting_variant_price` физически содержит только priced active
  in-stock variants;
- price range, matched price sort и price-related option counts используют этот
  in-stock-only physical index.

В результате отсутствие фильтра `available` трактуется неодинаково:

```text
page without variant filters     -> all published products
facet counts                     -> only in-stock products
option filter                    -> only in-stock variants
price filter                     -> only in-stock priced variants
price virtual facet              -> only in-stock prices
```

Цель изменения — сделать availability обычным явным измерением listing query:

```text
available отсутствует -> stock не ограничивает результат
available = true      -> участвуют только in-stock products/variants
available = false     -> участвуют только out-of-stock products/variants
```

## Цель

Переписать listing page, total count, facet metadata, facet counts и virtual
facets так, чтобы все ветки использовали один availability contract.

После изменения:

1. Listing и все facets по умолчанию работают по всем опубликованным продуктам
   и всем индексируемым вариантам.
2. `available: true` явно ограничивает product-level и variant-level вычисления
   in-stock сущностями.
3. `available: false` явно ограничивает вычисления out-of-stock сущностями.
4. OPTION + PRICE + availability применяются к одному и тому же варианту.
5. Facet isolation исключает только текущий facet и сохраняет availability при
   подсчете остальных facets.
6. Availability-first sorting сохраняется и не превращается в скрытый фильтр.

## Non-goals

В рамках этой работы не нужно:

- превращать availability в persisted `listing.facet_value`;
- менять публичный input `ListingProductFilter.available: Boolean`;
- переносить facet counts обратно в Catalog;
- менять публичные идентификаторы `facet.slug` / `facet_value.handle`;
- отказываться от roaring bitmap, option signatures или projection blocks;
- убирать сортировку, которая показывает in-stock продукты перед out-of-stock;
- добавлять cache или Redis для listing query;
- поддерживать старый и новый listing index одновременно: stage/prod данных и
  пользователей в проекте нет, поэтому derived index можно полностью
  пересобрать.

Отдельное значение `available: false` в `ListingFacet.values` не добавляется в
этом плане. Публичный input уже принимает `false`, а текущий BOOLEAN UI работает
как switch для `available: true`. Если storefront должен показывать отдельный
пункт «Out of stock», это отдельное изменение presentation contract.

## Термины

### Availability mode

Вместо неявной комбинации `boolean | undefined` в query compiler ввести
канонический режим:

```ts
type ListingAvailabilityMode =
  | "ALL"
  | "IN_STOCK"
  | "OUT_OF_STOCK";
```

Маппинг выполняется один раз после нормализации input:

```text
filters.inStock === undefined -> ALL
filters.inStock === true      -> IN_STOCK
filters.inStock === false     -> OUT_OF_STOCK
```

`undefined` нельзя заменять на `true` ни в одном downstream helper.

### Product availability

Product-level availability берется из:

```text
listing.product_listing_index.in_stock
```

Она применяется, когда query не требует доказать совпадение option/price/stock
на конкретном варианте.

### Variant availability

Variant-level availability берется из:

```text
listing.variant_listing_index.in_stock
```

Она обязательна для same-variant вычислений:

```text
OPTION + available
PRICE + available
OPTION + PRICE + available
```

### Availability-first sort

`in_stock DESC` в sort rows и cursor остается правилом порядка. Оно не должно
влиять на membership result bitmap.

## Целевая семантика

### Базовая матрица

| Input | Product scope | Variant scope | Price source |
|---|---|---|---|
| `available` отсутствует | все published products | все индексируемые variants | все priced variants |
| `available: true` | `product.in_stock = true` | `variant.in_stock = true` | priced in-stock variants |
| `available: false` | `product.in_stock = false` | `variant.in_stock = false` | priced out-of-stock variants |

### Матрица facet-типов

| Facet | Без availability | С `true` | С `false` |
|---|---|---|---|
| `TAG` | counts по всем published products | counts по in-stock products | counts по out-of-stock products |
| `FEATURE` | counts по всем published products | counts по in-stock products | counts по out-of-stock products |
| `OPTION` | values/counts по всем variants | только matching in-stock variants | только matching out-of-stock variants |
| `PRICE` | range/filter по всем priced variants | по priced in-stock variants | по priced out-of-stock variants |
| `IN_STOCK` | count in-stock subset внутри остальных filters | собственный filter исключается при подсчете count | собственный filter исключается при подсчете count |

### Same-variant invariant

Для продукта:

```text
variant A: color=red,  in_stock=false, price=100
variant B: color=blue, in_stock=true,  price=200
```

ожидается:

```text
color=red                         -> product matches
color=red + available=true        -> product does not match
color=red + available=false       -> product matches
color=red + price=100             -> product matches
color=red + price=100 + true      -> product does not match
color=blue + price=200 + true     -> product matches
```

Нельзя реализовывать variant-level availability простым пересечением с bitmap
in-stock products: наличие другого in-stock варианта не делает matching
out-of-stock вариант доступным.

### Facet isolation

Для каждого discrete facet `X`:

```text
count(value X) =
  scope
  & availability, если задан
  & все product filters кроме X
  & все option filters кроме X
  & price filter
  & bitmap(value X)
```

Правила:

- availability сохраняется при подсчете TAG/FEATURE/OPTION;
- при подсчете virtual availability facet активный availability filter
  исключается;
- при подсчете price range активный price filter исключается, availability
  сохраняется;
- OR внутри одного facet и AND между разными facets сохраняются.

## Текущее состояние, которое нужно удалить

### Безусловный in-stock base для counts

В `compileFacetCountsQuerySql.ts` сейчас создается:

```text
in_stock_products
scope_product_base = scope & published & in_stock
```

Этот base используется и product facet counts, и option facet counts. Он должен
быть заменен на base без stock:

```text
scope_product_base = scope & published
```

Availability добавляется только через нормализованный explicit filter.

### Неявный `true` в option filter

В `compileListingProductMatchesSql.ts` используется:

```ts
plan.inStock ?? true
```

Это выражение должно исчезнуть. Helper variant matching должен принимать
`ListingAvailabilityMode` и не добавлять stock predicate для `ALL`.

### Неявный stock bitmap в `compileFiltersSql.ts`

Сейчас `active_stock_variant_filter` возвращает in-stock variants не только
при явном input, но и при наличии option/price filters. Целевое правило:

```text
ALL          -> NULL, stock bitmap отсутствует
IN_STOCK     -> bitmap variant.in_stock = true
OUT_OF_STOCK -> bitmap variant.in_stock = false
```

Наличие option или price filter само по себе не меняет availability mode.

### In-stock-only option signatures

Обычный и batch write path передают в `ListingOptionSignatureRepository` только
`variants.filter(variant.inStock)`. Из-за этого option metadata и optimized
counts физически не могут увидеть out-of-stock-only комбинации.

### In-stock-only price posting

`listing_posting_variant_price` сейчас содержит только priced active in-stock
variants. Поэтому отсутствие stock filter невозможно отличить от
`available: true` без смены physical index contract.

## Целевая модель индекса

### Product и variant index

Существующие поля сохраняются:

```text
product_listing_index.in_stock
variant_listing_index.in_stock
```

Они остаются source of truth для availability mode.

### Option signature index

Рекомендуемый вариант — сохранить optimized signature paths и расширить
signature index stock-aware агрегатами.

#### `listing_option_signature_product_membership`

Заменить один счетчик смыслово неполной membership на три счетчика:

```text
variant_count               -- все варианты product/signature
in_stock_variant_count      -- варианты с in_stock = true
out_of_stock_variant_count  -- варианты с in_stock = false
```

Инварианты:

```text
variant_count > 0
in_stock_variant_count >= 0
out_of_stock_variant_count >= 0
variant_count = in_stock_variant_count + out_of_stock_variant_count
```

#### `listing_option_signature`

Сохранить `product_bitmap` как bitmap всех продуктов с signature и добавить:

```text
in_stock_product_bitmap
out_of_stock_product_bitmap
```

Семантика:

```text
product_bitmap:
  membership.variant_count > 0

in_stock_product_bitmap:
  membership.in_stock_variant_count > 0

out_of_stock_product_bitmap:
  membership.out_of_stock_variant_count > 0
```

При необходимости добавить отдельные cardinality columns для diagnostics, но
query correctness не должна зависеть от сохраненного cardinality.

Это покрывает случай, когда у одного продукта одна и та же option signature
есть одновременно у in-stock и out-of-stock вариантов.

#### Выбор bitmap в query

Создать один SQL helper:

```text
ALL          -> os.product_bitmap
IN_STOCK     -> os.in_stock_product_bitmap
OUT_OF_STOCK -> os.out_of_stock_product_bitmap
```

Simple, candidate-only и heavy option facet count paths должны использовать
этот helper, а не собственные stock guards.

Удалить текущую логику:

```text
available=false -> force_zero
```

Out-of-stock становится полноценным bucket, а не пустым результатом.

### Variant price posting index

Изменить contract `listing.listing_posting_variant_price`:

```text
раньше: только priced active in-stock variants
после:  все priced индексируемые variants
```

Добавить колонку:

```text
in_stock boolean NOT NULL
```

`RuntimeVariantPriceRowInput` переименовать в нейтральный тип, например
`ListingVariantPricePostingRowInput`, либо как минимум обновить его семантику.

Write path должен писать price row для каждого варианта с ненулевым price state,
независимо от availability, и копировать `variant.inStock` в row.

Индексы должны поддерживать три режима:

```text
(store_id, currency, price_minor, ...)
(store_id, currency, in_stock, price_minor, ...)
(store_id, currency, product_id, in_stock, price_minor, ...)
```

Проверить через `EXPLAIN ANALYZE`, нужны ли отдельные partial indexes для
`in_stock = true` и `in_stock = false`. Не добавлять оба заранее без измерений.

`variant_listing_price_index` остается source price table. Posting table
остается derived hot index для filter/range/sort.

### Product price aggregates и sort rows

`catalogListingSnapshotMapper.buildPriceRanges()` уже строит range по всем
вариантам. Зафиксировать этот contract в документации и не фильтровать range по
stock на write path.

`listing_posting_product_sort.bool_value` продолжает хранить product
availability для availability-first ordering. `bigint_value` хранит price sort
value по всем вариантам. Эти два поля нельзя трактовать как один фильтр.

### Write model version

Изменение physical semantics должно инвалидировать прежние idempotency hashes.

Поднять `ListingSyncWriteModel.version` и hash envelope с `1` до `2`. В version 2
должны входить:

- stock-aware option signature membership;
- all-variant price posting rows с `inStock`;
- неизмененные product/variant posting memberships.

Это не заменяет полный reindex, но исключает ошибочный noop при повторной
доставке snapshot с тем же revision.

## Изменения write path

### `ListingBuildSyncWriteModelScript`

1. Сохранить `variant.inStock` на каждой variant row.
2. Строить option signature inputs из всех вариантов, а не только in-stock.
3. Строить price posting rows из всех priced вариантов.
4. Добавить `inStock` в каждый variant price posting row.
5. Поднять write model version/hash version.
6. Сохранить deterministic sorting rows и maps.

### `ListingWriteIndexActionScript`

1. Убрать `.filter((variant) => variant.inStock)` перед
   `listingOptionSignature.replaceForProduct()`.
2. Передавать `inStock` вместе с option signature variant input.
3. Заменять price postings для всех variants, включая out-of-stock.
4. Сохранить transaction boundary: product, variants, price postings,
   signatures и `listing_index_item_state` обновляются атомарно.

### Batch write workflow

Повторить те же изменения в
`ListingBatchProductIndexWorkflow/stepWriteListingBatchSyncIndexAction.ts`.

Single-item и batch paths должны строить байт-в-байт одинаковую derived model.
Добавить parity assertion/fixture, чтобы stock filtering снова не появился
только в одном path.

### `ListingOptionSignatureRepository`

1. Расширить `OptionSignatureVariantInput` полем `inStock`.
2. При нормализации считать total/in-stock/out-of-stock variants для пары
   product + signature.
3. Upsert membership записывает все три счетчика.
4. Refresh агрегирует три product bitmaps.
5. Delete/replace пересчитывает все три bitmaps под теми же advisory locks.
6. Удалять signature row только когда нет membership ни в одном bucket.

### `ListingPostingVariantPriceRepository`

1. Добавить `inStock` в insert/upsert mapping.
2. Обновлять `in_stock` в `ON CONFLICT DO UPDATE`.
3. `replaceForVariant(s)` не удаляет row только из-за out-of-stock состояния.
4. Repository read methods и returned model должны отражать новую колонку.

## Изменения read path

### Нормализация input

`ListingProductFilter.available` уже различает `false`, `true` и отсутствие.
Сохранить это поведение в:

- `listingInput.ts`;
- `StorefrontListingQueryRepository.normalize()`;
- `StorefrontFacetResolutionRepository`;
- `compileFacetResolutionSql.ts`.

Противоречащие stock inputs (`true` и `false` одновременно, включая direct и
configured IN_STOCK facet handles) должны возвращать validation error, а не
пустой результат и не last-write-wins.

После resolution вычислить `availabilityMode` один раз и передавать его во все
SQL compilers.

### Общие SQL helpers

Добавить централизованные helpers:

```text
compileProductAvailabilityBitmap(mode)
compileVariantAvailabilityBitmap(mode)
compileVariantAvailabilityPredicate(alias, mode)
compilePriceAvailabilityPredicate(alias, mode)
compileOptionSignatureBitmapColumn(mode)
```

Требование: для `ALL` helpers возвращают отсутствие predicate/bitmap, а не
`true` bucket.

Запретить локальные конструкции `inStock ?? true` и `in_stock = true` в facet,
price и projection branches, кроме реализации самих helpers и вычисления
virtual in-stock count.

### Scope и filter CTE

`scope_products` остается bitmap всех published products в category/search
scope.

Разделить CTE по назначению:

```text
scope_product_base       = scope & published
active_product_stock     = explicit product stock bitmap or NULL
active_variant_stock     = explicit variant stock bitmap or NULL
product_filters          = TAG/FEATURE/vendor + optional product stock
variant_filters          = OPTION/PRICE + optional variant stock
```

Product stock применяется только когда variant-level same-variant predicate не
нужен. При OPTION/PRICE availability применяется до variant-to-product
projection.

### Page query

#### Product collector

Для TAG/FEATURE/vendor и отсутствия variant predicates:

```text
matches = scope & product filters & optional explicit product stock
```

Без availability out-of-stock продукты остаются в result и сортируются после
in-stock через существующий bool sort key.

#### Option collector

При OPTION без PRICE:

```text
variant matches = option groups
                & availability variant bitmap, если задан
product matches = project(variant matches) & product base
```

Для `ALL` stock bitmap отсутствует.

#### Matched variant price collector

При PRICE и/или OPTION использовать расширенный
`listing_posting_variant_price`:

```text
price rows
& option variant bitmap, если задан
& vp.in_stock = mode, если mode != ALL
& price range, если задан
```

Сохранить выбор одного matching variant на product и deterministic cursor по
`priceMinor`, `productId`, `variantDocId`.

`available:false + price` больше не должен short-circuit в empty page.

### Total count

`compileTotalCountQuerySql` должен собирать тот же membership bitmap, что page,
но без pagination/sort.

Обязательная parity:

```text
totalCount = число всех products, которые можно получить всеми страницами
```

Проверить отдельно product-only и same-variant paths для всех трех availability
mode.

### Facet metadata

#### TAG/FEATURE

Candidate values искать в:

```text
scope & published & explicit product availability, если применима
```

Без availability metadata видит values, принадлежащие out-of-stock-only
продуктам.

#### OPTION

Candidate values искать через выбранный option signature bitmap:

```text
ALL          -> product_bitmap
IN_STOCK     -> in_stock_product_bitmap
OUT_OF_STOCK -> out_of_stock_product_bitmap
```

Это обеспечивает:

- out-of-stock-only option value виден без availability;
- он отсутствует при `available:true`;
- он виден при `available:false`.

Metadata не должна выполнять join к Catalog domain tables и не должна строить
per-value variant scans.

### Product facet counts: TAG/FEATURE

1. Удалить безусловный `in_stock_products` из base.
2. Начинать с `scope & published`.
3. Добавлять product availability bitmap при explicit mode только в
   product-only path, где нет OPTION/PRICE predicates.
4. Сохранять isolation текущего facet.
5. Для active OPTION/PRICE filters применять availability к variant candidates
   до projection и не пересекать результат повторно с aggregate product stock.
   Иначе mixed product с matching out-of-stock variant и другим in-stock
   variant ошибочно исчезнет из `available:false`.

### Option facet counts

Переписать все стратегии через общий availability-aware signature bitmap:

- simple path;
- price-only path;
- candidate-only signature path;
- heavy signature path;
- forced heavy parity/profile path.

Требования:

1. Удалить `force_zero` для `available:false`.
2. Для запроса без price выбирать all/in-stock/out-of-stock signature bitmap по
   mode.
3. Для запроса с price выбирать rows из expanded price posting и применять
   stock predicate к той же price/option variant row.
4. `option_count_product_scope` не должен безусловно содержать in-stock
   products.
5. Текущий facet исключается из active option groups, availability сохраняется.
6. Результатом остается cardinality products, а не variants.

### Virtual PRICE facet

Price range вычисляется без активного price range filter, но с сохранением:

- category/search scope;
- TAG/FEATURE/vendor filters;
- OPTION filters;
- explicit availability mode.

Source:

```text
expanded listing_posting_variant_price
```

Stock predicate:

```text
ALL          -> отсутствует
IN_STOCK     -> vp.in_stock = true
OUT_OF_STOCK -> vp.in_stock = false
```

При OPTION filter range строится только по тем же matching variants.

Добавить в result virtual branch отдельный `priceEligibleCount`, чтобы
`ListingFacetValue.count` для price не зависел от уже примененного active price
filter. Не использовать `result.totalCount` как isolated price count.

### Virtual IN_STOCK facet

Availability facet count всегда исключает текущий availability filter и
сохраняет остальные filters.

Для product-only query:

```text
inStockCount = cardinality(product base & product.in_stock=true)
```

Для OPTION/PRICE query:

```text
matching variants = option/price predicates & variant.in_stock=true
inStockCount = cardinality(project(matching variants) & product base)
```

Если request содержит `available:false`, returned `available=true` count все
равно показывает, сколько продуктов соответствовало бы остальным filters в
in-stock bucket. Это facet isolation, а не count текущего result.

## Public API и mapper

### Input

GraphQL schema не меняется:

```graphql
input ListingProductFilter {
  available: Boolean
}
```

Оба значения должны оставаться reusable inputs:

```json
{ "available": true }
{ "available": false }
```

### Output

Сохранить текущий virtual facet:

```text
id = available
type = BOOLEAN
value.id = true
value.input = { available: true }
```

Его count вычисляется через isolated availability branch.

Для price mapper использовать `priceEligibleCount`, а не `totalCount`.

### Cursor/filter hash

Убедиться, что filter hash различает:

```text
availabilityMode=ALL
availabilityMode=IN_STOCK
availabilityMode=OUT_OF_STOCK
```

Cursor, созданный в одном mode, должен отклоняться в другом.

## Аудит альтернативных repository paths

В `services/listing/src/repositories/storefront/` остались repository helpers,
созданные до перехода основного listing request на пять parallel SQL branches.
Например, `StorefrontFacetAggregationRepository` принимает обязательный
`inStockVariantBitmap` и самостоятельно добавляет `vli.in_stock = true`.

Перед завершением работы определить для каждого такого repository один из двух
исходов:

1. Он используется production path — добавить `ListingAvailabilityMode` и
   привести семантику к этому плану.
2. Он больше не используется — удалить repository, constructor dependency и
   wiring вместо сохранения второго расходящегося implementation path.

Обязательный финальный аудит:

```text
rg "in_stock = true|inStock \?\? true|force_zero|inStockVariantBitmap"
   services/listing/src/repositories/storefront
```

Каждое оставшееся совпадение должно относиться только к:

- реализации explicit `IN_STOCK` helper;
- isolated count virtual availability facet;
- availability-first sorting/indexing;
- тесту или диагностике с явно названным stock mode.

Implicit stock predicates в legacy helpers оставлять нельзя.

## Миграция и reindex

Так как listing index является derived data и stage/prod данных нет, применять
breaking migration без dual-read/dual-write.

Порядок:

1. Сгенерировать schema migration штатным `shopana-cli` workflow.
2. Добавить stock-aware columns option signature tables.
3. Добавить `in_stock` в variant price posting и обновить indexes/checks.
4. Обновить Drizzle models и repositories.
5. Обновить write model до version 2.
6. Обновить read path.
7. Очистить и полностью пересобрать derived listing index штатным reindex
   workflow.
8. Не выполнять SQL backfill, который пытается восстановить option signature
   stock buckets из старых aggregated rows: в старом индексе отсутствуют
   out-of-stock memberships.

Changeset-файл вручную не редактировать. Если package policy требует changeset,
запустить его генерацию через разрешенную npm-команду.

## План реализации по этапам

### Этап 1. Зафиксировать contract тестовыми fixtures

До изменения query path расширить listing fixture продуктами:

```text
P1: только in-stock variant
P2: только out-of-stock variant
P3: red out-of-stock + blue in-stock
P4: одна signature одновременно in-stock и out-of-stock
P5: priced in-stock + priced out-of-stock с разными price
P6: out-of-stock-only TAG/FEATURE/OPTION values
```

Зафиксировать ожидаемые результаты для `ALL`, `IN_STOCK`, `OUT_OF_STOCK`.

### Этап 2. Ввести availability mode

1. Добавить `ListingAvailabilityMode` в storefront types.
2. Нормализовать boolean/undefined один раз.
3. Передать mode в `ListingSqlRequest`.
4. Добавить общие SQL predicate/bitmap helpers.
5. Удалить локальные default-to-true expressions.

### Этап 3. Расширить physical index

1. Сгенерировать migration.
2. Обновить `listingIndex.ts`.
3. Расширить option signature membership/aggregate bitmaps.
4. Расширить variant price posting полем `in_stock` и indexes.
5. Обновить repository input/output types.

### Этап 4. Переписать write paths

1. Перевести write model на version 2.
2. Писать signatures всех variants с stock bucket.
3. Писать prices всех variants с stock state.
4. Синхронно обновить single и batch actions.
5. Проверить replace/delete/stock-change transitions.

### Этап 5. Переписать filters, page и total

1. Убрать implicit in-stock variant filter.
2. Сделать option projection availability-aware.
3. Сделать price matching availability-aware.
4. Удалить empty short-circuit для `price + available:false`.
5. Сохранить availability-first ordering.
6. Проверить total/page parity и cursor behavior.

### Этап 6. Переписать metadata и discrete counts

1. Сделать metadata stock-aware только при explicit availability.
2. Убрать in-stock-only base у TAG/FEATURE counts.
3. Перевести все option count strategies на stock-aware signature bitmaps.
4. Сохранить facet isolation.
5. Обновить profiling targets, если меняются CTE names.

### Этап 7. Переписать virtual facets

1. PRICE range/filter работает по all variants в mode `ALL`.
2. PRICE range/filter применяет stock на same variant при true/false.
3. IN_STOCK count изолирует собственный filter.
4. Добавить `priceEligibleCount` в repository result и mapper.

### Этап 8. Reindex и документация

1. Пересобрать listing index штатным workflow.
2. Обновить `knowledge/vault/listing/facets-architecture.ru.md`.
3. Обновить docs, где `listing_posting_variant_price` описан как in-stock-only.
4. Удалить комментарии и tests, утверждающие implicit in-stock semantics.

## Основные файлы

### Контракт и normalization

- `services/listing/src/api/graphql-admin/schema/listing.graphql`
- `services/listing/src/resolvers/admin/listingInput.ts`
- `services/listing/src/resolvers/admin/listingFacetMapper.ts`
- `services/listing/src/repositories/storefront/types.ts`
- `services/listing/src/repositories/storefront/StorefrontListingQueryRepository.ts`
- `services/listing/src/repositories/storefront/StorefrontFacetResolutionRepository.ts`
- `services/listing/src/repositories/storefront/StorefrontFacetAggregationRepository.ts`
- `services/listing/src/repositories/storefront/StorefrontVariantPriceCollectorRepository.ts`

### SQL read path

- `services/listing/src/repositories/storefront/sql/compileListingInputSql.ts`
- `services/listing/src/repositories/storefront/sql/compileFacetResolutionSql.ts`
- `services/listing/src/repositories/storefront/sql/compileScopeSql.ts`
- `services/listing/src/repositories/storefront/sql/compileFiltersSql.ts`
- `services/listing/src/repositories/storefront/sql/compileListingProductMatchesSql.ts`
- `services/listing/src/repositories/storefront/sql/compilePageQuerySql.ts`
- `services/listing/src/repositories/storefront/sql/compileTotalCountQuerySql.ts`
- `services/listing/src/repositories/storefront/sql/compileFacetsQuerySql.ts`
- `services/listing/src/repositories/storefront/sql/compileFacetCountsQuerySql.ts`
- `services/listing/src/repositories/storefront/sql/compileVirtualFacetsQuerySql.ts`
- `services/listing/src/repositories/storefront/sql/resultMappers.ts`

### Index model и write path

- `services/listing/src/repositories/models/listingIndex.ts`
- `services/listing/src/repositories/listing/listingRepositoryTypes.ts`
- `services/listing/src/repositories/listing/ListingOptionSignatureRepository.ts`
- `services/listing/src/repositories/listing/ListingPostingVariantPriceRepository.ts`
- `services/listing/src/scripts/listingIndexActionTypes.ts`
- `services/listing/src/scripts/ListingBuildSyncWriteModelScript.ts`
- `services/listing/src/scripts/ListingWriteIndexActionScript.ts`
- `services/listing/src/workflows/ListingBatchProductIndexWorkflow/stepWriteListingBatchSyncIndexAction.ts`
- `services/listing/migrations/domains/0100_listing_index/`

### Tests и performance

- `e2e/fixtures/listing/seed.ts`
- `e2e/tests/listing-api/listing.spec.ts`
- `e2e/tests/listing-api/listing-auto-indexing.spec.ts`
- `e2e/tests/listing-api/listing-service-no-filters-perf.spec.ts`
- `e2e/tests/listing-api/listing-service-perf.spec.ts`
- `e2e/tests/listing-api/listing-service-matrix-perf.spec.ts`

## Test matrix

### Product facets

Для TAG и FEATURE проверить:

1. Без availability count включает in-stock и out-of-stock продукты.
2. `available:true` включает только in-stock.
3. `available:false` включает только out-of-stock.
4. Selected facet исключается из собственного count base.
5. Другие product/option/price filters остаются активными.
6. Out-of-stock-only value виден без stock filter.

### Option facets

Проверить:

1. Out-of-stock-only option value виден и фильтруется в `ALL`.
2. Он не виден/не считается в `IN_STOCK`.
3. Он виден/считается в `OUT_OF_STOCK`.
4. Mixed product не дает false positive между разными variants.
5. Одинаковая signature в двух stock buckets считается один раз как product.
6. OR внутри option facet и AND между option facets сохраняются.
7. Simple, candidate, heavy и forced-heavy paths дают одинаковые counts.

### Price facet

Проверить:

1. Default range включает цены out-of-stock variants.
2. `available:true` range строится по in-stock variants.
3. `available:false` range строится по out-of-stock variants.
4. Price filter без availability возвращает оба stock bucket.
5. Price + OPTION + availability совпадают на одном variant.
6. Price asc/desc cursor не пропускает и не дублирует продукты.
7. Price facet count изолирован от активного price filter.

### Availability facet

Проверить:

1. Без filters `available` count равен числу in-stock products.
2. При `available:false` virtual true count исключает false filter.
3. При OPTION count строится из matching in-stock variants.
4. При PRICE count строится из matching priced in-stock variants.
5. При OPTION + PRICE используется один variant.

### Page и total

Для category и search scopes проверить:

1. Без availability page/total содержат оба bucket.
2. `true` возвращает только in-stock.
3. `false` возвращает только out-of-stock.
4. Без explicit filter in-stock остается первым только из-за sort order.
5. `totalCount` равен полной пагинации.
6. Cursor hash не переносится между availability modes.

### Index transitions

Проверить transitions без ручного reindex одного продукта:

```text
in-stock -> out-of-stock
out-of-stock -> in-stock
price add/update/delete в обоих buckets
option signature add/update/delete в обоих buckets
product unpublish/delete
variant delete
```

После каждого transition page, counts, metadata, price range и availability
count должны обновляться атомарно.

## Performance verification

Изменение не должно превращать facet counts в per-value scans.

Проверить три профиля на 10k fixture:

```text
availabilityMode = ALL
availabilityMode = IN_STOCK
availabilityMode = OUT_OF_STOCK
```

Для каждого профиля:

- no filters;
- product facets;
- one option facet;
- multiple option facets;
- price-only;
- option + price;
- heavy option strategy.

Проверять:

- пять основных listing SQL branches сохраняются;
- нет N+1 по visible facet values;
- нет full `variant_listing_price_index` scan без store/currency bounds;
- signature bitmap lookup использует нужный stock column;
- price lookup использует index с optional stock predicate;
- candidate и heavy strategies сохраняют count parity;
- нет temp spill на representative dataset.

Для диагностики использовать существующие `listing:facetCounts` profiling и
`EXPLAIN ANALYZE` reports. Performance threshold зафиксировать по текущим perf
specs до начала реализации и сравнить все три availability mode с baseline.

## Проверка реализации

Следовать проектным правилам:

- development/build/migrate/codegen/e2e запускать через `shopana-cli`;
- не запускать `test` и `tsc` напрямую;
- для compile verification запускать build только когда нужна собранная версия;
- не редактировать changeset вручную.

Рекомендуемый порядок проверки:

1. Schema/migration validation через `shopana-cli`.
2. Listing service build через `shopana-cli`.
3. Targeted listing e2e через `shopana-cli`.
4. Auto-indexing transition e2e.
5. Candidate/heavy parity scenarios.
6. 10k performance matrix для трех availability modes.
7. Полный listing reindex и повторный smoke query.

## Риски и меры

### Рост option signature index

Добавление двух bitmaps увеличит размер signature rows.

Меры:

- хранить stock bitmaps на уровне signature, а не дублировать signature values;
- измерить размер индекса на 10k fixture;
- не добавлять отдельные signature rows с stock в составе `signature_key`, чтобы
  не удвоить `listing_option_signature_value`.

### Рост variant price posting

Posting table начнет содержать out-of-stock priced variants.

Меры:

- сохранить compact typed row;
- добавить stock column, а не вторую таблицу;
- проверить partial/general indexes через реальные планы;
- reindex derived table вместо сложного backfill.

### Same-variant regression

Самый опасный correctness risk — пересечь product-level availability с option
или price, относящимися к другому варианту.

Меры:

- mixed-variant fixture является обязательной;
- availability накладывается до projection;
- OPTION + PRICE + stock всегда используют один variant candidate relation.

### Расхождение single и batch indexing

Stock bucket может обновиться только в одном write path.

Меры:

- общий builder для signature/price rows;
- parity test single vs batch;
- одинаковая write model version.

### Неполный reindex

Старые signatures не содержат out-of-stock memberships, поэтому частичное
обновление оставит ложные counts.

Меры:

- обязательный full listing reindex;
- не включать новый read path до завершения rebuild в средах с сохраненными
  derived данными;
- после reindex проверить cardinality all/true/false buckets.

## Acceptance criteria

Работа завершена, когда выполнены все условия:

1. Отсутствующий `available` нигде не превращается в `true`.
2. TAG/FEATURE/OPTION/PRICE по умолчанию учитывают in-stock и out-of-stock.
3. `available:true` ограничивает все facet types in-stock bucket.
4. `available:false` ограничивает все facet types out-of-stock bucket.
5. OPTION + PRICE + availability имеют same-variant semantics.
6. Page, totalCount, metadata, counts и virtual facets используют один contract.
7. Availability-first sorting сохраняется без скрытой фильтрации.
8. Option signature index содержит all/in-stock/out-of-stock product bitmaps.
9. Variant price posting содержит priced variants обоих stock buckets.
10. Single и batch write paths дают одинаковый index.
11. Старый e2e `excludes them from facets` заменен тестом новой семантики.
12. Availability false покрыт e2e как полноценный filter, а не empty result.
13. Candidate/heavy option counts сохраняют parity.
14. Full reindex выполнен штатным workflow.
15. Knowledge base и index contract docs обновлены.
16. Performance matrix не показывает неприемлемой регрессии или unbounded
    per-value scans.
