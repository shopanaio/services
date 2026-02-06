# Listing Service - Implementation Plan

## Context

Products and categories live in the **catalog** service. The **listing** service:
1. Maintains a denormalized search index (`product_search_index`) synced via catalog events
2. Provides **listings** — collections of products defined by rules (smart) or manually (manual)
3. Supports pinning/excluding products and manual position overrides
4. Manages filter UI configuration per listing

Categories are NOT in listing — they stay in catalog. A listing can reference categories as one of its conditions.

**Scope (Phase 1):** No Typesense, no Metarank, no full-text search. PostgreSQL only.

---

## Core Concept: Listing

A **listing** is a named collection of products. Two types:

**Smart listing** — products matched automatically by conditions:
- "All Nike under 5000 UAH" → `feature_slugs contains brand:nike AND max_price < 5000`
- "New arrivals" → `created_at > now() - 30 days`
- "Shoes category" → `category_ids contains cat-shoes-uuid`
- Conditions are evaluated against `product_search_index` at query time

**Manual listing** — products added explicitly by admin:
- "Summer sale picks" → specific product IDs with manual sort order

Both types support:
- **Excluding** — hide a product from listing even if it matches conditions
- **Sort rules** — default sort order (popularity, price, newest, etc.)
- **Manual reorder** — drag & drop via lexo_rank

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
  is_active      boolean NOT NULL DEFAULT false,  -- product published in catalog
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

### 2. `listing` — collection definition

```sql
listing (
  id             uuid PRIMARY KEY,
  project_id     uuid NOT NULL,
  handle         varchar(255),
  type           varchar(16) NOT NULL,  -- 'smart' | 'manual'
  status         varchar(16) NOT NULL DEFAULT 'draft',  -- 'draft' | 'active'
  sort_by        varchar(32) NOT NULL DEFAULT 'popularity',
  sort_direction varchar(4) NOT NULL DEFAULT 'desc',
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  deleted_at     timestamptz
)
```

### 3. `listing_translation`

```sql
listing_translation (
  listing_id  uuid NOT NULL REFERENCES listing(id) ON DELETE CASCADE,
  locale      varchar(5) NOT NULL,
  title       varchar(255) NOT NULL,
  description text,
  PRIMARY KEY (listing_id, locale)
)
```

### 4. `listing_condition` — rules for smart listings

```sql
listing_condition (
  id          uuid PRIMARY KEY,
  listing_id  uuid NOT NULL REFERENCES listing(id) ON DELETE CASCADE,
  field       varchar(32) NOT NULL,   -- 'feature' | 'option' | 'tag' | 'category' | 'price' | 'stock'
  slug        varchar(128),           -- for feature/option: 'brand', 'color', etc.
  operator    varchar(16) NOT NULL,   -- 'equals' | 'contains' | 'not_contains' | 'gt' | 'lt' | 'between' | 'in' | 'not_in'
  value       jsonb NOT NULL,         -- ["nike","adidas"] or {"min":1000,"max":5000} or true
  sort_order  int NOT NULL DEFAULT 0
)
```

### 5. `listing_item` — products in a listing

Uses `lexo_rank` (varchar, COLLATE "C") for ordering. Lexorank allows inserting between two items without rewriting other rows: rank between "aaa" and "aab" = "aaaN" (midpoint).

```sql
listing_item (
  listing_id      uuid NOT NULL REFERENCES listing(id) ON DELETE CASCADE,
  product_id      uuid NOT NULL,
  lexo_rank       varchar(64) COLLATE "C",  -- lexorank for ordering (manual listings)
  excluded        boolean NOT NULL DEFAULT false,  -- true = hidden from listing (smart listings)
  created_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (listing_id, product_id)
)

CREATE INDEX idx_listing_item_rank ON listing_item (listing_id, lexo_rank)
  WHERE excluded = false;
```

**Usage:**

- **Manual listing**: all products added here with lexo_rank for order
- **Smart listing**: only excluded products stored here (`excluded=true`)
- **Reorder (drag & drop)**: new lexo_rank = midpoint(before, after), single row update, O(1)
- **Rebalance**: when rank strings exceed 48 chars, reassign evenly spaced ranks (rare)

### 6. `filter_group` + `filter_group_translation`

```sql
filter_group (
  id          uuid PRIMARY KEY,
  project_id  uuid NOT NULL,
  listing_id  uuid REFERENCES listing(id) ON DELETE CASCADE,  -- NULL = project defaults
  slug        varchar(64) NOT NULL,
  sort_order  int NOT NULL DEFAULT 0,
  is_collapsed boolean NOT NULL DEFAULT false,
  is_visible  boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, listing_id, slug)
)
```

### 7. `filter_config` + `filter_config_translation`

```sql
filter_config (
  id                uuid PRIMARY KEY,
  project_id        uuid NOT NULL,
  listing_id        uuid REFERENCES listing(id) ON DELETE CASCADE,  -- NULL = project defaults
  filter_group_id   uuid REFERENCES filter_group(id) ON DELETE SET NULL,
  filter_type       varchar(32) NOT NULL,   -- 'feature' | 'option' | 'tag' | 'category' | 'price' | 'stock'
  filter_slug       varchar(128),
  sort_order        int NOT NULL DEFAULT 0,
  display_mode      varchar(32) NOT NULL DEFAULT 'checkbox',
  is_collapsed      boolean NOT NULL DEFAULT false,
  is_visible        boolean NOT NULL DEFAULT true,
  is_searchable     boolean NOT NULL DEFAULT false,
  max_visible_values int DEFAULT 10,
  value_sort        varchar(32) NOT NULL DEFAULT 'count_desc',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, listing_id, filter_type, filter_slug)
)
```

### 8. `filter_value_sort`

```sql
filter_value_sort (
  id              uuid PRIMARY KEY,
  filter_config_id uuid NOT NULL REFERENCES filter_config(id) ON DELETE CASCADE,
  value_slug      varchar(128) NOT NULL,
  sort_order      int NOT NULL DEFAULT 0,
  is_hidden       boolean NOT NULL DEFAULT false,
  UNIQUE(filter_config_id, value_slug)
)
```

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
│   │   │   ├── listing.ts              # listing, listing_translation, listing_condition, listing_item
│   │   │   ├── filterConfig.ts          # filter_group, filter_config, filter_value_sort + translations
│   │   │   └── index.ts
│   │   ├── BaseRepository.ts
│   │   ├── Repository.ts
│   │   ├── SearchIndexRepository.ts
│   │   ├── ListingRepository.ts
│   │   ├── ListingConditionRepository.ts
│   │   ├── ListingItemRepository.ts
│   │   └── FilterConfigRepository.ts
│   ├── scripts/
│   │   ├── index/
│   │   │   ├── SyncProductIndexScript.ts
│   │   │   └── BulkSyncProductIndexScript.ts
│   │   ├── listing/
│   │   │   ├── ListingCreateScript.ts
│   │   │   ├── ListingUpdateScript.ts
│   │   │   ├── ListingDeleteScript.ts
│   │   │   ├── QueryListingProductsScript.ts   # core: conditions → WHERE → products + facets
│   │   │   ├── ExcludeProductScript.ts
│   │   │   ├── AddManualProductsScript.ts
│   │   │   ├── MoveProductScript.ts            # drag & drop reorder via lexo_rank
│   │   │   └── RebalanceListingScript.ts       # rebalance lexo_ranks when too long
│   │   └── filters/
│   │       ├── CreateFilterGroupScript.ts
│   │       ├── UpdateFilterConfigScript.ts
│   │       └── DiscoverFiltersScript.ts
│   ├── resolvers/
│   │   └── admin/
│   │       ├── ListingType.ts
│   │       ├── QueryResolver.ts
│   │       ├── MutationResolver.ts
│   │       ├── ListingResolver.ts
│   │       ├── ListingConditionResolver.ts
│   │       ├── FilterGroupResolver.ts
│   │       └── FilterConfigResolver.ts
│   ├── api/
│   │   └── graphql-admin/
│   │       ├── server.ts
│   │       ├── contextMiddleware.ts
│   │       ├── resolvers/
│   │       │   ├── index.ts
│   │       │   └── types.ts
│   │       └── schema/
│   │           ├── base.graphql
│   │           ├── listing.graphql
│   │           ├── filters.graphql
│   │           └── relay.graphql
│   ├── loaders/
│   │   ├── index.ts
│   │   ├── ListingLoader.ts
│   │   └── FilterConfigLoader.ts
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

Input: listingId, additional filters, pagination

Flow for **smart listing**:
1. Load listing + conditions from DB
2. Build WHERE clause from conditions against `product_search_index`
3. Apply additional user filters (from storefront UI)
4. Load excluded product IDs → add `NOT IN` clause
5. Execute query → product IDs + total count
6. Execute parallel facet count queries
7. Return `{ products, facets, total }`

Flow for **manual listing**:
1. Load product IDs from `listing_item` ORDER BY `lexo_rank`
2. JOIN with `product_search_index` for facet data
3. Apply additional user filters
4. Execute parallel facet count queries
5. Return `{ products, facets, total }`

### 3. Listing CRUD

- **Create**: listing + conditions (smart) or listing + manual products (manual)
- **Update**: modify conditions, sort settings, translations
- **Pin/Exclude**: add/update `listing_product_override`
- **Delete**: soft delete

### 4. GraphQL Schema (Admin)

**Queries:**
- `listingQuery.listing(id, handle)` → `Listing`
- `listingQuery.listings(...)` → `ListingConnection` (relay pagination)
- `listingQuery.listingProducts(listingId, filters, pagination)` → `ListingProductsResult`
- `listingQuery.filterGroups(listingId)` → `[FilterGroup!]!`
- `listingQuery.discoverFilters(listingId)` → `DiscoveredFilters`

**Mutations:**
- `listingMutation.listingCreate / listingUpdate / listingDelete`
- `listingMutation.listingAddCondition / listingRemoveCondition`
- `listingMutation.listingExcludeProduct / listingIncludeProduct`
- `listingMutation.listingAddManualProducts / listingRemoveManualProducts`
- `listingMutation.listingMoveProduct(listingId, productId, afterProductId?, beforeProductId?)` — drag & drop reorder via lexo_rank
- `listingMutation.createFilterGroup / updateFilterGroup / deleteFilterGroup`
- `listingMutation.createFilterConfig / updateFilterConfig / deleteFilterConfig`
- `listingMutation.setFilterValueOrder`

**Federation:**
- `type Product @key(fields: "id", resolvable: false) { id: ID! }` — reference only

---

## Condition → SQL Mapping

| field | slug | operator | value | SQL |
|-------|------|----------|-------|-----|
| feature | brand | contains | ["nike","adidas"] | `feature_slugs && ARRAY['brand:nike','brand:adidas']` |
| feature | brand | not_contains | ["puma"] | `NOT (feature_slugs && ARRAY['brand:puma'])` |
| option | color | contains | ["red"] | `option_slugs && ARRAY['color:red']` |
| tag | - | in | ["uuid1","uuid2"] | `tag_ids && ARRAY['uuid1','uuid2']::uuid[]` |
| category | - | contains | ["cat-uuid"] | `category_ids && ARRAY['cat-uuid']::uuid[]` |
| price | - | between | {min:1000,max:5000} | `min_price_minor >= 1000 AND max_price_minor <= 5000` |
| price | - | gt | 1000 | `min_price_minor > 1000` |
| stock | - | equals | true | `in_stock = true` |
| created_at | - | gt | "2025-01-01" | `created_at > '2025-01-01'` |

Multiple conditions are AND-joined.

---

## Ordering Algorithm

### Manual listing
Products ordered by `lexo_rank` from `listing_product_override`. Simple `ORDER BY lexo_rank`.

### Smart listing
Products come from `product_search_index` query sorted by `listing.sort_by` (popularity, price, newest, etc.). Excluded products filtered out via `NOT IN` from overrides.

### Reorder mutation (drag & drop) — manual listings only
```
moveProductInListing(listingId, productId, afterProductId?, beforeProductId?)
  → new lexo_rank = midpoint(after.lexo_rank, before.lexo_rank)
  → UPDATE listing_product_override SET lexo_rank = newRank WHERE ...
  → single row update, O(1)
```

### Rebalance (maintenance)
When lexo_rank strings exceed 48 chars, rebalance all ranks in listing:
```
rebalanceListingOrder(listingId)
  → SELECT all overrides ORDER BY lexo_rank
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
All tables → generate migration

### Step 3: Repositories
SearchIndexRepository, ListingRepository, ListingConditionRepository, ListingItemRepository, FilterConfigRepository, Repository aggregator

### Step 4: Scripts
SyncProductIndexScript, ListingCreateScript, ListingUpdateScript, ListingDeleteScript, QueryListingProductsScript, ExcludeProductScript, AddManualProductsScript, MoveProductScript, filter CRUD scripts

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
