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

### Listing Service

```typescript
// listing.service.ts

import { Pool } from 'pg';
import Typesense from 'typesense';
import axios from 'axios';
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
  constructor(
    private db: Pool,
    private typesense: Typesense.Client,
    private metarankUrl: string,      // e.g., 'http://metarank:8080'
    private metarankModel: string     // e.g., 'xgboost'
  ) {}

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
  // PostgreSQL: Facet Filtering
  // ===========================================================

  private async queryPostgres(
    req: SearchRequest
  ): Promise<{ productIds: string[] }> {
    const conditions: string[] = ['project_id = $1'];
    const params: any[] = [req.projectId];
    let paramIndex = 2;

    // Category filter (ANY)
    if (req.categoryIds?.length) {
      conditions.push(`category_ids && $${paramIndex}`);
      params.push(req.categoryIds);
      paramIndex++;
    }

    // Tag filter (ANY)
    if (req.tagIds?.length) {
      conditions.push(`tag_ids && $${paramIndex}`);
      params.push(req.tagIds);
      paramIndex++;
    }

    // Feature filter (ALL)
    if (req.features?.length) {
      conditions.push(`feature_slugs @> $${paramIndex}`);
      params.push(req.features);
      paramIndex++;
    }

    // Option filter (ANY)
    if (req.options?.length) {
      conditions.push(`option_slugs && $${paramIndex}`);
      params.push(req.options);
      paramIndex++;
    }

    // Price range
    if (req.minPrice !== undefined) {
      conditions.push(`min_price_minor >= $${paramIndex}`);
      params.push(req.minPrice);
      paramIndex++;
    }
    if (req.maxPrice !== undefined) {
      conditions.push(`max_price_minor <= $${paramIndex}`);
      params.push(req.maxPrice);
      paramIndex++;
    }

    // Stock filter
    if (req.inStock === true) {
      conditions.push('in_stock = true');
    }

    // Build ORDER BY
    let orderBy = 'popularity_score DESC';
    switch (req.sortBy) {
      case 'price_asc':
        orderBy = 'min_price_minor ASC NULLS LAST';
        break;
      case 'price_desc':
        orderBy = 'min_price_minor DESC NULLS LAST';
        break;
      case 'newest':
        orderBy = 'published_at DESC NULLS LAST';
        break;
      case 'popularity':
      default:
        orderBy = 'popularity_score DESC';
    }

    const query = `
      SELECT product_id
      FROM product_search_index
      WHERE ${conditions.join(' AND ')}
      ORDER BY ${orderBy}
      LIMIT 10000
    `;

    const result = await this.db.query(query, params);
    return {
      productIds: result.rows.map((r) => r.product_id),
    };
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
    const query = `
      SELECT value, count(*)::int as count
      FROM product_search_index, unnest(${column}) AS value
      WHERE project_id = $1 AND product_id = ANY($2)
      GROUP BY value
      ORDER BY count DESC
      LIMIT 100
    `;

    const result = await this.db.query(query, [projectId, productIds]);
    return result.rows;
  }

  private async countPriceRanges(
    projectId: string,
    productIds: string[]
  ): Promise<{ min: number; max: number; count: number }[]> {
    const query = `
      SELECT
        floor(min_price_minor / 100000) * 100000 as range_min,
        floor(min_price_minor / 100000) * 100000 + 99999 as range_max,
        count(*)::int as count
      FROM product_search_index
      WHERE project_id = $1
        AND product_id = ANY($2)
        AND min_price_minor IS NOT NULL
      GROUP BY range_min, range_max
      ORDER BY range_min
    `;

    const result = await this.db.query(query, [projectId, productIds]);
    return result.rows.map((r) => ({
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

import { Pool } from 'pg';
import Typesense from 'typesense';

interface ProductText {
  productId: string;
  projectId: string;
  locale: string;
  title: string;
  description?: string;
  keywords?: string;
}

export class SyncService {
  constructor(
    private db: Pool,
    private typesense: Typesense.Client
  ) {}

  // ===========================================================
  // Sync Product to Search Index (PostgreSQL)
  // ===========================================================

  async syncProductIndex(productId: string): Promise<void> {
    await this.db.query(
      `
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
      WHERE p.id = $1 AND p.deleted_at IS NULL

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
      `,
      [productId]
    );
  }

  // ===========================================================
  // Sync Product to Typesense (text only)
  // ===========================================================

  async syncProductText(productId: string): Promise<void> {
    const result = await this.db.query<ProductText>(
      `
      SELECT
        pt.product_id,
        p.project_id,
        pt.locale,
        pt.title,
        pt.description,
        pt.keywords
      FROM product_translations pt
      JOIN product p ON p.id = pt.product_id
      WHERE pt.product_id = $1 AND p.deleted_at IS NULL
      `,
      [productId]
    );

    if (result.rows.length === 0) {
      // Product deleted - remove from Typesense
      try {
        await this.typesense.collections('products').documents(productId).delete();
      } catch {
        // Ignore if not found
      }
      return;
    }

    const texts = result.rows;
    const projectId = texts[0].projectId;

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
      this.db.query('DELETE FROM product_search_index WHERE product_id = $1', [
        productId,
      ]),
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
      const result = await this.db.query(
        `SELECT id FROM product
         WHERE project_id = $1 AND deleted_at IS NULL
         ORDER BY id LIMIT $2 OFFSET $3`,
        [projectId, batchSize, offset]
      );

      if (result.rows.length === 0) break;

      await Promise.all(
        result.rows.map((row) => this.syncProduct(row.id))
      );

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
