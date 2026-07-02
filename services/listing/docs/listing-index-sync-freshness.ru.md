# Актуальность listing index и синхронизация read model

## Назначение

Документ описывает, как поддерживать актуальность current-state listing read
model и PostgreSQL roaring posting index:

- `listing.listing_doc_id_allocator`
- `listing.product_listing_index`
- `listing.product_listing_price_index`
- `listing.variant_listing_index`
- `listing.variant_listing_price_index`
- `listing.listing_posting_bitmap`
- `listing.listing_posting_product_sort`
- `listing.listing_posting_variant_price`
- `listing.listing_posting_variant_projection_block`

Каноническая runtime model описана в
`services/listing/docs/listing-posting-list-search-engine-index.ru.md`. Целевая schema
описана в `services/listing/docs/listing-index-db-schema.ru.md`.

## Базовый принцип актуальности

Listing index is a derived current-state read model. Source of truth remains in
canonical catalog tables: product, variant, categories, collections, tags,
features, options, prices, inventory, project currencies/locales and facet
configuration.

Freshness обеспечивается двумя слоями:

1. Incremental sync после доменных изменений.
2. Freshness audit, который находит missing/stale rows, bitmap mismatches,
   orphan physical index rows and projection inconsistencies.

DB triggers не используются. Sync logic lives in repositories, builders,
scripts, workflows and event handlers.

## Инварианты freshness

### Doc id allocator

Для каждого project, где есть listing rows, должна существовать row in
`listing.listing_doc_id_allocator`.

`next_product_doc_id` and `next_variant_doc_id` are monotonically increasing and
positive. Allocation must happen under row-level lock on the allocator row.

Allocated `product_doc_id` / `variant_doc_id` are never reused after canonical
entity deletion.

### Product listing row

For every non-deleted product, one `product_listing_index` row exists.

The row reflects:

- `project_id`
- `product_id`
- stable `product_doc_id`
- `kind`, `vendor_id`, `handle`
- `status = 'published' | 'draft'`
- `published_at`, `product_created_at`, `product_updated_at`,
  `product_revision`
- `in_stock`, `total_stock`
- `indexed_at`, `updated_at`

The row must not store raw `tag_handles`, `feature_value_handles` or
`category_handles`.

Soft-deleted or hard-deleted products do not remain in listing index. Their
listing rows, price rows, sort rows and bitmap memberships must be removed.

### Product price rows

For each product and enabled project currency, one
`product_listing_price_index` row exists.

`min_price_minor`, `max_price_minor` and `has_price` are computed from active
in-stock variants and `variant_listing_price_index` rows in the same currency.
If no priced in-stock variant exists, keep row with `has_price = false` and NULL
price bounds.

### Variant listing row

For every active non-deleted variant, one `variant_listing_index` row exists.

The row reflects:

- `project_id`
- parent `product_id`
- parent `product_doc_id`
- `variant_id`
- stable `variant_doc_id`
- `in_stock`, `total_stock`
- `indexed_at`, `updated_at`

The row must not store raw `option_value_handles`.

Inactive/deleted variants are removed. Out-of-stock variants may remain in
`variant_listing_index`, but they do not satisfy option filters, price filters,
option counts, matched price sort or variant-level collection rules.

### Variant price rows

For each active variant and enabled project currency, one
`variant_listing_price_index` row exists.

If a variant has no current price in the currency, keep row with
`has_price = false` and `price_minor = NULL`.

### Posting bitmap rows

`listing.listing_posting_bitmap` stores physical bitmap rows keyed by:

```text
project_id + entity_type + field + value_key
```

It does not store `product_id`, `variant_id`, `facet_id` or `facet_value_id` as
row-key columns. Facet ids are encoded in `value_key`:

```text
field = facet
value_key = <facet_id>:<facet_value_id>
```

Product bitmap rows contain `product_doc_id`. Variant bitmap rows contain
`variant_doc_id`.

Every row must satisfy:

```text
cardinality = rb_cardinality(bitmap)
```

Runtime posting index must not store raw source handles.

### Product sort rows

`listing.listing_posting_product_sort` is a physical index for page collectors.
Rows are derived from listing rows, product price rows, translations and
category/collection manual ranks.

Expected properties:

- no row without matching parent `product_listing_index`;
- expected sort dimensions exist for published product docs;
- `bool_value` stores availability bucket for hot storefront sorts;
- locale and currency dimensions match sort kind;
- manual sort rows are scoped by `manual_scope_id`.

### Runtime variant price rows

`listing.listing_posting_variant_price` is a physical typed price index for range
filtering and matched variant price sort.

Rows exist only for variants that are:

- active;
- in stock;
- priced in the row currency.

Stock changes must insert/delete affected runtime price rows together with
updating `variant_listing_index.in_stock`.

### Projection blocks

`listing.listing_posting_variant_projection_block` maps broad variant bitmap
matches into product bitmaps.

Freshness audit must verify:

- `variant_count = rb_cardinality(variant_bitmap)`;
- `product_count = rb_cardinality(product_bitmap)`;
- block range covers expected variant doc id range;
- product bitmap matches products represented by variants in the block.

## Repository responsibilities

All repositories must use transaction-aware connection and current project
context. Methods must require or derive `project_id`; repository APIs must not
accept bare doc ids without project.

Required repository groups:

- doc id allocation repository;
- product listing row repository;
- product price row repository;
- variant listing row repository;
- variant price row repository;
- posting bitmap repository;
- product sort repository;
- runtime variant price repository;
- projection block repository;
- source repository for canonical reads;
- facet mapping repository for transient handle-to-id resolution;
- freshness repository.

Posting operations should expose bitmap-level methods:

```ts
getPostingBitmap(projectId, entityType, field, valueKey)
upsertPostingBitmap(projectId, entityType, field, valueKey, bitmap, cardinality)
addDocIdsToPosting(...)
removeDocIdsFromPosting(...)
replaceMembershipForEntity(...)
```

Implementation may choose efficient SQL shapes, but external semantics must stay
bitmap-row based.

## Source and mapping data

`ListingSourceRepository` reads canonical data in batches. It may return raw
source handles as transient sync input:

- product tag assignment handles;
- feature source value handles;
- category/collection ids or handles required to resolve canonical ids;
- variant option source value handles;
- price and stock source rows.

These raw handles must not be persisted into listing read model or runtime
posting index.

`ListingFacetMappingRepository` resolves source handles through `facet`,
`facet_source` and `facet_value` source/display parent model.

Resolve output:

```ts
{
  entityId: string;
  entityDocId: number;
  facetId: string;
  facetValueId: string;
  facetType: "tag" | "feature" | "option";
  valueKey: string; // "<facet_id>:<facet_value_id>"
}
```

Unmapped source handles are ignored as debug/info counters; they do not break
sync.

## Sync scripts

### SyncVariantListingIndexScript

Purpose: refresh variant rows, variant price rows, variant facet bitmaps, runtime
price rows, projection blocks and parent product aggregates.

Algorithm:

1. Normalize input (`productIds` or `variantIds`) and load parent products when
   needed.
2. Ensure parent product listing rows and stable `product_doc_id` exist.
3. Load variant sources, option sources, prices, stock and enabled currencies.
4. Allocate `variant_doc_id` for new active variants under allocator lock.
5. Upsert `variant_listing_index`.
6. Replace `variant_listing_price_index` rows.
7. Resolve option source handles to `value_key`s.
8. Replace affected variant doc memberships in `listing_posting_bitmap`.
9. Update `field=variant_product,value_key=<product_doc_id>` memberships.
10. Refresh `listing_posting_variant_price` rows for affected variants.
11. Refresh touched projection blocks.
12. Run product sync for affected parent products.

Deleted/inactive variants:

- remove `variant_doc_id` from affected variant bitmap rows;
- remove `variant_product` membership;
- delete variant price rows and runtime variant price rows;
- delete variant listing row;
- refresh touched projection blocks and parent product aggregate.

### SyncProductListingIndexScript

Purpose: refresh product listing row, product price aggregates, product facet and
scope bitmaps, and product sort rows.

Algorithm:

1. Optionally run variant sync first for product-created or variant-affecting
   changes.
2. Load product sources and detect missing/deleted products.
3. Allocate `product_doc_id` for new products under allocator lock.
4. Load stock aggregates from `variant_listing_index`.
5. Load price aggregates from `variant_listing_index` +
   `variant_listing_price_index`.
6. Upsert `product_listing_index`.
7. Replace `product_listing_price_index` rows.
8. Resolve product tag/feature source handles to `value_key`s.
9. Replace affected product doc memberships in facet/vendor/category/collection
   bitmap rows.
10. Refresh `listing_posting_product_sort` rows for affected product and sort
    dimensions.

Deleted products:

- remove product doc id from product bitmap rows;
- remove child variant doc ids from variant bitmap rows;
- delete product/variant listing rows;
- delete price/sort/runtime price rows;
- refresh affected projection blocks;
- never reuse doc ids.

### RefreshListingFacetPostingsScript

Purpose: refresh bitmap memberships after facet source/display mapping changes
without changing price or stock rows.

Algorithm:

1. Identify affected products/variants from source handles when cheap.
2. If affected set cannot be found and fallback is allowed, rebuild posting
   bitmaps for the project/facet type.
3. Resolve current source handles into current `value_key`s.
4. Replace affected memberships in bitmap rows.
5. Update `cardinality` and `updated_at`.

## Workflow и event handlers

Durable DBOS workflows:

- `listing.syncListingIndexForProducts`
- `listing.syncListingIndexForVariants`
- `listing.refreshListingFacetPostings`
- `listing.repairListingIndexFreshness`

Workflow IDs should use content idempotency:

```text
listing:product:{projectId}:{productId}:{reason}:{sourceRevision}
listing:variant:{projectId}:{variantId}:{reason}:{sourceRevision}
listing:facet-mapping:{projectId}:{facetType}:{mappingRevision}
```

Event invalidation map:

| Change | Refresh |
| --- | --- |
| Product created | product row, product doc id, variants, prices, postings, sort rows |
| Product updated: kind/vendor/handle/visibility/revision | product row, vendor bitmap, sort rows if needed |
| Product deleted/soft-deleted | delete product and child variant listing/posting rows |
| Category assignment changed | category bitmap membership, manual sort rows if rank changed |
| Collection item changed | collection bitmap membership, manual sort rows |
| Product tag assignment changed | product facet bitmap memberships |
| Product feature value changed | product facet bitmap memberships |
| Variant created/updated/deleted | variant row, option bitmaps, runtime price, projection, parent aggregate |
| Variant option changed | variant facet bitmap memberships, projection if visibility/parent changed |
| Variant price changed | variant price row, runtime price row, parent product price aggregate, price sort rows |
| Inventory stock changed | variant stock row, runtime price row, parent availability/price aggregate, sort rows |
| Enabled currencies changed | variant price rows, product price rows, runtime price rows, price sort rows |
| Facet source/display mapping changed | affected product/variant facet bitmap memberships |
| Product translation/name changed | product sort rows for name; BM25 title search separately |

## Freshness audit

`ListingFreshnessRepository.auditProject` should produce structured result:

```ts
interface ListingFreshnessAuditResult {
  missingProducts: string[];
  staleProducts: string[];
  unexpectedProducts: string[];
  missingVariants: string[];
  staleVariants: string[];
  unexpectedVariants: string[];
  priceAggregateMismatches: string[];
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

Audit checks:

- missing product/variant listing rows for canonical active entities;
- unexpected listing rows for deleted/inactive entities;
- stale product/variant rows by updated_at/revision/source timestamps;
- missing product/variant price rows for enabled currencies;
- product price aggregate mismatches;
- bitmap `cardinality` mismatches;
- bitmap doc ids missing from listing rows;
- stale product/variant facet memberships compared with canonical source +
  mapping;
- missing or orphan product sort rows;
- runtime variant price rows for out-of-stock/unpriced variants;
- missing runtime variant price rows for priced in-stock variants;
- projection block count and membership mismatches.

## Repair script

`RepairListingIndexFreshnessScript`:

1. Run freshness audit.
2. Target-sync missing/stale products.
3. Target-sync missing/stale variants.
4. Refresh affected facet bitmap memberships.
5. Refresh affected sort/runtime price/projection rows.
6. If mismatch set is too large or `canRepairTargeted = false`, return an
   explicit non-targetable repair result for manual handling.

## Concurrency и порядок записи

Doc id allocation must use row-level lock on allocator row.

For one product, write order:

1. ensure product doc id and parent product listing row;
2. variant listing rows;
3. variant price rows;
4. variant facet bitmap memberships;
5. runtime variant price rows;
6. projection blocks for touched variant doc ranges;
7. product listing row with aggregates;
8. product price aggregate rows;
9. product facet/scope/vendor bitmap memberships;
10. product sort rows.

Posting row updates for the same `(project_id, entity_type, field, value_key)`
must be serialized by transaction boundaries or advisory locks. A move from one
posting row to another should update both rows in the same transaction where
practical.

Batching is allowed, but it must preserve final current-state membership.

## Наблюдаемость

Each sync script logs:

- `projectId`;
- reason;
- affected product/variant count;
- allocated doc id count;
- listing rows upserted/deleted;
- bitmap rows touched;
- doc memberships added/removed;
- sort rows touched;
- runtime price rows touched;
- projection blocks touched;
- enabled currencies count;
- duration;
- workflow id when invoked through workflow.

Unmapped source handles are debug/info counters, not errors:

- `unmappedTagHandles`
- `unmappedFeatureHandles`
- `unmappedOptionHandles`

## Acceptance criteria

- Raw source handles are not stored in listing read model or runtime posting
  index.
- Stable doc ids are allocated once and never reused.
- Product/variant listing rows match target schema.
- Posting bitmap rows use `entity_type + field + value_key`, not row-token
  product/variant/facet columns.
- `cardinality` matches `rb_cardinality(bitmap)`.
- Product sort rows are refreshed for affected products and sort dimensions.
- Runtime variant price rows exist only for priced in-stock variants.
- Projection blocks are refreshed for touched variant doc ranges.
- Storefront read path never reads raw handle arrays for configured facets.
- Targeted sync rereads canonical state before writing and is idempotent.
- Freshness audit can identify whether targeted repair is possible.
