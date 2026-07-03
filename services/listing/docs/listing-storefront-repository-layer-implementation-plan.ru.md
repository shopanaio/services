# План implementation-ready для repository layer storefront listing

> Статус контракта: optional aggregate flags из этого исторического плана
> superseded планом `listing-storefront-query-optimization-plan.ru.md`.
> Актуальный storefront listing contract описан в
> `storefront-listing-api-contract.ru.md`: repository всегда возвращает полный
> response (`totalCount`, facets, `priceRange`, `inStockCount`) и не принимает
> `includeTotalCount`, `includeFacets`, `includePriceRange`,
> `includeInStockCount`.

## Назначение

Документ описывает реализацию read-side repository layer для storefront listing
поверх runtime index:

- `listing.listing_posting_bitmap`;
- `listing.listing_posting_product_sort`;
- `listing.listing_posting_variant_price`;
- `listing.listing_posting_variant_projection_block`;
- `listing.product_listing_index`;
- `listing.variant_listing_index`;
- `listing.product_title_bm25_search_index`.

План покрывает все storefront query shapes из
`services/listing/docs/draft/listing-query-sql-examples.ru.md` и должен быть
использован после sync cutover, когда runtime posting rows уже актуальны.

## Источники и ограничения

Учтены документы:

- `AGENTS.md`;
- `knowledge/AGENTS.md`;
- `knowledge/vault/patterns/repository.md`;
- `knowledge/vault/architecture/multi-tenancy.md`;
- `knowledge/vault/configuration/drizzle-config.md`;
- `services/listing/docs/draft/listing-index-redesign-plan.ru.md`;
- `services/listing/docs/draft/listing-index-db-schema.ru.md`;
- `services/listing/docs/draft/listing-posting-list-search-engine-index.ru.md`;
- `services/listing/docs/draft/listing-storefront-operations-explained.ru.md`;
- `services/listing/docs/draft/listing-facet-option-multi-source-filtering.ru.md`;
- `services/listing/docs/draft/listing-bm25-pg-search-index-plan.ru.md`;
- `services/listing/docs/draft/listing-query-sql-examples.ru.md`.

Проектные правила:

- все repositories наследуются от `BaseRepository`;
- все queries используют `this.connection`, а не `this.db`;
- tenant boundary берется из `this.storeId` как `projectId`;
- repository public methods do not accept `projectId` in input DTOs; follow the
  catalog repository convention and add `eq(...projectId, this.storeId)` or bind
  `${this.storeId}` inside every query;
- low-level методы не query-ят bare `doc_id`; every doc-id predicate is paired
  with `this.storeId` / `project_id`;
- repository layer не читает raw source handles на storefront read path;
- facet resolution читает canonical facet metadata через read-only Drizzle
  runtime models для schema `catalog`, но только поля, нужные для
  unrestricted `facetSlug:valueHandle -> facet_id/facet_type/facet_value_id`;
- tests/tsc для проверки этого плана не запускать;
- changeset не редактировать.

## Целевая структура файлов

Добавить read repositories:

```text
services/listing/src/repositories/storefront/
  types.ts
  StorefrontFacetResolutionRepository.ts
  StorefrontPostingBitmapQueryRepository.ts
  StorefrontVariantProjectionQueryRepository.ts
  StorefrontProductSortCollectorRepository.ts
  StorefrontVariantPriceCollectorRepository.ts
  StorefrontProductTitleSearchQueryRepository.ts
  StorefrontFacetAggregationRepository.ts
  StorefrontListingQueryRepository.ts
  index.ts
```

Добавить read-only runtime models for catalog canonical facets:

```text
services/listing/src/repositories/models/catalogFacetRuntime.ts
```

Модели должны описывать только поля, которые нужны storefront facet resolution:
`project_id`, facet id/slug/type, facet value id/handle/kind/parent relation and
optional translation/sort fields for aggregate value labels. Эти модели не
являются ownership transfer для catalog данных и не используются для
product/variant source read path.

Обновить aggregator:

```text
services/listing/src/repositories/Repository.ts
```

Добавить свойства:

```ts
public readonly storefrontFacetResolution: StorefrontFacetResolutionRepository;
public readonly storefrontPostingBitmapQuery: StorefrontPostingBitmapQueryRepository;
public readonly storefrontVariantProjectionQuery: StorefrontVariantProjectionQueryRepository;
public readonly storefrontProductSortCollector: StorefrontProductSortCollectorRepository;
public readonly storefrontVariantPriceCollector: StorefrontVariantPriceCollectorRepository;
public readonly storefrontProductTitleSearchQuery: StorefrontProductTitleSearchQueryRepository;
public readonly storefrontFacetAggregation: StorefrontFacetAggregationRepository;
public readonly storefrontListingQuery: StorefrontListingQueryRepository;
```

Naming rule:

- existing repositories under `services/listing/src/repositories/listing/` stay
  the runtime index maintenance layer for sync/rebuild writes and low-level row
  access;
- new repositories under `services/listing/src/repositories/storefront/` are
  read-side query orchestration helpers only;
- do not add storefront read-side properties with names already used by
  `Repository` for the existing listing repositories.

Tenant boundary rule:

- same as catalog repositories, storefront repositories derive the current
  project from `this.storeId`;
- public repository methods do not expose optional `projectId` overrides;
- SQL snippets may use `:projectId` as a local placeholder, but implementation
  must bind it from `this.storeId`, not from caller input.

Read-only repository rule:

- every async read method in `services/listing/src/repositories/storefront/`
  must be annotated with `@ReadOnly()` from `@shopana/shared-kernel`, matching
  existing listing repositories;
- pure synchronous SQL builder methods such as `buildOrGroup(...)`,
  `buildProjectionSql(...)` and `normalizeQuery(...)` do not need `@ReadOnly()`;
- storefront repositories must not perform writes.

## Общие типы

Файл `storefront/types.ts` должен содержать только repository contracts and
read-model DTO. GraphQL types не импортировать в repository layer.

```ts
export type StorefrontSortKind =
  | "manual"
  | "newest"
  | "created"
  | "name"
  | "price_asc"
  | "price_desc"
  | "relevance";

export type ProductPostingField =
  | "category"
  | "vendor"
  | "facet";

export type VariantPostingField = "facet" | "variant_product";

export type FacetRuntimeType =
  | "TAG"
  | "FEATURE"
  | "OPTION"
  | "PRICE"
  | "IN_STOCK";

export interface StorefrontListingInput {
  scope: StorefrontListingScope;
  locale: string;
  currency: string;
  query?: string;
  filters: StorefrontListingFilterInput[];
  sort?: StorefrontSortInput;
  first: number;
  after?: string | null;
}

export type StorefrontListingFilterInput =
  | {
      kind: "facet";
      facetSlug: string;
      valueHandles: string[];
    }
  | {
      kind: "vendor";
      vendorIds: string[];
    }
  | {
      kind: "price";
      minPriceMinor?: number;
      maxPriceMinor?: number;
    }
  | {
      kind: "in_stock";
      value: boolean;
    };

export interface StorefrontSortInput {
  kind: StorefrontSortKind;
}
```

Scopes:

```ts
export type StorefrontListingScope =
  | { kind: "category"; categoryId: string; manualSortScopeId?: string }
  | { kind: "search" };
```

Search scope rule:

- `{ kind: "search" }` requires a non-empty normalized `query`; otherwise return
  a repository validation error;
- for non-search scopes, empty normalized query disables BM25 flow and the query
  behaves as a normal structured listing;
- a non-empty `query` may be used with non-search scopes as an additional title
  search candidate bitmap filter.

Resolved filters:

```ts
export interface ResolvedFacetFilterGroup {
  facetId: string;
  facetType: FacetRuntimeType;
  valueKeys: string[];
}

export interface StorefrontFilterPlan {
  productFacetGroups: ResolvedFacetFilterGroup[];
  optionFacetGroups: ResolvedFacetFilterGroup[];
  vendorIds: string[];
  priceRange?: { minPriceMinor?: number; maxPriceMinor?: number };
  inStock?: boolean;
}

export interface ResolvedFacetValue {
  facetId: string;
  facetSlug: string;
  facetType: FacetRuntimeType;
  facetValueId: string;
  valueHandle: string;
  valueKey: string;
  label?: string | null;
  sortIndex?: number | null;
}
```

Bitmap values:

```ts
export type RoaringBitmapSqlValue = string;

export interface BitmapExpr {
  sql: SQL;
  empty: boolean;
  source: string;
}
```

Cursor and collector DTO:

```ts
export interface DecodedListingCursor {
  payload: ListingCursorPayload;
  raw: string;
}

export interface ListingCursorPayload {
  version: 1;
  hash: string;
  sort: StorefrontSortKind;
  inStock: boolean;
  productId: string;
  publishedAt?: string | null;
  productCreatedAt?: string | null;
  textValue?: string | null;
  bigintValue?: number | null;
  priceMinor?: number | null;
  variantDocId?: number | null;
  relevanceScore?: number | null;
}

export type ListingCollectorKind =
  | "product_sort"
  | "matched_variant_price"
  | "relevance";

export interface SearchTieBreakerSql {
  relevanceScoreSql: SQL;
}

export interface ListingPageCollectResult {
  rows: ListingPageRow[];
  hasNextPage: boolean;
}

export type ProductSortCollectKind =
  | "manual"
  | "newest"
  | "created"
  | "name"
  | "price_asc"
  | "price_desc";

export interface ResolvedListingRequest {
  input: StorefrontListingInput;
  filterPlan: StorefrontFilterPlan;
  normalizedQuery: string | null;
  sort: StorefrontSortInput;
  cursor: DecodedListingCursor | null;
  filterHash: string;
}
```

Page rows:

```ts
export interface ListingPageRow {
  productDocId: number;
  productId: string;
  inStock: boolean;
  cursorValues: Record<string, string | number | boolean | null>;
  matchedVariantDocId?: number;
  matchedPriceMinor?: number;
  relevanceScore?: number;
}
```

Result:

```ts
export interface StorefrontListingRepositoryResult {
  rows: ListingPageRow[];
  hasNextPage: boolean;
  totalCount: number;
  facets: StorefrontListingFacetResult[];
  priceRange: PriceRangeResult | null;
  inStockCount: number;
}

export interface StorefrontListingFacetResult {
  facetId: string;
  facetSlug: string;
  facetType: FacetRuntimeType;
  values: StorefrontListingFacetValueResult[];
}

export interface StorefrontListingFacetValueResult {
  facetValueId: string;
  valueHandle: string;
  valueKey: string;
  count: number;
}

export interface FacetCountResult {
  facetId: string;
  facetType: FacetRuntimeType;
  valueKey: string;
  count: number;
}

export interface PriceRangeResult {
  minPriceMinor: number;
  maxPriceMinor: number;
  currency: string;
}

export interface ListingAggregatesResult {
  totalCount: number;
  facets: StorefrontListingFacetResult[];
  priceRange: PriceRangeResult | null;
  inStockCount: number;
}
```

Raw SQL result DTO:

```ts
export interface BitmapSqlRow {
  bitmap: RoaringBitmapSqlValue;
}

export interface CountSqlRow {
  count: number;
}

export interface ProductSortPageSqlRow {
  productDocId: number;
  productId: string;
  inStock: boolean;
  boolValue: boolean | null;
  timestamptzValue: string | null;
  timestamptzValue2: string | null;
  bigintValue: number | null;
  textValue: string | null;
}

export interface VariantPricePageSqlRow {
  productDocId: number;
  productId: string;
  inStock: boolean;
  variantDocId: number;
  priceMinor: number;
}

export interface SearchPageSqlRow {
  productDocId: number;
  productId: string;
  inStock: boolean;
  relevanceScore: number;
}

export interface FacetCountSqlRow {
  facetId: string;
  facetType: FacetRuntimeType;
  valueKey: string;
  count: number;
}

export interface PriceRangeSqlRow {
  minPriceMinor: number | null;
  maxPriceMinor: number | null;
}
```

## Raw SQL policy

Drizzle models остаются schema/query contract, но roaring operations и BM25
операторы должны выполняться через `sql` fragments:

```ts
await this.connection.execute(sql`...`);
```

Every raw SQL query must use an explicit row DTO, for example
`this.connection.execute<ProductSortPageSqlRow>(...)`. Do not leave repository
SQL results as `unknown` / `Record<string, unknown>`. If PostgreSQL returns
`bigint` values such as `rb_cardinality(...)`, either cast them in SQL to a
safe integer type for the expected range or parse the typed driver result before
returning repository DTOs.

Разрешенные direct PostgreSQL APIs:

```text
rb_build_agg(int)
a & b
a | b
a - b
rb_and_agg(bitmap)
rb_or_agg(bitmap)
rb_cardinality(bitmap)
bitmap @> doc_id
rb_iterate(bitmap)
pdb.score(search_id)
title @@@ query
```

Не создавать project-owned SQL helper functions для projection. Macro
`project_variant_bitmap_to_products(...)` должен inline-иться в generated SQL.

Empty bitmap SQL contract:

- `BitmapExpr.empty` is only a planning/short-circuit flag; it is not enough for
  runtime SQL safety;
- add a colocated helper `emptyRoaringBitmapSql(): SQL` that returns a
  validated non-NULL empty `roaringbitmap` expression for the installed
  `pg_roaringbitmap` extension;
- add `coalesceBitmapSql(value: SQL): SQL`, which emits
  `COALESCE(value, emptyRoaringBitmapSql())`;
- every `rb_build_agg(...)`, `rb_or_agg(...)`, `rb_and_agg(...)` and projection
  SQL result that can see zero rows must be wrapped through `coalesceBitmapSql`;
- if a required group is known empty before SQL generation, short-circuit the
  repository call and return an empty result instead of sending a query with a
  NULL bitmap.

Example shape:

```ts
const publishedBitmap = coalesceBitmapSql(sql`(
  SELECT rb_build_agg(pli.product_doc_id)
  FROM listing.product_listing_index pli
  WHERE pli.project_id = ${this.storeId}
    AND pli.status = 'published'
)`);
```

## StorefrontFacetResolutionRepository

Repository отвечает за перевод public storefront filter input в stable ids.
Он не выполняет listing query.

Источник данных для resolution - read-only SQL чтение canonical facet metadata
из schema `catalog` через добавленные Drizzle runtime models с минимальным
field set. Repository не вызывает catalog service/broker и не читает raw product
or variant source handles.

Публичные методы:

```ts
async resolveFilterPlan(input: {
  filters: StorefrontListingFilterInput[];
}): Promise<StorefrontFilterPlan>;

async getFacetValues(input: {
  scope: StorefrontListingScope;
  locale: string;
  requestedFacetIds?: string[];
}): Promise<ResolvedFacetValue[]>;
```

Правила:

- `projectId` берется только из `this.storeId`, как в catalog repositories;
- input `facetSlug:valueHandle` резолвится в `facet_id`, `facet_type`,
  `facet_value_id`;
- `value_key = <facet_id>:<facet_value_id>`;
- resolution is unrestricted: если facet/value существуют внутри текущего
  `project_id`, repository резолвит их regardless of enabled/disabled,
  visibility-like state or reference freshness;
- `kind = source` with `parent_id IS NULL` resolves to its own `facet_value_id`;
- `kind = display` resolves to the display value id itself; source children are
  not required for filter resolution;
- если caller передал handle source child where `parent_id IS NOT NULL`, метод
  may resolve it to its parent display value id to preserve canonical
  storefront grouping, but public storefront handles are expected to be root
  values;
- `facet_type` используется в том же canonical формате, что и catalog; repository
  layer не вводит отдельный case mapping;
- `TAG` и `FEATURE` идут в `productFacetGroups`;
- `OPTION` идет в `optionFacetGroups`;
- `PRICE` и `IN_STOCK` идут в virtual fields;
- `inStock === undefined` means the `in_stock` filter is absent;
  `inStock === true` and `inStock === false` are explicit user predicates and
  must not be collapsed into the same state;
- unknown facet/value возвращается как validation/user error на уровне
  script/resolver, не как raw SQL error.

Acceptance:

- read path не читает `tag_handles`, `feature_value_handles`,
  `option_value_handles`;
- read path не читает canonical product/variant source rows для resolution;
- canonical catalog facet metadata читается только через минимальные read-only
  runtime models;
- resolution does not filter out disabled, hidden-like, stale or display-without-
  child values when the canonical catalog row exists.

## StorefrontPostingBitmapQueryRepository

Repository читает готовые bitmap rows и строит bitmap expressions для OR/AND
groups.

Публичные методы:

```ts
async getPostingBitmap(input: {
  entityType: "product" | "variant";
  field: ProductPostingField | VariantPostingField;
  valueKey: string;
}): Promise<RoaringBitmapSqlValue | null>;

async getPostingBitmaps(input: {
  entityType: "product" | "variant";
  field: ProductPostingField | VariantPostingField;
  valueKeys: readonly string[];
}): Promise<Map<string, RoaringBitmapSqlValue>>;

buildOrGroup(input: {
  entityType: "product" | "variant";
  field: ProductPostingField | VariantPostingField;
  valueKeys: readonly string[];
  loaded: Map<string, RoaringBitmapSqlValue>;
}): BitmapExpr;

buildAndGroups(input: {
  groups: readonly BitmapExpr[];
  emptyWhenNoGroups: boolean;
}): BitmapExpr;

async buildPublishedProductScope(): Promise<BitmapExpr>;

async buildProductStockScope(input: {
  inStock: boolean;
}): Promise<BitmapExpr>;

async buildVariantStockScope(input: {
  inStock: boolean;
}): Promise<BitmapExpr>;
```

Missing posting row semantics:

- missing row for one selected value means empty bitmap for that value;
- OR group ignores missing values that have siblings;
- required OR group becomes empty only when all selected values are missing or
  empty;
- empty required group short-circuits before page collector.

SQL shapes:

- single product row: `entity_type = 'product'`, `field = 'category'`;
- single variant row: `entity_type = 'variant'`, `field = 'facet'`;
- product stock-state fallback: `rb_build_agg(product_doc_id)` from
  `product_listing_index where status = 'published' and in_stock = :inStock`;
- variant stock-state fallback: `rb_build_agg(variant_doc_id)` from
  `variant_listing_index where in_stock = :inStock`.
- fallback queries must wrap `rb_build_agg(...)` with
  `coalesceBitmapSql(...)` so an empty project returns an empty bitmap, not
  `NULL`.

Acceptance:

- no code assumes old columns `product_id`, `variant_id`, `facet_id`,
  `facet_value_id` on `listing_posting_bitmap`;
- all methods filter by `project_id = this.storeId`.

## StorefrontVariantProjectionQueryRepository

Repository проектирует `variant_doc_id` bitmap в `product_doc_id` bitmap через
projection blocks.

Публичные методы:

```ts
async projectVariantBitmapToProducts(input: {
  variantBitmap: BitmapExpr;
  strategy?: "projection_blocks" | "narrow_iterate_fallback";
}): Promise<BitmapExpr>;

buildProjectionSql(input: {
  variantBitmapSql: SQL;
}): SQL;
```

Implementation:

1. Найти matched blocks:
   `rb_cardinality(:variantBitmap & block.variant_bitmap) > 0`.
2. Для full block использовать `block.product_bitmap`.
3. Для partial block join к `variant_listing_index` по doc range and membership.
4. OR all product bitmaps через `rb_or_agg`.
5. Wrap the final `rb_or_agg(...)` result with `coalesceBitmapSql(...)`; no
   matched blocks must produce an empty product bitmap, not `NULL`.

Fallback через `rb_iterate` разрешен только для узких sets and diagnostics.
Hot path для broad option filters всегда использует projection blocks.

Acceptance:

- same-variant semantics сохраняется до projection;
- product cardinality считается после projection and dedupe.

## StorefrontProductSortCollectorRepository

Repository собирает page rows через
`listing.listing_posting_product_sort`.

Публичные методы:

```ts
async collectProductSortPage(input: {
  matchesBitmap: BitmapExpr;
  sort: ProductSortCollectKind;
  locale: string;
  currency: string;
  manualScopeId?: string;
  first: number;
  after?: DecodedListingCursor | null;
  includePlusOne: boolean;
  searchTieBreaker?: SearchTieBreakerSql | null;
}): Promise<ListingPageCollectResult>;
```

Supported `ProductSortCollectKind` is defined in `storefront/types.ts`.

Sort routing:

- `manual`: `sort_kind = 'manual'`, `manual_scope_id = category id`,
  `ORDER BY bool_value DESC, text_value ASC NULLS LAST, product_id ASC`;
- `newest`: `sort_kind = 'newest'`,
  `ORDER BY bool_value DESC, timestamptz_value DESC NULLS LAST,
  timestamptz_value_2 DESC NULLS LAST, product_id ASC`;
- `created`: `sort_kind = 'created'`,
  `ORDER BY bool_value DESC, timestamptz_value DESC, product_id ASC`;
- `name`: `sort_kind = 'name'`, locale-specific,
  `ORDER BY bool_value DESC, text_value ASC NULLS LAST, product_id ASC`;
- product aggregate `price_asc`: `sort_kind = 'price_asc'`, currency-specific,
  `ORDER BY bool_value DESC, bigint_value ASC NULLS LAST, product_id ASC`;
- product aggregate `price_desc`: `sort_kind = 'price_desc'`, currency-specific,
  `ORDER BY bool_value DESC, bigint_value DESC NULLS LAST, product_id ASC`.

Cursor:

- use keyset seek by the same ordered keys;
- cursor includes filter hash;
- nullable key seek must be `NULLS LAST` aware;
- page query always uses `first + 1`; `totalCount` is computed by the parallel
  total-count branch, not by the page collector.

Acceptance:

- category + vendor + newest покрывает SQL example 1;
- category + option filters + newest покрывает example 4 after projection;
- product filters + aggregate price sort покрывает example 5;
- name sort + product and option filters покрывает example 7;

## StorefrontVariantPriceCollectorRepository

Repository покрывает price range bitmap and matched variant price sort.

Публичные методы:

```ts
async buildPriceRangeVariantBitmap(input: {
  currency: string;
  minPriceMinor?: number;
  maxPriceMinor?: number;
}): Promise<BitmapExpr>;

async collectMatchedVariantPricePage(input: {
  currency: string;
  variantMatchesBitmap: BitmapExpr;
  productMatchesBitmap: BitmapExpr;
  direction: "asc" | "desc";
  first: number;
  after?: DecodedListingCursor | null;
  includePlusOne: boolean;
  strategy?: "chunked_application_dedupe" | "anti_join_reference";
}): Promise<ListingPageCollectResult>;
```

Price filter:

```sql
SELECT COALESCE(rb_build_agg(vp.variant_doc_id), <emptyRoaringBitmapSql()>)
FROM listing.listing_posting_variant_price vp
WHERE vp.project_id = :projectId
  AND vp.currency = :currency
  -- add only when minPriceMinor is present
  AND vp.price_minor >= :minPriceMinor
  -- add only when maxPriceMinor is present
  AND vp.price_minor <= :maxPriceMinor;
```

`<emptyRoaringBitmapSql()>` here means the TypeScript SQL fragment returned by
the helper, not a PostgreSQL function or caller-provided parameter.

Price range validation:

- at least one of `minPriceMinor` or `maxPriceMinor` must be present for a price
  filter; an empty price filter is a repository validation error;
- provided bounds must be non-negative safe integers;
- when both bounds are present, `minPriceMinor <= maxPriceMinor`;
- missing lower or upper bound means the corresponding SQL predicate is omitted,
  not bound as `NULL`.

Runtime invariant:

- `listing.listing_posting_variant_price` contains only priced active in-stock
  variants;
- stock or price sync must insert/delete rows so out-of-stock, inactive or
  unpriced variants are absent from this table;
- price-only filters may rely on this table for purchasable variant semantics
  and do not add a second in-stock predicate unless the invariant is broken by a
  future schema change.

Matched price collector:

- preferred hot path: ordered chunk scan по
  `listing_posting_variant_price`, membership check by both bitmaps,
  application-level dedupe by `product_id`, continue overfetch until `first + 1`;
- fallback/reference: anti-join shape from SQL examples 6 and 13;
- `price_asc` picks lowest matching variant per product;
- `price_desc` picks highest matching variant per product;
- cursor includes price, product_id, variant_doc_id and filter hash.

Chunked application dedupe limits:

- each chunk query must include keyset progress by
  `(price_minor, product_id, variant_doc_id)` for ascending sort and the matching
  descending tuple for `price_desc`;
- use deterministic cursor tie-breakers: `priceMinor`, `productId`,
  `variantDocId`, plus filter hash;
- set a hard max scanned row budget per request, for example
  `max(first * 50, 1000)` with a documented cap;
- if the budget is exhausted before collecting `first + 1` unique products,
  switch to the anti-join/reference SQL or return a controlled repository error;
- never loop until enough unique products are found without a bounded progress
  condition.

Acceptance:

- option filters + price range + matched price asc покрывает example 6;
- full listing + option isolation + price range + matched price sort покрывает
  example 13;
- generic `field = 'price'` posting row is never used.

## StorefrontProductTitleSearchQueryRepository

Repository builds BM25 candidate relation for title search.

Публичные методы:

```ts
normalizeQuery(query: string | undefined | null): string | null;

buildSearchCandidatesSql(input: {
  locale: string;
  normalizedQuery: string;
}): SQL;

async buildSearchCandidateBitmap(input: {
  locale: string;
  normalizedQuery: string;
}): Promise<BitmapExpr>;

async collectRelevancePage(input: {
  locale: string;
  normalizedQuery: string;
  matchesBitmap: BitmapExpr;
  first: number;
  after?: DecodedListingCursor | null;
  includePlusOne: boolean;
}): Promise<ListingPageCollectResult>;
```

Rules:

- trim query;
- collapse whitespace;
- empty query disables BM25 flow for non-search scopes;
- empty query with `{ kind: "search" }` is a repository validation error;
- cap normalized query length, например 128 chars;
- parameterize query, never interpolate raw user input;
- candidate relation must join `product_title_bm25_search_index` to
  `product_listing_index` by `project_id + product_id`;
- candidate relation must select `product_doc_id`, `product_id`, `in_stock` and
  `relevance_score`, and must apply storefront visibility through
  `product_listing_index.status = 'published'`;
- BM25 index status can be used as an extra guard, but `product_listing_index`
  remains the source of product doc id and visibility for listing runtime;
- candidate relation must represent all matches when used by `totalCount` or
  facets;
- no silent top-K cap before counts;
- `RELEVANCE` valid only when query is non-empty.

Relevance order:

```text
in_stock DESC, relevance_score DESC NULLS LAST, product_id ASC
```

Acceptance:

- search candidates + structured filters + relevance sort покрывает example 9;
- explicit business sorts with query keep BM25 as filter and collect page via
  selected product/price collector;
- search candidate bitmap is built from `product_listing_index.product_doc_id`
  after published visibility filtering;
- facet isolation never removes title query.

## StorefrontFacetAggregationRepository

Repository computes `totalCount`, product facets, option facets, price range and
in-stock virtual counts from full filtered scope, not from page rows.

Публичные методы:

```ts
async countProducts(input: {
  matchesBitmap: BitmapExpr;
}): Promise<number>;

async countProductFacetValues(input: {
  productBaseBitmap: BitmapExpr;
  activeProductGroups: readonly ResolvedFacetFilterGroup[];
  facetValues: readonly ResolvedFacetValue[];
}): Promise<FacetCountResult[]>;

async countOptionFacetValues(input: {
  productBaseBitmap: BitmapExpr;
  activeOptionGroups: readonly ResolvedFacetFilterGroup[];
  priceVariantBitmap?: BitmapExpr | null;
  inStockVariantBitmap: BitmapExpr;
  facetValues: readonly ResolvedFacetValue[];
}): Promise<FacetCountResult[]>;

async getPriceRange(input: {
  productBaseBitmap: BitmapExpr;
  activeOptionGroups: readonly ResolvedFacetFilterGroup[];
  activeProductGroups: readonly ResolvedFacetFilterGroup[];
  currency: string;
  excludeActivePrice: boolean;
}): Promise<PriceRangeResult | null>;

async countInStock(input: {
  productBaseBitmap: BitmapExpr;
  activeProductGroups: readonly ResolvedFacetFilterGroup[];
  activeOptionGroups: readonly ResolvedFacetFilterGroup[];
  priceVariantBitmap?: BitmapExpr | null;
}): Promise<number>;
```

Facet isolation:

```text
count_base_for_facet_X =
  all active filters except filters from facet X
```

Product facet count:

```text
value_count = rb_cardinality(product_isolated_bitmap & product_value_bitmap)
```

Option facet count:

```text
variant_base =
  active option filters except current facet
  & active price bitmap if price filter exists
  & in_stock_variant_bitmap

value_variants = variant_base & option_value_bitmap
value_products = project_variants_to_products(value_variants) & product_base
value_count = rb_cardinality(value_products)
```

Price virtual facet:

- range min/max excludes active price predicate;
- product-level filters remain active;
- option filters remain same-variant before product projection;
- source table is `listing_posting_variant_price`.

In-stock virtual facet:

- excludes active `in_stock` toggle;
- option and price filters keep same-variant semantics;
- returns product cardinality after projection.

Acceptance:

- product facet counts as separate query покрывает example 11;
- full listing page with page ids + totalCount + isolated counts покрывает
  example 12;
- counts are limited to the facet values returned by facet resolution, not by
  scanning all posting rows.

## StorefrontListingQueryRepository

This is the orchestration repository used by storefront resolvers/scripts.

Constructor dependencies:

```ts
constructor(
  db: Database,
  txManager: TransactionManager<Database>,
  private readonly facets: StorefrontFacetResolutionRepository,
  private readonly postings: StorefrontPostingBitmapQueryRepository,
  private readonly projection: StorefrontVariantProjectionQueryRepository,
  private readonly productCollector: StorefrontProductSortCollectorRepository,
  private readonly variantPriceCollector: StorefrontVariantPriceCollectorRepository,
  private readonly search: StorefrontProductTitleSearchQueryRepository,
  private readonly aggregation: StorefrontFacetAggregationRepository
) {
  super(db, txManager);
}
```

Публичный метод:

```ts
async getStorefrontListing(
  input: StorefrontListingInput
): Promise<StorefrontListingRepositoryResult>;
```

Внутренние методы:

```ts
private async normalizeAndResolve(input: StorefrontListingInput): Promise<ResolvedListingRequest>;

private async buildScopeProductBitmap(input: ResolvedListingRequest): Promise<BitmapExpr>;

private async buildRuleCollectionBitmap(input: ResolvedListingRequest): Promise<{
  productBitmap: BitmapExpr;
  variantBitmap?: BitmapExpr;
}>;

private async buildProductFiltersBitmap(plan: StorefrontFilterPlan): Promise<BitmapExpr>;

private async buildVariantFiltersBitmap(plan: StorefrontFilterPlan): Promise<{
  variantMatchesBitmap: BitmapExpr | null;
  projectedProductBitmap: BitmapExpr | null;
  priceVariantBitmap: BitmapExpr | null;
  hasVariantLevelPredicate: boolean;
}>;

private async buildFinalProductMatches(input: {
  scopeBitmap: BitmapExpr;
  productFiltersBitmap: BitmapExpr;
  projectedVariantBitmap?: BitmapExpr | null;
}): Promise<BitmapExpr>;

private selectCollector(input: ResolvedListingRequest): ListingCollectorKind;

private async collectPage(input: {
  request: ResolvedListingRequest;
  matchesBitmap: BitmapExpr;
  variantMatchesBitmap?: BitmapExpr | null;
}): Promise<ListingPageCollectResult>;

private async collectAggregates(input: {
  request: ResolvedListingRequest;
  scopeBitmap: BitmapExpr;
  productFiltersBitmap: BitmapExpr;
  variantMatchesBitmap?: BitmapExpr | null;
  productMatchesBitmap: BitmapExpr;
  priceVariantBitmap?: BitmapExpr | null;
}): Promise<ListingAggregatesResult>;
```

Pipeline:

1. Resolve `projectId = this.storeId`, locale, currency, scope, sort, cursor.
2. Normalize search query; validate that `{ kind: "search" }` has a non-empty
   normalized query and that `RELEVANCE` is used only with a non-empty query.
3. Resolve facet filters into `StorefrontFilterPlan`.
4. Build scope product bitmap:
   - category posting row;
   - BM25 search candidate bitmap when query is present.
5. Build product-level filters:
   - product facet rows for tag/feature;
   - vendor product rows;
   - product stock predicates.
6. Build variant-level filters:
   - option facet rows as OR внутри facet and AND между facets;
   - price range bitmap from `listing_posting_variant_price`;
   - `inStock === true` applies an explicit in-stock predicate;
   - `inStock === false` applies an explicit out-of-stock predicate and must not
     be treated as filter absence;
   - product-only paths may use `buildProductStockScope(...)`; variant paths use
     `buildVariantStockScope(...)` before projection;
   - price predicates use `listing_posting_variant_price`, which contains only
     priced active in-stock variants, so `inStock === false` intersects with price
     as an empty purchasable-variant result unless that table invariant changes.
7. Project variant matches to product bitmap through projection blocks.
8. Intersect scope, product filters and projected variant filters.
9. Choose collector:
   - `relevance` collector for non-empty query + relevance sort;
   - product sort collector for manual/newest/created/name/product aggregate
     price;
   - matched variant price collector when price sort and option or price
     predicate is active.
10. Run total-count branch with `rb_cardinality(matches)`.
11. Run facets metadata branch and isolated counts branch.
12. Run virtual facets branch for `priceRange` and `inStockCount`.
13. Return page rows, `hasNextPage` and all aggregates.

Short-circuit rules:

- empty required product OR group returns empty result without page collector;
- empty required option OR group returns empty result without projection;
- empty scope returns empty result;
- empty BM25 query means normal listing for non-search scopes;
- empty BM25 query with `{ kind: "search" }` is a validation error;
- missing value posting inside a non-empty OR group is ignored as empty value.

## Mapping to SQL examples

Implementation must cover these repository flows:

| SQL example | Required repository flow |
| --- | --- |
| 1. Category + vendor + newest | `buildScopeProductBitmap(category)` + `buildProductFiltersBitmap(vendor)` + `collectProductSortPage(newest)` |
| 4. Category + option filters + newest | category scope + option variant groups + in-stock variants + projection blocks + newest collector |
| 5. Product filters + aggregate price sort | product bitmaps only + product sort `price_asc`/`price_desc` |
| 6. Option + price range + matched price asc | option groups + price variant bitmap + projection + `collectMatchedVariantPricePage(asc)` |
| 9. Search + structured filters + relevance | BM25 candidate bitmap + structured filters + `collectRelevancePage` |
| 10. Cursor page ids without totalCount | any collector with `first + 1`, no `rb_cardinality(matches)` |
| 11. Product facet counts separate query | `countProductFacetValues` with facet isolation and resolved facet value list |
| 12. Full page + total + isolated counts | page collector + `countProducts` + product/option facet counts, monolithic or split SQL |
| 13. Full option isolation + price range + matched price | option isolation + price bitmap + projection + matched price collector + counts |

## Cursor format

Repository should encode/decode cursor in a small helper colocated with
storefront repositories, not inside GraphQL resolver.

Cursor payload:

```ts
interface ListingCursorPayload {
  version: 1;
  hash: string;
  sort: StorefrontSortKind;
  inStock: boolean;
  productId: string;
  publishedAt?: string | null;
  productCreatedAt?: string | null;
  textValue?: string | null;
  bigintValue?: number | null;
  priceMinor?: number | null;
  variantDocId?: number | null;
  relevanceScore?: number | null;
}
```

Hash input:

- projectId;
- locale;
- currency;
- scope;
- normalized query;
- resolved filters;
- sort;
- manual scope id.

Invalid hash means cursor validation error. Repository must not silently ignore
cursor mismatch.

## SQL generation details

Use parameterized `sql` fragments. Do not concatenate user input.

Recommended internal building blocks:

```ts
function emptyRoaringBitmapSql(): SQL;
function coalesceBitmapSql(value: SQL): SQL;
function andBitmapExpr(parts: BitmapExpr[]): BitmapExpr;
function orBitmapExpr(parts: BitmapExpr[]): BitmapExpr;
function emptyBitmapExpr(reason: string): BitmapExpr;
function literalBitmapExpr(value: RoaringBitmapSqlValue, source: string): BitmapExpr;
```

`andBitmapExpr(...)`, `orBitmapExpr(...)` and projection builders must return SQL
that is safe to embed into membership checks and `rb_cardinality(...)`; no helper
may expose a nullable bitmap SQL expression to callers.

For loaded bitmap values, prefer binding as parameter:

```ts
sql`${bitmapValue}::roaringbitmap`
```

For CTE-heavy queries, keep one repository method per query shape instead of one
overly generic SQL string builder. Shared helpers may return CTE fragments.

## Error handling

Repository errors:

- invalid cursor hash;
- unsupported sort/scope combination;
- `RELEVANCE` without non-empty query;
- `{ kind: "search" }` without non-empty query;
- missing required locale/currency;
- invalid price range.

Repository should not translate these to GraphQL `userErrors`; resolver/script
layer decides API error shape.

Empty listing is not an error.

## Observability

`StorefrontListingQueryRepository.getStorefrontListing` should log debug-level
metadata:

- `projectId`;
- scope kind;
- normalized query hash, not raw query;
- sort;
- page size;
- active product facet group count;
- active option facet group count;
- has price filter;
- has in-stock filter;
- collector kind;
- requested total/facets/virtual facets;
- short-circuit reason;
- duration.

BM25 repository should additionally log candidate count only when explicitly
requested by observability path, because counting can be expensive.

## Implementation phases

### Phase 1. Contracts and aggregator wiring

1. Add `storefront/types.ts`.
2. Add all DTO/types referenced by repository contracts in `storefront/types.ts`;
   do not leave unresolved GraphQL-only type names.
3. Add raw SQL row DTOs for every `this.connection.execute<T>(...)` shape.
4. Add repository files with constructors and method stubs.
5. Annotate async read methods with `@ReadOnly()`.
6. Export from `storefront/index.ts`.
7. Instantiate all repositories in `Repository.create`.
8. Keep all methods project-scoped through `this.storeId`.

Done when the service builds with empty implementations replaced by typed
contracts in follow-up phases.

### Phase 2. Bitmap and projection primitives

1. Implement `StorefrontPostingBitmapQueryRepository`.
2. Implement published product scope fallback.
3. Implement product and variant stock-state fallback builders.
4. Implement `emptyRoaringBitmapSql()` and `coalesceBitmapSql(...)`.
5. Implement missing posting row semantics.
6. Implement `StorefrontVariantProjectionQueryRepository` with inline projection block
   SQL.

Done when repository methods can build product and variant bitmap expressions
needed by examples 1, 3 and 4.

### Phase 3. Page collectors

1. Implement product sort collector for `manual`, `newest`, `created`, `name`,
   `price_asc`, `price_desc`.
2. Implement keyset cursor predicates with `NULLS LAST` support.
3. Implement `first + 1` overfetch and `hasNextPage`.
4. Implement price range bitmap.
5. Implement matched variant price collector with bounded chunked application
   dedupe and deterministic keyset progress.
6. Keep anti-join SQL as reference/fallback method.

Done when examples 1-8 and 10 are covered at repository level.

### Phase 4. Facet aggregation

1. Implement `countProducts`.
2. Implement product facet isolated counts.
3. Implement option facet isolated counts through projection blocks.
4. Implement price range virtual facet.
5. Implement in-stock virtual facet.
6. Ensure facet values are loaded from facet resolution repository, not by
   scanning all posting rows.

Done when examples 11-13 are covered.

### Phase 5. BM25 integration

1. Implement query normalization.
2. Implement BM25 candidate CTE builder with join to `product_listing_index` for
   `product_doc_id`, `in_stock` and published visibility.
3. Implement search candidate bitmap.
4. Implement relevance collector.
5. Integrate query presence into `StorefrontListingQueryRepository`.
6. Validate relevance sort rules.

Done when example 9 is covered and explicit business sorts still work with
search candidates as a filter.

### Phase 6. Storefront orchestration

1. Implement `StorefrontListingQueryRepository.getStorefrontListing`.
2. Wire all short-circuit paths.
3. Wire collector selection.
4. Wire aggregate collection based on requested fields.
5. Return stable page rows for hydration pipeline.
6. Add cleanup TODOs for obsolete raw-handle/token paths after callers migrate.

Done when storefront resolver can call one repository method for category and
search listings.

## Acceptance checklist

- Every read query filters by `project_id`.
- Every repository query uses `this.connection`.
- Every raw SQL `execute(...)` call uses an explicit row DTO and parses/casts
  numeric values before returning repository DTOs.
- Every async storefront read repository method is annotated with `@ReadOnly()`.
- Storefront facet filters are resolved to `facet_id` and `facet_value_id`
  before runtime query.
- Raw source handles are absent from listing read path.
- Product-level filters operate on product doc bitmaps.
- Option filters operate on variant doc bitmaps before projection.
- Option + price predicates match the same in-stock variant.
- `price` and `in_stock` remain virtual facets.
- Missing posting rows are treated as empty bitmaps with correct OR-group
  semantics.
- Empty bitmap SQL is non-null: `rb_build_agg`, `rb_or_agg`, `rb_and_agg` and
  projection outputs use `coalesceBitmapSql(...)` or short-circuit before query.
- Product sort collector uses `listing_posting_product_sort`.
- Matched variant price collector uses `listing_posting_variant_price`.
- `listing_posting_variant_price` contains only priced active in-stock variants.
- Price range predicates are generated only for present bounds; empty ranges and
  invalid bounds are validation errors.
- Matched variant price chunked dedupe has keyset progress and a hard scan
  budget.
- Broad variant projection uses projection blocks.
- `totalCount` uses `rb_cardinality(matches)` only when requested.
- Facet counts use full filtered scope, not current page rows.
- Facet counts isolate by `facet_id`.
- Option facet counts return product cardinality after projection.
- Search candidate relation is not silently top-K capped when used by totals or
  facets.
- `{ kind: "search" }` requires a non-empty normalized query; empty query only
  disables BM25 flow for non-search scopes.
- Search candidate relation joins `product_listing_index` and filters published
  products before building the candidate bitmap.
- Relevance sort is availability-first and deterministic.
- Cursor hash includes project, locale, currency, scope, query, filters and
  sort.
- No code references obsolete `listing_posting_bitmap.product_id`,
  `variant_id`, `facet_id` or `facet_value_id` columns.
