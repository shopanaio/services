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

Архитектурный план type-safe mutation planner для Drizzle ORM.

## Цель

`@shopana/drizzle-mutation` должен генерировать детерминированные планы мутаций базы данных на основе типизированного input и текущего состояния в базе. Пакет дополняет `@shopana/drizzle-query`: query builders читают graph-shaped данные, а mutation builders синхронизируют graph-shaped aggregate input обратно в PostgreSQL.

Пакет не должен заменять scripts, repositories, validation, authorization или business workflows. Это низкоуровневый repository helper для повторяющейся логики insert, update, delete и синхронизации вложенных коллекций.

## Проблема

Сложные update mutations часто требуют одной и той же последовательности шагов:

1. Загрузить текущий aggregate из базы данных.
2. Сравнить его с пользовательским input.
3. Обновить измененные scalar fields.
4. Вставить вложенные записи, которые есть в input, но отсутствуют в базе.
5. Обновить вложенные записи, которые существуют и в input, и в базе.
6. Удалить, soft-delete, detach или проигнорировать вложенные записи, отсутствующие в input.
7. Выполнить все операции в одной транзакции.

Если писать эту логику вручную в каждом repository, появляется дублирование и несогласованное поведение вокруг tenancy filters, timestamps, optimistic locking, nested deletes и idempotent updates.

## Не Цели

- Не выставлять raw JSON Patch как основной публичный API.
- Не кодировать business rules внутри mutation builder.
- Не выполнять authorization checks.
- Не заменять Script Pattern для GraphQL mutations.
- Не обходить repository transaction-aware connections.
- Не выводить destructive deletes неявно без явной конфигурации.
- Не генерировать Drizzle migrations.

## Слои

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

Repositories остаются точкой интеграции. Они передают `this.connection` в mutation builder, поэтому transaction propagation по-прежнему идет через `TransactionManager`.

## Основная Идея

Центральная абстракция - aggregate mutation config:

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

Пример использования в repository:

```typescript
async syncProduct(input: ProductSyncInput): Promise<ProductMutationResult> {
  return productMutation.apply(this.connection, {
    id: input.id,
    input,
    ctx: this.ctx,
  });
}
```

## Публичный API

### createMutation()

Создает immutable mutation builder для одного aggregate root.

```typescript
const mutation = createMutation(table, config)
  .defaultMissing("ignore")
  .returning(["id"])
  .optimisticLock({ column: products.updatedAt });
```

Configuration methods должны возвращать новый builder, как в immutable builder style у `drizzle-query`.

### diff()

Строит mutation plan без выполнения.

```typescript
const plan = await productMutation.diff(db, {
  id: productId,
  input,
  ctx,
});
```

Use cases:

- audit preview;
- debugging сгенерированных операций;
- dry-run validation;
- snapshot testing;
- построение event payload.

### apply()

Строит и выполняет mutation plan.

```typescript
const result = await productMutation.apply(db, {
  id: productId,
  input,
  ctx,
});
```

`apply()` должен выполняться через connection, переданный repository. Он не должен создавать новое подключение к базе или новый transaction manager.

### plan()

Строит plan из уже загруженного current state.

```typescript
const current = await repository.product.findAggregate(input.id);
const plan = productMutation.plan({
  current,
  input,
  ctx,
});
```

Это позволяет избежать повторного чтения, если script или repository уже загрузили aggregate для business validation.

## Модель Операций

Внутренний planner генерирует нормализованные операции:

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

Execution layer преобразует эти операции в Drizzle insert, update и delete calls.

## Внутренняя Архитектура

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

## Семантика Diff

### Object Fields

Для scalar fields:

- `undefined` означает "не передано" и не должен обновлять колонку.
- `null` означает "установить database column в null", если field nullable.
- равные значения не создают операции.
- измененные значения создают одну update operation для owning row.

### Collections

Collection items должны иметь identity strategy:

```typescript
identity: "id"
```

или:

```typescript
identity: (item) => item.sku
```

Правила matching:

| Input item | Database item | Result |
|------------|---------------|--------|
| present | present | diff and update |
| present | missing | insert |
| missing | present | configured missing policy |
| missing | missing | no-op |

Builder должен отклонять collection sync, если не может определить стабильную identity.

### Missing Policy

Relations должны явно определять, что делать с database rows, отсутствующими в input:

| Policy | Behavior |
|--------|----------|
| `ignore` | оставить database rows без изменений |
| `delete` | физически удалить missing rows |
| `softDelete` | установить configured delete marker |
| `detach` | установить foreign key в null |
| `forbid` | упасть на planning, если input пропускает existing rows |

Default policy должна быть `ignore`.

## Tenancy и Scope

Каждый root и relation config должен поддерживать `scope` callback:

```typescript
scope: ({ ctx }) => eq(products.projectId, ctx.store.id)
```

Scope должен применяться к:

- root snapshot loads;
- relation snapshot loads;
- update where clauses;
- delete where clauses;
- optimistic-lock checks.

Пакет должен предпочитать явную scope configuration, а не implicit conventions по именам колонок.

## Optimistic Locking

Optimistic locking должен быть optional, но first-class:

```typescript
optimisticLock: {
  column: products.updatedAt,
  inputField: "updatedAt",
}
```

Если текущее значение в базе не совпадает с ожидаемым значением из input, execution должен завершиться conflict result до применения последующих операций.

Result shape:

```typescript
interface MutationConflict {
  readonly path: string;
  readonly code: "STALE_OBJECT" | "MISSING_OBJECT" | "AFFECTED_ROWS_MISMATCH";
  readonly message: string;
}
```

Scripts должны переводить conflicts в GraphQL `userErrors`.

## Timestamps и Generated Values

Builder должен поддерживать generated values, но не владеть domain-specific ID rules:

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

Правила:

- insert выставляет и `createdAt`, и `updatedAt`;
- update выставляет только `updatedAt`, когда изменилось хотя бы одно persisted field;
- no-op plans не должны менять timestamps.

## Hooks

Hooks должны быть ограничены persistence concerns, а не business logic:

```typescript
hooks: {
  beforePlan(context) {},
  beforeOperation(operation, context) {},
  afterOperation(operation, result, context) {},
}
```

Разрешенные use cases для hooks:

- audit metadata;
- normalized value transforms;
- operation logging;
- injecting generated persistence fields.

Запрещенные use cases для hooks:

- permission checks;
- external API calls;
- payment capture;
- workflow orchestration;
- domain transitions, которые должны жить в scripts.

## Error Model

Пакет должен throw или return structured technical errors:

| Error | Meaning |
|-------|---------|
| `InvalidMutationConfigError` | config нельзя скомпилировать |
| `MissingIdentityError` | collection item нельзя сопоставить |
| `MutationConflictError` | optimistic lock или affected-row mismatch |
| `MutationExecutionError` | Drizzle operation упала |
| `UnsafeDeleteError` | destructive operation не имеет явной policy или scope |

Repository methods могут позволить этим errors подняться до scripts. Scripts переводят их в service-specific `userErrors`.

## Type Inference

Пакет должен infer:

- input type из configured fields и relations;
- plan operation paths;
- result entity keys;
- missing-policy-specific input requirements;
- nullable versus optional field behavior.

Пример:

```typescript
export type ProductMutationInput = InferMutationInput<typeof productMutation>;
export type ProductMutationPlan = InferMutationPlan<typeof productMutation>;
export type ProductMutationResult = InferMutationResult<typeof productMutation>;
```

## Порядок Выполнения

Plan builder должен упорядочивать операции по dependencies:

1. Root insert.
2. Parent updates, необходимые для child inserts.
3. Child inserts.
4. Child updates.
5. Child detach или soft-delete.
6. Child physical delete.
7. Root update.
8. Root delete.

Physical deletes обычно должны выполняться от самого глубокого child к root. Inserts должны выполняться от root к child, чтобы foreign keys уже были доступны.

## Idempotency

Builder должен стремиться к deterministic plans:

- stable operation ordering;
- stable generated IDs, если caller их передает;
- отсутствие update operations для неизмененных значений;
- отсутствие timestamp changes для no-op plans.

Durable idempotency и workflow retry behavior должны оставаться в DBOS scripts/workflows. Mutation builder может expose plan hashes для idempotency keys, но не должен владеть workflow execution.

## Audit и Events

`diff()` должен предоставлять достаточно metadata для построения audit/events:

```typescript
interface MutationChange {
  readonly path: string;
  readonly field?: string;
  readonly before: unknown;
  readonly after: unknown;
  readonly operation: "insert" | "update" | "delete" | "softDelete" | "detach";
}
```

Scripts решают, какие changes становятся domain events.

## Структура Пакета

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

Первая версия должна быть намеренно узкой:

- одна aggregate root table;
- scalar insert и update;
- one-level `hasMany` relation;
- missing policies `ignore`, `delete` и `forbid`;
- tenant `scope`, применяемый ко всем writes;
- поддержка helpers для `createdAt` и `updatedAt`;
- `diff()`, `plan()` и `apply()`;
- без GraphQL codegen;
- без DBOS integration;
- без many-to-many sync.

## Следующие Фазы

### Phase 1: Core Planner

- config compiler;
- scalar field diff;
- insert/update/delete operation model;
- deterministic operation ordering;
- dry-run plan output.

### Phase 2: Repository Integration

- Drizzle executor;
- использование transaction-aware connection;
- tenant scope enforcement;
- helpers для timestamp и default values;
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
- более понятные error messages;
- plan pretty-printer;
- cookbook examples для catalog products, variants, media и options.

### Phase 6: Advanced Sync

- many-to-many join table sync;
- soft-delete restoration;
- partial relation patching;
- bulk apply;
- audit change emitters.

## Пример: Product Aggregate Sync

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

## Открытые Вопросы

- Должен ли builder создавать generated IDs или repositories всегда должны передавать их сами?
- Должен ли `apply()` возвращать только affected IDs или заново читать aggregate после execution?
- Должен ли relation input по умолчанию означать full sync или partial patch semantics?
- Нужно ли включать soft-delete rows в snapshot loading для restore support?
- Должен ли plan execution останавливаться на первом conflict или сначала собирать все detectable conflicts?
- Должен ли этот пакет переиспользовать field metadata из `@shopana/drizzle-query` или держать независимые helpers?

## Рекомендуемые Defaults

| Concern | Default |
|---------|---------|
| Missing collection rows | `ignore` |
| Destructive delete | требует явной relation policy |
| Field omitted from input | no update |
| Field set to `null` | set nullable column to null |
| Empty `set` object | no operation |
| Timestamp on no-op | unchanged |
| Scope | required for tenant-owned aggregates |
| Execution | только repository-provided connection |
| Builder style | immutable fluent API |

## См. Также

- [[drizzle-query/index]] - query builder package
- [[patterns/repository]] - repository pattern with transaction-aware connections
- [[patterns/script]] - mutation business logic pattern
- [[shared-kernel/transaction-manager]] - transaction propagation
