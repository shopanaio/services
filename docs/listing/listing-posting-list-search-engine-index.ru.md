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
   diagnostics.

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

SQL listing read model остается источником для rebuild и diagnostics. Целевой
storefront read path для category/global/search listing работает через roaring
posting tables; row-based SQL listing pipeline используется как источник данных
и контрольная база для проверки correctness, а не как runtime mode storefront
listing.

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
  PRIMARY KEY (project_id, index_version),
  CONSTRAINT chk_listing_posting_index_version_status
    CHECK (status IN ('building', 'published', 'retired'))
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
  UNIQUE (project_id, index_version, product_id),
  UNIQUE (project_id, index_version, product_doc_id, product_id),
  CONSTRAINT fk_listing_posting_product_doc_version
    FOREIGN KEY (project_id, index_version)
    REFERENCES catalog.listing_posting_index_version(project_id, index_version)
    ON DELETE CASCADE
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
  UNIQUE (project_id, index_version, variant_id),
  UNIQUE (
    project_id,
    index_version,
    variant_doc_id,
    product_doc_id,
    product_id
  ),
  CONSTRAINT fk_listing_posting_variant_doc_version
    FOREIGN KEY (project_id, index_version)
    REFERENCES catalog.listing_posting_index_version(project_id, index_version)
    ON DELETE CASCADE,
  CONSTRAINT fk_listing_posting_variant_doc_product
    FOREIGN KEY (project_id, index_version, product_doc_id, product_id)
    REFERENCES catalog.listing_posting_product_doc(
      project_id,
      index_version,
      product_doc_id,
      product_id
    )
    ON DELETE CASCADE
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
  CONSTRAINT fk_listing_posting_bitmap_version
    FOREIGN KEY (project_id, index_version)
    REFERENCES catalog.listing_posting_index_version(project_id, index_version)
    ON DELETE CASCADE,
  CONSTRAINT chk_listing_posting_bitmap_entity_type
    CHECK (entity_type IN ('product', 'variant'))
);
```

`field` и `value_key` должны быть стабильными internal keys, например:

```text
field=scope_category, value_key=<category_id>
field=scope_collection, value_key=<collection_id>
field=vendor, value_key=<vendor_id>
field=in_stock, value_key=true
field=facet, value_key=<facet_id>:<facet_value_id>
field=variant_product, value_key=<product_doc_id>
field=variant_price_bucket:UAH, value_key=<bucket>
```

Use canonical ids or typed normalized values for `value_key` on the read path.
Mutable storefront handles are acceptable only as source read-model/debug data.
If a value key has multiple parts, encode it with a deterministic typed format
that cannot collide with ids or delimiters.

### Sort values

Sorting остается SQL responsibility. Posting bitmap отвечает на вопрос “какие
docs matching”, а page order строится по sort value tables.

```sql
CREATE TABLE catalog.listing_posting_product_sort (
  project_id             uuid NOT NULL,
  index_version          bigint NOT NULL,
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
    index_version,
    product_doc_id,
    sort_kind,
    locale,
    currency,
    manual_scope_id
  ),
  CONSTRAINT fk_listing_posting_product_sort_doc
    FOREIGN KEY (project_id, index_version, product_doc_id, product_id)
    REFERENCES catalog.listing_posting_product_doc(
      project_id,
      index_version,
      product_doc_id,
      product_id
    )
    ON DELETE CASCADE
);

CREATE INDEX idx_listing_posting_product_sort_newest
  ON catalog.listing_posting_product_sort (
    project_id,
    index_version,
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
    product_id
  )
  INCLUDE (product_doc_id);
```

The generic table is acceptable for the first benchmark implementation, but hot
storefront sorts must have dedicated typed tables or dedicated covering indexes
once the supported sort set is finalized. At minimum benchmark newest, created,
name, manual, min price and max price as separate sort shapes before release.
Manual category/collection order is scope-specific, so it must use
`manual_scope_id` and must not be modeled as one global product sort value.

`product_id` is duplicated in sort rows so hot sort-first queries can keep the
required stable `product_id ASC` tie-breaker inside the leading sort index.
For every storefront product sort, `bool_value` stores the availability bucket
(`in_stock`) and must be populated; rows with `bool_value IS NULL` are not valid
for hot storefront page collectors.

Hot sort-first collectors read `product_doc_id` for bitmap membership checks.
Sort indexes used by those collectors must be covering indexes for the selected
sort shape, either by making `product_doc_id` part of the key or by
`INCLUDE (product_doc_id)`. A sort shape is not accepted for the hot path until
its exact `WHERE`, keyset predicate and `ORDER BY` are backed by a matching
covering index. The generic multi-value index is only a development and
diagnostic aid; production sort shapes require explicit covering indexes.

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
  product_id             uuid NOT NULL,
  price_minor            bigint NOT NULL,
  PRIMARY KEY (project_id, index_version, currency, variant_doc_id),
  CONSTRAINT fk_listing_posting_variant_price_doc
    FOREIGN KEY (
      project_id,
      index_version,
      variant_doc_id,
      product_doc_id,
      product_id
    )
    REFERENCES catalog.listing_posting_variant_doc(
      project_id,
      index_version,
      variant_doc_id,
      product_doc_id,
      product_id
    )
    ON DELETE CASCADE
);

CREATE INDEX idx_listing_posting_variant_price_range
  ON catalog.listing_posting_variant_price (
    project_id,
    index_version,
    currency,
    price_minor,
    product_id,
    variant_doc_id,
    product_doc_id
  );

CREATE INDEX idx_listing_posting_variant_price_desc
  ON catalog.listing_posting_variant_price (
    project_id,
    index_version,
    currency,
    price_minor DESC,
    product_id,
    variant_doc_id,
    product_doc_id
  );

CREATE INDEX idx_listing_posting_variant_price_product_order
  ON catalog.listing_posting_variant_price (
    project_id,
    index_version,
    currency,
    product_id,
    price_minor,
    variant_doc_id,
    product_doc_id
  );
```

### Variant projection blocks

Variant filters produce `variant_doc_id` bitmaps, while storefront results and
facet counts are product-level. Projection `variant bitmap -> product bitmap`
must have a fast path; blindly expanding every variant with
`listing_rb_iterate` is only acceptable for small cardinality bitmaps.

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
  PRIMARY KEY (project_id, index_version, block_id),
  CONSTRAINT fk_listing_posting_variant_projection_block_version
    FOREIGN KEY (project_id, index_version)
    REFERENCES catalog.listing_posting_index_version(project_id, index_version)
    ON DELETE CASCADE
);
```

Posting version tables do not reference canonical product/variant/facet tables
directly. Their source of truth is the SQL listing read model at a concrete
watermark. FK constraints stay inside one `(project_id, index_version)` and
protect the published version from orphan dictionary, bitmap, sort, price and
projection rows. If segment storage removes some FKs for write throughput, it
must replace them with an explicit build validator before publish.

Recommended block size: 4096 or 8192 variant docs. Builder creates one row per
contiguous `variant_doc_id` range. Query strategy:

```text
if cardinality(variant_bitmap) <= small_threshold:
  listing_rb_iterate(variant_bitmap)
    -> join variant_doc
    -> listing_rb_build_agg(product_doc_id)

else:
  for each projection block where variant_bitmap intersects block.variant_bitmap:
    block_match = variant_bitmap & block.variant_bitmap
    if cardinality(block_match) == block.variant_count:
      use block.product_bitmap
    else:
      listing_rb_iterate(block_match)
        -> join variant_doc
        -> listing_rb_build_agg(product_doc_id)
  OR all projected product bitmaps
```

`block.product_bitmap` is exact only when `block_match` covers every variant in
the block. A “near full” block must still use the partial path; otherwise a
product whose only matching variant is outside `block_match` can become a false
positive in `totalCount`, facet counts or page results. A broad block-level
product bitmap may be used as a prefilter only if every emitted product is later
validated against the exact `variant_doc_id -> product_doc_id` mapping before it
affects externally visible results.

This keeps sparse option filters cheap while avoiding full variant expansion for
broad filters where whole blocks match exactly. Thresholds are planner
parameters, not hard product semantics.

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
  PRIMARY KEY (project_id, index_version, entity_type, field, value_key),
  CONSTRAINT fk_listing_posting_bitmap_version
    FOREIGN KEY (project_id, index_version)
    REFERENCES catalog.listing_posting_index_version(project_id, index_version)
    ON DELETE CASCADE,
  CONSTRAINT chk_listing_posting_bitmap_entity_type
    CHECK (entity_type IN ('product', 'variant'))
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
scope:category:<category_id>
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
category=<category_id> -> product_doc_ids
```

Это позволяет начинать PLP с cheap base set:

```text
base = project_published & category_<category_id>
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
  `product_doc_id`, `product_id`, `price_minor`;
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
  `listing_posting_variant_price` в order по `price_minor`, применять exact
  price bounds в price table scan, проверять membership в option/availability
  variant bitmap и дедуплицировать products.

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
SELECT s.product_id
FROM catalog.listing_posting_product_sort s
WHERE s.project_id = :projectId
  AND s.index_version = :indexVersion
  AND s.sort_kind = :sortKind
  AND s.locale = :localeKey
  AND s.currency = :currencyKey
  AND s.manual_scope_id = :manualScopeId
  AND s.bool_value IS NOT NULL
  AND listing_rb_contains(:matchesBitmap::roaringbitmap, s.product_doc_id)
ORDER BY
  s.bool_value DESC,
  s.timestamptz_value DESC NULLS LAST,
  s.timestamptz_value_2 DESC NULLS LAST,
  s.product_id ASC
LIMIT :firstPlusOne;
```

For `newest`, `timestamptz_value` is `published_at` and
`timestamptz_value_2` is `product_created_at`. For `created`,
`timestamptz_value` is `product_created_at` and `timestamptz_value_2` stays
`NULL`. If a sort needs more than the generic slots can express cleanly, it must
use a dedicated typed table or dedicated query shape rather than overloading
unrelated columns.

Для cursor pagination cursor хранит sort key values, `product_id`,
`product_doc_id`, `index_version` и filter hash. Pagination использует keyset
predicate поверх тех же sort columns, что и обычный SQL listing pipeline.
For sort kinds that do not use locale, currency or manual scope, the query must
pass the same default values that are stored in the sort table (`''`, `''` and
the zero UUID). Query builders must always constrain these discriminator columns
instead of relying only on `sort_kind`.

### Price sort with option filters

Для `price_asc` / `price_desc` с active option filters сортировка должна идти
от `listing_posting_variant_price`, а не от
`listing_rb_iterate(variant_matches)`.
Иначе PostgreSQL сначала развернет весь variant bitmap, затем будет group/sort
по matching variants, и price index не сможет дать ранний ordered scan.

Correct shape:

```text
variant_matches =
  variant_in_stock
  & option_color_black
  & option_size_42

product_matches =
  category_scope
  & product_facets
  & vendor?
  & in_stock?
```

Exact price predicates stay in the ordered `listing_posting_variant_price` scan.
They are not hidden inside `variant_matches`, because the collector and the
`NOT EXISTS` first-variant check must use the same exact price bounds.

Then scan variants in price order:

```sql
WITH first_matching_variants AS (
  SELECT
    vp.variant_doc_id,
    vp.product_doc_id,
    vp.product_id,
    vp.price_minor
  FROM catalog.listing_posting_variant_price vp
  WHERE vp.project_id = :projectId
    AND vp.index_version = :indexVersion
    AND vp.currency = :currency
    AND (:minPriceMinor IS NULL OR vp.price_minor >= :minPriceMinor)
    AND (:maxPriceMinor IS NULL OR vp.price_minor <= :maxPriceMinor)
    AND listing_rb_contains(
      :variantMatchesBitmap::roaringbitmap,
      vp.variant_doc_id
    )
    AND listing_rb_contains(
      :productMatchesBitmap::roaringbitmap,
      vp.product_doc_id
    )
    AND (
      :afterPriceMinor IS NULL
      OR (vp.price_minor, vp.product_id) > (:afterPriceMinor, :afterProductId)
    )
    AND NOT EXISTS (
      SELECT 1
      FROM catalog.listing_posting_variant_price earlier
      WHERE earlier.project_id = vp.project_id
        AND earlier.index_version = vp.index_version
        AND earlier.currency = vp.currency
        AND earlier.product_id = vp.product_id
        AND (:minPriceMinor IS NULL OR earlier.price_minor >= :minPriceMinor)
        AND (:maxPriceMinor IS NULL OR earlier.price_minor <= :maxPriceMinor)
        AND (
          earlier.price_minor,
          earlier.variant_doc_id
        ) < (
          vp.price_minor,
          vp.variant_doc_id
        )
        AND listing_rb_contains(
          :variantMatchesBitmap::roaringbitmap,
          earlier.variant_doc_id
        )
    )
  ORDER BY vp.price_minor ASC, vp.product_id ASC, vp.variant_doc_id ASC
  LIMIT :firstPlusOne
)
SELECT
  fmv.product_id,
  fmv.product_doc_id,
  fmv.price_minor AS sort_price_minor
FROM first_matching_variants fmv
ORDER BY fmv.price_minor ASC, fmv.product_id ASC
LIMIT :firstPlusOne;
```

`NOT EXISTS` делает строку `vp` first matching variant for product. Это важно
для cursor correctness: product не должен повторно появиться на следующей
странице через другую, более дорогую variant. Индекс
`idx_listing_posting_variant_price_product_order` поддерживает lookup earlier
variants for same product. Price range predicates must be repeated inside
`NOT EXISTS`; otherwise a cheaper variant outside the requested range could
incorrectly hide the first matching variant inside the range.

Для `price_desc` используется тот же shape, но `ORDER BY vp.price_minor DESC`,
desc index, инвертированный keyset predicate и инвертированное сравнение в
`NOT EXISTS`.

Запрещенный hot-path shape:

```text
listing_rb_iterate(variant_matches)
  -> join variant_price
  -> group by product
  -> order by min/max price
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
| Product filters + newest/created/name/manual | product sort table first + `listing_rb_contains(product_matches)` |
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
`listing_rb_contains(:productMatchesBitmap, s.product_doc_id)` as filter.

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
  AND listing_rb_contains(
    :variantScopeWithoutPriceBitmap::roaringbitmap,
    vp.variant_doc_id
  )
  AND listing_rb_contains(:productScopeBitmap::roaringbitmap, vp.product_doc_id)
ORDER BY vp.price_minor ASC, vp.product_id ASC, vp.variant_doc_id ASC
LIMIT 1;

-- max price uses ORDER BY price_minor DESC and desc index
```

Fallback for poor planner behavior is
`listing_rb_iterate(variant_scope) -> join price -> MIN/MAX`, but it is not the
preferred hot path.

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
(in_stock, sort_value_1, sort_value_2?, product_id) after cursor
```

Variant price sort cursors use product-level sort keys:

```text
price_minor
product_id
product_doc_id
```

The price collector must only emit the first matching variant per product, so
the cursor represents product order, not variant row order. `product_doc_id` is
carried for version-scoped validation and diagnostics, but it is not part of the
price sort key unless the SQL `ORDER BY` and keyset predicate also include it. If
the query cannot prove first matching variant cheaply for a page, it must fall
back to full aggregation for correctness rather than emitting duplicate or
out-of-order products.

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
WHERE listing_rb_contains(:matchesBitmap::roaringbitmap, sc.product_doc_id)
ORDER BY pd.in_stock DESC, sc.relevance_score DESC, pd.product_id ASC;
```

`VALUES` CTE is only acceptable for small candidate sets or page preselection.
For exact `totalCount` and facet counts on broad search results, BM25 search
must materialize the full candidate relation for the normalized query into a
request-scoped structure before listing filters run:

```text
search_candidate(product_doc_id, relevance_score)
  primary key product_doc_id
  scoped by project_id, index_version, locale/search visibility context

search_candidates_bitmap =
  listing_rb_build_agg(search_candidate.product_doc_id)
```

The physical form can be a PostgreSQL temporary table, an unlogged
request-scoped table keyed by request id, or another benchmarked relation that
lets PostgreSQL join by `product_doc_id` and build the candidate bitmap without
shipping all ids through application memory. The implementation must define
cleanup, row-count limits and fallback behavior for this relation before
enabling exact search facets on large catalogs.

For exact `totalCount` and facet counts, `search_candidates` must represent the
full BM25 result set for the normalized query inside project, locale and
visibility scope. Passing only top-K/top-N candidates is allowed only for a
separate page preselection optimization after exact totals and facet semantics
are preserved by the full candidate relation.

## Refresh lifecycle

Posting index version is immutable after publish. Любое обновление строит новый
published snapshot для affected project из текущей published version и
микробатча changed products. Storefront всегда читает одну immutable published
version; published bitmap, dictionary, price, sort и projection rows не
обновляются in-place.

Published version contract:

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

### Segment manifests

The target storage model avoids repeatedly deleting and inserting large
PostgreSQL rows for refresh. This applies to price, stock, publish state,
category membership, product facets, option facets, facet mappings and deletion
of facet values. PostgreSQL MVCC keeps old row versions until vacuum, so
frequent rewrites of `roaringbitmap` rows, broad
`listing_posting_variant_price` ranges or large facet posting rows would create
table and index bloat.

Refresh publishes a new manifest of immutable segments:

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

### Delta version build

`N + 1` does not recompute every posting from canonical tables. It derives
unchanged rows from `N` through the segment manifest and rebuilds only rows
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
decoding the bitmap. This is implemented through segment manifests, not by
physically duplicating all unchanged PostgreSQL rows.

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
posting_refresh_full_rebuild_recovery_total
```

Recommended SLO policy:

- price and stock changes use small microbatches and short delay;
- option changes may batch for a longer window because they mostly affect
  filtering/facet availability;
- publish/unpublish is priority and should not wait behind large option
  refresh backlog;
- if queue lag exceeds SLO, trigger broader rebuild or reject strict reads until
  the posting version catches up to the required watermark.

Storage health metrics are release gates:

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
must throttle new refreshes, prioritize compaction/cleanup, or reject strict
reads until storage health returns under thresholds. A design that depends on
frequent updates or deletes of large active PostgreSQL rows is rejected.

### Full rebuild recovery

Microbatch refresh is the normal update path, but the system must support full
project rebuild for:

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

1. Reserve `index_version = N + 1` and insert version row as `building`.
2. Build PostgreSQL child rows under that `building` version.
3. Validate doc counts, required postings, FK integrity and sort rows.
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
должен проверить `source_listing_watermark` published posting version и либо
дождаться свежей версии, либо вернуть явную consistency error. Storefront
listing не переключается на row-based SQL path как нормальный runtime mode.

## PostgreSQL roaring operations

Posting lists are stored as `roaringbitmap` values. Runtime code must call
project-owned compatibility wrappers, not raw `pg_roaringbitmap`
operator/function names. The wrappers are created after verifying the exact
extension version available in the target PostgreSQL provider.

```text
-- OR inside one facet
brand_set = listing_rb_or(brand_nike.bitmap, brand_adidas.bitmap)

-- AND between facets/scopes
matches = listing_rb_and_many(category.bitmap, brand_set, in_stock.bitmap)

-- exact count
total_count = listing_rb_cardinality(matches)

-- product ids for hydration/page query
SELECT listing_rb_iterate(matches)
```

Builder creates bitmaps from doc ids:

```sql
WITH built_product_facets AS (
  SELECT
    facet_id,
    facet_value_id,
    listing_rb_build_agg(product_doc_id) AS bitmap
  FROM resolved_product_docs
  GROUP BY facet_id, facet_value_id
)
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
  bitmap,
  listing_rb_cardinality(bitmap)
FROM built_product_facets;
```

`cardinality` metadata must match the actual compressed bitmap. Do not use raw
`COUNT(*)` unless the builder has already proven that the input doc ids are
deduplicated for that posting row; merged source mappings can otherwise inflate
planner cardinality estimates.

The implementation must verify exact function names against the Neon-provided
`pg_roaringbitmap` version before writing migrations, because Neon may expose an
older extension version than upstream PGXN. This verification is a release gate,
not a runtime fallback.

Required operation contract:

| Capability | Internal wrapper | Expected use |
| --- | --- | --- |
| build bitmap aggregate | `listing_rb_build_agg(int)` | build posting rows from doc ids |
| bitmap AND | `listing_rb_and(a, b)` / `listing_rb_and_many(...)` | intersect scopes/facet groups |
| bitmap OR | `listing_rb_or(a, b)` or internal operator | OR inside one facet |
| bitmap difference | `listing_rb_and_not(a, b)` | exclude deleted/retired docs if needed |
| cardinality | `listing_rb_cardinality(bitmap)` | `totalCount` and facet counts |
| contains integer | `listing_rb_contains(bitmap, doc_id)` | sort-first membership check |
| iterate bitmap | `listing_rb_iterate(bitmap)` | sparse fallback and diagnostics |

If the extension lacks a required function/operator, implementation must either
add the compatibility SQL layer with the stable names above or reject the
posting-engine migration for that environment. Repositories and query builders
must never spread provider-specific `rb_*` names directly.

## Benchmark gates

This design should not be implemented without benchmark fixtures that compare
the SQL listing read-model baseline and the PostgreSQL roaring pipeline.

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
release. If `EXPLAIN ANALYZE` shows PostgreSQL doing broad
`listing_rb_iterate` + `GROUP BY` + `ORDER BY` on hot page paths, the query
shape is rejected unless the measured cardinality is below the configured sparse
threshold.

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

## Runtime ownership

Posting engine is the storefront listing read path for:

- category PLP;
- manual and rule collection PLP;
- global catalog listing;
- search candidate set + structured filters;
- totalCount, facet counts and virtual facets;
- option filters with same-variant semantics;
- deterministic cursor pagination and sort.

SQL listing read model remains the source for rebuild, diagnostics and
correctness comparison. It is not a separate storefront architecture mode and is
not used as the normal runtime path when posting engine is enabled.

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

## Итоговая архитектурная позиция

Этот документ описывает одну целевую архитектуру storefront listing:
PostgreSQL roaring posting index поверх SQL listing read model. SQL listing
tables остаются canonical read model для построения posting snapshots,
diagnostics и benchmark comparison. Storefront listing semantics определяются
posting engine: filtering, totalCount, facet counts, virtual facets, sorting,
pagination and search candidate integration.

Важно: этот документ не отменяет requirement “не предагрегировать facet
counts”. Posting lists не являются counts. Они являются physical inverted index,
из которого counts считаются runtime set operations.
