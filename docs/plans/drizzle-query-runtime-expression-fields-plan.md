# План: runtime expressions и scoped joins для `@shopana/drizzle-query`

## Цель

Усовершенствовать `@shopana/drizzle-query`, чтобы Relay/list queries могли
легко собирать SQL-запросы с:

- обычными table/view columns;
- computed SQL expression fields;
- runtime `LEFT JOIN` / subquery joins, зависящими от repository input;
- корректной TypeScript типизацией `where`, `orderBy`, `select`, result rows и
  Relay input;
- корректной GraphQL schema generation для filter/order input types.

Основной мотивирующий кейс: `inventoryQuery.inventoryItems` должен уметь
фильтровать и сортировать по stock fields, где значения считаются из
`warehouse_stock` по runtime `warehouseScope`.

При этом Inventory не должен писать отдельный SQL helper для Relay pagination.
Решение должно остаться внутри `@shopana/drizzle-query`, а repository должен
только сконфигурировать query builder.

## Текущее ограничение

Сейчас field в `@shopana/drizzle-query` фактически описывает колонку:

```ts
type FieldConfig = {
  column: string;
  join?: Join;
};
```

`WhereBuilder`, `OrderBuilder` и `SqlRenderer` рендерят field как:

```sql
"alias"."column"
```

Это хорошо работает для table/view columns и static joins, но не выражает:

```sql
coalesce(stock_scope.quantity_on_hand, 0)
```

и не умеет добавлять runtime join:

```sql
LEFT JOIN (
  SELECT project_id, variant_id, SUM(quantity_on_hand) AS quantity_on_hand
  FROM inventory.warehouse_stock
  WHERE project_id = $1
  GROUP BY project_id, variant_id
) stock_scope
  ON stock_scope.project_id = inventory_item_list_view.project_id
 AND stock_scope.variant_id = inventory_item_list_view.variant_id
```

Также GraphQL generator сейчас извлекает типы в основном из Drizzle table
columns. Для expression field ему нужен явный metadata source.

## Target Developer Experience

Repository должен писать примерно так:

```ts
const inventoryItemStockQuery = createQuery(inventoryItemListView)
  .withRuntimeJoin(buildStockScopeJoin(warehouseScope))
  .extendFields({
    quantityOnHand: expression<number>({
      sql: ({ ref }) => sql`coalesce(${ref("stock_scope.quantity_on_hand")}, 0)`,
      graphqlType: "Int",
    }),
    reservedQuantity: expression<number>({
      sql: ({ ref }) => sql`coalesce(${ref("stock_scope.reserved_qty")}, 0)`,
      graphqlType: "Int",
    }),
    unavailableQuantity: expression<number>({
      sql: ({ ref }) => sql`coalesce(${ref("stock_scope.unavailable_qty")}, 0)`,
      graphqlType: "Int",
    }),
    availableForSale: expression<number>({
      sql: ({ ref }) => sql`
        coalesce(${ref("stock_scope.quantity_on_hand")}, 0)
        - coalesce(${ref("stock_scope.reserved_qty")}, 0)
        - coalesce(${ref("stock_scope.unavailable_qty")}, 0)
      `,
      graphqlType: "Int",
    }),
  });

export const inventoryItemStockRelayQuery = createRelayQuery(
  inventoryItemStockQuery
    .include(["id", "variantId"])
    .mapWhereFields({
      id: decodeInventoryItemGlobalId,
      productId: decodeProductGlobalId,
      variantId: decodeVariantGlobalId,
    })
    .maxLimit(100)
    .defaultLimit(20),
  { name: "inventoryItem", tieBreaker: "id" },
);
```

После этого expression fields должны быть обычными top-level fields:

```ts
await inventoryItemStockRelayQuery.execute(db, {
  first: 20,
  where: {
    availableForSale: { _gt: 0 },
  },
  orderBy: [
    { field: "availableForSale", direction: "desc" },
  ],
});
```

Relay builder должен сам построить stable keyset pagination:

```sql
ORDER BY
  coalesce(stock_scope.quantity_on_hand, 0)
  - coalesce(stock_scope.reserved_qty, 0)
  - coalesce(stock_scope.unavailable_qty, 0) DESC,
  id DESC
```

и cursor seek condition по тому же expression:

```sql
WHERE (
  available_for_sale_expression < :cursorAvailable
  OR (
    available_for_sale_expression = :cursorAvailable
    AND id < :cursorId
  )
)
```

## Target Public API

### `expression<T>()`

Добавить field helper:

```ts
type ExpressionFieldOptions<TValue> = {
  sql: SQL | ((ctx: RenderContext) => SQL);
  graphqlType: GraphQLFieldType;
  nullable?: boolean;
  filterable?: boolean;
  orderable?: boolean;
  selectable?: boolean;
};

function expression<TValue>(
  options: ExpressionFieldOptions<TValue>,
): ExpressionFieldDefinition<TValue>;
```

Defaults:

- `nullable: false`;
- `filterable: true`;
- `orderable: true`;
- `selectable: true`.

`graphqlType` is required for expressions. The generator cannot infer it from a
Drizzle column.

### `extendFields()`

Add immutable builder method:

```ts
extendFields<const ExtraFields extends FluentFieldsDef>(
  fields: ExtraFields,
): FluentQueryBuilder<
  T,
  MergeFields<Fields, ExtraFields>,
  ToFieldsDef<MergeFields<Fields, ExtraFields>>,
  MergeResultTypes<Types, InferFieldResultTypes<T, ExtraFields>>
>;
```

Rules:

- field names must not collide unless a future explicit override API is added;
- extended fields participate in `where`, `orderBy`, `select`, Relay cursors and
  GraphQL generation;
- extended fields must be visible in `getSnapshot().fields`.

### `withRuntimeJoin()`

Add immutable builder method:

```ts
type RuntimeJoin = {
  alias: string;
  type: "left" | "inner";
  source: RuntimeJoinSource;
  on: SQL | ((ctx: RenderContext) => SQL);
  cardinality?: "one" | "many";
};

type RuntimeJoinSource =
  | { kind: "table"; table: Selectable }
  | { kind: "sql"; sql: SQL };

withRuntimeJoin(join: RuntimeJoin): FluentQueryBuilder<...>;
withRuntimeJoins(joins: RuntimeJoin[]): FluentQueryBuilder<...>;
```

Rules:

- alias must be unique and must not collide with auto-join aliases;
- runtime joins are rendered for `execute`, `count`, `getSql`, `getCountSql`,
  Relay and Cursor builders;
- runtime joins are available to expression fields through `RenderContext`;
- list/Relay queries that use a runtime join for filtering/sorting should use
  `cardinality: "one"` unless the query intentionally handles duplicates;
- `cardinality: "many"` should be allowed only for explicit advanced use and
  should be documented as unsafe for keyset pagination unless the query groups
  or distincts base rows.

Helper constructors can make common sources less verbose:

```ts
runtimeTable(warehouseStock)
runtimeSql(sql`(...)`)
```

### `RenderContext`

Expression fields and runtime join `on` clauses need a safe way to reference
aliases:

```ts
type RenderContext = {
  mainAlias: string;
  ref(path: string): SQL;
  main(field: string): SQL;
  runtime(alias: string, column: string): SQL;
};
```

Examples:

```ts
ctx.main("project_id")
ctx.ref("stock_scope.quantity_on_hand")
ctx.runtime("stock_scope", "reserved_qty")
```

`ref("alias.column")` should render identifiers, not raw text:

```sql
"stock_scope"."quantity_on_hand"
```

Do not require callers to interpolate raw alias strings manually.

## Internal Data Model

### Field definitions

Replace the current column-only field model with a discriminated shape:

```ts
type ColumnFieldDefinition<TValue = unknown> = {
  kind: "column";
  column: string;
  graphqlType?: GraphQLFieldType;
  nullable?: boolean;
  join?: undefined;
};

type JoinFieldDefinition<TFields extends FluentFieldsDef> = {
  kind: "join";
  column: string;
  join: JoinDefinition<TFields>;
};

type ExpressionFieldDefinition<TValue = unknown> = {
  kind: "expression";
  expression: SQL | ((ctx: RenderContext) => SQL);
  graphqlType: GraphQLFieldType;
  nullable?: boolean;
  filterable?: boolean;
  orderable?: boolean;
  selectable?: boolean;
};

type AnyFieldDefinition =
  | ColumnFieldDefinition
  | JoinFieldDefinition<any>
  | ExpressionFieldDefinition<any>
  | FieldBuilder;
```

Migration path:

- `field(column)` returns `{ kind: "column", column: ... }` but keeps the
  existing fluent join methods;
- auto-discovered table/view fields become column fields;
- existing call sites should continue to compile.

### Schema field config

Update `FieldConfig`:

```ts
type FieldConfig = {
  kind: "column" | "join" | "expression";
  column?: string;
  expression?: SQL | ((ctx: RenderContext) => SQL);
  graphqlType?: GraphQLFieldType;
  nullable?: boolean;
  filterable?: boolean;
  orderable?: boolean;
  selectable?: boolean;
  join?: Join;
};
```

`ObjectSchema` should expose field metadata, not only field names:

```ts
getFieldInfo(name: string): FieldInfo | undefined;
getFieldMetadata(): FieldInfo[];
```

GraphQL generator should use this metadata first and only fall back to Drizzle
column introspection for old column fields.

## SQL Builder Changes

### Shared field SQL resolution

Add one shared resolver used by select/where/order:

```ts
function resolveFieldSql(
  fieldConfig: FieldConfig,
  ctx: RenderContext,
  tableAlias: string,
): SQL;
```

Behavior:

- column field: `"alias"."column"`;
- expression field: expression SQL from config;
- join container without leaf path: invalid for where/order/select unless the
  current API intentionally allows selecting relation containers.

### `WhereBuilder`

Current behavior:

```ts
const column = joinCollector.getAliasedColumn(table, fieldConfig.column);
buildOperatorCondition(column, op, value);
```

Target behavior:

```ts
const target = resolveFieldSql(fieldConfig, ctx, tableAlias);
buildOperatorCondition(target, op, value);
```

`buildOperatorCondition` and operator handlers should accept:

```ts
type FilterTarget = Column | SQL;
```

This is needed for:

```ts
where: {
  availableForSale: { _gt: 0 },
}
```

### `OrderBuilder`

Current behavior:

```sql
ORDER BY "alias"."column" DESC
```

Target behavior:

```sql
ORDER BY ${resolveFieldSql(fieldConfig, ctx, tableAlias)} DESC
```

This is needed for:

```ts
orderBy: [
  { field: "availableForSale", direction: "desc" },
]
```

### `SqlRenderer`

`SELECT` must support expression fields:

```sql
SELECT
  coalesce("stock_scope"."quantity_on_hand", 0) AS "quantityOnHand"
```

Runtime joins must be rendered in both normal and count SQL:

```sql
SELECT ...
FROM "inventory"."inventory_item_list_view" AS "t0_inventory_item_list_view"
LEFT JOIN (...) AS "stock_scope"
  ON ...
WHERE ...
```

Count query must include runtime joins when expression fields are used in
`where`:

```sql
SELECT COUNT(*) AS count
FROM ...
LEFT JOIN ...
WHERE coalesce(stock_scope.quantity_on_hand, 0) > 0
```

### Join ordering and alias safety

Runtime joins can be rendered before or after auto joins as long as all aliases
exist before `WHERE` and `ORDER BY`. For the initial implementation:

- render base table first;
- render runtime joins next;
- render auto joins after runtime joins;
- reject alias collisions before rendering.

This is enough for Inventory because stock runtime joins depend only on the main
alias.

## Cursor and Relay Changes

The cursor algorithm does not need a separate Inventory path. It needs two
safety improvements so expression fields work reliably.

### Internal seek select fields

Relay cursor generation reads sort field values from returned rows:

```ts
getNestedValue(row, param.field)
```

If a caller provides `select` without the `orderBy` field, cursor values become
`undefined`. This is especially easy to hit with computed fields.

Fix:

- Relay/Cursor builders should always add `orderBy` fields and `tieBreaker` to
  the SQL select list internally;
- returned node can include these fields, or the builder can strip internal-only
  fields before returning if a `select` was explicitly provided.

Minimum acceptable behavior: include seek fields in returned rows. Better
behavior: keep public result matching explicit `select` and use hidden internal
selects only for cursor construction.

### Filter hash must include runtime scope

For scoped computed fields, cursor validity depends on runtime join parameters.
Example: cursor for `warehouseScope = all` must not be reused for
`warehouseScope = warehouseA`.

Repository should pass:

```ts
filters: {
  where: mergedWhere,
  orderBy: resolvedOrderBy,
  locale,
  warehouseScope,
}
```

The library should document this and optionally provide helper:

```ts
createRelayFiltersHashInput({
  where,
  orderBy,
  scope,
})
```

This can be documentation-only for the first library phase because the current
Relay API already has `filters`.

## TypeScript Typing Plan

### Typed expression fields

`expression<TValue>()` must carry `TValue` into:

- `InferResult`;
- `InferWhere`;
- `InferOrderPath`;
- `InferSelectPath`;
- `InferRelayInput`;
- generated GraphQL field type metadata.

Example:

```ts
const query = createQuery(inventoryItemListView).extendFields({
  availableForSale: expression<number>({
    sql: ...,
    graphqlType: "Int",
  }),
});

type Where = InferWhere<typeof query>;

const valid: Where = {
  availableForSale: { _gt: 0 },
};

const invalid: Where = {
  availableForSale: { _containsi: "abc" }, // should fail after typed filters
};
```

### Improve filter value typing

Current `NestedWhereInput` uses broad `FilterValue`, so string operators are
not strongly restricted by field type.

Introduce value-aware filter types:

```ts
type FilterValueFor<T> =
  T extends string ? StringFilterValue :
  T extends number ? NumberFilterValue :
  T extends boolean ? BooleanFilterValue :
  T extends Date | string ? DateTimeFilterValue :
  ScalarFilterValue<T>;
```

Then:

```ts
type NestedWhereInput<
  Fields extends FieldsDef,
  Types = unknown,
> = {
  [K in keyof Fields & string]?: Fields[K] extends true
    ? FilterValueFor<FieldTypeAtPath<Types, K>>
    : ...
}
```

This can be implemented in the same phase or a follow-up phase. The expression
work should at least not make this harder.

### Result type inference

Add a real field-result inference type:

```ts
type InferFieldResultTypes<
  T extends Selectable,
  Fields extends FluentFieldsDef,
> = {
  [K in keyof Fields & string]:
    Fields[K] extends ExpressionFieldDefinition<infer TValue>
      ? TValue
      : Fields[K] extends JoinFieldDefinition<infer JoinFields>
        ? InferFieldResultTypes<JoinSelectable, JoinFields> | null
        : K extends keyof T["$inferSelect"]
          ? T["$inferSelect"][K]
          : unknown;
};
```

`createQuery(table)` with auto-discovered fields should still infer
`T["$inferSelect"]`.

`createQuery(table, fields)` and `.extendFields(fields)` should infer result
types from the configured fields, including expressions.

### Mode-specific fields

If `filterable`, `orderable`, or `selectable` flags are used, type inference
should eventually respect them:

```ts
ToWhereFieldsDef<Fields>
ToOrderFieldsDef<Fields>
ToSelectFieldsDef<Fields>
```

Initial implementation can treat all expression fields as filterable/orderable/
selectable by default and only enforce flags at runtime. The follow-up should
make the flags type-visible.

## GraphQL Generation Plan

### Field metadata source

Replace generator's "table column first" extraction with schema metadata:

```ts
type FieldInfo = {
  name: string;
  graphqlType: GraphQLFieldType;
  columnType?: string;
  nullable?: boolean;
  filterable: boolean;
  orderable: boolean;
  selectable: boolean;
  source: "column" | "expression";
};
```

For column fields:

- infer `graphqlType` from Drizzle column;
- allow `fieldTypes` override as today.

For expression fields:

- require `graphqlType` in `expression(...)`;
- allow `fieldTypes` override as today;
- include in where/order generation by default.

### Generated where input

Expression fields should appear like normal fields:

```graphql
input InventoryItemWhereInput {
  _and: [InventoryItemWhereInput!]
  _or: [InventoryItemWhereInput!]
  _not: InventoryItemWhereInput

  id: IDFilter
  variantId: IDFilter
  productName: StringFilter
  sku: StringFilter
  quantityOnHand: IntFilter
  reservedQuantity: IntFilter
  unavailableQuantity: IntFilter
  availableForSale: IntFilter
}
```

Fields with `filterable: false` should be skipped.

### Generated order enum/input

Expression fields should appear in the enum:

```graphql
enum InventoryItemOrderField {
  productName
  sku
  quantityOnHand
  reservedQuantity
  unavailableQuantity
  availableForSale
  updatedAt
  id
  variantId
}
```

Fields with `orderable: false` should be skipped.

### Connection input and meta

`drizzle-query` should not try to understand every service-specific `meta`
shape. For Inventory, `warehouseScope` remains a schema-level input owned by
Inventory.

Optional generator enhancement:

```ts
generateGraphQLTypes(query, "InventoryItem", {
  connectionInputExtraFields: [
    "meta: InventoryItemInventoryItemsMetaInput",
  ],
});
```

This keeps the generator useful for query-specific connection inputs without
making `drizzle-query` own business-specific scope types.

## Inventory Usage After Library Upgrade

### Base query

```ts
export const inventoryItemRelayQuery = createRelayQuery(
  createQuery(inventoryItemListView)
    .include(["id", "variantId"])
    .mapWhereFields({
      id: decodeInventoryItemGlobalId,
      productId: decodeProductGlobalId,
      variantId: decodeVariantGlobalId,
    })
    .maxLimit(100)
    .defaultLimit(20),
  { name: "inventoryItem", tieBreaker: "id" },
);
```

### Stock scoped query factory

```ts
function createInventoryItemStockRelayQuery(
  warehouseScope: NormalizedInventoryItemWarehouseScope,
) {
  const stockRuntime = createStockRuntime(warehouseScope);

  return createRelayQuery(
    createQuery(inventoryItemListView)
      .withRuntimeJoins(stockRuntime.joins)
      .extendFields(stockRuntime.fields)
      .include(["id", "variantId"])
      .mapWhereFields({
        id: decodeInventoryItemGlobalId,
        productId: decodeProductGlobalId,
        variantId: decodeVariantGlobalId,
      })
      .maxLimit(100)
      .defaultLimit(20),
    { name: "inventoryItem", tieBreaker: "id" },
  );
}
```

### Stock runtime shapes

`kind: "empty"`:

```ts
{
  joins: [],
  fields: {
    quantityOnHand: expression<number>({
      sql: sql`0`,
      graphqlType: "Int",
    }),
    reservedQuantity: expression<number>({
      sql: sql`0`,
      graphqlType: "Int",
    }),
    unavailableQuantity: expression<number>({
      sql: sql`0`,
      graphqlType: "Int",
    }),
    availableForSale: expression<number>({
      sql: sql`0`,
      graphqlType: "Int",
    }),
  },
}
```

`INCLUDE` with one warehouse:

```ts
{
  joins: [
    {
      alias: "stock_scope",
      type: "left",
      source: runtimeTable(warehouseStock),
      cardinality: "one",
      on: ({ main, runtime }) => sql`
        ${runtime("stock_scope", "project_id")} = ${main("project_id")}
        AND ${runtime("stock_scope", "variant_id")} = ${main("variant_id")}
        AND ${runtime("stock_scope", "warehouse_id")} = ${warehouseId}
      `,
    },
  ],
  fields: stockCoalesceFields("stock_scope"),
}
```

All warehouses, multi-`INCLUDE`, and `EXCLUDE`:

```ts
{
  joins: [
    {
      alias: "stock_scope",
      type: "left",
      source: runtimeSql(sql`
        (
          SELECT
            project_id,
            variant_id,
            SUM(quantity_on_hand)::int AS quantity_on_hand,
            SUM(reserved_qty)::int AS reserved_qty,
            SUM(unavailable_qty)::int AS unavailable_qty,
            MAX(updated_at) AS updated_at
          FROM inventory.warehouse_stock
          WHERE project_id = ${storeId}
          -- optional warehouse_id IN / NOT IN predicate
          GROUP BY project_id, variant_id
        )
      `),
      cardinality: "one",
      on: ({ main, runtime }) => sql`
        ${runtime("stock_scope", "project_id")} = ${main("project_id")}
        AND ${runtime("stock_scope", "variant_id")} = ${main("variant_id")}
      `,
    },
  ],
  fields: stockCoalesceFields("stock_scope"),
}
```

## Implementation Phases

### Phase 1. Core field model

- Add `kind` to field definitions.
- Add `expression<T>()`.
- Add field metadata for `graphqlType`, nullability and capability flags.
- Keep `field(column)` backward-compatible.
- Update auto table/view field discovery to produce column field definitions.
- Add `extendFields()`.
- Add alias collision checks for extended fields.

### Phase 2. Runtime joins

- Add `RuntimeJoin`, `RuntimeJoinSource`, `runtimeTable()` and `runtimeSql()`.
- Add `withRuntimeJoin()` and `withRuntimeJoins()`.
- Add `RenderContext`.
- Render runtime joins in normal and count SQL.
- Reject runtime join alias collisions.
- Document `cardinality: "one"` expectation for Relay-safe joins.

### Phase 3. SQL builders

- Add shared `resolveFieldSql()`.
- Update `SqlRenderer` select rendering.
- Update `WhereBuilder` to filter by expressions.
- Update `OrderBuilder` to sort by expressions.
- Widen operator target types from `Column` to `Column | SQL`.
- Ensure `getSql()` and `getCountSql()` produce equivalent SQL to execution.

### Phase 4. Cursor/Relay safety

- Ensure Relay/Cursor internal select includes all seek fields plus tie-breaker.
- Preserve stable tie-breaker behavior for expression order fields.
- Document and verify `filters` hash usage with runtime scopes.
- Keep `createRelayQuery(..., { tieBreaker: "id" })` API unchanged.

### Phase 5. Type inference

- Add typed `ExpressionFieldDefinition<TValue>`.
- Add `InferFieldResultTypes`.
- Update `createQuery(table, fields)` return type.
- Update `.extendFields()` return type.
- Ensure `InferWhere`, `InferOrderPath`, `InferSelectPath`,
  `InferRelayInput`, and `InferResult` include expression fields.
- Add value-aware filter typing if feasible in this phase; otherwise document as
  Phase 5b and keep runtime validation unchanged.

### Phase 6. GraphQL generator

- Add `getFieldMetadata()` to query/schema snapshots.
- Update `graphql.ts` to use field metadata before Drizzle column introspection.
- Generate expression fields into `WhereInput` and `OrderField`.
- Respect `filterable: false` and `orderable: false`.
- Keep `fieldTypes`, `excludeFields`, descriptions and base filter generation
  backward-compatible.
- Optionally add `connectionInputExtraFields` for service-specific `meta`.

### Phase 7. Inventory adoption

- Replace any manual stock list SQL ideas with
  `createInventoryItemStockRelayQuery({ warehouseScope })`.
- Add generated GraphQL filter/order fields for:
  - `quantityOnHand`;
  - `reservedQuantity`;
  - `unavailableQuantity`;
  - `availableForSale`.
- Keep `warehouseScope` in Inventory GraphQL `meta`, not in library-generated
  generic filters.
- Use the same `mergedWhere` for `execute()` and `count()`.
- Pass cursor `filters` including effective `warehouseScope`.

## Coverage To Add

Add package-level coverage for the library changes:

- expression field in `SELECT`;
- expression field in `WHERE`;
- expression field in `ORDER BY`;
- Relay query ordered by expression field;
- Relay cursor seek by expression field plus tie-breaker;
- count query with expression filter and runtime join;
- runtime table join;
- runtime SQL subquery join;
- GraphQL generation includes expression fields with correct filter type;
- TypeScript inference examples for `InferRelayInput` and `InferResult`.

Project instruction for this workspace says not to run `test` or `tsc` for
verification. When implementing in this workspace, use `npm run build` when a
new build verification is needed.

## Backward Compatibility

Must remain valid:

```ts
createQuery(table)
createQuery(view)
createQuery(table, {
  id: field(table.id),
})
field(table.id).leftJoin(otherQuery, other.id)
createRelayQuery(query, { name, tieBreaker })
generateGraphQLTypes(query, name)
```

Expected low-risk behavior changes:

- `getSnapshot()` includes richer field metadata while preserving existing
  `fields` array;
- generated schema can include expression fields when present;
- explicit `select` in Relay may include hidden/internal seek fields unless the
  implementation strips them before returning nodes.

Potential breaking area:

- result type inference for `createQuery(table, fields)` may become more precise
  than the current broad `T["$inferSelect"]`. If this breaks call sites, add a
  compatibility type alias or make result precision opt-in first.

## Non-Goals

- Do not add Inventory-specific concepts to `@shopana/drizzle-query`.
- Do not make `warehouseScope` a generic library feature.
- Do not add a parallel handwritten Relay SQL implementation.
- Do not make runtime joins support arbitrary many-row joins for keyset
  pagination without explicit `distinct/groupBy` semantics.
- Do not require GraphQL generator to own business-specific `meta` input types.

## Acceptance Criteria

The library improvement is complete when:

- a query builder can define typed expression fields;
- expression fields work in select, where, order and Relay cursor seek;
- runtime joins and subquery joins render in execute and count SQL;
- generated GraphQL where/order inputs include expression fields with correct
  filter types;
- TypeScript infers expression fields in `InferRelayInput` and `InferResult`;
- Inventory can implement stock-scoped `inventoryItems` by configuring
  `drizzle-query`, without custom SQL pagination.
