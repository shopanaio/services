# Listing Service - Implementation Plan

## Context

Products and categories live in the **catalog** service. The **listing** service maintains a denormalized search index (`product_search_index`) for fast faceted filtering. It subscribes to `productCreated` / `productUpdated` / `productDeleted` events from catalog, fetches full product data via broker calls, and upserts the index.

Categories stay in catalog. Listing only stores what it needs: the search index and filter UI configuration.

**Scope (Phase 1):** No Typesense, no Metarank, no full-text search. Only:
- PostgreSQL-based faceted filtering with GIN indexes
- Event handlers to sync `product_search_index` from catalog events
- Storefront query: list products with filters, facet counts, sorting, pagination
- Admin: filter display configuration (groups, display modes, value sorting)

---

## Database Schema (Drizzle ORM)

Schema namespace: `listing` (PostgreSQL schema).

### Tables

**1. `product_search_index`** — denormalized facet index
```
project_id, product_id (PK),
min_price_minor (bigint), max_price_minor (bigint),
in_stock (bool), total_stock (int),
tag_ids (uuid[]), feature_slugs (text[]), option_slugs (text[]),
category_ids (uuid[]),
popularity_score (float), published_at, created_at, updated_at
```
GIN indexes on tag_ids, feature_slugs, option_slugs, category_ids.
B-tree indexes on price, stock, sorting columns.

**2. `filter_group`** + `filter_group_translation` — UI filter grouping
- Groups filters visually (e.g. "Characteristics", "Variants", "Price")
- `category_id` references catalog's category (NULL = project-level defaults)

**3. `filter_config`** + `filter_config_translation` — individual filter settings
- Display mode (checkbox, radio, range, color_swatch, size_grid)
- Value sorting (count_desc, alpha_asc, custom)
- Visibility, searchability, max visible values

**4. `filter_value_sort`** — custom value ordering
- Per-filter custom sort order and hidden values

*(Tables 2-4 follow the schema from FILTERS.md exactly)*

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
│   │   │   ├── schema.ts              # pgSchema("listing")
│   │   │   ├── searchIndex.ts         # product_search_index
│   │   │   ├── filterConfig.ts        # filter_group, filter_config, filter_value_sort
│   │   │   └── index.ts
│   │   ├── BaseRepository.ts
│   │   ├── Repository.ts
│   │   ├── SearchIndexRepository.ts
│   │   └── FilterConfigRepository.ts
│   ├── scripts/
│   │   ├── index/
│   │   │   ├── SyncProductIndexScript.ts
│   │   │   └── BulkSyncProductIndexScript.ts
│   │   ├── listing/
│   │   │   └── ListProductsScript.ts
│   │   └── filters/
│   │       ├── CreateFilterGroupScript.ts
│   │       ├── UpdateFilterConfigScript.ts
│   │       └── DiscoverFiltersScript.ts
│   ├── resolvers/
│   │   └── admin/
│   │       ├── ListingType.ts
│   │       ├── QueryResolver.ts
│   │       ├── MutationResolver.ts
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
│   │   └── FilterConfigLoader.ts
│   ├── ListingBrokerActions.ts
│   └── ListingEventHandlers.ts
```

---

## Key Components

### 1. Event Handlers (`ListingEventHandlers.ts`)

```typescript
@EventHandler("productCreated")  → calls SyncProductIndexScript
@EventHandler("productUpdated")  → calls SyncProductIndexScript (re-fetch + upsert)
@EventHandler("productDeleted")  → deletes row from product_search_index
```

**SyncProductIndexScript** flow:
1. Receive productId + storeId from event
2. Broker call to `catalog.getProductForIndex` — returns product with categories, features, options, tags, pricing
3. Broker call to `inventory.getStockSummary` — returns in_stock + total_stock
4. Upsert into `product_search_index`

### 2. Broker Actions (`ListingBrokerActions.ts`)

- `listing.syncProductIndex` — trigger index sync for a product (called externally or for manual re-index)

### 3. ListProductsScript (Core Query)

Input: projectId, categoryIds, tagIds, features, options, minPrice, maxPrice, inStock, sortBy, limit, offset

Flow:
1. Build WHERE clause using GIN operators (`&&` overlap, `@>` contains)
2. Execute filtered query → get product IDs + total count
3. Execute parallel facet count queries (unnest + GROUP BY)
4. Return `{ productIds, facets, total }`

### 4. GraphQL Schema (Admin)

**Queries:**
- `listingQuery.searchProducts(input)` → `ProductListingResult`
- `listingQuery.filterGroups(categoryId)` → `[FilterGroup!]!`
- `listingQuery.discoverFilters(categoryId)` → `DiscoveredFilters`

**Mutations:**
- `listingMutation.createFilterGroup/updateFilterGroup/deleteFilterGroup`
- `listingMutation.createFilterConfig/updateFilterConfig/deleteFilterConfig`
- `listingMutation.setFilterValueOrder`
- `listingMutation.reindexProduct(productId)` — manual re-index

**Federation:**
- `type Product @key(fields: "id", resolvable: false) { id: ID! }` — reference only, resolved by catalog

---

## New Broker Types Needed

In `packages/broker-types/src/actions/`:
- **`catalog.ts`**: Add `GetProductForIndex` params/result (returns product with all facetable data: categories, features, options, tags, pricing)
- **`listing.ts`**: New file — `SyncProductIndex` params/result

In catalog service:
- New broker action `catalog.getProductForIndex(productId, storeId)` → denormalized product data

---

## Implementation Order

### Step 1: Scaffold service
- `package.json`, `tsconfig.json`, `build.config.json`, `codegen.ts`, `drizzle.config.ts`
- `listing.module.ts`, `listing.nest-service.ts`
- Kernel, context, BaseScript, BaseRepository

### Step 2: Database schema (Drizzle models)
- `product_search_index`, `filter_group`, `filter_config`, `filter_value_sort` + translations
- Generate migration with `shopana db:generate`

### Step 3: Repositories
- `SearchIndexRepository`, `FilterConfigRepository`
- `Repository` aggregator

### Step 4: Scripts
- `SyncProductIndexScript`, `BulkSyncProductIndexScript`
- `ListProductsScript` (faceted query)
- Filter config CRUD scripts

### Step 5: Event Handlers + Broker Actions
- `ListingEventHandlers` subscribing to product events
- `ListingBrokerActions`
- Add `catalog.getProductForIndex` broker action in catalog service

### Step 6: GraphQL Schema + Resolvers
- `.graphql` schema files
- Resolver classes + Apollo resolver map
- Run codegen

### Step 7: Build & Test
- `shopana build -s listing`
- `shopana schema build`
- `shopana dev` — verify service starts
- Test via GraphQL playground

---

## Reference Files

| Pattern | Reference File |
|---------|---------------|
| Module | `services/inventory/src/inventory.module.ts` |
| NestService | `services/inventory/src/inventory.nest-service.ts` |
| Kernel | `services/inventory/src/kernel/Kernel.ts` |
| BaseScript | `services/inventory/src/kernel/BaseScript.ts` |
| Repository | `services/inventory/src/repositories/Repository.ts` |
| BaseRepository | `services/inventory/src/repositories/BaseRepository.ts` |
| EventHandlers | `services/inventory/src/InventoryEventHandlers.ts` |
| BrokerActions | `services/inventory/src/InventoryBrokerActions.ts` |
| GraphQL server | `services/inventory/src/api/graphql-admin/server.ts` |
| Resolver map | `services/inventory/src/api/graphql-admin/resolvers/index.ts` |
| Type resolvers | `services/inventory/src/api/graphql-admin/resolvers/types.ts` |
| base.graphql | `services/inventory/src/api/graphql-admin/schema/base.graphql` |
| Drizzle schema | `services/inventory/src/repositories/models/schema.ts` |
| Event types | `packages/events/src/types.ts` |
| Broker types | `packages/broker-types/src/actions/inventory.ts` |
