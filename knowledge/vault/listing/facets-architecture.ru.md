---
tags:
  - listing
  - facets
  - architecture
  - storefront
related:
  - architecture/overview
  - patterns/repository
  - packages/dbos/workflow-queue-wrapper-plan.ru
---

# Архитектура Listing Facets

Документ описывает, как в Shopana устроены facets для каталожного listing:
как админская настройка фильтров превращается в индекс, как runtime-запрос
разрешает выбранные значения и как считаются counts для storefront/admin preview.

Listing facets - это не фильтры таблиц Admin UI. Это доменная модель фильтров
каталожной выдачи: цена, наличие, теги, характеристики и опции вариантов.

## Основная идея

Система разделена на три слоя:

| Слой | Ответственность |
|------|-----------------|
| Facet configuration | Хранит публичные фильтры, их порядок, UI type, переводы, visible values, swatches и связь с catalog source values. |
| Listing index | Хранит денормализованные posting lists и price/sort/search индексы, оптимизированные под выдачу. |
| Storefront query | На каждый listing request собирает страницу, total count, facet metadata, facet counts и virtual facets. |

Внешний API работает со стабильными `slug` и `handle`, а внутренний индекс - с
`valueKey = facetId:valueId`. Поэтому можно менять label, перевод, swatch и даже
группировать source values в display value без смены внутренней структуры
posting bitmap.

## Публичный GraphQL контракт

Входной фильтр listing принимает список `ListingProductFilter`.

Основные варианты:

- `available` - виртуальный boolean-фильтр наличия;
- `price` - диапазон цены в minor units;
- `tag` - фильтр по product tag;
- `variantOption` - фильтр по variant option;
- `productFacet` - фильтр по product-level facet value;
- `variantFacet` - фильтр по variant-level facet value.

Facet value в новом контракте задается парой:

```graphql
input ListingFacetValueFilter {
  facet: String!
  value: String!
}
```

`facet` - публичный `facet.slug`, `value` - публичный `facet_value.handle`.
В ответе `ListingConnection.facets` возвращает `ListingFacet[]`; каждое значение
содержит `count`, `selected`, готовый reusable `input` и опциональный `swatch`.

## Конфигурационная модель

Конфигурация хранится в schema `listing`:

- `listing.facet`;
- `listing.facet_translation`;
- `listing.facet_source`;
- `listing.facet_source_translation`;
- `listing.facet_value`;
- `listing.facet_value_translation`;
- `listing.facet_swatch`.

`facet` описывает фильтр:

- `facet_type`: `PRICE`, `TAG`, `FEATURE`, `OPTION`, `IN_STOCK`;
- `ui_type`: `CHECKBOX`, `RADIO`, `DROPDOWN`, `RANGE`, `BOOLEAN`;
- `selection_mode`: `SINGLE` или `MULTI`;
- `lexo_rank`: порядок вывода;
- `slug`: стабильный публичный идентификатор;
- translation label.

`facet_source` описывает выбранные catalog sources для facets, у которых есть
явный source-handle namespace. В текущей persisted модели это `OPTION` и
`FEATURE`.

| Facet type | `facet_source.handle` | Catalog source |
|------------|------------------------|----------------|
| `OPTION` | `catalog.product_option.slug` | одна option family, например `color` или `size` |
| `FEATURE` | `catalog.product_feature.slug` | одна feature, например `material` |

`TAG`, `PRICE` и `IN_STOCK` не должны описываться как persisted
`facet_source` rows в этом документе:

```text
TAG      -> конкретные tag values описываются через facet_value, не facet_source
PRICE    -> runtime price берется из price index tables
IN_STOCK -> runtime availability берется из availability/index state
```

Конкретные теги не сохраняются в `facet_source`. Для tag facet конкретный
catalog tag хранится в `facet_value.handle`.

`facet_source` нужен для трех вещей:

- зафиксировать, какие catalog sources участвуют в конкретном listing facet;
- хранить localized source name через `facet_source_translation`;
- запретить неоднозначную конфигурацию для option/feature sources: уникальность
  `(store_id, facet_type, handle)` не дает подключить один и тот же catalog
  source к нескольким facets одного store.

Важно: `PRICE` в этой модели не имеет rows в `listing.facet_value`. Запись
`facet_type = PRICE` не означает наличие `facet_source` или `facet_value` для
price; runtime listing строит price facet виртуально из price index.

`facet_value` хранит два типа значений только для дискретных facets
`TAG`, `FEATURE`, `OPTION`:

- `source` - реальное значение из каталога: tag handle, feature value handle или option value handle;
- `display` - публичное значение фильтра, которое может группировать несколько source values.

Связь catalog values с `facet_value` задается через source value handle:

| Catalog entity | Source namespace | `facet_value.kind = source`, `handle` |
|----------------|------------------------|----------------------------------------|
| `catalog.tag` | tags namespace, не persisted `facet_source` | `tag.handle`, например `sale` |
| `catalog.product_option` + `product_option_value` | `product_option.slug`, например `color` | `option.slug:value.slug`, например `color:red` |
| `catalog.product_feature` + `product_feature_value` | `product_feature.slug`, например `material` | `feature.slug:value.slug`, например `material:cotton` |

Catalog snapshot может прийти с value handle без префикса source. Для `OPTION`
и `FEATURE` listing resolution нормализует его к форме
`sourceHandle:valueHandle`. Для `TAG` source handle всегда `tags`, а value handle
остается `tag.handle`.

В админской модели root values - это rows с `parent_id IS NULL`: они показываются
при управлении facet values и сортируются по `sort_index`.

В runtime listing metadata текущая SQL-ветка выбирает только display values:
`kind = 'display'`, `parent_id IS NULL`, `enabled = true` и
`reference_status = VALID`. Source values участвуют как входные источники и как
children display value; hidden source children не показываются отдельно.

Пример группировки:

```text
source: color:red       -> parent display:red-tones
source: color:dark-red  -> parent display:red-tones
source: color:black     -> может быть присоединен к display:black

UI видит:
- red-tones
- black
```

При выборе `red-tones` runtime фильтрует индекс по ключу display parent:
`facetId:redTonesValueId`. При индексировании source selection заранее
разрешается в display parent, поэтому query path не должен раскрывать группу
каждый раз.

## Source candidates

Listing не владеет catalog domain values. Для админского выбора источников он
обращается к Catalog через candidate layer:

- `facetSourceCandidates` показывает доступные источники facet;
- `facetValueCandidates` показывает доступные values для выбранных источников.

В Catalog это построено на candidate views. В persisted `facet_source` нельзя
смешивать source candidates со значениями: source rows используются для
`OPTION`/`FEATURE` namespaces, а конкретные значения живут в `facet_value`.

Candidate views в Catalog возвращают уже нормализованные candidate records.
Важно различать `id` candidate и публичный `handle`, который потом уходит в
create input:

- source candidates:
  - `PRICE:price` - `facetType = PRICE`, `handle = price`;
  - `IN_STOCK:availability` - `facetType = IN_STOCK`, `handle = availability`;
  - `TAG:tags` - `facetType = TAG`, `handle = tags`;
  - `OPTION:<product_option.slug>` - `facetType = OPTION`, `handle = <product_option.slug>`;
  - `FEATURE:<product_feature.slug>` - `facetType = FEATURE`, `handle = <product_feature.slug>`.
- value candidates:
  - `TAG:<tag.handle>` - `facetType = TAG`, `sourceHandle = tags`,
    `handle = <tag.handle>`;
  - `OPTION:<product_option.slug>:<product_option_value.slug>` -
    `facetType = OPTION`, `sourceHandle = <product_option.slug>`,
    `handle = <product_option.slug>:<product_option_value.slug>`;
  - `FEATURE:<product_feature.slug>:<product_feature_value.slug>` -
    `facetType = FEATURE`, `sourceHandle = <product_feature.slug>`,
    `handle = <product_feature.slug>:<product_feature_value.slug>`.

`facetSourceCandidates` доступен для create flow всех facet types. Но persisted
`listing.facet_source` после создания остается только для `OPTION` и `FEATURE`.
Для `PRICE`, `IN_STOCK` и `TAG` выбранный source candidate валидирует create
input, но не превращается в persisted `facet_source` row.

При создании `OPTION`/`FEATURE` facet выбранные sources записываются в
`listing.facet_source`. Для `TAG`, `OPTION`, `FEATURE` выбранные value
candidates записываются в `listing.facet_value` как `kind = 'source'`. Если
нужно публичное имя, ручной handle, swatch или группировка нескольких source
values, создается `kind = 'display'`, а source values получают `parent_id` этого
display value.

Для `PRICE` и `IN_STOCK` value candidates не создаются: scripts запрещают
`facet_value` для этих типов. Они обрабатываются как virtual facets.

## Что хранится в bitmap value key

`listing.listing_posting_bitmap` - общий posting-list индекс. Его primary key:

```text
store_id + entity_type + field + value_key
```

`bitmap` хранит набор integer doc ids, а `value_key` говорит, для какого
значения построен этот bitmap. Смысл `value_key` зависит от пары
`entity_type`/`field`:

| `entity_type` | `field` | Что лежит в `value_key` | Что лежит в `bitmap` |
|---------------|---------|--------------------------|----------------------|
| `product` | `category` | `categoryId` | `product_doc_id` продуктов в категории |
| `product` | `vendor` | `vendorId` | `product_doc_id` продуктов vendor |
| `product` | `facet` | `facetId:facetValueId` | `product_doc_id` продуктов с этим product-level facet value |
| `variant` | `facet` | `facetId:facetValueId` | `variant_doc_id` вариантов с этим option facet value |
| `variant` | `variant_product` | `productId` | `variant_doc_id` вариантов продукта |

Для дискретных listing facets (`TAG`, `FEATURE`, `OPTION`) важен формат:

```text
value_key = <listing.facet.id>:<listing.facet_value.id>
```

Пример:

```text
facet.slug = color
facet.id = 7f0...
display facet_value.handle = red
display facet_value.id = 9a1...

bitmap value_key = 7f0...:9a1...
GraphQL value id/input value = red
```

Наружу API никогда не отдает `value_key`. UI работает с `facet.slug` и
`facet_value.handle`, а `value_key` нужен только для быстрых пересечений bitmap.

Price не использует этот формат. Для price нет `field = facet` bitmap key вида
`priceFacetId:priceValueId`, потому что нет `price` rows в `facet_value`.

## Как хранится price

Price хранится не в `listing.facet_value` и не в `listing_posting_bitmap`.

Конфигурационный слой может содержать сам facet type:

```text
listing.facet.facet_type = PRICE
```

Но persisted `facet_source`/`facet_value` для price не нужны. Runtime данные
цены лежат в индексных таблицах:

| Таблица | Что хранит |
|---------|------------|
| `listing.product_listing_price_index` | product-level диапазон цены по currency: `min_price_minor`, `max_price_minor`, `has_price` |
| `listing.variant_listing_price_index` | variant-level цену по currency: `price_minor`, `signature_key`, `product_doc_id`, `variant_doc_id`, `has_price` |
| `listing.listing_posting_product_sort` | price sort rows: `sort_kind = price`, `currency`, `bigint_value = minPriceMinor` |
| `listing.listing_posting_variant_price` | runtime rows для priced active/in-stock variants, используемые при option + price фильтрах |

Price filter приходит через dedicated input:

```graphql
input ListingPriceRangeFilter {
  min: BigInt
  max: BigInt
}
```

Runtime `price` facet строится в `virtualFacets`: SQL вычисляет текущий
`minPriceMinor`/`maxPriceMinor` для matched result, а GraphQL mapper возвращает
facet:

```text
id = price
type = PRICE_RANGE
uiType = RANGE
value.id = range
value.input = { price: { min, max } }
```

Поэтому price нельзя фильтровать через `productFacet`/`variantFacet`; если в
facet resolution встретится `facet_type = PRICE`, такой ввод считается ошибкой
`UNSUPPORTED_PRICE_FACET_FILTER`.

## Write path индекса

Каталог отправляет listing snapshot через broker action. Snapshot содержит:

- product-level facets: `TAG`, `FEATURE`;
- variant-level facets: `OPTION`;
- price ranges;
- availability;
- category scopes;
- vendor;
- localized content.

Далее listing pipeline делает несколько шагов:

1. `catalogListingSnapshotMapper` превращает catalog product snapshot в
   `ListingSellableItemSnapshot`.
2. `ListingResolveFacetSelectionsScript` разрешает source handles в configured
   `facet.id` и `facet_value.id`. Если value не настроен или reference stale,
   selection отбрасывается и добавляется warning
   `LISTING_FACET_VALUE_NOT_CONFIGURED`.
3. `ListingBuildSyncWriteModelScript` строит deterministic write model:
   product rows, variant rows, price rows, sort rows, search rows и posting keys.
4. `ListingWriteIndexActionScript` в транзакции применяет write model к индексным
   таблицам и обновляет `listing_index_item_state`.

Ключевая нормализация происходит перед записью posting lists:

```text
facet selection -> facet.id + facet_value.id -> valueKey = facetId:valueId
```

Эта нормализация относится к дискретным product/variant facets. Price идет
отдельно: `ListingBuildSyncWriteModelScript` пишет product price ranges,
variant prices и price sort rows, но не создает facet bitmap memberships для
price.

Product-level facets пишутся в `listing_posting_bitmap` как:

```text
entity_type = product
field = facet
value_key = facetId:valueId
bitmap = product doc ids
```

Variant-level option facets пишутся как:

```text
entity_type = variant
field = facet
value_key = facetId:valueId
bitmap = variant doc ids
```

Для вариантов дополнительно строятся:

- `listing_option_signature` - комбинация option facet values у варианта,
  спроецированная в product bitmap;
- `listing_option_signature_value` - связь signature с отдельными option value keys;
- `listing_option_signature_product_membership` - membership signature/product;
- `listing_posting_variant_projection_block` - блоки для быстрой проекции
  variant bitmap обратно в product bitmap.

Это нужно потому, что выдача возвращает продукты, а option facet живет на уровне
вариантов.

## Runtime query path

Основной entry point - `StorefrontListingQueryRepository.getStorefrontListing`.
Он нормализует request, строит filter hash/cursor state и выполняет SQL branches:

- `page` - страница продуктов;
- `totalCount` - общее число matched products;
- `facetsMetadata` - список видимых facet values для текущего scope;
- `virtualFacets` - price range и in-stock count;
- `facetCounts` - counts по видимым facet values.

Metadata и counts разделены намеренно:

1. `facetsMetadata` сначала находит только values, которые реально присутствуют
   в текущем scope.
2. `facetCounts` получает этот список как ограничение и не пересчитывает
   несуществующие values.
3. `mergeFacetCounts` объединяет metadata с count map.

## Resolution входных facet-фильтров

Runtime принимает публичные `facet.slug` и `value.handle`, затем разрешает их в
`facetId`, `facetType`, `facetValueId`, `valueKey`.

Правила:

- `display` value валиден, если он root, enabled и `reference_status = VALID`;
- `source` value валиден как вход только если у него есть валидный display parent;
- неизвестная пара `facet:value` приводит к validation error;
- `PRICE` нельзя применять через `productFacet`/`variantFacet`, для него есть
  `price` range input;
- `IN_STOCK` может быть представлен virtual input `available`, а также
  boolean-like handles внутри SQL resolution.

После resolution filter plan разделяется на:

- `productFacetGroups` для `TAG` и `FEATURE`;
- `optionFacetGroups` для `OPTION`;
- `vendorIds`;
- `priceRange`;
- `inStock`.

Внутри одного facet несколько values объединяются через OR. Разные facets
объединяются через AND.

## Facet counts

Counts считаются как количество matched sellable products для каждого visible
facet value. Поведение соответствует обычным ecommerce facets:

- при подсчете values текущего facet фильтр этого же facet исключается;
- все остальные активные фильтры остаются;
- selected values остаются в выдаче и показывают count в контексте остальных
  фильтров.

Product-level counts (`TAG`, `FEATURE`) используют product posting bitmaps.

Option counts сложнее, потому что values находятся на variants, а result entity -
product. Для `OPTION` есть несколько стратегий:

- simple path, если нет option filters и price filter;
- price-only path, если есть price filter, но нет option filters;
- signature path для пересечения option groups;
- heavy path для сложных случаев с большим числом option groups.

Все стратегии сходятся к product count: variant matches проецируются в product
bitmap через signatures или projection blocks.

## Virtual facets

Не все facets приходят из `listing.facet_value`.

`available` и `price` формируются как virtual facets:

- `available` возвращает boolean value `true` с count in-stock products;
- `price` возвращается как `PRICE_RANGE`, если для текущего результата есть
  price range в выбранной currency.

Virtual facets нужны, потому что availability и price не являются дискретными
source values с обычным `facet_value` lifecycle. Они считаются из индексных
таблиц availability/price.

## Sorting и порядок вывода

Порядок facets задается `facet.lexo_rank`.
Порядок values задается `facet_value.sort_index`, затем стабильным `facet_value.id`.

GraphQL наружу отдает:

- `ListingFacet.id = facet.slug`;
- `ListingFacetValue.id = facet_value.handle`;
- `ListingFacetValue.input` - готовый payload для следующего request.

Это сохраняет URL/API стабильными и скрывает внутренние UUID.

## Reference status

`facet_source` и `facet_value` имеют `reference_status`:

- `VALID` - источник актуален;
- `STALE` - source больше не подтвержден catalog layer.

Index write path не индексирует stale/невалидные source selections как активные
facets. Runtime metadata выбирает только enabled + valid values. Это защищает
storefront от показа фильтров, которые больше не соответствуют catalog data.

## Производительность

Основной performance design:

- integer doc ids вместо UUID в runtime bitmaps;
- roaring bitmap для posting lists;
- отдельные product и variant posting bitmaps;
- option signatures для комбинаций variant options;
- projection blocks для variant-to-product projection;
- параллельные SQL branches для page/total/metadata/virtual facets/counts;
- опциональный profiling `listing:facetCounts` и `EXPLAIN ANALYZE` для e2e perf.

Важно: facet counts не должны строиться через ad hoc joins к catalog domain
таблицам. Runtime listing читает собственный индекс и facet configuration в
schema `listing`.

## Практические правила изменений

- Для нового публичного facet value меняй configuration layer, а не posting
  bitmap contract.
- Внешним идентификатором остаются `facet.slug` и `facet_value.handle`.
- Внутренним ключом индекса остается `facetId:valueId`.
- Product-level facets идут в product postings; variant-level option facets -
  в variant postings плюс option signatures/projection.
- Price и availability держи как virtual facets, если не нужна полноценная
  discrete configuration model.
- При изменении grouping source/display values нужен reindex affected sellable
  items, иначе posting bitmap продолжит ссылаться на старый resolved value id.
- Counts должны сохранять isolated-facet поведение: исключать только текущий
  facet group и учитывать остальные filters.

## Основные файлы

- `services/listing/src/api/graphql-admin/schema/listing.graphql` - публичный
  listing contract.
- `services/listing/src/api/graphql-admin/schema/facet.graphql` - admin contract
  управления facets.
- `services/listing/src/repositories/models/facet.ts` - configuration tables.
- `services/listing/src/repositories/models/listingIndex.ts` - индексные tables.
- `services/listing/src/scripts/ListingResolveFacetSelectionsScript.ts` -
  resolution source values при индексации.
- `services/listing/src/scripts/ListingBuildSyncWriteModelScript.ts` - сборка
  deterministic write model.
- `services/listing/src/scripts/ListingWriteIndexActionScript.ts` - применение
  write model к индексу.
- `services/listing/src/repositories/storefront/StorefrontListingQueryRepository.ts`
  - runtime orchestration.
- `services/listing/src/repositories/storefront/StorefrontFacetResolutionRepository.ts`
  - typed resolution публичных facet filters.
- `services/listing/src/repositories/storefront/sql/compileFacetsQuerySql.ts` -
  metadata visible facet values.
- `services/listing/src/repositories/storefront/sql/compileFacetCountsQuerySql.ts`
  - SQL для facet counts.
- `services/listing/src/resolvers/admin/listingFacetMapper.ts` - mapping runtime
  result в GraphQL `ListingFacet`.
