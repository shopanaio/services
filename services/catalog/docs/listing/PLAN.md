# Listing — Implementation Plan (inside Catalog Service)

## Context

Listing functionality lives **inside the catalog service** — not as a separate microservice. Catalog already owns products, categories, variants, pricing, options, features, and tags. Listing adds two concerns on top of this data:

1. **Product search index** — a denormalized table (`product_search_index`) that aggregates product facets (price, stock, tags, features, options, categories) for fast filtered queries. Synced via internal scripts when products change.
2. **Listings** — product containers bound 1:1 to categories. Admin manually adds/removes/reorders products. Storefront queries apply faceted filters against the search index.

A listing has no title, handle, or translations — category metadata stays in `catalog.category`.

**Scope (Phase 1):** PostgreSQL only. No Typesense, no Metarank, no full-text search.

---

## Core Concept

A **listing** is a manual product container bound to a single category.

- Admin adds/removes products explicitly
- Products can be excluded (hidden without removing)
- Manual ordering via `lexo_rank` (drag & drop)
- Alternative sorts: price, popularity, newest (from `product_search_index`)
- Storefront queries apply faceted filters (price, features, options, tags, stock)

---

## Database Schema

All tables live in the existing `catalog` PostgreSQL schema (`catalogSchema` in Drizzle).

### 1. `product_search_index` — denormalized facet index

```sql
catalog.product_search_index (
  project_id       uuid NOT NULL,
  product_id       uuid PRIMARY KEY REFERENCES catalog.product(id) ON DELETE CASCADE,
  status           varchar(16) NOT NULL DEFAULT 'draft',  -- 'draft' | 'active'
  min_price_minor  bigint,
  max_price_minor  bigint,
  in_stock         boolean NOT NULL DEFAULT false,
  total_stock      int NOT NULL DEFAULT 0,
  tag_ids          uuid[] DEFAULT '{}',
  feature_slugs    text[] DEFAULT '{}',
  option_slugs     text[] DEFAULT '{}',
  category_ids     uuid[] DEFAULT '{}',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
)
```

**Indexes:**
- GIN on `tag_ids`, `feature_slugs`, `option_slugs`, `category_ids`
- B-tree on `min_price_minor`, `max_price_minor`
- B-tree on `in_stock`, `total_stock`
- B-tree on `status`
- B-tree on `created_at` (for "newest" sort)

**Notes:**
- `status` mirrors product publish state: `'active'` when product has `publishedAt`, otherwise `'draft'`
- Price range comes from `variant_prices_current` (min/max across all variants)
- Stock data comes from inventory service via broker call
- `feature_slugs` / `option_slugs` are denormalized slug arrays for fast GIN filtering
- `category_ids` includes the product's direct categories

### 2. `listing` — category product container

```sql
catalog.listing (
  id               uuid PRIMARY KEY,
  project_id       uuid NOT NULL,
  category_id      uuid NOT NULL REFERENCES catalog.category(id) ON DELETE CASCADE,
  sort_by          varchar(32) NOT NULL DEFAULT 'manual',
  sort_direction   varchar(4) NOT NULL DEFAULT 'asc',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, category_id)
)
```

**`sort_by` values:** `'manual'`, `'price'`, `'newest'`, `'name'`

### 3. `listing_item` — products in a listing

```sql
catalog.listing_item (
  listing_id       uuid NOT NULL REFERENCES catalog.listing(id) ON DELETE CASCADE,
  product_id       uuid NOT NULL REFERENCES catalog.product(id) ON DELETE CASCADE,
  lexo_rank        varchar(64) COLLATE "C" NOT NULL,
  excluded         boolean NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (listing_id, product_id)
)

CREATE INDEX idx_listing_item_rank
  ON catalog.listing_item (listing_id, lexo_rank)
  WHERE excluded = false;
```

**Lexo-rank mechanics:**
- Insert between two items: `newRank = midpoint(before.lexo_rank, after.lexo_rank)`
- Single row UPDATE, O(1)
- Rebalance when rank strings exceed 48 chars (reassign evenly spaced ranks)

---

## What Changes in Catalog Service

### New files

```
src/repositories/models/
  listing.ts                          # Drizzle schema: listing, listing_item
  searchIndex.ts                      # Drizzle schema: product_search_index

src/repositories/
  listing/ListingRepository.ts        # CRUD for listing table
  listing/ListingItemRepository.ts    # CRUD for listing_item table
  listing/SearchIndexRepository.ts    # CRUD for product_search_index

src/scripts/listing/
  SyncProductIndexScript.ts           # Rebuild one product's index row
  ListingCreateScript.ts              # Create listing for category
  ListingDeleteScript.ts              # Delete listing
  ListingUpdateSortScript.ts          # Update sort_by / sort_direction
  AddProductsScript.ts                # Add products to listing with lexo_rank
  RemoveProductsScript.ts             # Remove products from listing
  ExcludeProductScript.ts             # Set excluded = true
  IncludeProductScript.ts             # Set excluded = false
  MoveProductScript.ts                # Reorder via lexo_rank (drag & drop)
  RebalanceListingScript.ts           # Rebalance lexo_ranks when too long
  QueryListingProductsScript.ts       # Core: filtered, sorted, paginated query

src/resolvers/admin/
  ListingQueryResolver.ts             # Query resolvers for listing
  ListingMutationResolver.ts          # Mutation resolvers for listing
  ListingResolver.ts                  # Listing type field resolvers
  ListingProductConnectionResolver.ts # Paginated products in listing

src/loaders/
  ListingLoader.ts                    # DataLoader for listing by id, by categoryId

api/graphql-admin/schema/
  listing.graphql                     # Listing types, inputs, payloads
```

### Modified files

```
src/repositories/models/index.ts      # Add exports for listing.ts, searchIndex.ts
src/repositories/Repository.ts        # Add listing, listingItem, searchIndex repos
src/loaders/Loader.ts                 # Add ListingLoader
src/handlers/index.ts                 # Add productCreated/Updated/Deleted → SyncProductIndexScript
api/graphql-admin/schema/base.graphql # Add listing queries/mutations to CatalogQuery/CatalogMutation
api/graphql-admin/schema/category.graphql  # Add `listing: Listing` field to Category type
src/resolvers/admin/CategoryResolver.ts    # Add listing() field resolver
```

---

## Scripts

### SyncProductIndexScript

Rebuilds one product's row in `product_search_index`. Called when a product is created, updated, or its inventory changes.

```
Input:  { productId: string }
Flow:
  1. Load product from catalog DB (with categories, tags, features, options)
  2. Load current prices from variant_prices_current (min/max across variants)
  3. Broker call inventory.getOffers(variantIds) → derive in_stock, total_stock
  4. Determine status from product.publishedAt
  5. Build feature_slugs from product_feature translations
  6. Build option_slugs from product_option values
  7. UPSERT into product_search_index
Output: { success: boolean }
```

**Data sources (all local except inventory):**
- Product + categories → `product`, `product_category`
- Tags → `product_tag`
- Features → `product_feature`, `product_feature_value` + translations
- Options → `product_option`, `product_option_value`
- Prices → `variant_prices_current` view
- Stock → `broker.call("inventory.getOffers", { storeId, variantIds })`

### QueryListingProductsScript (Core)

```
Input:  {
  listingId: string,
  filters?: {
    priceMin?: number,
    priceMax?: number,
    tagIds?: string[],
    featureSlugs?: string[],
    optionSlugs?: string[],
    inStock?: boolean,
    status?: string
  },
  sort?: { by: string, direction: 'asc' | 'desc' },
  pagination: { first?: number, after?: string, last?: number, before?: string }
}

Flow:
  1. Load listing from DB → get sort defaults
  2. Build query:
     listing_item li
     JOIN product_search_index psi ON li.product_id = psi.product_id
     WHERE li.listing_id = :listingId
       AND li.excluded = false
       AND [apply facet filters on psi]
  3. Apply sort:
     - 'manual' → ORDER BY li.lexo_rank
     - 'price'  → ORDER BY psi.min_price_minor
     - 'newest' → ORDER BY psi.created_at DESC
     - 'name'   → ORDER BY psi.product_id (placeholder, extend later)
  4. Apply Relay cursor pagination
  5. Execute → product IDs + total count
  6. Build facet aggregations (parallel):
     - Price range (min/max across filtered set)
     - Tag counts (unnest tag_ids, group by)
     - Feature counts (unnest feature_slugs, group by)
     - Option counts (unnest option_slugs, group by)
     - In-stock count
  7. Return { products (Product references), facets, totalCount, pageInfo }

Output: ListingProductConnection with facets
```

### Listing CRUD Scripts

**ListingCreateScript:** Create listing for a category. Auto-assigns UUID. Validates category exists and no listing already exists for it.

**ListingDeleteScript:** Delete listing by ID. CASCADE deletes listing_items.

**ListingUpdateSortScript:** Update `sort_by` and `sort_direction` on a listing.

**AddProductsScript:** Insert listing_item rows. Assign lexo_rank: for each new product, rank = after last existing item (or initial rank if empty).

**RemoveProductsScript:** Delete listing_item rows by (listing_id, product_id[]).

**ExcludeProductScript / IncludeProductScript:** Toggle `excluded` flag.

**MoveProductScript:** Drag & drop reorder.
```
Input:  { listingId, productId, afterProductId?, beforeProductId? }
Flow:
  1. Load ranks of afterProduct and beforeProduct
  2. newRank = midpoint(afterRank, beforeRank)
  3. UPDATE listing_item SET lexo_rank = newRank WHERE listing_id = :lid AND product_id = :pid
```

**RebalanceListingScript:** When lexo_rank strings get too long (>48 chars), reassign evenly spaced ranks to all items in a listing.

---

## Event Handlers

Add to existing `CatalogEventHandlers`:

```typescript
// Product created → create search index row
@EventHandler("productCreated")
async handleProductCreatedForIndex({ event }) {
  await this.kernel.runScript(SyncProductIndexScript, {
    productId: event.payload.productId,
  });
}

// Product updated → update search index row
@EventHandler("productUpdated")
async handleProductUpdatedForIndex({ event }) {
  await this.kernel.runScript(SyncProductIndexScript, {
    productId: event.payload.productId,
  });
}

// Product deleted → remove from search index (CASCADE handles listing_item)
@EventHandler("productDeleted")
async handleProductDeletedForIndex({ event }) {
  await this.repository.searchIndex.delete(event.payload.productId);
}
```

**Note:** Since listing functionality is inside catalog, the event handlers call scripts directly — no broker round-trip needed for product data. Only inventory stock requires a broker call.

---

## GraphQL Schema (Admin)

### New types in `listing.graphql`

```graphql
type Listing {
  id: ID!
  category: Category!
  sortBy: ListingSortBy!
  sortDirection: SortDirection!
  createdAt: DateTime!
  updatedAt: DateTime!
  products(
    first: Int
    after: String
    last: Int
    before: String
    filters: ListingProductFiltersInput
  ): ListingProductConnection!
}

enum ListingSortBy {
  MANUAL
  PRICE
  NEWEST
  NAME
}

enum SortDirection {
  ASC
  DESC
}

type ListingProductConnection {
  edges: [ListingProductEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
  facets: ListingFacets!
}

type ListingProductEdge {
  node: Product!
  cursor: String!
  """The lexo_rank position (only meaningful when sort=MANUAL)"""
  rank: String
  """Whether this product is excluded from the listing"""
  excluded: Boolean!
}

type ListingFacets {
  priceRange: PriceRange
  tags: [FacetCount!]!
  features: [FacetCount!]!
  options: [FacetCount!]!
  inStockCount: Int!
  totalCount: Int!
}

type PriceRange {
  minMinor: BigInt!
  maxMinor: BigInt!
}

type FacetCount {
  value: String!
  count: Int!
}

input ListingProductFiltersInput {
  priceMinMinor: BigInt
  priceMaxMinor: BigInt
  tagIds: [ID!]
  featureSlugs: [String!]
  optionSlugs: [String!]
  inStock: Boolean
}
```

### Extend `CatalogQuery` (in `base.graphql`)

```graphql
# Add to CatalogQuery:
listing(id: ID!): Listing
listingByCategory(categoryId: ID!): Listing
```

### Extend `CatalogMutation` (in `base.graphql`)

```graphql
# Add to CatalogMutation:
listingCreate(input: ListingCreateInput!): ListingCreatePayload!
listingDelete(input: ListingDeleteInput!): ListingDeletePayload!
listingUpdateSort(input: ListingUpdateSortInput!): ListingUpdateSortPayload!
listingAddProducts(input: ListingAddProductsInput!): ListingAddProductsPayload!
listingRemoveProducts(input: ListingRemoveProductsInput!): ListingRemoveProductsPayload!
listingExcludeProduct(input: ListingExcludeProductInput!): ListingExcludeProductPayload!
listingIncludeProduct(input: ListingIncludeProductInput!): ListingIncludeProductPayload!
listingMoveProduct(input: ListingMoveProductInput!): ListingMoveProductPayload!
listingRebalance(input: ListingRebalanceInput!): ListingRebalancePayload!
```

### Extend `Category` type (in `category.graphql`)

```graphql
# Add field to Category type:
"""The listing associated with this category, if any."""
listing: Listing
```

### Inputs & Payloads (in `listing.graphql`)

```graphql
input ListingCreateInput {
  categoryId: ID!
  sortBy: ListingSortBy
  sortDirection: SortDirection
}

input ListingDeleteInput {
  id: ID!
}

input ListingUpdateSortInput {
  id: ID!
  sortBy: ListingSortBy!
  sortDirection: SortDirection!
}

input ListingAddProductsInput {
  listingId: ID!
  productIds: [ID!]!
}

input ListingRemoveProductsInput {
  listingId: ID!
  productIds: [ID!]!
}

input ListingExcludeProductInput {
  listingId: ID!
  productId: ID!
}

input ListingIncludeProductInput {
  listingId: ID!
  productId: ID!
}

input ListingMoveProductInput {
  listingId: ID!
  productId: ID!
  afterProductId: ID
  beforeProductId: ID
}

input ListingRebalanceInput {
  listingId: ID!
}

# All payloads follow the same pattern:
type ListingCreatePayload {
  listing: Listing
  userErrors: [GenericUserError!]!
}
# ... (same shape for other payloads)
```

---

## Ordering Algorithm

### Manual sort (default)
```sql
SELECT li.product_id
FROM catalog.listing_item li
WHERE li.listing_id = :id AND li.excluded = false
ORDER BY li.lexo_rank ASC
```

### Alternative sorts
```sql
SELECT li.product_id
FROM catalog.listing_item li
JOIN catalog.product_search_index psi ON li.product_id = psi.product_id
WHERE li.listing_id = :id AND li.excluded = false
ORDER BY psi.min_price_minor ASC  -- or psi.created_at DESC, etc.
```

`lexo_rank` is preserved for when admin switches back to manual.

### Drag & drop (MoveProductScript)
```
moveProduct(listingId, productId, afterProductId?, beforeProductId?)
  → afterRank = afterProduct?.lexo_rank ?? ""
  → beforeRank = beforeProduct?.lexo_rank ?? "~" (char after 'z')
  → newRank = midpoint(afterRank, beforeRank)
  → UPDATE listing_item SET lexo_rank = newRank
  → single row update, O(1)
```

### Rebalance (maintenance)
When any `lexo_rank` in a listing exceeds 48 chars:
```
  → SELECT all items ORDER BY lexo_rank
  → Reassign ranks: "a", "b", "c", ... evenly spaced
  → Batch UPDATE
```

---

## Broker Dependencies

Listing needs exactly one broker call:

```typescript
// Get stock info for search index sync
broker.call<Inventory.GetOffersResult, Inventory.GetOffersParams>(
  "inventory.getOffers",
  { storeId, variantIds }
);
```

Everything else (products, categories, tags, features, options, pricing) is **local** to catalog — no broker calls needed.

---

## Implementation Order

### Step 1: Drizzle Models
- `src/repositories/models/searchIndex.ts` — `product_search_index` table
- `src/repositories/models/listing.ts` — `listing`, `listing_item` tables
- Update `src/repositories/models/index.ts` — add exports
- Run `db:generate` → migration file

### Step 2: Repositories
- `src/repositories/listing/SearchIndexRepository.ts` — upsert, delete, query with facets
- `src/repositories/listing/ListingRepository.ts` — CRUD
- `src/repositories/listing/ListingItemRepository.ts` — add/remove/exclude/include/move/rebalance
- Update `src/repositories/Repository.ts` — add new repos

### Step 3: Scripts
- `SyncProductIndexScript.ts` — core index sync logic
- `ListingCreateScript.ts`, `ListingDeleteScript.ts`, `ListingUpdateSortScript.ts`
- `AddProductsScript.ts`, `RemoveProductsScript.ts`
- `ExcludeProductScript.ts`, `IncludeProductScript.ts`
- `MoveProductScript.ts`, `RebalanceListingScript.ts`
- `QueryListingProductsScript.ts` — filtered query with facets

### Step 4: Event Handlers
- Update `src/handlers/index.ts` — add productCreated/Updated/Deleted handlers for search index

### Step 5: GraphQL Schema
- `api/graphql-admin/schema/listing.graphql` — all types, inputs, payloads
- Update `base.graphql` — add listing queries/mutations to CatalogQuery/CatalogMutation
- Update `category.graphql` — add `listing` field to Category type
- Run `codegen`

### Step 6: Resolvers & Loaders
- `ListingLoader.ts` — DataLoader for listing by ID and by categoryId
- Update `Loader.ts`
- `ListingQueryResolver.ts`, `ListingMutationResolver.ts`
- `ListingResolver.ts` — type field resolvers
- `ListingProductConnectionResolver.ts`
- Update `CategoryResolver.ts` — add `listing()` resolver
- Update resolver map (`resolvers/index.ts`)

### Step 7: Build & Test
- `shopana build -s catalog`
- Write e2e tests in `e2e/tests/catalog-api/listing-*.spec.ts`

---

## Reference Files (within Catalog)

| Pattern | Reference File |
|---------|---------------|
| Drizzle model | `src/repositories/models/categories.ts` |
| Repository | `src/repositories/category/CategoryRepository.ts` |
| Repository aggregator | `src/repositories/Repository.ts` |
| Script | `src/scripts/product/ProductCreateScript.ts` |
| Event handler | `src/handlers/index.ts` |
| GraphQL schema | `api/graphql-admin/schema/category.graphql` |
| Resolver (type) | `src/resolvers/admin/CategoryResolver.ts` |
| Resolver (query) | `src/resolvers/admin/QueryResolver.ts` |
| Resolver (mutation) | `src/resolvers/admin/MutationResolver.ts` |
| Loader | `src/loaders/CategoryLoader.ts` |
| Base.graphql | `api/graphql-admin/schema/base.graphql` |
| Broker types | `packages/broker-types/src/actions/inventory.ts` |
| Event types | `packages/events/src/types.ts` |
