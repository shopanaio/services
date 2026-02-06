# Listing Service - Implementation Plan

## Context

Products and categories live in the **catalog** service. The **listing** service:
1. Maintains a denormalized search index (`product_search_index`) synced via catalog events
2. Provides **listings** — product containers bound to categories with manual product management
3. Supports excluding products and manual ordering via lexo_rank
4. Provides faceted filtering over `product_search_index` at query time

A listing is NOT a named entity — it has no title, handle, or translations. Category metadata stays in catalog.

**Scope (Phase 1):** No Typesense, no Metarank, no full-text search. PostgreSQL only.

---

## Core Concept: Listing

A **listing** is a product container bound 1:1 to a category. Products are added/removed manually by admin and ordered via lexo_rank (drag & drop).

- Admin adds products to a listing explicitly
- Products can be excluded (hidden from listing)
- Default sort + manual reorder via drag & drop
- Storefront queries apply faceted filters (price, features, options, tags, stock) against `product_search_index`

---

## Database Schema

Schema namespace: `listing` (PostgreSQL schema).

### 1. `product_search_index` — denormalized facet index

```sql
product_search_index (
  project_id     uuid NOT NULL,
  product_id     uuid PRIMARY KEY,
  min_price_minor bigint,
  max_price_minor bigint,
  is_active      boolean NOT NULL DEFAULT false,
  in_stock       boolean NOT NULL DEFAULT false,
  total_stock    int NOT NULL DEFAULT 0,
  tag_ids        uuid[] DEFAULT '{}',
  feature_slugs  text[] DEFAULT '{}',
  option_slugs   text[] DEFAULT '{}',
  category_ids   uuid[] DEFAULT '{}',
  popularity_score float NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
)
```

Indexes: GIN on arrays, B-tree on price/stock/sorting.

### 2. `listing` — category product container

```sql
listing (
  id             uuid PRIMARY KEY,
  project_id     uuid NOT NULL,
  category_id    uuid NOT NULL,
  sort_by        varchar(32) NOT NULL DEFAULT 'manual',
  sort_direction varchar(4) NOT NULL DEFAULT 'asc',
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, category_id)
)
```

### 3. `listing_item` — products in a listing

Uses `lexo_rank` (varchar, COLLATE "C") for ordering. Lexorank allows inserting between two items without rewriting other rows: rank between "aaa" and "aab" = "aaaN" (midpoint).

```sql
listing_item (
  listing_id      uuid NOT NULL REFERENCES listing(id) ON DELETE CASCADE,
  product_id      uuid NOT NULL,
  lexo_rank       varchar(64) COLLATE "C" NOT NULL,
  excluded        boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (listing_id, product_id)
)

CREATE INDEX idx_listing_item_rank ON listing_item (listing_id, lexo_rank)
  WHERE excluded = false;
```

**Usage:**
- All products added here with lexo_rank for order
- `excluded=true` hides product from listing without removing it
- **Reorder (drag & drop)**: new lexo_rank = midpoint(before, after), single row update, O(1)
- **Rebalance**: when rank strings exceed 48 chars, reassign evenly spaced ranks (rare)

---

## Service Structure

```
services/listing/
├── package.json
├── tsconfig.json
├── codegen.ts
├── build.config.json
├── drizzle.config.ts
├── src/
│   ├── listing.module.ts
│   ├── listing.nest-service.ts
│   ├── kernel/
│   │   ├── Kernel.ts
│   │   └── BaseScript.ts
│   ├── context/
│   │   ├── index.ts
│   │   ├── contextStorage.ts
│   │   └── types.ts
│   ├── repositories/
│   │   ├── models/
│   │   │   ├── schema.ts                # pgSchema("listing")
│   │   │   ├── searchIndex.ts           # product_search_index
│   │   │   ├── listing.ts              # listing, listing_item
│   │   │   └── index.ts
│   │   ├── BaseRepository.ts
│   │   ├── Repository.ts
│   │   ├── SearchIndexRepository.ts
│   │   ├── ListingRepository.ts
│   │   └── ListingItemRepository.ts
│   ├── scripts/
│   │   ├── index/
│   │   │   ├── SyncProductIndexScript.ts
│   │   │   └── BulkSyncProductIndexScript.ts
│   │   └── listing/
│   │       ├── ListingCreateScript.ts
│   │       ├── ListingDeleteScript.ts
│   │       ├── QueryListingProductsScript.ts   # core: listing_item JOIN product_search_index + facets
│   │       ├── AddProductsScript.ts
│   │       ├── RemoveProductsScript.ts
│   │       ├── ExcludeProductScript.ts
│   │       ├── IncludeProductScript.ts
│   │       ├── MoveProductScript.ts            # drag & drop reorder via lexo_rank
│   │       └── RebalanceListingScript.ts       # rebalance lexo_ranks when too long
│   ├── api/
│   │   └── graphql-admin/
│   │       ├── server.ts
│   │       ├── contextMiddleware.ts
│   │       ├── resolvers/
│   │       │   ├── index.ts
│   │       │   └── types.ts
│   │       └── schema/
│   │           ├── base.graphql
│   │           └── listing.graphql
│   ├── loaders/
│   │   ├── index.ts
│   │   └── ListingLoader.ts
│   ├── ListingBrokerActions.ts
│   └── ListingEventHandlers.ts
```

---

## Key Components

### 1. Event Handlers (`ListingEventHandlers.ts`)

```typescript
@EventHandler("productCreated")  → SyncProductIndexScript (upsert index row)
@EventHandler("productUpdated")  → SyncProductIndexScript (re-fetch + upsert)
@EventHandler("productDeleted")  → delete from product_search_index
```

**SyncProductIndexScript** flow:
1. Broker call `catalog.getProductForIndex(productId, storeId)` → categories, features, options, tags, pricing
2. Broker call `inventory.getStockSummary(productId, storeId)` → in_stock, total_stock
3. UPSERT into `product_search_index`

### 2. QueryListingProductsScript (Core)

Input: listingId, filters (facets from storefront UI), pagination, sort override

Flow:
1. Load listing from DB
2. Load product IDs from `listing_item` WHERE `excluded = false`
3. JOIN with `product_search_index` for facet data
4. Apply user filters (price range, features, options, tags, stock)
5. Apply sort (manual = lexo_rank, or price/popularity/newest from product_search_index)
6. Execute query → product IDs + total count
7. Execute parallel facet count queries (counts per feature value, option value, price range, etc.)
8. Return `{ products, facets, total }`

### 3. Listing CRUD

- **Create**: create listing for a category (auto-created when category is created, or on demand)
- **Add/Remove products**: add/remove listing_item rows with lexo_rank
- **Exclude/Include**: toggle `excluded` flag on listing_item
- **Delete**: cascade deletes listing_items

### 4. GraphQL Schema (Admin)

**Queries:**
- `listingQuery.listing(id, categoryId)` → `Listing`
- `listingQuery.listingProducts(listingId, filters, pagination, sort)` → `ListingProductsResult`

**Mutations:**
- `listingMutation.listingCreate(categoryId)`
- `listingMutation.listingDelete(id)`
- `listingMutation.listingUpdateSort(id, sortBy, sortDirection)`
- `listingMutation.addProducts(listingId, productIds)`
- `listingMutation.removeProducts(listingId, productIds)`
- `listingMutation.excludeProduct(listingId, productId)`
- `listingMutation.includeProduct(listingId, productId)`
- `listingMutation.moveProduct(listingId, productId, afterProductId?, beforeProductId?)` — drag & drop

**Federation:**
- `type Product @key(fields: "id", resolvable: false) { id: ID! }` — reference only
- `extend type Category @key(fields: "id") { id: ID!, listing: Listing }` — listing field on category

---

## Ordering Algorithm

### Default (manual)
Products ordered by `lexo_rank` from `listing_item`. Simple `ORDER BY lexo_rank`.

### Alternative sorts
When `sort_by` is not `manual`, products come from `listing_item` JOIN `product_search_index`, sorted by the chosen field (price, popularity, newest). `lexo_rank` is ignored for display but preserved for when admin switches back to manual.

### Reorder mutation (drag & drop)
```
moveProduct(listingId, productId, afterProductId?, beforeProductId?)
  → new lexo_rank = midpoint(after.lexo_rank, before.lexo_rank)
  → UPDATE listing_item SET lexo_rank = newRank WHERE ...
  → single row update, O(1)
```

### Rebalance (maintenance)
When lexo_rank strings exceed 48 chars, rebalance all ranks in listing:
```
rebalanceListing(listingId)
  → SELECT all items ORDER BY lexo_rank
  → reassign evenly spaced ranks
  → batch UPDATE
```

---

## New Broker Types

`packages/broker-types/src/actions/catalog.ts`:
- `GetProductForIndexParams { productId, storeId }`
- `GetProductForIndexResult { product with categories, features, options, tags, pricing }`

`packages/broker-types/src/actions/listing.ts`:
- `SyncProductIndexParams { productId, storeId }`
- `SyncProductIndexResult { success }`

---

## Implementation Order

### Step 1: Scaffold
`package.json`, `tsconfig.json`, `build.config.json`, `codegen.ts`, `drizzle.config.ts`, module, nest-service, kernel, context

### Step 2: DB schema (Drizzle models)
`product_search_index`, `listing`, `listing_item` → generate migration

### Step 3: Repositories
SearchIndexRepository, ListingRepository, ListingItemRepository, Repository aggregator

### Step 4: Scripts
SyncProductIndexScript, ListingCreateScript, ListingDeleteScript, QueryListingProductsScript, AddProductsScript, RemoveProductsScript, ExcludeProductScript, IncludeProductScript, MoveProductScript, RebalanceListingScript

### Step 5: Event Handlers + Broker Actions
ListingEventHandlers, ListingBrokerActions, catalog.getProductForIndex in catalog service

### Step 6: GraphQL Schema + Resolvers
Schema files, resolver classes, Apollo resolver map, codegen

### Step 7: Build & Test

---

## Reference Files

| Pattern | Reference File |
|---------|---------------|
| Module | `services/inventory/src/inventory.module.ts` |
| NestService | `services/inventory/src/inventory.nest-service.ts` |
| Kernel | `services/inventory/src/kernel/Kernel.ts` |
| BaseScript | `services/inventory/src/kernel/BaseScript.ts` |
| Repository | `services/inventory/src/repositories/Repository.ts` |
| EventHandlers | `services/inventory/src/InventoryEventHandlers.ts` |
| BrokerActions | `services/inventory/src/InventoryBrokerActions.ts` |
| GraphQL server | `services/inventory/src/api/graphql-admin/server.ts` |
| Resolver map | `services/inventory/src/api/graphql-admin/resolvers/index.ts` |
| base.graphql | `services/inventory/src/api/graphql-admin/schema/base.graphql` |
| Event types | `packages/events/src/types.ts` |
| Broker types | `packages/broker-types/src/actions/inventory.ts` |
