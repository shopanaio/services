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
```

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
- с active option/price filters считать `matched_min_price_minor` по
  `matching_variants` и product projection.

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

Query shape:

```sql
WITH matches AS (
  SELECT rb_iterate(:matches_bitmap::roaringbitmap) AS product_doc_id
)
SELECT pd.product_id
FROM matches m
JOIN catalog.listing_posting_product_doc pd
  ON pd.project_id = :projectId
 AND pd.index_version = :indexVersion
 AND pd.product_doc_id = m.product_doc_id
JOIN catalog.listing_posting_product_sort s
  ON s.project_id = :projectId
 AND s.index_version = :indexVersion
 AND s.product_doc_id = m.product_doc_id
 AND s.sort_kind = :sortKind
ORDER BY
  pd.in_stock DESC,
  s.timestamptz_value DESC NULLS LAST,
  pd.product_id ASC
LIMIT :firstPlusOne;
```

Для cursor pagination cursor хранит sort key values, `product_id`,
`index_version` и filter hash. Pagination использует keyset predicate поверх
тех же sort columns, что и обычный SQL listing pipeline.

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
