# Code Style & Code Smells Review

## 1. Code Duplication (DRY Violation) - Critical

**`pagination-query-builder.ts`**

`RelayQueryBuilder.execute()` and `CursorQueryBuilder.execute()` contain nearly identical logic (~80 lines each):
- Getting snapshot and config
- Creating cursorQb
- Merging where, order, select
- Applying include/exclude

Same applies to `getSql()` methods - complete duplication.

```typescript
// This logic is repeated 4 times (execute + getSql for each builder)
let where = input.where;
if (!where && snapshot.config.defaultWhere) {
  where = snapshot.config.defaultWhere;
}
// ... and so on
```

**Recommendation:** Extract common logic into a private method or base class.

---

## 2. eslint-disable Comments

Multiple `@typescript-eslint/no-explicit-any` suppressions:

- `query-builder.ts:202-203`
- `where-builder.ts:30-31`
- `order-builder.ts:15-16`
- `sql-renderer.ts:69-70`
- `schema.ts:153-154`
- `pagination-query-builder.ts:159, 233, 485, 553`

**Recommendation:** Create stricter generic types or type guards instead of suppressing errors.

---

## 3. Type Assertions Without Runtime Checks

**`base-builder.ts:228-230`**
```typescript
const order = buildOrderPath(sortParams, invertOrderFlag) as OrderByItem<
  NestedPaths<Fields>
>[];
```

**`fluent-query-builder.ts:221-224`**
```typescript
return qb.query(db, {
  where: resolvedOptions.where as NestedWhereInput<FieldsDef>,
  order: resolvedOptions.order as never,
  select: resolvedOptions.select as never,
  // ...
});
```

Using `as never` is a sign of typing issues.

---

## 4. Inconsistent Naming

- `cursor/helpers.ts` - `snakeToCamel` (unused anywhere)
- `tieBreakerOrder` vs `buildTieBreakerSeekValue` - different naming styles
- `base-builder.ts:133` - `type Row = Types` (redundant alias)

---

## 5. Magic Numbers

**`operators.ts:176`**
```typescript
if (value.length > 1000) {
  return { valid: false, reason: "Value is too long" };
}
```

**`cursor/helpers.ts:159-164`**
```typescript
if (encoded.length <= 16) {
  return encoded;
}
const head = encoded.slice(0, 8);
const tail = encoded.slice(-8);
```

**Recommendation:** Extract into named constants.

---

## 6. Mixed Export Styles

- Some files use `export class` + `export function`
- Others use only factory functions
- `cursor/cursor.ts` exports Error class and functions together

---

## 7. Potential Performance Issues

**`schema.ts:174-197` - `getSchemaCacheKey`**
```typescript
const normalized = Object.entries(fields)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([name, field]) => {
    if (!field.join) {
      return `${name}:${field.column}:field`;
    }
    const targetSchema = field.join.schema(); // Called on every creation!
    // ...
  });
```

Lazy `schema()` is called when generating cache key, which may cause premature initialization of all related schemas.

---

## 8. Unused Code / Redundant Abstractions

**`cursor/where.ts:4`**
```typescript
type ComparisonOperator = "_lt" | "_gt"; // local type, could be inlined
```

**`sort.ts:20-22`**
```typescript
function compareFields(a: string, b: string): boolean {
  return a === b;
}
```
Function just does `===`, redundant abstraction.

---

## 9. Weak Return Typing

**`cursor/cursor.ts:70`**
```typescript
params = JSON.parse(json) as CursorParams;
```

`JSON.parse` returns `any`, cast is unsafe. Although `validateCursorParams` exists, types are not connected.

---

## 10. Inconsistent Null Handling

```typescript
// Different styles across files:
input?.where        // optional chaining
input.where ?? null // nullish coalescing
input.where || null // OR operator (falsy check)
```

---

## 11. Mutable State in "Immutable" Builder

**`fluent-query-builder.ts:71-72`**
```typescript
private _schema: ObjectSchema | null = null;
private _queryBuilder: QueryBuilder<...> | null = null;
```

`FluentQueryBuilder` is positioned as immutable, but caches state. When cloning via `new FluentQueryBuilder(...)`, cache is not transferred, which may lead to repeated computations.

---

## 12. Missing Input Validation

**`base-builder.ts:180`**
```typescript
if (input.limit <= 0) {
  throw new InvalidCursorError("limit must be greater than 0");
}
```

But there's no check for `Number.isFinite()`, `Number.isInteger()`, or maximum value.

---

## 13. Potential Memory Leak

**`sql-renderer.ts:25`**
```typescript
const ALIASED_TABLE_SQL_CACHE = new WeakMap<AliasedTable, SQL>();
```

WeakMap - good. But:

**`schema.ts:174`**
```typescript
const schemaCache = new WeakMap<Table, Map<string, ObjectSchema>>();
```

Inner `Map<string, ObjectSchema>` is never cleared and may accumulate schemas when created dynamically.

---

## Priority Summary

| Priority | Issue | Location |
|----------|-------|----------|
| Critical | Code duplication in pagination builders | `pagination-query-builder.ts` |
| High | Improve typing, remove `as never` and most `any` | Multiple files |
| Medium | Extract magic numbers into constants | `operators.ts`, `cursor/helpers.ts` |
| Low | Unify null-handling style | Multiple files |
