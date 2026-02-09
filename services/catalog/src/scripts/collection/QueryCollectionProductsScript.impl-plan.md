# Implementation Plan: QueryCollectionProductsScript Refactor

## Overview

Refactor `QueryCollectionProductsScript` to implement:
1. Keyset-based pagination (replace in-memory pagination with SQL-level LIMIT)
2. Bidirectional pagination (first/after AND last/before)
3. Stable cursors that encode sortValue + productId
4. Efficient totalCount via separate COUNT query
5. Rule-based collection support with dynamic filtering

**Source file:** `/Users/phl/Projects/shopana-io/services/services/catalog/src/scripts/collection/QueryCollectionProductsScript.ts`

---

## Architecture Note: Dual Implementation

The admin API has **two code paths** for collection products:

| Collection Type | Code Path | Pagination | Reason |
|-----------------|-----------|------------|--------|
| **Manual** | `CollectionResolver.ts` (lines 188-298) | Simple cursor-by-productId | Bypasses search index; avoids timing issues in tests |
| **Rule** | `QueryCollectionProductsScript.ts` | Keyset cursor (this refactor) | Uses search index for dynamic filtering |

**Decision:** Manual collections in the admin API will continue using the simpler cursor-by-productId approach already implemented in `CollectionResolver.ts` (which already supports backward pagination). This refactor focuses on `QueryCollectionProductsScript` which handles:
- Rule-based collections (admin API)
- All collections (storefront API - when implemented)

---

## Step 1: Update DTO Types

**File:** `/Users/phl/Projects/shopana-io/services/services/catalog/src/scripts/collection/dto/index.ts`

Add backward pagination parameters to `CollectionProductsQueryParams`:

```typescript
export interface CollectionProductsQueryParams {
  collectionId: string;
  locale: string;
  // Forward pagination
  first?: number;
  after?: string;
  // Backward pagination (NEW)
  last?: number;
  before?: string;
  filters?: ProductFiltersInput;
  sort?: ProductSortInput;
  skipPublishCheck?: boolean;
  includeDrafts?: boolean;
}
```

**Changes:**
- Add `last?: number` for backward pagination
- Add `before?: string` for backward pagination cursor

---

## Step 1.5: Update CollectionResolver to Pass New Parameters (BLOCKING)

**File:** `/Users/phl/Projects/shopana-io/services/services/catalog/src/resolvers/admin/CollectionResolver.ts`

The resolver currently only passes `first` and `after` to `QueryCollectionProductsScript`. Update lines 303-334 to include `last` and `before`:

```typescript
// For rule collections, use the full query script
const { priceMinMinor, priceMaxMinor } = resolvePriceBounds(args.filters);

const result = await this.$ctx.kernel.runScript(QueryCollectionProductsScript, {
  collectionId: this.$props,
  locale: this.$ctx.locale ?? "uk",
  first: args.first ?? undefined,
  after: args.after ?? undefined,
  last: args.last ?? undefined,      // NEW - pass last for backward pagination
  before: args.before ?? undefined,  // NEW - pass before cursor
  skipPublishCheck: true,
  includeDrafts: true,
  filters: args.filters
    ? {
        facets: args.filters.facets ?? undefined,
        ranges:
          args.filters.ranges?.map((range) => ({
            facetSlug: range.facetSlug,
            min:
              range.min !== undefined && range.min !== null
                ? Number(range.min)
                : undefined,
            max:
              range.max !== undefined && range.max !== null
                ? Number(range.max)
                : undefined,
          })) ?? undefined,
        priceMinMinor,
        priceMaxMinor,
        inStock: args.filters.inStock ?? undefined,
      }
    : undefined,
  sort: {
    by: sortBy as "manual" | "price" | "newest" | "name",
    direction: sortDirection as "asc" | "desc",
  },
});
```

**Changes:**
- Add `last: args.last ?? undefined` (line ~307)
- Add `before: args.before ?? undefined` (line ~308)

---

## Step 2: Implement Cursor Helpers

**File:** `/Users/phl/Projects/shopana-io/services/services/catalog/src/scripts/collection/QueryCollectionProductsScript.ts`

### 2.1 Define Cursor Interface

Add near the top of the file, below the existing interfaces:

```typescript
type SortField = "manual" | "newest" | "name" | "price";

interface CursorData {
  /** Sort value at cursor position */
  sv: string | number | null;
  /** Product ID (tie-breaker) */
  id: string;
  /** Sort field used when cursor was created */
  sf: SortField;
  /** Sort direction used when cursor was created */
  sd: "asc" | "desc";
}
```

### 2.2 Implement New Cursor Encoding/Decoding with Type Validation

Replace the existing simple `encodeCursor`/`decodeCursor` methods:

```typescript
private encodeCursor(data: CursorData): string {
  return Buffer.from(JSON.stringify(data)).toString("base64url");
}

private decodeCursor(
  cursor: string,
  expectedSort: SortField,
  expectedDirection: "asc" | "desc"
): CursorData | null {
  try {
    const data = JSON.parse(
      Buffer.from(cursor, "base64url").toString("utf8")
    ) as CursorData;

    // Validate cursor structure - id is required
    if (typeof data.id !== "string" || !data.id) {
      return null;
    }

    // If sort field or direction changed, cursor is invalid
    if (data.sf !== expectedSort || data.sd !== expectedDirection) {
      return null;
    }

    // Validate sort value type based on sort field
    if (!this.validateSortValueType(data.sv, data.sf)) {
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

/**
 * Validate that the sort value has the correct type for the sort field.
 * - manual: string (lexo_rank) or null
 * - newest: string (ISO date) or null
 * - name: string
 * - price: number or null
 */
private validateSortValueType(sv: unknown, sf: SortField): boolean {
  switch (sf) {
    case "manual":
      // lexo_rank is string or null
      return sv === null || typeof sv === "string";

    case "newest":
      // ISO date string or null
      if (sv === null) return true;
      if (typeof sv !== "string") return false;
      // Basic ISO date validation
      return !Number.isNaN(Date.parse(sv));

    case "name":
      // name is always string (empty string for null names)
      return typeof sv === "string";

    case "price":
      // price is number or null
      return sv === null || typeof sv === "number";

    default:
      return false;
  }
}
```

### 2.3 Helper to Build Cursor from Row

```typescript
private buildCursorFromRow(
  row: {
    productId: string;
    createdAt: Date | null;
    name: string | null;
    manualRank: string | null;
    minPrice: number | null;
  },
  sortBy: SortField,
  direction: "asc" | "desc"
): string {
  let sortValue: string | number | null;

  switch (sortBy) {
    case "manual":
      sortValue = row.manualRank;
      break;
    case "newest":
      sortValue = row.createdAt?.toISOString() ?? null;
      break;
    case "name":
      sortValue = row.name ?? "";
      break;
    case "price":
      sortValue = row.minPrice;
      break;
    default:
      sortValue = null;
  }

  return this.encodeCursor({
    sv: sortValue,
    id: row.productId,
    sf: sortBy,
    sd: direction,
  });
}
```

---

## Step 3: Implement SQL-Level Keyset Pagination

### 3.1 Add Keyset Condition Builder (with explicit SQL)

This method builds the WHERE clause for keyset pagination. Uses explicit SQL conditionals instead of `sql.raw()` for safety:

```typescript
private buildKeysetCondition(
  cursor: CursorData,
  sortBy: SortField,
  direction: "asc" | "desc",
  isBackward: boolean,
  minPriceSql: SQL<number | null>
): SQL | null {
  // For backward pagination, we invert the comparison operator
  // then reverse results after fetching
  const effectiveDirection = isBackward
    ? direction === "asc"
      ? "desc"
      : "asc"
    : direction;

  // Use explicit conditionals for comparison operators (safer than sql.raw)
  const isAscending = effectiveDirection === "asc";

  switch (sortBy) {
    case "manual":
      // (lexo_rank, product_id) > or < (cursor_rank, cursor_id)
      if (isAscending) {
        return sql`(${collectionItem.lexoRank}, ${productSearchIndex.productId}) > (${cursor.sv}, ${cursor.id})`;
      } else {
        return sql`(${collectionItem.lexoRank}, ${productSearchIndex.productId}) < (${cursor.sv}, ${cursor.id})`;
      }

    case "newest":
      // (created_at, product_id) > or < (cursor_created, cursor_id)
      if (isAscending) {
        return sql`(${productSearchIndex.createdAt}, ${productSearchIndex.productId}) > (${cursor.sv}, ${cursor.id})`;
      } else {
        return sql`(${productSearchIndex.createdAt}, ${productSearchIndex.productId}) < (${cursor.sv}, ${cursor.id})`;
      }

    case "name":
      // (coalesce(title, ''), product_id) > or < (cursor_name, cursor_id)
      if (isAscending) {
        return sql`(coalesce(${productTranslation.title}, ''), ${productSearchIndex.productId}) > (${cursor.sv}, ${cursor.id})`;
      } else {
        return sql`(coalesce(${productTranslation.title}, ''), ${productSearchIndex.productId}) < (${cursor.sv}, ${cursor.id})`;
      }

    case "price":
      // Handle NULLS LAST for price
      if (cursor.sv === null) {
        // Cursor is at null price - compare only by productId within nulls
        if (isAscending) {
          return sql`${productSearchIndex.productId} > ${cursor.id}`;
        } else {
          return sql`${productSearchIndex.productId} < ${cursor.id}`;
        }
      }
      // (CASE WHEN null THEN 1 ELSE 0 END, price, id) > or < (0, cursor_price, cursor_id)
      if (isAscending) {
        return sql`(
          case when ${minPriceSql} is null then 1 else 0 end,
          ${minPriceSql},
          ${productSearchIndex.productId}
        ) > (0, ${cursor.sv}, ${cursor.id})`;
      } else {
        return sql`(
          case when ${minPriceSql} is null then 1 else 0 end,
          ${minPriceSql},
          ${productSearchIndex.productId}
        ) < (0, ${cursor.sv}, ${cursor.id})`;
      }

    default:
      return null;
  }
}
```

### 3.2 Implement Pagination Validation

```typescript
private validatePaginationParams(params: CollectionProductsQueryParams): {
  limit: number;
  isBackward: boolean;
  cursor: string | undefined;
} {
  const hasFirst = params.first !== undefined;
  const hasLast = params.last !== undefined;
  const hasAfter = params.after !== undefined;
  const hasBefore = params.before !== undefined;

  // first + last together is invalid
  if (hasFirst && hasLast) {
    throw new Error("Cannot specify both 'first' and 'last'");
  }

  // after with last is invalid
  if (hasAfter && hasLast) {
    throw new Error("Cannot use 'after' with 'last'");
  }

  // before with first is invalid (unless navigating back from a forward cursor)
  // Actually, before + first is valid in Relay - means "first N before cursor"
  // but we'll treat it as forward pagination starting before the cursor

  const isBackward = hasLast || (hasBefore && !hasFirst);
  const limit = isBackward
    ? Math.min(Math.max(params.last ?? 20, 1), 100)
    : Math.min(Math.max(params.first ?? 20, 1), 100);

  const cursor = isBackward ? params.before : params.after;

  return { limit, isBackward, cursor };
}
```

---

## Step 4: Refactor Main Execute Method

### 4.1 New Execute Method Structure

The refactored `execute` method should:

1. **Validate collection** (keep existing logic)
2. **Parse pagination params** (new helper)
3. **Resolve filters** (keep existing logic)
4. **Build base conditions** (keep existing logic)
5. **Execute COUNT query** (new - separate query)
6. **Execute data query with keyset** (new - SQL-level pagination)
7. **Build edges with cursors** (updated)
8. **Handle backward pagination** (new - reverse results)
9. **Build facets** (keep existing logic)
10. **Return result** (updated pageInfo)

### 4.2 Separate Count Query

Extract count query to run independently (can be parallelized):

```typescript
private async executeCountQuery(conditions: SQL[]): Promise<number> {
  const [result] = await this.repository.db
    .select({ count: sql<number>`count(*)` })
    .from(productSearchIndex)
    .where(and(...conditions));

  return Number(result?.count ?? 0);
}
```

### 4.3 Updated Data Query with LIMIT

The data query should include:
- Keyset WHERE condition (if cursor provided)
- ORDER BY (inverted for backward pagination)
- LIMIT (limit + 1 for hasNextPage/hasPreviousPage detection)

```typescript
private async executeDataQuery(params: {
  conditions: SQL[];
  sortBy: SortField;
  direction: "asc" | "desc";
  isBackward: boolean;
  limit: number;
  cursor: CursorData | null;
  minPriceSql: SQL<number | null>;
  collectionId: string;
  locale: string;
}): Promise<
  Array<{
    productId: string;
    createdAt: Date | null;
    name: string | null;
    manualRank: string | null;
    minPrice: number | null;
  }>
> {
  const finalConditions = [...params.conditions];

  // Add keyset condition if cursor exists
  if (params.cursor) {
    const keysetCondition = this.buildKeysetCondition(
      params.cursor,
      params.sortBy,
      params.direction,
      params.isBackward,
      params.minPriceSql
    );
    if (keysetCondition) {
      finalConditions.push(keysetCondition);
    }
  }

  // Build order by - inverted for backward pagination
  const effectiveDirection = params.isBackward
    ? params.direction === "asc"
      ? "desc"
      : "asc"
    : params.direction;

  const orderBy = this.buildOrderBy(
    params.sortBy,
    effectiveDirection,
    params.minPriceSql
  );

  const rows = await this.repository.db
    .select({
      productId: productSearchIndex.productId,
      createdAt: productSearchIndex.createdAt,
      name: productTranslation.title,
      manualRank: collectionItem.lexoRank,
      minPrice: params.minPriceSql,
    })
    .from(productSearchIndex)
    .leftJoin(
      productTranslation,
      and(
        eq(productTranslation.projectId, productSearchIndex.projectId),
        eq(productTranslation.productId, productSearchIndex.productId),
        eq(productTranslation.locale, params.locale)
      )
    )
    .leftJoin(
      collectionItem,
      and(
        eq(collectionItem.projectId, productSearchIndex.projectId),
        eq(collectionItem.productId, productSearchIndex.productId),
        eq(collectionItem.collectionId, params.collectionId)
      )
    )
    .where(and(...finalConditions))
    .orderBy(...orderBy)
    .limit(params.limit + 1); // +1 to detect hasMore

  return rows;
}
```

### 4.4 Build Order By Helper

```typescript
private buildOrderBy(
  sortBy: SortField,
  direction: "asc" | "desc",
  minPriceSql: SQL<number | null>
): SQL[] {
  const dir = direction === "asc" ? asc : desc;

  switch (sortBy) {
    case "manual":
      return [asc(collectionItem.lexoRank), asc(productSearchIndex.productId)];

    case "newest":
      return [
        dir(productSearchIndex.createdAt),
        asc(productSearchIndex.productId),
      ];

    case "name":
      return [
        dir(sql`coalesce(${productTranslation.title}, '')`),
        asc(productSearchIndex.productId),
      ];

    case "price":
      // NULLS LAST pattern
      return [
        asc(sql`case when ${minPriceSql} is null then 1 else 0 end`),
        dir(minPriceSql),
        asc(productSearchIndex.productId),
      ];

    default:
      return [
        desc(productSearchIndex.createdAt),
        asc(productSearchIndex.productId),
      ];
  }
}
```

---

## Step 5: Update PageInfo Calculation

### 5.1 Determine Page Info

```typescript
private buildPageInfo(
  rows: Array<{
    productId: string;
    createdAt: Date | null;
    name: string | null;
    manualRank: string | null;
    minPrice: number | null;
  }>,
  limit: number,
  isBackward: boolean,
  cursorProvided: boolean,
  sortBy: SortField,
  direction: "asc" | "desc"
): {
  edges: Array<{ cursor: string; nodeId: string }>;
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor: string | null;
    endCursor: string | null;
  };
} {
  // Check if we have more rows than requested
  const hasMore = rows.length > limit;

  // Trim excess row
  const visible = hasMore ? rows.slice(0, limit) : rows;

  // For backward pagination, reverse the results
  if (isBackward) {
    visible.reverse();
  }

  // Build edges with cursors
  const edges = visible.map((row) => ({
    cursor: this.buildCursorFromRow(row, sortBy, direction),
    nodeId: row.productId,
  }));

  // Determine hasNextPage/hasPreviousPage
  let hasNextPage: boolean;
  let hasPreviousPage: boolean;

  if (isBackward) {
    // Backward pagination: hasMore means there are previous pages
    hasPreviousPage = hasMore;
    hasNextPage = cursorProvided; // If we had a cursor, there's a next page
  } else {
    // Forward pagination: hasMore means there are next pages
    hasNextPage = hasMore;
    hasPreviousPage = cursorProvided; // If we had a cursor, there's a previous page
  }

  return {
    edges,
    pageInfo: {
      hasNextPage,
      hasPreviousPage,
      startCursor: edges[0]?.cursor ?? null,
      endCursor: edges[edges.length - 1]?.cursor ?? null,
    },
  };
}
```

---

## Step 6: Refactored Execute Method (Full)

Here is the complete refactored `execute` method:

```typescript
protected async execute(
  params: CollectionProductsQueryParams
): Promise<CollectionProductsQueryResult> {
  // 1. Validate collection (keep existing)
  const collection = await this.repository.collection.findById(
    params.collectionId
  );
  if (!collection) {
    return this.emptyResult();
  }

  if (!params.skipPublishCheck) {
    if (
      collection.deletedAt ||
      !collection.publishedAt ||
      new Date(collection.publishedAt) > new Date() ||
      (collection.effectiveFrom &&
        new Date(collection.effectiveFrom) > new Date()) ||
      (collection.effectiveTo &&
        new Date(collection.effectiveTo) <= new Date())
    ) {
      return this.emptyResult();
    }
  } else if (collection.deletedAt) {
    return this.emptyResult();
  }

  // 2. Parse pagination params
  const {
    limit,
    isBackward,
    cursor: cursorString,
  } = this.validatePaginationParams(params);

  // 3. Determine sort
  const rawSortBy = params.sort?.by ?? (collection.defaultSort as ProductSortBy);
  const direction = (params.sort?.direction ??
    (collection.defaultSortDirection as SortDirection)) as SortDirection;

  // Manual sort not allowed for rule collections
  const sortBy: SortField =
    rawSortBy === "manual" && collection.type !== "manual"
      ? "newest"
      : (rawSortBy as SortField);

  // 4. Parse cursor (if provided)
  const cursor = cursorString
    ? this.decodeCursor(cursorString, sortBy, direction)
    : null;

  const currency =
    this.context.currency ?? this.context.store.defaultCurrency ?? "USD";

  // 5. Resolve facet filters (keep existing logic)
  const rawFacetFilters = params.filters?.facets ?? [];
  const resolvedFacetFilters = rawFacetFilters.length
    ? await this.executeScript(ResolveFacetsScript, {
        facetFilters: rawFacetFilters,
      })
    : { tagHandles: [], featureSlugs: [], optionSlugs: [], resolved: [] };

  const fallbackFacetFilters =
    rawFacetFilters.length &&
    resolvedFacetFilters.tagHandles.length === 0 &&
    resolvedFacetFilters.featureSlugs.length === 0 &&
    resolvedFacetFilters.optionSlugs.length === 0
      ? this.parseFacetFilters(rawFacetFilters)
      : { tagHandles: [], featureSlugs: [], optionSlugs: [] };

  const parsedFacetFilters: ParsedFacetFilters = {
    tagHandles: Array.from(
      new Set([
        ...resolvedFacetFilters.tagHandles,
        ...fallbackFacetFilters.tagHandles,
      ])
    ),
    featureSlugs: Array.from(
      new Set([
        ...resolvedFacetFilters.featureSlugs,
        ...fallbackFacetFilters.featureSlugs,
      ])
    ),
    optionSlugs: Array.from(
      new Set([
        ...resolvedFacetFilters.optionSlugs,
        ...fallbackFacetFilters.optionSlugs,
      ])
    ),
  };

  const selectedFacetFiltersById = new Map<string, ListingFacetSelection>();
  for (const resolved of resolvedFacetFilters.resolved) {
    const existing = selectedFacetFiltersById.get(resolved.facetId);
    if (!existing) {
      selectedFacetFiltersById.set(resolved.facetId, {
        facetId: resolved.facetId,
        facetType: resolved.facetType,
        sourceHandles: [...resolved.sourceHandles],
      });
      continue;
    }
    existing.sourceHandles = Array.from(
      new Set([...existing.sourceHandles, ...resolved.sourceHandles])
    );
    selectedFacetFiltersById.set(resolved.facetId, existing);
  }

  const { priceMinMinor, priceMaxMinor } = this.resolvePriceBounds(
    params.filters
  );

  // 6. Compile rules for rule-based collections (keep existing logic)
  const ruleCtx: RuleContext = {
    tagIn: [],
    tagAll: [],
    featureIn: [],
    categoryIn: [],
    optionIn: [],
  };

  if (collection.type === "rule") {
    const rules = await this.repository.collectionRule.findByCollectionId(
      collection.id
    );
    Object.assign(
      ruleCtx,
      this.compileRules(
        rules.map((rule) => ({
          field: rule.field,
          operator: rule.operator,
          value: rule.value,
        }))
      )
    );
  }

  // 7. Build base scope conditions
  const baseScopeConditions: SQL[] = [
    eq(productSearchIndex.projectId, this.getProjectId()),
  ];

  if (!params.includeDrafts) {
    baseScopeConditions.push(eq(productSearchIndex.status, "published"));
  }

  if (collection.type === "rule") {
    this.appendRuleProductConditions(baseScopeConditions, ruleCtx);
    const ruleVariantExists = this.buildVariantExistsCondition({
      productIdRef: productSearchIndex.productId,
      currency,
      optionSets: ruleCtx.optionIn.length > 0 ? [ruleCtx.optionIn] : [],
      priceMinMinor: ruleCtx.priceMin,
      priceMaxMinor: ruleCtx.priceMax,
      inStock: ruleCtx.inStock,
    });
    if (ruleVariantExists) {
      baseScopeConditions.push(ruleVariantExists);
    }
  }

  if (collection.type === "manual") {
    baseScopeConditions.push(
      sql`exists (
        select 1
        from catalog.collection_item ci
        where ci.project_id = ${this.getProjectId()}
          and ci.collection_id = ${collection.id}
          and ci.product_id = ${productSearchIndex.productId}
      )`
    );
  }

  // 8. Build final conditions with user filters
  const finalConditions: SQL[] = [...baseScopeConditions];

  if (parsedFacetFilters.tagHandles.length > 0) {
    finalConditions.push(
      sql`${productSearchIndex.tagHandles} && ${parsedFacetFilters.tagHandles}`
    );
  }
  if (parsedFacetFilters.featureSlugs.length > 0) {
    finalConditions.push(
      sql`${productSearchIndex.featureSlugs} && ${parsedFacetFilters.featureSlugs}`
    );
  }

  const hasUserVariantFilters =
    parsedFacetFilters.optionSlugs.length > 0 ||
    priceMinMinor !== undefined ||
    priceMaxMinor !== undefined ||
    params.filters?.inStock !== undefined;

  if (hasUserVariantFilters) {
    const userVariantExists = this.buildVariantExistsCondition({
      productIdRef: productSearchIndex.productId,
      currency,
      optionSets:
        parsedFacetFilters.optionSlugs.length > 0
          ? [parsedFacetFilters.optionSlugs]
          : [],
      priceMinMinor,
      priceMaxMinor,
      inStock: params.filters?.inStock,
    });
    if (userVariantExists) {
      finalConditions.push(userVariantExists);
    }
  }

  const minPriceSql = this.buildMinVariantPriceExpression({
    productIdRef: productSearchIndex.productId,
    currency,
    optionSets:
      parsedFacetFilters.optionSlugs.length > 0
        ? [parsedFacetFilters.optionSlugs]
        : [],
    priceMinMinor,
    priceMaxMinor,
    inStock: params.filters?.inStock,
  });

  // 9. Execute COUNT query (for totalCount) - uses baseScopeConditions + user filters
  const totalCount = await this.executeCountQuery(finalConditions);

  if (totalCount === 0) {
    return this.emptyResult();
  }

  // 10. Execute data query with keyset pagination
  const rows = await this.executeDataQuery({
    conditions: finalConditions,
    sortBy,
    direction,
    isBackward,
    limit,
    cursor,
    minPriceSql,
    collectionId: collection.id,
    locale: params.locale,
  });

  // 11. Build edges and pageInfo
  const { edges, pageInfo } = this.buildPageInfo(
    rows,
    limit,
    isBackward,
    cursor !== null,
    sortBy,
    direction
  );

  // 12. Build facets (for base products, not paginated)
  // Fetch base products for facets calculation
  const baseRows = await this.repository.db
    .select({
      productId: productSearchIndex.productId,
      tagHandles: productSearchIndex.tagHandles,
      featureSlugs: productSearchIndex.featureSlugs,
    })
    .from(productSearchIndex)
    .where(and(...baseScopeConditions));

  const baseVariantsByProduct = this.groupVariantsByProduct(
    await this.repository.variantSearchIndex.getByProductIds(
      baseRows.map((row) => row.productId)
    )
  );

  const facets = await buildListingFacets({
    repository: this.repository,
    baseProducts: baseRows.map((row) => ({
      productId: row.productId,
      tagHandles: row.tagHandles,
      featureSlugs: row.featureSlugs,
    })),
    variantsByProduct: baseVariantsByProduct,
    currency,
    selectedFacetFiltersById,
    priceMinMinor,
    priceMaxMinor,
    inStock: params.filters?.inStock,
  });

  // 13. Return result
  return {
    edges,
    pageInfo,
    totalCount,
    facets,
  };
}
```

---

## Step 7: Files to Modify

| File | Changes |
|------|---------|
| `services/catalog/src/scripts/collection/dto/index.ts` | Add `last` and `before` fields to `CollectionProductsQueryParams` |
| `services/catalog/src/resolvers/admin/CollectionResolver.ts` | Pass `last` and `before` to `QueryCollectionProductsScript` (lines ~307-308) |
| `services/catalog/src/scripts/collection/QueryCollectionProductsScript.ts` | Full refactor as described above |

---

## Step 8: Test Cases to Verify

The existing e2e tests in `/Users/phl/Projects/shopana-io/services/e2e/tests/collection-api/collection-products-query.spec.ts` already cover most scenarios:

| Test | Status | Notes |
|------|--------|-------|
| Forward pagination (first/after) | Existing | Should pass with new implementation |
| Backward pagination (last/before) | Existing | Currently may fail - verify after refactor |
| Sort by MANUAL | Existing | Should pass |
| Sort by NAME ASC/DESC | Existing | Should pass |
| Sort by NEWEST | Existing | Should pass |
| Sort by PRICE | Missing | Add test if time permits |
| Empty collection | Existing | Should pass |
| Filter by inStock | Existing | Should pass |
| Filter by price range | Existing | Should pass |
| totalCount accuracy | Implicit | Verify count matches after filters |

### Additional Test Cases to Add

Add the following tests to `/Users/phl/Projects/shopana-io/services/e2e/tests/collection-api/collection-products-query.spec.ts`:

```typescript
// ═══════════════════════════════════════
// CURSOR STABILITY & VALIDATION
// ═══════════════════════════════════════

test('should maintain cursor stability across forward and backward navigation', async ({ api }) => {
  const collection = await api.admin.collection.createManual({
    name: 'Cursor Stability Test',
  });

  // Create 5 products
  const products = await Promise.all(
    Array.from({ length: 5 }, (_, i) =>
      createProduct(api, { title: `Product ${i + 1}` })
    )
  );
  await api.admin.collection.addProducts(
    collection.id,
    products.map((p) => p.id)
  );

  // Forward: Get page 1 (items 1-2)
  const { data: page1 } = await api.admin.query('catalog-api/CollectionProducts', {
    variables: { id: collection.id, first: 2 },
  });
  expect(page1.catalogQuery.collection.products.edges).toHaveLength(2);

  // Forward: Get page 2 (items 3-4)
  const { data: page2 } = await api.admin.query('catalog-api/CollectionProducts', {
    variables: {
      id: collection.id,
      first: 2,
      after: page1.catalogQuery.collection.products.pageInfo.endCursor,
    },
  });
  expect(page2.catalogQuery.collection.products.edges).toHaveLength(2);

  // Backward: Go back to page 1 using before cursor
  const { data: backToPage1 } = await api.admin.query('catalog-api/CollectionProducts', {
    variables: {
      id: collection.id,
      last: 2,
      before: page2.catalogQuery.collection.products.pageInfo.startCursor,
    },
  });

  // Should get the same items as page 1
  const page1Ids = page1.catalogQuery.collection.products.edges.map(
    (e: { node: { id: string } }) => e.node.id
  );
  const backIds = backToPage1.catalogQuery.collection.products.edges.map(
    (e: { node: { id: string } }) => e.node.id
  );
  expect(backIds).toEqual(page1Ids);
});

test('should invalidate cursor when sort changes', async ({ api }) => {
  const collection = await api.admin.collection.createManual({
    name: 'Cursor Invalidation Test',
  });

  const products = await Promise.all([
    createProduct(api, { title: 'Alpha' }),
    createProduct(api, { title: 'Beta' }),
    createProduct(api, { title: 'Gamma' }),
  ]);
  await api.admin.collection.addProducts(
    collection.id,
    products.map((p) => p.id)
  );

  // Get cursor with NAME sort
  const { data: nameSorted } = await api.admin.query('catalog-api/CollectionProducts', {
    variables: {
      id: collection.id,
      first: 1,
      sort: { by: 'NAME', direction: 'asc' },
    },
  });
  const nameCursor = nameSorted.catalogQuery.collection.products.pageInfo.endCursor;

  // Use NAME cursor with NEWEST sort - should start fresh (ignore invalid cursor)
  const { data: newestSorted } = await api.admin.query('catalog-api/CollectionProducts', {
    variables: {
      id: collection.id,
      first: 2,
      after: nameCursor,
      sort: { by: 'NEWEST', direction: 'desc' },
    },
  });

  // Should return results as if no cursor was provided (starts from beginning)
  expect(newestSorted.catalogQuery.collection.products.edges.length).toBeGreaterThan(0);
});

test('should return last N items when using last without before', async ({ api }) => {
  const collection = await api.admin.collection.createManual({
    name: 'Last Without Before Test',
  });

  const products = await Promise.all([
    createProduct(api, { title: 'First' }),
    createProduct(api, { title: 'Second' }),
    createProduct(api, { title: 'Third' }),
    createProduct(api, { title: 'Fourth' }),
    createProduct(api, { title: 'Fifth' }),
  ]);
  await api.admin.collection.addProducts(
    collection.id,
    products.map((p) => p.id)
  );

  // Request last 2 items without before cursor
  const { data } = await api.admin.query('catalog-api/CollectionProducts', {
    variables: {
      id: collection.id,
      last: 2,
      sort: { by: 'MANUAL', direction: 'asc' },
    },
  });

  expect(data.catalogQuery.collection.products.edges).toHaveLength(2);
  expect(data.catalogQuery.collection.products.pageInfo.hasPreviousPage).toBe(true);
  expect(data.catalogQuery.collection.products.pageInfo.hasNextPage).toBe(false);
});
```

---

## Step 9: Implementation Order

1. **Step 1**: Update DTO (5 min)
2. **Step 1.5**: Update CollectionResolver to pass `last`/`before` (5 min) **[BLOCKING]**
3. **Step 2**: Add cursor interfaces and helpers with type validation (20 min)
4. **Step 3**: Add keyset condition builder with explicit SQL (25 min)
5. **Step 4**: Add pagination validation (10 min)
6. **Step 5**: Add executeCountQuery helper (5 min)
7. **Step 6**: Add executeDataQuery helper (20 min)
8. **Step 7**: Add buildOrderBy helper (10 min)
9. **Step 8**: Add buildPageInfo helper (15 min)
10. **Step 9**: Refactor execute method (30 min)
11. **Step 10**: Add new test cases (20 min)
12. **Step 11**: Run tests and fix issues (30 min)

**Total estimated time: 3-3.5 hours**

---

## Step 10: Edge Cases Handling

| Edge Case | Handling |
|-----------|----------|
| Empty collection | Return empty result with totalCount: 0 |
| Invalid cursor (malformed base64) | Ignore cursor, start from beginning |
| Cursor with different sort | Ignore cursor (sf/sd mismatch), start fresh |
| Cursor with wrong value type | Ignore cursor (type validation fails), start fresh |
| Rule collection + MANUAL sort | Fallback to NEWEST sort |
| Null price values | NULLS LAST pattern in ORDER BY |
| first + last both provided | Throw error |
| Neither first nor last | Default to first: 20 |
| Cursor for deleted product | Keyset condition still works (skips to next valid) |
| Concurrent product additions | Keyset handles this gracefully |

---

## Summary

This refactoring transforms `QueryCollectionProductsScript` from:
- **In-memory pagination** (loads all, then slices) to **SQL-level LIMIT** (loads only needed rows)
- **Forward-only** to **Bidirectional pagination** (first/after + last/before)
- **Simple productId cursor** to **Compound cursor** (sortValue + productId + sortField + direction)
- **totalCount from array.length** to **Separate COUNT(*) query**

The changes maintain full backward compatibility with existing API while adding new capabilities for backward pagination.

**Note:** Manual collections in the admin API continue to use the simpler implementation in `CollectionResolver.ts` which already supports bidirectional pagination with cursor-by-productId. This refactor applies to rule-based collections and the storefront API.

---

## PLAN READY
