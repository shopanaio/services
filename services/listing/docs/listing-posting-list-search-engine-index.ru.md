# PostgreSQL roaring bitmap индекс для storefront listing

Документ дополняет:

- `services/listing/docs/listing-index-redesign-plan.ru.md`
- `services/listing/docs/listing-index-db-schema.ru.md`
- `services/listing/docs/listing-query-sql-examples.ru.md`

Цель - описать PostgreSQL-based listing engine поверх денормализованной read
model, который хранит физические inverted posting lists в `pg_roaringbitmap`.
Это не замена canonical catalog tables и не предрасчет facet counts. Counts
остаются результатом runtime set operations в PostgreSQL.

Posting engine работает как current-state индекс с incremental maintenance.
Изменение товара, варианта, цены, остатка, facet membership или scope membership
должно обновлять только затронутые listing/posting rows.

## Проблема row-based inverted index

Если хранить facet values как строки, они логически являются inverted index:

```text
(facet_id, facet_value_id) -> product_id / variant_id
```

Но физически PostgreSQL хранит B-tree rows:

```text
facet_id | facet_value_id | product_id
brand    | nike           | p1
brand    | nike           | p2
brand    | nike           | p3
```

Для каждого request PostgreSQL должен читать index ranges, строить рабочие
наборы rows, делать joins/semi-joins, дедупликацию и `GROUP BY`.

Posting engine хранит готовые compressed posting lists:

```text
brand=nike  -> [product_doc_1, product_doc_2, product_doc_3, ...]
color=black -> [variant_doc_2, variant_doc_5, variant_doc_9, ...]
size=42     -> [variant_doc_7, variant_doc_11, variant_doc_19, ...]
```

Фильтрация становится set algebra:

```text
matches = category_mens_sneakers & brand_nike & projected(size_42 & color_black)
```

## Цели

1. Хранить posting lists как `roaringbitmap` rows сразу, без row-based facet
   posting tables.
2. Делать filtering, totalCount и facet counts через set intersections.
3. Сохранить facet isolation: для counts конкретного `facet_id` исключать
   active filters этого же `facet_id`, но применять остальные filters.
4. Сохранить variant-correct semantics: option и price predicates должны
   совпадать на одном in-stock variant.
5. Поддержать deterministic sort через PostgreSQL physical sort tables.
6. Поддерживать current-state индекс incremental sync операциями.
7. Оставить PostgreSQL listing tables как source/debug read model для
   diagnostics и SQL fallback paths.

## Не цели

- Не хранить готовые `facet_value -> count` для всех комбинаций фильтров.
- Не делать full-text search по названию. BM25 title search описан отдельно.
- Не заменять canonical catalog data.
- Не обслуживать admin CRUD напрямую из posting index.
- Не выносить posting index в отдельный сервис, custom binary format или
  MinIO/S3 artifact storage.
- Не публиковать immutable posting versions. Runtime index обновляется как
  current-state physical index.

## Термины

- `product_id` - canonical UUID товара.
- `variant_id` - canonical UUID варианта.
- `product_doc_id` - stable integer id товара внутри project.
- `variant_doc_id` - stable integer id варианта внутри project.
- `posting bitmap` - `roaringbitmap` set of doc ids for one field/value.
- `posting row` - строка `listing.listing_posting_bitmap` для одного
  `entity_type + field + value_key`.
- `projection` - перевод variant bitmap в product bitmap с дедупликацией
  parent product docs.

`product_doc_id` и `variant_doc_id` выделяются один раз и не переиспользуются
после удаления canonical entity. Это предотвращает ситуацию, когда старый
bitmap membership начинает означать другой товар или вариант.

## Высокоуровневая архитектура

```text
canonical catalog tables
        |
        v
PostgreSQL listing read model
product_listing_index / variant_listing_index / price index
        |
        v
incremental posting sync
        |
        v
PostgreSQL roaring posting index
bitmaps + sort rows + typed variant price rows + projection blocks
        |
        v
storefront listing SQL query engine
```

SQL listing read model остается источником для diagnostics и SQL fallback paths.
Целевой storefront read path для category/global/search listing работает через
roaring posting tables.

## Хранилище индекса

Индекс хранится в PostgreSQL через extension `pg_roaringbitmap`:

```sql
CREATE EXTENSION IF NOT EXISTS roaringbitmap;
```

Runtime code использует `pg_roaringbitmap` напрямую. Query builder использует extension API без промежуточных project-owned функций:

| Capability | Direct SQL |
| --- | --- |
| Build bitmap aggregate | `rb_build_agg(int)` |
| AND | `a & b`, `rb_and_agg(bitmap)` |
| OR | `a \| b`, `rb_or_agg(bitmap)` |
| Difference | `a - b` |
| Cardinality | `rb_cardinality(bitmap)` |
| Membership check | `bitmap @> doc_id` |
| Iteration | `rb_iterate(bitmap)` |

## Stable doc ids

Отдельные posting dictionary tables не создаются. Stable ids живут в listing
rows:

```text
listing.product_listing_index(project_id, product_doc_id, product_id)
listing.variant_listing_index(project_id, variant_doc_id, product_doc_id, product_id, variant_id)
```

Allocation state хранится в `listing.listing_doc_id_allocator`:

```sql
CREATE TABLE listing.listing_doc_id_allocator (
  project_id              uuid NOT NULL,
  next_product_doc_id     int NOT NULL DEFAULT 1,
  next_variant_doc_id     int NOT NULL DEFAULT 1,
  updated_at              timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (project_id),
  CONSTRAINT chk_listing_doc_id_allocator_product_positive
    CHECK (next_product_doc_id > 0),
  CONSTRAINT chk_listing_doc_id_allocator_variant_positive
    CHECK (next_variant_doc_id > 0)
);
```

Sync code выделяет ids под row-level lock:

```sql
SELECT next_product_doc_id
FROM listing.listing_doc_id_allocator
WHERE project_id = :projectId
FOR UPDATE;
```

После allocation counter инкрементируется в той же transaction. Удаленные ids не
переиспользуются.

## Posting bitmap table

```sql
CREATE TABLE listing.listing_posting_bitmap (
  project_id             uuid NOT NULL,
  entity_type            varchar(16) NOT NULL,
  field                  varchar(64) NOT NULL,
  value_key              text NOT NULL,
  bitmap                 roaringbitmap NOT NULL,
  cardinality            bigint NOT NULL,
  metadata               jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at             timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (project_id, entity_type, field, value_key),
  CONSTRAINT chk_listing_posting_bitmap_entity_type
    CHECK (entity_type IN ('product', 'variant'))
);
```

`entity_type = 'product'` означает, что bitmap содержит `product_doc_id`.
`entity_type = 'variant'` означает, что bitmap содержит `variant_doc_id`.

Recommended value keys:

```text
field=category, value_key=<category_id>
field=collection, value_key=<collection_id>
field=vendor, value_key=<vendor_id>
field=facet, value_key=<facet_id>:<facet_value_id>
field=variant_product, value_key=<product_doc_id>
```

Mutable storefront handles допустимы только как transient sync input из
canonical catalog tables. В posting index сохраняются canonical ids или stable
typed values.

`cardinality` должен равняться `rb_cardinality(bitmap)`. Sync code
обновляет его вместе с `bitmap`.

## Product sort table

Bitmap хорошо отвечает на вопрос “какие docs подходят”, но не задает порядок.
Для page collection используются physical sort rows:

```sql
CREATE TABLE listing.listing_posting_product_sort (
  project_id             uuid NOT NULL,
  product_doc_id         int NOT NULL,
  product_id             uuid NOT NULL,
  sort_kind              varchar(32) NOT NULL,
  locale                 varchar(16) NOT NULL DEFAULT '',
  currency               varchar(3) NOT NULL DEFAULT '',
  manual_scope_id        uuid NOT NULL
    DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
  bool_value             boolean,
  timestamptz_value      timestamptz,
  timestamptz_value_2    timestamptz,
  bigint_value           bigint,
  text_value             text,
  numeric_value          numeric,

  PRIMARY KEY (
    project_id,
    product_doc_id,
    sort_kind,
    locale,
    currency,
    manual_scope_id
  ),
  CONSTRAINT fk_listing_posting_product_sort_doc
    FOREIGN KEY (project_id, product_doc_id, product_id)
    REFERENCES listing.product_listing_index(
      project_id,
      product_doc_id,
      product_id
    )
    ON DELETE CASCADE
);
```

Main indexes:

```sql
CREATE INDEX idx_listing_posting_product_sort_newest
  ON listing.listing_posting_product_sort (
    project_id,
    sort_kind,
    locale,
    currency,
    manual_scope_id,
    bool_value DESC,
    timestamptz_value DESC NULLS LAST,
    timestamptz_value_2 DESC NULLS LAST,
    product_id
  )
  INCLUDE (product_doc_id);

CREATE INDEX idx_listing_posting_product_sort_value
  ON listing.listing_posting_product_sort (
    project_id,
    sort_kind,
    locale,
    currency,
    manual_scope_id,
    numeric_value,
    text_value,
    bigint_value,
    product_id
  )
  INCLUDE (product_doc_id);
```

Sort rows являются physical index, а не source data. Они строятся из
`product_listing_index`, `product_listing_price_index`, translations,
category/collection ranks и других canonical/read-model источников.

## Variant price table

Exact price values не хранятся как one posting bitmap per price. Для price range
и matched variant price sort используется typed table:

```sql
CREATE TABLE listing.listing_posting_variant_price (
  project_id             uuid NOT NULL,
  currency               varchar(3) NOT NULL,
  variant_doc_id         int NOT NULL,
  product_doc_id         int NOT NULL,
  product_id             uuid NOT NULL,
  price_minor            bigint NOT NULL,

  PRIMARY KEY (project_id, currency, variant_doc_id),
  CONSTRAINT fk_listing_posting_variant_price_doc
    FOREIGN KEY (
      project_id,
      variant_doc_id,
      product_doc_id,
      product_id
    )
    REFERENCES listing.variant_listing_index(
      project_id,
      variant_doc_id,
      product_doc_id,
      product_id
    )
    ON DELETE CASCADE
);
```

Main indexes:

```sql
CREATE INDEX idx_listing_posting_variant_price_range
  ON listing.listing_posting_variant_price (
    project_id,
    currency,
    price_minor,
    product_id,
    variant_doc_id,
    product_doc_id
  );

CREATE INDEX idx_listing_posting_variant_price_desc
  ON listing.listing_posting_variant_price (
    project_id,
    currency,
    price_minor DESC,
    product_id,
    variant_doc_id,
    product_doc_id
  );

CREATE INDEX idx_listing_posting_variant_price_product_order
  ON listing.listing_posting_variant_price (
    project_id,
    currency,
    product_id,
    price_minor,
    variant_doc_id,
    product_doc_id
  );
```

Rows exist only for priced variants. Storefront listing normally uses project
default currency.

## Variant projection blocks

Variant-level option filters produce `variant_doc_id` bitmaps. Listing response,
totalCount and product-level facet counts need product docs. Broad option
filters must not expand every matching variant through `rb_iterate`.

Projection helper:

```sql
CREATE TABLE listing.listing_posting_variant_projection_block (
  project_id             uuid NOT NULL,
  block_id               int NOT NULL,
  variant_doc_from       int NOT NULL,
  variant_doc_to         int NOT NULL,
  variant_bitmap         roaringbitmap NOT NULL,
  product_bitmap         roaringbitmap NOT NULL,
  variant_count          int NOT NULL,
  product_count          int NOT NULL,

  PRIMARY KEY (project_id, block_id)
);
```

Recommended block size is 4096 or 8192 variant docs. If a block is fully matched,
query can OR its `product_bitmap` directly. Partial block matches map exact
variants through `variant_listing_index` and deduplicate `product_doc_id`.

## Project isolation

`project_id` is the tenant boundary. Every posting table row and query must be
scoped by `project_id`.

Doc ids are stable only inside project:

```text
project A:
  product_doc_id 1 -> product A1

project B:
  product_doc_id 1 -> product B1
```

Repositories must not expose methods that accept only doc ids. Public/internal
repository methods must accept `project_id` together with any `product_doc_id` or
`variant_doc_id`.

## Query pipeline

1. Resolve project context, default currency and locale.
2. Load scope bitmap: category, collection, search candidate set or global
   published product set.
3. Build product-level filter bitmap from product facets/vendor/scopes.
4. Build variant-level filter bitmap from option facets, availability and price.
5. Project variant matches to product docs when variant filters exist.
6. Combine product bitmap and projected variant bitmap.
7. Collect page through `listing_posting_product_sort` or
   `listing_posting_variant_price`.
8. Hydrate products by `product_id`.
9. Compute facet counts from the same base candidate bitmaps.

## Product-level filters

Product-level postings store `product_doc_id`:

```text
field=category
field=collection
field=vendor
field=facet for tag/feature values
```

Example:

```text
base = category:<category_id>
brand = facet:<brand_facet_id>:<nike_value_id>
material = facet:<material_facet_id>:<leather_value_id>

product_matches = base & brand & material
```

Product-level facet groups use OR within one facet and AND between different
facets:

```text
brand_filter = brand:nike | brand:adidas
material_filter = material:leather
product_matches = base & brand_filter & material_filter
```

## Variant-level filters

Variant option postings store `variant_doc_id`. Option filters must match the
same variant. For example, `color=black` and `size=42` means:

```text
variant_matches = color_black & size_42 & in_stock_variant_scope
product_matches = project_variants_to_products(variant_matches)
```

`field=variant_product, value_key=<product_doc_id>` can be used for narrow
product-to-variant lookups, but broad projection should prefer projection blocks.

## Price filters

`price` is a virtual facet. It is not represented as
`listing_posting_bitmap(field='price')`.

Price range query scans `listing_posting_variant_price` in project default
currency and builds a variant bitmap:

```sql
SELECT rb_build_agg(vp.variant_doc_id) AS price_variant_bitmap
FROM listing.listing_posting_variant_price vp
WHERE vp.project_id = :projectId
  AND vp.currency = :currency
  AND vp.price_minor >= :minPriceMinor
  AND vp.price_minor <= :maxPriceMinor;
```

When option and price filters are both active, combine them on variant docs
before projection:

```text
variant_matches = option_bitmap & price_bitmap & in_stock_variant_bitmap
product_matches = project_variants_to_products(variant_matches)
```

## Availability

`in_stock` is a virtual facet. It is not stored as a default
`listing_posting_bitmap` row.

- Product-level availability lives in `product_listing_index.in_stock` and in
  `listing_posting_product_sort.bool_value` for ordered collection.
- Variant-level availability lives in `variant_listing_index.in_stock` and is
  applied before option/price projection.

If a hot path needs an explicit in-stock bitmap later, add it as a controlled
physical index with clear sync rules. Do not treat it as a generic configurable
facet.

## Sorting and page collection

For product-level sorts (`newest`, `created`, `name`, `manual`, product price
aggregate sort), collector scans `listing_posting_product_sort` in desired order
and checks bitmap membership:

```sql
SELECT s.product_doc_id, s.product_id
FROM listing.listing_posting_product_sort s
WHERE s.project_id = :projectId
  AND s.sort_kind = :sortKind
  AND s.locale = :locale
  AND s.currency = :currency
  AND s.manual_scope_id = :manualScopeId
  AND :matchesBitmap::roaringbitmap @> s.product_doc_id
ORDER BY
  s.bool_value DESC,
  s.timestamptz_value DESC NULLS LAST,
  s.timestamptz_value_2 DESC NULLS LAST,
  s.product_id
LIMIT :limit;
```

For matched variant price sort, collector scans `listing_posting_variant_price`
in price order and deduplicates by product:

```sql
SELECT DISTINCT ON (vp.product_id)
  vp.product_doc_id,
  vp.product_id,
  vp.price_minor
FROM listing.listing_posting_variant_price vp
WHERE vp.project_id = :projectId
  AND vp.currency = :currency
  AND :variantMatchesBitmap::roaringbitmap @> vp.variant_doc_id
  AND :productMatchesBitmap::roaringbitmap @> vp.product_doc_id
ORDER BY vp.product_id, vp.price_minor ASC, vp.variant_doc_id
LIMIT :candidateLimit;
```

Final product ordering for price sort must preserve chosen price order and use
stable tie-breakers (`product_id`, `variant_doc_id`) for keyset pagination.

## Facet counts

Counts are computed by product cardinality. Product-level facets count
`product_doc_id` directly. Variant-level facets first deduplicate to products.

Facet isolation rule:

```text
count_base_for_facet_X =
  all_active_filters_except_filters_from_facet_X
```

For product facets:

```text
value_count = cardinality(count_base_for_facet_X & value_bitmap)
```

For variant option facets:

```text
variant_base = all_active_variant_filters_except_current_option_facet
value_variants = variant_base & option_value_bitmap
value_products = project_variants_to_products(value_variants) & product_base
value_count = cardinality(value_products)
```

Do not run one full independent SQL query per facet value. Build common base
bitmaps once and reuse them.

## Search integration

BM25 title search is a separate candidate source. Search returns product ids or
product doc ids for one project/locale/query. Listing engine intersects search
candidates with posting filters:

```text
matches = search_candidates & scope_bitmap & product_filters & projected_variant_filters
```

If BM25 returns `product_id`, join to `product_listing_index` to get
`product_doc_id`:

```sql
SELECT pli.product_doc_id
FROM listing.product_title_bm25_search_index s
JOIN listing.product_listing_index pli
  ON pli.product_id = s.product_id
 AND pli.project_id = s.project_id
WHERE s.project_id = :projectId
  AND s.locale = :locale
  AND s.status = 'published';
```

## Incremental maintenance

Posting tables are current-state physical indexes. Sync code updates only
affected rows.

Product created:

- allocate `product_doc_id`;
- insert `product_listing_index`;
- insert `product_listing_price_index` rows;
- insert `listing_posting_product_sort` rows;
- add `product_doc_id` to vendor/scope/product-facet posting rows.

Variant created:

- allocate `variant_doc_id`;
- insert `variant_listing_index`;
- insert `variant_listing_price_index`;
- insert `listing_posting_variant_price` if priced;
- add `variant_doc_id` to option posting rows and
  `field=variant_product,value_key=<product_doc_id>`.

Product/variant deleted or soft-deleted:

- remove doc ids from affected posting rows;
- delete listing rows;
- dependent price/sort rows cascade where FK exists;
- do not reuse removed doc ids.

Facet/scope/vendor changed:

- remove doc id from old posting rows;
- add doc id to new posting rows;
- update `cardinality` and `updated_at`.

Price changed:

- update `variant_listing_price_index`;
- update `product_listing_price_index`;
- update `listing_posting_variant_price`;
- update price sort rows in `listing_posting_product_sort`.

Stock changed:

- update `variant_listing_index.in_stock`;
- update `product_listing_index.in_stock`;
- update availability sort rows;
- update affected variant price rows if price path only includes in-stock
  variants.

Name/manual rank changed:

- update affected `listing_posting_product_sort` rows for locale/manual scope.

Projection block maintenance:

- if a variant changes parent product or visibility, update its block;
- if `variant_doc_id` allocation crosses a block boundary, create missing block;
- recompute only touched blocks.

## Consistency

The listing read model is the source/debug layer. Posting rows are physical
indexes. If diagnostics detect mismatch, affected posting rows are stale and
must be repaired from listing/canonical source rows.

Recommended diagnostics:

- `listing_posting_bitmap.cardinality` equals `rb_cardinality(bitmap)`;
- product/variant doc ids in bitmaps exist in listing rows unless entity was
  just deleted in the same transaction;
- sort rows exist for published product docs and expected sort dimensions;
- variant price rows exist only for priced in-stock variants in supported
  currencies;
- projection block `variant_count` and `product_count` match the stored bitmaps.

For strict storefront reads, query layer may require a freshness watermark from
the sync pipeline. If the watermark is behind the requested source revision,
return a consistency error or wait according to the caller policy.

## Concurrency

Doc id allocation must run under row-level lock on
`listing_doc_id_allocator(project_id)`.

Posting row updates for the same `(project_id, entity_type, field, value_key)`
must be serialized by transaction boundaries or advisory locks. A sync operation
that moves a doc id from one posting row to another must update both rows in the
same transaction where practical.

For high-frequency updates, sync may batch multiple changes for one project and
one field group. Batching must preserve final current-state membership.

## Partitioning

Initial implementation can use non-partitioned tables. If posting rows grow too
large, partition by `project_id`, not by doc id.

Candidate partitioned tables:

```text
listing_posting_bitmap
listing_posting_product_sort
listing_posting_variant_price
listing_posting_variant_projection_block
```

Partitioning must preserve the same logical primary keys and query shape:
`project_id` remains the leading filter.

## Future segmented storage

If current-state roaring rows become too expensive to mutate for high-churn
projects, add segmented storage in a separate design. Segment storage may shard
bitmap/projection/sort/price physical indexes, but must keep the same external
semantics:

- stable doc ids remain in listing rows;
- raw source handles are not stored in runtime index;
- source of truth remains canonical tables plus listing read model;
- query result must be equivalent to current-state posting rows.

Segment storage is an implementation detail for write amplification and
compaction. It must not reintroduce immutable published posting versions as the
primary correctness model.

## PostgreSQL roaring operations

Storefront SQL uses the extension function/operator names directly:

```sql
rb_build_agg(doc_id int) -> roaringbitmap
a & b -> roaringbitmap
rb_and_agg(bitmap roaringbitmap) -> roaringbitmap
a | b -> roaringbitmap
rb_or_agg(bitmap roaringbitmap) -> roaringbitmap
a - b -> roaringbitmap
rb_cardinality(bitmap roaringbitmap) -> bigint
bitmap @> doc_id -> boolean
rb_iterate(bitmap roaringbitmap) -> setof int
```

## Repository boundary

Application code should expose posting operations through focused repositories,
not raw SQL fragments spread across resolvers:

```ts
interface ListingPostingRepository {
  getPostingBitmap(input: {
    projectId: string;
    entityType: 'product' | 'variant';
    field: string;
    valueKey: string;
  }): Promise<RoaringBitmap | null>;

  upsertPostingBitmap(input: {
    projectId: string;
    entityType: 'product' | 'variant';
    field: string;
    valueKey: string;
    bitmap: RoaringBitmap;
    cardinality: bigint;
  }): Promise<void>;

  collectProductPage(input: ListingPageCollectInput): Promise<ListingPageRow[]>;
  collectVariantPricePage(input: ListingVariantPriceCollectInput): Promise<ListingPageRow[]>;
}
```

Repositories must always require `projectId`.

## Summary

PostgreSQL roaring posting index is a current-state runtime index over the SQL
listing read model. Stable doc ids live in `product_listing_index` and
`variant_listing_index`. `listing_posting_bitmap` stores product/variant
predicate bitmaps. Sort, price and projection tables are controlled physical
indexes for hot paths. Updates are incremental and scoped to affected rows.
