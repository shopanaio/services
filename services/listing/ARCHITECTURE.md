# Listing Service Architecture

Ultra-fast product listing with faceted filtering, full-text search, and personalized ranking via Metarank.

## Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Listing Service                               │
│                              (Node.js)                                  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                 ┌──────────────────┴──────────────────┐
                 ▼                                     ▼
┌─────────────────────────────┐         ┌─────────────────────────────────┐
│         PostgreSQL          │         │           Typesense             │
│                             │         │                                 │
│  • Facets (GIN indexes)     │         │  • Full-text search (BM25)      │
│  • Filters (price, stock)   │         │  • Typo tolerance               │
│  • Facet counts             │         │  • Multi-language support       │
│  • Source of truth          │         │  • Relevance scores             │
└─────────────────────────────┘         └─────────────────────────────────┘
                 │                                     │
                 └──────────────────┬──────────────────┘
                                    ▼
                              ┌───────────┐
                              │ Intersect │
                              └───────────┘
                                    │
                                    ▼
                    ┌─────────────────────────────────┐
                    │           Metarank              │
                    │    (Personalized Ranking)       │
                    │                                 │
                    │  • LightGBM / XGBoost models    │
                    │  • Real-time personalization    │
                    │  • Click/purchase learning      │
                    └─────────────────────────────────┘
```

## Components

### 1. PostgreSQL - Faceted Filtering

Handles all structured filtering and facet counting using GIN indexes for array operations.

**Responsibilities:**
- Filter by categories, tags, features, options
- Filter by price range, stock availability
- Calculate facet counts for UI
- Source of truth for product data

### 2. Typesense - Full-Text Search

Dedicated search engine for text queries with typo tolerance and multi-language support.

**Responsibilities:**
- BM25 text search across product titles/descriptions
- Typo tolerance ("nikee" → "nike")
- Multi-locale support (uk, en, ru)
- Return relevance scores for ranking

### 3. Metarank (Personalized Ranking)

Open-source feature store and ranking service for real-time personalization.

**Responsibilities:**
- Rerank candidates using learned models (LightGBM/XGBoost)
- Combine BM25 scores with behavioral signals
- Real-time personalization based on user history
- Learn from clicks, add-to-cart, purchases

**Links:**
- GitHub: https://github.com/metarank/metarank
- Docs: https://docs.metarank.ai

---

## Database Schema

### PostgreSQL: Product Search Index

```sql
-- =============================================================
-- Listing Service: Product Search Index
-- Only facets and filters, no text content
-- =============================================================

CREATE TABLE product_search_index (
    -- Identity
    project_id uuid NOT NULL,
    product_id uuid PRIMARY KEY,

    -- =========================================================
    -- PRICE
    -- =========================================================
    min_price_minor bigint,              -- minimum variant price in cents
    max_price_minor bigint,              -- maximum variant price in cents

    -- =========================================================
    -- STOCK
    -- =========================================================
    in_stock boolean NOT NULL DEFAULT false,
    total_stock int NOT NULL DEFAULT 0,

    -- =========================================================
    -- FACETS (GIN indexed arrays)
    -- =========================================================

    -- Tag UUIDs for filtering
    tag_ids uuid[] DEFAULT '{}',

    -- Features as "slug:value" strings
    -- Example: ['brand:nike', 'material:leather', 'gender:men']
    feature_slugs text[] DEFAULT '{}',

    -- Options as "slug:value" strings
    -- Example: ['color:red', 'size:xl', 'size:l']
    option_slugs text[] DEFAULT '{}',

    -- All category IDs including parent categories
    category_ids uuid[] DEFAULT '{}',

    -- =========================================================
    -- SORTING SIGNALS
    -- =========================================================
    popularity_score float NOT NULL DEFAULT 0,   -- 0-1, from analytics
    published_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),

    -- =========================================================
    -- SYNC METADATA
    -- =========================================================
    updated_at timestamptz NOT NULL DEFAULT now(),

    -- =========================================================
    -- CONSTRAINTS
    -- =========================================================
    CONSTRAINT fk_product FOREIGN KEY (product_id)
        REFERENCES product(id) ON DELETE CASCADE
);

-- =============================================================
-- INDEXES
-- =============================================================

-- Project isolation (all queries filter by project_id)
CREATE INDEX idx_psi_project ON product_search_index (project_id);

-- GIN indexes for array containment/overlap queries
CREATE INDEX idx_psi_tags ON product_search_index USING GIN (tag_ids);
CREATE INDEX idx_psi_features ON product_search_index USING GIN (feature_slugs);
CREATE INDEX idx_psi_options ON product_search_index USING GIN (option_slugs);
CREATE INDEX idx_psi_categories ON product_search_index USING GIN (category_ids);

-- Price range queries
CREATE INDEX idx_psi_price_range ON product_search_index (project_id, min_price_minor, max_price_minor);

-- Stock availability filter (partial index for in-stock items)
CREATE INDEX idx_psi_in_stock ON product_search_index (project_id, in_stock)
    WHERE in_stock = true;

-- Sorting indexes
CREATE INDEX idx_psi_popularity ON product_search_index (project_id, popularity_score DESC);
CREATE INDEX idx_psi_published ON product_search_index (project_id, published_at DESC NULLS LAST);
CREATE INDEX idx_psi_price_asc ON product_search_index (project_id, min_price_minor ASC);
CREATE INDEX idx_psi_price_desc ON product_search_index (project_id, min_price_minor DESC);
CREATE INDEX idx_psi_created ON product_search_index (project_id, created_at DESC);
```

### Typesense: Product Text Collection

```json
{
  "name": "products",
  "fields": [
    {"name": "id", "type": "string"},
    {"name": "project_id", "type": "string", "facet": false},

    {"name": "title_uk", "type": "string", "locale": "uk"},
    {"name": "title_en", "type": "string", "locale": "en", "optional": true},
    {"name": "title_ru", "type": "string", "locale": "ru", "optional": true},

    {"name": "description_uk", "type": "string", "locale": "uk", "optional": true},
    {"name": "description_en", "type": "string", "locale": "en", "optional": true},
    {"name": "description_ru", "type": "string", "locale": "ru", "optional": true},

    {"name": "keywords", "type": "string", "optional": true}
  ],
  "token_separators": ["-", "_"],
  "symbols_to_index": ["&"]
}
```

---

## Query Flow

### Parallel Execution Strategy

```
Request: GET /products?q=nike&category=shoes&color=red&in_stock=true&locale=uk

t=0ms   ──┬── PostgreSQL: facet filtering starts
          └── Typesense: text search starts (parallel)

t=15ms ──── Typesense returns: 2,000 IDs + BM25 scores

t=20ms ──── PostgreSQL returns: 5,000 IDs matching filters
          │
t=21ms ──── Intersection: 800 IDs (present in both results)
          │
          ├── PostgreSQL: facet counts query starts (parallel)
          └── Metarank: personalized ranking starts (parallel)

t=35ms ──── Facet counts ready

t=50ms ──── Metarank returns: top 50 personalized IDs
          │
t=51ms ──── Response sent to client

Total: ~51ms (vs ~95ms sequential)
```

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│ 1. PARALLEL: PostgreSQL + Typesense                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   PostgreSQL                          Typesense                     │
│   ┌─────────────────────┐            ┌─────────────────────┐        │
│   │ SELECT product_id   │            │ POST /search        │        │
│   │ FROM psi            │            │ q: "nike"           │        │
│   │ WHERE               │            │ query_by: title_uk  │        │
│   │   category @> [X]   │            │ filter_by:          │        │
│   │   AND options @>    │            │   project_id: X     │        │
│   │     ['color:red']   │            │                     │        │
│   │   AND in_stock      │            │                     │        │
│   └─────────────────────┘            └─────────────────────┘        │
│            │                                   │                    │
│            ▼                                   ▼                    │
│   [id1,id2,id3,id4,id5...]          [id2,id3,id6,id7...] + scores  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 2. INTERSECTION                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   pgSet = new Set(pgIDs)                                            │
│   result = tsIDs.filter(id => pgSet.has(id))                        │
│                                                                     │
│   → [id2, id3] (preserves Typesense order by BM25)                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 3. PARALLEL: Facet Counts + Metarank                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   PostgreSQL                          Metarank                      │
│   ┌─────────────────────┐            ┌─────────────────────┐        │
│   │ SELECT              │            │ POST /rank/:model   │        │
│   │   unnest(tag_ids),  │            │ {                   │        │
│   │   count(*)          │            │   user: "user123",  │        │
│   │ FROM psi            │            │   session: "sess1", │        │
│   │ WHERE product_id    │            │   items: [...]      │        │
│   │   = ANY($matched)   │            │ }                   │        │
│   │ GROUP BY 1          │            │                     │        │
│   └─────────────────────┘            └─────────────────────┘        │
│            │                                   │                    │
│            ▼                                   ▼                    │
│   { tag_a: 15, tag_b: 8 }            [id3, id2] (personalized)     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 4. RESPONSE                                                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   {                                                                 │
│     "products": ["id3", "id2"],                                     │
│     "facets": {                                                     │
│       "tags": [{"id": "tag_a", "count": 15}, ...],                  │
│       "features": [...],                                            │
│       "options": [...]                                              │
│     },                                                              │
│     "total": 800                                                    │
│   }                                                                 │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Incremental Recall with Stop Condition

### Problem

Typesense returns only the first N candidates sorted by BM25. After intersection with PostgreSQL filters, we may end up with too few results, even though relevant products exist further down the Typesense ranking.

Example: User searches "nike red women" with filters. Typesense returns 2000 candidates, but only 50 pass PostgreSQL filters. Meanwhile, 500 more matching products exist at positions 2001-10000.

### Solution

Incrementally fetch pages from Typesense until we have enough results or hit a stop condition.

### Goal

- Retrieve at least `offset + limit` products after filtering
- Preserve correct BM25 ranking order
- Predictable execution time (50-120ms)
- No infinite loops or DDoS on Typesense

### Algorithm Parameters

```typescript
interface IncrementalRecallConfig {
  target: number;           // offset + limit (how many results needed)
  perPage: number;          // candidates per Typesense page (500-2000)
  maxPages: number;         // max pages to fetch (5-10)
  timeout: number;          // safety timeout in ms (50-100)
  stopEarlyFactor: number;  // density threshold (0.1-0.2)
}
```

### Algorithm Steps

#### Step 0: Prepare

```typescript
const pgSet = new Set(await queryPostgres(filters)); // Get all matching IDs from PostgreSQL
const matched: TypesenseHit[] = [];
let page = 1;
let candidateCount = 0;
const startTime = Date.now();
```

#### Step 1: Load First Page

```typescript
const tsResult = await typesense.search({ page: 1, per_page: perPage });
candidateCount += tsResult.hits.length;
const intersected = tsResult.hits.filter(hit => pgSet.has(hit.id));
matched.push(...intersected);
```

Check stop conditions.

#### Step 2: Main Loop

```typescript
while (!shouldStop()) {
  page++;
  const tsResult = await typesense.search({ page, per_page: perPage });

  if (tsResult.hits.length === 0) break; // Typesense exhausted

  candidateCount += tsResult.hits.length;
  const intersected = tsResult.hits.filter(hit => pgSet.has(hit.id));
  matched.push(...intersected);
}
```

### Stop Conditions

The loop stops when ANY of these conditions is met:

#### 1. Enough Results

```typescript
if (matched.length >= target) STOP;
```

#### 2. Typesense Exhausted

```typescript
if (hits.length < perPage) STOP; // Reached end of results
```

#### 3. Max Pages Reached

```typescript
if (page >= maxPages) STOP;
```

#### 4. Timeout Safety

```typescript
if (Date.now() - startTime > timeout) STOP;
```

#### 5. Adaptive Early Stop

If intersection density is high (many results per page), we can stop early:

```typescript
// If this page yielded lots of results, we likely have enough diversity
if (intersected.length >= perPage * stopEarlyFactor) {
  // High density - can stop if we have enough
  if (matched.length >= target * 1.5) STOP;
}
// If density is low, keep fetching more pages
```

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    Incremental Recall Flow                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   PostgreSQL                    Typesense                                │
│   ┌──────────────────┐         ┌──────────────────────────────────────┐ │
│   │ Get all matching │         │ Page 1: hits[0..999]     ──────┐     │ │
│   │ product IDs      │         │ Page 2: hits[1000..1999] ──────┼──┐  │ │
│   │                  │         │ Page 3: hits[2000..2999] ──────┼──┼─┐│ │
│   │ → pgSet (5000)   │         │ ...                            │  │ ││ │
│   └────────┬─────────┘         └────────────────────────────────┼──┼─┼┘ │
│            │                                                    │  │ │  │
│            └────────────────────────┬───────────────────────────┘  │ │  │
│                                     ▼                              │ │  │
│                              ┌─────────────┐                       │ │  │
│                              │ Intersect 1 │ ◄─────────────────────┘ │  │
│                              └──────┬──────┘                         │  │
│                                     │ matched += 80                  │  │
│                                     │                                │  │
│                                     │ matched.length < target?       │  │
│                                     │ YES → fetch next page          │  │
│                                     ▼                                │  │
│                              ┌─────────────┐                         │  │
│                              │ Intersect 2 │ ◄───────────────────────┘  │
│                              └──────┬──────┘                            │
│                                     │ matched += 65                     │
│                                     │                                   │
│                                     │ matched.length >= target?         │
│                                     │ YES → STOP                        │
│                                     ▼                                   │
│                              ┌─────────────┐                            │
│                              │ Result: 145 │                            │
│                              │ (sorted by  │                            │
│                              │  BM25 rank) │                            │
│                              └─────────────┘                            │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### TypeScript Implementation

```typescript
interface IncrementalRecallResult {
  hits: TypesenseHit[];
  metrics: {
    pagesLoaded: number;
    candidatesTotal: number;
    intersectionTotal: number;
    timeMs: number;
  };
}

async function incrementalRecall(
  req: SearchRequest,
  pgSet: Set<string>,
  config: IncrementalRecallConfig
): Promise<IncrementalRecallResult> {
  const { target, perPage, maxPages, timeout, stopEarlyFactor } = config;

  const matched: TypesenseHit[] = [];
  let page = 0;
  let candidateCount = 0;
  const startTime = Date.now();

  const queryBy = [`title_${req.locale}`, `description_${req.locale}`, 'keywords'].join(',');

  while (true) {
    page++;

    // Fetch next page from Typesense
    const tsResult = await typesense.collections('products').documents().search({
      q: req.query!,
      query_by: queryBy,
      filter_by: `project_id:${req.projectId}`,
      page,
      per_page: perPage,
      prefix: false,
    });

    const hits = (tsResult.hits ?? []).map(hit => ({
      id: hit.document.id as string,
      score: hit.text_match_info?.score ?? 0,
    }));

    candidateCount += hits.length;

    // Intersect with PostgreSQL set
    const intersected = hits.filter(hit => pgSet.has(hit.id));
    matched.push(...intersected);

    // Calculate density for adaptive stopping
    const density = hits.length > 0 ? intersected.length / hits.length : 0;

    // Stop Condition 1: Enough results
    if (matched.length >= target) break;

    // Stop Condition 2: Typesense exhausted
    if (hits.length < perPage) break;

    // Stop Condition 3: Max pages
    if (page >= maxPages) break;

    // Stop Condition 4: Timeout
    if (Date.now() - startTime > timeout) break;

    // Stop Condition 5: High density + buffer
    if (density >= stopEarlyFactor && matched.length >= target * 1.5) break;
  }

  return {
    hits: matched,
    metrics: {
      pagesLoaded: page,
      candidatesTotal: candidateCount,
      intersectionTotal: matched.length,
      timeMs: Date.now() - startTime,
    },
  };
}
```

### Integration with ListingService

```typescript
// In ListingService.search()

private async queryTypesenseIncremental(
  req: SearchRequest,
  pgSet: Set<string>,
  target: number
): Promise<{ hits: TypesenseHit[] }> {
  const config: IncrementalRecallConfig = {
    target,
    perPage: 1000,
    maxPages: 10,
    timeout: 100,
    stopEarlyFactor: 0.15,
  };

  const result = await this.incrementalRecall(req, pgSet, config);

  // Log metrics for monitoring
  this.logger.info({
    query: req.query,
    pages: result.metrics.pagesLoaded,
    candidates: result.metrics.candidatesTotal,
    matched: result.metrics.intersectionTotal,
    timeMs: result.metrics.timeMs,
  }, 'incremental_recall_complete');

  return { hits: result.hits };
}
```

### Metrics

```typescript
// Prometheus metrics
listing_recall_pages_total              // Total pages loaded
listing_recall_candidates_total         // Total Typesense candidates
listing_recall_intersection_total       // Matched after intersection
listing_recall_duration_ms              // Time spent in recall phase
listing_recall_density                  // Intersection/candidates ratio
listing_recall_stop_reason{reason}      // Why loop stopped (enough/exhausted/timeout/pages/density)
```

### Benefits

| Benefit | Description |
|---------|-------------|
| No lost results | Relevant products beyond first page are found |
| Bounded latency | Timeout and page limits prevent slow queries |
| Predictable load | Max candidates = perPage × maxPages |
| ML-friendly | Sufficient candidate diversity for Metarank |
| Observable | Metrics show recall behavior |

### Recommended Configuration

| Catalog Size | perPage | maxPages | timeout | stopEarlyFactor |
|--------------|---------|----------|---------|-----------------|
| < 10k | 500 | 5 | 50ms | 0.2 |
| 10k-100k | 1000 | 8 | 80ms | 0.15 |
| 100k-1M | 2000 | 10 | 100ms | 0.1 |
| > 1M | 2000 | 10 | 100ms | 0.1 + Redis cache |

---

## Sorting Strategy

| `sortBy` | Metarank | Typesense | PostgreSQL ORDER BY | Description |
|----------|----------|-----------|---------------------|-------------|
| `recommended` | ✅ Yes | ❌ No | `popularity_score DESC` | Personalized browsing, Metarank reranks top candidates |
| `relevance` | ✅ Yes | ✅ Yes | - | Text search + personalization: BM25 scores → Metarank |
| `price_asc` | ❌ No | ❌ No* | `min_price_minor ASC` | Strict price order |
| `price_desc` | ❌ No | ❌ No* | `min_price_minor DESC` | Strict price order |
| `newest` | ❌ No | ❌ No* | `published_at DESC` | Strict date order |
| `popularity` | ❌ No | ❌ No* | `popularity_score DESC` | Pre-computed popularity |

\* Typesense is still used if there's a text query, but only for filtering (intersection), not for ordering.

### Why not always use Metarank?

1. **User intent**: When user selects "Price: Low to High", they want exactly that
2. **Latency**: Metarank adds ~30ms, unnecessary for strict sorts
3. **Predictability**: Users expect consistent ordering when sorting by price/date

### Flow by sortBy

```
┌─────────────────────────────────────────────────────────────────┐
│                        sortBy = recommended                     │
├─────────────────────────────────────────────────────────────────┤
│  PostgreSQL (facets) ──────────────────┐                        │
│                                        ├──► Metarank ──► Result │
│  (no Typesense, no query)              │                        │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                  sortBy = relevance + query                     │
├─────────────────────────────────────────────────────────────────┤
│  PostgreSQL (facets) ───┐                                       │
│                         ├──► Intersect ──► Metarank ──► Result  │
│  Typesense (BM25) ──────┘                                       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                       sortBy = price_asc                        │
├─────────────────────────────────────────────────────────────────┤
│  PostgreSQL (facets + ORDER BY price) ─────────────────► Result │
│                                                                 │
│  (no Metarank, already sorted)                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                  sortBy = price_asc + query                     │
├─────────────────────────────────────────────────────────────────┤
│  PostgreSQL (facets) ───┐                                       │
│                         ├──► Intersect ──► Sort by price ──► Result
│  Typesense (filter) ────┘                                       │
│                                                                 │
│  (Typesense for filtering only, then re-sort by price)         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

- **Runtime**: Node.js
- **Database**: PostgreSQL + Knex.js (query builder)
- **Search**: Typesense
- **Ranking**: Metarank
- **Cache + Queue**: Redis + BullMQ
- **API**: GraphQL (Apollo Federation)
- **HTTP**: Fastify

---

## GraphQL Federation

Listing service exposes categories and product IDs. Full product data is resolved via Federation from Inventory service.

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Apollo Gateway                              │
│                    (Admin / Storefront API)                         │
└─────────────────────────────────────────────────────────────────────┘
                                │
          ┌─────────────────────┼─────────────────────┐
          ▼                     ▼                     ▼
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│ Listing Service │   │Inventory Service│   │  Other Services │
│                 │   │                 │   │                 │
│ • Categories    │   │ • Product       │   │ • Orders        │
│ • Search        │   │ • Variant       │   │ • Users         │
│ • Facets        │   │ • Pricing       │   │ • ...           │
│ • Product IDs   │   │ • Stock         │   │                 │
│   (references)  │   │ • Images        │   │                 │
└─────────────────┘   └─────────────────┘   └─────────────────┘
```

### Schema (Listing Service)

```graphql
# listing/schema.graphql

extend schema
  @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@key", "@external", "@requires", "@shareable"])

# =============================================================
# Product reference (resolved by Inventory service)
# =============================================================

type Product @key(fields: "id", resolvable: false) {
  id: ID!
}

# =============================================================
# Category
# =============================================================

type Category @key(fields: "id") {
  id: ID!
  slug: String!
  parentId: ID
  parent: Category
  children: [Category!]!

  # Listing with filters
  products(
    filter: ProductFilterInput
    sort: ProductSortInput
    pagination: PaginationInput
  ): ProductListingResult!
}

# =============================================================
# Search & Listing
# =============================================================

type Query {
  # Search products across all categories
  searchProducts(input: SearchProductsInput!): ProductListingResult!

  # Get category by ID or slug
  category(id: ID, slug: String): Category

  # Get category tree
  categories(parentId: ID): [Category!]!
}

# =============================================================
# Inputs
# =============================================================

input SearchProductsInput {
  query: String
  locale: Locale!
  categoryIds: [ID!]
  tagIds: [ID!]
  features: [String!]      # ["brand:nike", "material:leather"]
  options: [String!]       # ["color:red", "size:xl"]
  minPrice: Int
  maxPrice: Int
  inStock: Boolean
  sort: ProductSortInput
  pagination: PaginationInput
}

input ProductFilterInput {
  tagIds: [ID!]
  features: [String!]
  options: [String!]
  minPrice: Int
  maxPrice: Int
  inStock: Boolean
}

input ProductSortInput {
  field: ProductSortField!
  direction: SortDirection!
}

enum ProductSortField {
  RELEVANCE
  PRICE
  POPULARITY
  NEWEST
}

enum SortDirection {
  ASC
  DESC
}

input PaginationInput {
  limit: Int = 50
  offset: Int = 0
}

enum Locale {
  UK
  EN
  RU
}

# =============================================================
# Results
# =============================================================

type ProductListingResult {
  # Product IDs (resolved to full Product by Inventory via Federation)
  products: [Product!]!

  # Facet counts for filters UI
  facets: Facets!

  # Total count (for pagination)
  total: Int!
}

type Facets {
  tags: [FacetCount!]!
  features: [FacetCount!]!
  options: [FacetCount!]!
  categories: [FacetCount!]!
  priceRanges: [PriceRangeFacet!]!
}

type FacetCount {
  value: String!
  label: String
  count: Int!
}

type PriceRangeFacet {
  min: Int!
  max: Int!
  count: Int!
}
```

### Resolvers

```typescript
// graphql/resolvers.ts

import { Resolvers } from './generated/types';
import { ListingService } from '../listing.service';
import { Kernel } from '../kernel';

export function createResolvers(kernel: Kernel): Resolvers {
  const listingService = new ListingService(kernel);

  return {
    Query: {
      searchProducts: async (_, { input }, ctx) => {
        const result = await listingService.search({
          projectId: ctx.projectId,
          locale: input.locale.toLowerCase(),
          query: input.query,
          userId: ctx.userId,
          sessionId: ctx.sessionId,
          categoryIds: input.categoryIds,
          tagIds: input.tagIds,
          features: input.features,
          options: input.options,
          minPrice: input.minPrice,
          maxPrice: input.maxPrice,
          inStock: input.inStock,
          sortBy: mapSort(input.sort),
          limit: input.pagination?.limit ?? 50,
          offset: input.pagination?.offset ?? 0,
        });

        return {
          // Return product references (Federation resolves full data)
          products: result.productIds.map(id => ({ __typename: 'Product', id })),
          facets: result.facets,
          total: result.total,
        };
      },

      category: async (_, { id, slug }, ctx) => {
        return kernel.db('category')
          .where('project_id', ctx.projectId)
          .where(builder => {
            if (id) builder.where('id', id);
            if (slug) builder.where('slug', slug);
          })
          .whereNull('deleted_at')
          .first();
      },

      categories: async (_, { parentId }, ctx) => {
        return kernel.db('category')
          .where('project_id', ctx.projectId)
          .where('parent_id', parentId ?? null)
          .whereNull('deleted_at')
          .orderBy('sort_order');
      },
    },

    Category: {
      parent: async (category, _, ctx) => {
        if (!category.parent_id) return null;
        return kernel.db('category')
          .where('id', category.parent_id)
          .first();
      },

      children: async (category, _, ctx) => {
        return kernel.db('category')
          .where('parent_id', category.id)
          .whereNull('deleted_at')
          .orderBy('sort_order');
      },

      products: async (category, { filter, sort, pagination }, ctx) => {
        const result = await listingService.search({
          projectId: ctx.projectId,
          locale: ctx.locale,
          categoryIds: [category.id],
          tagIds: filter?.tagIds,
          features: filter?.features,
          options: filter?.options,
          minPrice: filter?.minPrice,
          maxPrice: filter?.maxPrice,
          inStock: filter?.inStock,
          sortBy: mapSort(sort),
          limit: pagination?.limit ?? 50,
          offset: pagination?.offset ?? 0,
        });

        return {
          products: result.productIds.map(id => ({ __typename: 'Product', id })),
          facets: result.facets,
          total: result.total,
        };
      },
    },

    // Federation: resolve Product references
    Product: {
      __resolveReference: (ref) => {
        // Return reference as-is, Inventory service will resolve
        return { id: ref.id };
      },
    },
  };
}

function mapSort(sort?: { field: string; direction: string }): string | undefined {
  if (!sort) return 'recommended';

  const field = sort.field.toLowerCase();
  const dir = sort.direction.toLowerCase();

  if (field === 'relevance') return 'relevance';
  if (field === 'price') return dir === 'asc' ? 'price_asc' : 'price_desc';
  if (field === 'popularity') return 'popularity';
  if (field === 'newest') return 'newest';

  return 'recommended';
}
```

### Apollo Server Setup

```typescript
// graphql/server.ts

import { ApolloServer } from '@apollo/server';
import { buildSubgraphSchema } from '@apollo/subgraph';
import { fastifyApolloDrainPlugin } from '@as-integrations/fastify';
import { gql } from 'graphql-tag';
import { readFileSync } from 'fs';
import { createResolvers } from './resolvers';
import { Kernel } from '../kernel';

export async function createGraphQLServer(kernel: Kernel, app: FastifyInstance) {
  const typeDefs = gql(readFileSync('./schema.graphql', 'utf-8'));
  const resolvers = createResolvers(kernel);

  const server = new ApolloServer({
    schema: buildSubgraphSchema({ typeDefs, resolvers }),
    plugins: [fastifyApolloDrainPlugin(app)],
  });

  await server.start();

  return server;
}
```

### Example Queries

**Storefront: Search with facets**
```graphql
query SearchProducts($input: SearchProductsInput!) {
  searchProducts(input: $input) {
    products {
      id
      # These fields resolved by Inventory service via Federation:
      title
      slug
      images { url }
      price { amount currency }
      inStock
    }
    facets {
      tags { value label count }
      features { value count }
      options { value count }
      priceRanges { min max count }
    }
    total
  }
}
```

**Storefront: Category page**
```graphql
query CategoryPage($slug: String!, $filter: ProductFilterInput, $pagination: PaginationInput) {
  category(slug: $slug) {
    id
    slug
    children { id slug }

    products(filter: $filter, pagination: $pagination) {
      products {
        id
        title
        price { amount }
      }
      facets {
        options { value count }
      }
      total
    }
  }
}
```

**Admin: Manage categories**
```graphql
# Admin mutations would be in a separate admin schema
mutation CreateCategory($input: CreateCategoryInput!) {
  createCategory(input: $input) {
    id
    slug
  }
}
```

### Federation Flow

```
1. Client → Gateway: searchProducts(query: "nike")

2. Gateway → Listing:
   searchProducts returns { products: [{ id: "p1" }, { id: "p2" }], facets, total }

3. Gateway → Inventory (Federation):
   Resolves Product entities by IDs
   Returns full product data (title, images, price, etc.)

4. Gateway → Client:
   Merged response with full product data + facets
```

---

## Node.js Implementation

### Types

```typescript
// types.ts

export interface SearchRequest {
  projectId: string;
  locale: 'uk' | 'en' | 'ru';

  // Text search
  query?: string;

  // Personalization (for Metarank)
  userId?: string;
  sessionId?: string;

  // Facet filters
  categoryIds?: string[];
  tagIds?: string[];
  features?: string[];      // ['brand:nike', 'material:leather']
  options?: string[];       // ['color:red', 'size:xl']

  // Range filters
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;

  // Sorting
  // - recommended: Metarank personalization (default)
  // - relevance: BM25 + Metarank (when query present)
  // - price_asc/price_desc/newest: strict DB sort, no Metarank
  sortBy?: 'recommended' | 'relevance' | 'price_asc' | 'price_desc' | 'popularity' | 'newest';

  // Pagination
  limit?: number;
  offset?: number;
}

export interface SearchResponse {
  productIds: string[];
  facets: FacetResults;
  total: number;
}

export interface FacetResults {
  tags: FacetCount[];
  features: FacetCount[];
  options: FacetCount[];
  categories: FacetCount[];
  priceRanges: PriceRangeFacet[];
}

export interface FacetCount {
  value: string;
  count: number;
}

export interface PriceRangeFacet {
  min: number;
  max: number;
  count: number;
}

export interface TypesenseHit {
  id: string;
  score: number;
}

// Metarank API types
// See: https://docs.metarank.ai/reference/api

export interface MetarankItem {
  id: string;
  // Feature values extracted from product
  price?: number;
  popularity?: number;
  bm25_score?: number;
  in_stock?: boolean;
  // Add more features as needed
}

export interface MetarankRankRequest {
  user?: string;           // User ID for personalization
  session?: string;        // Session ID
  items: MetarankItem[];   // Items to rank
}

export interface MetarankRankResponse {
  items: Array<{
    id: string;
    score: number;
  }>;
  took: number;
}
```

### Kernel (Dependency Container)

```typescript
// kernel/index.ts

import Knex from 'knex';
import { Redis } from 'ioredis';
import { Queue } from 'bullmq';
import Typesense from 'typesense';
import pino from 'pino';

export interface Kernel {
  db: Knex;
  redis: Redis;
  syncQueue: Queue;
  typesense: Typesense.Client;
  metarankUrl: string;
  metarankModel: string;
  logger: pino.Logger;
}

export async function createKernel(): Promise<Kernel> {
  const db = Knex({
    client: 'pg',
    connection: process.env.DATABASE_URL,
    pool: { min: 2, max: 20 },
  });

  const redis = new Redis(process.env.REDIS_URL);

  const typesense = new Typesense.Client({
    nodes: [{
      host: process.env.TYPESENSE_HOST ?? 'localhost',
      port: 8108,
      protocol: 'http'
    }],
    apiKey: process.env.TYPESENSE_API_KEY!,
  });

  return {
    db,
    redis,
    syncQueue: new Queue('sync', { connection: redis }),
    typesense,
    metarankUrl: process.env.METARANK_URL ?? 'http://localhost:8080',
    metarankModel: process.env.METARANK_MODEL ?? 'xgboost',
    logger: pino(),
  };
}

export async function destroyKernel(kernel: Kernel): Promise<void> {
  await kernel.syncQueue.close();
  await kernel.redis.quit();
  await kernel.db.destroy();
}
```

### Listing Service

```typescript
// listing.service.ts

import { Knex } from 'knex';
import Typesense from 'typesense';
import axios from 'axios';
import { Kernel } from './kernel';
import {
  SearchRequest,
  SearchResponse,
  FacetResults,
  TypesenseHit,
  MetarankItem,
  MetarankRankRequest,
  MetarankRankResponse,
} from './types';

export class ListingService {
  private db: Knex;
  private typesense: Typesense.Client;
  private metarankUrl: string;
  private metarankModel: string;

  constructor(kernel: Kernel) {
    this.db = kernel.db;
    this.typesense = kernel.typesense;
    this.metarankUrl = kernel.metarankUrl;
    this.metarankModel = kernel.metarankModel;
  }

  async search(req: SearchRequest): Promise<SearchResponse> {
    const limit = req.limit ?? 50;
    const hasTextQuery = !!req.query?.trim();

    // =========================================================
    // PHASE 1: Parallel PostgreSQL + Typesense
    // =========================================================

    const [pgResult, tsResult] = await Promise.all([
      this.queryPostgres(req),
      hasTextQuery ? this.queryTypesense(req) : null,
    ]);

    const pgIds = pgResult.productIds;
    const pgIdSet = new Set(pgIds);

    // =========================================================
    // PHASE 2: Intersection
    // =========================================================

    let matchedIds: string[];
    let scores: Record<string, number> = {};

    if (hasTextQuery && tsResult) {
      // Intersect: keep Typesense order (by BM25 score)
      matchedIds = [];
      for (const hit of tsResult.hits) {
        if (pgIdSet.has(hit.id)) {
          matchedIds.push(hit.id);
          scores[hit.id] = hit.score;
        }
      }
    } else {
      // No text query: use PostgreSQL results only
      matchedIds = pgIds;
    }

    if (matchedIds.length === 0) {
      return {
        productIds: [],
        facets: this.emptyFacets(),
        total: 0,
      };
    }

    // =========================================================
    // PHASE 3: Re-sort if needed (for price/date + query)
    // =========================================================

    // When sorting by price/date with a query, we need to re-fetch
    // from PostgreSQL with proper ORDER BY, using matched IDs as filter
    let sortedIds = matchedIds;
    if (hasTextQuery && this.needsResort(req.sortBy)) {
      sortedIds = await this.resortByField(req.projectId, matchedIds, req.sortBy!);
    }

    // =========================================================
    // PHASE 4: Parallel Facet Counts + Ranking
    // =========================================================

    const useMetarank = this.shouldUseMetarank(req.sortBy, hasTextQuery);

    const [facets, rankedIds] = await Promise.all([
      this.getFacetCounts(req.projectId, matchedIds),
      useMetarank
        ? this.rankWithMetarank(req, sortedIds, scores, limit)
        : sortedIds.slice(0, limit),
    ]);

    return {
      productIds: rankedIds,
      facets,
      total: matchedIds.length,
    };
  }

  // ===========================================================
  // PostgreSQL: Facet Filtering (Knex)
  // ===========================================================

  private async queryPostgres(
    req: SearchRequest
  ): Promise<{ productIds: string[] }> {
    let query = this.db('product_search_index')
      .select('product_id')
      .where('project_id', req.projectId);

    // Category filter (ANY - overlap)
    if (req.categoryIds?.length) {
      query = query.whereRaw('category_ids && ?::uuid[]', [req.categoryIds]);
    }

    // Tag filter (ANY - overlap)
    if (req.tagIds?.length) {
      query = query.whereRaw('tag_ids && ?::uuid[]', [req.tagIds]);
    }

    // Feature filter (ALL - contains)
    if (req.features?.length) {
      query = query.whereRaw('feature_slugs @> ?::text[]', [req.features]);
    }

    // Option filter (ANY - overlap)
    if (req.options?.length) {
      query = query.whereRaw('option_slugs && ?::text[]', [req.options]);
    }

    // Price range
    if (req.minPrice !== undefined) {
      query = query.where('min_price_minor', '>=', req.minPrice);
    }
    if (req.maxPrice !== undefined) {
      query = query.where('min_price_minor', '<=', req.maxPrice);
    }

    // Stock filter
    if (req.inStock === true) {
      query = query.where('in_stock', true);
    }

    // ORDER BY
    const [orderCol, orderDir] = this.getOrderBy(req.sortBy);
    query = query.orderByRaw(`${orderCol} ${orderDir} NULLS LAST`);
    query = query.limit(10000);

    const rows = await query;
    return {
      productIds: rows.map((r: any) => r.product_id),
    };
  }

  private getOrderBy(sortBy?: string): [string, string] {
    switch (sortBy) {
      case 'price_asc':
        return ['min_price_minor', 'ASC'];
      case 'price_desc':
        return ['min_price_minor', 'DESC'];
      case 'newest':
        return ['published_at', 'DESC'];
      case 'popularity':
      default:
        return ['popularity_score', 'DESC'];
    }
  }

  // ===========================================================
  // Typesense: Full-Text Search
  // ===========================================================

  private async queryTypesense(
    req: SearchRequest
  ): Promise<{ hits: TypesenseHit[] }> {
    const queryBy = [
      `title_${req.locale}`,
      `description_${req.locale}`,
      'keywords',
    ].join(',');

    const result = await this.typesense
      .collections('products')
      .documents()
      .search({
        q: req.query!,
        query_by: queryBy,
        filter_by: `project_id:${req.projectId}`,
        per_page: 10000,
        prefix: false,
        typo_tokens_threshold: 1,
      });

    const hits: TypesenseHit[] = (result.hits ?? []).map((hit) => ({
      id: hit.document.id as string,
      score: hit.text_match_info?.score ?? 0,
    }));

    return { hits };
  }

  // ===========================================================
  // PostgreSQL: Facet Counts
  // ===========================================================

  private async getFacetCounts(
    projectId: string,
    productIds: string[]
  ): Promise<FacetResults> {
    if (productIds.length === 0) {
      return this.emptyFacets();
    }

    // Run all facet queries in parallel
    const [tags, features, options, categories, priceRanges] =
      await Promise.all([
        this.countFacet(projectId, productIds, 'tag_ids'),
        this.countFacet(projectId, productIds, 'feature_slugs'),
        this.countFacet(projectId, productIds, 'option_slugs'),
        this.countFacet(projectId, productIds, 'category_ids'),
        this.countPriceRanges(projectId, productIds),
      ]);

    return { tags, features, options, categories, priceRanges };
  }

  private async countFacet(
    projectId: string,
    productIds: string[],
    column: string
  ): Promise<{ value: string; count: number }[]> {
    const rows = await this.db.raw(`
      SELECT value, count(*)::int as count
      FROM product_search_index, unnest(${column}) AS value
      WHERE project_id = ? AND product_id = ANY(?)
      GROUP BY value
      ORDER BY count DESC
      LIMIT 100
    `, [projectId, productIds]);

    return rows.rows;
  }

  private async countPriceRanges(
    projectId: string,
    productIds: string[]
  ): Promise<{ min: number; max: number; count: number }[]> {
    const rows = await this.db.raw(`
      SELECT
        floor(min_price_minor / 100000) * 100000 as range_min,
        floor(min_price_minor / 100000) * 100000 + 99999 as range_max,
        count(*)::int as count
      FROM product_search_index
      WHERE project_id = ?
        AND product_id = ANY(?)
        AND min_price_minor IS NOT NULL
      GROUP BY range_min, range_max
      ORDER BY range_min
    `, [projectId, productIds]);

    return rows.rows.map((r: any) => ({
      min: r.range_min,
      max: r.range_max,
      count: r.count,
    }));
  }

  // ===========================================================
  // Metarank: Personalized Ranking
  // ===========================================================

  private async rankWithMetarank(
    req: SearchRequest,
    productIds: string[],
    scores: Record<string, number>,
    limit: number
  ): Promise<string[]> {
    // Take top candidates for ranking
    const candidates = productIds.slice(0, 500);

    // Build Metarank items with features
    const items: MetarankItem[] = candidates.map((id) => ({
      id,
      bm25_score: scores[id] ?? 0,
      // Add more features from cache/db if needed
    }));

    try {
      const response = await axios.post<MetarankRankResponse>(
        `${this.metarankUrl}/rank/${this.metarankModel}`,
        {
          user: req.userId,       // Optional: for personalization
          session: req.sessionId, // Optional: session-based features
          items,
        } as MetarankRankRequest,
        { timeout: 5000 }
      );

      return response.data.items
        .slice(0, limit)
        .map((item) => item.id);
    } catch (error) {
      // Fallback: return by BM25 score
      console.error('Metarank failed, falling back to BM25:', error);
      return candidates.slice(0, limit);
    }
  }

  // ===========================================================
  // Helpers
  // ===========================================================

  /**
   * Determine if Metarank should be used for ranking.
   *
   * Use Metarank when:
   * - sortBy is 'recommended' (personalized browsing)
   * - sortBy is 'relevance' AND there's a search query
   *
   * Don't use Metarank when:
   * - sortBy is price_asc/price_desc (user wants strict price order)
   * - sortBy is newest (user wants strict date order)
   * - sortBy is popularity (use pre-computed score)
   */
  private shouldUseMetarank(
    sortBy: string | undefined,
    hasTextQuery: boolean
  ): boolean {
    const sort = sortBy ?? 'recommended';

    switch (sort) {
      case 'recommended':
        return true;  // Always personalize for recommended
      case 'relevance':
        return hasTextQuery;  // BM25 + Metarank when searching
      case 'price_asc':
      case 'price_desc':
      case 'newest':
      case 'popularity':
        return false;  // Strict sorting, no personalization
      default:
        return false;
    }
  }

  /**
   * Check if we need to re-sort after Typesense intersection.
   * Needed when user wants strict ordering (price, date) but also has a query.
   */
  private needsResort(sortBy: string | undefined): boolean {
    return ['price_asc', 'price_desc', 'newest', 'popularity'].includes(sortBy ?? '');
  }

  /**
   * Re-fetch product IDs from PostgreSQL with proper ORDER BY.
   * Used when we have intersection results but need strict sorting.
   */
  private async resortByField(
    projectId: string,
    productIds: string[],
    sortBy: string
  ): Promise<string[]> {
    if (productIds.length === 0) return [];

    const orderBy = this.getOrderByClause(sortBy);

    const result = await this.db.query(
      `SELECT product_id
       FROM product_search_index
       WHERE project_id = $1 AND product_id = ANY($2)
       ORDER BY ${orderBy}`,
      [projectId, productIds]
    );

    return result.rows.map((r) => r.product_id);
  }

  private getOrderByClause(sortBy: string): string {
    switch (sortBy) {
      case 'price_asc':
        return 'min_price_minor ASC NULLS LAST';
      case 'price_desc':
        return 'min_price_minor DESC NULLS LAST';
      case 'newest':
        return 'published_at DESC NULLS LAST';
      case 'popularity':
        return 'popularity_score DESC';
      default:
        return 'popularity_score DESC';
    }
  }

  private emptyFacets(): FacetResults {
    return {
      tags: [],
      features: [],
      options: [],
      categories: [],
      priceRanges: [],
    };
  }
}
```

### Sync Service

```typescript
// sync.service.ts

import { Knex } from 'knex';
import Typesense from 'typesense';
import { Kernel } from './kernel';

interface ProductText {
  product_id: string;
  project_id: string;
  locale: string;
  title: string;
  description?: string;
  keywords?: string;
}

export class SyncService {
  private db: Knex;
  private typesense: Typesense.Client;

  constructor(kernel: Kernel) {
    this.db = kernel.db;
    this.typesense = kernel.typesense;
  }

  // ===========================================================
  // Sync Product to Search Index (PostgreSQL)
  // ===========================================================

  async syncProductIndex(productId: string): Promise<void> {
    await this.db.raw(`
      INSERT INTO product_search_index (
        project_id, product_id,
        min_price_minor, max_price_minor,
        in_stock, total_stock,
        tag_ids, feature_slugs, option_slugs, category_ids,
        popularity_score, published_at, updated_at
      )
      SELECT
        p.project_id,
        p.id,

        -- Prices from variants
        (SELECT MIN(vpc.amount_minor)
         FROM variant_prices_current vpc
         JOIN variant v ON v.id = vpc.variant_id
         WHERE v.product_id = p.id AND v.deleted_at IS NULL),

        (SELECT MAX(vpc.amount_minor)
         FROM variant_prices_current vpc
         JOIN variant v ON v.id = vpc.variant_id
         WHERE v.product_id = p.id AND v.deleted_at IS NULL),

        -- Stock
        EXISTS(
          SELECT 1 FROM warehouse_stock ws
          JOIN variant v ON v.id = ws.variant_id
          WHERE v.product_id = p.id
            AND v.deleted_at IS NULL
            AND ws.quantity_on_hand > 0
        ),

        COALESCE((
          SELECT SUM(ws.quantity_on_hand)::int
          FROM warehouse_stock ws
          JOIN variant v ON v.id = ws.variant_id
          WHERE v.product_id = p.id AND v.deleted_at IS NULL
        ), 0),

        -- Tags
        COALESCE((
          SELECT array_agg(pt.tag_id)
          FROM product_tags pt
          WHERE pt.product_id = p.id
        ), '{}'),

        -- Features as slug:value
        COALESCE((
          SELECT array_agg(pf.slug || ':' || pfv.slug)
          FROM product_feature pf
          JOIN product_feature_value pfv ON pfv.feature_id = pf.id
          WHERE pf.product_id = p.id
        ), '{}'),

        -- Options as slug:value
        COALESCE((
          SELECT array_agg(DISTINCT po.slug || ':' || pov.slug)
          FROM variant v
          JOIN product_option_variant_link povl ON povl.variant_id = v.id
          JOIN product_option po ON po.id = povl.option_id
          JOIN product_option_value pov ON pov.id = povl.option_value_id
          WHERE v.product_id = p.id AND v.deleted_at IS NULL
        ), '{}'),

        -- Categories (including parents via recursive CTE)
        COALESCE((
          SELECT array_agg(DISTINCT cat_id)
          FROM (
            SELECT ci.category_id as cat_id FROM category_item ci WHERE ci.product_id = p.id
            UNION
            SELECT c.parent_id as cat_id FROM category_item ci
            JOIN category c ON c.id = ci.category_id
            WHERE ci.product_id = p.id AND c.parent_id IS NOT NULL
          ) all_cats
        ), '{}'),

        -- Popularity (placeholder - implement based on analytics)
        0.5,

        p.published_at,
        now()

      FROM product p
      WHERE p.id = ? AND p.deleted_at IS NULL

      ON CONFLICT (product_id) DO UPDATE SET
        min_price_minor = EXCLUDED.min_price_minor,
        max_price_minor = EXCLUDED.max_price_minor,
        in_stock = EXCLUDED.in_stock,
        total_stock = EXCLUDED.total_stock,
        tag_ids = EXCLUDED.tag_ids,
        feature_slugs = EXCLUDED.feature_slugs,
        option_slugs = EXCLUDED.option_slugs,
        category_ids = EXCLUDED.category_ids,
        popularity_score = EXCLUDED.popularity_score,
        published_at = EXCLUDED.published_at,
        updated_at = now()
    `, [productId]);
  }

  // ===========================================================
  // Sync Product to Typesense (text only)
  // ===========================================================

  async syncProductText(productId: string): Promise<void> {
    const texts = await this.db('product_translations as pt')
      .join('product as p', 'p.id', 'pt.product_id')
      .select(
        'pt.product_id',
        'p.project_id',
        'pt.locale',
        'pt.title',
        'pt.description',
        'pt.keywords'
      )
      .where('pt.product_id', productId)
      .whereNull('p.deleted_at') as ProductText[];

    if (texts.length === 0) {
      // Product deleted - remove from Typesense
      try {
        await this.typesense.collections('products').documents(productId).delete();
      } catch {
        // Ignore if not found
      }
      return;
    }

    const projectId = texts[0].project_id;

    // Build document with all locales
    const doc: Record<string, any> = {
      id: productId,
      project_id: projectId,
    };

    for (const t of texts) {
      doc[`title_${t.locale}`] = t.title;
      if (t.description) {
        doc[`description_${t.locale}`] = t.description;
      }
      if (t.keywords) {
        doc['keywords'] = t.keywords;
      }
    }

    await this.typesense.collections('products').documents().upsert(doc);
  }

  // ===========================================================
  // Full Sync (both PostgreSQL index + Typesense)
  // ===========================================================

  async syncProduct(productId: string): Promise<void> {
    await Promise.all([
      this.syncProductIndex(productId),
      this.syncProductText(productId),
    ]);
  }

  // ===========================================================
  // Delete from both
  // ===========================================================

  async deleteProduct(productId: string): Promise<void> {
    await Promise.all([
      this.db('product_search_index').where('product_id', productId).delete(),
      this.typesense
        .collections('products')
        .documents(productId)
        .delete()
        .catch(() => {}),
    ]);
  }

  // ===========================================================
  // Batch Sync (for initial load or recovery)
  // ===========================================================

  async syncAllProducts(projectId: string, batchSize = 100): Promise<void> {
    let offset = 0;

    while (true) {
      const rows = await this.db('product')
        .select('id')
        .where('project_id', projectId)
        .whereNull('deleted_at')
        .orderBy('id')
        .limit(batchSize)
        .offset(offset);

      if (rows.length === 0) break;

      await Promise.all(rows.map((row) => this.syncProduct(row.id)));

      offset += batchSize;
      console.log(`Synced ${offset} products...`);
    }
  }
}
```

### Database Triggers (Optional)

```sql
-- =============================================================
-- Triggers for automatic sync
-- Call these from application or use pg_notify + worker
-- =============================================================

-- Notify function
CREATE OR REPLACE FUNCTION notify_product_change()
RETURNS TRIGGER AS $$
DECLARE
  product_id uuid;
BEGIN
  -- Get product_id from different tables
  IF TG_TABLE_NAME = 'product' THEN
    product_id := COALESCE(NEW.id, OLD.id);
  ELSIF TG_TABLE_NAME = 'variant' THEN
    product_id := COALESCE(NEW.product_id, OLD.product_id);
  ELSIF TG_TABLE_NAME IN ('item_pricing', 'warehouse_stock') THEN
    SELECT v.product_id INTO product_id
    FROM variant v
    WHERE v.id = COALESCE(NEW.variant_id, OLD.variant_id);
  ELSIF TG_TABLE_NAME IN ('product_feature', 'product_option', 'category_item', 'product_tags') THEN
    product_id := COALESCE(NEW.product_id, OLD.product_id);
  ELSIF TG_TABLE_NAME = 'product_translations' THEN
    product_id := COALESCE(NEW.product_id, OLD.product_id);
  END IF;

  -- Send notification
  IF product_id IS NOT NULL THEN
    PERFORM pg_notify('product_changed', product_id::text);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to relevant tables
CREATE TRIGGER trg_product_change AFTER INSERT OR UPDATE OR DELETE ON product
FOR EACH ROW EXECUTE FUNCTION notify_product_change();

CREATE TRIGGER trg_variant_change AFTER INSERT OR UPDATE OR DELETE ON variant
FOR EACH ROW EXECUTE FUNCTION notify_product_change();

CREATE TRIGGER trg_pricing_change AFTER INSERT OR UPDATE OR DELETE ON item_pricing
FOR EACH ROW EXECUTE FUNCTION notify_product_change();

CREATE TRIGGER trg_stock_change AFTER INSERT OR UPDATE OR DELETE ON warehouse_stock
FOR EACH ROW EXECUTE FUNCTION notify_product_change();

CREATE TRIGGER trg_feature_change AFTER INSERT OR UPDATE OR DELETE ON product_feature
FOR EACH ROW EXECUTE FUNCTION notify_product_change();

CREATE TRIGGER trg_feature_value_change AFTER INSERT OR UPDATE OR DELETE ON product_feature_value
FOR EACH ROW EXECUTE FUNCTION notify_product_change();

CREATE TRIGGER trg_option_change AFTER INSERT OR UPDATE OR DELETE ON product_option
FOR EACH ROW EXECUTE FUNCTION notify_product_change();

CREATE TRIGGER trg_category_item_change AFTER INSERT OR UPDATE OR DELETE ON category_item
FOR EACH ROW EXECUTE FUNCTION notify_product_change();

CREATE TRIGGER trg_translation_change AFTER INSERT OR UPDATE OR DELETE ON product_translations
FOR EACH ROW EXECUTE FUNCTION notify_product_change();
```

### Notification Listener (Node.js)

```typescript
// sync.worker.ts

import { Client } from 'pg';
import { SyncService } from './sync.service';

export class SyncWorker {
  private client: Client;
  private debounceMap = new Map<string, NodeJS.Timeout>();
  private debounceMs = 500;

  constructor(
    private connectionString: string,
    private syncService: SyncService
  ) {
    this.client = new Client({ connectionString });
  }

  async start(): Promise<void> {
    await this.client.connect();
    await this.client.query('LISTEN product_changed');

    this.client.on('notification', (msg) => {
      if (msg.channel === 'product_changed' && msg.payload) {
        this.handleProductChange(msg.payload);
      }
    });

    console.log('Sync worker started, listening for product changes...');
  }

  private handleProductChange(productId: string): void {
    // Debounce: wait for rapid changes to settle
    const existing = this.debounceMap.get(productId);
    if (existing) {
      clearTimeout(existing);
    }

    const timeout = setTimeout(async () => {
      this.debounceMap.delete(productId);

      try {
        await this.syncService.syncProduct(productId);
        console.log(`Synced product ${productId}`);
      } catch (error) {
        console.error(`Failed to sync product ${productId}:`, error);
        // TODO: Add to retry queue
      }
    }, this.debounceMs);

    this.debounceMap.set(productId, timeout);
  }

  async stop(): Promise<void> {
    await this.client.end();
  }
}
```

---

## Job Queue (BullMQ + Redis)

For reliable event processing with retries, use BullMQ with your existing Redis.

### Queue Setup

```typescript
// queue/sync.queue.ts

import { Queue, Worker, Job } from 'bullmq';
import { Kernel } from '../kernel';
import { SyncService } from '../sync.service';

// Job types
interface SyncProductJob {
  productId: string;
}

interface SyncAllJob {
  projectId: string;
}

type SyncJobData = SyncProductJob | SyncAllJob;

export function createSyncQueue(kernel: Kernel): Queue<SyncJobData> {
  return new Queue('sync', {
    connection: kernel.redis,
    defaultJobOptions: {
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 5000 },
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    },
  });
}

export function startSyncWorker(kernel: Kernel): Worker<SyncJobData> {
  const syncService = new SyncService(kernel);

  const worker = new Worker<SyncJobData>(
    'sync',
    async (job: Job<SyncJobData>) => {
      kernel.logger.info({ jobId: job.id, name: job.name }, 'processing job');

      switch (job.name) {
        case 'sync-product':
          await syncService.syncProduct((job.data as SyncProductJob).productId);
          break;

        case 'delete-product':
          await syncService.deleteProduct((job.data as SyncProductJob).productId);
          break;

        case 'sync-all':
          await syncService.syncAllProducts((job.data as SyncAllJob).projectId);
          break;
      }
    },
    {
      connection: kernel.redis,
      concurrency: 10,
    }
  );

  worker.on('completed', (job) => {
    kernel.logger.debug({ jobId: job.id }, 'job completed');
  });

  worker.on('failed', (job, err) => {
    kernel.logger.error({ jobId: job?.id, err: err.message }, 'job failed');
  });

  return worker;
}
```

### Adding Jobs

```typescript
// inventory/scripts/update-product.ts

export async function updateProduct(
  kernel: Kernel,
  productId: string,
  data: UpdateProductData
): Promise<void> {
  // Update in database
  await kernel.db('product').where('id', productId).update(data);

  // Add to sync queue with deduplication
  await kernel.syncQueue.add(
    'sync-product',
    { productId },
    {
      jobId: `sync:${productId}`,  // Deduplication key
      delay: 500,                   // Debounce: wait 500ms
    }
  );
}
```

### Queue Patterns

```typescript
// Deduplicate: same product won't be synced twice
await queue.add('sync-product', { productId }, {
  jobId: `sync:${productId}`,
});

// Debounce: wait 500ms before processing
await queue.add('sync-product', { productId }, {
  jobId: `sync:${productId}`,
  delay: 500,
});

// Priority: urgent sync
await queue.add('sync-product', { productId }, {
  priority: 1,  // 1 = highest
});

// Batch add
await queue.addBulk([
  { name: 'sync-product', data: { productId: '1' } },
  { name: 'sync-product', data: { productId: '2' } },
  { name: 'sync-product', data: { productId: '3' } },
]);

// Scheduled job (cron)
await queue.add('sync-all', { projectId }, {
  repeat: { cron: '0 3 * * *' },  // Every night at 3:00
});
```

### Rate Limiting

```typescript
const worker = new Worker('sync', processor, {
  connection: kernel.redis,
  concurrency: 10,
  limiter: {
    max: 100,       // Max 100 jobs
    duration: 1000, // Per second
  },
});
```

### Dashboard (Optional)

```typescript
// admin/queues.ts

import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { FastifyAdapter } from '@bull-board/fastify';

export function setupQueueDashboard(app: FastifyInstance, kernel: Kernel) {
  const serverAdapter = new FastifyAdapter();

  createBullBoard({
    queues: [new BullMQAdapter(kernel.syncQueue)],
    serverAdapter,
  });

  serverAdapter.setBasePath('/admin/queues');
  app.register(serverAdapter.registerPlugin(), { prefix: '/admin/queues' });
}
```

### Alternative: pg-boss (PostgreSQL only)

If you prefer not to use Redis for queues:

```typescript
import PgBoss from 'pg-boss';

const boss = new PgBoss(process.env.DATABASE_URL);
await boss.start();

// Add job
await boss.send('sync-product', { productId }, {
  singletonKey: productId,  // Deduplication
  retryLimit: 5,
});

// Worker
await boss.work('sync-product', { teamConcurrency: 10 }, async (job) => {
  await syncService.syncProduct(job.data.productId);
});
```

### Alternative: SQLite (Single process)

For simple single-process deployments:

```typescript
import BetterQueue from 'better-queue';
import SqliteStore from 'better-queue-sqlite';

const queue = new BetterQueue(
  async (task, done) => {
    try {
      await syncService.syncProduct(task.productId);
      done(null, task);
    } catch (err) {
      done(err);
    }
  },
  {
    store: new SqliteStore({ path: './data/queue.sqlite' }),
    concurrent: 10,
    maxRetries: 5,
  }
);

queue.push({ productId: '123' });
```

### Queue Options Comparison

| Feature | BullMQ (Redis) | pg-boss (PostgreSQL) | SQLite |
|---------|---------------|---------------------|--------|
| Persistence | ✅ | ✅ | ✅ |
| Distributed | ✅ | ✅ | ❌ Single process |
| Dashboard | ✅ Bull Board | ❌ | ❌ |
| Cron jobs | ✅ | ✅ | ❌ |
| Rate limiting | ✅ | ✅ | ❌ |
| Deduplication | ✅ jobId | ✅ singletonKey | ❌ Manual |
| Extra infra | Redis | None | None |

---

## Metarank Integration

### Feedback Events

Metarank learns from user interactions. Send these events to train the ranking model:

```typescript
// metarank.events.ts

import axios from 'axios';

export class MetarankEvents {
  constructor(private metarankUrl: string) {}

  // When user views search results
  async trackRanking(
    user: string | undefined,
    session: string,
    items: string[],
    query?: string
  ): Promise<void> {
    await axios.post(`${this.metarankUrl}/feedback`, {
      event: 'ranking',
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      user,
      session,
      fields: query ? [{ name: 'query', value: query }] : [],
      items: items.map((id, idx) => ({ id, position: idx + 1 })),
    });
  }

  // When user clicks on a product
  async trackClick(
    user: string | undefined,
    session: string,
    itemId: string,
    rankingId: string
  ): Promise<void> {
    await axios.post(`${this.metarankUrl}/feedback`, {
      event: 'interaction',
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      user,
      session,
      type: 'click',
      item: itemId,
      ranking: rankingId,
    });
  }

  // When user adds to cart
  async trackAddToCart(
    user: string | undefined,
    session: string,
    itemId: string,
    rankingId?: string
  ): Promise<void> {
    await axios.post(`${this.metarankUrl}/feedback`, {
      event: 'interaction',
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      user,
      session,
      type: 'cart',
      item: itemId,
      ranking: rankingId,
    });
  }

  // When user purchases
  async trackPurchase(
    user: string | undefined,
    session: string,
    itemIds: string[]
  ): Promise<void> {
    for (const itemId of itemIds) {
      await axios.post(`${this.metarankUrl}/feedback`, {
        event: 'interaction',
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        user,
        session,
        type: 'purchase',
        item: itemId,
      });
    }
  }
}
```

### Metarank Configuration

Example `config.yml` for Metarank:

```yaml
# metarank/config.yml

state:
  type: redis
  host: redis
  port: 6379

features:
  # Item features (from your data)
  - name: popularity
    type: number
    scope: item
    source: metadata.popularity

  - name: price
    type: number
    scope: item
    source: metadata.price

  - name: bm25_score
    type: number
    scope: item
    source: ranking.bm25_score

  # Interaction features (learned)
  - name: item_click_count
    type: interaction_count
    scope: item
    interaction: click

  - name: user_click_count
    type: interaction_count
    scope: user
    interaction: click

  - name: ctr
    type: rate
    scope: item
    top: click
    bottom: impression

models:
  xgboost:
    type: lambdamart
    backend: xgboost
    features:
      - popularity
      - price
      - bm25_score
      - item_click_count
      - ctr
    weights:
      click: 1
      cart: 3
      purchase: 5
```

### Docker Compose

```yaml
# docker-compose.yml

services:
  metarank:
    image: metarank/metarank:latest
    ports:
      - "8080:8080"
    volumes:
      - ./metarank/config.yml:/config.yml
    command: ["serve", "--config", "/config.yml"]
    depends_on:
      - redis

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

---

## Edge Cases

### 1. Empty Text Query

```typescript
if (!req.query?.trim()) {
  // Skip Typesense, use PostgreSQL results only
  matchedIds = pgIds;
  // Sort by specified field or popularity
}
```

### 2. Empty Intersection

```typescript
if (matchedIds.length === 0 && tsResult?.hits.length > 0) {
  // Text matches exist but none pass filters
  // Options:
  // a) Return empty results
  // b) Suggest removing filters
  // c) Return Typesense results with "filter mismatch" flag
}
```

### 3. Typesense Unavailable

```typescript
try {
  tsResult = await this.queryTypesense(req);
} catch (error) {
  console.error('Typesense unavailable:', error);
  // Fallback: use PostgreSQL ILIKE search (slower)
  tsResult = await this.fallbackTextSearch(req);
}
```

### 4. Metarank Unavailable

```typescript
try {
  rankedIds = await this.rankWithMetarank(req, productIds, scores, limit);
} catch (error) {
  console.error('Metarank unavailable:', error);
  // Fallback: return by BM25 score or popularity
  rankedIds = productIds.slice(0, limit);
}
```

---

## Performance Considerations

### PostgreSQL

1. **GIN indexes** are optimized for array containment (`@>`) and overlap (`&&`)
2. **Partial indexes** for common filters (`in_stock = true`)
3. **LIMIT 10000** on candidate retrieval to bound memory
4. **Connection pooling** with pg-pool

### Typesense

1. **per_page: 10000** - retrieve enough candidates for intersection
2. **prefix: false** - exact word matching for better precision
3. **filter_by project_id** - per-tenant isolation

### Intersection

1. Use `Set` for O(1) lookup
2. Preserve Typesense order (by BM25 score)
3. Memory efficient for up to 100k candidates

### Facet Counts

1. Run facet queries in parallel
2. LIMIT 100 per facet type
3. Consider caching for high-traffic queries

---

## Monitoring

### Key Metrics

```typescript
// Latency percentiles
listing_search_duration_ms{phase="postgres"}
listing_search_duration_ms{phase="typesense"}
listing_search_duration_ms{phase="intersection"}
listing_search_duration_ms{phase="facets"}
listing_search_duration_ms{phase="metarank"}
listing_search_duration_ms{phase="total"}

// Counts
listing_search_candidates{source="postgres"}
listing_search_candidates{source="typesense"}
listing_search_candidates{source="intersection"}

// Errors
listing_search_errors{phase="typesense"}
listing_search_errors{phase="metarank"}
```

---

## Future Improvements

1. **Caching**: Redis for hot facet counts and popular searches
2. **Query understanding**: Extract filters from natural language (e.g., "red nike under $100")
3. **A/B testing**: Compare Metarank models via feature flags
4. **Roaring bitmaps**: For 1M+ products, faster facet counts
5. **Vector search**: Add semantic search via Typesense vectors or pgvector
