# Migration Plan: New Fluent Query Builder API

## Overview

Migration from the current API to a new Fluent Query Builder API with chainable methods.

---

## Current API vs New API

### Current API

```ts
// Schema creation
const productsSchema = createSchema({
  table: products,
  tableName: "products",
  fields: {
    id: { column: "id" },
    handle: { column: "handle" },
    translation: {
      column: "id",
      join: {
        schema: () => translationsSchema,
        column: "entityId",
      },
    },
  },
});

// Query builder
const qb = createCursorQueryBuilder(productsSchema, {
  cursorType: "product",
  tieBreaker: "id",
  defaultSortField: "id",
});

// Execute
const result = await qb.query(db, {
  first: 10,
  where: { deletedAt: null },
  order: ["price:asc"],
  select: ["id", "handle"],
});
```

### New API

```ts
import {
  createQuery,
  createPaginationQuery,
  leftJoin,
  innerJoin,
  field,
} from "@shopana/drizzle-gql-toolkit/builder";

// Fluent Query Builder
const usersQuery = createQuery(users, {
  id: field("id"),
  address: field("addressId", leftJoin(addressQuery, "userId")),
  orders: field("orderId", innerJoin(ordersQuery, "userId")),
})
  .defaultOrder("id:asc")
  .defaultSelect(["id", "name", "address.city"])
  .include(["id"]) // always included in select
  .exclude(["address.zipCode"]) // always excluded from select
  .maxLimit(100)
  .defaultLimit(20)
  .defaultWhere({ deletedAt: null });

// Execute
const result = await usersQuery.execute(db, { first: 10 });
const snapshot = usersQuery.getSnapshot();

// Pagination Query (for cursor-based pagination)
const productsPaginationQuery = createPaginationQuery(productsSchema, {
  // name: "product", // get from schema if not provided
  // tieBreaker: "id", // id is default
  // defaultSortField: "id",
});
```

---

## Migration Steps

### Phase 1: Core Helpers and Types

1. **Create helper functions in `src/builder/helpers.ts`**
   - `field(column, joinConfig?)` - field definition helper
   - `leftJoin(targetQuery, joinColumn)` - left join helper
   - `innerJoin(targetQuery, joinColumn)` - inner join helper
   - `rightJoin(targetQuery, joinColumn)` - right join helper
   - `fullJoin(targetQuery, joinColumn)` - full join helper

2. **Add new types in `src/types.ts`**
   ```ts
   // Field definition with optional join
   type FieldDefinition<T = unknown> = {
     column: string;
     join?: JoinDefinition;
   };

   // Join definition using fluent syntax
   type JoinDefinition = {
     type: "left" | "right" | "inner" | "full";
     target: FluentQueryBuilder<any>;
     column: string;
   };

   // Fluent Query Builder configuration (immutable)
   type FluentQueryConfig = {
     defaultOrder?: string;
     defaultSelect?: string[];
     include?: string[];
     exclude?: string[];
     maxLimit?: number;
     defaultLimit?: number;
     defaultWhere?: Record<string, unknown>;
   };
   ```

### Phase 2: Fluent Query Builder

3. **Create `src/builder/fluent-query-builder.ts`**
   - Immutable builder pattern (each method returns new instance)
   - Chain methods:
     - `.defaultOrder(order: string)` - applies if no order provided in execute()
     - `.defaultSelect(fields: string[])` - applies if no select provided in execute()
     - `.include(fields: string[])` - always include these fields in select
     - `.exclude(fields: string[])` - always exclude these fields from select
     - `.maxLimit(limit: number)` - enforces max limit, throws if exceeded
     - `.defaultLimit(limit: number)` - applies if no limit provided in execute()
     - `.defaultWhere(where: object)` - applies if no where provided in execute()
   - Execution methods:
     - `.execute(db, options?)` - execute query with runtime options
     - `.getSnapshot()` - get current configuration

4. **Create `createQuery` factory function**
   ```ts
   function createQuery<T extends Table>(
     table: T,
     fields: Record<string, FieldDefinition>
   ): FluentQueryBuilder<T>
   ```

### Phase 3: Pagination Query Builder

5. **Create `src/builder/pagination-query-builder.ts`**
   - Wraps FluentQueryBuilder with cursor pagination
   - Uses existing cursor logic from `src/cursor/`

6. **Create `createPaginationQuery` factory function**
   ```ts
   function createPaginationQuery<T extends Table>(
     schema: ObjectSchema<T>,
     options?: {
       name?: string;       // cursor type, defaults to schema.tableName
       tieBreaker?: string; // defaults to "id"
       defaultSortField?: string; // defaults to tieBreaker
     }
   ): PaginationQueryBuilder<T>
   ```

### Phase 4: Update Exports

7. **Update `src/builder/index.ts`**
   ```ts
   // New fluent API
   export { createQuery } from "./fluent-query-builder.js";
   export { createPaginationQuery } from "./pagination-query-builder.js";
   export { field, leftJoin, innerJoin, rightJoin, fullJoin } from "./helpers.js";

   // Keep existing exports for backward compatibility
   export { createQueryBuilder } from "./query-builder.js";
   ```

8. **Verify package.json exports**
   - Ensure `@shopana/drizzle-gql-toolkit/builder` export path works

---

## Implementation Details

### `field()` Helper

```ts
function field(column: string): FieldDefinition;
function field(column: string, join: JoinDefinition): FieldDefinition;
function field(column: string, join?: JoinDefinition): FieldDefinition {
  return { column, join };
}
```

### Join Helpers

```ts
function leftJoin<T>(targetQuery: FluentQueryBuilder<T>, column: string): JoinDefinition {
  return { type: "left", target: targetQuery, column };
}

function innerJoin<T>(targetQuery: FluentQueryBuilder<T>, column: string): JoinDefinition {
  return { type: "inner", target: targetQuery, column };
}
```

### FluentQueryBuilder (Immutable Pattern)

```ts
class FluentQueryBuilder<T extends Table, Fields extends FieldsDef = FieldsDef> {
  private readonly table: T;
  private readonly fields: Map<string, FieldDefinition>;
  private readonly config: FluentQueryConfig;

  // Each method returns new instance with updated config
  defaultOrder(order: string): FluentQueryBuilder<T, Fields> {
    return new FluentQueryBuilder(this.table, this.fields, {
      ...this.config,
      defaultOrder: order,
    });
  }

  defaultSelect(fields: string[]): FluentQueryBuilder<T, Fields> {
    return new FluentQueryBuilder(this.table, this.fields, {
      ...this.config,
      defaultSelect: fields,
    });
  }

  include(fields: string[]): FluentQueryBuilder<T, Fields> {
    return new FluentQueryBuilder(this.table, this.fields, {
      ...this.config,
      include: fields,
    });
  }

  exclude(fields: string[]): FluentQueryBuilder<T, Fields> {
    return new FluentQueryBuilder(this.table, this.fields, {
      ...this.config,
      exclude: fields,
    });
  }

  // ... other methods (maxLimit, defaultLimit, defaultWhere)

  async execute(db: DrizzleExecutor, options?: QueryOptions): Promise<T["$inferSelect"][]> {
    // Runtime options override defaults:
    // - options.order ?? config.defaultOrder
    // - (options.select ?? config.defaultSelect) + config.include - config.exclude
    // - options.limit ?? config.defaultLimit (capped by config.maxLimit)
    // - options.where ?? config.defaultWhere
  }

  getSnapshot(): FluentQueryConfig {
    return { ...this.config };
  }
}
```

---

## Configuration Behavior

| Method | Behavior |
|--------|----------|
| `.defaultOrder(x)` | Used if no `order` in execute() options |
| `.defaultSelect(x)` | Used if no `select` in execute() options |
| `.include(x)` | Fields always added to final select |
| `.exclude(x)` | Fields always removed from final select |
| `.maxLimit(x)` | Maximum allowed limit (throws if exceeded) |
| `.defaultLimit(x)` | Used if no `limit` in execute() options |
| `.defaultWhere(x)` | Used if no `where` in execute() options |

### Runtime Options Priority

```ts
// execute() options override builder defaults
await query.execute(db, {
  order: ["price:desc"],     // overrides defaultOrder
  select: ["id", "name"],    // overrides defaultSelect
  limit: 50,                 // overrides defaultLimit (capped by maxLimit)
  where: { status: "active" } // overrides defaultWhere
});
```

---

## File Structure After Migration

```
src/
├── builder/
│   ├── index.ts                    # Updated exports
│   ├── helpers.ts                  # NEW: field, leftJoin, innerJoin, etc.
│   ├── fluent-query-builder.ts     # NEW: FluentQueryBuilder class
│   ├── pagination-query-builder.ts # NEW: PaginationQueryBuilder class
│   ├── query-builder.ts            # Existing (keep for compatibility)
│   ├── where-builder.ts            # Existing
│   ├── order-builder.ts            # Existing
│   ├── join-collector.ts           # Existing
│   └── sql-renderer.ts             # Existing
├── cursor/
│   └── ...                         # Existing cursor logic
├── schema.ts                       # Existing (may need minor updates)
├── types.ts                        # Updated with new types
└── index.ts                        # Main exports
```

---

## Testing Plan

1. **Unit tests for helpers** (`src/builder/helpers.test.ts`)
   - `field()` creates correct FieldDefinition
   - `leftJoin()`, `innerJoin()` create correct JoinDefinition

2. **Unit tests for FluentQueryBuilder** (`src/builder/fluent-query-builder.test.ts`)
   - Each chain method returns new instance (immutability)
   - Config merging logic
   - Default vs explicit values
   - Limit validation (maxLimit)

3. **Integration tests** (`src/builder/fluent-query-builder.integration.test.ts`)
   - End-to-end query execution
   - JOIN generation from field definitions
   - Pagination with cursors

4. **Update existing tests** in `src/cursor/integration.test.ts`
   - Replace mock API examples with real implementation tests

---

## Backward Compatibility

- Keep `createSchema()` and `createQueryBuilder()` exports
- Keep `createCursorQueryBuilder()` for existing code
- New API is additive, not breaking

---

## Timeline Estimate

| Phase | Description |
|-------|-------------|
| Phase 1 | Core helpers and types |
| Phase 2 | Fluent Query Builder |
| Phase 3 | Pagination Query Builder |
| Phase 4 | Exports and documentation |
| Testing | Unit and integration tests |

---

## Open Questions

1. **Schema Inference**: Should `createQuery(table, fields)` automatically infer table name from Drizzle table?
2. **Field Column Mapping**: Should we support automatic column mapping from field name (e.g., `id: field()` assumes column "id")?
3. **Nested Query Composition**: How should nested FluentQueryBuilders share configuration?
4. **Error Messages**: What validation errors should be thrown for invalid configurations?
