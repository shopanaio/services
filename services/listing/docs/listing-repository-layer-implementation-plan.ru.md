# Implementation-ready план repository layer для listing write model

## Назначение

Документ описывает implementation-ready план repository layer для записи и
базового CRUD над таблицами listing read model:

- `listing.listing_doc_id_allocator`
- `listing.product_listing_index`
- `listing.product_listing_price_index`
- `listing.variant_listing_index`
- `listing.variant_listing_price_index`
- `listing.listing_posting_bitmap`
- `listing.listing_posting_product_sort`
- `listing.listing_posting_variant_price`
- `listing.listing_posting_variant_storeion_block`
- `listing.product_title_bm25_search_index`

Фокус документа: repository API, транзакционные границы, базовые CRUD методы,
bulk replace/upsert/delete методы и правила записи в таблицы.

Финальный storefront listing query, page collectors, facet aggregation,
`ListingQueryRepository`, `FacetAggregationRepository`,
`ProductTitleSearchQueryRepository` и SQL query builder не входят в скоуп этого
документа. Для них остаются отдельные документы по query shape.

## Использованные draft-источники

- `services/listing/docs/draft/listing-index-db-schema.ru.md`
- `services/listing/docs/draft/listing-index-sync-implementation-plan.ru.md`
- `services/listing/docs/draft/listing-index-sync-freshness.ru.md`
- `services/listing/docs/draft/listing-posting-list-search-engine-index.ru.md`
- `services/listing/docs/draft/listing-bm25-pg-search-index-plan.ru.md`
- `services/listing/docs/draft/listing-facet-option-multi-source-filtering.ru.md`
- `services/listing/docs/draft/listing-index-redesign-plan.ru.md`
- `services/listing/docs/draft/listing-query-sql-examples.ru.md`
- `services/listing/docs/draft/listing-storefront-operations-explained.ru.md`

## Текущий baseline в коде

В `services/listing/src/repositories/models/listingIndex.ts` уже описаны целевые
Drizzle models and inferred types. `BaseRepository` уже дает:

- `this.connection` через `TransactionManager`;
- `this.ctx`;
- `this.storeId` как текущий `store_id`.

`services/listing/src/repositories/Repository.ts` пока содержит только
`txManager` и `db`. План ниже добавляет concrete repositories and registers them
in the aggregator.

## Скоуп

### Входит

- Базовый CRUD для каждой listing таблицы: `exists`, `find`, `getBy...`,
  `count`, `create` or `upsert`, `update`, `delete`.
- Bulk методы для sync scripts: `upsertMany`, `replaceFor...`,
  `deleteBy...`.
- Методы allocation для stable `product_doc_id` / `variant_doc_id`.
- Методы записи roaring bitmap rows and membership replacement.
- Методы записи physical sort, runtime variant price and projection block rows.
- Методы записи BM25 title index rows without search query execution.
- Минимальные read helpers, которые нужны write side: aggregate reads,
  existing row lookup and row lookup by ids.

### Не входит

- Storefront page collection and pagination.
- `collectProductPage`, `collectMatchedPricePage`,
  `projectVariantBitmapToProductsSql` as query macro.
- Facet count SQL and total count SQL.
- BM25 search candidate query and relevance sorting.
- GraphQL/admin API mutations.
- DBOS workflows, event handlers and builders. Repositories must be ready for
  these callers, but callers are implemented separately.
- Manual changeset edits.

## Общие правила repository layer

1. Every repository extends `BaseRepository`.
2. Every query uses `this.connection`, never `this.db`.
3. Public repository methods derive `store_id` from `this.storeId`. They must
   not accept user-provided `storeId`.
4. Methods may accept doc ids, product ids or variant ids, but every SQL
   statement must include `eq(table.storeId, this.storeId)` when the table has
   `store_id`.
5. Write methods are transaction-safe and should be called inside script-level
   transactions. Methods that perform multi-step replace operations must either
   be decorated with `@Transactional()` or documented as requiring the caller's
   active transaction.
6. Read methods used by write-side code may be decorated with `@ReadOnly()`.
7. Insert/update methods set `updatedAt = new Date().toISOString()`.
8. Rows with `indexedAt` set it on insert and refresh it on full sync/upsert.
9. Raw source handles are never persisted. Repositories accept resolved ids and
   `valueKey` values only.
10. Missing posting bitmap row means empty bitmap. Empty bitmap rows should be
    deleted after membership removal unless the caller explicitly asks to keep a
    metadata-only row.
11. `price` and `in_stock` are virtual facets. Do not create generic
    `listing_posting_bitmap` rows for them.
12. `product_doc_id` and `variant_doc_id` are never reused after deletion.

## Target file structure

```text
services/listing/src/repositories/
  BaseRepository.ts
  Repository.ts
  listing/
    index.ts
    listingRepositoryTypes.ts
    ListingDocIdAllocatorRepository.ts
    ProductListingIndexRepository.ts
    ProductListingPriceIndexRepository.ts
    VariantListingIndexRepository.ts
    VariantListingPriceIndexRepository.ts
    ListingPostingBitmapRepository.ts
    ListingPostingProductSortRepository.ts
    ListingPostingVariantPriceRepository.ts
    ListingPostingVariantProjectionBlockRepository.ts
    ProductTitleBm25SearchIndexRepository.ts
```

`listingRepositoryTypes.ts` contains shared input DTOs, literal unions and
constants. The repository files import Drizzle models from
`../models/index.js`.

## Shared types

```ts
export type ProductKind = "BASE" | "BUNDLE";
export type ListingStatus = "published" | "draft";
export type PostingEntityType = "product" | "variant";

export type PostingField =
  | "category"
  | "vendor"
  | "facet"
  | "variant_product"
  | string;

export interface PostingKeyInput {
  entityType: PostingEntityType;
  field: PostingField;
  valueKey: string;
}

export interface ProductListingIndexUpsertInput {
  productId: string;
  productDocId: number;
  kind: ProductKind;
  vendorId?: string | null;
  handle?: string | null;
  status: ListingStatus;
  publishedAt?: string | null;
  productCreatedAt: string;
  productUpdatedAt: string;
  productRevision: number;
  inStock: boolean;
  totalStock: number;
}

export interface ProductListingIndexBootstrapInput {
  productId: string;
  productDocId: number;
  kind?: ProductKind;
  productCreatedAt?: string;
  productUpdatedAt?: string;
}

export type ProductListingIndexPatchInput = Partial<
  Omit<ProductListingIndexUpsertInput, "productId" | "productDocId">
>;

export interface ProductListingPriceRowInput {
  productId: string;
  currency: string;
  hasPrice: boolean;
  minPriceMinor?: number | null;
  maxPriceMinor?: number | null;
}

export interface VariantListingIndexUpsertInput {
  productId: string;
  productDocId: number;
  variantId: string;
  variantDocId: number;
  inStock: boolean;
  totalStock: number;
}

export type VariantListingIndexPatchInput = Partial<
  Omit<VariantListingIndexUpsertInput, "variantId" | "variantDocId">
>;

export interface VariantListingPriceRowInput {
  variantId: string;
  currency: string;
  hasPrice: boolean;
  priceMinor?: number | null;
}

export interface ProductSortRowInput {
  productDocId: number;
  productId: string;
  sortKind: string;
  locale?: string;
  currency?: string;
  manualScopeId?: string;
  boolValue?: boolean | null;
  timestamptzValue?: string | null;
  timestamptzValue2?: string | null;
  bigintValue?: number | null;
  textValue?: string | null;
  numericValue?: string | null;
}

export interface RuntimeVariantPriceRowInput {
  currency: string;
  variantDocId: number;
  productDocId: number;
  productId: string;
  priceMinor: number;
}

export interface ProjectionBlockRowInput {
  blockId: number;
  variantDocFrom: number;
  variantDocTo: number;
  variantBitmap: string;
  productBitmap: string;
  variantCount: number;
  productCount: number;
}

export interface ProductTitleBm25RowInput {
  productId: string;
  locale: string;
  kind: ProductKind;
  status: ListingStatus;
  publishedAt?: string | null;
  productCreatedAt: string;
  productUpdatedAt: string;
  productRevision: number;
  title: string;
}

export interface PostingBitmapUpsertInput extends PostingKeyInput {
  bitmap: string;
  cardinality: number;
  metadata?: Record<string, unknown>;
}

export interface PostingBitmapReplaceInput extends PostingBitmapUpsertInput {}

export interface PostingDocIdsMutationInput extends PostingKeyInput {
  docIds: readonly number[];
}
```

Default values:

```ts
export const ZERO_UUID = "00000000-0000-0000-0000-000000000000";
export const DEFAULT_VARIANT_PROJECTION_BLOCK_SIZE = 4096;
```

The projection block size must be defined in one place. Initial block `0` covers
variant doc ids `[1, 4097)`, block `1` covers `[4097, 8193)`, and so on:

```ts
blockId = Math.floor((variantDocId - 1) / blockSize);
variantDocFrom = blockId * blockSize + 1;
variantDocTo = variantDocFrom + blockSize;
```

## Repository registration

`Repository.ts` should expose concrete repositories:

```ts
export class Repository {
  public readonly listingDocIdAllocator: ListingDocIdAllocatorRepository;
  public readonly productListingIndex: ProductListingIndexRepository;
  public readonly productListingPriceIndex: ProductListingPriceIndexRepository;
  public readonly variantListingIndex: VariantListingIndexRepository;
  public readonly variantListingPriceIndex: VariantListingPriceIndexRepository;
  public readonly listingPostingBitmap: ListingPostingBitmapRepository;
  public readonly listingPostingProductSort: ListingPostingProductSortRepository;
  public readonly listingPostingVariantPrice: ListingPostingVariantPriceRepository;
  public readonly listingPostingVariantProjectionBlock: ListingPostingVariantProjectionBlockRepository;
  public readonly productTitleBm25SearchIndex: ProductTitleBm25SearchIndexRepository;
  public readonly txManager: TransactionManager<Database>;
}
```

`Repository.create({ db })` creates one shared `TransactionManager` and passes it
to every repository instance.

## Transaction strategy

Single-row `find` and `exists` methods are read-only.

Single-row `upsert`, `update`, `delete` methods can run inside or outside a
larger transaction, but must still use `this.connection`.

Multi-step methods must be transactional:

- doc id allocation;
- `replaceForProduct`;
- `replaceForVariant`;
- posting membership replacement;
- projection block rebuild;
- project-scoped BM25 rebuild delete+insert.

The preferred caller model is:

```ts
await repository.txManager.run(async () => {
  await repository.listingDocIdAllocator.allocateProductDocIds(productIds);
  await repository.productListingIndex.upsertMany(rows);
  await repository.productListingPriceIndex.replaceForProducts(priceRows);
});
```

Repository methods must not open unrelated database connections.

## Write ordering supported by repositories

Repositories should make this sync order possible:

1. Ensure allocator row and allocate/preserve `product_doc_id`.
2. Create bootstrap parent product listing rows when variants need FK safety.
3. Allocate/preserve `variant_doc_id`.
4. Upsert variant listing rows.
5. Replace variant source/debug price rows.
6. Replace variant facet and `variant_product` bitmap memberships.
7. Replace runtime variant price rows for priced in-stock variants.
8. Refresh touched projection blocks.
9. Upsert final product listing rows with stock aggregates.
10. Replace product aggregate price rows.
11. Replace product facet/scope/vendor bitmap memberships.
12. Replace product sort rows.
13. Upsert or delete BM25 title rows when title/locales/visibility change.

## `ListingDocIdAllocatorRepository`

Table: `listing.listing_doc_id_allocator`.

Purpose: allocate stable integer runtime ids per project.

### Methods

```ts
class ListingDocIdAllocatorRepository extends BaseRepository {
  exists(): Promise<boolean>;
  find(): Promise<ListingDocIdAllocator | null>;
  ensureAllocatorRow(): Promise<ListingDocIdAllocator>;
  lockAllocatorRow(): Promise<ListingDocIdAllocator>;

  getExistingProductDocIds(productIds: readonly string[]): Promise<Map<string, number>>;
  getExistingVariantDocIds(variantIds: readonly string[]): Promise<Map<string, number>>;

  allocateProductDocIds(productIds: readonly string[]): Promise<Map<string, number>>;
  allocateVariantDocIds(variantIds: readonly string[]): Promise<Map<string, number>>;

  updateCounters(input: {
    nextProductDocId?: number;
    nextVariantDocId?: number;
  }): Promise<ListingDocIdAllocator>;
}
```

### Implementation details

- `ensureAllocatorRow()` uses `insert ... on conflict do nothing`.
- `lockAllocatorRow()` selects the allocator row with `FOR UPDATE`.
- Allocation reads existing doc ids from
  `product_listing_index` / `variant_listing_index` first.
- Only missing canonical ids receive new doc ids.
- Allocation increments counters in the same transaction after ids are assigned.
- Deleted ids are not returned to the allocator.
- `updateCounters` is not used for normal sync except internal allocation and
  repair tooling.

### Acceptance

- Concurrent allocation in the same project cannot assign duplicate doc ids.
- Existing product/variant rows keep their original doc ids.
- Empty input returns an empty map and does not lock.

## `ProductListingIndexRepository`

Table: `listing.product_listing_index`.

Purpose: source/debug listing row for product-level state and stable
`product_doc_id`.

### Methods

```ts
class ProductListingIndexRepository extends BaseRepository {
  exists(productId: string): Promise<boolean>;
  existsByDocId(productDocId: number): Promise<boolean>;
  findByProductId(productId: string): Promise<ProductListingIndex | null>;
  findByProductDocId(productDocId: number): Promise<ProductListingIndex | null>;
  getByProductIds(productIds: readonly string[]): Promise<ProductListingIndex[]>;
  getByProductDocIds(productDocIds: readonly number[]): Promise<ProductListingIndex[]>;
  count(): Promise<number>;

  createBootstrapRow(input: {
    productId: string;
    productDocId: number;
    productCreatedAt: string;
    productUpdatedAt: string;
  }): Promise<ProductListingIndex>;
  ensureBootstrapRows(rows: readonly ProductListingIndexBootstrapInput[]): Promise<ProductListingIndex[]>;

  upsert(input: ProductListingIndexUpsertInput): Promise<ProductListingIndex>;
  upsertMany(rows: readonly ProductListingIndexUpsertInput[]): Promise<ProductListingIndex[]>;

  update(productId: string, patch: ProductListingIndexPatchInput): Promise<ProductListingIndex | null>;
  updateStockAggregate(productId: string, input: {
    inStock: boolean;
    totalStock: number;
  }): Promise<ProductListingIndex | null>;

  delete(productId: string): Promise<boolean>;
  deleteByProductIds(productIds: readonly string[]): Promise<number>;
  deleteByProductDocIds(productDocIds: readonly number[]): Promise<number>;
}
```

### Bootstrap row rules

`ensureBootstrapRows` exists for variant sync, because
`variant_listing_index` references parent product listing rows. Bootstrap rows
must be safe placeholders:

- `storeId = this.storeId`;
- allocated `productDocId`;
- `kind = "BASE"` unless snapshot provides the real value;
- `status = "draft"`;
- `inStock = false`;
- `totalStock = 0`;
- timestamps from snapshot if available, otherwise current ISO time.

Final product sync overwrites the bootstrap row.

### Upsert rules

- Conflict target follows the table key: `product_id`.
- Insert sets `storeId`, `indexedAt` and `updatedAt`.
- Update never changes `productDocId`.
- Update sets product state, aggregate stock fields, `indexedAt` and
  `updatedAt`.
- All `find/update/delete` predicates include `store_id = this.storeId`.

### Acceptance

- No raw `tag_handles`, `feature_value_handles`, `category_handles` or other
  source handles are accepted.
- `delete` removes the product row and lets local dependent rows cascade where
  FK exists. Posting memberships still need explicit removal before delete.

## `ProductListingPriceIndexRepository`

Table: `listing.product_listing_price_index`.

Purpose: per-currency product aggregate price rows.

### Methods

```ts
class ProductListingPriceIndexRepository extends BaseRepository {
  exists(productId: string, currency: string): Promise<boolean>;
  find(productId: string, currency: string): Promise<ProductListingPriceIndex | null>;
  getByProductId(productId: string): Promise<ProductListingPriceIndex[]>;
  getByProductIds(productIds: readonly string[], currencies?: readonly string[]): Promise<ProductListingPriceIndex[]>;
  count(): Promise<number>;

  upsert(row: ProductListingPriceRowInput): Promise<ProductListingPriceIndex>;
  upsertMany(rows: readonly ProductListingPriceRowInput[]): Promise<ProductListingPriceIndex[]>;

  replaceForProduct(productId: string, rows: readonly ProductListingPriceRowInput[]): Promise<ProductListingPriceIndex[]>;
  replaceForProducts(rowsByProductId: ReadonlyMap<string, readonly ProductListingPriceRowInput[]>): Promise<ProductListingPriceIndex[]>;

  delete(productId: string, currency: string): Promise<boolean>;
  deleteByProductId(productId: string): Promise<number>;
  deleteByProductIds(productIds: readonly string[]): Promise<number>;
}
```

### Replace rules

- `replaceForProduct` deletes current rows for the product in current project,
  then inserts the provided rows.
- Callers must pass one row per enabled currency.
- No priced in-stock variants means `hasPrice = false`,
  `minPriceMinor = null`, `maxPriceMinor = null`.
- `hasPrice = true` requires non-null non-negative min/max and
  `maxPriceMinor >= minPriceMinor`.

### Acceptance

- `replaceForProducts` executes delete and insert in one transaction.
- Empty row list for a product deletes all product price rows.

## `VariantListingIndexRepository`

Table: `listing.variant_listing_index`.

Purpose: source/debug listing row for variant-level stock and stable
`variant_doc_id`.

### Methods

```ts
class VariantListingIndexRepository extends BaseRepository {
  exists(variantId: string): Promise<boolean>;
  existsByDocId(variantDocId: number): Promise<boolean>;
  findByVariantId(variantId: string): Promise<VariantListingIndex | null>;
  findByVariantDocId(variantDocId: number): Promise<VariantListingIndex | null>;
  getByVariantIds(variantIds: readonly string[]): Promise<VariantListingIndex[]>;
  getByVariantDocIds(variantDocIds: readonly number[]): Promise<VariantListingIndex[]>;
  getByProductIds(productIds: readonly string[]): Promise<VariantListingIndex[]>;
  getByProductDocIds(productDocIds: readonly number[]): Promise<VariantListingIndex[]>;
  count(): Promise<number>;

  upsert(row: VariantListingIndexUpsertInput): Promise<VariantListingIndex>;
  upsertMany(rows: readonly VariantListingIndexUpsertInput[]): Promise<VariantListingIndex[]>;

  update(variantId: string, patch: VariantListingIndexPatchInput): Promise<VariantListingIndex | null>;
  updateStock(variantId: string, input: {
    inStock: boolean;
    totalStock: number;
  }): Promise<VariantListingIndex | null>;

  delete(variantId: string): Promise<boolean>;
  deleteByVariantIds(variantIds: readonly string[]): Promise<number>;
  deleteByProductId(productId: string): Promise<number>;
  deleteByProductIds(productIds: readonly string[]): Promise<number>;

  getActiveVariantIdsByProductIds(productIds: readonly string[]): Promise<Map<string, string[]>>;
  getStockAggregatesByProductIds(productIds: readonly string[]): Promise<Map<string, {
    inStock: boolean;
    totalStock: number;
  }>>;
}
```

### Upsert rules

- Conflict target follows the table key: `variant_id`.
- Insert sets `storeId`, `indexedAt`, `updatedAt`.
- Update never changes `variantDocId`.
- Update may change parent `productId` / `productDocId` only when the upstream
  variant parent changed and caller also refreshes projection blocks and
  `variant_product` posting memberships.
- `totalStock` must be non-negative.

### Aggregate rules

`getStockAggregatesByProductIds` groups current variant rows by product:

- `inStock = bool_or(variant.in_stock)`;
- `totalStock = sum(variant.total_stock)`.

These aggregate helpers are write-side support for product sync, not storefront
listing query methods.

## `VariantListingPriceIndexRepository`

Table: `listing.variant_listing_price_index`.

Purpose: source/debug per-currency variant price rows.

### Methods

```ts
class VariantListingPriceIndexRepository extends BaseRepository {
  exists(variantId: string, currency: string): Promise<boolean>;
  find(variantId: string, currency: string): Promise<VariantListingPriceIndex | null>;
  getByVariantId(variantId: string): Promise<VariantListingPriceIndex[]>;
  getByVariantIds(variantIds: readonly string[], currencies?: readonly string[]): Promise<VariantListingPriceIndex[]>;
  getByProductIds(productIds: readonly string[], currencies?: readonly string[]): Promise<VariantListingPriceIndex[]>;
  count(): Promise<number>;

  upsert(row: VariantListingPriceRowInput): Promise<VariantListingPriceIndex>;
  upsertMany(rows: readonly VariantListingPriceRowInput[]): Promise<VariantListingPriceIndex[]>;

  replaceForVariant(variantId: string, rows: readonly VariantListingPriceRowInput[]): Promise<VariantListingPriceIndex[]>;
  replaceForVariants(rowsByVariantId: ReadonlyMap<string, readonly VariantListingPriceRowInput[]>): Promise<VariantListingPriceIndex[]>;

  delete(variantId: string, currency: string): Promise<boolean>;
  deleteByVariantId(variantId: string): Promise<number>;
  deleteByVariantIds(variantIds: readonly string[]): Promise<number>;
  deleteByProductId(productId: string): Promise<number>;
  deleteByProductIds(productIds: readonly string[]): Promise<number>;

  getPriceAggregatesByProductIds(productIds: readonly string[], currencies: readonly string[]): Promise<Map<string, ProductListingPriceRowInput[]>>;
}
```

### Replace rules

- `replaceForVariant` deletes current rows for one variant and inserts provided
  rows.
- Callers pass one row per enabled currency.
- No price means `hasPrice = false`, `priceMinor = null`.
- `hasPrice = true` requires non-null non-negative `priceMinor`.

### Product aggregate rules

`getPriceAggregatesByProductIds` joins `variant_listing_index` and
`variant_listing_price_index`:

- only current project rows;
- only `variant_listing_index.in_stock = true`;
- only `variant_listing_price_index.has_price = true`;
- group by product and currency;
- return min/max for product aggregate rows.

This method supports product price row writes. It is not a storefront price
filter query.

## `ListingPostingBitmapRepository`

Table: `listing.listing_posting_bitmap`.

Purpose: write and maintain roaring bitmap rows keyed by
`entity_type + field + value_key`.

### Methods

```ts
class ListingPostingBitmapRepository extends BaseRepository {
  exists(key: PostingKeyInput): Promise<boolean>;
  findByKey(key: PostingKeyInput): Promise<ListingPostingBitmap | null>;
  getByKeys(keys: readonly PostingKeyInput[]): Promise<ListingPostingBitmap[]>;
  getByField(input: {
    entityType: PostingEntityType;
    field: PostingField;
    valueKeys?: readonly string[];
  }): Promise<ListingPostingBitmap[]>;
  count(): Promise<number>;

  upsertPostingBitmap(input: PostingBitmapUpsertInput): Promise<ListingPostingBitmap>;
  replacePostingBitmap(input: PostingBitmapReplaceInput): Promise<ListingPostingBitmap>;
  deleteByKey(key: PostingKeyInput): Promise<boolean>;
  deleteByKeys(keys: readonly PostingKeyInput[]): Promise<number>;
  deleteAllForCurrentProject(): Promise<number>;

  addDocIds(input: PostingDocIdsMutationInput): Promise<void>;
  removeDocIds(input: PostingDocIdsMutationInput): Promise<void>;

  getMembershipKeys(input: {
    entityType: PostingEntityType;
    docId: number;
    field?: PostingField;
    valueKeyPrefixes?: readonly string[];
  }): Promise<PostingKeyInput[]>;

  replaceProductMemberships(input: {
    productDocId: number;
    field: PostingField;
    nextValueKeys: readonly string[];
    valueKeyPrefixes?: readonly string[];
  }): Promise<PostingMembershipReplaceResult>;

  replaceVariantMemberships(input: {
    variantDocId: number;
    field: PostingField;
    nextValueKeys: readonly string[];
    valueKeyPrefixes?: readonly string[];
  }): Promise<PostingMembershipReplaceResult>;

  deleteProductMemberships(productDocId: number): Promise<PostingMembershipReplaceResult>;
  deleteVariantMemberships(variantDocId: number): Promise<PostingMembershipReplaceResult>;
}
```

### Bitmap mutation SQL rules

Use raw SQL for `pg_roaringbitmap` operations through Drizzle `sql`.

Add doc ids:

```sql
bitmap = bitmap | rb_build_agg(:doc_id)
cardinality = rb_cardinality(bitmap)
updated_at = now()
```

Remove doc ids:

```sql
bitmap = bitmap - rb_build_agg(:doc_id)
cardinality = rb_cardinality(bitmap)
updated_at = now()
```

Implementation can build the add/remove bitmap in a CTE:

```sql
WITH input_doc_ids(doc_id) AS (
  SELECT unnest(:docIds::int[])
),
delta AS (
  SELECT rb_build_agg(doc_id) AS bitmap
  FROM input_doc_ids
)
...
```

After removal, delete rows where `cardinality = 0`.

### Membership replacement rules

`replaceProductMemberships` and `replaceVariantMemberships` operate per field.
They:

1. load current posting keys where `bitmap @> docId`;
2. optionally restrict current keys by `valueKeyPrefixes`;
3. compute keys to add and keys to remove;
4. update removed and added rows in one transaction;
5. return counters.

For facet refresh by selected facet ids, pass prefixes:

```text
valueKeyPrefixes = ["<facet_id>:"]
```

For full product facet refresh, omit prefixes and use `field = "facet"`.

### Required posting field usage

- Product category scope: `entityType = "product"`, `field = "category"`.
- Product vendor: `entityType = "product"`, `field = "vendor"`.
- Product tag/feature facets: `entityType = "product"`, `field = "facet"`,
  `valueKey = "<facet_id>:<facet_value_id>"`.
- Variant option facets: `entityType = "variant"`, `field = "facet"`,
  `valueKey = "<facet_id>:<facet_value_id>"`.
- Variant parent mapping: `entityType = "variant"`,
  `field = "variant_product"`, `valueKey = "<product_doc_id>"`.

### Acceptance

- No repository method accepts `product_id`, `variant_id`, `facet_id` or
  `facet_value_id` columns for posting row keys.
- `cardinality` always equals `rb_cardinality(bitmap)` after write.
- Missing posting row is a valid empty state.

## `ListingPostingProductSortRepository`

Table: `listing.listing_posting_product_sort`.

Purpose: write physical product sort rows. It does not execute page collection.

### Methods

```ts
class ListingPostingProductSortRepository extends BaseRepository {
  exists(key: ProductSortKeyInput): Promise<boolean>;
  find(key: ProductSortKeyInput): Promise<ListingPostingProductSort | null>;
  getByProductDocId(productDocId: number): Promise<ListingPostingProductSort[]>;
  getByProductDocIds(productDocIds: readonly number[]): Promise<ListingPostingProductSort[]>;
  getByProductIds(productIds: readonly string[]): Promise<ListingPostingProductSort[]>;
  count(): Promise<number>;

  upsert(row: ProductSortRowInput): Promise<ListingPostingProductSort>;
  upsertMany(rows: readonly ProductSortRowInput[]): Promise<ListingPostingProductSort[]>;

  replaceForProduct(productDocId: number, rows: readonly ProductSortRowInput[]): Promise<ListingPostingProductSort[]>;
  replaceForProducts(rowsByProductDocId: ReadonlyMap<number, readonly ProductSortRowInput[]>): Promise<ListingPostingProductSort[]>;

  delete(key: ProductSortKeyInput): Promise<boolean>;
  deleteByProductDocId(productDocId: number): Promise<number>;
  deleteByProductDocIds(productDocIds: readonly number[]): Promise<number>;
  deleteByProductId(productId: string): Promise<number>;
  deleteByProductIds(productIds: readonly string[]): Promise<number>;
  deleteAllForCurrentProject(): Promise<number>;
}
```

`ProductSortKeyInput`:

```ts
interface ProductSortKeyInput {
  productDocId: number;
  sortKind: string;
  locale?: string;
  currency?: string;
  manualScopeId?: string;
}
```

### Replace rules

- `locale` defaults to empty string.
- `currency` defaults to empty string.
- `manualScopeId` defaults to zero UUID.
- `replaceForProduct` deletes current sort rows for product doc id and inserts
  the provided derived rows.
- Sort rows should be written only for expected sort dimensions. Do not add one
  generic catch-all sort row.
- `boolValue` stores availability bucket for hot storefront sorts.

### Acceptance

- Repository writes rows for sort indexes only. It does not expose
  `collectProductPage`.
- Product sort rows are deleted before the parent product listing row is
  deleted if the caller needs explicit cleanup. FK cascade also removes them
  when parent row is deleted.

## `ListingPostingVariantPriceRepository`

Table: `listing.listing_posting_variant_price`.

Purpose: write runtime typed price rows for price range filtering and matched
price sort. It does not execute price page collection.

### Methods

```ts
class ListingPostingVariantPriceRepository extends BaseRepository {
  exists(currency: string, variantDocId: number): Promise<boolean>;
  find(currency: string, variantDocId: number): Promise<ListingPostingVariantPrice | null>;
  getByVariantDocId(variantDocId: number): Promise<ListingPostingVariantPrice[]>;
  getByVariantDocIds(variantDocIds: readonly number[]): Promise<ListingPostingVariantPrice[]>;
  getByProductDocId(productDocId: number): Promise<ListingPostingVariantPrice[]>;
  getByProductDocIds(productDocIds: readonly number[]): Promise<ListingPostingVariantPrice[]>;
  count(): Promise<number>;

  upsert(row: RuntimeVariantPriceRowInput): Promise<ListingPostingVariantPrice>;
  upsertMany(rows: readonly RuntimeVariantPriceRowInput[]): Promise<ListingPostingVariantPrice[]>;

  replaceForVariant(variantDocId: number, rows: readonly RuntimeVariantPriceRowInput[]): Promise<ListingPostingVariantPrice[]>;
  replaceForVariants(rowsByVariantDocId: ReadonlyMap<number, readonly RuntimeVariantPriceRowInput[]>): Promise<ListingPostingVariantPrice[]>;
  replaceForProductDocId(productDocId: number, rows: readonly RuntimeVariantPriceRowInput[]): Promise<ListingPostingVariantPrice[]>;

  delete(currency: string, variantDocId: number): Promise<boolean>;
  deleteByVariantDocId(variantDocId: number): Promise<number>;
  deleteByVariantDocIds(variantDocIds: readonly number[]): Promise<number>;
  deleteByProductDocId(productDocId: number): Promise<number>;
  deleteByProductDocIds(productDocIds: readonly number[]): Promise<number>;
  deleteAllForCurrentProject(): Promise<number>;
}
```

### Write rules

- Rows exist only for variants that are active, in stock and priced.
- Repository input should already be filtered by builder/script.
- Repository still validates `priceMinor >= 0`.
- `replaceForVariant` deletes all current runtime price rows for the variant doc
  id and inserts the new rows.
- Out-of-stock or unpriced variant means an empty row list and therefore delete
  all runtime rows for that variant.

### Acceptance

- No generic `price` posting bitmap rows are created.
- Repository does not expose `collectMatchedPricePage`.

## `ListingPostingVariantProjectionBlockRepository`

Table: `listing.listing_posting_variant_storeion_block`.

Purpose: write projection helper blocks that map broad variant bitmap matches to
product bitmaps.

### Methods

```ts
class ListingPostingVariantProjectionBlockRepository extends BaseRepository {
  exists(blockId: number): Promise<boolean>;
  findByBlockId(blockId: number): Promise<ListingPostingVariantProjectionBlock | null>;
  getByBlockIds(blockIds: readonly number[]): Promise<ListingPostingVariantProjectionBlock[]>;
  getBlocksForVariantDocIds(variantDocIds: readonly number[], blockSize?: number): Promise<ListingPostingVariantProjectionBlock[]>;
  count(): Promise<number>;

  upsertBlock(row: ProjectionBlockRowInput): Promise<ListingPostingVariantProjectionBlock>;
  upsertBlocks(rows: readonly ProjectionBlockRowInput[]): Promise<ListingPostingVariantProjectionBlock[]>;
  replaceBlocks(rows: readonly ProjectionBlockRowInput[]): Promise<ListingPostingVariantProjectionBlock[]>;

  deleteBlock(blockId: number): Promise<boolean>;
  deleteBlocks(blockIds: readonly number[]): Promise<number>;
  deleteAllForCurrentProject(): Promise<number>;

  getBlockIdsForVariantDocIds(variantDocIds: readonly number[], blockSize?: number): number[];
  refreshBlocksForVariantDocIds(variantDocIds: readonly number[], blockSize?: number): Promise<ListingPostingVariantProjectionBlock[]>;
  refreshBlocksForProductDocIds(productDocIds: readonly number[], blockSize?: number): Promise<ListingPostingVariantProjectionBlock[]>;
  rebuildProjectBlocks(blockSize?: number): Promise<ListingPostingVariantProjectionBlock[]>;
}
```

### Refresh rules

`refreshBlocksForVariantDocIds`:

1. derive touched `blockId` values from `variantDocIds`;
2. for each block, read current `variant_listing_index` rows in
   `[variantDocFrom, variantDocTo)`;
3. build `variantBitmap = rb_build_agg(variant_doc_id)`;
4. build `productBitmap = rb_build_agg(product_doc_id)`;
5. set counts from `rb_cardinality`;
6. upsert block rows;
7. delete block rows that have no variants after deletes.

`refreshBlocksForProductDocIds` finds current variants for products, then calls
`refreshBlocksForVariantDocIds`.

`rebuildProjectBlocks` deletes current project blocks and rebuilds them from
all current `variant_listing_index` rows.

### Acceptance

- Repository writes projection rows only. It does not expose query-side
  `projectVariantBitmapToProductsSql`.
- `variantCount` and `productCount` always match stored bitmaps.

## `ProductTitleBm25SearchIndexRepository`

Table: `listing.product_title_bm25_search_index`.

Purpose: write localized product title rows for BM25. It does not execute search
queries.

### Methods

```ts
class ProductTitleBm25SearchIndexRepository extends BaseRepository {
  exists(productId: string, locale: string): Promise<boolean>;
  find(productId: string, locale: string): Promise<ProductTitleBm25SearchIndex | null>;
  getByProductId(productId: string): Promise<ProductTitleBm25SearchIndex[]>;
  getByProductIds(productIds: readonly string[], locales?: readonly string[]): Promise<ProductTitleBm25SearchIndex[]>;
  getLocalesByProductId(productId: string): Promise<string[]>;
  count(): Promise<number>;

  upsert(row: ProductTitleBm25RowInput): Promise<ProductTitleBm25SearchIndex>;
  upsertMany(rows: readonly ProductTitleBm25RowInput[]): Promise<ProductTitleBm25SearchIndex[]>;

  replaceForProduct(productId: string, rows: readonly ProductTitleBm25RowInput[]): Promise<ProductTitleBm25SearchIndex[]>;
  replaceForProducts(rowsByProductId: ReadonlyMap<string, readonly ProductTitleBm25RowInput[]>): Promise<ProductTitleBm25SearchIndex[]>;

  delete(productId: string, locale: string): Promise<boolean>;
  deleteByProductId(productId: string): Promise<number>;
  deleteByProductIds(productIds: readonly string[]): Promise<number>;
  deleteByLocale(locale: string): Promise<number>;
  deleteAllForCurrentProject(): Promise<number>;
}
```

### Upsert rules

- Insert creates a new `searchId` with UUIDv7.
- Update preserves existing `searchId`.
- Conflict target is `(product_id, locale)`.
- Row contains title only as searchable text.
- Do not persist description, SEO text, handle, vendor, tag, feature, option or
  category text.
- Deleted/missing product means `deleteByProductId`.
- Locale removal means delete rows for locales no longer enabled.

### Acceptance

- Project-scoped delete affects only current `store_id`.
- Search query methods are not present in this repository.

## Cross-table delete flows

Repositories expose small delete methods, but scripts must call them in safe
order.

### Product delete

1. Load product row and child variant rows.
2. `listingPostingBitmap.deleteVariantMemberships` for child variant doc ids.
3. `listingPostingVariantPrice.deleteByVariantDocIds`.
4. `variantListingPriceIndex.deleteByVariantIds`.
5. `variantListingIndex.deleteByVariantIds`.
6. `listingPostingBitmap.deleteProductMemberships`.
7. `listingPostingProductSort.deleteByProductDocId`.
8. `productListingPriceIndex.deleteByProductId`.
9. `productTitleBm25SearchIndex.deleteByProductId`.
10. `productListingIndex.delete`.
11. Refresh projection blocks for touched child variant doc ids.
12. Do not modify allocator counters.

### Variant delete

1. Load variant row.
2. `listingPostingBitmap.deleteVariantMemberships`.
3. `listingPostingVariantPrice.deleteByVariantDocId`.
4. `variantListingPriceIndex.deleteByVariantId`.
5. `variantListingIndex.delete`.
6. Refresh projection blocks for touched variant doc id.
7. Refresh parent product aggregates through product sync.
8. Do not modify allocator counters.

## Error handling and validation

Repositories should throw project errors before hitting DB constraints when the
input is structurally invalid:

- empty id lists are no-op;
- duplicate rows in one bulk input are collapsed or rejected consistently;
- negative doc ids are rejected;
- negative stock and price values are rejected;
- invalid product kind/status are rejected;
- invalid posting entity type is rejected;
- `hasPrice = false` requires null price fields;
- `hasPrice = true` requires non-null valid price fields.

DB constraint errors are still possible and should not be swallowed.

## Bulk method behavior

- Empty input returns empty result/counter and does not execute SQL.
- Bulk writes should chunk large inputs to avoid parameter limits.
- Bulk replace methods must delete and insert in one transaction.
- Result ordering should match input ordering when practical. If not practical,
  document that rows are returned in DB order.
- `rowsByProductId` / `rowsByVariantId` maps must not include rows whose id
  differs from the map key.

## Observability hooks

Repositories do not own structured business logging, but return enough counters
for scripts:

```ts
interface PostingMembershipReplaceResult {
  addedMemberships: number;
  removedMemberships: number;
  touchedRows: number;
  deletedEmptyRows: number;
}

interface BulkWriteResult {
  inserted: number;
  updated: number;
  deleted: number;
}
```

Scripts can log these counters together with workflow id and sync reason.

## Implementation order

1. Add `services/listing/src/repositories/listing/listingRepositoryTypes.ts`.
2. Add listing repository barrel `services/listing/src/repositories/listing/index.ts`.
3. Implement and register `ListingDocIdAllocatorRepository`.
4. Implement `ProductListingIndexRepository` and
   `VariantListingIndexRepository`.
5. Implement `ProductListingPriceIndexRepository` and
   `VariantListingPriceIndexRepository`.
6. Implement `ListingPostingBitmapRepository` with raw SQL helpers for roaring
   bitmap mutation.
7. Implement `ListingPostingProductSortRepository`.
8. Implement `ListingPostingVariantPriceRepository`.
9. Implement `ListingPostingVariantProjectionBlockRepository`.
10. Implement `ProductTitleBm25SearchIndexRepository`.
11. Update `Repository.ts` constructor and `create`.
12. Add repository-level unit coverage only when project testing rules allow it.
    For normal verification in this project, do not run standalone `test` or
    `tsc`; use build when a code version needs verification.

## Acceptance checklist

- [ ] `Repository.create` exposes every write repository listed in this document.
- [ ] Every repository extends `BaseRepository`.
- [ ] Every SQL statement uses `this.connection`.
- [ ] Every table access is scoped by `this.storeId`.
- [ ] Public write DTOs do not accept raw source handles.
- [ ] Public write DTOs do not accept user-provided `storeId`.
- [ ] Doc id allocator locks the allocator row and never reuses deleted ids.
- [ ] Product and variant listing upserts preserve stable doc ids.
- [ ] Product and variant price replace methods preserve empty currency rows
      with `hasPrice = false`.
- [ ] Posting bitmap writes update `bitmap`, `cardinality` and `updatedAt`
      together.
- [ ] Posting membership replacement can remove old memberships and add new ones
      in one transaction.
- [ ] Empty posting rows are deleted or consistently treated as missing.
- [ ] Product sort repository does not expose page collector methods.
- [ ] Runtime variant price repository writes only priced in-stock variants.
- [ ] Projection block repository can refresh touched blocks and rebuild current
      project blocks.
- [ ] BM25 title repository preserves `searchId` on upsert and does not expose
      search query methods.
- [ ] Product/variant delete flows remove posting memberships before deleting
      parent listing rows.
- [ ] No final storefront listing query implementation is added as part of this
      repository layer scope.
