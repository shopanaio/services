# План переработки listing index для listing, facets, filtering и sort

## Статус и источники истины

Этот документ описывает верхнеуровневый redesign storefront listing. Каноническая
модель runtime index зафиксирована в:

- `services/listing/docs/listing-posting-list-search-engine-index.ru.md`
- `services/listing/docs/listing-index-db-schema.ru.md`
- `services/listing/docs/listing-query-sql-examples.ru.md`

Если этот документ расходится с posting engine document, каноном считается
`listing-posting-list-search-engine-index.ru.md`.

Listing index является производной read model для storefront выдачи. Canonical
catalog tables остаются source of truth для product, variant, categories, tags,
features, options, prices, inventory, project settings и facet configuration.

Обратная совместимость не требуется. Проект на ранней стадии, поэтому можно
менять таблицы, модели, repositories и scripts без dual-write и compatibility
views. После изменения structure index пересобирается rebuild script.

## Storefront операции

Listing index должен обслуживать:

- Category PLP: товары, `totalCount`, facets, counts, `pageInfo`, sort options в
  category navigation scope.
- Manual collection PLP: выдача ручной подборки с сохранением
  `collection_item.lexo_rank` через derived sort rows.
- Rule collection PLP: динамическая подборка, где rules компилируются в
  product-level и variant-level predicates.
- Global catalog listing: общий каталог проекта без category/collection scope.
- Search results listing: structured listing поверх BM25 title search candidate
  set.

Hydration карточек товара не является обязанностью listing index. Query engine
возвращает ordered `product_id`/`product_doc_id`, sort values, counts и facet
metadata; карточки загружаются отдельным batch pipeline без N+1.

## Цели

1. Использовать PostgreSQL roaring posting index как целевой storefront runtime
   index.
2. Хранить facet/scope/vendor predicates как compressed bitmap rows в
   `listing.listing_posting_bitmap`, а не как row-based token tables.
3. Делать filtering, `totalCount` и facet counts через bitmap set operations.
4. Сохранить variant-correct semantics: `OPTION` и `PRICE` predicates должны
   совпадать на одном in-stock variant.
5. Считать counts по product cardinality. Variant-level facets сначала
   проектируются в product docs и дедуплицируются.
6. Поддержать deterministic sort через physical sort/price indexes:
   `listing.listing_posting_product_sort` и
   `listing.listing_posting_variant_price`.
7. Поддерживать current-state incremental sync: изменение товара, варианта,
   цены, остатка, facet membership или scope membership обновляет только
   affected listing/posting rows.

## Не цели

- Не строить full-text search внутри listing index. BM25 title search описан в
  `listing-bm25-pg-search-index-plan.ru.md`.
- Не хранить готовые `facet_value -> count` для всех комбинаций filters.
- Не хранить raw tag/feature/category/option handles в listing read model или
  runtime posting index.
- Не делать generic posting rows для virtual facets `price` и `in_stock`.
- Не публиковать immutable posting versions как основной correctness model.
- Не переносить canonical catalog data в listing index.

## Целевая модель хранения

SQL read model:

- `listing.listing_doc_id_allocator`
- `listing.product_listing_index`
- `listing.product_listing_price_index`
- `listing.variant_listing_index`
- `listing.variant_listing_price_index`

Runtime posting index:

- `listing.listing_posting_bitmap`
- `listing.listing_posting_product_sort`
- `listing.listing_posting_variant_price`
- `listing.listing_posting_variant_projection_block`

Title search index:

- `listing.product_title_bm25_search_index`

`product_doc_id` и `variant_doc_id` являются stable integer ids внутри project.
Они выделяются один раз, живут в listing rows и не переиспользуются после
удаления canonical entity. Это защищает roaring bitmaps от переиспользования
старого doc id для другого товара или варианта.

`listing.listing_posting_bitmap` хранит одну bitmap row для одного
`entity_type + field + value_key`:

```text
entity_type=product, field=category, value_key=<category_id>
entity_type=product, field=collection, value_key=<collection_id>
entity_type=product, field=vendor, value_key=<vendor_id>
entity_type=product, field=facet, value_key=<facet_id>:<facet_value_id>
entity_type=variant, field=facet, value_key=<facet_id>:<facet_value_id>
entity_type=variant, field=variant_product, value_key=<product_doc_id>
```

Bitmap for `entity_type = product` contains `product_doc_id`. Bitmap for
`entity_type = variant` contains `variant_doc_id`.

## Facet routing

| Facet type | Runtime storage |
| --- | --- |
| `tag` | product bitmap row, `field = 'facet'` |
| `feature` | product bitmap row, `field = 'facet'` |
| `option` | variant bitmap row, `field = 'facet'` |
| `price` | virtual facet over `listing_posting_variant_price` and price aggregates |
| `in_stock` | virtual facet over listing availability and product sort rows |

`category` не является storefront facet. Category используется как navigation
scope, collection rule field и product bitmap row with `field = 'category'`.

Storefront filter resolve принимает public `facetSlug:valueHandle` и batch-query
переводит его в resolved `facet_id` / `facet_value_id`. Runtime query получает
только ids и строит `value_key = <facet_id>:<facet_value_id>`. Raw source handles
используются только transient во время sync из canonical tables.

## Filter semantics

Product-level filters:

- `tag`
- `feature`
- explicit `vendor_id`
- category/collection scope
- rule collection scalar predicates, если они представлены в listing row или
  controlled posting row

Variant-level filters:

- `option`
- `price`

Availability:

- `in_stock` как storefront availability toggle поверх product aggregate.
- Variant-level matching всегда ограничен in-stock variants.

Combination rules:

- OR внутри одного `facet_id`.
- AND между разными `facet_id`.
- Option facets пересекаются на `variant_doc_id` до projection в products.
- Option + price filters пересекаются на `variant_doc_id` до projection.
- Product-level filters пересекаются на `product_doc_id`.

## Query flow

1. Resolve project context, default currency, locale, scope, filters, sort and
   pagination input.
2. Resolve storefront facet values into `facet_id` / `facet_value_id`.
3. Load or build scope product bitmap: category, collection, global published
   products or BM25 search candidate product docs.
4. Build product-level filter bitmap from product facet/vendor/scope rows.
5. Build variant-level filter bitmap from option bitmaps and
   `listing_posting_variant_price` for price range.
6. Apply in-stock variant semantics.
7. Project variant matches to product bitmap through projection blocks.
8. Intersect scope, product filters and projected variant filters.
9. Collect page through `listing_posting_product_sort` for product-level sorts or
   through `listing_posting_variant_price` for matched variant price sort.
10. Compute `totalCount` and facet counts from the same base bitmaps, not from
    current page ids.

Detailed SQL shapes are maintained in
`services/listing/docs/listing-query-sql-examples.ru.md`.

## Sorting

All storefront sorts are deterministic and availability-first:

```text
in_stock DESC, requested sort keys, stable tie-breaker
```

Supported sorts:

- `manual`: category/collection manual order via product sort rows scoped by
  `manual_scope_id`.
- `newest`: published date, product created date, product id.
- `created`: product created date, product id.
- `name`: locale-specific derived sort row.
- `price_asc` / `price_desc`: product aggregate price when no variant-level
  matching is active; matched variant price collector when option/price
  predicates are active.
- `relevance`: BM25 candidate score for search listings.

Product-level sorts scan `listing.listing_posting_product_sort` and check
`matches_bitmap @> product_doc_id`.

Matched variant price sort scans `listing.listing_posting_variant_price`,
checks both `variant_matches_bitmap @> variant_doc_id` and
`product_matches_bitmap @> product_doc_id`, then deduplicates by product with
stable tie-breakers.

## Facet aggregation

Counts are computed by product cardinality over full listing scope.

Facet isolation:

```text
count_base_for_facet_X =
  all active filters except filters from facet X
```

Product-level facet count:

```text
value_count = cardinality(count_base_for_facet_X & value_bitmap)
```

Variant option facet count:

```text
variant_base = all active variant filters except current option facet
value_variants = variant_base & option_value_bitmap
value_products = project_variants_to_products(value_variants) & product_base
value_count = cardinality(value_products)
```

Do not run one independent SQL query per facet value. Build reusable base
bitmaps once and reuse them for configured visible values.

## Price and availability virtual facets

`price` is not stored as `listing_posting_bitmap(field='price')`.

Price range and matched price sorting use
`listing.listing_posting_variant_price`, which contains only priced active
in-stock variants in a currency.

`in_stock` is not stored as a default generic bitmap row.

- Product-level availability lives in `product_listing_index.in_stock` and in
  `listing_posting_product_sort.bool_value`.
- Variant-level availability lives in `variant_listing_index.in_stock` and is
  applied before option/price projection.

If a future measured hot path needs explicit in-stock bitmap rows, they must be
added as controlled physical indexes with clear sync rules, not as configurable
facets.

## Search integration

BM25 title search is a separate candidate source. It narrows product universe for
one project, locale and normalized query. Listing engine intersects search
candidates with scope, product filters and projected variant filters.

The search candidate relation must represent the full title match set when it
feeds `totalCount` and facet counts. A top-K relation may be used only as a
page-only optimization after exact count semantics are preserved or explicitly
documented as capped-search API behavior.

## Sync lifecycle overview

Posting tables are current-state physical indexes. Sync updates only affected
rows.

Product created or refreshed:

- allocate or preserve `product_doc_id`;
- upsert `product_listing_index`;
- replace product price rows;
- replace affected product bitmap memberships: vendor, category, collection,
  product facets;
- refresh product sort rows.

Variant created or refreshed:

- allocate or preserve `variant_doc_id`;
- upsert `variant_listing_index`;
- replace variant price rows;
- replace affected variant facet bitmap memberships;
- update `field=variant_product,value_key=<product_doc_id>` membership;
- refresh `listing_posting_variant_price` rows for priced in-stock variants;
- refresh touched projection blocks;
- refresh parent product aggregate and sort rows.

Delete or soft-delete:

- remove doc ids from affected bitmap rows;
- delete listing rows;
- let dependent price/sort rows cascade where FK exists;
- never reuse removed doc ids.

Facet/source mapping changed:

- recompute affected bitmap memberships from canonical source rows;
- update cardinality and `updated_at`;
- do not change price/stock rows unless the underlying product/variant changed.

## Implementation order

1. Align Drizzle models with `listing-index-db-schema.ru.md`.
2. Add handwritten listing migration for listing read model and roaring posting
   tables. Do not use Drizzle migration generation for listing migrations.
3. Add repositories for listing rows, doc id allocation, bitmap rows, sort rows,
   variant price rows, projection blocks and freshness audit.
4. Add source/mapping repositories that read canonical data and resolve raw
   source handles into stable ids for sync only.
5. Add pure builders for listing rows, bitmap membership sets, sort rows and
   price/projection physical indexes.
6. Add sync/delete/rebuild/repair scripts.
7. Wire event handlers and DBOS workflows.
8. Implement storefront query and facet aggregation repositories using roaring
   bitmap SQL shapes.
9. Add BM25 title search integration as an optional candidate source.
10. Cleanup obsolete token-table/raw-handle code paths after callers migrate.

## Acceptance criteria

- Storefront configured facets never read raw handle arrays.
- `product_listing_index` and `variant_listing_index` contain stable doc ids.
- `listing_posting_bitmap` is keyed only by
  `(project_id, entity_type, field, value_key)` and stores `roaringbitmap`.
- Row-based product/variant facet posting tables are not recreated.
- `price` and `in_stock` are virtual facets and do not have generic bitmap rows.
- Product-level filters operate on product doc bitmaps.
- Option and price filters operate on variant doc bitmaps before projection.
- Counts are full-scope, product-cardinality and facet-isolated by `facet_id`.
- Variant option counts deduplicate products after projection.
- Sort uses `listing_posting_product_sort` or matched
  `listing_posting_variant_price` collector.
- Full rebuild can recreate listing rows, bitmap rows, sort rows, price rows and
  projection blocks from canonical source tables.
- Freshness audit can detect stale/missing listing rows, bitmap cardinality
  mismatches, orphan sort/price rows and projection block mismatches.
- Verification for implementation uses project build when needed; do not run
  standalone `test` or `tsc`.

