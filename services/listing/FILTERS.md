# Filter Management System

System for managing filter display, grouping, and sorting of facets in the UI.

## Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              ADMIN PANEL                                     │
│                                                                              │
│   ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐         │
│   │  filter_group   │    │  filter_config  │    │filter_value_sort│         │
│   │                 │    │                 │    │                 │         │
│   │ • Grouping      │◄───│ • Filter type   │◄───│ • Sort order    │         │
│   │ • Sorting       │    │ • Display mode  │    │ • Hidden values │         │
│   │ • Collapsing    │    │ • Value sorting │    │                 │         │
│   └─────────────────┘    └─────────────────┘    └─────────────────┘         │
│                                   │                                          │
│                                   │ filter_type + filter_slug                │
│                                   ▼                                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ maps to columns
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         product_search_index                                 │
│                                                                              │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│   │feature_slugs│  │option_slugs │  │  tag_ids    │  │min_price    │        │
│   │             │  │             │  │             │  │             │        │
│   │brand:nike   │  │color:red    │  │[uuid1,      │  │ 1500        │        │
│   │brand:adidas │  │color:blue   │  │ uuid2]      │  │             │        │
│   │material:... │  │size:m       │  │             │  │             │        │
│   └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Concepts

### Two-Layer Architecture

| Layer | Tables | Purpose |
|-------|--------|---------|
| **Data Layer** | `product_search_index` | Stores filterable data (feature_slugs, option_slugs, etc.) |
| **Config Layer** | `filter_group`, `filter_config`, `filter_value_sort` | Defines how to display filters in UI |

### Filter Types

| Type | Slug | PSI Column | SQL Operator | Example |
|------|------|------------|--------------|---------|
| `feature` | `brand` | `feature_slugs` | `&&` (overlap) | `feature_slugs && ARRAY['brand:nike']` |
| `feature` | `material` | `feature_slugs` | `&&` | `feature_slugs && ARRAY['material:leather']` |
| `option` | `color` | `option_slugs` | `&&` | `option_slugs && ARRAY['color:red']` |
| `option` | `size` | `option_slugs` | `&&` | `option_slugs && ARRAY['size:m','size:l']` |
| `tag` | - | `tag_ids` | `&&` | `tag_ids && ARRAY[uuid]::uuid[]` |
| `category` | - | `category_ids` | `&&` | `category_ids && ARRAY[uuid]::uuid[]` |
| `price` | - | `min_price_minor` | `BETWEEN` | `min_price_minor BETWEEN 1000 AND 5000` |
| `stock` | - | `in_stock` | `=` | `in_stock = true` |

### Inheritance

Filter settings are inherited through the category chain:

```
Category "Nike Sneakers"
         │
         │ (if no own settings)
         ▼
Category "Sneakers"
         │
         │ (if no own settings)
         ▼
Category "Footwear"
         │
         │ (if no own settings)
         ▼
Project defaults (category_id = NULL)
```

---

## Database Schema

### filter_group

Filter groups for UI (e.g., "Characteristics", "Variants", "Price").

```sql
CREATE TABLE filter_group (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    -- NULL = project-level defaults
    category_id uuid REFERENCES category(id) ON DELETE CASCADE,

    slug varchar(64) NOT NULL,
    sort_order int NOT NULL DEFAULT 0,
    is_collapsed boolean NOT NULL DEFAULT false,
    is_visible boolean NOT NULL DEFAULT true,

    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),

    UNIQUE(project_id, category_id, slug)
);

CREATE TABLE filter_group_translation (
    filter_group_id uuid NOT NULL REFERENCES filter_group(id) ON DELETE CASCADE,
    locale varchar(5) NOT NULL,
    name varchar(128) NOT NULL,
    PRIMARY KEY (filter_group_id, locale)
);

CREATE INDEX idx_filter_group_project ON filter_group(project_id);
CREATE INDEX idx_filter_group_category ON filter_group(category_id);
```

### filter_config

Individual filter settings.

```sql
CREATE TABLE filter_config (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    -- NULL = project-level defaults
    category_id uuid REFERENCES category(id) ON DELETE CASCADE,

    -- Group (optional)
    filter_group_id uuid REFERENCES filter_group(id) ON DELETE SET NULL,

    -- ═══════════════════════════════════════════════════════════════
    -- KEY FIELDS: define relationship with product_search_index
    -- ═══════════════════════════════════════════════════════════════

    -- Type: feature, option, tag, category, price, stock
    filter_type varchar(32) NOT NULL,

    -- Attribute slug (for feature/option)
    -- Example: 'brand', 'color', 'size'
    -- Maps to prefix in feature_slugs/option_slugs
    filter_slug varchar(128),

    -- ═══════════════════════════════════════════════════════════════
    -- UI SETTINGS
    -- ═══════════════════════════════════════════════════════════════

    sort_order int NOT NULL DEFAULT 0,
    display_mode varchar(32) NOT NULL DEFAULT 'checkbox',
    is_collapsed boolean NOT NULL DEFAULT false,
    is_visible boolean NOT NULL DEFAULT true,
    is_searchable boolean NOT NULL DEFAULT false,
    max_visible_values int DEFAULT 10,
    value_sort varchar(32) NOT NULL DEFAULT 'count_desc',

    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),

    UNIQUE(project_id, category_id, filter_type, filter_slug)
);

CREATE TABLE filter_config_translation (
    filter_config_id uuid NOT NULL REFERENCES filter_config(id) ON DELETE CASCADE,
    locale varchar(5) NOT NULL,
    name varchar(128) NOT NULL,
    PRIMARY KEY (filter_config_id, locale)
);

CREATE INDEX idx_filter_config_project ON filter_config(project_id);
CREATE INDEX idx_filter_config_category ON filter_config(category_id);
CREATE INDEX idx_filter_config_group ON filter_config(filter_group_id);
```

### filter_value_sort

Custom sorting and hiding of values.

```sql
CREATE TABLE filter_value_sort (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    filter_config_id uuid NOT NULL REFERENCES filter_config(id) ON DELETE CASCADE,

    -- Value (e.g., 'red', 'xl', 'nike')
    value_slug varchar(128) NOT NULL,

    sort_order int NOT NULL DEFAULT 0,
    is_hidden boolean NOT NULL DEFAULT false,

    UNIQUE(filter_config_id, value_slug)
);

CREATE INDEX idx_filter_value_sort_config ON filter_value_sort(filter_config_id);
```

---

## Mapping: filter_config → product_search_index

### How It Works

```
filter_config                           product_search_index
─────────────                           ────────────────────

filter_type = 'feature'     ──────►     feature_slugs column
filter_slug = 'brand'       ──────►     prefix 'brand:'

                                        feature_slugs = [
                                          'brand:nike',      ◄── matches
                                          'brand:adidas',    ◄── matches
                                          'material:leather'
                                        ]
```

### Mapping Table

| filter_type | filter_slug | PSI Column | Value Format | SQL |
|-------------|-------------|------------|--------------|-----|
| `feature` | `brand` | `feature_slugs` | `brand:nike` | `feature_slugs && ARRAY['brand:nike']::text[]` |
| `feature` | `material` | `feature_slugs` | `material:leather` | `feature_slugs && ARRAY['material:leather']::text[]` |
| `option` | `color` | `option_slugs` | `color:red` | `option_slugs && ARRAY['color:red']::text[]` |
| `option` | `size` | `option_slugs` | `size:m` | `option_slugs && ARRAY['size:m']::text[]` |
| `tag` | `null` | `tag_ids` | UUID | `tag_ids && ARRAY[uuid]::uuid[]` |
| `category` | `null` | `category_ids` | UUID | `category_ids && ARRAY[uuid]::uuid[]` |
| `price` | `null` | `min_price_minor` | integer | `min_price_minor BETWEEN $min AND $max` |
| `stock` | `null` | `in_stock` | boolean | `in_stock = true` |

### SQL Generation

```typescript
function buildFilterSQL(filter: FilterInput): string {
  switch (filter.type) {
    case 'feature':
      // filter_slug = 'brand', values = ['nike', 'adidas']
      // → feature_slugs && ARRAY['brand:nike', 'brand:adidas']
      const featureValues = filter.values.map(v => `${filter.slug}:${v}`);
      return `feature_slugs && ARRAY[${featureValues.map(v => `'${v}'`).join(',')}]::text[]`;

    case 'option':
      const optionValues = filter.values.map(v => `${filter.slug}:${v}`);
      return `option_slugs && ARRAY[${optionValues.map(v => `'${v}'`).join(',')}]::text[]`;

    case 'tag':
      return `tag_ids && ARRAY[${filter.values.map(v => `'${v}'`).join(',')}]::uuid[]`;

    case 'price':
      return `min_price_minor BETWEEN ${filter.min} AND ${filter.max}`;

    case 'stock':
      return `in_stock = true`;
  }
}
```

---

## Display Modes

| Mode | Use Case | UI Component |
|------|----------|--------------|
| `checkbox` | Multi-select (brand, material) | Checkboxes with counts |
| `radio` | Single-select | Radio buttons |
| `range` | Price, weight | Slider with min/max inputs |
| `color_swatch` | Colors | Color circles/squares |
| `size_grid` | Sizes | Grid of size buttons |

---

## Value Sorting

| Mode | Description | Example |
|------|-------------|---------|
| `count_desc` | By product count, descending | Nike (150), Adidas (120), Puma (80) |
| `count_asc` | By product count, ascending | Puma (80), Adidas (120), Nike (150) |
| `alpha_asc` | Alphabetically A→Z | Adidas, Nike, Puma |
| `alpha_desc` | Alphabetically Z→A | Puma, Nike, Adidas |
| `custom` | Manual order via `filter_value_sort` | S, M, L, XL, XXL |

### Custom Sort Example

```sql
-- Size sorting: XS, S, M, L, XL, XXL
INSERT INTO filter_value_sort (filter_config_id, value_slug, sort_order) VALUES
  ('fc-size-uuid', 'xs', 1),
  ('fc-size-uuid', 's', 2),
  ('fc-size-uuid', 'm', 3),
  ('fc-size-uuid', 'l', 4),
  ('fc-size-uuid', 'xl', 5),
  ('fc-size-uuid', 'xxl', 6);
```

---

## Request/Response Flow

### 1. Client Request

```json
POST /api/search
{
  "projectId": "proj-123",
  "categoryId": "cat-shoes",
  "locale": "uk",
  "filters": [
    { "type": "feature", "slug": "brand", "values": ["nike", "adidas"] },
    { "type": "option", "slug": "color", "values": ["red"] },
    { "type": "price", "min": 1000, "max": 5000 }
  ],
  "limit": 50
}
```

### 2. Filter Validation

```typescript
// 1. Загружаем filter_config для категории
const config = await filterConfigService.getFilterConfig(projectId, categoryId, locale);

// 2. Проверяем что запрошенные фильтры разрешены
const allowedFilters = new Set(config.flatMap(g =>
  g.filters.map(f => `${f.filterType}:${f.filterSlug ?? ''}`)
));

// 3. Отбрасываем неразрешённые
const validFilters = filters.filter(f =>
  allowedFilters.has(`${f.type}:${f.slug ?? ''}`)
);

// 4. Убираем скрытые значения
for (const filter of validFilters) {
  const configItem = findConfig(config, filter.type, filter.slug);
  if (configItem?.hiddenValues) {
    filter.values = filter.values.filter(v => !configItem.hiddenValues.has(v));
  }
}
```

### 3. SQL Query Building

```sql
SELECT product_id
FROM product_search_index
WHERE project_id = 'proj-123'
  AND category_ids && ARRAY['cat-shoes']::uuid[]
  AND feature_slugs && ARRAY['brand:nike', 'brand:adidas']::text[]
  AND option_slugs && ARRAY['color:red']::text[]
  AND min_price_minor >= 1000
  AND min_price_minor <= 5000
ORDER BY popularity_score DESC
LIMIT 10000;
```

### 4. Facet Counting

```sql
-- Count all feature values for matched products
SELECT unnest(feature_slugs) AS value, count(*)::int AS count
FROM product_search_index
WHERE product_id = ANY($matchedIds)
GROUP BY 1
ORDER BY count DESC;

-- Results:
-- brand:nike       | 45
-- brand:adidas     | 32
-- brand:puma       | 18
-- material:leather | 28
-- material:textile | 15
```

### 5. Format Response

```typescript
// 1. Load configuration
const config = await filterConfigService.getFilterConfig(projectId, categoryId, locale);

// 2. Group raw facets by configuration
for (const group of config) {
  for (const filterConfig of group.filters) {
    // Find values for this filter
    const values = rawFacets
      .filter(f => f.value.startsWith(`${filterConfig.filterSlug}:`))
      .map(f => ({
        value: f.value.split(':')[1],
        count: f.count,
      }));

    // Apply sorting
    sortValues(values, filterConfig.valueSort, filterConfig.customValueOrder);

    // Apply hiding
    const visibleValues = values.filter(v => !filterConfig.hiddenValues?.has(v.value));

    // Limit count
    const displayValues = visibleValues.slice(0, filterConfig.maxVisibleValues);
  }
}
```

### 6. Response

```json
{
  "products": ["prod-1", "prod-2", "..."],
  "total": 245,
  "facets": {
    "groups": [
      {
        "id": "grp-1",
        "slug": "characteristics",
        "name": "Characteristics",
        "isCollapsed": false,
        "facets": [
          {
            "id": "fc-1",
            "type": "feature",
            "slug": "brand",
            "name": "Brand",
            "displayMode": "checkbox",
            "isCollapsed": false,
            "isSearchable": true,
            "values": [
              { "value": "nike", "label": "Nike", "count": 45, "selected": true },
              { "value": "adidas", "label": "Adidas", "count": 32, "selected": true },
              { "value": "puma", "label": "Puma", "count": 18, "selected": false }
            ],
            "hasMore": true
          },
          {
            "id": "fc-2",
            "type": "option",
            "slug": "color",
            "name": "Color",
            "displayMode": "color_swatch",
            "isCollapsed": false,
            "isSearchable": false,
            "values": [
              { "value": "red", "label": "Red", "count": 28, "selected": true },
              { "value": "blue", "label": "Blue", "count": 22, "selected": false },
              { "value": "black", "label": "Black", "count": 45, "selected": false }
            ],
            "hasMore": false
          }
        ]
      },
      {
        "id": "grp-2",
        "slug": "price",
        "name": "Price",
        "isCollapsed": false,
        "facets": [
          {
            "id": "fc-3",
            "type": "price",
            "slug": null,
            "name": "Price",
            "displayMode": "range",
            "values": [],
            "range": { "min": 500, "max": 15000, "selectedMin": 1000, "selectedMax": 5000 }
          }
        ]
      }
    ]
  }
}
```

---

## Admin API

### GraphQL Schema

```graphql
# ═══════════════════════════════════════════════════════════════
# QUERIES
# ═══════════════════════════════════════════════════════════════

type Query {
  # Get all filter groups for category (with inheritance)
  filterGroups(categoryId: ID): [FilterGroup!]!

  # Get filter configuration for category
  filterConfigs(categoryId: ID): [FilterConfig!]!

  # Get available attributes for creating filters
  availableFilterAttributes(categoryId: ID): AvailableAttributes!
}

type AvailableAttributes {
  features: [AttributeInfo!]!   # brand, material, gender, etc.
  options: [AttributeInfo!]!    # color, size, etc.
  tags: [TagInfo!]!
}

type AttributeInfo {
  slug: String!
  name: String!
  valueCount: Int!
}

# ═══════════════════════════════════════════════════════════════
# MUTATIONS
# ═══════════════════════════════════════════════════════════════

type Mutation {
  # ─────────────────────────────────────────────────────────────
  # Filter Groups
  # ─────────────────────────────────────────────────────────────

  createFilterGroup(input: CreateFilterGroupInput!): FilterGroup!
  updateFilterGroup(id: ID!, input: UpdateFilterGroupInput!): FilterGroup!
  deleteFilterGroup(id: ID!): Boolean!

  # Reorder groups (drag & drop)
  reorderFilterGroups(categoryId: ID, groupIds: [ID!]!): [FilterGroup!]!

  # ─────────────────────────────────────────────────────────────
  # Filter Configs
  # ─────────────────────────────────────────────────────────────

  createFilterConfig(input: CreateFilterConfigInput!): FilterConfig!
  updateFilterConfig(id: ID!, input: UpdateFilterConfigInput!): FilterConfig!
  deleteFilterConfig(id: ID!): Boolean!

  # Reorder filters within a group
  reorderFilters(groupId: ID!, filterIds: [ID!]!): [FilterConfig!]!

  # Move filter to another group
  moveFilterToGroup(filterId: ID!, groupId: ID): FilterConfig!

  # ─────────────────────────────────────────────────────────────
  # Value Sorting
  # ─────────────────────────────────────────────────────────────

  # Set value order (for custom sort)
  setFilterValueOrder(
    filterId: ID!,
    values: [FilterValueOrderInput!]!
  ): FilterConfig!

  # Hide/show value
  setFilterValueVisibility(
    filterId: ID!,
    valueSlug: String!,
    isHidden: Boolean!
  ): FilterConfig!
}

# ═══════════════════════════════════════════════════════════════
# INPUT TYPES
# ═══════════════════════════════════════════════════════════════

input CreateFilterGroupInput {
  categoryId: ID              # null = project level
  slug: String!
  sortOrder: Int
  isCollapsed: Boolean
  translations: [TranslationInput!]!
}

input UpdateFilterGroupInput {
  slug: String
  sortOrder: Int
  isCollapsed: Boolean
  isVisible: Boolean
  translations: [TranslationInput!]
}

input CreateFilterConfigInput {
  categoryId: ID
  filterGroupId: ID
  filterType: FilterType!
  filterSlug: String          # required for feature/option
  displayMode: DisplayMode
  isCollapsed: Boolean
  isSearchable: Boolean
  maxVisibleValues: Int
  valueSort: ValueSortMode
  translations: [TranslationInput!]
}

input UpdateFilterConfigInput {
  filterGroupId: ID
  displayMode: DisplayMode
  isCollapsed: Boolean
  isVisible: Boolean
  isSearchable: Boolean
  maxVisibleValues: Int
  valueSort: ValueSortMode
  translations: [TranslationInput!]
}

input FilterValueOrderInput {
  valueSlug: String!
  sortOrder: Int!
  isHidden: Boolean
}

input TranslationInput {
  locale: String!
  name: String!
}

# ═══════════════════════════════════════════════════════════════
# ENUMS
# ═══════════════════════════════════════════════════════════════

enum FilterType {
  FEATURE
  OPTION
  TAG
  CATEGORY
  PRICE
  STOCK
}

enum DisplayMode {
  CHECKBOX
  RADIO
  RANGE
  COLOR_SWATCH
  SIZE_GRID
}

enum ValueSortMode {
  COUNT_DESC
  COUNT_ASC
  ALPHA_ASC
  ALPHA_DESC
  CUSTOM
}

# ═══════════════════════════════════════════════════════════════
# TYPES
# ═══════════════════════════════════════════════════════════════

type FilterGroup {
  id: ID!
  categoryId: ID
  slug: String!
  name: String!              # localized
  sortOrder: Int!
  isCollapsed: Boolean!
  isVisible: Boolean!
  filters: [FilterConfig!]!
  translations: [Translation!]!
}

type FilterConfig {
  id: ID!
  categoryId: ID
  filterGroup: FilterGroup
  filterType: FilterType!
  filterSlug: String
  name: String!              # localized
  displayMode: DisplayMode!
  sortOrder: Int!
  isCollapsed: Boolean!
  isVisible: Boolean!
  isSearchable: Boolean!
  maxVisibleValues: Int
  valueSort: ValueSortMode!
  valueSortConfig: [FilterValueSort!]!
  translations: [Translation!]!
}

type FilterValueSort {
  valueSlug: String!
  sortOrder: Int!
  isHidden: Boolean!
}

type Translation {
  locale: String!
  name: String!
}
```

---

## Filter Discovery

When admin clicks "Add Filter", the system must show available options discovered from actual product data in `product_search_index`. Each filter type has its own discovery source.

### Discovery Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     ADMIN: "Add Filter" Dialog                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Select filter type:                                                        │
│   ┌─────────────────────────────────────────────────────────────────┐       │
│   │  ○ Feature    (brand, material, gender...)                      │       │
│   │  ○ Option     (color, size...)                                  │       │
│   │  ○ Tag                                                          │       │
│   │  ○ Price                                                        │       │
│   │  ○ Stock                                                        │       │
│   └─────────────────────────────────────────────────────────────────┘       │
│                              │                                               │
│                              │ User selects "Feature"                        │
│                              ▼                                               │
│   Available features (from product_search_index.feature_slugs):              │
│   ┌─────────────────────────────────────────────────────────────────┐       │
│   │  ☐ brand       95 products  │ 12 values │ Nike, Adidas, Puma...│       │
│   │  ☐ material    80 products  │ 5 values  │ Leather, Textile...  │       │
│   │  ☐ gender      100 products │ 3 values  │ Men, Women, Unisex   │       │
│   │  ☐ season      45 products  │ 4 values  │ Summer, Winter...    │       │
│   │  ─────────────────────────────────────────────────────────────  │       │
│   │  ✓ brand (already configured)                                   │       │
│   └─────────────────────────────────────────────────────────────────┘       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Discovery Queries by Type

#### Features (from `feature_slugs`)

```sql
-- Discover available features for category
SELECT
  split_part(value, ':', 1) AS slug,
  count(DISTINCT product_id) AS product_count,
  count(DISTINCT split_part(value, ':', 2)) AS value_count,
  array_agg(DISTINCT split_part(value, ':', 2) ORDER BY split_part(value, ':', 2))
    FILTER (WHERE split_part(value, ':', 2) IS NOT NULL) AS sample_values
FROM product_search_index, unnest(feature_slugs) AS value
WHERE project_id = $projectId
  AND ($categoryId IS NULL OR category_ids && ARRAY[$categoryId]::uuid[])
GROUP BY 1
ORDER BY product_count DESC;

-- Results:
-- slug     | product_count | value_count | sample_values
-- ---------+---------------+-------------+---------------------------
-- brand    | 95            | 12          | {Adidas,Nike,Puma,Reebok}
-- material | 80            | 5           | {Cotton,Leather,Synthetic}
-- gender   | 100           | 3           | {Men,Unisex,Women}
```

#### Options (from `option_slugs`)

```sql
-- Discover available options for category
SELECT
  split_part(value, ':', 1) AS slug,
  count(DISTINCT product_id) AS product_count,
  count(DISTINCT split_part(value, ':', 2)) AS value_count,
  array_agg(DISTINCT split_part(value, ':', 2) ORDER BY split_part(value, ':', 2))
    FILTER (WHERE split_part(value, ':', 2) IS NOT NULL) AS sample_values
FROM product_search_index, unnest(option_slugs) AS value
WHERE project_id = $projectId
  AND ($categoryId IS NULL OR category_ids && ARRAY[$categoryId]::uuid[])
GROUP BY 1
ORDER BY product_count DESC;

-- Results:
-- slug  | product_count | value_count | sample_values
-- ------+---------------+-------------+---------------------------
-- color | 100           | 8           | {Black,Blue,Red,White}
-- size  | 85            | 15          | {36,37,38,39,40,41,42}
```

#### Tags (from `tag_ids`)

```sql
-- Discover available tags for category
SELECT
  t.id,
  t.slug,
  tt.name,
  count(DISTINCT psi.product_id) AS product_count
FROM product_search_index psi, unnest(psi.tag_ids) AS tag_id
JOIN tag t ON t.id = tag_id
LEFT JOIN tag_translation tt ON tt.tag_id = t.id AND tt.locale = $locale
WHERE psi.project_id = $projectId
  AND ($categoryId IS NULL OR psi.category_ids && ARRAY[$categoryId]::uuid[])
GROUP BY t.id, t.slug, tt.name
ORDER BY product_count DESC;

-- Results:
-- id       | slug       | name        | product_count
-- ---------+------------+-------------+---------------
-- uuid-1   | sale       | On Sale     | 45
-- uuid-2   | new        | New Arrival | 30
-- uuid-3   | bestseller | Bestseller  | 25
```

#### Price & Stock (always available if products exist)

```sql
-- Check if price/stock filters are applicable
SELECT
  count(*) AS total_products,
  count(*) FILTER (WHERE min_price_minor IS NOT NULL) AS with_price,
  count(*) FILTER (WHERE in_stock = true) AS in_stock_count,
  min(min_price_minor) AS min_price,
  max(max_price_minor) AS max_price
FROM product_search_index
WHERE project_id = $projectId
  AND ($categoryId IS NULL OR category_ids && ARRAY[$categoryId]::uuid[]);

-- Results:
-- total_products | with_price | in_stock_count | min_price | max_price
-- ---------------+------------+----------------+-----------+-----------
-- 100            | 100        | 85             | 50000     | 1500000
```

### GraphQL API

```graphql
type Query {
  # Get discovered filter options for "Add Filter" dialog
  discoverFilters(categoryId: ID): DiscoveredFilters!
}

type DiscoveredFilters {
  features: [DiscoveredAttribute!]!
  options: [DiscoveredAttribute!]!
  tags: [DiscoveredTag!]!

  # Price filter availability
  price: DiscoveredPrice

  # Stock filter availability
  stock: DiscoveredStock
}

type DiscoveredAttribute {
  slug: String!
  productCount: Int!
  valueCount: Int!
  sampleValues: [String!]!    # first 5 values for preview
  isConfigured: Boolean!       # already has filter_config?
}

type DiscoveredTag {
  id: ID!
  slug: String!
  name: String!               # localized
  productCount: Int!
  isConfigured: Boolean!
}

type DiscoveredPrice {
  productCount: Int!
  minPrice: Int!              # in minor units
  maxPrice: Int!
  isConfigured: Boolean!
}

type DiscoveredStock {
  inStockCount: Int!
  outOfStockCount: Int!
  isConfigured: Boolean!
}
```

### Service Implementation

```typescript
interface DiscoveredFilters {
  features: DiscoveredAttribute[];
  options: DiscoveredAttribute[];
  tags: DiscoveredTag[];
  price: DiscoveredPrice | null;
  stock: DiscoveredStock | null;
}

class FilterDiscoveryService {
  constructor(private db: Knex) {}

  async discoverFilters(
    projectId: string,
    categoryId: string | null
  ): Promise<DiscoveredFilters> {
    // Get already configured filters to mark them
    const configured = await this.getConfiguredFilters(projectId, categoryId);

    // Run all discovery queries in parallel
    const [features, options, tags, priceStock] = await Promise.all([
      this.discoverFeatures(projectId, categoryId),
      this.discoverOptions(projectId, categoryId),
      this.discoverTags(projectId, categoryId),
      this.discoverPriceStock(projectId, categoryId),
    ]);

    return {
      features: features.map(f => ({
        ...f,
        isConfigured: configured.has(`feature:${f.slug}`),
      })),
      options: options.map(o => ({
        ...o,
        isConfigured: configured.has(`option:${o.slug}`),
      })),
      tags: tags.map(t => ({
        ...t,
        isConfigured: configured.has(`tag:${t.id}`),
      })),
      price: priceStock.hasPrice ? {
        productCount: priceStock.withPrice,
        minPrice: priceStock.minPrice,
        maxPrice: priceStock.maxPrice,
        isConfigured: configured.has('price'),
      } : null,
      stock: priceStock.total > 0 ? {
        inStockCount: priceStock.inStock,
        outOfStockCount: priceStock.total - priceStock.inStock,
        isConfigured: configured.has('stock'),
      } : null,
    };
  }

  private async getConfiguredFilters(
    projectId: string,
    categoryId: string | null
  ): Promise<Set<string>> {
    const rows = await this.db('filter_config')
      .select('filter_type', 'filter_slug')
      .where('project_id', projectId)
      .where(builder => {
        builder.whereNull('category_id');
        if (categoryId) {
          builder.orWhere('category_id', categoryId);
        }
      });

    const set = new Set<string>();
    for (const row of rows) {
      const key = row.filter_slug
        ? `${row.filter_type}:${row.filter_slug}`
        : row.filter_type;
      set.add(key);
    }
    return set;
  }

  private async discoverFeatures(
    projectId: string,
    categoryId: string | null
  ): Promise<DiscoveredAttribute[]> {
    const result = await this.db.raw(`
      SELECT
        split_part(value, ':', 1) AS slug,
        count(DISTINCT product_id)::int AS product_count,
        count(DISTINCT split_part(value, ':', 2))::int AS value_count,
        (array_agg(DISTINCT split_part(value, ':', 2)
          ORDER BY split_part(value, ':', 2)))[1:5] AS sample_values
      FROM product_search_index, unnest(feature_slugs) AS value
      WHERE project_id = ?
        AND (? IS NULL OR category_ids && ARRAY[?]::uuid[])
      GROUP BY 1
      ORDER BY product_count DESC
    `, [projectId, categoryId, categoryId]);

    return result.rows;
  }

  private async discoverOptions(
    projectId: string,
    categoryId: string | null
  ): Promise<DiscoveredAttribute[]> {
    const result = await this.db.raw(`
      SELECT
        split_part(value, ':', 1) AS slug,
        count(DISTINCT product_id)::int AS product_count,
        count(DISTINCT split_part(value, ':', 2))::int AS value_count,
        (array_agg(DISTINCT split_part(value, ':', 2)
          ORDER BY split_part(value, ':', 2)))[1:5] AS sample_values
      FROM product_search_index, unnest(option_slugs) AS value
      WHERE project_id = ?
        AND (? IS NULL OR category_ids && ARRAY[?]::uuid[])
      GROUP BY 1
      ORDER BY product_count DESC
    `, [projectId, categoryId, categoryId]);

    return result.rows;
  }

  private async discoverTags(
    projectId: string,
    categoryId: string | null
  ): Promise<DiscoveredTag[]> {
    const result = await this.db.raw(`
      SELECT
        t.id,
        t.slug,
        COALESCE(tt.name, t.slug) AS name,
        count(DISTINCT psi.product_id)::int AS product_count
      FROM product_search_index psi, unnest(psi.tag_ids) AS tag_id
      JOIN tag t ON t.id = tag_id
      LEFT JOIN tag_translation tt ON tt.tag_id = t.id AND tt.locale = 'en'
      WHERE psi.project_id = ?
        AND (? IS NULL OR psi.category_ids && ARRAY[?]::uuid[])
      GROUP BY t.id, t.slug, tt.name
      ORDER BY product_count DESC
    `, [projectId, categoryId, categoryId]);

    return result.rows;
  }

  private async discoverPriceStock(
    projectId: string,
    categoryId: string | null
  ): Promise<{
    total: number;
    withPrice: number;
    inStock: number;
    minPrice: number;
    maxPrice: number;
    hasPrice: boolean;
  }> {
    const result = await this.db.raw(`
      SELECT
        count(*)::int AS total,
        count(*) FILTER (WHERE min_price_minor IS NOT NULL)::int AS with_price,
        count(*) FILTER (WHERE in_stock = true)::int AS in_stock,
        min(min_price_minor)::int AS min_price,
        max(max_price_minor)::int AS max_price
      FROM product_search_index
      WHERE project_id = ?
        AND (? IS NULL OR category_ids && ARRAY[?]::uuid[])
    `, [projectId, categoryId, categoryId]);

    const row = result.rows[0];
    return {
      ...row,
      hasPrice: row.with_price > 0,
    };
  }
}
```

### Admin UI Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Category: Footwear                                          [+ Add Filter] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Configured Filters:                                                         │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ ≡ Brand        (feature)   checkbox   ▼ count_desc   [Edit] [Delete]  │ │
│  │ ≡ Color        (option)    swatch     ▼ count_desc   [Edit] [Delete]  │ │
│  │ ≡ Price        (price)     range                     [Edit] [Delete]  │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

          │
          │ Click [+ Add Filter]
          ▼

┌─────────────────────────────────────────────────────────────────────────────┐
│  Add Filter                                                          [X]    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Filter Type:  [Features ▼]                                                  │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                                                                        │ │
│  │  Available Features:                                                   │ │
│  │                                                                        │ │
│  │  ┌──────────────────────────────────────────────────────────────────┐ │ │
│  │  │ ○ material    80 products │ 5 values                             │ │ │
│  │  │               Leather, Cotton, Synthetic, Suede, Mesh            │ │ │
│  │  ├──────────────────────────────────────────────────────────────────┤ │ │
│  │  │ ○ gender      100 products │ 3 values                            │ │ │
│  │  │               Men, Women, Unisex                                 │ │ │
│  │  ├──────────────────────────────────────────────────────────────────┤ │ │
│  │  │ ○ season      45 products │ 4 values                             │ │ │
│  │  │               Summer, Winter, Spring, Autumn                     │ │ │
│  │  └──────────────────────────────────────────────────────────────────┘ │ │
│  │                                                                        │ │
│  │  Already configured:                                                   │ │
│  │  ┌──────────────────────────────────────────────────────────────────┐ │ │
│  │  │ ✓ brand       95 products │ 12 values  (configured)              │ │ │
│  │  └──────────────────────────────────────────────────────────────────┘ │ │
│  │                                                                        │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│                                              [Cancel]  [Add Selected]        │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Fallback Behavior

If no `filter_config` exists for a category, the storefront can auto-show all discovered filters:

```typescript
async getFiltersForStorefront(
  projectId: string,
  categoryId: string | null,
  locale: string
): Promise<FilterGroupConfig[]> {

  // 1. Try explicit config first
  const config = await this.filterConfigService.getFilterConfig(
    projectId, categoryId, locale
  );

  if (config.length > 0) {
    return config;
  }

  // 2. No config — auto-discover and return all
  const discovered = await this.filterDiscoveryService.discoverFilters(
    projectId, categoryId
  );

  return this.buildDefaultConfig(discovered, locale);
}

private buildDefaultConfig(
  discovered: DiscoveredFilters,
  locale: string
): FilterGroupConfig[] {
  const filters: FilterConfig[] = [];

  // Add all features
  for (const f of discovered.features) {
    filters.push({
      id: `auto:feature:${f.slug}`,
      filterType: 'feature',
      filterSlug: f.slug,
      name: this.humanize(f.slug),
      displayMode: 'checkbox',
      sortOrder: filters.length,
      isCollapsed: false,
      isSearchable: f.valueCount > 10,
      maxVisibleValues: 10,
      valueSort: 'count_desc',
    });
  }

  // Add all options
  for (const o of discovered.options) {
    filters.push({
      id: `auto:option:${o.slug}`,
      filterType: 'option',
      filterSlug: o.slug,
      name: this.humanize(o.slug),
      displayMode: o.slug === 'color' ? 'color_swatch' : 'checkbox',
      sortOrder: filters.length,
      isCollapsed: false,
      isSearchable: false,
      maxVisibleValues: 20,
      valueSort: 'count_desc',
    });
  }

  // Add price if available
  if (discovered.price) {
    filters.push({
      id: 'auto:price',
      filterType: 'price',
      filterSlug: null,
      name: 'Price',
      displayMode: 'range',
      sortOrder: filters.length,
      isCollapsed: false,
      isSearchable: false,
      maxVisibleValues: 0,
      valueSort: 'count_desc',
    });
  }

  return [{
    id: 'auto:default',
    slug: 'filters',
    name: 'Filters',
    sortOrder: 0,
    isCollapsed: false,
    filters,
  }];
}
```

---

## Use Cases

### 1. Setup Filters for Category "Footwear"

```graphql
# 1. Create groups
mutation {
  g1: createFilterGroup(input: {
    categoryId: "cat-shoes"
    slug: "characteristics"
    sortOrder: 1
    translations: [
      { locale: "uk", name: "Characteristics" }
      { locale: "en", name: "Characteristics" }
    ]
  }) { id }

  g2: createFilterGroup(input: {
    categoryId: "cat-shoes"
    slug: "variants"
    sortOrder: 2
    translations: [
      { locale: "uk", name: "Variants" }
      { locale: "en", name: "Variants" }
    ]
  }) { id }
}

# 2. Add filters
mutation {
  f1: createFilterConfig(input: {
    categoryId: "cat-shoes"
    filterGroupId: "g1-id"
    filterType: FEATURE
    filterSlug: "brand"
    displayMode: CHECKBOX
    isSearchable: true
    maxVisibleValues: 10
    valueSort: COUNT_DESC
    translations: [{ locale: "uk", name: "Brand" }]
  }) { id }

  f2: createFilterConfig(input: {
    categoryId: "cat-shoes"
    filterGroupId: "g2-id"
    filterType: OPTION
    filterSlug: "size"
    displayMode: SIZE_GRID
    valueSort: CUSTOM
    translations: [{ locale: "uk", name: "Size" }]
  }) { id }
}

# 3. Configure size order
mutation {
  setFilterValueOrder(
    filterId: "f2-id"
    values: [
      { valueSlug: "36", sortOrder: 1 }
      { valueSlug: "37", sortOrder: 2 }
      { valueSlug: "38", sortOrder: 3 }
      { valueSlug: "39", sortOrder: 4 }
      { valueSlug: "40", sortOrder: 5 }
      { valueSlug: "41", sortOrder: 6 }
      { valueSlug: "42", sortOrder: 7 }
      { valueSlug: "43", sortOrder: 8 }
      { valueSlug: "44", sortOrder: 9 }
      { valueSlug: "45", sortOrder: 10 }
    ]
  ) { id }
}
```

### 2. Hide Specific Values

```graphql
# Hide color "beige" from color filter
mutation {
  setFilterValueVisibility(
    filterId: "fc-color-id"
    valueSlug: "beige"
    isHidden: true
  ) { id }
}
```

### 3. Reorder Filters via Drag & Drop

```graphql
# Reorder filters in group
mutation {
  reorderFilters(
    groupId: "grp-characteristics"
    filterIds: ["fc-brand", "fc-material", "fc-gender", "fc-season"]
  ) { id sortOrder }
}
```

### 4. Category Inheritance

```
Project "my-shop"
├── filter_config (category_id = NULL)
│   ├── type=price         ← show price everywhere
│   └── type=stock         ← show availability everywhere
│
└── Category "Clothing"
    ├── filter_config (category_id = "clothes")
    │   ├── type=feature, slug=brand
    │   ├── type=feature, slug=material
    │   └── type=option, slug=size
    │
    └── Category "T-shirts"
        └── filter_config (category_id = "tshirts")
            └── type=option, slug=color  ← additional filter only for t-shirts
```

When querying category "T-shirts":
1. Take filters from "T-shirts" → color
2. Add filters from "Clothing" (missing ones) → brand, material, size
3. Add project-level filters (missing ones) → price, stock

Result: brand, material, size, color, price, stock

---

## Services

### FilterConfigService

```typescript
interface FilterGroupConfig {
  id: string;
  slug: string;
  name: string;
  sortOrder: number;
  isCollapsed: boolean;
  filters: FilterConfig[];
}

interface FilterConfig {
  id: string;
  filterType: 'feature' | 'option' | 'tag' | 'category' | 'price' | 'stock';
  filterSlug: string | null;
  name: string;
  sortOrder: number;
  displayMode: string;
  isCollapsed: boolean;
  isSearchable: boolean;
  maxVisibleValues: number;
  valueSort: string;
  customValueOrder?: Map<string, number>;
  hiddenValues?: Set<string>;
}

class FilterConfigService {
  /**
   * Get filter configuration for category with inheritance
   */
  async getFilterConfig(
    projectId: string,
    categoryId: string | null,
    locale: string
  ): Promise<FilterGroupConfig[]>;

  /**
   * Get category path for inheritance lookup
   */
  private async getCategoryPath(categoryId: string): Promise<string[]>;
}
```

### FilterQueryBuilder

```typescript
interface FilterInput {
  type: 'feature' | 'option' | 'tag' | 'category' | 'price' | 'stock';
  slug?: string;
  values?: string[];
  min?: number;
  max?: number;
}

class FilterQueryBuilder {
  /**
   * Apply filters to query builder
   */
  applyFilters(query: Knex.QueryBuilder, filters: FilterInput[]): Knex.QueryBuilder;
}
```

### FilterValidatorService

```typescript
class FilterValidatorService {
  /**
   * Validate filters against category config
   * Removes filters that are not configured for this category
   */
  async validateFilters(
    projectId: string,
    categoryId: string | null,
    filters: FilterInput[]
  ): Promise<FilterInput[]>;

  /**
   * Remove hidden values from filter inputs
   */
  async filterHiddenValues(
    projectId: string,
    categoryId: string | null,
    filters: FilterInput[]
  ): Promise<FilterInput[]>;
}
```

---

## Performance Considerations

### Caching

```typescript
// Cache filter config per category (TTL: 5 min)
const cacheKey = `filter_config:${projectId}:${categoryId ?? 'root'}:${locale}`;
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);

const config = await this.loadFilterConfig(projectId, categoryId, locale);
await redis.setex(cacheKey, 300, JSON.stringify(config));
return config;
```

### Invalidation

```typescript
// On changes to filter_config/filter_group
async invalidateFilterConfigCache(projectId: string, categoryId: string | null) {
  // Invalidate for all locales
  const locales = ['uk', 'en', 'ru'];
  const keys = locales.map(l => `filter_config:${projectId}:${categoryId ?? 'root'}:${l}`);
  await redis.del(...keys);

  // Also invalidate child categories (they inherit)
  const children = await this.getChildCategories(categoryId);
  for (const child of children) {
    await this.invalidateFilterConfigCache(projectId, child.id);
  }
}
```

---

## Migration

```sql
-- migrations/YYYYMMDD_add_filter_management.sql

-- Filter groups
CREATE TABLE filter_group (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    category_id uuid REFERENCES category(id) ON DELETE CASCADE,
    slug varchar(64) NOT NULL,
    sort_order int NOT NULL DEFAULT 0,
    is_collapsed boolean NOT NULL DEFAULT false,
    is_visible boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(project_id, category_id, slug)
);

CREATE TABLE filter_group_translation (
    filter_group_id uuid NOT NULL REFERENCES filter_group(id) ON DELETE CASCADE,
    locale varchar(5) NOT NULL,
    name varchar(128) NOT NULL,
    PRIMARY KEY (filter_group_id, locale)
);

-- Filter configs
CREATE TABLE filter_config (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    category_id uuid REFERENCES category(id) ON DELETE CASCADE,
    filter_group_id uuid REFERENCES filter_group(id) ON DELETE SET NULL,
    filter_type varchar(32) NOT NULL,
    filter_slug varchar(128),
    sort_order int NOT NULL DEFAULT 0,
    display_mode varchar(32) NOT NULL DEFAULT 'checkbox',
    is_collapsed boolean NOT NULL DEFAULT false,
    is_visible boolean NOT NULL DEFAULT true,
    is_searchable boolean NOT NULL DEFAULT false,
    max_visible_values int DEFAULT 10,
    value_sort varchar(32) NOT NULL DEFAULT 'count_desc',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(project_id, category_id, filter_type, filter_slug)
);

CREATE TABLE filter_config_translation (
    filter_config_id uuid NOT NULL REFERENCES filter_config(id) ON DELETE CASCADE,
    locale varchar(5) NOT NULL,
    name varchar(128) NOT NULL,
    PRIMARY KEY (filter_config_id, locale)
);

-- Value sorting
CREATE TABLE filter_value_sort (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    filter_config_id uuid NOT NULL REFERENCES filter_config(id) ON DELETE CASCADE,
    value_slug varchar(128) NOT NULL,
    sort_order int NOT NULL DEFAULT 0,
    is_hidden boolean NOT NULL DEFAULT false,
    UNIQUE(filter_config_id, value_slug)
);

-- Indexes
CREATE INDEX idx_filter_group_project ON filter_group(project_id);
CREATE INDEX idx_filter_group_category ON filter_group(category_id);
CREATE INDEX idx_filter_config_project ON filter_config(project_id);
CREATE INDEX idx_filter_config_category ON filter_config(category_id);
CREATE INDEX idx_filter_config_group ON filter_config(filter_group_id);
CREATE INDEX idx_filter_value_sort_config ON filter_value_sort(filter_config_id);
```
