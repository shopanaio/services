# Catalog: Categories, Collections & Facets — Implementation Plan

## Overview

Three distinct domain concepts, all inside the **catalog** service:

| Concept | Role | Managed by |
|---------|------|------------|
| **Category** | Stable taxonomy, navigation skeleton, SEO pages | Content managers |
| **Collection** | Merchandising product groupings (manual / rule-based) | Merchandisers, marketers |
| **Filter Set** | Facet display configuration (groups, order, UI types, labels) | Catalog admins |

Products are assigned to categories explicitly (by humans, bulk ops, or import).
Collections assemble products by rules or manual picks.
Filters on a category/collection PLP are computed on-the-fly from products present, but **rendered** according to a Filter Set configuration.

**Scope (Phase 1):** PostgreSQL only. No Typesense, no full-text search, no algorithmic collections.

---

## 1. Categories — What Changes

Categories already exist (`catalog.category`, `product_category`). This plan adds:

### 1.1 Category sort order for products

Products inside a category need explicit ordering (merchandiser drag & drop). Currently `product_category` has `sortIndex` (integer). We replace this with `lexo_rank` for O(1) reorder:

```sql
-- ALTER product_category:
--   DROP sort_index
--   ADD lexo_rank varchar(64) COLLATE "C" NOT NULL
--   ADD INDEX idx_product_category_rank (category_id, lexo_rank)
```

**Why lexo_rank instead of sortIndex:** Integer sort requires rewriting O(N) rows on reorder. Lexo_rank inserts a midpoint string between two neighbors — single row update.

To hide a product from a category — remove the `product_category` row. No `excluded` flag needed: categories are managed explicitly by humans.

### 1.2 Category sort settings

Add sort preference to category:

```sql
-- ALTER category:
--   ADD default_sort varchar(32) NOT NULL DEFAULT 'manual'
--   ADD default_sort_direction varchar(4) NOT NULL DEFAULT 'asc'
```

Values: `'manual'`, `'price'`, `'newest'`, `'name'`

### 1.3 Category & Filter Sets

A category does **not** store filter configuration and has no link to Filter Set. Filter Set is resolved entirely by external context (product type / channel / storefront template) — see section 3.

---

## 2. Collections

A **collection** is a named product grouping for merchandising/marketing, independent of the category tree.

### 2.1 Collection types

| Type | How products are selected |
|------|--------------------------|
| **manual** | Admin explicitly adds products, orders via lexo_rank |
| **rule** | System evaluates conditions against `product_search_index` |

### 2.2 Database schema

```sql
catalog.collection (
  id                uuid PRIMARY KEY,
  project_id        uuid NOT NULL,
  handle            varchar(255),
  type              varchar(16) NOT NULL,  -- 'manual' | 'rule'
  
  -- Sort
  default_sort      varchar(32) NOT NULL DEFAULT 'manual',
  default_sort_dir  varchar(4) NOT NULL DEFAULT 'asc',
  
  -- Scheduling
  active_from       timestamptz,
  active_to         timestamptz,
  
  -- Limits
  max_products      int,           -- NULL = unlimited
  
  -- Filter Set override (optional)
  filter_set_id     uuid REFERENCES catalog.filter_set(id) ON DELETE SET NULL,
  
  -- Publication
  published_at      timestamptz,
  
  -- Timestamps
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  deleted_at        timestamptz,
  
  UNIQUE(project_id, handle) WHERE deleted_at IS NULL AND handle IS NOT NULL
)
```

```sql
catalog.collection_translation (
  collection_id     uuid NOT NULL REFERENCES catalog.collection(id) ON DELETE CASCADE,
  locale            varchar(8) NOT NULL,
  project_id        uuid NOT NULL,
  name              text NOT NULL,
  description_text  text,
  description_html  text,
  description_json  text,
  PRIMARY KEY (collection_id, locale)
)
```

```sql
catalog.collection_seo (
  collection_id     uuid NOT NULL REFERENCES catalog.collection(id) ON DELETE CASCADE,
  locale            varchar(8) NOT NULL,
  project_id        uuid NOT NULL,
  title             text,
  description       text,
  PRIMARY KEY (collection_id, locale)
)
```

```sql
catalog.collection_media (
  collection_id     uuid NOT NULL REFERENCES catalog.collection(id) ON DELETE CASCADE,
  file_id           uuid NOT NULL,
  project_id        uuid NOT NULL,
  sort_index        int NOT NULL DEFAULT 0,
  PRIMARY KEY (collection_id, file_id)
)
```

### 2.3 Collection items (manual collections only)

```sql
catalog.collection_item (
  collection_id     uuid NOT NULL REFERENCES catalog.collection(id) ON DELETE CASCADE,
  product_id        uuid NOT NULL REFERENCES catalog.product(id) ON DELETE CASCADE,
  lexo_rank         varchar(64) COLLATE "C" NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (collection_id, product_id)
)

CREATE INDEX idx_collection_item_rank
  ON catalog.collection_item (collection_id, lexo_rank);
```

**For manual collections:** all products are in `collection_item` with lexo_rank.
**For rule collections:** products are computed from rules — no `collection_item` rows. To remove a product from a rule collection, adjust the rules or the product's attributes.

### 2.4 Collection rules

```sql
catalog.collection_rule (
  id                uuid PRIMARY KEY,
  collection_id     uuid NOT NULL REFERENCES catalog.collection(id) ON DELETE CASCADE,
  project_id        uuid NOT NULL,
  field             varchar(64) NOT NULL,   -- 'tag', 'price', 'option', 'feature', 'in_stock', 'category', 'created_at'
  operator          varchar(16) NOT NULL,   -- 'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'nin', 'contains', 'between'
  value             jsonb NOT NULL,          -- scalar or array depending on operator
  sort_index        int NOT NULL DEFAULT 0,
  
  -- Rules within a collection are AND-ed by default
  -- Future: rule_group for OR groups
)

CREATE INDEX idx_collection_rule_collection ON catalog.collection_rule(collection_id);
```

**Examples:**
```json
{ "field": "tag", "operator": "in", "value": ["sale", "new-arrival"] }
{ "field": "price", "operator": "between", "value": [1000, 5000] }
{ "field": "in_stock", "operator": "eq", "value": true }
{ "field": "feature", "operator": "contains", "value": "cotton" }
{ "field": "category", "operator": "in", "value": ["<category-id-1>", "<category-id-2>"] }
```

Rules are evaluated against `product_search_index`.

---

## 3. Filter Sets (Facet Configuration)

### 3.1 Core idea

A Filter Set defines **how** facets are displayed, not **what** data exists. The available facet values are always computed on-the-fly from products in the current category/collection. The Filter Set controls:

- Which facets to show and in what order
- Grouping (e.g., "Main filters", "Material & Care")
- UI type per facet (multi-select checkboxes, single-select, range slider, boolean toggle, color swatches)
- Label overrides and value sort order
- Display rules (min distinct values to show, hide empty, collapse threshold)

### 3.2 Database schema

```sql
catalog.filter_set (
  id                uuid PRIMARY KEY,
  project_id        uuid NOT NULL,
  handle            varchar(255) NOT NULL,
  is_default        boolean NOT NULL DEFAULT false,  -- project-wide default
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, handle),
  -- Only one default per project:
  UNIQUE(project_id) WHERE is_default = true
)

catalog.filter_set_translation (
  filter_set_id     uuid NOT NULL REFERENCES catalog.filter_set(id) ON DELETE CASCADE,
  locale            varchar(8) NOT NULL,
  project_id        uuid NOT NULL,
  name              text NOT NULL,
  PRIMARY KEY (filter_set_id, locale)
)
```

```sql
catalog.filter_set_group (
  id                uuid PRIMARY KEY,
  filter_set_id     uuid NOT NULL REFERENCES catalog.filter_set(id) ON DELETE CASCADE,
  project_id        uuid NOT NULL,
  sort_index        int NOT NULL DEFAULT 0,
  collapsed         boolean NOT NULL DEFAULT false   -- render collapsed by default
)

catalog.filter_set_group_translation (
  group_id          uuid NOT NULL REFERENCES catalog.filter_set_group(id) ON DELETE CASCADE,
  locale            varchar(8) NOT NULL,
  project_id        uuid NOT NULL,
  name              text NOT NULL,
  PRIMARY KEY (group_id, locale)
)
```

```sql
catalog.filter_set_facet (
  id                uuid PRIMARY KEY,
  filter_set_id     uuid NOT NULL REFERENCES catalog.filter_set(id) ON DELETE CASCADE,
  group_id          uuid REFERENCES catalog.filter_set_group(id) ON DELETE SET NULL,
  project_id        uuid NOT NULL,
  
  -- What product attribute this maps to
  facet_type        varchar(32) NOT NULL,  -- 'price', 'tag', 'feature', 'option', 'in_stock'
  facet_key         varchar(255),           -- slug/identifier within type (e.g., feature slug, option slug). NULL for 'price', 'in_stock'
  
  -- Display
  ui_type           varchar(32) NOT NULL DEFAULT 'multi_select',  -- 'multi_select', 'single_select', 'range', 'boolean', 'color_swatch'
  sort_index        int NOT NULL DEFAULT 0,
  
  -- Rules
  min_values        int NOT NULL DEFAULT 1,            -- hide facet if fewer distinct values
  max_values_visible int NOT NULL DEFAULT 10,          -- "show more" threshold
  value_sort        varchar(16) NOT NULL DEFAULT 'count', -- 'count', 'alpha', 'custom'
  hide_zero_count   boolean NOT NULL DEFAULT true,
  
  -- SEO
  indexable         boolean NOT NULL DEFAULT false       -- whether filter combinations generate indexable URLs
)

catalog.filter_set_facet_translation (
  facet_id          uuid NOT NULL REFERENCES catalog.filter_set_facet(id) ON DELETE CASCADE,
  locale            varchar(8) NOT NULL,
  project_id        uuid NOT NULL,
  label             text NOT NULL,                       -- display label override (e.g., "Colour" instead of "color")
  PRIMARY KEY (facet_id, locale)
)
```

### 3.3 Filter Set resolution

Filter Sets are **not** linked to categories. When rendering a PLP, the storefront resolves which Filter Set to use by external context:

```
1. By product type / attribute set (e.g., "Apparel" → apparel filter set)
2. By channel / country (different storefronts may use different filter sets)
3. By storefront page template
4. Project default (filter_set.is_default = true)
5. No Filter Set → show raw facets without configuration (fallback)
```

Collections can optionally override via `collection.filter_set_id`.

The storefront passes a `filterSetId` (or `filterSetHandle`) to the PLP query. If not provided, the project default is used.

---

## 4. Product Search Index

Denormalized table for fast faceted queries. Same as before, used by both category PLPs and collection rule evaluation.

```sql
catalog.product_search_index (
  project_id        uuid NOT NULL,
  product_id        uuid PRIMARY KEY REFERENCES catalog.product(id) ON DELETE CASCADE,
  status            varchar(16) NOT NULL DEFAULT 'draft',
  min_price_minor   bigint,
  max_price_minor   bigint,
  in_stock          boolean NOT NULL DEFAULT false,
  total_stock       int NOT NULL DEFAULT 0,
  tag_ids           uuid[] DEFAULT '{}',
  feature_slugs     text[] DEFAULT '{}',
  option_slugs      text[] DEFAULT '{}',
  category_ids      uuid[] DEFAULT '{}',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
)
```

Indexes: GIN on arrays, B-tree on price/stock/status/created_at.

### Sync flow

`SyncProductIndexScript` runs on productCreated/Updated/Deleted events:
1. Load product + categories, tags, features, options, prices (all local)
2. Broker call `inventory.getOffers` for stock
3. UPSERT into `product_search_index`

---

## 5. PLP Query Flow (Category & Collection)

### 5.1 Category PLP

```
QueryCategoryProductsScript:
  Input: { categoryId, filters?, sort?, pagination, filterSetId? }
  
  1. Load category → get default_sort
  2. Resolve Filter Set: use filterSetId from input, or project default
  3. Build query:
       product_category pc
       JOIN product_search_index psi ON pc.product_id = psi.product_id
       WHERE pc.category_id = :categoryId
         AND psi.status = 'active'
         AND [apply facet filters]
  4. Apply sort:
       'manual' → ORDER BY pc.lexo_rank
       'price'  → ORDER BY psi.min_price_minor
       'newest' → ORDER BY psi.created_at DESC
  5. Paginate (Relay cursor)
  6. Compute facet aggregations (filtered set):
       - Only facets defined in the resolved Filter Set
       - For each facet: count distinct values, apply min_values threshold
       - Price range: min/max across filtered set
  7. Return { products, facets, totalCount, pageInfo, filterSetId }
```

### 5.2 Collection PLP

```
QueryCollectionProductsScript:
  Input: { collectionId, filters?, sort?, pagination }
  
  1. Load collection → type, rules, default_sort, filter_set_id, limits
  2. Check scheduling (active_from/active_to)
  3. Resolve product set by type:
     
     manual:
       SELECT from collection_item ORDER BY lexo_rank
       
     rule:
       Evaluate collection_rules against product_search_index
  
  4. Apply max_products limit if set
  5. Apply facet filters from user
  6. Sort (manual → lexo_rank; price/newest → from product_search_index)
  7. Paginate
  8. Compute facet aggregations (same as category)
  9. Return { products, facets, totalCount, pageInfo }
```

### 5.3 Facet computation

For a given product set (from category or collection):

```sql
-- Price range
SELECT MIN(psi.min_price_minor), MAX(psi.max_price_minor)
FROM product_search_index psi
WHERE psi.product_id IN (... filtered product set ...)

-- Tag facets
SELECT unnest(psi.tag_ids) AS tag_id, COUNT(*) AS cnt
FROM product_search_index psi
WHERE psi.product_id IN (...)
GROUP BY tag_id

-- Feature facets
SELECT unnest(psi.feature_slugs) AS slug, COUNT(*) AS cnt
FROM product_search_index psi
WHERE psi.product_id IN (...)
GROUP BY slug

-- Option facets (same pattern)
-- In-stock count (simple COUNT WHERE in_stock = true)
```

The raw facet data is then intersected with the resolved Filter Set config to determine:
- Which facets to include (only those defined in Filter Set)
- Order and grouping
- UI type
- Whether to hide (fewer values than `min_values`)
- Value count limits (`max_values_visible`)
- Labels from `filter_set_facet_translation`

---

## 6. File Structure — New & Modified

### New files

```
src/repositories/models/
  searchIndex.ts                        # product_search_index
  collection.ts                         # collection, collection_item, collection_rule, collection_translation, collection_seo, collection_media
  filterSet.ts                          # filter_set, filter_set_group, filter_set_facet + translations

src/repositories/
  listing/SearchIndexRepository.ts      # product_search_index CRUD + facet queries
  collection/CollectionRepository.ts    # collection CRUD
  collection/CollectionItemRepository.ts # manual items: add/remove/reorder
  collection/CollectionRuleRepository.ts # rules CRUD
  filterSet/FilterSetRepository.ts      # filter_set + groups + facets CRUD

src/scripts/
  search-index/
    SyncProductIndexScript.ts
  
  collection/
    CollectionCreateScript.ts
    CollectionUpdateScript.ts
    CollectionDeleteScript.ts
    CollectionAddProductsScript.ts       # manual only: add products with lexo_rank
    CollectionRemoveProductsScript.ts    # manual only: remove products
    CollectionMoveProductScript.ts       # manual only: lexo_rank reorder
    CollectionRebalanceScript.ts         # manual only: rebalance lexo_ranks
    CollectionUpdateRulesScript.ts       # rule only: replace rule set
    QueryCollectionProductsScript.ts     # both types: filtered, sorted, paginated query

  category/
    QueryCategoryProductsScript.ts       # category PLP: products + facets
    CategoryMoveProductScript.ts         # reorder product in category
    CategoryRebalanceScript.ts

  filter-set/
    FilterSetCreateScript.ts
    FilterSetUpdateScript.ts
    FilterSetDeleteScript.ts
    ResolveFacetsScript.ts               # resolve Filter Set + compute facet display

src/resolvers/admin/
  CollectionResolver.ts
  CollectionQueryResolver.ts
  CollectionMutationResolver.ts
  FilterSetResolver.ts
  FilterSetQueryResolver.ts
  FilterSetMutationResolver.ts

src/loaders/
  CollectionLoader.ts
  FilterSetLoader.ts

api/graphql-admin/schema/
  collection.graphql
  filterSet.graphql
```

### Modified files

```
src/repositories/models/index.ts           # export new model files
src/repositories/models/categories.ts      # add lexo_rank to product_category; add default_sort to category
src/repositories/Repository.ts             # add new repositories
src/loaders/Loader.ts                      # add new loaders
src/handlers/index.ts                      # add search index sync handlers
api/graphql-admin/schema/base.graphql      # add collection/filterSet queries & mutations to CatalogQuery/CatalogMutation
api/graphql-admin/schema/category.graphql  # add products(filters), defaultSort, filterSet fields to Category
src/resolvers/admin/CategoryResolver.ts    # add new field resolvers
```

---

## 7. GraphQL Schema

### 7.1 Category extensions (in `category.graphql`)

```graphql
# Add to Category type:
defaultSort: CategorySortBy!
defaultSortDirection: SortDirection!

"""Category products with filtering, sorting, pagination."""
categoryProducts(
  first: Int
  after: String
  last: Int
  before: String
  filters: ProductFiltersInput
  sort: ProductSortInput
  filterSetId: ID
): CategoryProductConnection!
```

### 7.2 Collection (in `collection.graphql`)

```graphql
type Collection implements Node @key(fields: "id") {
  id: ID!
  handle: String
  type: CollectionType!
  name: String!
  description: Description
  media: [CollectionMediaItem!]!
  seo(locale: String): CollectionSeo
  
  defaultSort: CollectionSortBy!
  defaultSortDirection: SortDirection!
  filterSet: FilterSet
  
  activeFrom: DateTime
  activeTo: DateTime
  isActive: Boolean!
  maxProducts: Int
  
  publishedAt: DateTime
  isPublished: Boolean!
  createdAt: DateTime!
  updatedAt: DateTime!
  
  rules: [CollectionRule!]!
  
  products(
    first: Int, after: String, last: Int, before: String
    filters: ProductFiltersInput
    sort: ProductSortInput
  ): CollectionProductConnection!
  
  productsCount: Int!
  
  """Preview: evaluate rules and return matching product count without saving."""
  previewCount: Int!
}

enum CollectionType { MANUAL RULE }

type CollectionRule {
  id: ID!
  field: String!
  operator: String!
  value: JSON!
  sortIndex: Int!
}

type CollectionProductConnection {
  edges: [CollectionProductEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
  facets: Facets
}

type CollectionProductEdge {
  node: Product!
  cursor: String!
}

# Inputs:
input CollectionCreateInput { ... }
input CollectionUpdateInput { ... }
input CollectionDeleteInput { id: ID! }
input CollectionAddProductsInput { collectionId: ID!, productIds: [ID!]! }
input CollectionRemoveProductsInput { collectionId: ID!, productIds: [ID!]! }
input CollectionMoveProductInput { collectionId: ID!, productId: ID!, afterProductId: ID, beforeProductId: ID }
input CollectionUpdateRulesInput { collectionId: ID!, rules: [CollectionRuleInput!]! }
input CollectionRuleInput { field: String!, operator: String!, value: JSON! }
```

### 7.3 Filter Set (in `filterSet.graphql`)

```graphql
type FilterSet implements Node {
  id: ID!
  handle: String!
  name: String!
  isDefault: Boolean!
  groups: [FilterSetGroup!]!
  facets: [FilterSetFacet!]!
  createdAt: DateTime!
  updatedAt: DateTime!
}

type FilterSetGroup {
  id: ID!
  name: String!
  sortIndex: Int!
  collapsed: Boolean!
  facets: [FilterSetFacet!]!
}

type FilterSetFacet {
  id: ID!
  facetType: FacetType!
  facetKey: String
  label: String!
  uiType: FacetUIType!
  sortIndex: Int!
  group: FilterSetGroup
  minValues: Int!
  maxValuesVisible: Int!
  valueSort: FacetValueSort!
  hideZeroCount: Boolean!
  indexable: Boolean!
}

enum FacetType { PRICE TAG FEATURE OPTION IN_STOCK }
enum FacetUIType { MULTI_SELECT SINGLE_SELECT RANGE BOOLEAN COLOR_SWATCH }
enum FacetValueSort { COUNT ALPHA CUSTOM }

# Inputs:
input FilterSetCreateInput { handle: String!, name: String!, isDefault: Boolean, facets: [FilterSetFacetInput!] }
input FilterSetUpdateInput { id: ID!, handle: String, name: String, isDefault: Boolean }
input FilterSetDeleteInput { id: ID! }
# ... facet/group CRUD inputs
```

### 7.4 Shared types

```graphql
enum SortDirection { ASC DESC }

input ProductFiltersInput {
  priceMinMinor: BigInt
  priceMaxMinor: BigInt
  tagIds: [ID!]
  featureSlugs: [String!]
  optionSlugs: [String!]
  inStock: Boolean
}

input ProductSortInput {
  by: ProductSortBy!
  direction: SortDirection
}

enum ProductSortBy { MANUAL PRICE NEWEST NAME }
enum CategorySortBy { MANUAL PRICE NEWEST NAME }
enum CollectionSortBy { MANUAL PRICE NEWEST NAME }

"""Computed facet results for a product listing page."""
type Facets {
  """The Filter Set used to render these facets (if any)."""
  filterSet: FilterSet
  priceRange: PriceRange
  groups: [FacetGroup!]!
}

type FacetGroup {
  name: String
  collapsed: Boolean!
  facets: [FacetResult!]!
}

type FacetResult {
  facetType: FacetType!
  facetKey: String
  label: String!
  uiType: FacetUIType!
  values: [FacetValue!]!
  totalCount: Int!
}

type FacetValue {
  value: String!
  label: String
  count: Int!
}

type PriceRange {
  minMinor: BigInt!
  maxMinor: BigInt!
}
```

### 7.5 CatalogQuery / CatalogMutation additions (in `base.graphql`)

```graphql
# CatalogQuery:
collection(id: ID!): Collection
collectionByHandle(handle: String!): Collection
collections(first: Int, after: String, last: Int, before: String): CollectionConnection!

filterSet(id: ID!): FilterSet
filterSetByHandle(handle: String!): FilterSet
filterSets(first: Int, after: String, last: Int, before: String): FilterSetConnection!

# CatalogMutation:
collectionCreate(input: CollectionCreateInput!): CollectionCreatePayload!
collectionUpdate(input: CollectionUpdateInput!): CollectionUpdatePayload!
collectionDelete(input: CollectionDeleteInput!): CollectionDeletePayload!
collectionAddProducts(input: CollectionAddProductsInput!): CollectionAddProductsPayload!
collectionRemoveProducts(input: CollectionRemoveProductsInput!): CollectionRemoveProductsPayload!
collectionMoveProduct(input: CollectionMoveProductInput!): CollectionMoveProductPayload!
collectionUpdateRules(input: CollectionUpdateRulesInput!): CollectionUpdateRulesPayload!

filterSetCreate(input: FilterSetCreateInput!): FilterSetCreatePayload!
filterSetUpdate(input: FilterSetUpdateInput!): FilterSetUpdatePayload!
filterSetDelete(input: FilterSetDeleteInput!): FilterSetDeletePayload!
# ... facet/group mutations

categoryMoveProduct(input: CategoryMoveProductInput!): CategoryMoveProductPayload!
categoryRebalance(input: CategoryRebalanceInput!): CategoryRebalancePayload!
categoryUpdateSort(input: CategoryUpdateSortInput!): CategoryUpdateSortPayload!
```

---

## 8. Ordering Algorithm

Same lexo_rank approach for both category products and collection items.

**Manual sort:** `ORDER BY lexo_rank ASC`

**Alternative sorts:** `JOIN product_search_index`, sort by price/created_at/name. lexo_rank preserved for switching back to manual.

**Drag & drop:** `newRank = midpoint(afterRank, beforeRank)`, single row UPDATE.

**Rebalance:** When any lexo_rank exceeds 48 chars, reassign evenly spaced ranks across all items.

---

## 9. Collection Rule Evaluation

Rules in `collection_rule` are evaluated against `product_search_index`:

```sql
-- Each rule becomes a WHERE clause:
-- { field: "tag", operator: "in", value: ["sale"] }
--   → psi.tag_ids @> ARRAY['<sale-tag-id>']::uuid[]

-- { field: "price", operator: "between", value: [1000, 5000] }
--   → psi.min_price_minor >= 1000 AND psi.max_price_minor <= 5000

-- { field: "in_stock", operator: "eq", value: true }
--   → psi.in_stock = true

-- { field: "feature", operator: "contains", value: "cotton" }
--   → 'cotton' = ANY(psi.feature_slugs)

-- { field: "category", operator: "in", value: ["<cat-id>"] }
--   → psi.category_ids && ARRAY['<cat-id>']::uuid[]

-- All rules AND-ed together
```

For rule collections, `max_products` limit is applied after rule evaluation.

---

## 10. Broker Dependencies

One external call:

```typescript
broker.call<Inventory.GetOffersResult, Inventory.GetOffersParams>(
  "inventory.getOffers", { storeId, variantIds }
);
```

Everything else is local to catalog.

---

## 11. Implementation Order

### Phase 1A: Search Index + Category Products

1. **Drizzle models:** `searchIndex.ts` — product_search_index
2. **Alter `product_category`:** replace `sortIndex` with `lexo_rank`
3. **Alter `category`:** add `default_sort`, `default_sort_direction`
4. **Generate migration**
5. **SearchIndexRepository** — upsert, delete, facet queries
6. **SyncProductIndexScript** — build index row from local data + inventory broker
7. **Event handlers** — productCreated/Updated/Deleted → sync index
8. **Category product scripts:** QueryCategoryProductsScript, CategoryMoveProductScript, CategoryRebalanceScript
9. **GraphQL:** extend Category type, add category product mutations
10. **Resolvers & loaders**
11. **Build & test**

### Phase 1B: Filter Sets

1. **Drizzle models:** `filterSet.ts`
2. **Generate migration**
3. **FilterSetRepository**
4. **Filter Set scripts:** CRUD + ResolveFacetsScript
5. **GraphQL:** filterSet.graphql, add to CatalogQuery/CatalogMutation
6. **Resolvers & loaders**
7. **Build & test**

### Phase 1C: Collections

1. **Drizzle models:** `collection.ts`
2. **Generate migration**
3. **Collection repositories:** CollectionRepository, CollectionItemRepository, CollectionRuleRepository
4. **Collection scripts:** CRUD, add/remove/move/rebalance (manual), rules (rule), QueryCollectionProductsScript
5. **GraphQL:** collection.graphql, add to CatalogQuery/CatalogMutation
6. **Resolvers & loaders**
7. **Build & test**

---

## 12. Reference Files (within Catalog)

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
| Translation model | `src/repositories/models/translations.ts` |
| SEO model | `src/repositories/models/seo.ts` |
| Media model | `src/repositories/models/media.ts` |
| Broker types | `packages/broker-types/src/actions/inventory.ts` |
| Event types | `packages/events/src/types.ts` |
