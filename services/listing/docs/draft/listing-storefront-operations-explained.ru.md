# Как работают storefront операции listing index

Документ объясняет storefront read path после перехода на PostgreSQL roaring
posting index.

Канонические документы:

- `services/listing/docs/draft/listing-posting-list-search-engine-index.ru.md`
- `services/listing/docs/draft/listing-index-db-schema.ru.md`
- `services/listing/docs/draft/listing-query-sql-examples.ru.md`

Listing index не является full-text search index. Он обслуживает Product Listing
Page: product candidates, structured filtering, facet resolution, facet counts,
total count, cursor pagination и sort. Hydration карточек товара выполняется
отдельным batch pipeline после того, как listing query вернул ordered
`product_id` / `product_doc_id` и listing aggregates.

## Общий storefront pipeline

Любая storefront listing операция проходит один bitmap-first pipeline:

1. Request normalizer получает `project_id`, default currency, locale, scope,
   filters, sort и pagination input.
2. Facet resolver batch-запросом переводит public postings
   `facetSlug:valueHandle` в `facet_id`, `facet_type`, `facet_value_id`.
   Runtime query строит stable `value_key = <facet_id>:<facet_value_id>`.
3. Scope builder получает product bitmap: category products or BM25 search
   candidates.
4. Product filter builder строит product bitmap из product facet/vendor/scope
   rows в `listing.listing_posting_bitmap`.
5. Variant filter builder строит variant bitmap из option facet rows и typed
   price rows. Option и price predicates пересекаются на `variant_doc_id`.
6. Variant matches проектируются в product bitmap через projection blocks.
7. `matches` получается пересечением scope, product filters и projected variant
   filters.
8. Page collector сканирует `listing_posting_product_sort` или
   `listing_posting_variant_price` и проверяет bitmap membership.
9. `totalCount` считается через `rb_cardinality(matches)`.
10. Facet aggregation считается по full listing scope, не по текущей странице.
    Для counts применяется facet isolation по `facet_id`.
11. Cursor pagination применяет keyset seek по sort values и stable tie-breakers.

Raw tag/feature/option source handles на read path не используются и не
возвращаются наружу.

## Category PLP

Category PLP возвращает товары, `totalCount`, facets, counts, `pageInfo` и sort
options в category navigation scope.

Category scope является product bitmap row:

```text
entity_type = product
field = category
value_key = <category_id>
```

Если sync хранит category bitmap только для published products, этот bitmap
можно использовать напрямую. Если bitmap содержит drafts, query должен
дополнительно intersect-ить published visibility bitmap или построить published
product bitmap из `product_listing_index`.

Default manual category sort использует derived rows:

```text
listing.listing_posting_product_sort
sort_kind = manual
manual_scope_id = <category_id>
```

Порядок всегда availability-first:

```text
in_stock DESC, manual_rank ASC NULLS LAST, product_id ASC
```

Если пользователь выбирает другой sort, category scope остается тем же, но page
collector использует соответствующий `sort_kind`.

## Search results listing

Search results listing применяет structured listing pipeline к BM25 title search
candidate set.

BM25 search возвращает SQL relation с `product_id` или `product_doc_id` и
`relevance_score` для одного project + locale + query. Listing engine
переводит product ids в `product_doc_id`, строит search candidate bitmap и
intersect-ит его с scope/filter bitmaps.

Candidate relation должна представлять полный набор title matches, потому от
нее считаются `totalCount`, facets, price range и in-stock count. Нельзя молча
передавать только top-K hits: counts описывали бы cap, а не реальные результаты
поиска.

Relevance sort:

```text
in_stock DESC, relevance_score DESC NULLS LAST, product_id ASC
```

## Scope и visibility

Каждый storefront query всегда ограничен `project_id`. Stable doc ids уникальны
только внутри project.

Visibility работает через `product_listing_index.status = 'published'` и/или
published product scope bitmap. Soft-deleted products не остаются в listing
index: listing rows, price rows, sort rows и bitmap memberships удаляются.

Locale применяется для locale-dependent sort rows and hydration. Listing runtime
index не хранит translated product title как source data; title search живет в
отдельном BM25 index.

Price filter, price range, display price и price sort используют project default
currency unless API явно расширит contract.

## Product-level filtering

Product-level filters работают на `product_doc_id`.

Tag и feature filters применяются через `listing_posting_bitmap` rows:

```text
entity_type = product
field = facet
value_key = <facet_id>:<facet_value_id>
```

Semantics:

- OR внутри одного `facet_id`;
- AND между разными `facet_id`;
- `vendor_id` является explicit storefront filter and can use
  `field = vendor`;
- category является scope/rule field, not generic storefront facet.

Merged facet values не double-count-ятся, потому sync записывает one bitmap
membership for resolved `facet_id + facet_value_id`. Если несколько source
handles ведут к одному storefront value, они должны дать один doc membership.

## Variant-level filtering

Variant-level filters работают на `variant_doc_id` and only for in-stock
variants.

Example input:

```text
color=red
size=xl
price <= 1000
```

Correct semantics:

```text
variant_matches =
  color_red_bitmap
  & size_xl_bitmap
  & price_range_bitmap
  & in_stock_variant_bitmap

product_matches = project_variants_to_products(variant_matches)
```

Нельзя удовлетворять `color=red` одним variant, `size=xl` другим variant, а price
третьим variant того же product.

Out-of-stock variants не участвуют в option filters, price filters, matched
variant sort и option counts.

## Facet resolution

Facet resolution переводит public storefront values в internal ids.

Input:

```text
facetSlug:valueHandle
```

Output:

```text
facet_id
facet_type
facet_value_id
value_key = <facet_id>:<facet_value_id>
```

Resolver читает `facet`, visible root `facet_value` rows and enabled source
children through the source/display parent model. Storefront получает только
configured facets and values that resolve to at least one enabled source value.

Raw source handles используются только для sync/rebuild from canonical data.

## Facet aggregation

Facet counts считаются по full listing scope.

Product-level counts:

```text
value_count = cardinality(count_base_for_facet & product_value_bitmap)
```

Option counts:

```text
variant_base = active variant filters except current option facet
value_variants = variant_base & option_value_bitmap
value_products = project_variants_to_products(value_variants) & product_base
value_count = cardinality(value_products)
```

Isolation всегда делается по `facet_id`, не по `facet_type`.

Returned facets должны быть limited to configured visible values. Нельзя
агрегировать все historical posting rows for project.

## Price range virtual facet

`price` не имеет generic posting bitmap. Price range строится из
`listing.listing_posting_variant_price`, где есть only priced active in-stock
variants in default currency.

Range min/max считает prices после применения всех active filters кроме active
price predicate. Если есть option filters, они остаются на том же
`variant_doc_id`, чья цена участвует в range.

## In-stock virtual facet

`in_stock` не имеет default generic posting row.

In-stock count считает products with available variants after all filters except
active `in_stock` toggle. Option и price filters сохраняют same-variant
semantics before grouping back to products.

## Total count

`totalCount` равен `rb_cardinality(matches)` after all active filters without
facet isolation. Он не зависит от текущей page and does not require loading all
products into application memory.

Storefront PLP всегда возвращает `totalCount`; optional aggregate flags не
являются частью public storefront PLP contract.

## Sorting

All storefront sorts are deterministic and availability-first.

Supported sorts:

- `manual`: derived product sort rows scoped by category id;
- `newest`: published date then product created date;
- `created`: product created date;
- `name`: derived locale-specific product sort rows;
- `price_asc`: lowest in-stock product aggregate or lowest matched variant price;
- `price_desc`: highest in-stock product aggregate or highest matched variant
  price;
- `relevance`: only for search results, score from BM25 candidate relation.

Product-level sorts scan `listing_posting_product_sort`.

Matched variant price sort scans `listing_posting_variant_price`, checks
variant/product bitmap membership, picks one variant price per product, and then
uses stable tie-breakers for cursor pagination.

Unpriced products must not disappear from product aggregate price sort; use
`NULLS LAST` semantics where product aggregate price is absent.

## Pagination и result shape

All storefront listings use cursor pagination.

Cursor contains:

- sort values;
- `product_id` tie-breaker;
- optional `variant_doc_id` tie-breaker for matched variant price sort;
- filter hash including project, locale, currency, scope, filters, query and sort.

Response shape:

- `edges`: ordered product ids or hydrated cards after batch hydration;
- `pageInfo`;
- `totalCount`;
- facets with counts;
- `priceRange`;
- `inStockCount`;
- applied filters metadata;
- listing aggregates needed for card display and sorting.

Listing query returns current page, counts and metadata. It must not load all
candidate products into application memory.
