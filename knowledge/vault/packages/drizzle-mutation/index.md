---
tags:
  - package
  - drizzle
  - mutation
  - diff
  - repository
related:
  - drizzle-query/index
  - patterns/repository
  - patterns/script
  - shared-kernel/transaction-manager
---
# @shopana/drizzle-mutation

Architecture plan for a type-safe mutation planner for Drizzle ORM.

## Goal

`@shopana/drizzle-mutation` should generate deterministic database mutation plans from typed input and current database state. It complements `@shopana/drizzle-query`: query builders read graph-shaped data, mutation builders synchronize graph-shaped aggregate input back into PostgreSQL.

The package should not replace scripts, repositories, validation, authorization, or business workflows. It should be a lower-level repository helper for repetitive insert, update, delete, and nested collection synchronization logic.

## Problem

Complex update mutations often need the same sequence of steps:

1. Load the current aggregate from the database.
2. Compare it with user input.
3. Update changed scalar fields.
4. Insert nested records that are present in input but missing in the database.
5. Update nested records that exist in both places.
6. Delete, soft-delete, detach, or ignore nested records missing from input.
7. Execute all operations in one transaction.

Hand-writing this logic in every repository creates duplicated code and inconsistent behavior around tenancy filters, timestamps, optimistic locking, nested deletes, and idempotent updates.

## Non-Goals

- Do not expose raw JSON Patch as the primary public API.
- Do not encode business rules in the mutation builder.
- Do not run authorization checks.
- Do not replace Script Pattern for GraphQL mutations.
- Do not bypass repository transaction-aware connections.
- Do not infer destructive deletes without explicit configuration.
- Do not generate Drizzle migrations.

## Layering

```text
GraphQL resolver
  -> Script
     - validation
     - authorization
     - business invariants
     - workflow orchestration
    -> Repository
       - tenant context
       - aggregate-specific persistence methods
      -> drizzle-mutation
         - load current state
         - normalize input/state
         - build mutation plan
         - execute Drizzle operations
        -> Drizzle ORM
```

Repositories remain the integration point. They pass `this.connection` to the mutation builder so transaction propagation still comes from `TransactionManager`.

## Core Concept

The central abstraction is an aggregate mutation config:

```typescript
import { createMutation, field, relation } from "@shopana/drizzle-mutation";

export const productMutation = createMutation(products, {
  name: "product",
  key: products.id,

  scope: ({ ctx }) => eq(products.projectId, ctx.store.id),

  fields: {
    title: field(products.title),
    status: field(products.status),
    description: field(products.description),
  },

  relations: {
    variants: relation(productVariants, {
      kind: "many",
      key: productVariants.id,
      parentKey: products.id,
      childForeignKey: productVariants.productId,

      fields: {
        sku: field(productVariants.sku),
        price: field(productVariants.price),
      },

      missing: "delete",
    }),
  },

  timestamps: {
    createdAt: products.createdAt,
    updatedAt: products.updatedAt,
  },
});
```

Example repository usage:

```typescript
async syncProduct(input: ProductSyncInput): Promise<ProductMutationResult> {
  return productMutation.apply(this.connection, {
    id: input.id,
    input,
    ctx: this.ctx,
  });
}
```

## Public API

### createMutation()

Creates an immutable mutation builder for one aggregate root.

```typescript
const mutation = createMutation(table, config)
  .defaultMissing("ignore")
  .returning(["id"])
  .optimisticLock({ column: products.updatedAt });
```

Configuration methods should return a new builder, matching the `drizzle-query` immutable builder style.

### diff()

Builds a mutation plan without executing it.

```typescript
const plan = await productMutation.diff(db, {
  id: productId,
  input,
  ctx,
});
```

Use cases:

- audit preview;
- debugging generated operations;
- dry-run validation;
- snapshot testing;
- event payload construction.

### apply()

Builds and executes a mutation plan.

```typescript
const result = await productMutation.apply(db, {
  id: productId,
  input,
  ctx,
});
```

`apply()` must execute against the connection passed by the repository. It must not create a new database connection or transaction manager.

### plan()

Builds a plan from already-loaded current state.

```typescript
const current = await repository.product.findAggregate(input.id);
const plan = productMutation.plan({
  current,
  input,
  ctx,
});
```

This avoids duplicate reads when a script or repository has already loaded the aggregate for business validation.

## Operation Model

The internal planner emits normalized operations:

```typescript
type MutationOperation =
  | InsertOperation
  | UpdateOperation
  | DeleteOperation
  | SoftDeleteOperation
  | DetachOperation;

interface InsertOperation {
  readonly type: "insert";
  readonly path: string;
  readonly table: unknown;
  readonly values: Record<string, unknown>;
  readonly returning?: Record<string, unknown>;
}

interface UpdateOperation {
  readonly type: "update";
  readonly path: string;
  readonly table: unknown;
  readonly where: unknown;
  readonly set: Record<string, unknown>;
}

interface DeleteOperation {
  readonly type: "delete";
  readonly path: string;
  readonly table: unknown;
  readonly where: unknown;
}

interface SoftDeleteOperation {
  readonly type: "softDelete";
  readonly path: string;
  readonly table: unknown;
  readonly where: unknown;
  readonly set: Record<string, unknown>;
}

interface DetachOperation {
  readonly type: "detach";
  readonly path: string;
  readonly table: unknown;
  readonly where: unknown;
  readonly set: Record<string, unknown>;
}
```

The execution layer converts these operations to Drizzle insert, update, and delete calls.

## Internal Architecture

```text
createMutation()
  -> Config Compiler
     - validates relation config
     - resolves keys and field mappings
     - prepares type metadata
  -> Snapshot Loader
     - selects current aggregate state
     - applies tenant scope
     - applies soft-delete filters
  -> Normalizer
     - converts input into comparable nodes
     - converts database rows into comparable nodes
     - applies defaults and generated IDs
  -> Diff Engine
     - compares scalar fields
     - matches collection items by configured identity
     - emits logical changes
  -> Plan Builder
     - converts changes into operations
     - orders operations by dependency
     - adds scope, timestamps, version checks
  -> Executor
     - executes operations through Drizzle
     - collects returning data
     - reports affected rows and conflicts
```

## Diff Semantics

### Object Fields

For scalar fields:

- `undefined` means "not provided" and must not update a column.
- `null` means "set database column to null" when the field is nullable.
- equal values produce no operation.
- changed values produce one update operation for the owning row.

### Collections

Collection items must have an identity strategy:

```typescript
identity: "id"
```

or:

```typescript
identity: (item) => item.sku
```

Matching rules:

| Input item | Database item | Result |
|------------|---------------|--------|
| present | present | diff and update |
| present | missing | insert |
| missing | present | configured missing policy |
| missing | missing | no-op |

The builder must reject collection sync when it cannot determine stable identity.

### Missing Policy

Relations must explicitly define how to handle database rows missing from input:

| Policy | Behavior |
|--------|----------|
| `ignore` | leave database rows unchanged |
| `delete` | physically delete missing rows |
| `softDelete` | set configured delete marker |
| `detach` | set foreign key to null |
| `forbid` | fail planning if input omits existing rows |

Default policy should be `ignore`.

## Tenancy and Scope

Every root and relation config should support a `scope` callback:

```typescript
scope: ({ ctx }) => eq(products.projectId, ctx.store.id)
```

The scope must be applied to:

- root snapshot loads;
- relation snapshot loads;
- update where clauses;
- delete where clauses;
- optimistic-lock checks.

The package should prefer explicit scope configuration over implicit column-name conventions.

## Optimistic Locking

Optimistic locking should be optional but first-class:

```typescript
optimisticLock: {
  column: products.updatedAt,
  inputField: "updatedAt",
}
```

If the current database value does not match the expected input value, execution should fail with a conflict result before applying later operations.

Result shape:

```typescript
interface MutationConflict {
  readonly path: string;
  readonly code: "STALE_OBJECT" | "MISSING_OBJECT" | "AFFECTED_ROWS_MISMATCH";
  readonly message: string;
}
```

Scripts should translate conflicts into GraphQL `userErrors`.

## Timestamps and Generated Values

The builder should support generated values without owning domain-specific ID rules:

```typescript
defaults: {
  id: () => uuidv7(),
  projectId: ({ ctx }) => ctx.store.id,
}
```

Timestamp helpers:

```typescript
timestamps: {
  createdAt: products.createdAt,
  updatedAt: products.updatedAt,
  now: () => new Date().toISOString(),
}
```

Rules:

- insert sets both `createdAt` and `updatedAt`;
- update sets only `updatedAt` when at least one persisted field changed;
- no-op plans must not touch timestamps.

## Hooks

Hooks should be scoped to persistence concerns, not business logic:

```typescript
hooks: {
  beforePlan(context) {},
  beforeOperation(operation, context) {},
  afterOperation(operation, result, context) {},
}
```

Allowed hook use cases:

- audit metadata;
- normalized value transforms;
- operation logging;
- injecting generated persistence fields.

Disallowed hook use cases:

- permission checks;
- external API calls;
- payment capture;
- workflow orchestration;
- domain transitions that belong in scripts.

## Error Model

The package should throw or return structured technical errors:

| Error | Meaning |
|-------|---------|
| `InvalidMutationConfigError` | config cannot be compiled |
| `MissingIdentityError` | collection item cannot be matched |
| `MutationConflictError` | optimistic lock or affected-row mismatch |
| `MutationExecutionError` | Drizzle operation failed |
| `UnsafeDeleteError` | destructive operation lacks explicit policy or scope |

Repository methods may let these errors bubble to scripts. Scripts convert them to service-specific `userErrors`.

## Type Inference

The package should infer:

- input type from configured fields and relations;
- plan operation paths;
- result entity keys;
- missing-policy-specific input requirements;
- nullable versus optional field behavior.

Example:

```typescript
export type ProductMutationInput = InferMutationInput<typeof productMutation>;
export type ProductMutationPlan = InferMutationPlan<typeof productMutation>;
export type ProductMutationResult = InferMutationResult<typeof productMutation>;
```

## Execution Ordering

The plan builder must order operations by dependency:

1. Root insert.
2. Parent updates required by child inserts.
3. Child inserts.
4. Child updates.
5. Child detach or soft-delete.
6. Child physical delete.
7. Root update.
8. Root delete.

Physical deletes should normally run from deepest child to root. Inserts should run from root to child so foreign keys are available.

## Idempotency

The builder should aim for deterministic plans:

- stable operation ordering;
- stable generated IDs when caller provides them;
- no update operations for unchanged values;
- no timestamp changes for no-op plans.

Durable idempotency and workflow retry behavior should remain in DBOS scripts/workflows. The mutation builder can expose plan hashes for idempotency keys, but should not own workflow execution.

## Audit and Events

`diff()` should expose enough metadata for audit/event construction:

```typescript
interface MutationChange {
  readonly path: string;
  readonly field?: string;
  readonly before: unknown;
  readonly after: unknown;
  readonly operation: "insert" | "update" | "delete" | "softDelete" | "detach";
}
```

Scripts decide which changes become domain events.

## Package Structure

```text
packages/drizzle-mutation/
  package.json
  tsconfig.json
  src/
    index.ts
    create-mutation.ts
    config/
      compiler.ts
      errors.ts
      types.ts
    diff/
      compare.ts
      collections.ts
      normalizer.ts
      types.ts
    plan/
      builder.ts
      ordering.ts
      operations.ts
      types.ts
    execute/
      executor.ts
      drizzle-executor.ts
      result.ts
    infer/
      input.ts
      result.ts
      plan.ts
    helpers/
      field.ts
      relation.ts
      timestamps.ts
    __tests__/
      scalar-update.test.ts
      collection-sync.test.ts
      missing-policy.test.ts
      optimistic-lock.test.ts
      tenant-scope.test.ts
```

## MVP Scope

The first version should be deliberately narrow:

- one aggregate root table;
- scalar insert and update;
- one-level `hasMany` relation;
- `ignore`, `delete`, and `forbid` missing policies;
- tenant `scope` applied to all writes;
- `createdAt` and `updatedAt` helper support;
- `diff()`, `plan()`, and `apply()`;
- no GraphQL codegen;
- no DBOS integration;
- no many-to-many sync.

## Later Phases

### Phase 1: Core Planner

- config compiler;
- scalar field diff;
- insert/update/delete operation model;
- deterministic operation ordering;
- dry-run plan output.

### Phase 2: Repository Integration

- Drizzle executor;
- transaction-aware connection usage;
- tenant scope enforcement;
- timestamp and default value helpers;
- affected-row verification.

### Phase 3: Nested Aggregates

- one-level `hasMany`;
- nested `hasOne`;
- missing policies;
- relation-level scopes;
- child ordering.

### Phase 4: Safety and Concurrency

- optimistic locking;
- stale object conflicts;
- unsafe delete detection;
- no-op detection;
- plan hash generation.

### Phase 5: Developer Experience

- type inference helpers;
- better error messages;
- plan pretty-printer;
- cookbook examples for catalog products, variants, media, and options.

### Phase 6: Advanced Sync

- many-to-many join table sync;
- soft-delete restoration;
- partial relation patching;
- bulk apply;
- audit change emitters.

## Example: Product Aggregate Sync

Input:

```typescript
{
  id: "product-1",
  title: "T-Shirt",
  variants: [
    { id: "variant-1", sku: "TS-RED-S", price: "100.00" },
    { sku: "TS-BLUE-M", price: "120.00" }
  ]
}
```

Current state:

```typescript
{
  id: "product-1",
  title: "Old T-Shirt",
  variants: [
    { id: "variant-1", sku: "TS-RED-S", price: "90.00" },
    { id: "variant-2", sku: "TS-GREEN-L", price: "110.00" }
  ]
}
```

Generated logical changes:

```text
update product.title: "Old T-Shirt" -> "T-Shirt"
update variants[variant-1].price: "90.00" -> "100.00"
insert variants[new].sku: "TS-BLUE-M"
delete variants[variant-2]
```

Generated operations:

```text
update products set title, updated_at where project_id and id
update product_variants set price, updated_at where project_id and id
insert product_variants values (...)
delete product_variants where project_id and id
```

## Open Questions

- Should generated IDs be created by the builder or always passed by repositories?
- Should `apply()` return only affected IDs or re-select the aggregate after execution?
- Should relation input default to full sync or partial patch semantics?
- Should soft-delete rows be included in snapshot loading for restore support?
- Should plan execution stop at first conflict or collect all detectable conflicts first?
- Should this package share field metadata with `@shopana/drizzle-query` or keep independent helpers?

## Recommended Defaults

| Concern | Default |
|---------|---------|
| Missing collection rows | `ignore` |
| Destructive delete | require explicit relation policy |
| Field omitted from input | no update |
| Field set to `null` | set nullable column to null |
| Empty `set` object | no operation |
| Timestamp on no-op | unchanged |
| Scope | required for tenant-owned aggregates |
| Execution | repository-provided connection only |
| Builder style | immutable fluent API |

## See Also

- [[drizzle-query/index]] - query builder package
- [[patterns/repository]] - repository pattern with transaction-aware connections
- [[patterns/script]] - mutation business logic pattern
- [[shared-kernel/transaction-manager]] - transaction propagation
