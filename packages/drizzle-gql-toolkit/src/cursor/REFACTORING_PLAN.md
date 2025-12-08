# Refactoring Plan: `createPaginationQuery`

## Goal

Simplify the pagination query API by:
1. Removing `defaultSortField` parameter (always use `tieBreaker` for default sorting)
2. Adding validation for `tieBreaker` field existence
3. Adding `getSnapshot()` method for consistency with `FluentQueryBuilder`

## Current vs New API

### Current API
```typescript
createPaginationQuery(query, {
  name?: string,
  tieBreaker?: string,
  defaultSortField?: string,  // TO BE REMOVED
})
```

### New API
```typescript
createPaginationQuery(query, {
  name?: string,      // default: query.getTableName()
  tieBreaker?: string // default: 'id' (throws if field doesn't exist)
})
```

## Changes

### 1. `pagination-query-builder.ts`

#### Update `PaginationQueryConfig` type
```typescript
// Before:
export type PaginationQueryConfig = {
  name?: string;
  tieBreaker?: string;
  defaultSortField?: string;  // REMOVE
};

// After:
export type PaginationQueryConfig = {
  name?: string;
  tieBreaker?: string;
};
```

#### Update `PaginationQueryBuilder` class

1. **Remove** `defaultSortField` private field

2. **Add tieBreaker validation** in constructor:
```typescript
constructor(queryBuilder, config?) {
  const fields = queryBuilder.getSnapshot().fields;
  const tieBreaker = config?.tieBreaker ?? 'id';

  if (!fields.includes(tieBreaker)) {
    throw new Error(
      `Tie-breaker field '${tieBreaker}' not found in schema. ` +
      `Available fields: ${fields.join(', ')}`
    );
  }

  this.tieBreaker = tieBreaker;
  // ...
}
```

3. **Update** calls to `createCursorQueryBuilder`:
```typescript
// Before:
defaultSortField: this.defaultSortField as never,

// After:
// Remove defaultSortField entirely
```

4. **Add** `getSnapshot()` method:
```typescript
getSnapshot(): PaginationQuerySnapshot {
  return {
    name: this.cursorType,
    tieBreaker: this.tieBreaker,
    querySnapshot: this.queryBuilder.getSnapshot(),
  };
}
```

5. **Update** `getConfig()` method:
```typescript
// Before:
getConfig(): PaginationQueryConfig {
  return {
    name: this.cursorType,
    tieBreaker: this.tieBreaker,
    defaultSortField: this.defaultSortField,
  };
}

// After:
getConfig(): PaginationQueryConfig {
  return {
    name: this.cursorType,
    tieBreaker: this.tieBreaker,
  };
}
```

---

### 2. `cursor/builder.ts`

#### Update `CursorQueryBuilderConfig` type
```typescript
// Before:
export type CursorQueryBuilderConfig<Fields, Types> = {
  cursorType: string;
  tieBreaker: NestedPaths<Fields>;
  defaultSortField: NestedPaths<Fields>;  // REMOVE
  mapResult?: (row: Types) => unknown;
  queryConfig?: QueryBuilderConfig;
};

// After:
export type CursorQueryBuilderConfig<Fields, Types> = {
  cursorType: string;
  tieBreaker: NestedPaths<Fields>;
  mapResult?: (row: Types) => unknown;
  queryConfig?: QueryBuilderConfig;
};
```

#### Update `parseSortOrder` function
```typescript
// Before:
function parseSortOrder(order: string[] | undefined): SortParam[] {
  if (!order || order.length === 0) {
    return parseSort(undefined, config.defaultSortField as string);
  }
  return parseSort(order.join(","), config.defaultSortField as string);
}

// After:
function parseSortOrder(order: string[] | undefined): SortParam[] {
  if (!order || order.length === 0) {
    return parseSort(undefined, config.tieBreaker as string);
  }
  return parseSort(order.join(","), config.tieBreaker as string);
}
```

---

### 3. Update Tests

#### `cursor/builder.test.ts`
- Remove `defaultSortField` from all config objects
- Update any assertions that reference `defaultSortField`

#### `cursor/integration.test.ts`
- Remove `defaultSortField: "id"` from config objects (lines 62, 70)

---

### 4. Add New Type (optional)

```typescript
export type PaginationQuerySnapshot<Fields extends FieldsDef = FieldsDef> = {
  name: string;
  tieBreaker: string;
  querySnapshot: QuerySnapshot<Fields>;
};
```

---

## Final API

```typescript
// Creation
const productsPagination = createPaginationQuery(productsQuery, {
  name: 'product',     // optional, default: productsQuery.getTableName()
  tieBreaker: 'id',    // optional, default: 'id' (throws if not in schema)
});

// Methods
productsPagination.execute(db, input)    // Promise<PaginationResult<T>>
productsPagination.getSql(input)         // { sql, meta }
productsPagination.getSnapshot()         // { name, tieBreaker, querySnapshot }
productsPagination.getQueryBuilder()     // FluentQueryBuilder
productsPagination.getConfig()           // { name, tieBreaker }
```

---

## Files to Modify

1. `src/builder/pagination-query-builder.ts` - main changes
2. `src/cursor/builder.ts` - remove defaultSortField
3. `src/cursor/builder.test.ts` - update tests
4. `src/cursor/integration.test.ts` - update tests
5. `src/builder/fluent-types.ts` - add PaginationQuerySnapshot type (optional)
6. `src/index.ts` - export new type if added
