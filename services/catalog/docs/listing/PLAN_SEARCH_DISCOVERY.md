# Search & Discovery Split Plan (v2)

## Status

This file is a new plan version. It does not modify `PLAN.md`.

## 0. Goal

Move product listing runtime from `catalog` into a dedicated `search-discovery` service so we can support multiple search backends (`postgres`, `algolia`, `elastic`) behind one stable business API.

Final intent:
- `catalog` owns master data and category membership (`assign` / `unassign`).
- `search-discovery` owns retrieval logic: collections, rules, facets, sorting, ranking, and listing APIs.

---

## 1. Service Boundaries

| Domain | `catalog` | `search-discovery` |
|---|---|---|
| Product/category master data | Owns | Reads via events/sync |
| Category membership (`product_category`) | Owns assign/unassign | Builds read model |
| Category product reorder | Does not own | Owns (`lexo_rank`) |
| Collections (manual/rule) | Does not own | Owns |
| Facet config and value mapping | Does not own | Owns |
| Facet counting/isolation | Does not own | Owns |
| Storefront listing runtime | Does not own | Owns |
| Admin simple category listing | Optional plain fallback only (no rules/facets/reorder) | Primary listing API |

Rules:
- No rules/facet logic inside `catalog` runtime.
- No `collection*` / `facet*` CRUD inside `catalog` GraphQL.
- `catalog` remains source of truth for product/category identity and membership.

---

## 2. High-Level Architecture

### 2.1 Catalog

Responsibilities:
- Product CRUD and status.
- Category CRUD.
- Category membership (`assignProductToCategory`, `unassignProductFromCategory`).
- Emit domain events for any data change relevant to discovery.

### 2.2 Search-Discovery

Responsibilities:
- Build and maintain listing read models.
- Own `category_product_order` with `lexo_rank`.
- Own collections, rules, and facets.
- Execute category and collection listings.
- Expose one API for storefront and admin listing use cases.
- Support pluggable search providers.

### 2.3 Gateway / BFF

Responsibilities:
- Keep stable GraphQL contract for clients.
- Route listing queries and merchandising mutations to `search-discovery`.
- Route master-data mutations to `catalog`.

---

## 3. Data Ownership and Storage

## 3.1 Catalog storage (minimal for listing scope)

Keep:
- `catalog.product`
- `catalog.category`
- `catalog.product_category` (membership only)

Do not keep for listing runtime:
- Facet tables.
- Collection tables.
- `lexo_rank` for category ordering.

## 3.2 Search-Discovery storage

New canonical tables (PostgreSQL in service DB):

```sql
search.category_product_order (
  project_id        uuid NOT NULL,
  category_id       uuid NOT NULL,
  product_id        uuid NOT NULL,
  lexo_rank         varchar(64) COLLATE "C" NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, category_id, product_id)
);

CREATE INDEX idx_category_product_order_rank
  ON search.category_product_order (project_id, category_id, lexo_rank);
```

Collections (owned by `search-discovery`):
- `search.collection`
- `search.collection_translation`
- `search.collection_item` (`lexo_rank`)
- `search.collection_rule`

Facets (owned by `search-discovery`):
- `search.facet_group`
- `search.facet_group_translation`
- `search.facet`
- `search.facet_translation`
- `search.facet_swatch`
- `search.facet_value`
- `search.facet_value_source_handle`
- `search.facet_value_translation`

Read/index models in `search-discovery`:
- `search.product_search_index` (product-level fields)
- `search.variant_search_index` (variant-level fields)

---

## 4. Event Contract: Catalog -> Search-Discovery

`catalog` publishes events. `search-discovery` is a consumer and projection owner.

Mandatory event families:
- `ProductCreated`, `ProductUpdated`, `ProductDeleted`
- `ProductStatusChanged`
- `ProductTagsChanged`
- `ProductFeaturesChanged`
- `VariantCreated`, `VariantUpdated`, `VariantDeleted`
- `VariantOptionsChanged`
- `PriceChanged`
- `InventoryChanged`
- `CategoryCreated`, `CategoryUpdated`, `CategoryDeleted`
- `ProductAssignedToCategory`
- `ProductUnassignedFromCategory`

Mandatory event envelope:
- `eventId` (idempotency)
- `projectId`
- `occurredAt`
- `aggregateId`
- `aggregateVersion` (or monotonic sequence)

Consumer guarantees in `search-discovery`:
- Idempotent apply by `eventId`.
- Out-of-order protection by `aggregateVersion`/timestamp.
- Retry-safe handlers.

---

## 5. LexoRank Ownership and Reordering

`lexo_rank` is owned only by `search-discovery`.

### 5.1 Lifecycle

- On `ProductAssignedToCategory`: insert row into `category_product_order` with tail rank.
- On `ProductUnassignedFromCategory`: delete row.
- On reorder API: update one row using midpoint rank.
- On rank length threshold: run rebalance job.

### 5.2 APIs in Search-Discovery

- `categoryMoveProduct(categoryId, productId, afterProductId?, beforeProductId?)`
- `categoryRebalance(categoryId)`

`catalog` does not expose reorder mutations.

---

## 6. Provider Abstraction (Backend-Agnostic Search)

Define a service-level interface:

```ts
interface SearchProvider {
  upsertProduct(doc: ProductDocument): Promise<void>;
  removeProduct(projectId: string, productId: string): Promise<void>;

  queryProducts(input: ProductQueryInput): Promise<ProductQueryResult>;
  aggregateFacets(input: FacetAggregationInput): Promise<FacetAggregationResult>;

  previewRules(input: RulesPreviewInput): Promise<number>;
  healthcheck(): Promise<{ ok: boolean; details?: string }>;
}
```

Provider implementations:
- `postgres` (baseline, full parity first)
- `algolia`
- `elastic`

Selection strategy:
- `project.searchBackend` controls active provider per project.

### 6.1 Capability policy

If provider cannot satisfy exact semantics:
- fallback to `postgres` provider for that query path, or
- execute hybrid plan (provider candidates + Postgres post-filter/sort), only when deterministic.

Manual sort (`MANUAL`) must remain deterministic:
- final order always derived from `search.category_product_order.lexo_rank` (or `collection_item.lexo_rank`).

---

## 7. Listing Semantics in Search-Discovery

## 7.1 Category listing

Input:
- `categoryId`
- `filters` (`facets`, `ranges`, `inStock`)
- `sort`
- pagination

Flow:
1. Resolve facet slugs to source handles via facet mapping.
2. Build query plan for active provider.
3. Apply product-level and variant-level predicates with correct semantics.
4. Sort:
- `MANUAL` -> `category_product_order.lexo_rank`
- `PRICE` / `NEWEST` / `NAME` -> provider-native or Postgres fallback
5. Compute facets with facet isolation.
6. Return products + facets + counts + pageInfo.

## 7.2 Collection listing

Manual collections:
- product set from `collection_item` + `lexo_rank`.

Rule collections:
- compile rules into product-level predicates + one variant-level block.

Both:
- apply user filters.
- compute facets with isolation.
- return paginated response.

## 7.3 Facet semantics

- Configured values only (`facet_value.enabled=true`).
- `facetSlug:valueSlug` resolved through `facet_value_source_handle`.
- OR inside same facet, AND across different facets.
- Variant-bound predicates evaluated with same-variant correctness.
- `PRICE` and `IN_STOCK` are computed facets (no `facet_value` rows).

---

## 8. API Surface Changes

## 8.1 Remove from catalog API

From `catalog` GraphQL:
- all `collection*` queries/mutations
- all `facet*` queries/mutations
- category reorder mutations
- runtime faceted listing logic

## 8.2 Keep in catalog API

- product/category master-data mutations
- category assign/unassign mutations
- optional `categoryAssignedProducts` plain fallback query (no rules/facets/reorder contract)

## 8.3 Add to search-discovery API

Admin:
- collection CRUD
- collection rule CRUD
- facet group/facet/value/swatch CRUD
- category reorder mutations

Runtime:
- `categoryProducts`
- `collectionProducts`
- `collectionRulesPreviewCount`

---

## 9. File Structure Target

## 9.1 Catalog changes

Keep and simplify:
- remove listing runtime extensions from `catalog` plan scope
- keep assignment handlers and event emission

## 9.2 Search-discovery new structure

```text
services/search/src/repositories/models/
  productSearchIndex.ts
  variantSearchIndex.ts
  categoryProductOrder.ts
  collection.ts
  facet.ts

services/search/src/repositories/
  listing/SearchIndexRepository.ts
  listing/VariantSearchIndexRepository.ts
  listing/CategoryOrderRepository.ts
  collection/CollectionRepository.ts
  collection/CollectionItemRepository.ts
  collection/CollectionRuleRepository.ts
  facet/FacetGroupRepository.ts
  facet/FacetRepository.ts
  facet/FacetValueRepository.ts
  facet/FacetSwatchRepository.ts

services/search/src/scripts/
  sync/SyncProductIndexScript.ts
  sync/SyncVariantIndexScript.ts
  category/CategoryMoveProductScript.ts
  category/CategoryRebalanceScript.ts
  collection/*.ts
  facet/*.ts
  listing/QueryCategoryProductsScript.ts
  listing/QueryCollectionProductsScript.ts

services/search/src/providers/
  SearchProvider.ts
  postgres/PostgresProvider.ts
  algolia/AlgoliaProvider.ts
  elastic/ElasticProvider.ts

services/search/src/api/graphql-admin/schema/
  collection.graphql
  facet.graphql
  listing.graphql
```

---

## 10. Migration and Rollout Plan

### Phase 0: Contract Freeze

1. Freeze listing business contract (`filters`, `sorting`, facets payload).
2. Freeze event schemas from `catalog`.
3. Add feature flags:
- `listing.read.from_search_service`
- `listing.write.reorder.to_search_service`

### Phase 1: Search-Discovery Bootstrap (Postgres provider)

1. Create `search` service DB schema for order, facets, collections, indexes.
2. Implement event consumers and projection builders.
3. Implement listing queries with Postgres provider parity.
4. Implement admin CRUD for facets/collections/reorder.

### Phase 2: Dual Run

1. Route copy traffic to new service.
2. Compare old vs new responses:
- product IDs
- order
- `totalCount`
- facet counts
3. Log diffs and fix parity issues.

### Phase 3: Cutover

1. Switch storefront listing reads to `search-discovery`.
2. Switch admin reorder and merchandising to `search-discovery`.
3. Keep fallback toggle for rollback window.

### Phase 4: Multi-backend Enablement

1. Add `algolia` provider.
2. Add `elastic` provider.
3. Enable per-project backend selection.
4. Keep parity tests against `postgres` baseline.

### Phase 5: Catalog Simplification

1. Remove deprecated listing runtime from `catalog`.
2. Keep only optional plain admin fallback query if still needed.

---

## 11. Rollout Contract (Mandatory)

`ProductFiltersInput.facets` is public only when all are true:
1. Facet mapping data is populated in `search-discovery`.
2. `facetSlug:valueSlug` resolver is active in `search-discovery`.
3. Listing query paths use resolved source handles.
4. E2E parity checks pass for counts and pagination.

Before that, keep facets input disabled by feature flag.

---

## 12. Testing Strategy

- Unit tests:
- rule compiler (product-level vs variant-level)
- facet resolver
- lexo rank midpoint/rebalance
- provider adapter behavior

- Integration tests:
- event -> projection sync
- category/collection listing with mixed filters
- facet isolation correctness

- E2E tests:
- admin reorder -> storefront order
- collection rules preview vs actual listing
- provider parity (`postgres` vs `algolia`/`elastic` where supported)

---

## 13. Acceptance Criteria

- `catalog` no longer executes rule/facet listing runtime.
- `search-discovery` serves category and collection listings with facets.
- Category reorder works only through `search-discovery` and persists via `lexo_rank`.
- Assign/unassign in `catalog` propagates to `search-discovery` reliably.
- `postgres` provider reaches semantic baseline.
- At least one external provider (`algolia` or `elastic`) runs behind same API contract.

---

## 14. Non-Goals (for this phase)

- Full-text relevance tuning across providers.
- Personalized ranking.
- ML recommendation pipelines.
- Cross-service distributed transactions.

