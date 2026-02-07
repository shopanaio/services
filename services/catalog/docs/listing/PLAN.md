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

### 1.3 Category SEO

New table, same structure as `product_seo`:

```sql
catalog.category_seo (
  category_id       uuid NOT NULL REFERENCES catalog.category(id) ON DELETE CASCADE,
  locale            varchar(8) NOT NULL,
  project_id        uuid NOT NULL,
  
  -- SEO fields (for search engines)
  seo_title         varchar(70),
  seo_description   varchar(160),
  
  -- Open Graph fields (for social media)
  og_title          varchar(95),
  og_description    text,
  og_image_id       uuid,
  
  PRIMARY KEY (category_id, locale)
)
CREATE INDEX idx_category_seo_project_locale ON catalog.category_seo (project_id, locale);
```

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
  -- For 'rule' collections, 'manual' is not valid (no lexo_rank). Enforced by CHECK constraint.
  default_sort      varchar(32) NOT NULL DEFAULT 'manual',
  default_sort_dir  varchar(4) NOT NULL DEFAULT 'asc',
  
  -- Scheduling
  effective_from       timestamptz,
  effective_to         timestamptz,
  CHECK (effective_to IS NULL OR effective_from IS NULL OR effective_to > effective_from),
  
  -- Publication
  published_at      timestamptz,
  
  -- Timestamps
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  deleted_at        timestamptz,
  
  UNIQUE(project_id, handle) WHERE deleted_at IS NULL AND handle IS NOT NULL,
  CHECK (type != 'rule' OR default_sort != 'manual')
)

-- Active scheduled collections lookup
CREATE INDEX idx_collection_scheduling
  ON catalog.collection (project_id, effective_from, effective_to)
  WHERE deleted_at IS NULL AND published_at IS NOT NULL;
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
CREATE INDEX idx_collection_translation_project_locale
  ON catalog.collection_translation (project_id, locale);
```

```sql
catalog.collection_seo (
  collection_id     uuid NOT NULL REFERENCES catalog.collection(id) ON DELETE CASCADE,
  locale            varchar(8) NOT NULL,
  project_id        uuid NOT NULL,
  
  -- SEO fields (for search engines)
  seo_title         varchar(70),
  seo_description   varchar(160),
  
  -- Open Graph fields (for social media)
  og_title          varchar(95),
  og_description    text,
  og_image_id       uuid,
  
  PRIMARY KEY (collection_id, locale)
)
CREATE INDEX idx_collection_seo_project_locale ON catalog.collection_seo (project_id, locale);
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
  operator          varchar(16) NOT NULL,   -- 'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'nin', 'all', 'contains', 'between'
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
- Display rules (min distinct values to show, collapse threshold)
- Facet and value lists are derived from the base product set (category/collection without user filters) and remain stable as filters change; only counts update

Configuration is per-project — one flat list of facet groups and facets per project.

### 3.2 Database schema

```sql
catalog.facet_group (
  id                uuid PRIMARY KEY,
  project_id        uuid NOT NULL,
  sort_index        int NOT NULL DEFAULT 0,
  collapsed         boolean NOT NULL DEFAULT false,  -- render collapsed by default
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(project_id, sort_index) DEFERRABLE INITIALLY DEFERRED
)

catalog.facet_group_translation (
  group_id          uuid NOT NULL REFERENCES catalog.facet_group(id) ON DELETE CASCADE,
  locale            varchar(8) NOT NULL,
  project_id        uuid NOT NULL,
  name              text NOT NULL,
  PRIMARY KEY (group_id, locale)
)
CREATE INDEX idx_facet_group_translation_project_locale
  ON catalog.facet_group_translation (project_id, locale);
```

```sql
catalog.facet_config (
  id                uuid PRIMARY KEY,
  project_id        uuid NOT NULL,
  group_id          uuid REFERENCES catalog.facet_group(id) ON DELETE SET NULL,
  
  -- What product attribute this maps to
  facet_type        varchar(32) NOT NULL,  -- 'price', 'tag', 'feature', 'option', 'in_stock'
  source_handle     varchar(255),          -- For 'feature'/'option': the slug of the option/feature concept
                                           -- (e.g., 'color', 'material'). Matches product_option.slug or
                                           -- product_feature.slug across all products in the project.
                                           -- NULL for 'price', 'tag', 'in_stock' (they don't need disambiguation).
  UNIQUE(project_id, facet_type, source_handle) NULLS NOT DISTINCT,
  
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
  --        Facet isolation: drop entire facet filter, count per value independently.
  -- 'and' — for tags/multi-values (show items with BOTH "sale" AND "new-arrival" tags)
  --        Facet isolation: per-value — drop only the tested value's boolean,
  --        keep other selected values. See §5.3.1 Step 2 for details.
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
  -- Slug (app-generated, supports all languages via Node.js transliteration)
  slug              varchar(255) NOT NULL,
  
  -- SEO
  indexable         boolean NOT NULL DEFAULT false,      -- whether filter combinations generate indexable URLs
  
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(project_id, slug)
)

catalog.facet_config_translation (
  facet_id          uuid NOT NULL REFERENCES catalog.facet_config(id) ON DELETE CASCADE,
  locale            varchar(8) NOT NULL,
  project_id        uuid NOT NULL,
  label             text NOT NULL,                       -- display label override (e.g., "Colour" instead of "color")
  PRIMARY KEY (facet_id, locale)
)
CREATE INDEX idx_facet_config_translation_project_locale
  ON catalog.facet_config_translation (project_id, locale);
```

---

### 3.3 Facet Config Values

Настройка значений внутри фасета: кастомные label, порядок, swatch, объединение source values.

```sql
-- Same structure as product_option_swatch (intentional duplication — separate domain, same shape)
catalog.facet_swatch (
  id                uuid PRIMARY KEY,
  project_id        uuid NOT NULL,
  swatch_type       varchar(32) NOT NULL,  -- 'color' | 'gradient' | 'image'
  color_one         varchar(32),
  color_two         varchar(32),
  image_id          uuid,
  metadata          jsonb
)

catalog.facet_config_value (
  id                uuid PRIMARY KEY,
  project_id        uuid NOT NULL,
  facet_config_id   uuid NOT NULL REFERENCES catalog.facet_config(id) ON DELETE CASCADE,
  source_handles    text[] NOT NULL DEFAULT '{}',   -- composite slug references into product_search_index:
                                                    -- For option facets: ['color:red', 'color:crimson'] (option_slug:value_slug)
                                                    -- For feature facets: ['material:cotton', 'material:organic-cotton']
                                                    -- For tag facets: ['sale', 'clearance'] (tag handle directly)
                                                    -- Multiple entries = merge into one display value
  slug              varchar(255) NOT NULL,           -- app-generated, unique per facet
  swatch_id         uuid REFERENCES catalog.facet_swatch(id) ON DELETE SET NULL,
  sort_index        int NOT NULL DEFAULT 0,
  enabled           boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(facet_config_id, slug)
)
-- GIN index for reverse lookup (source handle → display value):
-- CREATE INDEX ON catalog.facet_config_value USING GIN (source_handles);
-- Uniqueness (one source handle → one display value) validated in application code.

catalog.facet_config_value_translation (
  facet_config_value_id uuid NOT NULL REFERENCES catalog.facet_config_value(id) ON DELETE CASCADE,
  locale            varchar(8) NOT NULL,
  project_id        uuid NOT NULL,
  label             text NOT NULL,
  PRIMARY KEY (facet_config_value_id, locale)
)
CREATE INDEX idx_facet_config_value_translation_project_locale
  ON catalog.facet_config_value_translation (project_id, locale);
```

**Назначение:**
- `facet_swatch` — визуальный swatch для значения фасета (аналог `product_option_swatch`)
- `facet_config_value` — настроенное значение: порядок, enabled, swatch. Поле `source_handles` содержит массив composite slug references (merge нескольких source values в одно display value)
- `facet_config_value_translation` — кастомный label (переопределяет source translation)

**Резолюция label и swatch:**

| Приоритет | Label | Swatch |
|-----------|-------|--------|
| 1 | `facet_config_value_translation` | `facet_swatch` через `facet_config_value.swatch_id` |
| 2 | Source translation (feature_value/option_value/tag) | `product_option_swatch` (только для option facets) |

Если `facet_config_value` не создан — значения берутся напрямую из source таблиц (backward compatible).

---

### 3.4 Slug Resolution — Stored Slugs, App-Generated

Slugs live on `facet_config.slug` and `facet_config_value.slug` — not on translation tables. A facet is one entity regardless of locale: "Цвет", "Color", "Farbe" all share slug `color`. Slug is locale-independent.

#### Why stored slug (not computed)

- **All-language support.** SQL `IMMUTABLE` functions cannot handle CJK, Arabic, Hindi, Thai, Georgian, etc. Slug is provided by the frontend — admin decides the URL-friendly identifier.
- **Locale-independent.** Slug belongs to the entity, not to a translation. One facet = one slug across all locales.
- **DB uniqueness is trivial.** `UNIQUE(project_id, slug)` on `facet_config`, `UNIQUE(facet_config_id, slug)` on `facet_config_value` — no expression indexes, no denormalized columns.

#### Slug source

Slug is provided by the frontend (admin UI) on create and update. The backend validates format (`^[a-z0-9][a-z0-9-]*[a-z0-9]$`) and uniqueness. No auto-generation — the admin is responsible for choosing a meaningful, URL-safe slug.

#### Querying slugs (for API responses)

```sql
-- Facet slugs
SELECT fc.id, fc.slug, fct.label
FROM facet_config fc
JOIN facet_config_translation fct ON fct.facet_id = fc.id
WHERE fc.project_id = :projectId AND fct.locale = :locale;

-- Facet value slugs
SELECT fcv.id, fcv.slug, fcvt.label
FROM facet_config_value fcv
JOIN facet_config_value_translation fcvt ON fcvt.facet_config_value_id = fcv.id
WHERE fcv.facet_config_id = :facetConfigId AND fcvt.locale = :locale;
```

#### Resolving slug → search index handle (for filter inputs)

Storefront passes `facetSlug:valueSlug` strings via the unified `ProductFiltersInput.facets` field. All facet types (tag, feature, option) use the same resolution path:

```sql
-- Step 1: Resolve facet slug → facet_config row
SELECT fc.id AS facet_config_id, fc.facet_type, fc.source_handle, fc.filter_logic
FROM facet_config fc
WHERE fc.project_id = :projectId
  AND fc.slug = :facetSlug;
```

```sql
-- Step 2a (configured values — custom merges/labels): Resolve value slug → source_handles
SELECT fcv.source_handles
FROM facet_config_value fcv
WHERE fcv.facet_config_id = :facetConfigId
  AND fcv.slug = :valueSlug;
```

```
-- Step 2b (shortcut — unconfigured values, no facet_config_value row):
-- Derive composite directly from facet_config + valueSlug:
--   option/feature: source_handle || ':' || valueSlug  (e.g., 'color' + ':' + 'red' = 'color:red')
--   tag:            valueSlug directly                  (e.g., 'sale')
-- No DB lookup needed — just string concatenation.
```

`facet_type` determines which `product_search_index` array column to query: `tag_handles`, `feature_slugs`, or `option_slugs`. `filter_logic` determines the array operator: `&&` (overlap) for OR, `@>` (contains) for AND.

Step 1 is a simple B-tree index lookup on `UNIQUE(project_id, slug)`. Step 2a is a B-tree lookup on `UNIQUE(facet_config_id, slug)`. Step 2b is a pure in-memory operation. Results cached per request.

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
  tag_handles       text[] DEFAULT '{}',   -- tag handles (project-wide unique), e.g., {'sale', 'new-arrival'}
  feature_slugs     text[] DEFAULT '{}',  -- composite 'feature_slug:value_slug', e.g., {'material:cotton', 'brand:nike'}
  option_slugs      text[] DEFAULT '{}',  -- composite 'option_slug:value_slug', e.g., {'color:red', 'size:xl'}
  category_handles  text[] DEFAULT '{}',  -- category handles (project-wide unique), e.g., {'shoes', 'running'}
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
)
```

Indexes: GIN on arrays, B-tree on price/stock/status/created_at, plus:

```sql
CREATE INDEX idx_product_search_index_project_status
  ON catalog.product_search_index (project_id, status);
```

### Slug → composite handle lookup (for storefront filter inputs)

Both the search index and facet config store **slugs/handles** (not UUIDs). The search index stores composite slugs (`option_slug:value_slug`), and facet config maps display slugs to source composite handles via `facet_config_value.source_handles`.

Storefront passes facet filters via the unified `ProductFiltersInput.facets` field as `facetSlug:valueSlug` strings. Resolution is through facet config (see §3.4):
1. `facet_config.slug` → `facet_type`, `source_handle`, `filter_logic`
2. Either `facet_config_value.source_handles` (configured values) or derive composite directly (shortcut)
3. Query the appropriate `product_search_index` array column (`tag_handles`, `feature_slugs`, `option_slugs`)

For unconfigured values (no `facet_config_value` row), the composite can be derived without any DB lookup: `source_handle + ':' + valueSlug` for option/feature, or `valueSlug` directly for tags. See §3.4 for details.

### Sync flow

`SyncProductIndexScript` runs on productCreated/Updated/Deleted events:
1. Load product + categories → collect `category.handle` values → `category_handles`
2. Load product tags → collect `tag.handle` values → `tag_handles`
3. Load product options + values → build `option.slug + ':' + optionValue.slug` composites → `option_slugs`
4. Load product features + values → build `feature.slug + ':' + featureValue.slug` composites → `feature_slugs`
5. Load prices (local)
6. Broker call `inventory.getOffers` for stock
7. UPSERT into `product_search_index` with slug/handle arrays

No translation data is synced — the index contains only structured/numeric fields and slugs/handles.

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

For a given product set (from category or collection).

**Note on category:** `category_handles` is stored in `product_search_index` for collection rule evaluation (e.g., "all products in category X"), but category is **not** a facet type. Categories are a navigation axis, not a filterable attribute on PLPs. `FacetType` enum is `PRICE | TAG | FEATURE | OPTION | IN_STOCK` — no `CATEGORY`. The `category_handles` array is not unnested during facet aggregation.

Three key concerns:

1. **Stable facet/value list** — derived from the base product set (category/collection without user filters). The list of facets and their values does not change when filters change; only counts update.
2. **Facet isolation** — depends on `filter_logic`:
   - **OR mode** (default): counts for each facet are computed **without** that facet's entire filter applied (but with all other facet filters). This lets the user see sibling values and switch between them. Standard e-commerce pattern.
   - **AND mode**: counts are computed **per-value** — the tested value is removed from the AND set, but other selected values in the same facet remain. This shows "how many items match if I add/remove this specific value?"
3. **Merged values** — when `facet_config_value.source_handles` contains multiple entries, their counts must be summed into a single display value.

#### 5.3.1 Single-query approach with boolean filter columns

Instead of N+1 separate queries, compute boolean "passes filter" columns per facet on each product row, then use `FILTER (WHERE ...)` on aggregates. One scan of the product set, one unnest pass per array type.

**Step 1: Base CTE with per-facet boolean columns (no user filters)**

The shape of boolean columns depends on the facet's `filter_logic`:

- **OR facets** → one boolean per facet (`passes_color`). Isolation = drop the whole boolean.
- **AND facets** → one boolean **per selected value** (`passes_tags_sale`, `passes_tags_new_arrival`). Isolation = drop only the value being counted, keep the rest.

```sql
-- Example: user selected Color=[Red, Blue] (OR mode), Tags=[Sale, New-Arrival] (AND mode),
-- price $10–$50, in_stock=true.

WITH base_all AS (
  SELECT
    psi.product_id,
    psi.tag_handles,
    psi.feature_slugs,
    psi.option_slugs,
    psi.min_price_minor,
    psi.max_price_minor,
    psi.in_stock,
  FROM product_search_index psi
  JOIN product_category pc ON pc.product_id = psi.product_id
  WHERE pc.category_id = :categoryId
    AND psi.status = 'active'
),
base AS (
  SELECT
    base_all.*,

    -- OR-mode facet: one boolean for the whole facet.
    -- Isolation = drop this entire boolean.
    (base_all.option_slugs && ARRAY['color:red','color:blue']::text[])   AS passes_color,

    -- AND-mode facet: one boolean PER selected value.
    -- Isolation for value X = drop passes_tags_X, keep other passes_tags_*.
    (base_all.tag_handles @> ARRAY['sale']::text[])                       AS passes_tags_sale,
    (base_all.tag_handles @> ARRAY['new-arrival']::text[])                AS passes_tags_new_arrival,

    -- Price and in_stock:
    -- Range overlap — product is included if ANY variant's price intersects
    -- the requested range. To filter by cheapest variant only, use min_price_minor for both bounds.
    (
      (:priceMin IS NULL OR base_all.max_price_minor >= :priceMin)
      AND (:priceMax IS NULL OR base_all.min_price_minor <= :priceMax)
    ) AS passes_price,
    (:inStock IS NULL OR base_all.in_stock = :inStock)                    AS passes_in_stock
  FROM base_all
)
```

`base_all` defines the stable universe (no user filters). `base` adds boolean filter columns for counts, but does not filter rows. This guarantees that the facet and value lists are stable, while counts change with filters. Product list queries still apply user filters in their own WHERE clauses.

**Step 2: Aggregation with facet isolation via FILTER**

```sql
-- All facet value counts in one query, each facet excludes only its own filter.
-- Active filters: Color=[Red,Blue] (OR), Tags=[Sale,New-Arrival] (AND).
-- Boolean columns from Step 1: passes_color, passes_tags_sale, passes_tags_new_arrival,
-- passes_price, passes_in_stock.

-- UNION ALL of all three array types (option, feature, tag) into a single unnested stream:
WITH unnested AS (
  -- Options
  SELECT b.product_id,
         b.passes_color, b.passes_tags_sale, b.passes_tags_new_arrival,
         b.passes_price, b.passes_in_stock,
         sv.slug AS sv_slug, 'option' AS facet_type
  FROM base b, unnest(b.option_slugs) AS sv(slug)
  
  UNION ALL
  
  -- Features
  SELECT b.product_id,
         b.passes_color, b.passes_tags_sale, b.passes_tags_new_arrival,
         b.passes_price, b.passes_in_stock,
         sv.slug AS sv_slug, 'feature' AS facet_type
  FROM base b, unnest(b.feature_slugs) AS sv(slug)
  
  UNION ALL
  
  -- Tags
  SELECT b.product_id,
         b.passes_color, b.passes_tags_sale, b.passes_tags_new_arrival,
         b.passes_price, b.passes_in_stock,
         sv.slug AS sv_slug, 'tag' AS facet_type
  FROM base b, unnest(b.tag_handles) AS sv(slug)
)
-- LEFT JOIN to facet_config_value: configured values get merged/labeled,
-- unconfigured values (fcv.id IS NULL) fall through with raw sv_slug.
SELECT
  COALESCE(fcv.facet_config_id, fc.id) AS facet_config_id,
  fcv.id AS display_value_id,      -- NULL for unconfigured values
  u.sv_slug,                        -- raw slug (used as fallback grouping key when fcv.id IS NULL)

  -- ── OR-mode facet (Color): drop entire passes_color ──
  COUNT(DISTINCT u.product_id)
    FILTER (WHERE u.passes_tags_sale AND u.passes_tags_new_arrival
                  AND u.passes_price AND u.passes_in_stock)         AS cnt_color_facet,
    -- ^ All filters EXCEPT color. User can see Red(45), Blue(30), Green(12).

  -- ── AND-mode facet (Tags): drop only the tested value's boolean ──
  -- Count for "Sale": drop passes_tags_sale, keep passes_tags_new_arrival.
  -- Shows: "if I toggle Sale off, how many items still match New-Arrival + other filters?"
  -- For an unselected value like "Clearance": keep ALL passes_tags_*, add Clearance check.
  -- Shows: "if I add Clearance, how many items match Sale AND New-Arrival AND Clearance?"
  COUNT(DISTINCT u.product_id)
    FILTER (WHERE u.passes_color AND u.passes_tags_new_arrival
                  AND u.passes_price AND u.passes_in_stock)         AS cnt_tags_excl_sale,
    -- ^ Tags facet, counting "sale" value: drop passes_tags_sale only

  COUNT(DISTINCT u.product_id)
    FILTER (WHERE u.passes_color AND u.passes_tags_sale
                  AND u.passes_price AND u.passes_in_stock)         AS cnt_tags_excl_new_arrival
    -- ^ Tags facet, counting "new-arrival" value: drop passes_tags_new_arrival only

  -- For unselected tag values (e.g., "clearance"), the count column keeps ALL
  -- passes_tags_* booleans (sale AND new_arrival) — no isolation needed because
  -- the value is not yet selected. The count answers "how many if I add this?"

FROM unnested u
-- Resolve facet_config for this slug's facet_type + source_handle:
JOIN facet_config fc
  ON fc.project_id = :projectId
  AND fc.facet_type = u.facet_type
  AND (
    -- For option/feature: source_handle matches the prefix before ':'
    (u.facet_type IN ('option', 'feature') AND fc.source_handle = split_part(u.sv_slug, ':', 1))
    -- For tag: source_handle is NULL
    OR (u.facet_type = 'tag' AND fc.source_handle IS NULL)
  )
-- LEFT JOIN: unconfigured values still appear (fcv.id will be NULL)
LEFT JOIN facet_config_value fcv
  ON u.sv_slug = ANY(fcv.source_handles)
  AND fcv.facet_config_id = fc.id
  AND fcv.enabled = true
GROUP BY COALESCE(fcv.facet_config_id, fc.id), fcv.id, u.sv_slug
```

**Isolation rules (generated dynamically by app):**

| filter_logic | Isolation strategy | FILTER clause for value V in facet F |
|---|---|---|
| **OR** | Drop entire facet | AND together all `passes_X` **except** `passes_F` |
| **AND** | Drop only tested value | AND together all `passes_X` **except** `passes_F_V` (keep other `passes_F_*`) |

For **AND-mode unselected values** (value not yet in the active filter): keep ALL `passes_F_*` booleans — no isolation needed. The count shows "how many items match current AND selection PLUS this new value?"

For **AND-mode selected values**: drop only that value's boolean. The count shows "how many items still match if I remove this value?"

The app generates one `COUNT(DISTINCT ...) FILTER (WHERE ...)` column per AND-mode selected value. For OR-mode facets, one column covers all values in that facet.

**Unconfigured values:** When `fcv.id IS NULL` (no `facet_config_value` row), the app groups by raw `sv_slug` instead. The display label comes from source translation tables (option_value, feature_value, or tag). The value slug is derived from `sv_slug` (strip the prefix for option/feature, use directly for tag).

**Step 3: Price range, in-stock count, and total (with facet isolation)**

Price range is computed **without** the price filter (facet isolation), so the slider
always shows the full available range for the current selection. In-stock count is
computed **without** the in_stock filter, so the toggle shows how many items are
available. Total count uses all filters.

```sql
SELECT
  -- Price range: exclude passes_price (isolation), keep all other filters
  MIN(min_price_minor) FILTER (WHERE passes_color AND passes_tags_sale AND passes_tags_new_arrival AND passes_in_stock) AS price_min,
  MAX(max_price_minor) FILTER (WHERE passes_color AND passes_tags_sale AND passes_tags_new_arrival AND passes_in_stock) AS price_max,
  -- In-stock count: exclude passes_in_stock (isolation), keep all other filters
  COUNT(*)             FILTER (WHERE passes_color AND passes_tags_sale AND passes_tags_new_arrival AND passes_price) AS in_stock_count,
  -- Total count: all filters applied (no isolation — this is the result count)
  COUNT(*)             FILTER (WHERE passes_color AND passes_tags_sale AND passes_tags_new_arrival AND passes_price AND passes_in_stock) AS total_count
FROM base
```

Note: AND-mode facets contribute **all** their per-value booleans to other facets' FILTER clauses (no isolation for other facets — only within the AND facet itself).

**Why this works:**
- Single sequential scan of `product_search_index` (base CTE materialized once)
- `FILTER (WHERE ...)` is a Postgres aggregate clause — no subqueries, no extra scans
- OR-mode isolation: omit one boolean per facet from the FILTER conjunction
- AND-mode isolation: omit one boolean per selected value — more COUNT columns, but same single scan
- When no facet filters are active, all `passes_X` columns are absent and FILTER clauses are omitted — degenerates to plain `COUNT(*)`
- Cost: OR facets add 1 boolean column + 1 COUNT column each; AND facets add N boolean columns + N COUNT columns (N = number of selected values). In practice N is small (users rarely AND more than 3–5 values)

#### 5.3.2 Merged value deduplication

`LEFT JOIN facet_config_value fcv ON sv_slug = ANY(fcv.source_handles)` with `COUNT(DISTINCT product_id)` handles merged values automatically. When "Red" (`color:red`) and "Crimson" (`color:crimson`) both map to the same `fcv.id`, a product with both slugs in its array produces two unnest rows, but `COUNT(DISTINCT product_id)` counts it once.

For **unconfigured values** (no `facet_config_value` row), the LEFT JOIN produces `fcv.id IS NULL`. The app groups these rows by raw `sv_slug` instead of `fcv.id`, using the source slug as both the grouping key and the display slug (stripping the prefix for option/feature, using directly for tag). Labels come from source translation tables.

#### 5.3.3 Assembly

The aggregated data is assembled using the project's `facet_config`:
- Which facets to include (only those defined in `facet_config`)
- Order and grouping (via `facet_group`)
- UI type, selection mode, filter logic
- Facet inclusion is decided from the base set (no user filters): hide a facet only if the base set has fewer distinct values than `min_values`
- Value lists are also derived from the base set and remain stable; values with `count = 0` stay in the list (typically rendered disabled)
- Value count limits (`max_values_visible`)
- Labels from `facet_config_value_translation` (priority 1) or source translation (priority 2)
- Slugs from `facet_config.slug` and `facet_config_value.slug` (for `FacetResult.slug` and `FacetValue.slug`)

---

## 6. File Structure — New & Modified

### New files

```
src/repositories/models/
  searchIndex.ts                        # product_search_index
  collection.ts                         # collection, collection_item, collection_rule, collection_translation, collection_media
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

src/api/graphql-admin/schema/
  collection.graphql
  facet.graphql
```

### Modified files

```
src/repositories/models/index.ts           # export new model files
src/repositories/models/categories.ts      # add lexo_rank to product_category; add default_sort to category
src/repositories/models/features.ts        # add slug to product_feature and product_feature_value
src/repositories/models/seo.ts             # add category_seo, collection_seo (same structure as product_seo)
src/repositories/Repository.ts             # add new repositories
src/loaders/Loader.ts                      # add new loaders
src/handlers/index.ts                      # add search index sync handlers
src/api/graphql-admin/schema/base.graphql  # add collection/facet queries & mutations to CatalogQuery/CatalogMutation
src/api/graphql-admin/schema/category.graphql  # add categoryProducts, defaultSort, seo fields to Category
src/api/graphql-admin/schema/seo.graphql   # add generic Seo/SeoInput types
src/resolvers/admin/CategoryResolver.ts    # add new field resolvers
```

---

## 7. GraphQL Schema

### 7.1 Category extensions (in `category.graphql`)

```graphql
# Add to Category type:
defaultSort: ProductSortBy!
defaultSortDirection: SortDirection!
seo: Seo

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
  seo: Seo
  
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
  """For FEATURE/OPTION: the slug of the option/feature concept (e.g., 'color', 'material'). Null for PRICE, TAG, IN_STOCK."""
  sourceHandle: String
  slug: String!
  label: String!
  uiType: FacetUIType!
  selectionMode: FacetSelectionMode!
  """How selected values combine within this facet: OR (overlap, default) or AND (contains). Ignored for single-select, range, and boolean."""
  filterLogic: FacetFilterLogic!
  sortIndex: Int!
  group: FacetGroup
  minValues: Int!
  maxValuesVisible: Int!
  valueSort: FacetValueSort!
  indexable: Boolean!
}

enum FacetType { PRICE TAG FEATURE OPTION IN_STOCK }
enum FacetUIType { CHECKBOX RADIO DROPDOWN RANGE BOOLEAN }
enum FacetSelectionMode { SINGLE MULTI }
enum FacetFilterLogic { AND OR }
enum FacetValueSort { COUNT ALPHA CUSTOM }

# Inputs:
input FacetGroupCreateInput { name: String!, collapsed: Boolean, sortIndex: Int }
input FacetGroupUpdateInput { id: ID!, name: String, collapsed: Boolean, sortIndex: Int }
input FacetGroupDeleteInput { id: ID! }

input FacetConfigCreateInput { facetType: FacetType!, sourceHandle: String, slug: String!, uiType: FacetUIType, selectionMode: FacetSelectionMode, filterLogic: FacetFilterLogic, groupId: ID, label: String!, sortIndex: Int }
input FacetConfigUpdateInput { id: ID!, slug: String, uiType: FacetUIType, selectionMode: FacetSelectionMode, filterLogic: FacetFilterLogic, groupId: ID, label: String, sortIndex: Int, minValues: Int, maxValuesVisible: Int, valueSort: FacetValueSort, indexable: Boolean }
input FacetConfigDeleteInput { id: ID! }
```

### 7.4 Shared types

```graphql
"""
Generic SEO and Open Graph metadata. Used by Category, Collection, and Product.
Replaces the old per-entity SEO types (ProductSeo is kept as alias for backward compatibility).
Locale is resolved from the request context header — no locale argument on the field.
"""
type Seo {
  seoTitle: String
  seoDescription: String
  ogTitle: String
  ogDescription: String
  ogImage: File
}

input SeoInput {
  seoTitle: String
  seoDescription: String
  ogTitle: String
  ogDescription: String
  ogImageId: ID
}

"""Backward compatibility — existing Product.seo returns this. Same shape as Seo."""
type ProductSeo {
  seoTitle: String
  seoDescription: String
  ogTitle: String
  ogDescription: String
  ogImage: File
}

type CollectionMediaItem {
  file: File!
  sortIndex: Int!
}

enum SortDirection { ASC DESC }

input ProductFiltersInput {
  """
  Unified facet filters. Format: 'facetSlug:valueSlug'.
  Works for ALL discrete facet types (tag, feature, option) — resolved via facet_config.slug + facet_config_value.slug (see §3.4).
  Multiple values for the same facetSlug are combined using the facet's filter_logic (OR/AND).
  Different facetSlugs are always AND-ed together.
  """
  facets: [String!]
  """
  Range facet filters. For numeric/range-type facets (price, or any custom RANGE facet).
  Each entry specifies a facetSlug and min/max bounds.
  Price can also be passed via the shorthand priceMinMinor/priceMaxMinor fields.
  """
  ranges: [FacetRangeFilterInput!]
  """Shorthand for price range filter. Equivalent to ranges: [{ facetSlug: "price", min: X, max: Y }]."""
  priceMinMinor: BigInt
  priceMaxMinor: BigInt
  inStock: Boolean
}

input FacetRangeFilterInput {
  """Slug of the RANGE-type facet (e.g., 'price', 'weight', 'rating')."""
  facetSlug: String!
  min: BigInt
  max: BigInt
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
  """Facet slug — used in filter inputs as the facetSlug part of 'facetSlug:valueSlug'."""
  slug: String!
  label: String!
  uiType: FacetUIType!
  selectionMode: FacetSelectionMode!
  filterLogic: FacetFilterLogic!
  values: [FacetValue!]!
  totalCount: Int!
}

type FacetValue {
  """Value slug — used in filter inputs as the valueSlug part of 'facetSlug:valueSlug'."""
  slug: String!
  label: String
  count: Int!
  """Swatch from ProductOptionSwatch or FacetSwatch. Present for OPTION-type facets when the option value has a swatch, or when facet_config_value has a swatch override."""
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
-- Each rule becomes a WHERE clause.
-- Operator semantics for array fields:
--   'in'       → && (overlap, ANY match)  — product has at least one of the values
--   'all'      → @> (contains, ALL match) — product has all of the values
--   'nin'      → NOT && (no overlap)      — product has none of the values
--   'contains' → && (overlap)             — alias for 'in' on array fields

-- { field: "tag", operator: "in", value: ["sale", "new-arrival"] }
--   → psi.tag_handles && ARRAY['sale','new-arrival']::text[]
--     (product has "sale" OR "new-arrival" — any match)

-- { field: "tag", operator: "all", value: ["sale", "new-arrival"] }
--   → psi.tag_handles @> ARRAY['sale','new-arrival']::text[]
--     (product has BOTH "sale" AND "new-arrival")

-- { field: "price", operator: "between", value: [1000, 5000] }
--   → psi.max_price_minor >= 1000 AND psi.min_price_minor <= 5000
--     (range overlap — product is included if ANY variant's price intersects [1000, 5000].
--      Same semantics as storefront price filter, see §5.3.1 Step 1.)

-- { field: "in_stock", operator: "eq", value: true }
--   → psi.in_stock = true

-- { field: "feature", operator: "in", value: ["material:cotton", "material:linen"] }
--   → psi.feature_slugs && ARRAY['material:cotton', 'material:linen']::text[]
--     (composite slug used directly — no facet_config_value lookup needed)

-- { field: "option", operator: "in", value: ["color:red", "color:blue"] }
--   → psi.option_slugs && ARRAY['color:red', 'color:blue']::text[]

-- { field: "category", operator: "in", value: ["shoes", "running"] }
--   → psi.category_handles && ARRAY['shoes', 'running']::text[]

-- All rules AND-ed together
```

Rule `value` fields store handles/slugs (not UUIDs): tag handles, composite option/feature slugs, category handles.

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

### Phase 0: Slug Infrastructure

`product_option` and `product_option_value` already have `slug` columns. `category` and `tag` already have `handle` columns. Only features need slugs added.

**Current `product_feature` columns:** `id`, `project_id`, `product_id`, `index` (int[]), `is_group`, `parent_id`. No slug.
**Current `product_feature_value` columns:** `id`, `project_id`, `feature_id`, `index` (int). No slug.

1. **Add `slug` column to `product_feature`:**
   ```sql
   ALTER TABLE catalog.product_feature
     ADD COLUMN slug varchar(255) NOT NULL;
   CREATE UNIQUE INDEX product_feature_product_id_slug_uniq
     ON catalog.product_feature (product_id, slug);
   ```
   Same pattern as `product_option.slug` — unique per product.

2. **Add `slug` column to `product_feature_value`:**
   ```sql
   ALTER TABLE catalog.product_feature_value
     ADD COLUMN slug varchar(255) NOT NULL;
   CREATE UNIQUE INDEX product_feature_value_feature_id_slug_uniq
     ON catalog.product_feature_value (feature_id, slug);
   ```
   Same pattern as `product_option_value.slug` — unique per feature.

3. **Add slug validation utility** — shared helper to validate slug format (`^[a-z0-9]([a-z0-9-]*[a-z0-9])?$`). Note: regex allows single-char slugs (e.g., "s", "m", "l" for sizes).

4. **Backfill existing feature slugs** — migration script:
   - Source: `product_feature_translation.name` / `product_feature_value_translation.name` for the project's default locale
   - Transliterate to ASCII, lowercase, replace spaces/special chars with hyphens
   - **Collision handling:** append `-2`, `-3`, etc. within the same parent scope
   - Run as a one-time data migration after the schema migration

5. **Update Drizzle models** — add `slug` to `productFeature` and `productFeatureValue` in `src/repositories/models/features.ts`

6. **Update feature CRUD scripts** — require `slug` on create, allow update. Validate format and uniqueness.

7. **Generate & apply migration**

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
