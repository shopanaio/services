# Catalog: Categories, Collections & Facets — Implementation Plan

## Overview

Three distinct domain concepts, all inside the **catalog** service:

| Concept | Role | Managed by |
|---------|------|------------|
| **Category** | Stable taxonomy, navigation skeleton, SEO pages | Content managers |
| **Collection** | Merchandising product groupings (manual / rule-based) | Merchandisers, marketers |
| **Facet Config** | Facet display configuration (groups, order, UI types, labels) — per project | Catalog admins |

Products are assigned to categories explicitly (by humans, bulk ops, or import).
Collections assemble products by rules or manual picks.
Facets on a collection PLP are computed on-the-fly from products present, rendered according to project-level facet configuration.

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
  -- For 'rule' collections, 'manual' is not valid (no lexo_rank). Validated at app level; fallback to 'newest'.
  default_sort      varchar(32) NOT NULL DEFAULT 'manual',
  default_sort_dir  varchar(4) NOT NULL DEFAULT 'asc',
  
  -- Scheduling
  effective_from       timestamptz,
  effective_to         timestamptz,
  
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
  sort_index        int NOT NULL DEFAULT 0,  -- for stable UI display order (rules are AND-ed, order is semantically irrelevant)
  
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  
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

## 3. Facet Configuration (project-level)

### 3.1 Core idea

Facet configuration defines **how** facets are displayed on PLPs, not **what** data exists. Available facet values are computed on-the-fly from products. The configuration controls:

- Which facets to show and in what order
- Grouping (e.g., "Main filters", "Material & Care")
- UI type per facet (multi-select checkboxes, single-select, range slider, boolean toggle, color swatches)
- Label overrides and value sort order
- Display rules (min distinct values to show, hide empty, collapse threshold)

Configuration is per-project — one flat list of facet groups and facets per project.

### 3.2 Database schema

```sql
catalog.facet_group (
  id                uuid PRIMARY KEY,
  project_id        uuid NOT NULL,
  sort_index        int NOT NULL DEFAULT 0,
  collapsed         boolean NOT NULL DEFAULT false,  -- render collapsed by default
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
)

catalog.facet_group_translation (
  group_id          uuid NOT NULL REFERENCES catalog.facet_group(id) ON DELETE CASCADE,
  locale            varchar(8) NOT NULL,
  project_id        uuid NOT NULL,
  name              text NOT NULL,
  PRIMARY KEY (group_id, locale)
)
```

```sql
catalog.facet_config (
  id                uuid PRIMARY KEY,
  project_id        uuid NOT NULL,
  group_id          uuid REFERENCES catalog.facet_group(id) ON DELETE SET NULL,
  
  -- What product attribute this maps to
  facet_type        varchar(32) NOT NULL,  -- 'price', 'tag', 'feature', 'option', 'in_stock'
  source_id         uuid,                  -- For 'feature'/'option': references the specific product_feature.id or product_option.id.
                                           -- NULL for 'price', 'tag', 'in_stock' (they don't need disambiguation).
                                           -- UNIQUE(project_id, facet_type, source_id) ensures one facet config per source.
  
  -- Display & selection behavior
  ui_type           varchar(16) NOT NULL DEFAULT 'checkbox',  -- 'checkbox' | 'radio' | 'dropdown' | 'range' | 'boolean'
  selection_mode    varchar(16) NOT NULL DEFAULT 'multi',     -- 'single' | 'multi'
  filter_logic      varchar(4) NOT NULL DEFAULT 'or',         -- 'or' | 'and' — how selected values combine within this facet
  sort_index        int NOT NULL DEFAULT 0,
  
  -- filter_logic (for multi-select):
  --
  -- | filter_logic | Example: Material = [Cotton, Polyester] | SQL operator |
  -- |--------------|------------------------------------------|--------------|
  -- | 'or'         | Product has Cotton OR Polyester          | && (overlap) |
  -- | 'and'        | Product has Cotton AND Polyester         | @> (contains)|
  --
  -- 'or' — standard for e-commerce (show cotton OR polyester items)
  -- 'and' — for tags/multi-values (show items with BOTH "sale" AND "new-arrival" tags)
  --
  -- Ignored when selection_mode = 'single' (only one value, no logic needed).
  -- Between different facets — always AND: Material=Cotton AND Color=Red.
  --
  -- ui_type behavior:
  -- | ui_type    | selection_mode | Notes                               |
  -- |------------|----------------|-------------------------------------|
  -- | checkbox   | multi          | Uses filter_logic                   |
  -- | checkbox   | single         | Exact match on single value         |
  -- | radio      | single         | Exact match on single value         |
  -- | dropdown   | single         | Exact match on single value         |
  -- | dropdown   | multi          | Uses filter_logic                   |
  -- | range      | —              | BETWEEN min AND max (numeric only)  |
  -- | boolean    | —              | Exact match (true/false)            |
  --
  -- 'range' and 'boolean' ignore selection_mode and filter_logic.
  --
  -- Swatch: For OPTION-type facets, each FacetValue automatically includes swatch data
  -- (resolved via product_option_value → product_option_swatch). No config flag needed —
  -- if the option value has a swatch, it comes through. Frontend decides how to render it.
  
  -- Rules
  min_values        int NOT NULL DEFAULT 1,            -- hide facet if fewer distinct values
  max_values_visible int NOT NULL DEFAULT 10,          -- "show more" threshold
  value_sort        varchar(16) NOT NULL DEFAULT 'count', -- 'count', 'alpha', 'custom'
  hide_zero_count   boolean NOT NULL DEFAULT true,
  
  -- SEO
  indexable         boolean NOT NULL DEFAULT false,      -- whether filter combinations generate indexable URLs
  
)

catalog.facet_config_translation (
  facet_id          uuid NOT NULL REFERENCES catalog.facet_config(id) ON DELETE CASCADE,
  locale            varchar(8) NOT NULL,
  project_id        uuid NOT NULL,
  label             text NOT NULL,                       -- display label override (e.g., "Colour" instead of "color")
  PRIMARY KEY (facet_id, locale)
)
```

---

### 3.3 Facet Config Values

Configure individual values within a facet: custom labels, sort order, swatches, merge multiple source values into one.

```sql
catalog.facet_swatch (
  id                uuid PRIMARY KEY,
  project_id        uuid NOT NULL,
  swatch_type       varchar(16) NOT NULL,  -- 'color' | 'gradient' | 'image'
  color_one         varchar(9),             -- hex, e.g. '#FF0000'
  color_two         varchar(9),             -- for gradient
  image_id          uuid REFERENCES media.media_file(id) ON DELETE SET NULL,
  metadata          jsonb,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
)

catalog.facet_config_value (
  id                uuid PRIMARY KEY,
  project_id        uuid NOT NULL,
  facet_config_id   uuid NOT NULL REFERENCES catalog.facet_config(id) ON DELETE CASCADE,
  swatch_id         uuid REFERENCES catalog.facet_swatch(id) ON DELETE SET NULL,
  sort_index        int NOT NULL DEFAULT 0,
  enabled           boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
)

catalog.facet_config_value_translation (
  facet_config_value_id uuid NOT NULL REFERENCES catalog.facet_config_value(id) ON DELETE CASCADE,
  locale            varchar(8) NOT NULL,
  project_id        uuid NOT NULL,
  label             text NOT NULL,
  PRIMARY KEY (facet_config_value_id, locale)
)

catalog.facet_config_value_source (
  id                uuid PRIMARY KEY,
  project_id        uuid NOT NULL,
  facet_config_value_id uuid NOT NULL REFERENCES catalog.facet_config_value(id) ON DELETE CASCADE,
  source_value_id   uuid NOT NULL,  -- references feature_value.id, option_value.id, or tag.id
  UNIQUE (project_id, source_value_id)  -- one source → one display value
)
```

**Purpose:**
- `facet_swatch` — visual swatch for a facet value (mirrors `product_option_swatch`)
- `facet_config_value` — configured value: sort order, enabled, swatch
- `facet_config_value_translation` — custom label (overrides source translation)
- `facet_config_value_source` — maps source value → display value. Allows merging multiple source values into one display value

**Label and swatch resolution:**

| Priority | Label | Swatch |
|----------|-------|--------|
| 1 | `facet_config_value_translation` | `facet_swatch` via `facet_config_value.swatch_id` |
| 2 | Source translation (feature_value/option_value/tag) | `product_option_swatch` (option facets only) |

If no `facet_config_value` exists — values come directly from source tables (backward compatible).

---

## 3.4 Slug Resolution via `slugify()` SQL Function

Options and features do **not** store slugs in the database. Instead, slugs are computed on-the-fly from translatable labels using an `IMMUTABLE` SQL function + expression indexes.

### Why no stored slug column

- Slugs are derived data — storing them creates a sync problem (label changes → slug must update).
- Options and features already have `name` in their translation tables (`product_option_translation`, `product_option_value_translation`, `product_feature_translation`, `product_feature_value_translation`).
- An expression index on `slugify(name)` gives the same lookup performance as a stored column, with zero maintenance overhead.

### SQL function

```sql
CREATE OR REPLACE FUNCTION slugify(txt text)
RETURNS text
LANGUAGE sql
IMMUTABLE STRICT
AS $$
  SELECT trim(both '-' from regexp_replace(lower(txt), '[^a-z0-9]+', '-', 'g'));
$$;
```

> **IMMUTABLE** is required for expression indexes. The function must be deterministic — no locale-dependent transforms. Cyrillic/accented characters are stripped (mapped to `-`). If transliteration is needed (e.g., "Цвет" → "tsvet"), extend the function with a `translate()` call or `unaccent`, but it **must** remain `IMMUTABLE`.

### Expression indexes

```sql
-- Option name → slug lookup (per locale)
CREATE UNIQUE INDEX product_option_translation_locale_slug_idx
  ON catalog.product_option_translation (locale, product_id, (slugify(name)));

-- Option value name → slug lookup (per locale, per option)
CREATE UNIQUE INDEX product_option_value_translation_locale_slug_idx
  ON catalog.product_option_value_translation (locale, option_id, (slugify(name)));

-- Feature name → slug lookup (per locale, per product)
CREATE UNIQUE INDEX product_feature_translation_locale_slug_idx
  ON catalog.product_feature_translation (locale, product_id, (slugify(name)));

-- Feature value name → slug lookup (per locale, per feature)
CREATE UNIQUE INDEX product_feature_value_translation_locale_slug_idx
  ON catalog.product_feature_value_translation (locale, feature_id, (slugify(name)));
```

**UNIQUE** indexes enforce slug uniqueness within the scope (locale + parent entity). If two options within the same product and locale slugify to the same value, the insert will fail — forcing the user to pick a distinct name.

### Querying slug on-the-fly (for API responses)

When returning option/feature data to the storefront, include the computed slug in the SELECT:

```sql
SELECT ot.option_id, ot.name, slugify(ot.name) AS slug
FROM product_option_translation ot
WHERE ot.locale = $1 AND ot.product_id = $2;
```

This uses the expression index for the `slugify()` call — no sequential scan.

### Resolving slug → ID (for filter inputs)

When the storefront passes a slug as a filter parameter, the query matches against the expression index:

```sql
-- Resolve option slug → option_id
SELECT option_id FROM product_option_translation
WHERE locale = $1 AND product_id = $2 AND slugify(name) = $3;

-- Resolve option value slug → option_value_id
SELECT option_value_id FROM product_option_value_translation
WHERE locale = $1 AND option_id = $2 AND slugify(name) = $3;
```

The `$3` parameter is the **already-slugified** string from the URL — no `slugify()` applied to the parameter, only to the column. The expression index makes this an index scan.

---

## 4. Product Search Index

Denormalized table for fast queries. Used by category PLPs (product listing), collection rule evaluation, and collection faceted filtering.

**No product name in this index.** Product names are multilingual and live in `product_translation`. Sort-by-name uses a JOIN on `product_translation` at query time (see §5). This avoids duplicating translatable content into the index and keeps the search index language-agnostic — important because the separate search service will have its own index and Typesense already stores per-locale titles for full-text search.

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
  feature_value_ids uuid[] DEFAULT '{}',  -- product_feature_value IDs (the actual values like "Cotton", not the feature definition "Material")
  option_ids        uuid[] DEFAULT '{}',  -- option_value IDs (plain UUIDs)
  category_ids      uuid[] DEFAULT '{}',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
)
```

Indexes: GIN on arrays, B-tree on price/stock/status/created_at.

### Slug → ID lookup (for storefront filter inputs)

Both the search index and facet config store **IDs**. Slug resolution is only needed at the **API boundary** — when a storefront query passes human-readable slugs in `ProductFiltersInput`. Slugs are **not stored** — they are computed from translation `name` via the `slugify()` SQL function (see §3.3).

- **Features:** caller passes `featureSlugs` as `featureSlug:valueSlug` strings → script splits into feature slug + value slug, resolves to feature_value IDs via `slugify(name)` on the respective translation tables:
  ```sql
  SELECT pfv.id AS feature_value_id
  FROM product_feature_value pfv
  JOIN product_feature_value_translation pfvt ON pfvt.feature_value_id = pfv.id
  JOIN product_feature pf ON pf.id = pfv.feature_id
  JOIN product_feature_translation pft ON pft.feature_id = pf.id AND pft.locale = :locale
  WHERE pfvt.locale = :locale
    AND slugify(pft.name) = :featureSlug
    AND slugify(pfvt.name) = :valueSlug
    AND pf.project_id = :projectId;
  ```
- **Options:** caller passes `optionSlugs` as `key:value` strings → script splits into option slug + value slug, resolves both to IDs via `slugify(name)` on the respective translation tables, then uses the resolved option_value_id UUIDs for the array overlap query:
  ```sql
  -- Resolve option value slug → option_value_id  
  SELECT pov.id AS option_value_id
  FROM product_option_value pov
  JOIN product_option_value_translation povt ON povt.option_value_id = pov.id
  JOIN product_option po ON po.id = pov.option_id
  JOIN product_option_translation pot ON pot.option_id = po.id AND pot.locale = :locale
  WHERE povt.locale = :locale
    AND slugify(pot.name) = :optionSlug
    AND slugify(povt.name) = :valueSlug
    AND po.project_id = :projectId;
  ```

All lookups hit expression indexes (see §3.3) — same performance as a stored slug column. Label renames automatically update the computed slug — no sync needed. Results are cached per request.

### Sync flow

`SyncProductIndexScript` runs on productCreated/Updated/Deleted events:
1. Load product + categories, tags, features, options, prices (all local)
2. Broker call `inventory.getOffers` for stock
3. UPSERT into `product_search_index`

No translation data is synced — the index contains only structured/numeric fields.

---

## 5. PLP Query Flow (Category & Collection)

### 5.1 Category PLP

```
QueryCategoryProductsScript:
  Input: { categoryId, locale, filters?, sort?, pagination }
  
  1. Load category → get default_sort
  2. Build query:
       product_category pc
       JOIN product_search_index psi ON pc.product_id = psi.product_id
       WHERE pc.category_id = :categoryId
         AND psi.status = 'active'
         AND [apply facet filters]
  3. Apply sort:
       'manual' → ORDER BY pc.lexo_rank
       'price'  → ORDER BY psi.min_price_minor
       'newest' → ORDER BY psi.created_at DESC
       'name'   → LEFT JOIN product_translation pt
                     ON pt.product_id = psi.product_id AND pt.locale = :locale
                   ORDER BY pt.title
  4. Paginate (Relay cursor)
  5. Compute facet aggregations (see 5.3)
  6. Return { products, facets, totalCount, pageInfo }
```

The `name` sort JOINs `product_translation` using the request locale. The `product_translation` table has a composite PK `(product_id, locale)` so the join is index-only. LEFT JOIN ensures products without a translation for the requested locale still appear (sorted last via `NULLS LAST`).

### 5.2 Collection PLP

```
QueryCollectionProductsScript:
  Input: { collectionId, locale, filters?, sort?, pagination }
  
  1. Load collection → type, rules, default_sort
  2. Check scheduling (effective_from/effective_to)
  3. Resolve product set by type:
     
     manual:
       SELECT from collection_item ORDER BY lexo_rank
       
     rule:
       Evaluate collection_rules against product_search_index
  
  4. Apply facet filters from user
  5. Sort:
       'manual' → ORDER BY ci.lexo_rank
       'price'  → ORDER BY psi.min_price_minor
       'newest' → ORDER BY psi.created_at DESC
       'name'   → LEFT JOIN product_translation pt
                     ON pt.product_id = psi.product_id AND pt.locale = :locale
                   ORDER BY pt.title NULLS LAST
  6. Paginate
  7. Compute facet aggregations (see 5.3)
  8. Return { products, facets, totalCount, pageInfo }
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

-- Feature facets (grouped by feature via JOIN to restore parent relationship)
SELECT pfv.feature_id, pfv.id AS feature_value_id, COUNT(*) AS cnt
FROM product_search_index psi,
     unnest(psi.feature_value_ids) AS fv_id
JOIN product_feature_value pfv ON pfv.id = fv_id
WHERE psi.product_id IN (...)
GROUP BY pfv.feature_id, pfv.id
-- Then filter in app: only include feature_ids that have a facet_config with matching source_id

-- Option facets (grouped by option via JOIN to restore parent relationship)
SELECT pov.option_id, pov.id AS option_value_id, COUNT(*) AS cnt
FROM product_search_index psi,
     unnest(psi.option_ids) AS ov_id
JOIN product_option_value pov ON pov.id = ov_id
WHERE psi.product_id IN (...)
GROUP BY pov.option_id, pov.id
-- Then filter in app: only include option_ids that have a facet_config with matching source_id

-- In-stock count (simple COUNT WHERE in_stock = true)
```

The raw facet data is then intersected with the project's `facet_config` to determine:
- Which facets to include (only those defined in `facet_config`)
- Order and grouping (via `facet_group`)
- UI type
- Whether to hide (fewer values than `min_values`)
- Value count limits (`max_values_visible`)
- Labels from `facet_config_translation`

---

## 6. File Structure — New & Modified

### New files

```
src/repositories/models/
  searchIndex.ts                        # product_search_index
  collection.ts                         # collection, collection_item, collection_rule, collection_translation, collection_seo, collection_media
  facetConfig.ts                         # facet_group, facet_config + translations

src/repositories/
  listing/SearchIndexRepository.ts      # product_search_index CRUD + facet queries
  collection/CollectionRepository.ts    # collection CRUD
  collection/CollectionItemRepository.ts # manual items: add/remove/reorder
  collection/CollectionRuleRepository.ts # rules CRUD
  facet/FacetGroupRepository.ts         # facet_group CRUD
  facet/FacetConfigRepository.ts        # facet_config CRUD

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

  facet/
    FacetGroupCreateScript.ts
    FacetGroupUpdateScript.ts
    FacetGroupDeleteScript.ts
    FacetConfigCreateScript.ts
    FacetConfigUpdateScript.ts
    FacetConfigDeleteScript.ts
    ResolveFacetsScript.ts               # compute facet display from project config

src/resolvers/admin/
  CollectionResolver.ts
  CollectionQueryResolver.ts
  CollectionMutationResolver.ts
  FacetGroupResolver.ts
  FacetConfigResolver.ts
  FacetQueryResolver.ts
  FacetMutationResolver.ts

src/loaders/
  CollectionLoader.ts
  FacetGroupLoader.ts
  FacetConfigLoader.ts

api/graphql-admin/schema/
  collection.graphql
  facet.graphql
```

### Modified files

```
src/repositories/models/index.ts           # export new model files
src/repositories/models/categories.ts      # add lexo_rank to product_category; add default_sort to category
src/repositories/Repository.ts             # add new repositories
src/loaders/Loader.ts                      # add new loaders
src/handlers/index.ts                      # add search index sync handlers
api/graphql-admin/schema/base.graphql      # add collection/facet queries & mutations to CatalogQuery/CatalogMutation
api/graphql-admin/schema/category.graphql  # add categoryProducts, defaultSort fields to Category
src/resolvers/admin/CategoryResolver.ts    # add new field resolvers
```

---

## 7. GraphQL Schema

### 7.1 Category extensions (in `category.graphql`)

```graphql
# Add to Category type:
defaultSort: ProductSortBy!
defaultSortDirection: SortDirection!

"""Category products with sorting, filtering, and pagination."""
categoryProducts(
  first: Int
  after: String
  last: Int
  before: String
  filters: ProductFiltersInput
  sort: ProductSortInput
): CategoryProductConnection!
```

```graphql
type CategoryProductConnection {
  edges: [CategoryProductEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
  facets: Facets
}

type CategoryProductEdge {
  node: Product!
  cursor: String!
}
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
  
  defaultSort: ProductSortBy!
  defaultSortDirection: SortDirection!
  
  activeFrom: DateTime
  activeTo: DateTime
  isActive: Boolean!
  
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

### 7.3 Facet Configuration (in `facet.graphql`)

```graphql
type FacetGroup implements Node {
  id: ID!
  name: String!
  sortIndex: Int!
  collapsed: Boolean!
  facets: [FacetConfig!]!
  createdAt: DateTime!
  updatedAt: DateTime!
}

type FacetConfig implements Node {
  id: ID!
  facetType: FacetType!
  """For FEATURE/OPTION: the specific product_feature or product_option this facet represents. Null for PRICE, TAG, IN_STOCK."""
  sourceId: ID
  label: String!
  uiType: FacetUIType!
  selectionMode: FacetSelectionMode!
  sortIndex: Int!
  group: FacetGroup
  minValues: Int!
  maxValuesVisible: Int!
  valueSort: FacetValueSort!
  hideZeroCount: Boolean!
  indexable: Boolean!
}

enum FacetType { PRICE TAG FEATURE OPTION IN_STOCK }
enum FacetUIType { CHECKBOX RADIO DROPDOWN RANGE BOOLEAN }
enum FacetSelectionMode { SINGLE MULTI }
enum FacetValueSort { COUNT ALPHA CUSTOM }

# Inputs:
input FacetGroupCreateInput { name: String!, collapsed: Boolean, sortIndex: Int }
input FacetGroupUpdateInput { id: ID!, name: String, collapsed: Boolean, sortIndex: Int }
input FacetGroupDeleteInput { id: ID! }

input FacetConfigCreateInput { facetType: FacetType!, sourceId: ID, uiType: FacetUIType, selectionMode: FacetSelectionMode, groupId: ID, label: String!, sortIndex: Int }
input FacetConfigUpdateInput { id: ID!, uiType: FacetUIType, selectionMode: FacetSelectionMode, groupId: ID, label: String, sortIndex: Int, minValues: Int, maxValuesVisible: Int, valueSort: FacetValueSort, hideZeroCount: Boolean, indexable: Boolean }
input FacetConfigDeleteInput { id: ID! }
```

### 7.4 Shared types

```graphql
enum SortDirection { ASC DESC }

input ProductFiltersInput {
  priceMinMinor: BigInt
  priceMaxMinor: BigInt
  tagIds: [ID!]
  """Format: 'featureSlug:valueSlug'. Resolved to feature_value IDs server-side via slugify(name) on translation tables (see §3.3)."""
  featureSlugs: [String!]
  """Format: 'optionSlug:valueSlug'. Resolved to IDs server-side via slugify(name) on translation tables (see §3.3)."""
  optionSlugs: [String!]
  inStock: Boolean
}

input ProductSortInput {
  by: ProductSortBy!
  direction: SortDirection
}

enum ProductSortBy { MANUAL PRICE NEWEST NAME }


"""Computed facet results for a product listing page."""
type Facets {
  priceRange: PriceRange
  groups: [FacetResultGroup!]!
}

type FacetResultGroup {
  name: String
  collapsed: Boolean!
  facets: [FacetResult!]!
}

type FacetResult {
  facetType: FacetType!
  label: String!
  uiType: FacetUIType!
  selectionMode: FacetSelectionMode!
  values: [FacetValue!]!
  totalCount: Int!
}

type FacetValue {
  value: String!
  label: String
  count: Int!
  """Swatch from ProductOptionSwatch. Present for OPTION-type facets when the option value has a swatch."""
  swatch: ProductOptionSwatch
}

type PriceRange {
  minMinor: BigInt!
  maxMinor: BigInt!
}
```

### 7.5 CatalogQuery / CatalogMutation additions (in `base.graphql`)

```graphql
# CatalogQuery:
categoryProducts(categoryId: ID!, first: Int, after: String, last: Int, before: String, filters: ProductFiltersInput, sort: ProductSortInput): CategoryProductConnection!

collection(id: ID!): Collection
collectionByHandle(handle: String!): Collection
collections(first: Int, after: String, last: Int, before: String): CollectionConnection!

"""Preview: evaluate rules and return matching product count without creating a collection."""
collectionRulesPreviewCount(rules: [CollectionRuleInput!]!): Int!

facetGroup(id: ID!): FacetGroup
facetGroups: [FacetGroup!]!

facetConfig(id: ID!): FacetConfig
facetConfigs: [FacetConfig!]!

# CatalogMutation:
collectionCreate(input: CollectionCreateInput!): CollectionCreatePayload!
collectionUpdate(input: CollectionUpdateInput!): CollectionUpdatePayload!
collectionDelete(input: CollectionDeleteInput!): CollectionDeletePayload!
collectionAddProducts(input: CollectionAddProductsInput!): CollectionAddProductsPayload!
collectionRemoveProducts(input: CollectionRemoveProductsInput!): CollectionRemoveProductsPayload!
collectionMoveProduct(input: CollectionMoveProductInput!): CollectionMoveProductPayload!
collectionUpdateRules(input: CollectionUpdateRulesInput!): CollectionUpdateRulesPayload!

facetGroupCreate(input: FacetGroupCreateInput!): FacetGroupCreatePayload!
facetGroupUpdate(input: FacetGroupUpdateInput!): FacetGroupUpdatePayload!
facetGroupDelete(input: FacetGroupDeleteInput!): FacetGroupDeletePayload!

facetConfigCreate(input: FacetConfigCreateInput!): FacetConfigCreatePayload!
facetConfigUpdate(input: FacetConfigUpdateInput!): FacetConfigUpdatePayload!
facetConfigDelete(input: FacetConfigDeleteInput!): FacetConfigDeletePayload!

categoryMoveProduct(input: CategoryMoveProductInput!): CategoryMoveProductPayload!
categoryRebalance(input: CategoryRebalanceInput!): CategoryRebalancePayload!
categoryUpdateSort(input: CategoryUpdateSortInput!): CategoryUpdateSortPayload!
```

---

## 8. Ordering Algorithm

Same lexo_rank approach for both category products and collection items.

**Manual sort:** `ORDER BY lexo_rank ASC`

**Alternative sorts:** `JOIN product_search_index` for price/created_at; `JOIN product_translation` for name (locale-aware). lexo_rank preserved for switching back to manual.

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
--   → resolve slug 'cotton' → feature_value_id via slugify(name) on product_feature_value_translation (see §3.3),
--     then: feature_value_id = ANY(psi.feature_value_ids)

-- { field: "category", operator: "in", value: ["<cat-id>"] }
--   → psi.category_ids && ARRAY['<cat-id>']::uuid[]

-- All rules AND-ed together
```

All rules are AND-ed together.

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

### Phase 0: slugify() SQL Function

1. **Create `slugify()` function** — IMMUTABLE SQL function for expression indexes (see §3.3)
2. **Create expression indexes** on option/feature translation tables: `slugify(name)`
3. **Drop `slug` column** from `product_option` and `product_option_value` (replaced by computed `slugify(name)`)
4. **Generate & apply migration**

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

### Phase 1B: Facet Configuration

1. **Drizzle models:** `facetConfig.ts`
2. **Generate migration**
3. **FacetGroupRepository, FacetConfigRepository**
4. **Facet scripts:** FacetGroup CRUD, FacetConfig CRUD, ResolveFacetsScript
5. **GraphQL:** facet.graphql, add to CatalogQuery/CatalogMutation
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
