# Как будут работать storefront операции listing index

Документ объясняет storefront-операции из
`listing-index-redesign-plan.ru.md`: какие входные данные принимает витрина,
какие read-model таблицы участвуют, как применяются scope, visibility,
filters, facets, counts, sort и pagination, и что возвращается наружу.

Listing index не является full-text search index. Он обслуживает Product
Listing Page: выборку товаров, structured filtering, facet resolution,
facet counts, total count, cursor pagination и sort. Hydration карточек товара
выполняется отдельным batch pipeline после того, как listing query вернул
упорядоченные `product_id` и listing aggregates.

## Общий storefront pipeline

Любая storefront listing операция проходит один и тот же SQL-driven pipeline:

1. Request normalizer получает `project_id` из storefront context, default
   currency проекта, locale, scope, filters, sort и pagination input.
2. Facet resolver batch-запросом переводит storefront tokens вида
   `facetSlug:valueSlug` в `facet_id`, `facet_type`, `facet_value_id`.
   Raw source handles на read path не возвращаются и не используются.
3. Scope CTE строит начальный набор product ids: category, collection, global
   catalog или search candidate relation.
4. `base_all` присоединяет `catalog.product_listing_index` и применяет
   visibility: только текущий `project_id`, только `status = 'published'`.
5. `base` добавляет boolean-поля для active product-level facets через
   `EXISTS` по `product_listing_facet_token`.
6. Если есть option или price predicates, строится variant-level pass set через
   `variant_listing_index`, `variant_listing_facet_token` и
   `variant_listing_price_index`. Все variant-level predicates якорятся к
   одному и тому же in-stock `variant_id`.
7. `filtered_products` применяет все active filters без isolation и является
   источником `totalCount` и page query.
8. Facet aggregation считается по full listing scope, не по текущей странице.
   Для counts включается facet isolation: count значения считается со всеми
   filters, кроме фильтра того же `facet_id`.
9. Sort всегда начинается с `in_stock DESC`, затем идут requested sort keys,
   затем stable tie-breaker `product_id ASC`.
10. Cursor pagination применяет keyset seek по sort keys и `product_id`.
    Cursor включает sort values, `product_id` и filter hash, чтобы cursor от
    другого набора filters не применился к текущей выдаче.

## Category PLP

Category PLP открывает страницу категории и возвращает товары, `totalCount`,
facets, counts, `pageInfo` и sort options в category navigation scope.

Scope строится из `catalog.product_category`:

```sql
scope_products AS (
  SELECT product_id, lexo_rank AS manual_rank, NULL::numeric AS relevance_score
  FROM catalog.product_category
  WHERE project_id = :projectId
    AND category_id = :categoryId
)
```

После этого category scope работает как обычный listing: join к
`product_listing_index`, `status = 'published'`, active filters, facets,
counts, sort и cursor pagination. Category не становится storefront facet:
она только ограничивает начальную вселенную товаров и может использоваться как
rule field в rule collections.

Manual sort для категории использует `manual_rank`:

```sql
ORDER BY in_stock DESC, manual_rank ASC NULLS LAST, product_id ASC
```

Если пользователь выбирает другой sort, category scope сохраняется, но порядок
меняется на requested sort.

## Manual collection PLP

Manual collection PLP открывает ручную подборку и сохраняет порядок
`collection_item.lexo_rank`.

Scope строится из `catalog.collection_item`:

```sql
scope_products AS (
  SELECT product_id, lexo_rank AS manual_rank, NULL::numeric AS relevance_score
  FROM catalog.collection_item
  WHERE project_id = :projectId
    AND collection_id = :collectionId
)
```

Дальше применяются те же storefront правила: `project_id` isolation,
published-only visibility, configured facets, product-level filters,
variant-correct option/price filters, counts по full collection scope и
cursor pagination. Default sort для ручной подборки сохраняет ручной порядок:
`in_stock DESC`, затем `manual_rank`, затем `product_id ASC`.

## Rule collection PLP

Rule collection PLP открывает динамическую подборку. Ее rules компилируются в
product-level и variant-level predicates поверх listing read model.

Product-level rules используют:

- `product_listing_index` для scalar fields: `kind`, dates, visibility fields,
  `vendor_id`, `category_handles`;
- `product_listing_facet_token` для configured tag/feature rules;
- resolved `facet_id` / `facet_value_id`, а не runtime checks по
  `tag_handles` или `feature_value_handles`.

Variant-level rules используют `variant_listing_index` и
`variant_listing_facet_token` так же, как storefront option filters: все option
и price conditions должны выполняться на одном in-stock variant row. Если
variant не в наличии, он не может удовлетворить variant-level collection rule.

Rule collection не имеет `manual_rank`. Она использует collection default sort
или fallback `newest`.

## Global catalog listing

Global catalog listing открывает общий каталог проекта без category или
collection scope.

Scope строится напрямую из `product_listing_index`:

```sql
scope_products AS (
  SELECT product_id, NULL::text AS manual_rank, NULL::numeric AS relevance_score
  FROM catalog.product_listing_index
  WHERE project_id = :projectId
    AND status = 'published'
)
```

Это самый широкий storefront scope. Все filters, facets, counts, total,
pagination и sorts работают так же, как в category/collection PLP. Поскольку
scope большой, query builder должен уметь перейти от простого boolean-`EXISTS`
shape к candidate-first shape, если `EXPLAIN ANALYZE` покажет, что так быстрее
на production-like данных.

## Search results listing

Search results listing применяет structured listing pipeline к candidate set
текстового поиска.

Текстовый search index возвращает SQL relation с `product_id` и
`relevance_score`. Listing index не выполняет full-text search сам. Он только
присоединяет search candidates к `product_listing_index` и применяет:

- `project_id` isolation;
- visibility;
- structured filters;
- facet resolution и counts;
- total count;
- business sort;
- cursor pagination.

Для relevance sort используется score из candidate relation:

```sql
ORDER BY in_stock DESC, relevance_score DESC NULLS LAST, product_id ASC
```

Candidate relation должна представлять полный набор search matches для
нормализованного запроса внутри проекта, locale и visibility. Нельзя передавать
в listing только top-K hits, если от этой relation считаются `totalCount` и
facets: тогда counts описывали бы cap, а не реальные результаты поиска.

## Scope и visibility

Каждый storefront query всегда ограничен `project_id`. Это tenant boundary:
все joins к product, variant, facet, facet value, price и token таблицам
используют тот же `project_id`.

Visibility работает через `product_listing_index.status = 'published'`.
Soft-deleted products не остаются в index со специальным статусом: их listing,
price и token rows удаляются. Поэтому storefront read path не должен видеть
deleted products.

Locale применяется там, где он реально влияет на результат: например, для
name sort через `product_translation(project_id, locale, name, product_id)` и
для последующей hydration карточек. Listing index сам не хранит translated
title.

Price filter, price range, display price и price sort используют project
default currency. Price read-model таблицы per-currency, но storefront query
выбирает строку с default currency проекта.

## Product-level filtering

Product-level filters работают на уровне product и могут быть удовлетворены
любым token того же product.

Tag и feature filters применяются только через
`product_listing_facet_token`. Input token `facetSlug:valueSlug` сначала
resolve-ится в configured `facet_id` и `facet_value_id`; invalid,
unconfigured или unmapped values игнорируются.

Семантика:

- OR внутри одного `facet_id`: value A или value B;
- AND между разными `facet_id`: например, material=cotton и style=casual;
- `vendor_id` является явным storefront filter и не превращается в generic
  facet;
- category используется как navigation scope или rule field, но не как
  storefront facet.

Merged facet values не double-count-ятся: primary key token table хранит одну
строку `(project_id, product_id, facet_id, facet_value_id)`, даже если
несколько source handles ведут к одному storefront `facet_value_id`.

## Variant-level filtering

Variant-level filters работают только через in-stock variants. Это ключевая
семантика для option и price filters.

Если активны `color:red`, `size:xl` и `price <= 1000`, query ищет один и тот
же `variant_listing_index.variant_id`, который:

- `in_stock = true`;
- имеет option token `color:red`;
- имеет option token `size:xl`;
- имеет price row в default currency с `has_price = true` и подходящим
  `price_minor`.

Нельзя удовлетворять `color:red` одним variant, `size:xl` другим variant, а
price третьим variant того же product. После нахождения подходящих variants
результат группируется обратно до product ids.

Семантика option filters:

- OR внутри одного option `facet_id`;
- AND между разными option `facet_id`;
- out-of-stock variants не участвуют в option filters, price filters,
  matched variant sort, option counts и variant-level collection rules.

`in_stock` как storefront availability toggle применяется поверх product
aggregate `product_listing_index.in_stock`. Variant-level filters и так
ограничены in-stock variant rows.

## Facet resolution

Facet resolution переводит публичные storefront tokens в внутренние ids.

Вход: tokens вида `facetSlug:valueSlug`.

Выход read path:

- `facet_id`;
- `facet_type`;
- `facet_value_id`.

Resolver batch-запросом читает `facet`, `facet_value` и проверяет наличие
`facet_value_source_handle`. Storefront получает только configured facets и
values, у которых есть source mapping. Raw tag, feature или option handles не
возвращаются наружу.

Если один `facet_value` мапится на несколько source handles, storefront все
равно видит один value. Token generation заранее нормализует source handles в
resolved ids, а aggregation группирует по `facet_value_id`.

## Facet aggregation

Facet counts считаются по full listing scope, а не по текущей странице товаров.
Это значит, что page size не влияет на counts.

Product-level counts для tag и feature используют `product_listing_facet_token`
и считают products. Isolation применяется по `facet_id`: count для values
фасета `material` считается со всеми active filters, кроме active filter самого
`material`.

Option counts считаются variant-correct:

1. Для каждого option `facet_id` строится отдельная ветка aggregation.
2. Ветка возвращает values этого facet, но опускает только predicate этого же
   `facet_id`.
3. Все остальные option predicates остаются привязанными к тому же
   `variant_id`.
4. Учитываются только in-stock variants.
5. Перед `COUNT(*)` выполняется deduplication до
   `(product_id, facet_id, facet_value_id)`, потому что count должен считать
   products, а не variants.

Isolation всегда делается по `facet_id`, не по `facet_type`. Иначе два feature
facets или два option facets ошибочно изолировали бы друг друга как один общий
type.

## Price range virtual facet

Price range не имеет token table и считается из
`variant_listing_price_index.price_minor`.

Range считает `MIN(price_minor)` и `MAX(price_minor)` только по in-stock
variants с `has_price = true` в default currency проекта. Active price
predicate исключается, остальные filters остаются:

- product-level filters;
- vendor filter;
- option filters;
- availability toggle.

Если active option filters есть, они применяются к тому же `variant_id`, чья
цена участвует в `MIN` / `MAX`. Product-level pass set использовать нельзя,
потому что он потеряет same-variant relationship.

## In-stock virtual facet

In-stock count считает products, у которых есть in-stock variant после
применения всех filters, кроме самого active `in_stock` toggle.

Option и price filters сохраняют same-variant semantics: если оба активны,
один и тот же in-stock variant должен удовлетворить option predicates и price
predicate. Затем variants группируются в products и считается count.

## Total count

`totalCount` считается по `filtered_products` со всеми active filters без
isolation. Это число отвечает на вопрос: сколько товаров соответствует
текущему scope и текущему набору filters.

`totalCount` не зависит от текущей страницы и не требует загрузки всех товаров
в память: это SQL `COUNT(*)` поверх CTE/derived relation.

## Sorting

Все storefront sorts deterministic и всегда начинаются с availability bucket:

```sql
ORDER BY in_stock DESC, ...
```

После requested sort keys всегда добавляется `product_id ASC` как stable
tie-breaker.

Supported sorts:

- `manual`: category/manual collection order через `manual_rank ASC NULLS LAST`;
- `newest`: `published_at DESC NULLS LAST`, затем `product_created_at DESC`;
- `created`: `product_created_at DESC`;
- `name`: locale-specific join к `product_translation`;
- `price_asc`: lowest in-stock price;
- `price_desc`: highest in-stock price;
- `relevance`: только для search results, score из search candidate relation.

Price sort выбирает источник цены по ситуации. Если variant-level filters нет,
используются product aggregates из `product_listing_price_index`:
`min_price_minor` для ascending и `max_price_minor` для descending. Если
активны option, price или matched-variant requirements, sort price считается
по matching in-stock variants, чтобы сортировка соответствовала тем variant,
которые реально удовлетворили filters.

Unpriced products не пропадают из выдачи из-за partial price indexes. Query
должен сохранять полный ordering с `NULLS LAST`.

## Pagination и result shape

Все storefront listings используют cursor pagination. Cursor opaque для
клиента, но внутри содержит:

- значения sort keys;
- `product_id` tie-breaker;
- filter hash.

Filter hash нужен, чтобы cursor от старого набора filters не применился к
новому набору filters. Если filters изменились, cursor считается invalid и
query начинает страницу заново или возвращает metadata об invalidation в
зависимости от API contract.

Response shape:

- `edges`: ordered product ids или hydrated карточки после batch hydration;
- `pageInfo`: `startCursor`, `endCursor`, `hasNextPage`,
  `hasPreviousPage`;
- `totalCount`;
- facets with counts;
- applied filters metadata;
- listing aggregates, нужные для карточек и сортировки.

Listing query не загружает все candidate products в память. SQL возвращает
только текущую страницу, counts и metadata. Hydration карточек выполняется
после этого отдельным batch pipeline без N+1: title, handle, media, display
price, badges, swatches и availability labels.
