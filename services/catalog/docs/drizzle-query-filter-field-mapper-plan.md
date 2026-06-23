# План: field mapper для where-фильтров в drizzle-query

## Цель

Добавить в `@shopana/drizzle-query` конфигурацию query builder, которая позволяет на этапе создания query описать mapper для конкретного filter field. Mapper должен применяться ко всем значениям этого поля в `where`, независимо от логической вложенности через `_and`, `_or`, `_not`.

Главный use case: Admin GraphQL принимает GraphQL global ID, а repository/query layer работает с database UUID. Product query должен уметь объявить это один раз:

```ts
const productRelayQuery = createRelayQuery(
  createQuery(product)
    .include(["id"])
    .mapWhereField("id", decodeProductGlobalId)
    .maxLimit(100)
    .defaultLimit(20),
  { name: "product", tieBreaker: "id" },
);
```

После этого оба варианта должны попадать в SQL уже с database UUID:

```ts
{ id: { _eq: "gid://Product/..." } }

{
  _or: [
    { id: { _eq: "gid://Product/..." } },
    { _and: [{ id: { _in: ["gid://Product/..."] } }] },
  ],
}
```

## Архитектурная позиция

Mapper должен жить в `drizzle-query`, а не в resolver-local normalizer, потому что:

- generated `WhereInput` принадлежит query builder contract;
- `execute`, `count`, `getSql`, Relay pagination и Cursor pagination должны использовать одинаковую нормализацию;
- GraphQL boundary не должен знать внутреннюю структуру generated where tree;
- tenant/soft-delete filters остаются responsibility repository layer и не решают public-ID-to-db-ID mapping.

`@shopana/drizzle-query` не должен импортировать `@shopana/shared-graphql-guid`. Библиотека предоставляет generic hook для трансформации значений, а конкретный сервис передает mapper.

## Target API

### Fluent API

Добавить immutable методы в `FluentQueryBuilder`. API должен типизироваться
через публичный `InferredFields extends FieldsDef`, а не через raw
`Fields extends FluentFieldsDef`, потому что `where`/`select`/`order` contract
строится из `ToFieldsDef<Fields>`:

```ts
query.mapWhereField(field: LocalLeafPaths<InferredFields>, mapper)
query.mapWhereFields(mappers: WhereFieldMappers<InferredFields>)
```

Типы:

```ts
export type WhereFieldOperator = OperatorKey | "shorthand";

export type WhereFieldMapperContext = {
  path: string;
  field: string;
  operator: WhereFieldOperator;
};

export type WhereFieldMapper = (
  value: unknown,
  context: WhereFieldMapperContext,
) => unknown;

export type WhereFieldMapperConfig = {
  map: WhereFieldMapper;
  operators?: readonly WhereFieldOperator[];
};

export type LocalLeafPaths<Fields extends FieldsDef> = {
  [K in keyof Fields & string]: Fields[K] extends true ? K : never;
}[keyof Fields & string];

export type WhereFieldMappers<Fields extends FieldsDef> = Partial<
  Record<LocalLeafPaths<Fields>, WhereFieldMapper | WhereFieldMapperConfig>
>;
```

`OperatorKey` берется из существующего runtime списка операторов в `operators.ts`.

В реализации `FluentQueryBuilder<T, Fields, InferredFields, Types>` config уже
имеет тип `FluentQueryConfig<InferredFields>`, поэтому `whereFieldMappers`
должен храниться как `WhereFieldMappers<InferredFields>`. Не использовать
`WhereFieldMappers<Fields>`, потому что `Fields` является `FluentFieldsDef`
с `FieldBuilder`/`JoinFieldDefinition`, а `LocalLeafPaths` ожидает уже
нормализованный `FieldsDef`.

Это важно не только для custom `createQuery(table, fields)`, но и для
auto-discovered `createQuery(table)`/`createQuery(view)`: там public query
contract выводится через `InferFieldsDefFromTable<T>` или
`InferFieldsDefFromView<T>`, а не через `ToFieldsDef<Fields>`. Mapper methods
должны работать с итоговым `InferredFields`, иначе основной кейс
`createQuery(product).mapWhereField("id", ...)` потеряет типовую точность.

Mapper config scoped to query builder, где он объявлен. Он принимает только local leaf fields этого builder-а, а не relation/container paths от parent builder-а:

```ts
type ProductMapperPaths = LocalLeafPaths<{
  id: true;
  projectId: true;
  variant: {
    id: true;
    productId: true;
  };
}>;
// "id" | "projectId"
```

Relation fields получают mapper rules из joined query builder-а, которому принадлежат эти поля.

### Пример для Catalog

```ts
function decodeGlobalIdOrReturnValue(
  id: unknown,
  entity: GlobalIdType,
): unknown {
  if (typeof id !== "string") {
    return id;
  }

  try {
    return decodeGlobalIdByType(id, entity);
  } catch {
    return id;
  }
}

const decodeProductGlobalId: WhereFieldMapper = (value) =>
  decodeGlobalIdOrReturnValue(value, GlobalIdEntity.Product);

export const productRelayQuery = createRelayQuery(
  createQuery(product)
    .include(["id"])
    .mapWhereField("id", decodeProductGlobalId)
    .maxLimit(100)
    .defaultLimit(20),
  { name: "product", tieBreaker: "id" },
);
```

### Наследование mapper-ов через joins

Mapper принадлежит query builder-у, который определяет поле. Если parent query join-ит другой query builder, where-transform должен переключиться на mapper scope joined builder-а при входе в этот relation object.

Пример:

```ts
const categoryQuery = createQuery(category)
  .mapWhereFields({
    id: decodeCategoryGlobalId,
    parentId: decodeCategoryGlobalId,
  });

const productQuery = createQuery(product, {
  id: field(product.id),
  category: field(product.id).leftJoin(categoryQuery, category.id),
});

// Использует mapper из categoryQuery для parentId.
productQuery.execute(db, {
  where: {
    category: {
      parentId: { _eq: categoryGlobalId },
    },
  },
});
```

Для полей с одинаковым leaf name в разных joined schemas каждый joined builder маппит свое поле:

```ts
const variantQuery = createQuery(variant)
  .mapWhereFields({
    id: decodeVariantGlobalId,
    productId: decodeProductGlobalId,
  });

const categoryQuery = createQuery(category)
  .mapWhereFields({
    id: decodeCategoryGlobalId,
    parentId: decodeCategoryGlobalId,
  });

const productWithRelations = createQuery(product, {
  id: field(product.id),
  variants: field(product.id).leftJoin(variantQuery, variant.productId),
  category: field(product.id).leftJoin(categoryQuery, category.id),
}).mapWhereField("id", decodeProductGlobalId);
```

Не добавлять wildcard mapping вроде `*.id` в первом шаге. Он не нужен, когда mapper lookup scoped to active builder, и небезопасен, если schema содержит поля с одинаковым leaf name, но разным public ID contract.

`WhereFieldMapperContext.path` все равно должен содержать full path от root query, например `category.parentId`, чтобы debugging и error messages были понятными. Сам mapper lookup остается local to the active builder scope.

Mapper scope для relation fields нельзя восстанавливать из `ObjectSchema`: текущий schema layer хранит только `join.schema()` для SQL-building и не содержит config joined query builder-а. Scope должен строиться на уровне `FluentQueryBuilder` из исходного `fieldsDef`, пока доступен `JoinDefinition.target()`.

Для этого нужен typed contract у join target. Сейчас `JoinDefinition.target()`
возвращает только `FluentQueryBuilderLike`, где есть `getFieldsDef()`, но нет
`getWhereMapperScope()`; при этом `buildSchema()` уже вынужден cast-ить target
к `FluentQueryBuilder`, чтобы вызвать `getSchema()`. В рамках этой задачи не
делать runtime type guard. Расширить package-internal join target interface так,
чтобы relation inheritance был типово выражен:

```ts
export interface FluentQueryBuilderLike<
  Fields extends FluentFieldsDef = FluentFieldsDef,
> {
  getFieldsDef(): Fields;
  getSchema(): ObjectSchema;
  /** @internal */
  getWhereMapperScope(): WhereFieldMapperScope;
}
```

Если нужно не расширять публичный смысл имени `FluentQueryBuilderLike`, можно
ввести отдельный `FluentJoinTargetQueryBuilderLike` с теми же методами и
использовать его в `JoinDefinition.target()` и `FieldBuilder.*Join()` args.
Главное требование: target joined builder должен быть statically known as
provider of `getWhereMapperScope()`, а не доставаться через `as FluentQueryBuilder`.

При обходе `fieldsDef`:

- simple fields остаются leaf полями текущего scope;
- joined fields добавляются в `scope.relations`;
- для joined field relation closure вызывает package-internal `targetBuilder.getWhereMapperScope()`;
- `buildSchema()` продолжает отдавать в `ObjectSchema` только `schema: () => targetBuilder.getSchema()`;
- mapper config не добавляется в `ObjectSchema` и не участвует в schema cache key.

Так mapper scope становится параллельным config graph-ом рядом с SQL schema graph-ом: `ObjectSchema` отвечает за column/join SQL, а `WhereFieldMapperScope` отвечает только за value transform.

## Runtime pipeline

### Где применять mapper

Добавить pure helper, например:

```text
packages/drizzle-query/src/where-transform.ts
```

Он принимает `where`, mapper scope текущего query builder-а и возвращает transformed where.

Package-internal scope:

```ts
type WhereFieldMapperScope = {
  mappers: Record<string, WhereFieldMapper | WhereFieldMapperConfig>;
  relations: Record<string, () => WhereFieldMapperScope>;
};
```

`FluentQueryBuilder` строит этот scope из:

- собственного `config.whereFieldMappers`;
- joined fields в `fieldsDef`, где каждая relation указывает на target builder `WhereFieldMapperScope`.

В реализации `getWhereMapperScope()` должен читать именно `this.fieldsDef`, а не `this.getSchema()`. Для каждого joined field нужно взять `joinDef.target()` и лениво связать relation с `targetBuilder.getWhereMapperScope()`. Это важно, потому что `ObjectSchema` видит только target schema и не знает о `whereFieldMappers` target builder-а.

Scope можно кешировать на instance `FluentQueryBuilder`, но cache должен быть отдельным от `_schema`/`_queryBuilder`. Для защиты от циклических relation graphs использовать lazy relation closures; не раскрывать весь graph eager-recursively при создании root scope.

Вызовы должны быть централизованы:

- `FluentQueryBuilder.execute()`;
- `FluentQueryBuilder.getSql()`;
- `FluentQueryBuilder.count()`;
- `FluentQueryBuilder.getCountSql()`;
- `FluentQueryBuilder.exists()`;
- `FluentQueryBuilder.findFirst()`;
- `FluentQueryBuilder.findFirstOrThrow()`;
- `RelayQueryBuilder.execute()`;
- `RelayQueryBuilder.getSql()`;
- `RelayQueryBuilder.count()`;
- `RelayQueryBuilder.getCountSql()`;
- `CursorQueryBuilder.execute()`;
- `CursorQueryBuilder.getSql()`;
- `CursorQueryBuilder.count()`;
- `CursorQueryBuilder.getCountSql()`.

Для Relay/Cursor wrappers лучше не дублировать алгоритм. `FluentQueryBuilder` должен дать package-internal методы:

```ts
getWhereMapperScope()
mapWhereForExecution(where)
```

`mapWhereForExecution()` принимает already resolved where. Это значит, что
mapper применяется не только к user-provided `options.where`/`input.where`, но
и к `defaultWhere`, если именно он стал resolved where.

`RelayQueryBuilder.execute/getSql` и `CursorQueryBuilder.execute/getSql` вызывают `mapWhereForExecution()` после выбора `input.where ?? defaultWhere`, но до передачи where в cursor builders.

`RelayQueryBuilder.count/getCountSql` и `CursorQueryBuilder.count/getCountSql` могут продолжать делегировать в `FluentQueryBuilder.count/getCountSql`, потому что fluent count methods уже применяют mapper. Не применять тот же mapper второй раз в этих wrappers.

Важно: transform нельзя опускать ниже `FluentQueryBuilder`/Relay/Cursor wrapper boundary в `WhereBuilder` или `QueryBuilder`. Cursor builders сами добавляют cursor seek `where` после декодирования cursor-а и `seekTransforms`; если field mapper запустить после merge public where с cursor seek where, strict mapper может начать обрабатывать cursor values как пользовательский filter input. Field mapper применяется только к public/resolved `where`, который пришел в fluent/relay/cursor wrapper, до передачи в cursor builder.

### Что не маппить

Не трансформировать:

- `orderBy`;
- `select`;
- `filters` для cursor hash comparison;
- cursor seek values. Для них уже есть отдельный `seekTransforms`, и они добавляются cursor builder-ом после field mapping;

Repository-owned filters могут находиться в том же merged `where`, что и public filters. Так как repositories часто merge-ят tenant/soft-delete filters до вызова query builder-а, Catalog ID mappers должны быть idempotent: UUID остается UUID, global ID декодируется в UUID.

## Алгоритм transformWhereInput

Transformer должен повторять nullish-семантику текущего `WhereBuilder`. Raw field values `null`/`undefined` не передаются в mapper и остаются как есть, потому что `WhereBuilder` пропускает такие field filters. Operator values `null`/`undefined` тоже не передаются в mapper, кроме операторов, которые явно включены в mapper config через `operators` и тем самым осознанно берут на себя такую семантику. По умолчанию `_is`/`_isNot` не маппятся.

Требования:

- один DFS-проход по where tree, сложность `O(n)` по количеству nodes/operators;
- не использовать `JSON.parse(JSON.stringify(...))`;
- сохранять structural sharing: если в subtree ничего не изменилось, возвращать исходную ссылку;
- корректно проходить `_and`, `_or`, `_not` на любой глубине;
- relation nesting использует joined builder scope; full dot path (`category.parentId`, `variants.id`) передается только в mapper context;
- mapper применять только к leaf field values, а не к relation object.

Псевдокод:

```ts
function transformWhereNode(node, scope, pathPrefix = "") {
  if (!isPlainObject(node)) return node;

  let changed = false;
  const next = {};

  for (const [key, value] of Object.entries(node)) {
    if (key === "_and" || key === "_or") {
      const mappedList = Array.isArray(value)
        ? mapArrayWithStructuralSharing(value, (item) =>
            transformWhereNode(item, scope, pathPrefix)
          )
        : value;
      changed ||= mappedList !== value;
      next[key] = mappedList;
      continue;
    }

    if (key === "_not") {
      const mapped = transformWhereNode(value, scope, pathPrefix);
      changed ||= mapped !== value;
      next[key] = mapped;
      continue;
    }

    if (key.startsWith("_")) {
      next[key] = value;
      continue;
    }

    const path = pathPrefix ? `${pathPrefix}.${key}` : key;
    const childScope = scope.relations[key]?.();

    if (childScope && isNestedWhereObject(value)) {
      const mapped = transformWhereNode(value, childScope, path);
      changed ||= mapped !== value;
      next[key] = mapped;
      continue;
    }

    const mapped = transformFieldFilter(scope.mappers[key], path, key, value);
    changed ||= mapped !== value;
    next[key] = mapped;
  }

  return changed ? next : node;
}
```

`isNestedWhereObject(value)` должен совпадать с семантикой `WhereBuilder`: object без array и без filter operators считается nested where object, но transformer углубляется только если в текущем mapper scope есть relation с таким ключом. Plain object для scalar field не исправлять в transformer; текущий `WhereBuilder`/validation продолжает отвечать за invalid filter shape.

## Operator mapping rules

Поддержать shorthand scalar:

```ts
{ id: "gid" }
// mapper(value, { operator: "shorthand" })
```

Поддержать operator object:

```ts
{ id: { _eq: "gid", _in: ["gid1", "gid2"] } }
```

Default operators для mapper:

- scalar operators: `_eq`, `_neq`, `_gt`, `_gte`, `_lt`, `_lte`;
- array operators: `_in`, `_notIn`, `_between`;
- shorthand.

Не маппить по умолчанию:

- `_is`, `_isNot`, потому что это null checks;
- string pattern operators (`_contains`, `_containsi`, `_startsWith`, `_endsWith` и negative variants), потому что для ID/global ID они не имеют нормальной storage-семантики.

Если нужен mapper для нестандартного оператора, пользователь может явно передать `operators`.

Если operator явно перечислен в `WhereFieldMapperConfig.operators`, mapper
вызывается для этого operator даже при `null`/`undefined` value. Это
осознанный override nullish-семантики `WhereBuilder`; без explicit
`operators` nullish values остаются нетронутыми.

Для array operators mapper применяется к каждому элементу массива. Если значение не массив там, где ожидается массив, не исправлять его в transformer: текущая validation в `WhereBuilder` должна продолжать отвечать за invalid filter shape.

## Error strategy

Mapper может быть strict или tolerant. `drizzle-query` не должен ловить ошибки mapper по умолчанию.

Рекомендуемые политики:

- для публичного GraphQL ID contract: strict decode, если API должен отклонять неправильный global ID;
- для transitional compatibility: tolerant decode, если нужно принимать и global ID, и raw UUID.

Catalog для первого cutover может использовать tolerant helper, аналогичный текущему `decodeGlobalIdOrReturnValue`, чтобы не ломать internal callers, которые уже передают UUID.

## Изменения в drizzle-query

1. Добавить `LocalLeafPaths` в `packages/drizzle-query/src/types.ts`.
2. Добавить типы mapper/config рядом с runtime transformer-ом в
   `packages/drizzle-query/src/where-transform.ts` либо в отдельный
   package-internal файл без циклического импорта из `types.ts` в
   `builder/*`. `FluentQueryConfig` живет в `builder/fluent-types.ts`, поэтому
   проверить import graph до реализации.
3. Добавить `transformWhereInput()` и package-internal `WhereFieldMapperScope` в `packages/drizzle-query/src/where-transform.ts`.
4. Расширить join target contract (`FluentQueryBuilderLike` или новый
   `FluentJoinTargetQueryBuilderLike`) методами `getSchema()` и
   `getWhereMapperScope()`, затем обновить `JoinDefinition.target()` и
   `FieldBuilder.*Join()` signatures, чтобы joined builder mapper scope был
   доступен без runtime type guard и без cast к `FluentQueryBuilder`.
5. Расширить `FluentQueryConfig<Fields extends FieldsDef>`:

```ts
whereFieldMappers?: WhereFieldMappers<Fields>;
```

В `FluentQueryBuilder` этот config используется как
`FluentQueryConfig<InferredFields>`, поэтому builder methods должны принимать:

```ts
mapWhereField(
  field: LocalLeafPaths<InferredFields>,
  mapper: WhereFieldMapper | WhereFieldMapperConfig,
)

mapWhereFields(
  mappers: WhereFieldMappers<InferredFields>,
)
```

6. Добавить immutable методы в `FluentQueryBuilder`:

```ts
mapWhereField(field: LocalLeafPaths<InferredFields>, mapper)
mapWhereFields(mappers: WhereFieldMappers<InferredFields>)
```

7. Добавить package-internal метод в `FluentQueryBuilder`:

```ts
getWhereMapperScope()
mapWhereForExecution(where)
```

8. Применить `mapWhereForExecution()` во всех fluent entrypoints, которые
   принимают `where`: `execute/getSql/count/getCountSql`, а также
   `exists/findFirst/findFirstOrThrow`, если их текущие signatures содержат
   where input.
9. Обновить `RelayQueryBuilder.execute/getSql` и `CursorQueryBuilder.execute/getSql`, чтобы они маппили resolved where перед передачей в cursor builders. Count wrappers должны делегировать в fluent count methods без повторного transform.
10. Экспортировать публичные mapper-типы из `packages/drizzle-query/src/index.ts`.

## Изменения в Catalog

После реализации library feature:

1. В `ProductRepository.ts` добавить mapper для `productRelayQuery`:

```ts
createQuery(product)
  .include(["id"])
  .mapWhereField("id", decodeProductGlobalId)
  .maxLimit(100)
  .defaultLimit(20)
```

2. Перед добавлением mapper-а в `productQuery` явно проверить каждый public
   repository method, который принимает `ProductQueryInput`. Если where может
   прийти из GraphQL/API shape, добавить тот же mapper; если query используется
   только repository-internal с UUID contract, не добавлять.
3. В `categoryProductsRelayQuery` добавить mapper для `id`, потому что `CategoryProductWhereInput.id` фильтрует `product.id`:

```ts
categoryProductsQuery
  .mapWhereField("id", decodeProductGlobalId)
  .include(["id"])
  .maxLimit(100)
  .defaultLimit(20)
```

4. Перенести `categoryRelayQuery` mappings из `filter-normalizers.ts` в local query config:

```ts
mapWhereFields({
  id: decodeCategoryGlobalId,
  parentId: decodeCategoryGlobalId,
})
```

5. Перенести `variantRelayQuery` mappings в local query config:

```ts
mapWhereFields({
  id: decodeVariantGlobalId,
  productId: decodeProductGlobalId,
})
```

6. Если `categoryQuery` или `variantQuery` используются как joined query builders, их mapper-ы должны наследоваться автоматически. Не добавлять на parent query full paths вроде `category.parentId`.
7. Удалить resolver-level `normalizeCategoryWhereInput` и `normalizeVariantWhereInput`, когда все callers перейдут на query-level mapping.
8. Для специальных не-SQL filters вроде `CategoryHierarchyScopeInput` оставить отдельный API normalizer. Это не generated drizzle-query where и не должно попадать в generic mapper.

## Важные edge cases

- `_and`/`_or` могут содержать пустой массив: transformer сохраняет форму, SQL builder уже решает, что делать.
- raw field `null`/`undefined` не передавать в mapper; operator value `null`/`undefined` не передавать в mapper, кроме явно включенных операторов в `WhereFieldMapperConfig.operators`. Текущий `WhereBuilder` пропускает такие значения, и transformer должен сохранить эту семантику.
- `_not` должен сохранять тот же path prefix, потому что это логическое отрицание, а не relation nesting.
- Relation object и filter object различаются через `isFilterObject`, а relation lookup идет через текущий mapper scope.
- Mapper не должен менять ключ поля или operator, только значение.
- Если mapper возвращает тот же value, subtree может сохранить старую ссылку.
- Если joined builder имеет mapper для `id`, этот mapper применяется только внутри этой relation scope. Root `id` другого builder-а не затрагивается.

## Проверка реализации

Добавить focused unit coverage в `packages/drizzle-query/src/__tests__/...`:

- maps shorthand field filter;
- maps `_eq`, `_neq`, `_in`, `_notIn`;
- maps nested `_and/_or/_not`;
- maps `defaultWhere`;
- наследует mapper из joined query builder для relation where;
- не маппит похожий leaf в другом joined scope, если child builder не объявил mapper;
- не углубляется в scalar field object с invalid shape и не исправляет его;
- mapper context получает full path вроде `category.parentId`;
- не маппит `_is/_isNot`;
- вызывает mapper для `_is: null` или другого nullish operator value только
  если operator явно указан в `WhereFieldMapperConfig.operators`;
- сохраняет structural sharing для неизмененных logical arrays/subtrees;
- `execute`, `count`, `getSql`, `exists/findFirst/findFirstOrThrow`, Relay и
  Cursor используют одинаковый transformed public where без double-mapping
  cursor seek where.

По проектному правилу не использовать `test`/`tsc` как проверку в этой задаче. Когда понадобится новая версия кода, проверять через build.

## Итоговая форма решения

Целевая архитектура:

```text
GraphQL generated where
        |
        v
FluentQueryBuilder whereFieldMappers
        |
        v
database-shaped NestedWhereInput
        |
        v
WhereBuilder -> SQL
```

Так `ProductWhereInput.id` остается публичным GraphQL ID contract, а repository и SQL layer продолжают работать с database UUID без resolver-specific обходов.
