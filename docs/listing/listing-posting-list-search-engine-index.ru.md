# PostgreSQL roaring bitmap индекс для storefront listing

Документ дополняет `docs/listing/listing-index-redesign-plan.ru.md`,
`docs/listing/listing-index-db-schema.ru.md` и
`docs/listing/listing-query-sql-examples.ru.md`.

Цель - описать PostgreSQL-based listing engine поверх денормализованной read
model, который хранит не строки token table, а физические inverted posting
lists в `pg_roaringbitmap`. Это не замена canonical catalog tables и не
предрасчет facet counts. Counts остаются результатом runtime set operations в
PostgreSQL.

## Проблема текущего SQL token index

`product_listing_facet_token` и `variant_listing_facet_token` логически уже
являются inverted index:

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
brand=nike  -> [doc1, doc2, doc3, ...]
color=black -> [doc2, doc5, doc9, ...]
size=42     -> [variant7, variant11, variant19, ...]
```

Фильтрация становится set algebra:

```text
matches = category_mens_sneakers & brand_nike & size_42 & color_black
```

Этот документ проектирует такой физический индекс для Shopana.

## Цели

1. Хранить posting lists как `roaringbitmap` rows, а не как rows token table.
2. Делать filtering, totalCount и facet counts через fast set intersections.
3. Сохранить facet isolation: для counts конкретного `facet_id` исключать
   active filters этого же `facet_id`, но применять остальные filters.
4. Сохранить variant-correct semantics: option и price predicates должны
   совпадать на одном in-stock variant.
5. Поддержать deterministic sort через PostgreSQL sort value tables.
6. Поддержать rebuild + atomic publish новой версии индекса в PostgreSQL.
7. Оставить PostgreSQL listing tables как source read model для rebuild и
   fallback на ранней стадии.

## Не цели

- Не хранить готовые `facet_value -> count` для всех комбинаций фильтров.
- Не делать full-text search по названию. BM25 title search описан отдельно.
- Не заменять canonical catalog data.
- Не обслуживать admin CRUD напрямую из posting index.
- Не выносить posting index в отдельный сервис, custom binary format или
  MinIO/S3 artifact storage.
- Не пытаться поддерживать per-row OLTP updates внутри одного опубликованного
  bitmap. Инкрементальные изменения публикуются новой версией posting index.

## Термины

- `product_id` - canonical UUID товара.
- `variant_id` - canonical UUID варианта.
- `product_doc_id` - dense integer id товара внутри версии индекса.
- `variant_doc_id` - dense integer id варианта внутри версии индекса.
- `posting bitmap` - `roaringbitmap` set of doc ids for one field/value.
- `doc dictionary` - mapping между canonical UUID и dense doc id.
- `index version` - опубликованный набор PostgreSQL rows с dictionaries,
  postings и sort values для проекта.

## Высокоуровневая архитектура

```text
canonical catalog tables
        |
        v
PostgreSQL listing read model
product_listing_index / variant_listing_index / token tables / price index
        |
        v
posting-list index builder
        |
        v
PostgreSQL roaring posting index version
dictionaries + roaring postings + sort values
        |
        v
storefront listing SQL query engine
```

SQL listing read model остается источником для rebuild. Storefront read path
может переключаться на roaring posting tables для category/global/search
listing, а обычный SQL listing pipeline остается fallback и reference
implementation.

## Хранилище индекса

Индекс хранится в PostgreSQL через extension `pg_roaringbitmap`:

```sql
CREATE EXTENSION IF NOT EXISTS roaringbitmap;
```

### Versions

```sql
CREATE TABLE catalog.listing_posting_index_version (
  project_id             uuid NOT NULL,
  index_version          bigint NOT NULL,
  status                 varchar(16) NOT NULL, -- building | published | retired
  product_doc_count      int NOT NULL,
  variant_doc_count      int NOT NULL,
  built_at               timestamptz,
  published_at           timestamptz,
  source_listing_watermark timestamptz,
  metadata               jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (project_id, index_version)
);

CREATE UNIQUE INDEX ux_listing_posting_one_published
  ON catalog.listing_posting_index_version (project_id)
  WHERE status = 'published';
```

Только одна версия на project имеет `status = 'published'`.

### Doc dictionaries

```sql
CREATE TABLE catalog.listing_posting_product_doc (
  project_id             uuid NOT NULL,
  index_version          bigint NOT NULL,
  product_doc_id         int NOT NULL,
  product_id             uuid NOT NULL,
  in_stock               boolean NOT NULL,
  published_at           timestamptz,
  product_created_at     timestamptz NOT NULL,
  PRIMARY KEY (project_id, index_version, product_doc_id),
  UNIQUE (project_id, index_version, product_id)
);

CREATE TABLE catalog.listing_posting_variant_doc (
  project_id             uuid NOT NULL,
  index_version          bigint NOT NULL,
  variant_doc_id         int NOT NULL,
  variant_id             uuid NOT NULL,
  product_doc_id         int NOT NULL,
  product_id             uuid NOT NULL,
  in_stock               boolean NOT NULL,
  PRIMARY KEY (project_id, index_version, variant_doc_id),
  UNIQUE (project_id, index_version, variant_id)
);
```

### Posting bitmaps

```sql
CREATE TABLE catalog.listing_posting_bitmap (
  project_id             uuid NOT NULL,
  index_version          bigint NOT NULL,
  entity_type            varchar(16) NOT NULL, -- product | variant
  field                  varchar(64) NOT NULL,
  value_key              text NOT NULL,
  bitmap                 roaringbitmap NOT NULL,
  cardinality            bigint NOT NULL,
  metadata               jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (project_id, index_version, entity_type, field, value_key),
  CONSTRAINT chk_listing_posting_bitmap_entity_type
    CHECK (entity_type IN ('product', 'variant'))
);
```

`field` и `value_key` должны быть стабильными internal keys, например:

```text
field=scope_category, value_key=men-sneakers
field=scope_collection, value_key=<collection_id>
field=vendor, value_key=<vendor_id>
field=in_stock, value_key=true
field=facet, value_key=<facet_id>:<facet_value_id>
field=variant_product, value_key=<product_doc_id>
field=variant_price_bucket:UAH, value_key=<bucket>
```

### Sort values

Sorting остается SQL responsibility. Posting bitmap отвечает на вопрос “какие
docs matching”, а page order строится по sort value tables.

```sql
CREATE TABLE catalog.listing_posting_product_sort (
  project_id             uuid NOT NULL,
  index_version          bigint NOT NULL,
  product_doc_id         int NOT NULL,
  sort_kind              varchar(32) NOT NULL,
  locale                 varchar(16) NOT NULL DEFAULT '',
  currency               varchar(3) NOT NULL DEFAULT '',
  manual_scope_id        uuid NOT NULL
    DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
  bool_value             boolean,
  timestamptz_value      timestamptz,
  bigint_value           bigint,
  text_value             text,
  numeric_value          numeric,
  PRIMARY KEY (
    project_id,
    index_version,
    product_doc_id,
    sort_kind,
    locale,
    currency,
    manual_scope_id
  )
);

CREATE INDEX idx_listing_posting_product_sort_newest
  ON catalog.listing_posting_product_sort (
    project_id,
    index_version,
    sort_kind,
    bool_value DESC,
    timestamptz_value DESC NULLS LAST,
    product_doc_id
  );

CREATE INDEX idx_listing_posting_product_sort_value
  ON catalog.listing_posting_product_sort (
    project_id,
    index_version,
    sort_kind,
    locale,
    currency,
    manual_scope_id,
    numeric_value,
    text_value,
    bigint_value,
    product_doc_id
  );
```

Implementation can split this generic table into dedicated typed tables if SQL
plans become simpler. Manual category/collection order is scope-specific, so it
must use `manual_scope_id` and must not be modeled as one global product sort
value.

### Price values

Price range filtering and matched variant price sort need typed rows, not one
posting bitmap per exact price:

```sql
CREATE TABLE catalog.listing_posting_variant_price (
  project_id             uuid NOT NULL,
  index_version          bigint NOT NULL,
  currency               varchar(3) NOT NULL,
  variant_doc_id         int NOT NULL,
  product_doc_id         int NOT NULL,
  price_minor            bigint NOT NULL,
  PRIMARY KEY (project_id, index_version, currency, variant_doc_id)
);

CREATE INDEX idx_listing_posting_variant_price_range
  ON catalog.listing_posting_variant_price (
    project_id,
    index_version,
    currency,
    price_minor,
    variant_doc_id,
    product_doc_id
  );

CREATE INDEX idx_listing_posting_variant_price_desc
  ON catalog.listing_posting_variant_price (
    project_id,
    index_version,
    currency,
    price_minor DESC,
    variant_doc_id,
    product_doc_id
  );

CREATE INDEX idx_listing_posting_variant_price_product_order
  ON catalog.listing_posting_variant_price (
    project_id,
    index_version,
    currency,
    product_doc_id,
    price_minor,
    variant_doc_id
  );
```

### Variant projection blocks

Variant filters produce `variant_doc_id` bitmaps, while storefront results and
facet counts are product-level. Projection `variant bitmap -> product bitmap`
must have a fast path; blindly expanding every variant with `rb_iterate` is only
acceptable for small cardinality bitmaps.

The index stores fixed-size projection blocks:

```sql
CREATE TABLE catalog.listing_posting_variant_projection_block (
  project_id             uuid NOT NULL,
  index_version          bigint NOT NULL,
  block_id               int NOT NULL,
  variant_doc_from       int NOT NULL,
  variant_doc_to         int NOT NULL,
  variant_bitmap         roaringbitmap NOT NULL,
  product_bitmap         roaringbitmap NOT NULL,
  variant_count          int NOT NULL,
  product_count          int NOT NULL,
  PRIMARY KEY (project_id, index_version, block_id)
);
```

Recommended block size: 4096 or 8192 variant docs. Builder creates one row per
contiguous `variant_doc_id` range. Query strategy:

```text
if cardinality(variant_bitmap) <= small_threshold:
  rb_iterate(variant_bitmap) -> join variant_doc -> rb_build_agg(product_doc_id)

else:
  for each projection block where variant_bitmap intersects block.variant_bitmap:
    block_match = variant_bitmap & block.variant_bitmap
    if cardinality(block_match) is close to block.variant_count:
      use block.product_bitmap
    else:
      rb_iterate(block_match) -> join variant_doc -> rb_build_agg(product_doc_id)
  OR all projected product bitmaps
```

This keeps sparse option filters cheap while avoiding full variant expansion for
broad filters. Thresholds are planner parameters, not hard product semantics.

## Tenant partitioning

Tenant boundary for this index is `project_id` from the storefront context. In
the broader platform this corresponds to the current store/project isolation
boundary: every posting table row, query, rebuild and cleanup operation must be
restricted by `project_id`.

Doc ids are dense only inside `(project_id, index_version)`:

```text
project A, version 10:
  product_doc_id 1 -> product A1

project B, version 7:
  product_doc_id 1 -> product B1
```

Doc ids from different projects are never comparable, even if the integer value
is the same. Every bitmap is scoped by `(project_id, index_version)`, so
cross-tenant bitmap operations are invalid by construction.

### Logical partitioning

All primary keys start with `(project_id, index_version, ...)` or include it as
the leading lookup prefix. Storefront query shape must always resolve published
version first:

```sql
SELECT index_version
FROM catalog.listing_posting_index_version
WHERE project_id = :projectId
  AND status = 'published';
```

Then every posting query uses both values:

```sql
WHERE project_id = :projectId
  AND index_version = :indexVersion
```

Repositories must not expose methods that accept only `index_version` or only
doc ids. The service context project/store id is part of every method contract.

### Physical partitioning

Recommended first implementation: keep ordinary tables with leading
`project_id, index_version` indexes until benchmarks show catalog scale needs
physical partitions. This keeps migrations and local development simpler.

When table size becomes large enough that vacuum, cleanup or index bloat are
visible, split heavy tables into hash partitions by `project_id`:

```sql
CREATE TABLE catalog.listing_posting_bitmap (
  project_id             uuid NOT NULL,
  index_version          bigint NOT NULL,
  entity_type            varchar(16) NOT NULL,
  field                  varchar(64) NOT NULL,
  value_key              text NOT NULL,
  bitmap                 roaringbitmap NOT NULL,
  cardinality            bigint NOT NULL,
  metadata               jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (project_id, index_version, entity_type, field, value_key)
) PARTITION BY HASH (project_id);

CREATE TABLE catalog.listing_posting_bitmap_p00
  PARTITION OF catalog.listing_posting_bitmap
  FOR VALUES WITH (MODULUS 16, REMAINDER 0);
```

The same partitioning strategy applies to the heavy tables:

```text
listing_posting_product_doc
listing_posting_variant_doc
listing_posting_bitmap
listing_posting_product_sort
listing_posting_variant_price
listing_posting_variant_projection_block
```

`listing_posting_index_version` can remain unpartitioned because it has only a
small number of rows per project.

Use hash partitioning by `project_id`, not by `index_version`, because:

- queries are always tenant-scoped;
- rebuild and cleanup are per project;
- one project can have multiple versions during publish/retire grace period;
- partition pruning works from the request context before touching large rows.

### Large tenant isolation

If one project becomes much larger than the rest, move it to dedicated
partitions or a dedicated database before changing doc id semantics. The logical
contract stays the same:

```text
(project_id, index_version) owns the doc id namespace
published version is unique per project
retired versions are cleaned per project
```

Do not mix several tenants into one bitmap to reduce row count. It would break
tenant isolation and make every query depend on runtime masking.

### Cleanup and retention

Retired versions are deleted per project:

```sql
DELETE FROM catalog.listing_posting_bitmap
WHERE project_id = :projectId
  AND index_version = :retiredVersion;
```

The same delete applies to dictionaries, sort values, price rows and projection
blocks. Physical hash partitioning keeps the delete scoped to a small subset of
storage. Cleanup must run after a grace period so in-flight requests that
already resolved the old `index_version` can finish.

### Build isolation

Only one posting build should run per project at a time. The builder should take
a project-scoped advisory lock or equivalent DBOS workflow idempotency key:

```text
listing-posting-build:<project_id>
```

This prevents two rebuilds for the same tenant from racing, but still allows
parallel rebuilds for different tenants. Publish transaction must be short: it
only updates rows in `listing_posting_index_version`; all heavy bitmap, sort and
dictionary writes happen before publish under `status = 'building'`.

## Dense doc id dictionary

Posting lists должны хранить integer doc ids, не UUID. UUID слишком тяжелые для
compressed intersections.

Для каждой опубликованной версии строятся dictionaries:

```text
product_doc_id -> product_id
product_id -> product_doc_id

variant_doc_id -> variant_id
variant_doc_id -> product_doc_id
variant_id -> variant_doc_id
```

Doc ids dense и stable только внутри `index_version`. Cursor должен включать
`index_version` или filter hash, чтобы cursor от старой версии не применялся к
новой выдаче без проверки.

## Product postings

Product-level postings строятся по published product docs:

```text
scope:global
scope:category:<category_id or handle>
scope:collection:<collection_id>
kind:<kind>
vendor:<vendor_id>
status:published
in_stock:true
facet:<facet_id>:<facet_value_id>
tag/feature merged facet values через resolved facet_value_id
```

Category не является storefront facet, но является scope posting:

```text
category=men-sneakers -> product_doc_ids
```

Это позволяет начинать PLP с cheap base set:

```text
base = project_published & category_men_sneakers
```

## Variant postings

Variant-level postings строятся по active in-stock variants:

```text
variant:in_stock:true
variant:product:<product_doc_id>
variant:facet:<facet_id>:<facet_value_id>
variant:price_bucket:<currency>:<bucket>
```

Для same-variant semantics option + price filters intersect в variant space:

```text
matching_variants =
  variant_in_stock
  & variant_facet(color=black)
  & variant_facet(size=42)
  & variant_price_range(currency=UAH, min, max)

matching_products = project_variants_to_products(matching_variants)
```

`project_variants_to_products` - операция projection `variant_doc_id ->
product_doc_id` с дедупликацией product ids.

## Price range

Точный произвольный price range не должен создавать posting list для каждого
возможного значения цены. Нужны price value rows и/или coarse buckets.

Рекомендуемая модель:

- `listing_posting_variant_price` rows с `currency`, `variant_doc_id`,
  `product_doc_id`, `price_minor`;
- B-tree index by `(project_id, index_version, currency, price_minor)`;
- optional coarse price buckets для первичного ограничения.

Price filter:

```text
price_candidates = variants_with_price_between(currency, min, max)
matching_variants = variant_scope & option_filters & price_candidates
```

Price sort:

- без active variant filters использовать product-level sort value
  `product_min_price_minor`;
- с active option/price filters использовать price-index-first path: scan
  `listing_posting_variant_price` в order по `price_minor`, проверять
  membership в `matching_variants` roaring bitmap и дедуплицировать products.

## Sort values

Posting list отвечает на вопрос “какие docs matching”. Для page order нужны
отдельные PostgreSQL sort value rows.

Product sort values:

```text
product_id
in_stock
published_at
product_created_at
manual_rank per category/manual collection scope
name_sort_key per locale
min_price_minor per currency
max_price_minor per currency
rank_score / popularity_score optional
```

Preferred page retrieval shape is sort-first: PostgreSQL идет по sort index в
нужном порядке, а roaring bitmap используется как fast membership check.
Bitmap-iterate-first допустим только когда matches сильно селективны или для
diagnostics, потому что он теряет преимущество B-tree order и может привести к
дорогому `GROUP BY` / `ORDER BY`.

Sort-first query shape:

```sql
SELECT pd.product_id
FROM catalog.listing_posting_product_sort s
JOIN catalog.listing_posting_product_doc pd
  ON pd.project_id = :projectId
 AND pd.index_version = :indexVersion
 AND pd.product_doc_id = s.product_doc_id
WHERE s.project_id = :projectId
  AND s.index_version = :indexVersion
  AND s.sort_kind = :sortKind
  AND rb_contains(:matchesBitmap::roaringbitmap, s.product_doc_id)
ORDER BY
  pd.in_stock DESC,
  s.timestamptz_value DESC NULLS LAST,
  pd.product_id ASC
LIMIT :firstPlusOne;
```

Для cursor pagination cursor хранит sort key values, `product_id`,
`index_version` и filter hash. Pagination использует keyset predicate поверх
тех же sort columns, что и обычный SQL listing pipeline.

### Price sort with option filters

Для `price_asc` / `price_desc` с active option filters сортировка должна идти
от `listing_posting_variant_price`, а не от `rb_iterate(variant_matches)`.
Иначе PostgreSQL сначала развернет весь variant bitmap, затем будет group/sort
по matching variants, и price index не сможет дать ранний ordered scan.

Correct shape:

```text
variant_matches =
  variant_in_stock
  & option_color_black
  & option_size_42
  & price_range?

product_matches =
  category_scope
  & product_facets
  & vendor?
  & in_stock?
```

Then scan variants in price order:

```sql
WITH first_matching_variants AS (
  SELECT
    vp.variant_doc_id,
    vp.product_doc_id,
    vp.price_minor
  FROM catalog.listing_posting_variant_price vp
  WHERE vp.project_id = :projectId
    AND vp.index_version = :indexVersion
    AND vp.currency = :currency
    AND (:minPriceMinor IS NULL OR vp.price_minor >= :minPriceMinor)
    AND (:maxPriceMinor IS NULL OR vp.price_minor <= :maxPriceMinor)
    AND rb_contains(:variantMatchesBitmap::roaringbitmap, vp.variant_doc_id)
    AND rb_contains(:productMatchesBitmap::roaringbitmap, vp.product_doc_id)
    AND (
      :afterPriceMinor IS NULL
      OR (vp.price_minor, vp.product_doc_id) > (:afterPriceMinor, :afterProductDocId)
    )
    AND NOT EXISTS (
      SELECT 1
      FROM catalog.listing_posting_variant_price earlier
      WHERE earlier.project_id = vp.project_id
        AND earlier.index_version = vp.index_version
        AND earlier.currency = vp.currency
        AND earlier.product_doc_id = vp.product_doc_id
        AND (
          earlier.price_minor,
          earlier.variant_doc_id
        ) < (
          vp.price_minor,
          vp.variant_doc_id
        )
        AND rb_contains(
          :variantMatchesBitmap::roaringbitmap,
          earlier.variant_doc_id
        )
    )
  ORDER BY vp.price_minor ASC, vp.product_doc_id ASC, vp.variant_doc_id ASC
  LIMIT :firstPlusOne
)
SELECT pd.product_id, fmv.price_minor AS sort_price_minor
FROM first_matching_variants fmv
JOIN catalog.listing_posting_product_doc pd
  ON pd.project_id = :projectId
 AND pd.index_version = :indexVersion
 AND pd.product_doc_id = fmv.product_doc_id
ORDER BY fmv.price_minor ASC, pd.product_id ASC
LIMIT :firstPlusOne;
```

`NOT EXISTS` делает строку `vp` first matching variant for product. Это важно
для cursor correctness: product не должен повторно появиться на следующей
странице через другую, более дорогую variant. Индекс
`idx_listing_posting_variant_price_product_order` поддерживает lookup earlier
variants for same product.

Для `price_desc` используется тот же shape, но `ORDER BY vp.price_minor DESC`
и inverted comparison в `NOT EXISTS`.

Запрещенный hot-path shape:

```text
rb_iterate(variant_matches) -> join variant_price -> group by product -> order by min/max price
```

Он корректен, но должен оставаться fallback для очень селективных bitmaps,
debugging или случаев, где planner показывает лучший runtime на реальных
данных.

## Execution planner

Query engine должен строить маленький physical plan per request. Один
универсальный SQL shape запрещен для hot storefront path, потому что разные
sort/filter combinations требуют разных leading structures.

Planner inputs:

- cardinality metadata from `listing_posting_bitmap.cardinality`;
- requested sort;
- active product filters;
- active option filters;
- price range;
- whether `totalCount` / facets / virtual facets requested;
- page size and cursor.

Recommended strategy matrix:

| Case | Strategy |
| --- | --- |
| Product filters only, no expensive sort | product bitmap operations + product sort-first |
| Product filters + newest/created/name/manual | product sort table first + `rb_contains(product_matches)` |
| Option filters, no price sort | variant bitmap -> adaptive projection -> product bitmap |
| Option filters + price sort | variant-price-index-first with first matching variant per product |
| Price range only | variant price range scan or coarse price bucket + exact price table |
| Facet counts requested | materialize request bitmaps once, reuse isolated scopes |
| Small bitmap cardinality | bitmap-iterate-first allowed |
| Wide bitmap cardinality + sorted page | sort-index-first required |

Planner must choose intersection order by ascending cardinality for AND groups
and build OR groups before applying cross-facet AND:

```text
brand_group = brand_nike | brand_adidas
material_group = material_leather | material_mesh

product_matches =
  smallest(base_scope, brand_group, material_group, vendor, in_stock)
  & ...
```

The planner stores chosen thresholds in configuration:

```text
small_variant_projection_threshold = 8192
projection_block_size = 4096 or 8192
wide_sort_first_threshold = 50000 product docs
price_sort_full_aggregation_fallback_threshold = project-specific
```

Thresholds must be validated with production-like benchmark data before release.

## Fast collectors

### Product page collector

For product-level sorts, page collector scans the relevant product sort index
and checks membership in final product bitmap:

```text
for row in product_sort_order:
  if product_matches.contains(row.product_doc_id):
    emit row
    stop after firstPlusOne
```

SQL implementation uses the sort table as the leading table and
`rb_contains(:productMatchesBitmap, s.product_doc_id)` as filter.

### Variant price collector

For `price_asc` / `price_desc` with option filters, collector scans
`listing_posting_variant_price` in price order:

```text
for variant_price row in price order:
  if !variant_matches.contains(variant_doc_id): continue
  if !product_matches.contains(product_doc_id): continue
  if row is not first matching variant for product: continue
  emit product
  stop after firstPlusOne
```

This collector avoids full projection and full product aggregation on the hot
page path.

### Facet count collector

Facet counts should not run one independent full query per value. Query engine
builds reusable request bitmaps:

```text
base_product_scope
product_filter_group_by_facet_id
variant_filter_group_by_facet_id
variant_product_projection_all_filters
```

Product facet count:

```text
isolated_product_scope(facet_id) =
  base_product_scope
  & all product filter groups except facet_id
  & project_variants_to_products(all active variant filters)

count(value) =
  cardinality(isolated_product_scope(facet_id) & product_facet_value_bitmap)
```

Option facet count:

```text
isolated_variant_scope(facet_id) =
  variant_in_stock
  & all option filter groups except facet_id
  & active price range bitmap?

value_variants =
  isolated_variant_scope(facet_id) & option_value_bitmap

count(value) =
  cardinality(
    project_variants_to_products(value_variants)
    & product_scope_with_product_filters
  )
```

To avoid repeated broad projection, option count collector chooses per facet:

```text
if isolated_variant_scope is small:
  for each value -> project value_variants
else:
  iterate candidate option value bitmaps by ascending cardinality
  use projection blocks for broad value_variants
```

The collector may cache projected product bitmaps during one request by key:

```text
projection_cache_key =
  index_version + hash(variant_bitmap bytes or normalized expression)
```

This cache is request-local only. It is not a persisted facet count cache and
does not violate the “no precomputed counts” rule.

### Price range virtual facet

Price range virtual facet excludes active price predicate but keeps product
filters, option filters and availability semantics. Fast path is two ordered
index probes:

```sql
-- min price
SELECT vp.price_minor
FROM catalog.listing_posting_variant_price vp
WHERE vp.project_id = :projectId
  AND vp.index_version = :indexVersion
  AND vp.currency = :currency
  AND rb_contains(:variantScopeWithoutPriceBitmap::roaringbitmap, vp.variant_doc_id)
  AND rb_contains(:productScopeBitmap::roaringbitmap, vp.product_doc_id)
ORDER BY vp.price_minor ASC, vp.variant_doc_id ASC
LIMIT 1;

-- max price uses ORDER BY price_minor DESC and desc index
```

Fallback for poor planner behavior is `rb_iterate(variant_scope) -> join price
-> MIN/MAX`, but it is not the preferred hot path.

### In-stock virtual facet

`in_stock` virtual facet excludes active availability toggle but keeps
product-level filters, option filters and price filter. It is computed as:

```text
in_stock_variant_scope =
  variant_in_stock
  & active option filters
  & active price range?

in_stock_count =
  cardinality(
    project_variants_to_products(in_stock_variant_scope)
    & product_scope_without_in_stock_toggle
  )
```

Projection uses the same adaptive projection strategy as option filters.

## Cursor contracts for sort-first paths

All cursors include:

```text
index_version
filter_hash
sort_kind
sort key values
product_id
product_doc_id
```

Product sort cursors use the exact SQL keyset predicate for the selected sort:

```text
(in_stock, sort_value, product_id) after cursor
```

Variant price sort cursors use product-level sort keys:

```text
price_minor
product_doc_id
product_id
```

The price collector must only emit the first matching variant per product, so
the cursor represents product order, not variant row order. If the query cannot
prove first matching variant cheaply for a page, it must fall back to full
aggregation for correctness rather than emitting duplicate or out-of-order
products.

## Query flow

### 1. Build active filter sets

Input:

- project;
- scope: category, collection, global, search candidate set;
- active product facets;
- active option facets;
- price range;
- in_stock toggle;
- vendor;
- sort;
- pagination.

Product-level filters:

```text
product_filter_set =
  base_scope
  & vendor_set?
  & product_facet_group_1_OR
  & product_facet_group_2_OR
  & in_stock_set?
```

OR внутри facet:

```text
brand_set = posting(brand=nike) | posting(brand=adidas)
```

AND между facets:

```text
product_filter_set = base & brand_set & material_set
```

Variant-level filters:

```text
variant_filter_set =
  variant_in_stock
  & option_facet_group_1_OR
  & option_facet_group_2_OR
  & price_range_set?

variant_product_set = project_variants_to_products(variant_filter_set)
```

Final product matches:

```text
matches = product_filter_set & variant_product_set?
```

### 2. totalCount

```text
totalCount = cardinality(matches)
```

Это exact count текущего filtered scope. В отличие от SQL `COUNT(*)`, здесь это
cardinality compressed bitset/posting result.

### 3. page ids

```text
page_docs = topK_by_sort(matches, sort, firstPlusOne, cursor)
page_product_ids = dictionary.product_id(page_docs)
```

Hydration карточек остается отдельным batch pipeline.

### 4. facet counts with isolation

Для каждого configured storefront facet:

```text
isolated_scope(facet_id) =
  base_scope
  & all active product filters except filters with this facet_id
  & all active variant filters except filters with this facet_id
```

Product-level facet counts:

```text
count(value) =
  cardinality(isolated_product_scope & posting(facet_id=value))
```

Option facet counts:

```text
isolated_variant_scope =
  variant_in_stock
  & all active option/price filters except filters with this option facet_id

value_variants =
  isolated_variant_scope & variant_posting(option_facet_id=value)

count(value) =
  cardinality(project_variants_to_products(value_variants) & product_scope)
```

Это сохраняет same-variant semantics и считает products, не variants.

Same-facet alternatives остаются видимыми:

```text
active: color=black

color counts считаются без color=black, но с size/brand/price filters.
size counts считаются с color=black.
```

## Search candidate integration

Текстовый BM25 индекс может вернуть candidate product ids + score. Для posting
engine это отдельный product set:

```text
search_candidates = bitset(product_doc_ids from BM25 result)
matches = search_candidates & listing_filters
```

Relevance sort требует query-dependent score. Он не хранится в posting index.
Search query должен передать candidate rows в CTE или temporary table:

```sql
WITH search_candidates(product_doc_id, relevance_score) AS (
  VALUES
    (:docId1, :score1),
    (:docId2, :score2)
)
SELECT pd.product_id
FROM search_candidates sc
JOIN catalog.listing_posting_product_doc pd
  ON pd.project_id = :projectId
 AND pd.index_version = :indexVersion
 AND pd.product_doc_id = sc.product_doc_id
WHERE sc.product_doc_id IN (
  SELECT rb_iterate(:matches_bitmap::roaringbitmap)
)
ORDER BY pd.in_stock DESC, sc.relevance_score DESC, pd.product_id ASC;
```

## Version lifecycle

Posting index version is immutable after publish. Rebuild or incremental refresh
builds a complete replacement version for affected project:

1. Builder reads current PostgreSQL listing read model.
2. Builder creates `index_version = N + 1` with `status = 'building'`.
3. Builder writes doc dictionaries, posting bitmaps and sort value rows for
   `N + 1`.
4. Builder validates doc counts, required bitmaps, cardinality metadata and sort
   rows.
5. Publish transaction marks old version as `retired` and new version as
   `published`.
6. Cleanup job deletes retired versions after grace period.

На ранней стадии incremental sync может просто rebuild-ить весь project posting
version. Если это станет дорого, можно добавить targeted rebuild для набора
changed products, но publish contract остается тем же: storefront читает одну
immutable published version.

## High-scale incremental refresh

Для проектов с 10+ млн variants full project rebuild на каждое изменение
варианта не является допустимым hot path. Обновление posting index должно
работать как микробатчевый refresh новой версии, построенной из опубликованной
версии и набора changed products.

Published version все равно immutable:

```text
N stays published and read-only
N + 1 is built as replacement version
publish swaps N -> N + 1 atomically
```

Нельзя обновлять `listing_posting_bitmap.bitmap` in-place в published version,
потому что storefront requests уже могли прочитать `index_version = N`, cursor
содержит `index_version`, а bitmap rows, dictionaries, price rows, sort rows и
projection blocks должны быть согласованы между собой.

### Change capture

Canonical catalog events сначала обновляют PostgreSQL listing read model
точечно:

```text
variant option changed
  -> SyncVariantListingIndexScript
  -> variant row + option tokens + parent product aggregate
```

После успешного commit событие добавляется в posting refresh queue:

```text
project_id
reason = variant_option_changed
variant_id
product_id
listing_updated_at / source watermark
```

Очередь coalesce-ит события по `(project_id, product_id)`, потому posting
refresh перестраивает целые product groups: product doc, all product variants,
variant price rows, option postings, product postings, sort values and affected
projection blocks. Если у одного product изменились несколько variants, они
должны попасть в один refresh item.

### Microbatch workflow

Posting refresh workflow runs per project under the same project-scoped lock as
full rebuild:

```text
listing-posting-build:<project_id>
```

Workflow loop:

1. Read current published version `N`.
2. Pull queued changed products up to configured limits:
   `max_changed_products`, `max_changed_variants`, `max_lag_seconds`.
3. Read fresh rows for those products from SQL listing read model.
4. Build delta manifest:
   - changed product ids;
   - changed variant ids;
   - removed product/variant doc ids from version `N`;
   - new or reused doc ids for version `N + 1`;
   - affected product fields/value keys;
   - affected variant fields/value keys;
   - affected price currencies;
   - affected projection block ids.
5. Build replacement rows for `N + 1`.
6. Validate `N + 1`.
7. Atomically publish `N + 1`.

The workflow may keep draining the queue while building, but it must close the
batch at a concrete `source_listing_watermark`. Events after that watermark stay
queued for the next version.

### Segment manifests for high-update projects

For projects with 10+ mln variants and frequent posting-affecting updates, the
target storage model should avoid repeatedly deleting and inserting large
PostgreSQL rows for every refresh. This applies to price, stock, publish state,
category membership, product facets, option facets, facet mappings and deletion
of facet values. PostgreSQL MVCC would keep old row versions until vacuum, so
frequent rewrites of `roaringbitmap` rows, broad
`listing_posting_variant_price` ranges or large facet posting rows would create
table and index bloat.

High-scale refresh should publish a new manifest of immutable segments:

```text
snapshot N:
  segments = [base_001, delta_010, delta_011]
  delete_masks = [mask_010, mask_011]

snapshot N + 1:
  segments = [base_001, delta_010, delta_011, delta_012]
  delete_masks = [mask_010, mask_011, mask_012]
```

Publishing `N + 1` inserts small manifest rows and new delta segment rows. It
does not duplicate `base_001` and does not update published segment rows.

Segment tables are append-only while a segment is active:

```text
listing_posting_segment
listing_posting_segment_manifest
listing_posting_segment_bitmap
listing_posting_segment_variant_price
listing_posting_segment_delete_mask
listing_posting_segment_projection_block
```

Recommended physical storage rules:

- segment rows are inserted once and never updated in place;
- hot updates create delta segment rows plus delete masks for stale product or
  variant docs;
- deleting or remapping a facet value creates tombstones/delete masks for the
  old facet postings and new delta postings for replacement values, rather than
  deleting rows from active segment tables;
- cleanup drops whole retired segments or whole segment partitions after no
  published manifest references them;
- compaction writes a new compacted segment and then retires the old segment set;
- avoid mass `DELETE` from large active tables; prefer partition detach/drop for
  expired segments;
- keep segment id or `(project_id, segment_id)` in the leading key so cleanup is
  physically scoped.

Runtime query resolves the published manifest first and treats its segments as
one logical index:

```text
matches =
  OR(active_segment_postings(field, value_key))
  - OR(active_delete_masks)
```

Collectors combine active segment postings for every field they read:
product facets, option facets, category scopes, availability, price buckets and
price rows. They ignore docs hidden by delete masks. If the number of active
delta segments grows past planner thresholds, background compaction must merge
them before query fan-out becomes too expensive.

Hot update examples:

```text
variant option changed:
  old option doc is hidden by variant delete mask
  new option posting is inserted into a delta segment

product tag/feature changed:
  old product facet doc is hidden by product delete mask
  new product facet posting is inserted into a delta segment

facet value deleted:
  value_key is marked tombstoned for the manifest
  queries ignore the tombstoned value_key
  compaction removes its physical postings later

facet value remapped:
  old value_key is tombstoned or masked for affected docs
  replacement value_key postings are inserted into a delta segment

product unpublished/deleted:
  product_doc_id and all child variant_doc_ids are hidden by delete masks
  compaction removes their old postings later
```

Delete masks can be doc-level or value-key-level:

```text
doc delete mask:
  field/value postings still exist physically,
  but specific product_doc_id / variant_doc_id is hidden.

value tombstone:
  whole field/value_key is hidden for a manifest,
  used for deleted facet values, removed mappings or invalidated handles.
```

This model is closer to Lucene/Elasticsearch: update is represented as
`delete old doc + add new doc in a new segment`, and compaction later rewrites
larger immutable segments. It trades a slightly more complex query planner for
stable PostgreSQL storage behavior under frequent updates.

### Copy-on-write version build

Copy-on-write complete versions are acceptable as a simpler early
implementation or for low-update projects. They are not the preferred hot path
for projects with 10+ mln variants and frequent posting-affecting updates.

For 10+ mln variants, `N + 1` should not recompute every posting from canonical
tables. It should copy or derive unchanged rows from `N` and rebuild only rows
affected by the delta manifest.

Stable doc ids are preferred for unchanged docs:

```text
unchanged product_id keeps product_doc_id from N
unchanged variant_id keeps variant_doc_id from N
new product/variant gets appended doc id
deleted product/variant doc id is absent from live postings in N + 1
```

Doc ids remain version-scoped, so this is an optimization, not an external
contract. If keeping ids stable makes a batch too complex, builder may allocate
new dense ids for `N + 1`, but that path is effectively a broader rebuild and
must be selected deliberately by planner thresholds.

For each affected posting row, builder computes:

```text
new_bitmap =
  (old_bitmap - old_doc_ids_for_changed_products)
  | new_doc_ids_for_changed_products_matching_this_value
```

This applies to product postings and variant postings. Affected rows include
both removed values and added values. Example for option change
`color:red -> color:black`:

```text
variant facet color:red   removes variant_doc_id
variant facet color:black adds variant_doc_id
parent product in_stock / facet / price sort rows may change from aggregates
projection block for variant_doc_id is rebuilt
```

Rows not mentioned by the delta manifest can be referenced from `N + 1` without
decoding the bitmap. For high-scale projects this should be implemented through
segment manifests, not by physically duplicating all unchanged PostgreSQL rows.
Physical duplication is only acceptable for benchmarked small/medium datasets or
one-off rebuild workflows.

### Affected row selection

For `variant_option_changed`, affected data is:

- `listing_posting_variant_doc` row for the changed variant;
- `listing_posting_bitmap` rows for old and new option facet values;
- `listing_posting_bitmap` rows for `variant_product:<product_doc_id>` if the
  variant was created, deleted or moved between products;
- `listing_posting_variant_price` only if option refresh also changed price
  availability inputs;
- `listing_posting_product_doc` and product-level stock/sort rows if parent
  aggregate changed;
- `listing_posting_product_sort` rows for min/max price, stock, newest/manual
  only when the corresponding aggregate/source changed;
- `listing_posting_variant_projection_block` for every block containing changed
  variant doc ids.

If a facet mapping, option handle, category handle, enabled currency or
project-level setting changes, the affected row set may become too broad. In
that case planner must escalate to product-scope, facet-scope or full project
rebuild instead of creating millions of tiny bitmap patches.

### Publish and freshness

Storefront can tolerate eventually consistent posting data, but the refresh
queue must expose SLO-oriented metrics:

```text
oldest_unpublished_listing_update_age_seconds
queued_changed_products
queued_changed_variants
last_published_source_listing_watermark
posting_refresh_versions_built_total
posting_refresh_full_rebuild_fallback_total
```

Recommended SLO policy:

- price and stock changes use small microbatches and short delay;
- option changes may batch for a longer window because they mostly affect
  filtering/facet availability;
- publish/unpublish is priority and should not wait behind large option
  refresh backlog;
- if queue lag exceeds SLO, trigger broader rebuild or temporarily route strict
  reads to SQL listing pipeline.

Storage health metrics are release gates for high-update projects:

```text
active_segment_count
active_delta_segment_count
retired_segment_bytes_waiting_cleanup
posting_table_dead_tuple_ratio
price_table_dead_tuple_ratio
autovacuum_lag_seconds
compaction_queue_lag_seconds
```

If dead tuple ratio or retired bytes exceed configured thresholds, the system
must throttle new refreshes, prioritize compaction/cleanup, or temporarily use
SQL listing fallback for strict reads. A design that depends on frequent updates
or deletes of large active PostgreSQL rows is rejected for the 10+ mln variant
target.

### Full rebuild fallback

Targeted refresh is an optimization, not the only recovery path. The system must
still support full project rebuild for:

- corrupted or missing posting version;
- pg_roaringbitmap compatibility changes;
- dictionary compaction after many deletes;
- broad mapping changes;
- diagnostics mismatch between SQL listing read model and posting version.

Full rebuild uses the same publish contract and replaces the current published
version atomically.

## Atomic publish

Для каждой версии:

```text
building -> published -> retired
```

Только одна `published` версия на project.

Publish steps:

1. Build PostgreSQL rows under temporary version.
2. Validate doc counts, required postings and sort rows.
3. Insert/update version row as `building`.
4. In one transaction:
   - mark old published as retired;
   - mark new version as published with `published_at`.
5. Storefront queries select current published version by `project_id`.

## Consistency model

Posting engine может быть eventually consistent относительно canonical catalog.
Для storefront это приемлемо при явных freshness SLO:

- product publish/unpublish должен попасть в index в пределах заданного окна;
- price/stock changes должны иметь более жесткий SLO;
- full rebuild должен быть доступен per project;
- diagnostics должны сравнивать listing SQL read model и published posting
  version.

Если нужна строгая transactional consistency для конкретной операции, endpoint
может временно читать SQL listing pipeline.

## PostgreSQL roaring operations

Posting lists are stored as `roaringbitmap` values. Runtime query uses
`pg_roaringbitmap` operators/functions:

```text
-- OR inside one facet
brand_set = brand_nike.bitmap | brand_adidas.bitmap

-- AND between facets/scopes
matches = category.bitmap & brand_set & in_stock.bitmap

-- exact count
total_count = rb_cardinality(matches)

-- product ids for hydration/page query
SELECT rb_iterate(matches)
```

Builder creates bitmaps from doc ids:

```sql
INSERT INTO catalog.listing_posting_bitmap (
  project_id,
  index_version,
  entity_type,
  field,
  value_key,
  bitmap,
  cardinality
)
SELECT
  :projectId,
  :indexVersion,
  'product',
  'facet',
  facet_id::text || ':' || facet_value_id::text,
  rb_build_agg(product_doc_id),
  COUNT(*)
FROM resolved_product_docs
GROUP BY facet_id, facet_value_id;
```

The project must verify exact function names against the Neon-provided
`pg_roaringbitmap` version before implementation, because Neon may expose an
older extension version than upstream PGXN.

Required operation contract:

| Capability | Expected use |
| --- | --- |
| build bitmap aggregate | build posting rows from doc ids |
| bitmap AND | intersect scopes/facet groups |
| bitmap OR | OR inside one facet |
| bitmap difference | exclude deleted/retired docs if needed |
| cardinality | `totalCount` and facet counts |
| contains integer | sort-first membership check |
| iterate bitmap | sparse fallback and diagnostics |

If Neon extension lacks a required function/operator, implementation must add a
small compatibility SQL layer with stable internal names, for example
`listing_rb_contains(bitmap, doc_id)`, instead of spreading extension-specific
function names through repositories.

## Benchmark gates

This design should not be implemented without benchmark fixtures that compare
the current SQL listing pipeline and the PostgreSQL roaring pipeline.

Minimum synthetic datasets:

```text
small: 10k products / 50k variants
medium: 100k products / 500k variants
large: 500k products / 2.5M variants
```

Minimum query shapes:

```text
category + no filters + page + totalCount
category + product facets + 50-200 facet value counts
category + option facets + option counts
category + option facets + price_asc
category + option facets + price range virtual facet
search candidates + structured filters + relevance sort
manual collection + manual sort
```

Acceptance criteria must be expressed as latency and rows-read budgets before
release. If `EXPLAIN ANALYZE` shows PostgreSQL doing broad `rb_iterate` +
`GROUP BY` + `ORDER BY` on hot page paths, the query shape is rejected unless
the measured cardinality is below the configured sparse threshold.

## Runtime API внутри catalog service

Внутренний интерфейс engine:

```ts
interface ListingPostingEngine {
  query(input: ListingPostingQuery): Promise<ListingPostingResult>;
  getPublishedVersion(projectId: string): Promise<ListingIndexVersion>;
  rebuildProject(projectId: string): Promise<ListingIndexVersion>;
}
```

Result:

```ts
interface ListingPostingResult {
  indexVersion: string;
  productIds: string[];
  sortKeys: Array<Record<string, unknown>>;
  totalCount?: number;
  facets?: Array<{
    facetId: string;
    values: Array<{ facetValueId: string; count: number }>;
  }>;
  pageInfo: {
    hasNextPage: boolean;
    endCursor?: string;
  };
}
```

## Когда использовать posting engine

Use posting engine для:

- больших category PLP;
- category + facets + totalCount + facet counts;
- option filters с same-variant semantics;
- популярных storefront entry points с high QPS;
- search candidate set + structured filters, если candidate ids можно быстро
  превратить в product bitset.

Use SQL listing pipeline для:

- early implementation;
- admin diagnostics;
- rare edge queries, пока engine не поддерживает нужный shape;
- correctness comparison;
- fallback при недоступной published posting version.

## Trade-offs

Плюсы:

- `totalCount` становится cheap cardinality operation;
- facet isolation counts становятся set intersections;
- page query и counts можно считать из одного matches bitset;
- меньше SQL joins/grouping на hot storefront path;
- compressed set operations остаются внутри PostgreSQL без обязательного
  OpenSearch или отдельного сервиса.

Минусы:

- появляется отдельный PostgreSQL posting index;
- сложнее incremental updates;
- rebuild/publish больших bitmap versions может нагружать PostgreSQL;
- нужно держать SQL read model и posting version согласованными;
- сложнее debug, чем обычный row-based SQL query + `EXPLAIN`.

## Отношение к текущему плану

Текущий SQL listing index остается правильным v1 и source read model:

- он проще;
- легче проверить correctness;
- не требует отдельного posting index;
- подходит для ранней стадии проекта.

Posting-list engine является следующим performance layer. Его не нужно строить
до тех пор, пока SQL `EXPLAIN ANALYZE` и реальные PLP нагрузки не покажут, что
facet counts/totalCount стали bottleneck.

Важно: этот документ не отменяет requirement “не предагрегировать facet
counts”. Posting lists не являются counts. Они являются physical inverted index,
из которого counts считаются runtime set operations.
