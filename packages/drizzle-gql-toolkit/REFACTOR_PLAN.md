# Filter Operators Refactoring Plan

## Overview

Add missing filter operators to align with Strapi-style API, improving developer experience with convenient string/range operators.

## Current State

**Existing operators in `src/operators.ts`:**
- Comparison: `$eq`, `$neq`, `$gt`, `$gte`, `$lt`, `$lte`
- Array: `$in`, `$notIn`
- Pattern: `$like`, `$iLike`, `$notLike`, `$notILike`
- Null: `$is`, `$isNot`
- Logical: `$and`, `$or`

## New Operators to Add

### High Priority

#### 1. String Convenience Operators
Auto-wrap values with `%` wildcards - eliminates manual pattern construction.

| Operator | SQL Output | Example |
|----------|------------|---------|
| `$contains` | `LIKE '%value%'` | `{ name: { $contains: "phone" } }` |
| `$notContains` | `NOT LIKE '%value%'` | `{ name: { $notContains: "test" } }` |
| `$containsi` | `ILIKE '%value%'` | `{ name: { $containsi: "phone" } }` |
| `$notContainsi` | `NOT ILIKE '%value%'` | `{ name: { $notContainsi: "test" } }` |
| `$startsWith` | `LIKE 'value%'` | `{ name: { $startsWith: "Pro" } }` |
| `$startsWithi` | `ILIKE 'value%'` | `{ name: { $startsWithi: "pro" } }` |
| `$endsWith` | `LIKE '%value'` | `{ email: { $endsWith: ".com" } }` |
| `$endsWithi` | `ILIKE '%value'` | `{ email: { $endsWithi: ".COM" } }` |

#### 2. Range Operator
Shorthand for `$gte` + `$lte` combination.

| Operator | SQL Output | Example |
|----------|------------|---------|
| `$between` | `BETWEEN x AND y` | `{ price: { $between: [10, 100] } }` |

### Medium Priority

#### 3. Logical NOT Operator
Negate any condition or group of conditions.

| Operator | Description | Example |
|----------|-------------|---------|
| `$not` | Negate condition | `{ $not: { status: "draft" } }` |

### Low Priority

#### 4. Case-Insensitive Equality
Rarely needed, can use `$iLike` as workaround.

| Operator | SQL Output | Example |
|----------|------------|---------|
| `$eqi` | `LOWER(col) = LOWER(val)` | `{ code: { $eqi: "ABC" } }` |
| `$nei` | `LOWER(col) != LOWER(val)` | `{ code: { $nei: "ABC" } }` |

---

## Implementation Steps

### Step 1: Update Type Definitions

**File:** `src/types.ts`

Add new operators to `FilterOperators` type:

```typescript
export type FilterOperators<T = ScalarValue> = {
  // Existing...
  $eq?: T;
  $neq?: T;
  // ...

  // New string operators
  $contains?: string;
  $notContains?: string;
  $containsi?: string;
  $notContainsi?: string;
  $startsWith?: string;
  $startsWithi?: string;
  $endsWith?: string;
  $endsWithi?: string;

  // New range operator
  $between?: [T, T];

  // New logical operator (handled separately in NestedWhereInput)
};
```

Update `NestedWhereInput` to support `$not`:

```typescript
export type NestedWhereInput<T extends FieldsDef> = {
  // ...existing...
} & {
  $and?: NestedWhereInput<T>[];
  $or?: NestedWhereInput<T>[];
  $not?: NestedWhereInput<T>;  // Add this
};
```

### Step 2: Update Operator Constants

**File:** `src/operators.ts`

Add to `OPERATORS` constant:

```typescript
export const OPERATORS = {
  // Existing...

  // String convenience
  $contains: "contains",
  $notContains: "notContains",
  $containsi: "containsi",
  $notContainsi: "notContainsi",
  $startsWith: "startsWith",
  $startsWithi: "startsWithi",
  $endsWith: "endsWith",
  $endsWithi: "endsWithi",

  // Range
  $between: "between",
} as const;
```

### Step 3: Implement Operator Handlers

**File:** `src/operators.ts`

Add to `OPERATOR_HANDLERS`:

```typescript
// String convenience operators
contains: (column, value) =>
  typeof value === "string" ? like(column, `%${escapeWildcards(value)}%`) : null,

notcontains: (column, value) =>
  typeof value === "string" ? notLike(column, `%${escapeWildcards(value)}%`) : null,

containsi: (column, value) =>
  typeof value === "string" ? ilike(column, `%${escapeWildcards(value)}%`) : null,

notcontainsi: (column, value) =>
  typeof value === "string" ? notIlike(column, `%${escapeWildcards(value)}%`) : null,

startswith: (column, value) =>
  typeof value === "string" ? like(column, `${escapeWildcards(value)}%`) : null,

startswithi: (column, value) =>
  typeof value === "string" ? ilike(column, `${escapeWildcards(value)}%`) : null,

endswith: (column, value) =>
  typeof value === "string" ? like(column, `%${escapeWildcards(value)}`) : null,

endswithi: (column, value) =>
  typeof value === "string" ? ilike(column, `%${escapeWildcards(value)}`) : null,

// Range operator
between: (column, value) => {
  if (!Array.isArray(value) || value.length !== 2) return null;
  return and(gte(column, value[0]), lte(column, value[1]));
},
```

### Step 4: Add Wildcard Escape Utility

**File:** `src/operators.ts`

```typescript
/**
 * Escape SQL wildcards in user input for safe LIKE operations.
 * Prevents user input from being interpreted as wildcards.
 */
function escapeWildcards(value: string): string {
  return value.replace(/[%_\\]/g, '\\$&');
}
```

### Step 5: Update Validation

**File:** `src/operators.ts`

Add validation in `validateFilterValue`:

```typescript
case "contains":
case "notcontains":
case "containsi":
case "notcontainsi":
case "startswith":
case "startswithi":
case "endswith":
case "endswithi":
  if (typeof value !== "string") {
    return { valid: false, reason: "Expected string value" };
  }
  if (value.length > 1000) {
    return { valid: false, reason: "Value is too long" };
  }
  return { valid: true };

case "between":
  if (!Array.isArray(value) || value.length !== 2) {
    return { valid: false, reason: "Expected array with exactly 2 elements" };
  }
  return { valid: true };
```

### Step 6: Implement $not Logical Operator

**File:** `src/builder/where-builder.ts`

Update `isLogicalOperator`:

```typescript
export function isLogicalOperator(key: string): key is "$and" | "$or" | "$not" {
  return key === "$and" || key === "$or" || key === "$not";
}
```

Add handling in `buildWhereClause`:

```typescript
if (key === "$not") {
  const nestedCondition = buildWhereClause(value, ...);
  if (nestedCondition) {
    conditions.push(not(nestedCondition));
  }
}
```

### Step 7: Add Tests

**File:** `src/operators.test.ts`

Add test cases for each new operator:

```typescript
describe("string convenience operators", () => {
  it("$contains wraps value with %", () => { ... });
  it("$containsi is case-insensitive", () => { ... });
  it("$startsWith adds trailing %", () => { ... });
  it("$endsWith adds leading %", () => { ... });
  it("escapes wildcards in user input", () => { ... });
});

describe("$between operator", () => {
  it("creates BETWEEN condition", () => { ... });
  it("rejects non-array values", () => { ... });
  it("rejects arrays with wrong length", () => { ... });
});

describe("$not operator", () => {
  it("negates simple condition", () => { ... });
  it("negates nested conditions", () => { ... });
});
```

### Step 8: Update Documentation

Update README or JSDoc comments to document new operators.

---

## Security Considerations

1. **Wildcard Injection**: The `escapeWildcards` function prevents users from injecting `%` or `_` into patterns
2. **Length Limits**: Keep 1000 char limit on string operators
3. **Input Validation**: All new operators validate input types

## Migration Notes

- All changes are additive - no breaking changes
- Existing filters continue to work unchanged
- New operators are optional

## Files to Modify

1. `src/types.ts` - Type definitions
2. `src/operators.ts` - Operator constants, handlers, validation
3. `src/builder/where-builder.ts` - $not handling
4. `src/operators.test.ts` - Unit tests
5. `src/sql.test.ts` - Integration tests
