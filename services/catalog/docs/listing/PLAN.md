# Catalog: Categories, Collections & Facets — Implementation Plan

## Overview

Three distinct domain concepts, all inside the **catalog** service:

| Concept | Role | Managed by |
|---------|------|------------|
| **Category** | Stable taxonomy, navigation skeleton, SEO pages | Content managers |
| **Collection** | Merchandising product groupings (manual / rule-based) | Merchandisers, marketers |
| **Facet** | Facet display configuration (groups, order, UI types, labels) — per project | Catalog admins |

Products are assigned to categories explicitly (by humans, bulk ops, or import).
Collections assemble products by rules or manual picks.
Facets on a collection PLP are computed on-the-fly from products present, rendered according to project-level facet setup.

**Scope (Phase 1):** PostgreSQL only. No Typesense, no full-text search, no algorithmic collections.

**Important (listing correctness):** filters split into:
- **Product-level** constraints (fast, `catalog.product_search_index`): `TAG/FEATURE/STATUS`.
- **Variant-level** constraints (correct for option combinations, `catalog.variant_search_index`): `OPTION`, `price`, `in_stock`.

`CATEGORY` is not a storefront facet/filter on category PLPs; it is used as navigation context and as a rule field for rule-based collections.

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
--   ADD CONSTRAINT category_id_project_uniq UNIQUE (id, project_id)
```

Values: `'manual'`, `'price'`, `'newest'`, `'name'`

### 1.3 Category SEO

New table, same structure as `product_seo`:

```sql
catalog.category_seo (
  category_id       uuid NOT NULL,
  locale            varchar(8) NOT NULL,
  project_id        uuid NOT NULL,
  
  -- SEO fields (for search engines)
  seo_title         varchar(70),
  seo_description   varchar(160),
  
  -- Open Graph fields (for social media)
  og_title          varchar(95),
  og_description    text,
  og_image_id       uuid,
  
  PRIMARY KEY (category_id, locale, project_id),
  FOREIGN KEY (category_id, project_id)
    REFERENCES catalog.category(id, project_id)
    ON DELETE CASCADE
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
  default_sort_direction varchar(4) NOT NULL DEFAULT 'asc',
  
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
  
  UNIQUE(id, project_id),
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
  collection_id     uuid NOT NULL,
  locale            varchar(8) NOT NULL,
  project_id        uuid NOT NULL,
  name              text NOT NULL,
  description_text  text,
  description_html  text,
  description_json  text,
  PRIMARY KEY (collection_id, locale, project_id),
  FOREIGN KEY (collection_id, project_id)
    REFERENCES catalog.collection(id, project_id)
    ON DELETE CASCADE
)
CREATE INDEX idx_collection_translation_project_locale
  ON catalog.collection_translation (project_id, locale);
```

```sql
catalog.collection_seo (
  collection_id     uuid NOT NULL,
  locale            varchar(8) NOT NULL,
  project_id        uuid NOT NULL,
  
  -- SEO fields (for search engines)
  seo_title         varchar(70),
  seo_description   varchar(160),
  
  -- Open Graph fields (for social media)
  og_title          varchar(95),
  og_description    text,
  og_image_id       uuid,
  
  PRIMARY KEY (collection_id, locale, project_id),
  FOREIGN KEY (collection_id, project_id)
    REFERENCES catalog.collection(id, project_id)
    ON DELETE CASCADE
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
  field             varchar(64) NOT NULL,   -- 'tag', 'price', 'option', 'feature', 'in_stock', 'category', 'status', 'created_at'
  operator          varchar(16) NOT NULL,   -- 'eq', 'gt', 'gte', 'lt', 'lte', 'in', 'all', 'contains', 'between'
  value             jsonb NOT NULL,          -- scalar or array depending on operator
  sort_index        int NOT NULL DEFAULT 0,  -- for stable UI display order (rules are AND-ed, order is semantically irrelevant)
  
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  
  -- Rules within a collection are AND-ed by default
  -- Future: rule_group for OR groups
)

CREATE INDEX idx_collection_rule_collection ON catalog.collection_rule(collection_id);
```

**Rule groups:**
- `product-level`: `tag`, `feature`, `category`, `status`, `created_at`
- `variant-level`: `option`, `price`, `in_stock`

**Examples:**
```json
{ "field": "tag", "operator": "in", "value": ["sale", "new-arrival"] }
{ "field": "price", "operator": "between", "value": [1000, 5000] }
{ "field": "in_stock", "operator": "eq", "value": true }
{ "field": "feature", "operator": "contains", "value": "cotton" }
{ "field": "category", "operator": "in", "value": ["shoes", "running"] }
```

Rules are evaluated against `product_search_index`, with variant-correct predicates (`option`, `price`, `in_stock`) resolved via `variant_search_index`.

**Rule evaluation contract (normative):**
- Product-level fields (`tag`, `feature`, `category`, `status`, `created_at`) are evaluated on `product_search_index`.
- Variant-bound fields (`option`, `price`, `in_stock`) MUST be compiled into a single `EXISTS` over `variant_search_index`.
- Independent `EXISTS` blocks per variant-bound rule are forbidden because they can match different variants of the same product and produce false positives.
- Authoritative SQL semantics are defined in §9.

---

## 3. Facets (project-level)

### 3.1 Core idea

Facet setup defines **what** facets and values are allowed on PLPs, plus how they are displayed. Product data is used only for counts. The setup controls:

- Which facets to show and in what order
- Grouping (e.g., "Main filters", "Material & Care")
- UI type per facet (multi-select checkboxes, single-select, range slider, boolean toggle, color swatches)
- Label overrides and value sort order
- Which values are exposed (enabled `facet_value` only)
- Display rules (min distinct values to show, collapse threshold)
- Facet list comes from `facet`; value list comes from enabled `facet_value`; counts are computed from the base product set and update as filters change

Raw option/feature/tag values from products are never returned to the storefront; only configured `facet_value` entries are exposed.

Setup is per-project — one flat list of facet groups and facets per project.

### 3.2 Database schema

```sql
catalog.facet_group (
  id                uuid PRIMARY KEY,
  project_id        uuid NOT NULL,
  sort_index        int NOT NULL DEFAULT 0,
  collapsed         boolean NOT NULL DEFAULT false,  -- render collapsed by default
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(id, project_id),
  UNIQUE(project_id, sort_index) DEFERRABLE INITIALLY DEFERRED
)

catalog.facet_group_translation (
  group_id          uuid NOT NULL,
  locale            varchar(8) NOT NULL,
  project_id        uuid NOT NULL,
  name              text NOT NULL,
  PRIMARY KEY (group_id, locale, project_id),
  FOREIGN KEY (group_id, project_id)
    REFERENCES catalog.facet_group(id, project_id)
    ON DELETE CASCADE
)
CREATE INDEX idx_facet_group_translation_project_locale
  ON catalog.facet_group_translation (project_id, locale);
```

```sql
catalog.facet (
  id                uuid PRIMARY KEY,
  project_id        uuid NOT NULL,
  group_id          uuid,
  
  -- What product attribute this maps to
  facet_type        varchar(32) NOT NULL,  -- 'price', 'tag', 'feature', 'option', 'in_stock'
  
  -- Display & selection behavior
  ui_type           varchar(16) NOT NULL DEFAULT 'checkbox',  -- 'checkbox' | 'radio' | 'dropdown' | 'range' | 'boolean'
  selection_mode    varchar(16) NOT NULL DEFAULT 'multi',     -- 'single' | 'multi'
  sort_index        int NOT NULL DEFAULT 0,
  
  -- Multi-select facets always use OR (overlap) across selected values.
  -- Ignored when selection_mode = 'single' (only one value, no logic needed).
  -- Between different facets — filters are combined with AND.
  --
  -- ui_type behavior:
  -- | ui_type    | selection_mode | Notes                               |
  -- |------------|----------------|-------------------------------------|
  -- | checkbox   | multi          | Uses OR (overlap)                   |
  -- | checkbox   | single         | Exact match on single value         |
  -- | radio      | single         | Exact match on single value         |
  -- | dropdown   | single         | Exact match on single value         |
  -- | dropdown   | multi          | Uses OR (overlap)                   |
  -- | range      | —              | BETWEEN min AND max (numeric only)  |
  -- | boolean    | —              | Exact match (true/false)            |
  --
  -- 'range' and 'boolean' ignore selection_mode.
  --
  -- Swatch: only via facet_value.swatch_id (facet_swatch). No implicit fallback from
  -- product_option_swatch or other source tables.
  
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
  
  UNIQUE(id, project_id),
  FOREIGN KEY (group_id, project_id)
    REFERENCES catalog.facet_group(id, project_id)
    ON DELETE SET NULL,
  UNIQUE(project_id, slug)
)

catalog.facet_translation (
  facet_id          uuid NOT NULL,
  locale            varchar(8) NOT NULL,
  project_id        uuid NOT NULL,
  label             text NOT NULL,                       -- display label override (e.g., "Colour" instead of "color")
  PRIMARY KEY (facet_id, locale, project_id),
  FOREIGN KEY (facet_id, project_id)
    REFERENCES catalog.facet(id, project_id)
    ON DELETE CASCADE
)
CREATE INDEX idx_facet_translation_project_locale
  ON catalog.facet_translation (project_id, locale);
```

`facet_source_handle` is intentionally removed. `facet_value_source_handle` is the only source mapping table in this plan.

---

### 3.3 Facet Values

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

catalog.facet_value (
  id                uuid PRIMARY KEY,
  project_id        uuid NOT NULL,
  facet_id          uuid NOT NULL,
  slug              varchar(255) NOT NULL,           -- app-generated, unique per facet
  swatch_id         uuid REFERENCES catalog.facet_swatch(id) ON DELETE SET NULL,
  sort_index        int NOT NULL DEFAULT 0,
  enabled           boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(id, project_id),
  UNIQUE(id, facet_id, project_id),
  FOREIGN KEY (facet_id, project_id)
    REFERENCES catalog.facet(id, project_id)
    ON DELETE CASCADE,
  UNIQUE(facet_id, slug)
)

catalog.facet_value_source_handle (
  id                uuid PRIMARY KEY,
  project_id        uuid NOT NULL,
  facet_id          uuid NOT NULL,
  facet_value_id    uuid NOT NULL,
  facet_type        varchar(32) NOT NULL, -- denormalized from facet for uniqueness scope
  source_handle     text NOT NULL, -- option/feature composite slug or tag handle
  created_at        timestamptz NOT NULL DEFAULT now(),

  FOREIGN KEY (facet_id, project_id)
    REFERENCES catalog.facet(id, project_id)
    ON DELETE CASCADE,
  FOREIGN KEY (facet_value_id, facet_id, project_id)
    REFERENCES catalog.facet_value(id, facet_id, project_id)
    ON DELETE CASCADE,
  UNIQUE(project_id, facet_id, source_handle), -- one source handle -> one facet value inside facet
  UNIQUE(project_id, facet_type, source_handle), -- one source handle -> one facet for this type
  UNIQUE(facet_value_id, source_handle)
)
CREATE INDEX idx_facet_value_source_handle_project_value
  ON catalog.facet_value_source_handle (project_id, facet_value_id);
CREATE INDEX idx_facet_value_source_handle_project_type_source
  ON catalog.facet_value_source_handle (project_id, facet_type, source_handle);

catalog.facet_value_translation (
  facet_value_id    uuid NOT NULL,
  locale            varchar(8) NOT NULL,
  project_id        uuid NOT NULL,
  label             text NOT NULL,
  PRIMARY KEY (facet_value_id, locale, project_id),
  FOREIGN KEY (facet_value_id, project_id)
    REFERENCES catalog.facet_value(id, project_id)
    ON DELETE CASCADE
)
CREATE INDEX idx_facet_value_translation_project_locale
  ON catalog.facet_value_translation (project_id, locale);
```

**Назначение:**
- `facet_swatch` — визуальный swatch для значения фасета (аналог `product_option_swatch`)
- `facet_value` — настроенное значение: порядок, enabled, swatch
- `facet_value_source_handle` — единственный source mapping (`source_handle -> facet_value`) с DB-level уникальностью:
  - в пределах `project_id + facet_id`
  - и в пределах `project_id + facet_type` (чтобы один source_handle не попадал в два фасета одного типа)
- `facet_value_translation` — display label for storefront (no source fallback)

**Резолюция label и swatch:**

| Приоритет | Label | Swatch |
|-----------|-------|--------|
| 1 | `facet_value_translation` | `facet_swatch` через `facet_value.swatch_id` |

Source translations and product option swatches are not used in storefront responses.

Если `facet_value` не создан — значение не показывается на storefront.

---

### 3.4 Slug Resolution — Stored Slugs, App-Generated

Slugs live on `facet.slug` and `facet_value.slug` — not on translation tables. A facet is one entity regardless of locale: "Цвет", "Color", "Farbe" all share slug `color`. Slug is locale-independent.

#### Why stored slug (not computed)

- **All-language support.** SQL `IMMUTABLE` functions cannot handle CJK, Arabic, Hindi, Thai, Georgian, etc. Slug is provided by the frontend — admin decides the URL-friendly identifier.
- **Locale-independent.** Slug belongs to the entity, not to a translation. One facet = one slug across all locales.
- **DB uniqueness is explicit.** `UNIQUE(project_id, slug)` on `facet`, `UNIQUE(facet_id, slug)` on `facet_value`, plus link-table constraints for source handles.

#### Slug source

Slug is provided by the frontend (admin UI) on create and update. The backend validates format (`^[a-z0-9]([a-z0-9-]*[a-z0-9])?$`) and uniqueness. No auto-generation — the admin is responsible for choosing a meaningful, URL-safe slug.

#### Querying slugs (for API responses)

```sql
-- Facet slugs
SELECT f.id, f.slug, ft.label
FROM facet f
JOIN facet_translation ft ON ft.facet_id = f.id
WHERE f.project_id = :projectId AND ft.locale = :locale;

-- Facet value slugs
SELECT fv.id, fv.slug, fvt.label
FROM facet_value fv
JOIN facet_value_translation fvt ON fvt.facet_value_id = fv.id
WHERE fv.facet_id = :facetId AND fvt.locale = :locale;
```

#### Resolving slug → search index handle (for filter inputs)

Storefront passes `facetSlug:valueSlug` strings via the unified `ProductFiltersInput.facets` field. All facet types (tag, feature, option) use one canonical resolution path through `facet` + `facet_value` + `facet_value_source_handle`:

```sql
-- Resolve (facetSlug, valueSlug) -> (facet_id, facet_type, source_handles)
SELECT
  f.id AS facet_id,
  f.facet_type,
  fv.id AS facet_value_id,
  array_agg(fvsh.source_handle ORDER BY fvsh.source_handle) AS source_handles
FROM facet f
JOIN facet_value fv
  ON fv.facet_id = f.id
  AND fv.project_id = f.project_id
  AND fv.enabled = true
JOIN facet_value_source_handle fvsh
  ON fvsh.facet_value_id = fv.id
  AND fvsh.facet_id = f.id
  AND fvsh.project_id = f.project_id
  AND fvsh.facet_type = f.facet_type
WHERE f.project_id = :projectId
  AND f.slug = :facetSlug
  AND fv.slug = :valueSlug
GROUP BY f.id, f.facet_type, fv.id;
```

`valueSlug` must resolve to an existing enabled `facet_value` row. If no row is found, the filter value is invalid and must be ignored.

`facet_type` determines which index column to query: `TAG` -> `product_search_index.tag_handles`, `FEATURE` -> `product_search_index.feature_slugs`, `OPTION` -> `variant_search_index.option_slugs`. Multi-select facets use CNF: OR inside one facet, AND between facets. Single-select facets use exact match.

Lookup uses `UNIQUE(project_id, slug)` on `facet`, `UNIQUE(facet_id, slug)` on `facet_value`, and indexed join to `facet_value_source_handle` (`project_id + facet_type + source_handle`). Results are cached per request.

---

## 4. Product Search Index

Denormalized **product-level** table for fast queries. Used by category PLPs (product listing), collection rule evaluation, and collection faceted filtering.

**No product name in this index.** Product names are multilingual and live in `product_translation`. Sort-by-name uses a JOIN on `product_translation` at query time (see §5). This avoids duplicating translatable content into the index and keeps the search index language-agnostic — important because the separate search service will have its own index and Typesense already stores per-locale titles for full-text search.

```sql
catalog.product_search_index (
  project_id        uuid NOT NULL,
  product_id        uuid PRIMARY KEY REFERENCES catalog.product(id) ON DELETE CASCADE,
  status            varchar(16) NOT NULL DEFAULT 'draft',
  tag_handles       text[] DEFAULT '{}',   -- tag handles (project-wide unique), e.g., {'sale', 'new-arrival'}
  feature_slugs     text[] DEFAULT '{}',  -- composite 'feature_slug:value_slug', e.g., {'material:cotton', 'brand:nike'}
  category_handles  text[] DEFAULT '{}',  -- category handles (project-wide unique), e.g., {'shoes', 'running'}
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
)
```

Indexes: GIN on arrays, B-tree on status/created_at, plus:

```sql
CREATE INDEX idx_product_search_index_project_status
  ON catalog.product_search_index (project_id, status);
```

### Variant Search Index (for OPTION + variant-bound filters)

Denormalized **variant-level** table for correct option combination filtering and variant-bound facets.

```sql
catalog.variant_search_index (
  project_id        uuid NOT NULL,
  variant_id        uuid PRIMARY KEY REFERENCES catalog.product_variant(id) ON DELETE CASCADE,
  product_id        uuid NOT NULL REFERENCES catalog.product(id) ON DELETE CASCADE,
  price_minor       bigint,
  in_stock          boolean NOT NULL DEFAULT false,
  total_stock       int NOT NULL DEFAULT 0,
  option_slugs      text[] DEFAULT '{}',  -- composite 'option_slug:value_slug', e.g., {'color:red', 'size:42'}
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
)
```

Indexes:

```sql
CREATE INDEX idx_variant_search_index_project_product
  ON catalog.variant_search_index (project_id, product_id);

CREATE INDEX idx_variant_search_index_project_in_stock
  ON catalog.variant_search_index (project_id, in_stock);

CREATE INDEX idx_variant_search_index_project_price
  ON catalog.variant_search_index (project_id, price_minor);

CREATE INDEX idx_variant_search_index_option_slugs_gin
  ON catalog.variant_search_index USING GIN (option_slugs);
```

### Slug → composite handle lookup (for storefront filter inputs)

Both the search index and facets store **slugs/handles** (not UUIDs). The variant search index stores composite slugs (`option_slug:value_slug`) for options, and facets map display slugs to source composite handles via `facet_value_source_handle`.

Storefront passes facet filters via the unified `ProductFiltersInput.facets` field as `facetSlug:valueSlug` strings. Resolution is through facets (see §3.4):
1. `facet.slug` -> `facet_type`
2. `facet_value.slug` -> rows in `facet_value_source_handle` (configured values only)
3. Query the appropriate index column:
   - `TAG` -> `product_search_index.tag_handles`
   - `FEATURE` -> `product_search_index.feature_slugs`
   - `OPTION` -> `variant_search_index.option_slugs`

`CATEGORY` is intentionally excluded from storefront facet filters in Phase 1.

Unconfigured values are not allowed for storefront filtering. If a `valueSlug` has no matching `facet_value` row, the filter value is ignored.

### Sync flow

`SyncProductIndexScript` runs on productCreated/Updated/Deleted events:
1. Load product + categories → collect `category.handle` values → `category_handles`
2. Load product tags → collect `tag.handle` values → `tag_handles`
3. Load product features + values → build `feature.slug + ':' + featureValue.slug` composites → `feature_slugs`
4. Load prices (local)
5. UPSERT into `product_search_index` with slug/handle arrays

No translation data is synced — the index contains only structured/numeric fields and slugs/handles.

`SyncVariantIndexScript` runs on variantCreated/Updated/Deleted, priceChanged, inventoryChanged (and any event that affects option values):
1. Load variant + parent product_id
2. Load variant option values → build `option.slug + ':' + optionValue.slug` composites → `option_slugs`
3. Load variant price (local)
4. Broker call `inventory.getOffers` for stock (variant scoped)
5. UPSERT into `variant_search_index` (1 row per variant)

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
         AND [apply product-level filters: TAG/FEATURE]
         AND [apply variant-level filters via EXISTS on variant_search_index when OPTION and/or PRICE and/or in_stock filters are present]
  3. Apply sort:
       'manual' → ORDER BY pc.lexo_rank
       'price'  → ORDER BY min matched variant price (see note below)
       'newest' → ORDER BY psi.created_at DESC
       'name'   → LEFT JOIN product_translation pt
                     ON pt.product_id = psi.product_id AND pt.locale = :locale
                   ORDER BY pt.title
  4. Paginate (Relay cursor)
  5. Compute facet aggregations (see 5.3)
  6. Return { products, facets, totalCount, pageInfo }
```

The `name` sort JOINs `product_translation` using the request locale. The `product_translation` table has a composite PK `(product_id, locale)` so the join is index-only. LEFT JOIN ensures products without a translation for the requested locale still appear (sorted last via `NULLS LAST`).

**Variant filter semantics (Category PLP):**
- `TAG/FEATURE/STATUS` remain product-level (on `product_search_index`).
- `OPTION`, `price`, and `in_stock` filters must be variant-correct:
  - Apply as `EXISTS (SELECT 1 FROM variant_search_index vsi WHERE vsi.project_id = psi.project_id AND vsi.product_id = psi.product_id AND [variant predicates])`.
  - All active variant predicates (`OPTION`, `price`, `in_stock`) must be inside the same EXISTS.

**Price sort semantics (Category PLP):**
- Define `sort_price_minor` as the MIN(`vsi.price_minor`) among variants that pass active variant predicates (CTE `min_price_per_product`) and order by that.

### 5.2 Collection PLP

```
QueryCollectionProductsScript:
  Input: { collectionId, locale, filters?, sort?, pagination }
  
  1. Load collection → type, rules, default_sort
  2. Check scheduling (effective_from/effective_to)
  2.1 For both manual and rule collections, products are restricted to `psi.status = 'active'`.
  3. Resolve product set by type:
     
     manual:
       SELECT ci.product_id
       FROM collection_item ci
       JOIN product_search_index psi ON psi.product_id = ci.product_id
       WHERE ci.collection_id = :collectionId
         AND psi.project_id = :projectId
         AND psi.status = 'active'
       ORDER BY ci.lexo_rank
       
     rule:
       Compile rules into:
         - product-level predicates on product_search_index
         - variant-level predicates in ONE EXISTS over variant_search_index
       (single EXISTS is mandatory to avoid cross-variant false positives)
  
  4. Apply facet filters from user
  5. Sort:
       'manual' → ORDER BY ci.lexo_rank
       'price'  → ORDER BY min matched variant price
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
2. **Facet isolation** — counts for each facet are computed **without** that facet's filter applied (but with all other facet filters). This lets the user see sibling values and switch between them. Standard e-commerce pattern.
3. **Merged values** — when one `facet_value` maps to multiple rows in `facet_value_source_handle`, their counts must be merged into one display value.

#### 5.3.1 Single-query approach with boolean filter columns

Instead of N+1 separate queries, keep a single product base scan and:
- compute product-level pass booleans from `product_search_index` (`TAG/FEATURE`)
- compute a **variant pass set** from `variant_search_index` when any variant-scoped filter is active (`OPTION`/`price`/`in_stock`)
- compute `TAG/FEATURE` facet counts off the product base (with the variant pass set applied)
- compute `OPTION` facet counts off the variant index, but return `COUNT(DISTINCT product_id)` so products are not double-counted

**Step 1: Base CTE with per-facet-id boolean columns (no user filters)**

One boolean per active **product-level facet_id** (multi-select uses OR inside facet).

If a facet has **no selected values**, do not create its `passes_*` boolean and do not apply that facet filter in the product query (treat as `TRUE`). Never use `array && '{}'`.

```sql
-- Example: user selected Color=[Red, Blue], Size=[42], Material=[Cotton], Tags=[Sale],
-- price $10–$50, in_stock=true.

WITH base_all AS (
  SELECT
    psi.product_id,
    psi.tag_handles,
    psi.feature_slugs
  FROM product_search_index psi
  JOIN product_category pc ON pc.product_id = psi.product_id
  WHERE psi.project_id = :projectId
    AND pc.category_id = :categoryId
    AND psi.status = 'active'
),
-- Only used when variant filters are active (OPTION, price, in_stock).
-- Materialize once per request to avoid per-product correlated subqueries.
passes_variant_products AS (
  SELECT DISTINCT vsi.product_id
  FROM variant_search_index vsi
  JOIN base_all b ON b.product_id = vsi.product_id
  WHERE vsi.project_id = :projectId
    -- OPTION CNF: OR within each option facet, AND between option facets
    AND (vsi.option_slugs && ARRAY['color:red','color:blue']::text[]) -- Color
    AND (vsi.option_slugs && ARRAY['size:42']::text[])                -- Size
    AND (:priceMin IS NULL OR vsi.price_minor >= :priceMin)
    AND (:priceMax IS NULL OR vsi.price_minor <= :priceMax)
    AND (:inStock IS NULL OR vsi.in_stock = :inStock)
),
base AS (
  SELECT
    base_all.*,

    -- One boolean per active product-level facet_id.
    -- Example aliases are generated from facet IDs in request context.
    (base_all.feature_slugs && ARRAY['material:cotton']::text[])             AS passes_f_feature_material,
    (base_all.tag_handles && ARRAY['sale']::text[])                          AS passes_f_tag_sale,

    -- Variant pass: when variant filters are active, product must have at least one passing variant.
    (NOT :variantFiltersActive OR pvp.product_id IS NOT NULL)                 AS passes_variant
  FROM base_all
  LEFT JOIN passes_variant_products pvp ON pvp.product_id = base_all.product_id
)
```

`base_all` defines the stable universe (no user filters). `base` adds boolean filter columns for counts, but does not filter rows. This guarantees that the facet and value lists are stable, while counts change with filters. When no variant filters are active, `passes_variant` should be treated as `TRUE` (skip `passes_variant_products` entirely).

**Step 2: Aggregation with facet isolation via FILTER**

Counts for each facet are computed with all other filters applied, but **without that exact facet_id predicate**. This keeps sibling values visible even when multiple facets share one type (for example, two `FEATURE` facets).

```sql
WITH unnested AS (
  -- Features
  SELECT b.product_id,
         b.passes_f_feature_material, b.passes_f_tag_sale, b.passes_variant,
         sv.slug AS sv_slug, 'feature' AS facet_type
  FROM base b, unnest(b.feature_slugs) AS sv(slug)

  UNION ALL

  -- Tags
  SELECT b.product_id,
         b.passes_f_feature_material, b.passes_f_tag_sale, b.passes_variant,
         sv.slug AS sv_slug, 'tag' AS facet_type
  FROM base b, unnest(b.tag_handles) AS sv(slug)
),
mapped AS (
  SELECT
    u.product_id,
    u.facet_type,
    f.id AS facet_id,
    fv.id AS facet_value_id,
    fv.slug AS value_slug,
    u.passes_f_feature_material, u.passes_f_tag_sale, u.passes_variant
  FROM unnested u
  -- Canonical source mapping: source_handle -> facet_value -> facet
  JOIN facet_value_source_handle fvsh
    ON fvsh.project_id = :projectId
    AND fvsh.facet_type = u.facet_type
    AND fvsh.source_handle = u.sv_slug
  JOIN facet_value fv
    ON fv.id = fvsh.facet_value_id
    AND fv.facet_id = fvsh.facet_id
    AND fv.enabled = true
  JOIN facet f
    ON f.id = fv.facet_id
    AND f.id = fvsh.facet_id
    AND f.project_id = :projectId
    AND f.facet_type = fvsh.facet_type
),
counts AS (
  SELECT
    m.facet_id,
    m.facet_value_id,
    m.value_slug,
    COUNT(DISTINCT m.product_id)
      FILTER (WHERE
        m.passes_variant
        AND (m.facet_id = :facetId_feature_material OR m.passes_f_feature_material)
        AND (m.facet_id = :facetId_tag_sale OR m.passes_f_tag_sale)
      ) AS cnt
  FROM mapped m
  GROUP BY m.facet_id, m.facet_value_id, m.value_slug
)

SELECT
  facet_id,
  facet_value_id,
  value_slug,
  cnt
FROM counts
```

`FILTER` predicate is generated per request from active facet IDs:
- include all active product-level facet booleans
- for each row's `m.facet_id`, skip only its own boolean via `(m.facet_id = :currentFacetId OR passes_f_<facetId>)`
- never branch only by `facet_type`

**OPTION facet counts (variant-correct):** compute from `variant_search_index`, but return `COUNT(DISTINCT product_id)`.
Facet isolation still applies by `facet_id`: to compute counts for one OPTION facet, omit only that facet's option predicate, but keep:
- all active product-level filters (`TAG/FEATURE/STATUS`)
- all other active OPTION predicates
- variant-bound `price` and `in_stock` predicates

**Configured values only:** counts and value lists are built solely from enabled `facet_value` rows. Any source value without a `facet_value` mapping is ignored.

**Step 3: Price range, in-stock count, and total (with facet isolation)**

Total count uses all active filters.

For correctness with OPTION filters, `PRICE` and `IN_STOCK` aggregations should be computed from `variant_search_index`, scoped to the eligible product set:
- `PRICE` range: exclude the price predicate (facet isolation), keep all other active filters (product-level + OPTION + in_stock).
- `IN_STOCK` count: exclude the in_stock predicate (facet isolation), keep all other active filters (product-level + OPTION + price).

```sql
SELECT
  -- Total count: all filters applied (no isolation — this is the result count)
  COUNT(*) FILTER (WHERE passes_f_feature_material AND passes_f_tag_sale AND passes_variant) AS total_count
FROM base
```

**Why this works:**
- Single sequential scan of `product_search_index` (base CTE materialized once)
- When variant filters are active: one scan of `variant_search_index` to materialize `passes_variant_products`
- `FILTER (WHERE ...)` is a Postgres aggregate clause — no subqueries, no extra scans
- Facet isolation: omit one boolean per facet **ID** from the FILTER conjunction
- When no facet filters are active, all `passes_X` columns are absent and FILTER clauses are omitted — degenerates to plain `COUNT(*)`
- Cost: each facet adds 1 boolean column + 1 COUNT column

#### 5.3.2 Merged value deduplication

Counts are grouped by `facet_value.id` **after** mapping source values to `facet_value`, using `COUNT(DISTINCT product_id)`. This prevents double-counting when a product has multiple source slugs that map to the same display value. Values without a `facet_value` mapping are excluded from results.

#### 5.3.3 Assembly

The aggregated data is assembled using the project's `facet` setup:
- Which facets to include (only those defined in `facet`)
- Order and grouping (via `facet_group`)
- UI type and selection mode
- Facet inclusion is decided from the base set (no user filters): hide a facet only if the base set has fewer distinct configured values with `count > 0` than `min_values`
- Value lists are derived from enabled `facet_value` rows and remain stable; values with `count = 0` stay in the list (typically rendered disabled)
- Value count limits (`max_values_visible`)
- Labels from `facet_value_translation` (no source fallback)
- Slugs from `facet.slug` and `facet_value.slug` (for `FacetResult.slug` and `FacetResultValue.slug`)

---

## 6. File Structure — New & Modified

### New files

```
src/repositories/models/
  searchIndex.ts                        # product_search_index
  variantSearchIndex.ts                 # variant_search_index
  collection.ts                         # collection, collection_item, collection_rule, collection_translation, collection_media
  facet.ts                              # facet_group, facet_group_translation, facet, facet_translation,
                                        # facet_swatch, facet_value, facet_value_source_handle, facet_value_translation

src/repositories/
  listing/SearchIndexRepository.ts      # product_search_index CRUD + TAG/FEATURE facet queries
  listing/VariantSearchIndexRepository.ts # variant_search_index CRUD + OPTION facet queries
  collection/CollectionRepository.ts    # collection CRUD
  collection/CollectionItemRepository.ts # manual items: add/remove/reorder
  collection/CollectionRuleRepository.ts # rules CRUD
  facet/FacetGroupRepository.ts         # facet_group CRUD
  facet/FacetRepository.ts              # facet CRUD
  facet/FacetValueRepository.ts         # facet_value CRUD + translations
  facet/FacetSwatchRepository.ts        # facet_swatch CRUD

src/scripts/
  search-index/
    SyncProductIndexScript.ts
    SyncVariantIndexScript.ts
  
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
    CategoryUpdateSortScript.ts          # update default_sort + default_sort_direction

  facet/
    FacetGroupCreateScript.ts
    FacetGroupUpdateScript.ts
    FacetGroupDeleteScript.ts
    FacetCreateScript.ts
    FacetUpdateScript.ts
    FacetDeleteScript.ts
    FacetValueCreateScript.ts
    FacetValueUpdateScript.ts
    FacetValueDeleteScript.ts
    FacetSwatchCreateScript.ts
    FacetSwatchUpdateScript.ts
    FacetSwatchDeleteScript.ts
    ResolveFacetsScript.ts               # compute facet display from project facets

src/resolvers/admin/
  CollectionResolver.ts
  CollectionQueryResolver.ts
  CollectionMutationResolver.ts
  FacetGroupResolver.ts
  FacetResolver.ts
  FacetValueResolver.ts
  FacetSwatchResolver.ts
  FacetQueryResolver.ts
  FacetMutationResolver.ts

src/loaders/
  CollectionLoader.ts
  FacetGroupLoader.ts
  FacetLoader.ts
  FacetValueLoader.ts
  FacetSwatchLoader.ts

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
src/repositories/translation/TranslationRepository.ts # add category/collection SEO accessors
src/loaders/Loader.ts                      # add new loaders
src/loaders/CategoryLoader.ts              # add categorySeo loader
src/handlers/index.ts                      # add search index sync handlers
src/api/graphql-admin/schema/base.graphql  # add collection/facet queries & mutations to CatalogQuery/CatalogMutation
src/api/graphql-admin/schema/category.graphql  # add categoryProducts, defaultSort, seo fields to Category
src/api/graphql-admin/schema/seo.graphql   # add generic Seo/SeoInput types
src/resolvers/admin/CategoryResolver.ts    # add new field resolvers
src/resolvers/admin/QueryResolver.ts       # wire new collection/facet queries
src/resolvers/admin/MutationResolver.ts    # wire new collection/facet mutations
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

input CategoryMoveProductInput { categoryId: ID!, productId: ID!, afterProductId: ID, beforeProductId: ID }
input CategoryRebalanceInput { categoryId: ID! }
input CategoryUpdateSortInput { id: ID!, defaultSort: ProductSortBy!, defaultSortDirection: SortDirection }

type CategoryMoveProductPayload { category: Category, userErrors: [GenericUserError!]! }
type CategoryRebalancePayload { category: Category, userErrors: [GenericUserError!]! }
type CategoryUpdateSortPayload { category: Category, userErrors: [GenericUserError!]! }

# Add to CategoryCreateInput / CategoryUpdateInput:
#   seo: SeoInput
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
input CollectionCreateInput {
  handle: String
  type: CollectionType!
  name: String!
  description: DescriptionInput
  media: [CollectionMediaInput!]
  seo: SeoInput
  defaultSort: ProductSortBy
  defaultSortDirection: SortDirection
  activeFrom: DateTime
  activeTo: DateTime
  publish: Boolean
}

input CollectionUpdateInput {
  id: ID!
  handle: String
  name: String
  description: DescriptionInput
  media: [CollectionMediaInput!]
  seo: SeoInput
  defaultSort: ProductSortBy
  defaultSortDirection: SortDirection
  activeFrom: DateTime
  activeTo: DateTime
  publish: Boolean
}

input CollectionMediaInput { fileId: ID!, sortIndex: Int }
input CollectionDeleteInput { id: ID! }
input CollectionAddProductsInput { collectionId: ID!, productIds: [ID!]! }
input CollectionRemoveProductsInput { collectionId: ID!, productIds: [ID!]! }
input CollectionMoveProductInput { collectionId: ID!, productId: ID!, afterProductId: ID, beforeProductId: ID }
input CollectionUpdateRulesInput { collectionId: ID!, rules: [CollectionRuleInput!]! }
input CollectionRuleInput { field: String!, operator: String!, value: JSON! }
```

### 7.3 Facets (in `facet.graphql`)

```graphql
type FacetGroup implements Node {
  id: ID!
  name: String!
  sortIndex: Int!
  collapsed: Boolean!
  facets: [Facet!]!
  createdAt: DateTime!
  updatedAt: DateTime!
}

type Facet implements Node {
  id: ID!
  facetType: FacetType!
  """For FEATURE/OPTION: derived from distinct source keys in facet_value_source_handle. Empty for PRICE, TAG, IN_STOCK."""
  sourceHandles: [String!]!
  slug: String!
  label: String!
  uiType: FacetUIType!
  selectionMode: FacetSelectionMode!
  sortIndex: Int!
  group: FacetGroup
  minValues: Int!
  maxValuesVisible: Int!
  valueSort: FacetValueSort!
  indexable: Boolean!
  values: [FacetValue!]!
}

enum FacetType { PRICE TAG FEATURE OPTION IN_STOCK }
enum FacetUIType { CHECKBOX RADIO DROPDOWN RANGE BOOLEAN }
enum FacetSelectionMode { SINGLE MULTI }
enum FacetValueSort { COUNT ALPHA CUSTOM }

type FacetValue implements Node {
  id: ID!
  facet: Facet!
  slug: String!
  label: String!
  sourceHandles: [String!]!
  swatch: FacetSwatch
  sortIndex: Int!
  enabled: Boolean!
}

type FacetSwatch implements Node {
  id: ID!
  swatchType: SwatchType!
  colorOne: String
  colorTwo: String
  file: File
  metadata: JSON
}

# Inputs:
input FacetGroupCreateInput { name: String!, collapsed: Boolean, sortIndex: Int }
input FacetGroupUpdateInput { id: ID!, name: String, collapsed: Boolean, sortIndex: Int }
input FacetGroupDeleteInput { id: ID! }

input FacetCreateInput { facetType: FacetType!, slug: String!, uiType: FacetUIType, selectionMode: FacetSelectionMode, groupId: ID, label: String!, sortIndex: Int }
input FacetUpdateInput { id: ID!, slug: String, uiType: FacetUIType, selectionMode: FacetSelectionMode, groupId: ID, label: String, sortIndex: Int, minValues: Int, maxValuesVisible: Int, valueSort: FacetValueSort, indexable: Boolean }
input FacetDeleteInput { id: ID! }

input FacetValueCreateInput { facetId: ID!, slug: String!, label: String!, sourceHandles: [String!]!, swatchId: ID, sortIndex: Int, enabled: Boolean }
input FacetValueUpdateInput { id: ID!, slug: String, label: String, sourceHandles: [String!], swatchId: ID, sortIndex: Int, enabled: Boolean }
input FacetValueDeleteInput { id: ID! }

input FacetSwatchCreateInput { swatchType: SwatchType!, colorOne: String, colorTwo: String, fileId: ID, metadata: JSON }
input FacetSwatchUpdateInput { id: ID!, swatchType: SwatchType, colorOne: String, colorTwo: String, fileId: ID, metadata: JSON }
input FacetSwatchDeleteInput { id: ID! }

type FacetValueCreatePayload { facetValue: FacetValue, userErrors: [GenericUserError!]! }
type FacetValueUpdatePayload { facetValue: FacetValue, userErrors: [GenericUserError!]! }
type FacetValueDeletePayload { deletedFacetValueId: ID, userErrors: [GenericUserError!]! }

type FacetSwatchCreatePayload { facetSwatch: FacetSwatch, userErrors: [GenericUserError!]! }
type FacetSwatchUpdatePayload { facetSwatch: FacetSwatch, userErrors: [GenericUserError!]! }
type FacetSwatchDeletePayload { deletedFacetSwatchId: ID, userErrors: [GenericUserError!]! }
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
  Works for ALL discrete facet types (tag, feature, option) — resolved via facet.slug + facet_value.slug (see §3.4).
  Multiple values for the same facetSlug are combined using OR (overlap).
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
  values: [FacetResultValue!]!
  totalCount: Int!
}

type FacetResultValue {
  """Value slug — used in filter inputs as the valueSlug part of 'facetSlug:valueSlug'."""
  slug: String!
  label: String
  count: Int!
  """Swatch from FacetSwatch. Present only when facet_value has a swatch override."""
  swatch: FacetSwatch
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

facet(id: ID!): Facet
facets: [Facet!]!

facetValue(id: ID!): FacetValue
facetValues(facetId: ID!): [FacetValue!]!

facetSwatch(id: ID!): FacetSwatch
facetSwatches: [FacetSwatch!]!

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

facetCreate(input: FacetCreateInput!): FacetCreatePayload!
facetUpdate(input: FacetUpdateInput!): FacetUpdatePayload!
facetDelete(input: FacetDeleteInput!): FacetDeletePayload!

facetValueCreate(input: FacetValueCreateInput!): FacetValueCreatePayload!
facetValueUpdate(input: FacetValueUpdateInput!): FacetValueUpdatePayload!
facetValueDelete(input: FacetValueDeleteInput!): FacetValueDeletePayload!

facetSwatchCreate(input: FacetSwatchCreateInput!): FacetSwatchCreatePayload!
facetSwatchUpdate(input: FacetSwatchUpdateInput!): FacetSwatchUpdatePayload!
facetSwatchDelete(input: FacetSwatchDeleteInput!): FacetSwatchDeletePayload!

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

Rules in `collection_rule` are evaluated primarily against `product_search_index`, with variant-correct handling for OPTION, `price`, and `in_stock` via `variant_search_index`:

```sql
-- Compilation model:
-- 1) Product-level predicates are added directly to psi WHERE.
-- 2) All variant-bound predicates are merged into ONE EXISTS block.
--    This guarantees one-and-the-same variant satisfies option/price/in_stock together.
--
-- Product-level fields: tag, feature, category, status, created_at
-- Variant-bound fields: option, price, in_stock
--
-- Independent EXISTS per variant-bound rule is forbidden:
-- it can produce false positives across different variants.
--
-- Counterexample:
--   rule A: option in ['color:red']
--   rule B: price between [1000, 2000]
-- Product has variant V1(color:red, price=5000) and V2(color:blue, price=1500).
-- Two separate EXISTS return true, but no single variant satisfies A and B together.

SELECT psi.product_id
FROM product_search_index psi
WHERE psi.project_id = :projectId
  AND psi.status = 'active'

  -- Product-level rules
  AND (:tagInIsEmpty OR psi.tag_handles && :tagInValues::text[])
  AND (:tagAllIsEmpty OR psi.tag_handles @> :tagAllValues::text[])
  AND (:featureInIsEmpty OR psi.feature_slugs && :featureInValues::text[])
  AND (:statusEq IS NULL OR psi.status = :statusEq)
  AND (:categoryInIsEmpty OR psi.category_handles && :categoryInValues::text[])
  AND (:createdFrom IS NULL OR psi.created_at >= :createdFrom)
  AND (:createdTo   IS NULL OR psi.created_at <  :createdTo)

  -- Variant-bound rules (single EXISTS block, only when at least one is active)
  AND (
    NOT :hasVariantRules
    OR EXISTS (
      SELECT 1
      FROM variant_search_index vsi
      WHERE vsi.project_id = psi.project_id
        AND vsi.product_id = psi.product_id
        AND (:optionInIsEmpty OR vsi.option_slugs && :optionInValues::text[])
        AND (:priceMin IS NULL OR vsi.price_minor >= :priceMin)
        AND (:priceMax IS NULL OR vsi.price_minor <= :priceMax)
        AND (:inStock IS NULL OR vsi.in_stock = :inStock)
    )
  );

-- Operator semantics for array fields:
--   'in'       → && (overlap, ANY match)  — product has at least one of the values
--   'all'      → @> (contains, ALL match) — product has all of the values
--   'contains' → && (overlap)             — alias for 'in' on array fields
--
-- Scalar operator semantics:
--   field=price      : eq, gt, gte, lt, lte, between (on vsi.price_minor)
--   field=created_at : eq, gt, gte, lt, lte, between (on psi.created_at)
--   field=status     : eq (on psi.status)
--   field=in_stock   : eq (on vsi.in_stock)
-- Any unsupported (field, operator) pair must fail validation in CollectionUpdateRulesScript.

-- { field: "tag", operator: "in", value: ["sale", "new-arrival"] }
--   → psi.tag_handles && ARRAY['sale','new-arrival']::text[]
--     (product has "sale" OR "new-arrival" — any match)

-- { field: "tag", operator: "all", value: ["sale", "new-arrival"] }
--   → psi.tag_handles @> ARRAY['sale','new-arrival']::text[]
--     (product has BOTH "sale" AND "new-arrival")

-- { field: "price", operator: "between", value: [1000, 5000] }
--   → inside the shared EXISTS:
--       vsi.price_minor BETWEEN 1000 AND 5000

-- { field: "in_stock", operator: "eq", value: true }
--   → inside the shared EXISTS:
--       vsi.in_stock = true

-- { field: "feature", operator: "in", value: ["material:cotton", "material:linen"] }
--   → psi.feature_slugs && ARRAY['material:cotton', 'material:linen']::text[]
--     (composite slug used directly — no facet_value lookup needed)

-- { field: "option", operator: "in", value: ["color:red", "color:blue"] }
--   → inside the shared EXISTS:
--       vsi.option_slugs && ARRAY['color:red', 'color:blue']::text[]

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

### Rollout Contract (mandatory)

`ProductFiltersInput.facets` (`facetSlug:valueSlug`) must not be exposed until facet mapping is fully operational.

Required atomic rollout slice:
1. DB + models for `facet`, `facet_value`, `facet_value_source_handle`
2. Admin CRUD and data population for facet mappings
3. Runtime resolver `facetSlug:valueSlug -> source_handle[]`
4. Listing query integration using resolved source handles
5. Public GraphQL exposure of `ProductFiltersInput.facets`

Before step 5, keep `facets` behind a feature flag (or omit from public schema).

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
2. **Drizzle models:** `variantSearchIndex.ts` — variant_search_index
3. **Alter `product_category`:** replace `sortIndex` with `lexo_rank`
4. **Alter `category`:** add `default_sort`, `default_sort_direction`
5. **Category SEO:** add `category_seo` model + TranslationRepository + loader/resolver wiring
6. **Generate migration**
7. **SearchIndexRepository** — upsert, delete, base listing predicates
8. **VariantSearchIndexRepository** — upsert, delete, variant predicate helpers
9. **SyncProductIndexScript** — build index row from local data
10. **SyncVariantIndexScript** — upsert per-variant rows from local data + inventory broker
11. **Event handlers**:
    - productCreated/Updated/Deleted → sync `product_search_index`
    - variantCreated/Updated/Deleted, priceChanged, inventoryChanged, optionValueChanged → sync `variant_search_index`
12. **Category product scripts:** QueryCategoryProductsScript, CategoryMoveProductScript, CategoryRebalanceScript, CategoryUpdateSortScript
13. **Listing query foundation:** apply OPTION + `price` + `in_stock` via `variant_search_index` EXISTS/CTE; keep TAG/FEATURE/STATUS product-level
14. **GraphQL:** extend Category type, add category product + sort/SEO mutations
15. **Resolvers & loaders**
16. **Build & test**

### Phase 1B: Facets

1. **Drizzle models:** `facet.ts`
2. **Generate migration**
3. **Facet repositories:** FacetGroupRepository, FacetRepository, FacetValueRepository, FacetSwatchRepository
4. **Facet scripts:** FacetGroup CRUD, Facet CRUD, FacetValue CRUD, FacetSwatch CRUD, ResolveFacetsScript
5. **Listing integration (required before public `filters.facets`):** switch listing facet resolution/counting to configured `facet`/`facet_value` mappings, including `facetSlug:valueSlug -> source_handle[]` resolution
6. **GraphQL:** facet.graphql (FacetValue + FacetSwatch), add to CatalogQuery/CatalogMutation
7. **Resolvers & loaders**
8. **Build & test**

### Phase 1C: Collections

1. **Drizzle models:** `collection.ts`
2. **Generate migration**
3. **Collection repositories:** CollectionRepository, CollectionItemRepository, CollectionRuleRepository
4. **Collection scripts:** CRUD, add/remove/move/rebalance (manual), rules (rule), QueryCollectionProductsScript; implement rule compiler split (`product-level` vs `variant-level`) with single shared `EXISTS` for all variant-level predicates
5. **GraphQL:** collection.graphql (inputs incl. SEO/media), add to CatalogQuery/CatalogMutation
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
