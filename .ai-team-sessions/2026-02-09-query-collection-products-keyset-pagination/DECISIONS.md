# Design Decisions: QueryCollectionProductsScript Refactor

## DECISIONS READY

**Service:** catalog

**Pattern:** Script (read-only query, no side effects)

**Authorization:** @Policy("collection", "read") - existing policy, no change needed

---

### API Contract

```
Query: Collection.products(first, after, last, before, filters, sort)
Returns: CollectionProductConnection (edges, pageInfo, totalCount, facets)
```

**No GraphQL schema changes required** - the schema already supports bidirectional pagination with `first/after` and `last/before` arguments (line 19-26 in collection.graphql).

---

### Data Changes

**No database schema changes required.**

Existing tables sufficient:
- `product_search_index` - has all needed fields (tag_handles, feature_slugs, category_handles, created_at)
- `variant_search_index` - has all needed fields (option_slugs, price_minor, in_stock)
- `collection_item` - has lexo_rank for manual sorting
- `collection_rule` - already stores field/operator/value

---

### Key Design Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Reuse drizzle-query cursor library | **No** | Library requires ObjectSchema from drizzle tables. CollectionProducts query uses complex multi-table JOINs with dynamic conditions (manual vs rule-based). Custom cursor implementation more flexible. |
| Cursor format | JSON with `{sortValue, productId}` base64url encoded | Stable across sort changes. ProductId as tie-breaker ensures uniqueness. |
| totalCount strategy | Separate COUNT(*) query with same WHERE conditions | Avoids loading all rows. Can be cached or made lazy. |
| Backward pagination | Invert ORDER BY, fetch, then reverse results | Standard keyset pattern. Same efficiency as forward. |
| Rule compilation | Keep existing `compileRules()` approach | Already handles all rule types correctly. Just needs integration into keyset WHERE. |

---

### Cursor Design

```typescript
interface CursorData {
  // Sort value for keyset comparison
  sv: string | number | null;
  // Tie-breaker (product ID)
  id: string;
  // Sort field identifier for validation
  sf: 'manual' | 'newest' | 'name' | 'price';
  // Sort direction
  sd: 'asc' | 'desc';
}
```

Encode: `base64url(JSON.stringify(cursorData))`

---

### Keyset WHERE Clause Pattern

For forward pagination (`first` + `after`):
```sql
-- Sort by newest DESC (default)
WHERE (created_at, product_id) < ($cursor_created_at, $cursor_product_id)

-- Sort by manual ASC
WHERE (lexo_rank, product_id) > ($cursor_rank, $cursor_product_id)

-- Sort by price ASC (nulls last)
WHERE (
  (min_price IS NULL AND $cursor_price IS NOT NULL) OR
  (min_price IS NOT NULL AND $cursor_price IS NOT NULL AND (min_price, product_id) > ($cursor_price, $cursor_product_id))
)
```

For backward pagination (`last` + `before`):
- Invert the comparison operators
- Invert the ORDER BY direction
- Reverse results after fetch

---

### Reference Patterns

| Reference | Path |
|-----------|------|
| Existing script (to refactor) | `services/catalog/src/scripts/collection/QueryCollectionProductsScript.ts` |
| Similar category query | `services/catalog/src/scripts/category/QueryCategoryProductsScript.ts` |
| Cursor utilities | `packages/drizzle-query/src/cursor/cursor.ts` |
| Keyset WHERE builder | `packages/drizzle-query/src/cursor/where.ts` |
| Base cursor builder pattern | `packages/drizzle-query/src/cursor/base-builder.ts` |

---

### Edge Cases to Handle

1. **Empty collection** - Return empty result with `totalCount: 0`
2. **Invalid cursor** - Ignore and start from beginning (don't error)
3. **Cursor with different sort** - Ignore and start fresh (cursor contains sort field for validation)
4. **Rule-based collection with `manual` sort** - Fallback to `newest` (already implemented)
5. **Null price values** - Use `NULLS LAST` pattern (already implemented)
6. **Deleted collection** - Return empty result (already implemented)
7. **first + last both provided** - Error: "Cannot specify both 'first' and 'last'"
8. **Neither first nor last** - Default to `first: 20`

---

### No Build Changes Required

- Schema rebuild: No (GraphQL schema unchanged)
- Codegen: No (types unchanged)
- Package rebuild: No (all code in service)
