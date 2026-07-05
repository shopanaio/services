# План рефакторинга listing page query на быстрый collector

Дата: 2026-07-03

## Контекст

Текущий performance report:

```text
services/listing/docs/draft/listing-price-facet-10k-performance-report.ru.md
```

показывает, что `listing:page` занимает 2.5-4.5s на dataset из 10 000
products:

```text
Run 1: 3951.989 ms
Run 2: 4509.626 ms
Run 3: 3064.968 ms
Run 4: 3761.895 ms
Run 5: 2527.365 ms
```

Это не ожидаемое поведение. Для full listing response тяжелой веткой может быть
`listing:facetCounts`, но page branch должен быть bounded by requested page
size and overfetch, а не выполнять full aggregate-style computation.

## Проблема

Runtime page compiler сейчас использует общий `compileCoreListingSql(...)`:

```text
input
resolved_facets
scope
filters
matches
```

Для `price_asc` / `price_desc` при active option filters или active price filter
page branch выбирает `matched_variant_price`, но физически делает тяжелый SQL
path:

```text
variant_filters
-> projected_variant_products
-> matches
-> variant_price_candidates
-> DISTINCT ON (product_id)
-> final ORDER BY price
-> LIMIT first + 1
```

Главные проблемы:

1. Page query строит `projected_variant_products`, хотя page collector может
   проверять product membership напрямую по lightweight product base bitmap.
2. Page query создает full `variant_price_candidates` relation.
3. `DISTINCT ON (product_id)` меняет leading order на `product_id`, вынуждая
   PostgreSQL дедуплицировать весь candidate set до финального `LIMIT`.
4. `LIMIT first + 1` применяется слишком поздно.
5. Page query использует `variant_listing_price_index`, хотя для hot path уже
   существует typed ordered table:

```text
listing.listing_posting_variant_price
```

с индексами:

```text
idx_listing_posting_variant_price_range
idx_listing_posting_variant_price_desc
idx_listing_posting_variant_price_product_order
```

## Цель

Сделать `listing:page` быстрым и bounded:

```text
page latency зависит от first, overfetch chunks и selectivity;
page не строит full aggregate matches;
facet counts / totalCount / virtual facets остаются full-scope branches.
```

Target для representative 10k dataset:

```text
Query A page p95: <= 45ms
No temp file spill
No full candidate dedupe before LIMIT
Stable cursor pagination
Correct same-variant option + price semantics
```

## Non-goals

В этом рефакторинге не нужно:

- менять semantics facet counts;
- ускорять `listing:facetCounts`;
- менять public GraphQL contract;
- добавлять cache, Redis, materialized views, новые precomputed tables;
- менять sync model listing index;
- удалять aggregate branches;
- запускать page query от `totalCount` или counts results.

## Семантика page rows

Page collector возвращает:

```text
product_doc_id
product_id
in_stock
sort keys
matched variant_doc_id, если collector = matched_variant_price
matched price_minor, если collector = matched_variant_price
```

`hasNextPage` считается через `first + 1` overfetch.

Hydration карточек товара остается отдельным batch pipeline after page ids.

## Collector choice

Page branch должен выбирать collector так:

```text
relevance sort
  -> relevance page collector

price_asc / price_desc without variant-level predicates
  -> product_sort collector

price_asc / price_desc with active option/price/scope variant predicates
  -> matched_variant_price collector

manual / newest / created / name
  -> product_sort collector
```

Variant-level predicates:

```text
active option facet filters
active price filter
rule/scope variant filters
active in-stock variant predicate
```

## Required filter model

Page branch still needs normalized filters, but it must split them into cheap
page-specific bitmaps.

### Product base bitmap

Product base bitmap:

```text
product_base =
  scope_products
  & published_products
  & product_filters
```

Where `product_filters` includes:

```text
product facet filters
vendor filters
product-level stock filter only when it is valid to apply at product level
```

For matched variant price collector, product base must not include
`projected_variant_products`. Variant predicates are checked against
`variant_doc_id` directly.

### Variant match bitmap

Variant match bitmap:

```text
variant_match =
  option_filter_groups
  & price_variant_filter
  & in_stock_variants
  & scope_variant_filters
```

Rules:

- OR inside one option `facet_id`;
- AND between different option `facet_id`;
- price filter intersects on the same `variant_doc_id`;
- out-of-stock variants do not participate in option filters, price filters or
  matched variant price sort;
- missing posting row is empty bitmap, not no-op.

If there are no variant-level predicates, matched variant price collector is not
needed.

## Fast matched variant price algorithm

Use `listing.listing_posting_variant_price` as the ordered source.

For `price_asc`:

```text
ORDER BY price_minor ASC, product_id ASC, variant_doc_id ASC
```

For `price_desc`:

```text
ORDER BY price_minor DESC, product_id ASC, variant_doc_id ASC
```

The collector reads ordered chunks, checks membership, deduplicates products in
application code, and stops once `first + 1` unique products are collected.

Pseudo-flow:

```text
cursor = decoded listing cursor or null
seenProductIds = set()
rows = []

while rows.length < first + 1 and chunkCount < maxChunks:
  chunk = select next ordered variant price rows
    where store_id = :storeId
      and currency = :currency
      and keyset > cursor/progress
      and price range predicate if active
    order by price keys
    limit chunkSize

  if chunk is empty:
    break

  for each row in chunk:
    if variant_match does not contain row.variant_doc_id:
      continue
    if product_base does not contain row.product_doc_id:
      continue
    if seenProductIds has row.product_id:
      continue

    add row
    seenProductIds.add(row.product_id)

    if rows.length == first + 1:
      break

  progress = last row from chunk by physical ordered source
```

This keeps `LIMIT` close to ordered index access and avoids full SQL
deduplication.

## SQL shape for chunk fetch

Each chunk query should be simple and index-friendly:

```sql
WITH
input AS (...),
product_base AS (...),
variant_match AS (...)
SELECT
  vp.product_doc_id,
  vp.product_id,
  vp.variant_doc_id,
  vp.price_minor
FROM listing.listing_posting_variant_price vp
CROSS JOIN product_base pb
CROSS JOIN variant_match vm
WHERE vp.store_id = (SELECT store_id FROM input)
  AND vp.currency = (SELECT currency FROM input)
  AND vm.bitmap @> vp.variant_doc_id
  AND pb.bitmap @> vp.product_doc_id
  -- optional active price filter, duplicated as index range predicate:
  -- AND vp.price_minor >= :minPriceMinor
  -- AND vp.price_minor <= :maxPriceMinor
  AND (
    -- keyset progress predicate
  )
ORDER BY
  vp.price_minor ASC,
  vp.product_id ASC,
  vp.variant_doc_id ASC
LIMIT :chunkSize;
```

Important: the price filter must exist both:

1. inside `variant_match`, to preserve same-variant semantics with options;
2. as `vp.price_minor` range predicate, to let PostgreSQL use the price index.

## Cursor model

Matched variant price cursor payload must include:

```text
sort = price_asc | price_desc
productId
variantDocId
priceMinor
filterHash
```

For `price_asc`, client cursor seek:

```text
price_minor > cursor.priceMinor
OR (
  price_minor = cursor.priceMinor
  AND (
    product_id > cursor.productId
    OR (
      product_id = cursor.productId
      AND variant_doc_id > cursor.variantDocId
    )
  )
)
```

For `price_desc`, use `price_minor < cursor.priceMinor` for the first
comparison and keep the same stable tie-breakers.

Internal chunk progress uses the last physical scanned row, not the last
accepted product row. This avoids re-reading rejected rows between chunks.

Client-visible cursor uses the accepted page row.

## Deduplication rule

Deduplicate by `product_id` within one page request.

For a product with many matching variants:

- `price_asc` returns the lowest matching priced variant;
- `price_desc` returns the highest matching priced variant;
- tie-breaker is `variant_doc_id ASC`;
- once a product is accepted, later variants of the same product are ignored.

Because the physical scan is ordered by price first, the first accepted variant
for each product is the correct matched variant for that page order.

## Safety guard and fallback

Initial implementation should keep a SQL fallback for diagnostics:

```text
LISTING_MATCHED_PRICE_PAGE_COLLECTOR=chunked | sql_fallback
```

Default target after validation:

```text
chunked
```

Fallback may use current SQL shape or anti-join reference shape, but fallback is
not the performance target.

Guardrails:

```text
maxChunks per request
chunkSize default
maxScannedRows per request
debug metric for accepted/rejected/scanned rows
```

Suggested initial values:

```text
chunkSize = max(first * 8, 128)
maxChunks = 16
maxScannedRows = 4096
```

If max scan budget is exhausted before `first + 1`, return collected rows with a
diagnostic metric. Do not silently switch to wrong semantics.

## Metrics

Add per-page collector metrics:

```text
collectorKind
pageSize
chunkSize
chunksRead
rowsScanned
rowsRejectedByVariantBitmap
rowsRejectedByProductBitmap
rowsRejectedByDedup
rowsAccepted
durationMs
fallbackUsed
hasNextPage
```

Keep existing branch metrics:

```text
listing:page
listing:totalCount
listing:facetsMetadata
listing:facetCounts
listing:virtualFacets
```

## Refactoring strategy

Нельзя чинить это как локальный SQL hack внутри `compilePageQuerySql`.
Грамотный рефакторинг должен убрать саму причину: branch compilers сейчас
получают не plan, а raw request, и поэтому переиспользуют слишком широкий
`compileCoreListingSql(...)`.

Нужен промежуточный `ListingQueryPlan`, который один раз классифицирует request
и явно описывает, какие logical bitmaps нужны каждой ветке.

```ts
interface ListingQueryPlan {
  input: ListingInputPlan;
  scope: ScopePlan;
  productFilters: ProductFilterPlan;
  variantFilters: VariantFilterPlan;
  collectors: {
    page: PageCollectorPlan;
    totalCount: CountPlan;
    facetsMetadata: FacetsMetadataPlan;
    virtualFacets: VirtualFacetsPlan;
    facetCounts: FacetCountsPlan;
  };
}
```

Branch compiler must not decide dependencies by importing a shared CTE graph.
It must receive a branch plan with a minimal dependency set.

## Branch dependency contracts

### Page branch

Allowed dependencies:

```text
facet resolution guard
scope product bitmap
published product bitmap
product filter bitmap
variant match bitmap only for matched variant price
ordered source table for selected collector
```

Forbidden dependencies:

```text
matches
projected_variant_products
facet candidate discovery
facet count isolation
virtual facet aggregation
```

### Total count branch

Allowed dependencies:

```text
facet resolution guard
full product matches
variant->product projection when variant filters are active
```

Forbidden dependencies:

```text
page collector CTEs
facet metadata discovery
facet count isolation
virtual facet aggregation
```

### Facets metadata branch

Allowed dependencies:

```text
facet resolution guard
scope product bitmap
scope variant bitmap when rule/scope variant restrictions exist
catalog facet metadata
```

Forbidden dependencies:

```text
active listing filters
full matches
projected_variant_products from active filters
facet counts
price range
in-stock aggregation
```

Metadata should describe available storefront facets for the current scope.
Counts decide what is non-zero under active filters. Metadata query should not
scan active-filter matches.

### Virtual facets branch

Allowed dependencies:

```text
facet resolution guard
product base without isolated virtual facet
variant filters without isolated virtual facet
typed price source
projection blocks for variant->product where needed
```

Forbidden dependencies:

```text
page collector CTEs
facet metadata discovery
facet count candidate expansion
```

## Refactoring steps

### Step 1. Introduce ListingQueryPlan

Add a pure planner after request normalization:

```text
ResolvedListingRequest -> ListingQueryPlan
```

The planner should classify:

- active product-level filters;
- active option filters grouped by `facet_id`;
- active price filter;
- active stock filter;
- whether variant-level predicates exist;
- selected page collector;
- which branches need variant->product projection.

Acceptance:

- branch compilers no longer inspect raw GraphQL-ish filter structures;
- collector choice is computed once;
- branch dependency list is visible in one place.

### Step 2. Replace compileCoreListingSql with explicit fragments

Keep low-level fragment builders, but remove `compileCoreListingSql(...)` from
branch compilers.

New fragments should be composable by need:

```text
compileInputSql(plan)
compileFacetResolutionGuardSql(plan)
compileScopeProductBitmapSql(plan)
compilePublishedProductBitmapSql(plan)
compileProductFilterBitmapSql(plan)
compileOptionVariantFilterBitmapSql(plan)
compilePriceVariantFilterBitmapSql(plan)
compileInStockVariantBitmapSql(plan)
compileVariantMatchBitmapSql(plan)
compileVariantProjectionSql(...)
compileFullProductMatchesSql(...)
```

Acceptance:

- page compiler cannot accidentally include `fullProductMatches`;
- metadata compiler cannot accidentally include active filters;
- virtual facets can isolate price/stock without rebuilding unrelated branches.

### Step 3. Refactor page branch to collector-specific compilers

Split page execution into collector implementations:

```text
ProductSortPageCollector
MatchedVariantPricePageCollector
RelevancePageCollector
```

`compilePageQuerySql(...)` should stop being one SQL with all collectors unioned
together. Only the selected collector should compile and execute.

Acceptance:

- `product_sort` page SQL contains no variant price CTEs;
- `matched_variant_price` page SQL contains no product sort CTEs;
- `relevance` page SQL contains no product/variant price collector CTEs.

### Step 4. Implement matched variant price chunked collector

Add compiler for one matched price chunk:

```text
compileMatchedVariantPricePageChunkSql(plan, progress, chunkSize)
```

It must read `listing.listing_posting_variant_price`, not
`variant_listing_price_index`.

Acceptance:

- `price_asc` uses `idx_listing_posting_variant_price_range`;
- `price_desc` uses `idx_listing_posting_variant_price_desc`;
- active price filter is emitted as index range predicate;
- option/price/in-stock same-variant semantics are preserved through
  `variant_match @> variant_doc_id`;
- application collector stops at `first + 1` accepted products.

### Step 5. Refactor totalCount independently

`totalCount` should compile only:

```text
fullProductMatches
rb_cardinality(fullProductMatches)
```

It may still be heavy for broad variant filters, but it must not inherit page,
metadata, virtual facet or count CTEs.

Acceptance:

- no page collector CTEs in total SQL;
- no metadata candidate discovery in total SQL;
- variant projection is included only when variant predicates exist.

### Step 6. Refactor facetsMetadata independently

Change metadata branch from active-filter discovery to scope metadata discovery.

Preferred shape:

```text
scope products -> product facet candidate values
scope variants -> option facet candidate values
catalog metadata join
```

Do not include active option/price filters, full matches or projected active
variant products.

Acceptance:

- metadata latency is stable for heavy active filters;
- active selected filters do not make metadata branch seconds-long;
- counts remain responsible for active-filter non-zero values.

### Step 7. Refactor virtualFacets independently

Virtual facets should use specialized isolated plans:

```text
priceRange:
  product base without price isolation
  option/stock variant filters without price
  typed price source

inStockCount:
  product base without stock isolation
  option/price variant filters without stock
  projection blocks or signature product bitmaps
```

Acceptance:

- no full `compileCoreListingSql`;
- no page collector CTEs;
- no facet metadata CTEs;
- no scan of `variant_listing_index` for projection when projection blocks can
  answer variant->product.

### Step 8. Cursor parity

Verify cursor encode/decode for:

```text
price_asc matched variant
price_desc matched variant
same price multiple products
same product multiple variants
after cursor with rejected rows between chunks
```

Acceptance:

- no duplicate product across pages;
- no skipped accepted product;
- cursor filter hash prevents using stale cursor with changed filters.

### Step 6. Performance profiling

Collect:

```text
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
```

for chunk SQL, plus runtime metrics:

```text
rows scanned
rows accepted
chunks read
listing:page duration
total service elapsed
```

Representative scenarios:

- category + price sort without option filters;
- category + price sort + price range;
- category + price sort + one option facet;
- category + price sort + 4 option OR groups;
- category + price sort + 4 option OR groups + price range;
- duplicated products with many matching variants;
- low selectivity filter where many ordered price rows are rejected.

Acceptance:

```text
10k price facet page p95 <= 45ms
No temp spill
Rows scanned bounded by configured budget
facetCounts may remain the slowest branch
```

## Correctness tests to add later

Do not rely only on performance tests. Add repository-level correctness cases:

- `price_asc` returns lowest matching variant per product;
- `price_desc` returns highest matching variant per product;
- option + price filters must match the same variant;
- out-of-stock variants are ignored;
- OR inside a facet and AND between facets;
- page 2 after cursor has no duplicates from page 1;
- missing option posting row returns no matches for that selected value;
- product-level filters combine with variant-level filters correctly.

## Expected result

After refactor:

- `listing:page` no longer behaves like an aggregate query;
- `listing:facetCounts` remains the expected heavy branch;
- page latency becomes proportional to page size, selectivity and bounded
  overfetch;
- matched price sort uses the ordered physical index designed for this use case;
- aggregate correctness remains based on full listing scope.
