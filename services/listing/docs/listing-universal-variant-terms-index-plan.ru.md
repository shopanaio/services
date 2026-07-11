# План универсального variant-term индекса Listing

Дата: 2026-07-11

Статус: implementation plan, proposed replacement for availability-specific
physical index expansion

## Связь с планом explicit availability

Этот документ сохраняет публичную и query-семантику из
`listing-facets-explicit-availability-plan.ru.md`:

- `available` относится к matching active variant;
- отсутствие `available` не добавляет availability predicate;
- OPTION, PRICE и availability должны совпадать на одной variant row;
- variant predicates применяются до projection в products;
- mixed product может входить и в `AVAILABLE`, и в `UNAVAILABLE`;
- product aggregate `in_stock` не участвует в membership и facet counts;
- page, total, counts, virtual facets и sort используют один canonical
  `productMatches` contract и один request snapshot.

Этот документ заменяет availability-specific physical index решение:

```text
listing_option_signature.available_product_bitmap
listing_option_signature.unavailable_product_bitmap
available_variant_count / unavailable_variant_count
listing_posting_variant_price.in_stock
```

Такие поля не добавляются как correctness source. Availability и будущие
дискретные variant predicates индексируются одинаково как универсальные terms,
bitmap которых содержит `variant_doc_id`.

Если оба плана реализуются вместе, нормативным источником availability semantics
остается explicit availability plan, а нормативным источником physical
variant predicate index становится этот документ.

## Контекст

Availability — не единственный возможный variant-level predicate. В дальнейшем
могут появиться:

```text
readyForDelivery
backorderAllowed
pickupAvailable
fulfillmentMethod
warehouse
deliveryRegion
preorderState
channelEligibility
```

Если каждый новый boolean или enum добавлять отдельными columns и bitmaps:

```text
available_product_bitmap
unavailable_product_bitmap
delivery_ready_product_bitmap
delivery_not_ready_product_bitmap
pickup_product_bitmap
...
```

то каждое расширение потребует:

- изменения DB schema;
- новых counters и bitmap invariants;
- изменения single и batch writers;
- отдельных SQL helpers;
- новых branches в option counts, price range и sort;
- отдельной логики удаления и state transitions;
- отдельного parity/performance audit.

Кроме того, product-level bitmap слишком рано теряет variant identity. После
projection нельзя гарантировать, что OPTION, PRICE, availability и delivery
criteria выполнились на одном варианте.

В существующей Listing schema уже есть необходимые primitives:

- stable `variant_doc_id` в `variant_listing_index`;
- `listing_posting_bitmap` с поддержкой `entity_type = 'variant'`;
- roaring bitmap algebra;
- typed `listing_posting_variant_price` для numeric price range/order;
- variant-to-product projection blocks;
- `variant_product` postings для narrow lookup.

Поэтому новый индекс должен развивать существующий variant posting layer, а не
создавать отдельную availability-подсистему.

## Архитектурное решение

### Дискретный variant predicate является term

Любое materialized дискретное свойство indexable variant представляется
канонической парой:

```text
fieldKey + valueKey
```

Примеры:

```text
availability       = available
availability       = unavailable
delivery.ready     = true
delivery.ready     = false
backorder.allowed  = true
fulfillment.method = pickup
warehouse          = <warehouseId>
option:<facetId>   = <facetValueId>
```

Physical posting содержит `variant_doc_id`, а не `product_doc_id`:

```text
availability=available -> [variant 1, variant 4, variant 8]
delivery.ready=true    -> [variant 1, variant 2, variant 8]
option:color=red       -> [variant 1, variant 5, variant 9]
```

Query сначала пересекает predicates в variant space и только после этого
проецирует matching variants в distinct products.

### Канонический query contract

```text
productBase =
  published scope
  & product-level terms/filters

variantTermCandidates =
  indexable variant universe
  & AND(
      OR(selected terms внутри каждой variant filter group)
    )

variantCandidates =
  variantTermCandidates
  & numeric/range candidates, если они есть

needsVariantWitness =
  variant term group exists
  OR numeric/range variant filter exists

productMatches =
  needsVariantWitness
    ? productBase & projectDistinctProducts(variantCandidates)
    : productBase
```

Availability больше не является специальной веткой compiler:

```text
ALL         -> availability group отсутствует
AVAILABLE   -> term(availability, available)
UNAVAILABLE -> term(availability, unavailable)
```

`readyForDelivery=true` добавляется тем же способом:

```text
term(delivery.ready, true)
```

### Same-variant invariant

Для mixed product:

```text
variant A: red, unavailable, delivery.ready=true,  price=100
variant B: blue, available, delivery.ready=false, price=200
```

запрос:

```text
color=red AND available AND delivery.ready=true AND price=100
```

должен совпасть только если один `variant_doc_id` присутствует во всех четырех
candidate sets.

Запрещено:

```text
project(color=red)
& project(availability=available)
& project(delivery.ready=true)
```

Такая ранняя projection может склеить predicates разных variants одного
product.

## Термины и identity

### `ListingVariantTerm`

В write/read model вводится общий value object:

```ts
interface ListingVariantTerm {
  fieldKey: string;
  valueKey: string;
}
```

Оба значения:

- non-empty;
- canonical и case-sensitive;
- не зависят от localized label;
- не содержат mutable storefront handle, если существует stable internal ID;
- нормализуются одним shared builder;
- сортируются детерминированно перед hashing и записью.

### Namespace rules

Зарезервированные namespaces:

```text
system.*       -> внутреннее состояние индекса
criterion.*    -> domain predicates общего назначения
option:<id>    -> configured OPTION facet
```

Начальный registry:

| fieldKey | valueKey | Источник |
|---|---|---|
| `system.state` | `indexable` | active variant classifier |
| `criterion.availability` | `available` | `availableForSale = true` |
| `criterion.availability` | `unavailable` | `availableForSale = false` |
| `option:<facetId>` | `<facetValueId>` | resolved OPTION selection |

Будущий delivery criterion:

| fieldKey | valueKey | Источник |
|---|---|---|
| `criterion.delivery.ready` | `true` / `false` / `unknown` | delivery eligibility snapshot |
| `criterion.fulfillment.method` | stable method key | delivery snapshot |
| `criterion.warehouse` | warehouse ID | stock/delivery snapshot |

Точные строки создаются constants/builders. Business code не конкатенирует
ключи вручную.

### Physical key encoding

Существующая таблица `listing_posting_bitmap` используется так:

```text
entity_type = variant
field       = term
value_key   = canonicalEncode([version, fieldKey, valueKey])
bitmap      = variant_doc_id bitmap
```

Начальная encoding version:

```text
JSON.stringify(["v1", fieldKey, valueKey])
```

Примеры:

```text
["v1","criterion.availability","available"]
["v1","criterion.delivery.ready","true"]
["v1","option:7f0...","9a1..."]
```

JSON array используется только как deterministic opaque key. Runtime SQL не
парсит его и всегда делает exact lookup по подготовленному `value_key`.
Encoding/decoding находится в shared helper и покрывается contract tests.

`metadata` может дублировать decoded descriptor для diagnostics, но не является
query source.

### Explicit negative states

Для boolean-like criteria сохраняются явные states:

```text
true
false
unknown, если domain допускает unknown/not-applicable
```

`false` не вычисляется как complement positive bitmap. Complement опасен, если:

- variant не indexable;
- значение неизвестно;
- criterion не применим;
- write transition обновил universe и term в разное время;
- в будущем boolean станет multi-state.

Для availability domain остается двухзначным:

```text
availableForSale=true  -> только available term
availableForSale=false -> только unavailable term
```

Один indexable variant обязан находиться ровно в одном availability term.

## Граница применимости universal terms

Universal term подходит для дискретного, materializable и query-independent
состояния:

```text
boolean
enum
stable ID membership
configured option value
```

Term не используется для high-cardinality numeric/range данных:

```text
price
quantity
weight
delivery timestamp
distance
delivery days
```

Такие значения остаются в typed tables с B-tree/appropriate PostgreSQL index и
на query превращаются в candidate `variant_doc_id` bitmap.

Также нельзя без измерений материализовать комбинаторный context:

```text
ready for every user address
delivery ETA for every postcode and carrier
price for arbitrary customer segment combinations
```

Для bounded context допустим context-aware term:

```text
criterion.delivery.region = UA-30
criterion.pickup.point = <pointId>
```

Но definition обязана иметь cardinality budget. При превышении budget criterion
выносится в typed/context index, а не создает миллионы posting rows.

## Целевая physical index model

### `listing.listing_posting_bitmap`

Новая таблица не создается. Существующая таблица становится canonical inverted
index и для universal variant terms:

```sql
listing.listing_posting_bitmap (
  store_id,
  entity_type,
  field,
  value_key,
  bitmap,
  cardinality,
  metadata,
  updated_at
)
```

Новый supported key kind:

```text
entity_type=variant, field=term
```

Инварианты:

```text
cardinality = rb_cardinality(bitmap)
bitmap содержит только variant_doc_id данного store
bitmap содержит только indexable variants
empty retained term bitmap = non-null empty roaring bitmap
```

Empty rows можно удалить только если term больше не входит в active registry и
не нужен для configured/selected metadata. Для активного boolean criterion оба
states сохраняются как non-null empty bitmaps, чтобы read path не различал
"пусто" и "индекс поврежден/не построен".

### Indexable variant universe

Reserved term:

```text
system.state=indexable
```

содержит все active variants, которые участвуют в runtime index.

Он используется для:

- diagnostics;
- явной проверки term subset invariant;
- filters, которым нужен variant witness без другого selective term;
- safe future NOT/difference operations;
- profiling selectivity.

Каждый variant term bitmap обязан быть subset universe bitmap.

### Variant-to-product projection

Связь уже хранится в:

```text
variant_listing_index.variant_doc_id -> product_doc_id
```

Broad projection использует существующие projection blocks. Partial block
разворачивает только matching variant docs через `variant_listing_index` и
deduplicate `product_doc_id`.

Canonical helper:

```text
projectVariantBitmapToProducts(variantBitmap)
```

обязан быть единственным correctness path для перехода variant → product.
`variant_product` posting остается narrow lookup optimization.

### `listing.listing_posting_variant_price`

Price posting продолжает быть typed numeric index:

```text
одна row на priced indexable variant + currency
```

Unavailable или delivery-not-ready variant не удаляется из price posting только
из-за criterion state.

В price row не добавляются:

```text
in_stock
delivery_ready
backorder_allowed
другие term columns
```

Availability и другие predicates применяются через matching variant bitmap:

```text
matchingTermsBitmap
& priceRangeVariantBitmap
```

Для matched price sort collector проверяет принадлежность price row тому же
matching variant bitmap до выбора minimum price per product.

Индексы price posting остаются criterion-neutral:

```text
(store_id, currency, price_minor ASC,  product_id, variant_doc_id)
(store_id, currency, price_minor DESC, product_id, variant_doc_id)
(store_id, currency, product_id, price_minor, variant_doc_id)
```

Финальный набор подтверждается `EXPLAIN ANALYZE`.

### Option signatures

`listing_option_signature*` больше не является source of truth для
availability или других criteria.

Базовый correctness path для OPTION:

```text
universal option term bitmaps
& other variant terms
& price candidates
-> variant-to-product projection
```

Существующий signature index можно временно оставить как measured cache для
горячих OPTION count strategies при соблюдении условий:

1. signature result имеет parity с canonical term path;
2. signature optimization получает уже ограниченный matching variant set либо
   доказывает same-variant equivalence;
3. criterion-specific columns/bitmaps в signature не добавляются;
4. новый criterion не требует изменения signature schema;
5. forced canonical path доступен для tests и diagnostics.

Если эти условия не выполняются или measured benefit недостаточен,
`listing_option_signature`, `listing_option_signature_value` и
`listing_option_signature_product_membership` удаляются вместе с wiring.

### Product aggregates

Существующие:

```text
product_listing_index.in_stock
listing_posting_product_sort.bool_value
```

сохраняются для availability-first ordering, cursor и diagnostics.

Они не участвуют в:

- membership;
- availability/delivery filtering;
- variant facet counts;
- product facet counts при variant witness;
- price eligibility;
- virtual criterion counts.

Новый criterion не получает product aggregate автоматически. Product-level
aggregate добавляется только как отдельный sort/diagnostic contract после
измеренной необходимости.

## Изменения DB schema

### Обязательные

1. Разрешить новый posting kind:

   ```text
   entity_type=variant, field=term
   ```

   Physical columns `listing_posting_bitmap` не меняются. Обновляются Drizzle
   literal types, repository validation и schema documentation.

2. Изменить contract `listing_posting_variant_price`: хранить все priced
   indexable variants, а не только in-stock variants.

3. Проверить criterion-neutral price indexes для scans по store/currency/price
   и per-product matched minimum lookup.

4. Не добавлять availability/delivery columns в option signature или price
   posting.

### Не требуются

Для нового boolean/enum term не нужны:

- новая DB column;
- новая table;
- новый DB enum;
- отдельный bitmap column;
- per-product membership counter;
- backfill отдельного physical index kind.

Добавление criterion создает новые rows с тем же schema:

```text
(store, variant, term, encoded(fieldKey, valueKey), bitmap)
```

Stage/prod data отсутствуют. Текущая schema обновляется для clean DB; migration
исторических index rows и dual-read period не нужны.

## Term registry

### Назначение

Schema-less physical storage не означает неконтролируемые строки. В коде
вводится registry definitions:

```ts
interface ListingVariantTermDefinition {
  fieldKey: string;
  valueKind: "BOOLEAN" | "ENUM" | "ID";
  allowedValues?: readonly string[];
  unknownPolicy: "FORBID" | "EXPLICIT" | "OMIT";
  cardinalityBudget: number;
  publicFilterKind?: string;
}
```

Registry отвечает за:

- canonical field/value validation;
- materialization из normalized variant snapshot;
- input normalization в term groups;
- selected state и reusable input для virtual facets;
- observability labels;
- cardinality budget;
- diagnostics invariants.

### Что остается criterion-specific

Добавление публичного `readyForDelivery` все равно может потребовать:

- GraphQL input/output contract;
- upstream snapshot data;
- registry definition/materializer;
- authorization/domain validation;
- UX metadata.

Но оно не требует изменения physical DB schema, bitmap algebra, projection,
price table или общего facet count engine.

### Broker/write contract

Normalized write payload получает:

```ts
interface NormalizedListingVariant {
  variantId: string;
  variantDocId: number;
  productDocId: number;
  terms: readonly ListingVariantTerm[];
  prices: readonly NormalizedVariantPrice[];
}
```

Canonical builder materializes:

```text
system.state=indexable
criterion.availability=<available|unavailable>
resolved OPTION terms
registered future criterion terms
```

Raw broker payload не может передать arbitrary unvalidated physical term key.
Adapter/registry переводит domain fields в canonical terms.

## Write path

### Normalized builder

Single и batch paths используют один builder:

1. Отфильтровать non-indexable variants.
2. Выделить/сохранить stable `variant_doc_id`.
3. Вычислить canonical availability из `availableForSale`.
4. Resolve OPTION selections в stable facet/value IDs.
5. Выполнить registered criterion materializers.
6. Удалить duplicate terms одного variant.
7. Отсортировать terms по `fieldKey`, затем `valueKey`.
8. Построить price rows из всех priced indexable variants.
9. Вычислить product aggregates только для sort/diagnostics.

### Incremental posting replacement

Для product sync вычисляются:

```text
previous variant term memberships
next variant term memberships
removed = previous - next
added   = next - previous
```

Repository группирует delta по encoded term key:

```text
bitmap = (bitmap - removedVariantDocIds) | addedVariantDocIds
cardinality = rb_cardinality(bitmap)
```

Все изменения одного product выполняются в той же item transaction, что и:

- product/variant index rows;
- price rows;
- projection blocks;
- product sort rows;
- item state/idempotency update.

Не нужны product counters для term: если два variants одного product имеют один
term, bitmap хранит оба `variant_doc_id`. Удаление одного variant не удаляет
второй; distinct product semantics появляется только при projection.

### Required transitions

Один sync атомарно покрывает:

```text
available <-> unavailable
delivery ready <-> not ready/unknown
criterion value add/remove/change
OPTION term add/remove/change
active <-> inactive/archived
variant delete/recreate
price add/update/delete независимо от term state
product publish/unpublish/delete
```

### Concurrency

Posting updates используют deterministic term-key order и существующую lock
strategy, чтобы parallel products с общими terms не создавали lock inversion.

Профиль должен измерять:

- advisory/row lock wait;
- bitmap update duration;
- WAL;
- deadlocks/retries;
- hot low-cardinality terms (`availability`, `delivery.ready`);
- high-cardinality option/warehouse terms.

## Read path

### Нормализованный filter plan

Все variant discrete filters компилируются в одну структуру:

```ts
interface ListingVariantTermGroup {
  groupKey: string;
  terms: readonly ListingVariantTerm[];
  source: "OPTION" | "AVAILABILITY" | "CRITERION";
}
```

Правила:

```text
OR внутри group
AND между groups
```

Пример:

```text
color=(red OR blue)
AND size=(m OR l)
AND availability=available
AND fulfillment=(delivery OR pickup)
```

Availability aliases и direct input сначала нормализуются в один canonical
term group. Downstream не знает источник alias.

### Общие SQL helpers

Добавить criterion-neutral helpers:

```text
compileVariantTermPostingKey(term)
compileVariantTermGroupBitmap(group)
compileVariantTermGroupsBitmap(groups)
compileVariantNumericCandidatesBitmap(filters)
compileVariantCandidatesBitmap(plan)
compileProjectedVariantProductsBitmap(candidateBitmap)
```

Availability-specific helpers в membership path не нужны:

```text
compileVariantAvailabilityPredicate
compileOptionSignatureBitmapColumn(mode)
compilePriceAvailabilityPredicate
```

Availability mode нужен на normalization/API уровне и в filter hash, но
physical compiler получает обычный term group.

### PRICE

Price range строит bitmap `variant_doc_id` из expanded price posting:

```text
priceCandidates = variants with price in requested range/currency
variantCandidates = termCandidates & priceCandidates
```

Virtual PRICE facet исключает active price range, но сохраняет все term groups.

Price sort:

1. Стартует от `productMatches`, поэтому product без eligible price не теряется.
2. Для product выбирает minimum price среди variants, входящих в matching
   candidate bitmap.
3. Использует `NULLS LAST`.
4. Не читает criterion-specific columns из price row.
5. Cursor повторяет полный availability-first nullable tuple.

### Facet isolation

Target group исключается по `groupKey`, а не через hardcoded facet type branch:

```text
baseVariantTerms(targetGroup) =
  AND(all groups except targetGroup)
```

Для каждого target value:

```text
candidateVariants = baseVariantTerms & targetValueTerm & numericCandidates
count = cardinality(projectDistinctProducts(candidateVariants) & productBase)
```

Это одинаково работает для:

- OPTION;
- availability;
- ready for delivery;
- fulfillment method;
- будущего configured discrete criterion.

Product-level TAG/FEATURE сохраняют собственную product bitmap ветку, но при
наличии variant witness пересекаются с projection того же canonical
`variantCandidates`.

### Metadata

Physical term index не становится configuration store.

Metadata sources:

- configured `facet`/`facet_value` для OPTION;
- registry definition для virtual boolean/enum criteria;
- selected resolved terms, чтобы не потерять active zero-count value.

Suppression:

```text
configured discrete value -> count > 0 OR selected
registered boolean facet   -> все declared states, включая zero
```

Raw term rows не публикуются автоматически в GraphQL. Это предотвращает утечку
internal terms и uncontrolled UI facets.

### Request snapshot

Facet resolution, term posting reads, price candidates, projection, page,
total, counts и virtual facets выполняются в одном `REPEATABLE READ READ ONLY`
snapshot согласно explicit availability plan.

## Добавление нового criterion

Для `readyForDelivery` последовательность должна быть такой:

1. Зафиксировать domain semantics и unknown policy.
2. Добавить upstream normalized value в broker snapshot.
3. Зарегистрировать:

   ```text
   fieldKey=criterion.delivery.ready
   values=true,false[,unknown]
   ```

4. Materializer эмитит один canonical term на indexable variant.
5. Input resolver переводит public input в `ListingVariantTermGroup`.
6. Если нужен facet output, registry/mapper задает label, reusable input и
   declared values.
7. Добавить contract fixtures и performance profile.

Не выполняются:

- migration новой DB column;
- добавление bitmap columns;
- изменение price posting schema;
- изменение option signature schema;
- новый projection algorithm;
- новый facet count engine.

## План реализации

### Этап 0. Зафиксировать canonical fixtures

Минимальный dataset:

```text
P1: available + delivery ready
P2: available + delivery not ready
P3: unavailable + delivery ready
P4: unavailable + delivery not ready
P5: red unavailable/ready + blue available/not-ready
P6: два variants с одинаковым term одного product
P7: available variant без price + unavailable priced variant
P8: inactive/archived variant с terms и price
P9: published product без active variants
P10: criterion unknown/not-applicable
P11: selected criterion value с count=0
```

Зафиксировать same-variant, overlap, monotonicity и page/total parity.

### Этап 1. Ввести term value object и registry

1. Добавить `ListingVariantTerm` и canonical encoder.
2. Добавить registry/validation/cardinality policies.
3. Нормализовать availability в два terms.
4. Нормализовать OPTION values в terms.
5. Добавить `system.state=indexable`.
6. Включить normalized term groups в filter hash.

### Этап 2. Расширить posting repository

1. Добавить `field=term` в repository types/validation.
2. Добавить bulk exact lookup term postings.
3. Добавить deterministic multi-term bitmap delta update.
4. Проверять cardinality и universe subset invariants.
5. Сохранять active declared empty states.

### Этап 3. Переписать write paths

1. Общий normalized term builder для single/batch.
2. Terms только для indexable variants.
3. Price posting для всех priced indexable variants.
4. Atomic replace/delete/status/criterion transitions.
5. Single/batch row-level parity.

### Этап 4. Канонический read compiler

1. Компилировать все discrete variant groups одним term helper.
2. Пересекать OPTION/availability/future criteria в variant space.
3. Пересекать numeric price candidates до projection.
4. Удалить product aggregate stock membership.
5. Использовать один projection helper для page/total/counts.

### Этап 5. Facet counts и virtual facets

1. Generalize target group isolation.
2. OPTION counts перевести на canonical term path.
3. Availability true/false counts строить тем же engine.
4. Добавить reference `delivery.ready` facet fixture.
5. Сохранять selected zero-count metadata.

### Этап 6. Sort и cursor

1. Matched price sort ограничить matching variant bitmap.
2. Сохранить product без eligible price как NULL-last.
3. Availability-first product sort не использовать как predicate.
4. Проверить ASC/DESC и cursor boundaries.

### Этап 7. Audit option signatures

1. Сравнить canonical term counts и все signature strategies.
2. Оставить только стратегии с доказанной parity и benefit.
3. Запретить criterion-specific schema в signatures.
4. Удалить signature index целиком, если он не окупает complexity.

### Этап 8. Snapshot, observability и docs

1. Один repeatable-read request snapshot.
2. Логировать term group count и candidate cardinalities.
3. Добавить invariant audit.
4. Обновить knowledge base и DB index contract после implementation audit.

## Основные файлы

### Schema/index

- `services/listing/src/repositories/models/listingIndex.ts`
- `services/listing/migrations/domains/0100_listing_index/0100_listing_index__tables.sql`
- `services/listing/src/repositories/listing/listingRepositoryTypes.ts`
- `services/listing/src/repositories/listing/ListingPostingBitmapRepository.ts`
- `services/listing/src/repositories/listing/ListingPostingVariantPriceRepository.ts`
- `services/listing/src/repositories/listing/ListingOptionSignatureRepository.ts`

### Write path

- `services/listing/src/scripts/listingIndexActionTypes.ts`
- `services/listing/src/scripts/ListingBuildSyncWriteModelScript.ts`
- `services/listing/src/scripts/ListingWriteIndexActionScript.ts`
- `services/listing/src/workflows/ListingBatchProductIndexWorkflow/stepWriteListingBatchSyncIndexAction.ts`

### Read path

- `services/listing/src/repositories/storefront/types.ts`
- `services/listing/src/repositories/storefront/StorefrontPostingBitmapQueryRepository.ts`
- `services/listing/src/repositories/storefront/StorefrontFacetAggregationRepository.ts`
- `services/listing/src/repositories/storefront/sql/compileListingProductMatchesSql.ts`
- `services/listing/src/repositories/storefront/sql/compileFiltersSql.ts`
- `services/listing/src/repositories/storefront/sql/compileFacetCountsQuerySql.ts`
- `services/listing/src/repositories/storefront/sql/compileVirtualFacetsQuerySql.ts`
- `services/listing/src/repositories/storefront/sql/compilePageQuerySql.ts`
- `services/listing/src/repositories/storefront/sql/compileTotalCountQuerySql.ts`

### Docs/tests

- `knowledge/vault/listing/facets-architecture.ru.md`
- `services/listing/docs/draft/listing-index-db-schema.ru.md`
- `services/listing/docs/draft/listing-posting-list-search-engine-index.ru.md`
- `e2e/fixtures/listing/seed.ts`
- `e2e/utils/listingSeed.ts`
- `e2e/tests/listing-api/listing.spec.ts`
- `e2e/tests/listing-api/listing-auto-indexing.spec.ts`
- `e2e/scripts/listing-price-facet-perf.mjs`

## Test matrix

### Term algebra

1. OR внутри group и AND между groups.
2. Empty group не создается.
3. Missing term row для declared state считается invariant violation, не
   silently empty.
4. Duplicate term variant не меняет cardinality.
5. Все term bitmaps являются subset indexable universe.
6. Unknown policy соблюдается для каждого definition.

### Same variant

1. OPTION + availability совпадают на одном variant.
2. OPTION + delivery readiness совпадают на одном variant.
3. Availability + delivery readiness совпадают на одном variant.
4. OPTION + PRICE + availability + delivery совпадают на одном variant.
5. Product predicates не компенсируют отсутствие matching variant.

### Projection

1. Два matching variants одного product дают один product.
2. Full и partial projection blocks дают одинаковый bitmap.
3. Narrow `variant_product` и broad projection имеют parity.
4. Product без active variants входит в ALL без variant filters и исключается
   при любом variant witness.

### Facets

1. Target group исключается, остальные terms сохраняются.
2. OPTION/availability/delivery counts считают distinct products.
3. Mixed product может входить в несколько isolated boolean buckets.
4. Selected incompatible value возвращается с count=0.
5. Unselected zero configured value скрывается.
6. Declared boolean states возвращаются даже при zero count.

### Price/sort

1. Price posting содержит prices всех indexable criterion states.
2. Price range пересекается с term candidates до projection.
3. Price sort берет minimum matching variant price.
4. Product без eligible price остается NULL-last.
5. Page/total parity сохраняется для всех sorts.

### Write transitions

1. Term add/remove/change.
2. Availability flip.
3. Delivery state flip.
4. Same term остается на другом variant product.
5. Active/inactive/archived transition.
6. Variant/product delete.
7. Price transition не меняет unrelated term membership.
8. Single/batch state parity.

### Concurrency/snapshot

1. Parallel updates общего hot term не теряют doc IDs.
2. Deterministic lock order не создает deadlock в target profile.
3. Request не смешивает term/price/projection snapshots разных commits.

## Performance verification

На 10k dataset измерить:

```text
availability only
delivery readiness only
availability + delivery
one/multiple OPTION groups
OPTION + availability + delivery
PRICE + terms
heavy facet counts
high-overlap hot boolean terms
high-cardinality option/warehouse terms
price ASC/DESC с NULL prices
```

Сравнить:

- canonical term path;
- текущий option signature path;
- forced projection-block path;
- narrow variant expansion path.

Проверять:

- posting lookup count;
- bitmap cardinalities до/после каждого group;
- projection full/partial block ratio;
- absence of unbounded variant expansion;
- temp spill;
- query p50/p95;
- index size;
- write p50/p95 и WAL;
- lock wait/deadlocks для hot terms.

Начальные budgets остаются совместимыми с explicit availability plan. Любое
ухудшение или сохранение signature fast path требует сохраненного `EXPLAIN
ANALYZE` и профиля.

## Observability и audit

Request logs:

```text
variantTermGroupCount
variantTermCount
termCandidateCardinality
numericCandidateCardinality
variantCandidateCardinality
projectedProductCardinality
projectionStrategy
collectorKind
snapshotStrategy
```

Index audit:

```text
posting.cardinality = rb_cardinality(posting.bitmap)
term bitmap subset system.state=indexable
availability available & unavailable = empty
availability available | unavailable = indexable variants
price posting variant subset indexable variants
variant mapping points to existing product doc
projection block counters/bitmaps are valid
product.in_stock = bool_or(indexable variant availability)
sort.bool_value = product.in_stock
```

Для multi-state criteria registry задает аналогичный exactly-one или
zero-or-one invariant.

## Риски и меры

### Hot low-cardinality posting contention

Availability и delivery booleans обновляют большие общие bitmap rows.

Меры:

- deterministic lock order;
- batch delta aggregation;
- измерение WAL/lock wait;
- при необходимости shard posting по stable doc-id block, сохранив тот же
  logical term contract.

### Projection cost

Variant-level correctness переносит projection на read path.

Меры:

- projection blocks;
- narrow mapping для small candidates;
- measured product bitmap cache только как fast path;
- canonical parity path всегда доступен.

### Term cardinality explosion

Меры:

- registry и per-definition budget;
- запрет arbitrary raw keys;
- typed tables для numeric/contextual data;
- metrics rows/cardinality/bytes per fieldKey.

### Registry и physical index divergence

Меры:

- registry version в build metadata/diagnostics;
- declared empty state rows;
- clean rebuild command;
- invariant audit до включения criterion в public API.

### Signature optimization нарушает same-variant

Меры:

- signature не является correctness source;
- criterion-specific signature buckets запрещены;
- forced canonical parity tests;
- удаление optimization при невозможности доказать equivalence.

## Проверка реализации

Следовать project rules:

- development/build/codegen/e2e запускать через Shopana CLI/MCP;
- не запускать `test` или `tsc` напрямую;
- Playwright запускать по одному spec-файлу;
- changeset вручную не редактировать.

Порядок:

1. Build Listing.
2. Clean DB schema smoke.
3. Term encoder/registry contract verification.
4. Targeted same-variant read semantics spec.
5. Auto-indexing term transition spec.
6. Single/batch row parity.
7. Canonical/signature/projection parity.
8. Snapshot consistency spec.
9. 10k read/write performance matrix.

## Acceptance criteria

Работа завершена, когда:

1. Все discrete variant predicates имеют общий `ListingVariantTerm` contract.
2. Physical term postings содержат `variant_doc_id`, а не early-projected
   product IDs.
3. Добавление нового boolean/enum criterion не требует DB schema change.
4. Availability хранится как обычные explicit available/unavailable terms.
5. OPTION values компилируются в тот же variant term engine.
6. OR внутри group и AND между groups реализованы одним compiler.
7. OPTION, availability, delivery criteria и PRICE совпадают на одном variant.
8. Variant-to-product projection выполняется только после всех variant
   predicates.
9. Product aggregate stock не участвует в membership/counts.
10. Price posting содержит все priced indexable variants и не получает
    criterion-specific columns.
11. Price range/sort ограничиваются matching variant bitmap.
12. Product без eligible price сохраняется в page как NULL-last.
13. Page и total используют один `productMatches` bitmap.
14. Facet isolation исключает только target group и сохраняет остальные terms.
15. Counts считают distinct products после projection.
16. Selected zero-count values не теряются.
17. Declared boolean states могут возвращаться с zero count.
18. Single и batch writers создают одинаковые term/price/projection rows.
19. Term/status/price/delete transitions атомарны на item transaction.
20. Posting cardinality и term universe invariants проходят audit.
21. Option signatures не содержат availability/delivery-specific schema.
22. Любой оставшийся signature fast path имеет parity с canonical term path.
23. Все logical read branches видят один repeatable snapshot.
24. Cardinality budgets защищают от uncontrolled term explosion.
25. 10k read/write profile укладывается в budgets без N+1, unbounded expansion,
    temp spill и deadlocks.
26. Knowledge base и index schema docs обновлены после implementation audit.
