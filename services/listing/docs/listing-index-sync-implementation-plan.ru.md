# План имплементации sync lifecycle для listing index и facets

## Назначение

Документ переводит canonical listing design в план изменений listing service.

Исходные документы:

- `services/listing/docs/listing-posting-list-search-engine-index.ru.md`
- `services/listing/docs/listing-index-db-schema.ru.md`
- `services/listing/docs/listing-index-sync-freshness.ru.md`
- `services/listing/docs/listing-query-sql-examples.ru.md`

Фокус: как обновлять SQL listing read model, roaring posting bitmap rows,
physical sort/price indexes, projection blocks and freshness repair.

После изменения структуры listing index пересобирается rebuild script.

## Инварианты реализации

- Listing index is a derived current-state read model.
- Source of truth remains canonical catalog tables; listing service owns the
  derived read model, posting index, sync scripts and workflows.
- DB triggers are not used.
- All repository methods use transaction-aware connection and project context.
- All queries are scoped by current `project_id`.
- Product aggregate price/stock is computed from `variant_listing_index` and
  `variant_listing_price_index`, not directly from canonical price/stock tables.
- Runtime storefront facets read resolved `facet_id` / `facet_value_id` through
  `value_key = <facet_id>:<facet_value_id>`.
- Raw source handles are transient sync inputs only; do not store them in listing
  rows or runtime posting rows.
- Posting rows are bitmap rows keyed by
  `(project_id, entity_type, field, value_key)`.
- Replace/update operations for listing rows and posting memberships run inside
  transaction.
- Do not run standalone `test` or `tsc` for verification. If code verification is
  needed, use project build workflow/shopana-cli.
- Do not edit changeset files manually.

## Целевая последовательность записи

For one product:

1. ensure product doc id and parent `product_listing_index` row;
2. upsert `variant_listing_index`;
3. replace `variant_listing_price_index`;
4. replace variant facet bitmap memberships;
5. refresh `listing_posting_variant_price`;
6. refresh touched projection blocks;
7. upsert final `product_listing_index` aggregates;
8. replace `product_listing_price_index`;
9. replace product facet/scope/vendor bitmap memberships;
10. refresh `listing_posting_product_sort`.

Reason: product aggregate reads variant listing state. Variant rows and runtime
price/projection physical indexes must be current before product aggregate and
storefront page collectors rely on them.

## Фаза 1. Drizzle models and registration

Align `services/listing/src/repositories/models/listingIndex.ts` with
`services/listing/docs/listing-index-db-schema.ru.md`.

Models must include:

- `listingDocIdAllocator`
- `productListingIndex`
- `productListingPriceIndex`
- `variantListingIndex`
- `variantListingPriceIndex`
- `listingPostingBitmap`
- `listingPostingProductSort`
- `listingPostingVariantPrice`
- `listingPostingVariantProjectionBlock`
- `productTitleBm25SearchIndex`, if BM25 work is included in the same cutover

Do not recreate legacy raw-handle array columns or row-based facet token tables.

Register repositories in `services/listing/src/repositories/Repository.ts`:

- `listingDocIdAllocator`
- `productListingIndex`
- `productListingPriceIndex`
- `variantListingIndex`
- `variantListingPriceIndex`
- `listingPostingBitmap`
- `listingPostingProductSort`
- `listingPostingVariantPrice`
- `listingPostingVariantProjectionBlock`
- `listingSource`
- `listingFacetMapping`
- `listingFreshness`

All repositories should extend the existing repository base pattern and use
`this.connection`.

## Фаза 2. Doc id allocation

Create `ListingDocIdAllocatorRepository`.

Required methods:

- `ensureAllocatorRow()`
- `allocateProductDocIds(productIds)`
- `allocateVariantDocIds(variantIds)`
- `getExistingProductDocIds(productIds)`
- `getExistingVariantDocIds(variantIds)`

Allocation rules:

- lock allocator row with `FOR UPDATE`;
- preserve existing doc ids;
- allocate only for new listing rows;
- increment counters in the same transaction;
- never reuse deleted ids.

The allocator does not need separate dictionary tables. Stable ids live in
`product_listing_index` and `variant_listing_index`.

## Фаза 3. Listing row repositories

### ProductListingIndexRepository

Required methods:

- `findByProductId(productId)`
- `getByProductIds(productIds)`
- `ensureBootstrapRows(rows)`
- `upsert(row)`
- `upsertMany(rows)`
- `delete(productId)`
- `deleteByProductIds(productIds)`
- `getStaleProducts(params)`

`ensureBootstrapRows` creates parent rows for variant FK safety during product
create flow. It must include allocated `product_doc_id` and safe empty
aggregates. Final product sync overwrites the row later.

### ProductListingPriceIndexRepository

Required methods:

- `replaceForProduct(productId, rows)`
- `replaceForProducts(rowsByProductId)`
- `deleteByProductId(productId)`
- `deleteByProductIds(productIds)`
- `getByProductIds(productIds, currencies?)`
- `getStalePriceAggregates(params)`

Caller must preserve empty rows for enabled currencies with `has_price = false`
and NULL price bounds.

### VariantListingIndexRepository

Required methods:

- `findByVariantId(variantId)`
- `getByVariantIds(variantIds)`
- `getByProductIds(productIds)`
- `upsert(row)`
- `upsertMany(rows)`
- `delete(variantId)`
- `deleteByVariantIds(variantIds)`
- `deleteByProductId(productId)`
- `getStockAggregatesByProductIds(productIds)`
- `getActiveVariantIdsByProductIds(productIds)`
- `getStaleVariants(params)`

Rows include `product_doc_id` and `variant_doc_id`. They do not include raw
option handles.

### VariantListingPriceIndexRepository

Required methods:

- `replaceForVariant(variantId, rows)`
- `replaceForVariants(rowsByVariantId)`
- `deleteByVariantId(variantId)`
- `deleteByVariantIds(variantIds)`
- `deleteByProductId(productId)`
- `getPriceAggregatesByProductIds(productIds, currencies)`
- `getStaleVariantPrices(params)`

`getPriceAggregatesByProductIds` groups only rows where parent variant listing
row is in stock and price row has `has_price = true`.

## Фаза 4. Posting and physical-index repositories

### ListingPostingBitmapRepository

Required methods:

- `getPostingBitmap(input)`
- `getPostingBitmaps(inputs)`
- `upsertPostingBitmap(input)`
- `replacePostingBitmap(input)`
- `addDocIds(input)`
- `removeDocIds(input)`
- `replaceProductMemberships(input)`
- `replaceVariantMemberships(input)`
- `deleteProductMemberships(productDocId)`
- `deleteVariantMemberships(variantDocId)`
- `deleteByProject(projectId)`
- `getBitmapCardinalityMismatches(params)`

Inputs use:

```ts
type PostingEntityType = "product" | "variant";

interface PostingKey {
  projectId: string;
  entityType: PostingEntityType;
  field: string;
  valueKey: string;
}
```

Implementation detail:

- product membership writes add/remove `product_doc_id`;
- variant membership writes add/remove `variant_doc_id`;
- `cardinality` updates together with `bitmap`;
- missing value posting row means empty bitmap on read path.

Do not expose methods that insert row-token records with `product_id`,
`variant_id`, `facet_id`, `facet_value_id`.

### ListingPostingProductSortRepository

Required methods:

- `replaceForProduct(productDocId, rows)`
- `replaceForProducts(rowsByProductDocId)`
- `deleteByProductDocId(productDocId)`
- `deleteByProductDocIds(productDocIds)`
- `deleteByProject(projectId)`
- `collectProductPage(input)`
- `findSortRowMismatches(params)`

Rows are derived physical indexes. They must be rebuilt from listing rows,
product price rows, translations and manual scope ranks.

### ListingPostingVariantPriceRepository

Required methods:

- `replaceForVariant(variantDocId, rows)`
- `replaceForVariants(rowsByVariantDocId)`
- `deleteByVariantDocId(variantDocId)`
- `deleteByVariantDocIds(variantDocIds)`
- `deleteByProductDocId(productDocId)`
- `deleteByProject(projectId)`
- `collectMatchedPricePage(input)`
- `findRuntimePriceMismatches(params)`

Rows exist only for active in-stock variants with price in a currency.

### ListingPostingVariantProjectionBlockRepository

Required methods:

- `refreshBlocksForVariantDocIds(variantDocIds)`
- `refreshBlocksForProductDocIds(productDocIds)`
- `rebuildProjectBlocks(projectId)`
- `projectVariantBitmapToProductsSql(input)`
- `findProjectionMismatches(params)`

`projectVariantBitmapToProductsSql` may return SQL fragments/macro output used
by query builder. Do not create a database helper function unless a separate
schema decision approves it.

## Фаза 5. Source and mapping repositories

### ListingSourceRepository

Read-only repository for canonical batch reads.

Required methods:

- `getProductSources(productIds)`
- `getVariantSourcesByProductIds(productIds)`
- `getVariantSourcesByVariantIds(variantIds)`
- `getProductFacetSources(productIds)`
- `getVariantOptionSources(variantIds)`
- `getCurrentVariantPrices(variantIds, currencies)`
- `getVariantStockSources(variantIds)`
- `getEnabledProjectCurrencies()`
- `getDefaultCurrency()`
- `getEnabledProjectLocales()`
- `getProductsForRebuild(cursor, limit)`
- `getVariantsForRebuild(productIds)`
- `getManualScopeRanks(productIds)`
- `getProductTranslations(productIds, locales)`

This repository may return raw handles as transient source input. Builders and
mapping repository must convert them into ids before writing listing/posting
tables.

### ListingFacetMappingRepository

Resolves transient source handles through `facet_source` and `facet_value`
source/display parent model.

Required methods:

- `resolveProductFacetMemberships(input)`
- `resolveVariantFacetMemberships(input)`
- `resolveFacetSourceMappings(handles, facetTypes)`
- `getConfiguredFacetValueIds(params)`
- `findProductsBySourceHandleChange(input)`
- `findVariantsBySourceHandleChange(input)`

Output uses `valueKey`:

```ts
interface ResolvedFacetMembership {
  entityId: string;
  entityDocId: number;
  facetId: string;
  facetValueId: string;
  facetType: "tag" | "feature" | "option";
  valueKey: string;
}
```

Resolve rules:

- unmapped handles are ignored;
- source value must be enabled;
- display parent must be enabled when used;
- if source value has `parent_id`, membership uses parent display id;
- otherwise membership uses root source value id.

## Фаза 6. Builders

Create pure builders in `services/listing/src/scripts/listing/`.

Builders do not perform DB calls.

Required builders:

- `ProductListingRowBuilder`
- `VariantListingRowBuilder`
- `ProductPriceRowsBuilder`
- `VariantPriceRowsBuilder`
- `PostingMembershipBuilder`
- `ProductSortRowsBuilder`
- `RuntimeVariantPriceRowsBuilder`

Builder outputs:

- product/variant listing rows;
- price rows for all enabled currencies;
- transient source handles for mapping;
- product posting memberships;
- variant posting memberships;
- product sort rows for expected sort dimensions;
- runtime variant price rows for priced in-stock variants.

Builders must not include raw handle arrays in listing row outputs.

## Фаза 7. Sync scripts

Create `services/listing/src/scripts/listing/` and export scripts through a local
barrel.

### SyncVariantListingIndexScript

Input:

```ts
interface SyncVariantListingIndexParams {
  productIds?: string[];
  variantIds?: string[];
  reason: ListingIndexSyncReason;
  changedCurrencies?: string[];
}
```

Algorithm:

1. Normalize input and load parent product ids.
2. Load product sources for parents and ensure bootstrap product rows/doc ids.
3. Load enabled currencies.
4. Load variant sources, option sources, prices and stock.
5. Allocate missing variant doc ids.
6. Build active variant rows and price rows.
7. Delete stale rows for missing/inactive variants:
   - variant bitmap memberships;
   - runtime variant price rows;
   - variant price rows;
   - variant listing rows.
8. Upsert active variant rows.
9. Replace variant price rows.
10. Resolve option memberships and replace variant bitmap memberships.
11. Refresh `variant_product` posting memberships.
12. Replace runtime variant price rows.
13. Refresh projection blocks for touched variant doc ids.
14. Execute product sync for affected products with `refreshVariantsFirst = false`.

### SyncProductListingIndexScript

Input:

```ts
interface SyncProductListingIndexParams {
  productIds: string[];
  reason: ListingIndexSyncReason;
  refreshVariantsFirst?: boolean;
}
```

Algorithm:

1. If `refreshVariantsFirst`, execute variant sync for products.
2. Load product sources and detect missing/deleted products.
3. Allocate missing product doc ids.
4. For deleted products, execute delete script.
5. Load product facet/source data, stock aggregates, price aggregates,
   translations and manual ranks.
6. Build product listing rows, product price rows, product bitmap memberships and
   product sort rows.
7. Upsert product listing rows.
8. Replace product price rows.
9. Resolve product tag/feature memberships.
10. Replace product bitmap memberships: facet, vendor, category, collection.
11. Replace product sort rows.

### DeleteProductListingIndexScript

Algorithm:

1. Load product and child variant doc ids.
2. Remove child variant doc ids from variant bitmap rows.
3. Delete runtime variant price rows.
4. Delete variant price rows.
5. Delete variant listing rows.
6. Remove product doc id from product bitmap rows.
7. Delete product sort rows.
8. Delete product price rows.
9. Delete product listing row.
10. Do not modify allocator counters.

### RefreshListingFacetPostingsScript

Purpose: recompute resolved facet bitmap memberships after facet source/display
mapping changes.

Algorithm:

1. Resolve affected products/variants from source handles when cheap.
2. If affected set is unknown and fallback is allowed, rebuild project postings
   for facet type.
3. For product facets, load current product sources, resolve memberships and
   replace product bitmap memberships.
4. For option facets, load current variant option sources, resolve memberships
   and replace variant bitmap memberships.
5. Refresh cardinality and `updated_at` for touched bitmap rows.

This script must not change price, stock, sort or projection rows unless a
variant visibility/parent change is part of the same canonical event.

### RebuildListingIndexScript

Algorithm:

1. Acquire project advisory lock.
2. Clear project listing/posting tables in dependency-safe order.
3. Recreate allocator row.
4. Process products in batches.
5. For each batch, sync variants then products.
6. Rebuild projection blocks.
7. Run freshness audit.

Partial rebuild by `productIds` must preserve existing doc ids and must not reset
allocator.

### RepairListingIndexFreshnessScript

Algorithm:

1. Run `ListingFreshnessRepository.auditProject`.
2. Target-sync missing/stale products.
3. Target-sync missing/stale variants.
4. Refresh affected bitmap memberships.
5. Refresh affected sort/runtime price/projection rows.
6. If targeted repair is unsafe or too large, run project rebuild.

## Фаза 8. Freshness repository

Create `ListingFreshnessRepository`.

Required methods:

- `findMissingProductRows(limit)`
- `findStaleProductRows(limit)`
- `findUnexpectedProductRows(limit)`
- `findMissingVariantRows(limit)`
- `findStaleVariantRows(limit)`
- `findUnexpectedVariantRows(limit)`
- `findMissingVariantPriceRows(limit)`
- `findMissingProductPriceRows(limit)`
- `findProductAggregateMismatches(limit)`
- `findPostingBitmapCardinalityMismatches(limit)`
- `findPostingBitmapMembershipMismatches(limit)`
- `findSortRowMismatches(limit)`
- `findRuntimeVariantPriceMismatches(limit)`
- `findProjectionBlockMismatches(limit)`
- `auditProject(params)`

Minimum result:

```ts
interface ListingFreshnessAuditResult {
  missingProducts: string[];
  staleProducts: string[];
  unexpectedProducts: string[];
  missingVariants: string[];
  staleVariants: string[];
  unexpectedVariants: string[];
  aggregateMismatches: string[];
  postingBitmapMismatches: Array<{
    entityType: "product" | "variant";
    field: string;
    valueKey: string;
  }>;
  sortRowMismatches: string[];
  runtimeVariantPriceMismatches: string[];
  projectionBlockMismatches: number[];
  canRepairTargeted: boolean;
}
```

## Фаза 9. DBOS workflows

Add workflow entrypoints:

- `listing.rebuildListingIndex`
- `listing.syncListingIndexForProducts`
- `listing.syncListingIndexForVariants`
- `listing.refreshListingFacetPostings`
- `listing.repairListingIndexFreshness`

Workflow steps:

1. acquire scoped advisory lock where useful;
2. execute sync script;
3. run affected freshness check;
4. log counters.

Idempotency keys:

```text
listing:product:{projectId}:{productId}:{reason}:{sourceRevision}
listing:variant:{projectId}:{variantId}:{reason}:{sourceRevision}
listing:facet-mapping:{projectId}:{facetType}:{mappingRevision}
listing:rebuild:{projectId}:{requestedAtOrManualKey}
```

If current workflow registry requires broker actions, add thin wrapper actions
next to existing workflow entrypoints.

## Фаза 10. Event handlers and invalidation

Add listing event handlers/subscribers that react to catalog domain events and
launch listing sync workflows/scripts.

Base map:

| Change | Action |
| --- | --- |
| product created | product sync with `refreshVariantsFirst = true` |
| product deleted | delete listing index for product |
| product kind/vendor/handle/published/revision | product sync |
| category assignment/rank | product bitmap + sort refresh |
| collection item/rank | product bitmap + sort refresh |
| tag assignment/handle | product facet bitmap refresh |
| feature value/handle | product facet bitmap refresh |
| variant create/update/delete | variant sync + parent product sync |
| variant option changed | variant facet bitmap refresh + parent product sync if needed |
| variant price changed | variant price/runtime price + parent product price/sort |
| stock changed | variant stock/runtime price + parent product aggregate/sort |
| enabled currencies changed | variant price, product price, runtime price, price sort |
| product translation name changed | product name sort rows; BM25 title index separately |
| facet source/display mapping changed | refresh listing facet postings |

If event payload lacks project context, handler must load it before launching
sync. Listing sync must not run without project context.

## Фаза 11. Storefront read path follow-up

After sync cutover, update storefront repositories:

- `ListingQueryRepository` uses bitmap set operations and page collectors.
- `FacetAggregationRepository` computes product/option/virtual facet counts from
  bitmaps.
- Product-level filters use product bitmap rows.
- Option filters use variant bitmap rows and projection blocks.
- Price filters use `listing_posting_variant_price`, not generic bitmap row.
- Product-level sorts use `listing_posting_product_sort`.
- Matched price sort uses `listing_posting_variant_price`.

Minimum read path check:

- no configured storefront facet query reads raw handles;
- no query assumes `listing_posting_bitmap.product_id`, `variant_id`,
  `facet_id` or `facet_value_id` columns;
- missing posting row is treated as empty bitmap.

## Cleanup после cutover

Search and remove obsolete references:

```text
product_listing_facet
variant_listing_facet
facet token
token table
tag_handles
feature_value_handles
option_value_handles
listing_posting_bitmap.product_id
listing_posting_bitmap.variant_id
listing_posting_bitmap.facet_id
listing_posting_bitmap.facet_value_id
```

Raw handle names may remain only in canonical source repository code and local
variables that are clearly transient sync input.

## Рекомендуемый порядок PR/коммитов

1. Models and repositories for target schema.
2. Source/mapping repositories and pure builders.
3. Sync/delete/rebuild/repair scripts.
4. Workflows and event handlers.
5. Storefront query/facet aggregation repositories.
6. BM25 title search integration, if included in the same milestone.
7. Cleanup obsolete token/raw-handle code paths.

Dual-write is not required. Storefront listing should not be enabled until
rebuild and freshness audit complete.

## Acceptance checklist

- [ ] New models match `listing-index-db-schema.ru.md`.
- [ ] Stable doc ids are allocated under lock and never reused.
- [ ] Listing rows do not store raw handle arrays.
- [ ] Posting repository writes bitmap rows keyed by
      `entity_type + field + value_key`.
- [ ] No row-based facet token tables are recreated.
- [ ] Variant sync writes variant rows/prices/bitmaps/runtime price/projection
      before parent product aggregate refresh.
- [ ] Product sync writes product rows/prices/bitmaps/sort rows.
- [ ] Facet mapping changes refresh bitmap memberships without touching stock or
      price rows.
- [ ] Runtime variant price rows contain only priced in-stock variants.
- [ ] Projection blocks can be rebuilt and audited.
- [ ] Storefront read path uses bitmap SQL shapes from
      `listing-query-sql-examples.ru.md`.
- [ ] Freshness audit can detect and repair listing, bitmap, sort, runtime price
      and projection mismatches.
- [ ] Verification uses build when needed; standalone `test` and `tsc` are not
      run.
