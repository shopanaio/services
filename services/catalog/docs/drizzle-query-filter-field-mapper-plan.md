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

Добавить immutable методы в `FluentQueryBuilder`:

```ts
query.mapWhereField(path, mapper)
query.mapWhereFields(mappers)
```

Типы:

```ts
export type WhereFieldOperator =
  | "_eq"
  | "_neq"
  | "_gt"
  | "_gte"
  | "_lt"
  | "_lte"
  | "_in"
  | "_notIn"
  | "_between"
  | "shorthand";

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

export type WhereFieldMappers<Fields extends FieldsDef> = Partial<
  Record<NestedLeafPaths<Fields>, WhereFieldMapper | WhereFieldMapperConfig>
>;
```

`NestedLeafPaths` нужен отдельно от текущего `NestedPaths`, потому что `NestedPaths` включает relation/container paths. Mapper должен назначаться только на leaf field path:

```ts
type ProductPaths = NestedLeafPaths<{
  id: true;
  variant: {
    id: true;
    productId: true;
  };
}>;
// "id" | "variant.id" | "variant.productId"
```

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

Для relation fields использовать полный path, чтобы не декодировать разные entity IDs одним leaf-name wildcard:

```ts
createQuery(variant)
  .mapWhereFields({
    id: decodeVariantGlobalId,
    productId: decodeProductGlobalId,
  });

createQuery(productWithRelations)
  .mapWhereFields({
    id: decodeProductGlobalId,
    "variants.id": decodeVariantGlobalId,
    "categories.id": decodeCategoryGlobalId,
  });
```

Не добавлять wildcard mapping вида `*.id` в первом шаге. Для global ID это небезопасно: одинаковый leaf `id` в разных relation paths может требовать разные `GlobalIdEntity`.

## Runtime pipeline

### Где применять mapper

Добавить pure helper, например:

```text
packages/drizzle-query/src/where-transform.ts
```

Он принимает `where`, registry mappers и возвращает transformed where.

Вызовы должны быть централизованы:

- `FluentQueryBuilder.execute()`;
- `FluentQueryBuilder.getSql()`;
- `FluentQueryBuilder.count()`;
- `FluentQueryBuilder.getCountSql()`;
- `RelayQueryBuilder.execute()`;
- `RelayQueryBuilder.getSql()`;
- `RelayQueryBuilder.count()`;
- `RelayQueryBuilder.getCountSql()`;
- `CursorQueryBuilder.execute()`;
- `CursorQueryBuilder.getSql()`;
- `CursorQueryBuilder.count()`;
- `CursorQueryBuilder.getCountSql()`.

Для Relay/Cursor wrappers лучше не дублировать алгоритм. `FluentQueryBuilder` должен дать package-internal метод:

```ts
mapWhereForExecution(where)
```

Pagination wrappers вызывают его после выбора `input.where ?? defaultWhere`, но до передачи where в cursor builder.

### Что не маппить

Не трансформировать:

- `orderBy`;
- `select`;
- `filters` для cursor hash comparison;
- cursor seek values. Для них уже есть отдельный `seekTransforms`;
- repository-owned filters, которые repository добавляет уже в database format, если они мержатся после public where.

Если финальная реализация применяет mapper ко всему merged where, mappers для ID должны быть idempotent: UUID остается UUID, global ID декодируется в UUID.

## Алгоритм transformWhereInput

Требования:

- один DFS-проход по where tree, сложность `O(n)` по количеству nodes/operators;
- не использовать `JSON.parse(JSON.stringify(...))`;
- сохранять structural sharing: если в subtree ничего не изменилось, возвращать исходную ссылку;
- корректно проходить `_and`, `_or`, `_not` на любой глубине;
- relation nesting строить через dot path (`category.parentId`, `variants.id`);
- mapper применять только к leaf field values, а не к relation object.

Псевдокод:

```ts
function transformWhereNode(node, pathPrefix = "") {
  if (!isPlainObject(node)) return node;

  let changed = false;
  const next = {};

  for (const [key, value] of Object.entries(node)) {
    if (key === "_and" || key === "_or") {
      const mappedList = Array.isArray(value)
        ? value.map((item) => transformWhereNode(item, pathPrefix))
        : value;
      changed ||= mappedList !== value;
      next[key] = mappedList;
      continue;
    }

    if (key === "_not") {
      const mapped = transformWhereNode(value, pathPrefix);
      changed ||= mapped !== value;
      next[key] = mapped;
      continue;
    }

    if (key.startsWith("_")) {
      next[key] = value;
      continue;
    }

    const path = pathPrefix ? `${pathPrefix}.${key}` : key;

    if (isNestedWhereObject(value)) {
      const mapped = transformWhereNode(value, path);
      changed ||= mapped !== value;
      next[key] = mapped;
      continue;
    }

    const mapped = transformFieldFilter(path, key, value);
    changed ||= mapped !== value;
    next[key] = mapped;
  }

  return changed ? next : node;
}
```

`isNestedWhereObject(value)` должен совпадать с семантикой `WhereBuilder`: object без array и без filter operators считается nested where object.

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

Для array operators mapper применяется к каждому элементу массива. Если значение не массив там, где ожидается массив, не исправлять его в transformer: текущая validation в `WhereBuilder` должна продолжать отвечать за invalid filter shape.

## Error strategy

Mapper может быть strict или tolerant. `drizzle-query` не должен ловить ошибки mapper по умолчанию.

Рекомендуемые политики:

- для публичного GraphQL ID contract: strict decode, если API должен отклонять неправильный global ID;
- для transitional compatibility: tolerant decode, если нужно принимать и global ID, и raw UUID.

Catalog для первого cutover может использовать tolerant helper, аналогичный текущему `decodeGlobalIdOrReturnValue`, чтобы не ломать internal callers, которые уже передают UUID.

## Изменения в drizzle-query

1. Добавить `NestedLeafPaths` в `packages/drizzle-query/src/types.ts`.
2. Добавить типы mapper/config в `packages/drizzle-query/src/types.ts` или `packages/drizzle-query/src/where-transform.ts`.
3. Добавить `transformWhereInput()` в `packages/drizzle-query/src/where-transform.ts`.
4. Расширить `FluentQueryConfig`:

```ts
whereFieldMappers?: WhereFieldMappers<Fields>;
```

5. Добавить immutable методы в `FluentQueryBuilder`:

```ts
mapWhereField(path, mapper)
mapWhereFields(mappers)
```

6. Добавить package-internal метод в `FluentQueryBuilder`:

```ts
mapWhereForExecution(where)
```

7. Применить `mapWhereForExecution()` в `execute/getSql/count/getCountSql`.
8. Обновить `RelayQueryBuilder` и `CursorQueryBuilder`, чтобы они маппили resolved where перед передачей в cursor builders.
9. Экспортировать публичные mapper-типы из `packages/drizzle-query/src/index.ts`.

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

2. Если `productQuery.getMany/getOne` принимает API-shaped where от GraphQL, добавить тот же mapper и туда. Если `productQuery` используется только repository-internal, не добавлять.
3. Перенести `categoryRelayQuery` mappings из `filter-normalizers.ts` в query config:

```ts
mapWhereFields({
  id: decodeCategoryGlobalId,
  parentId: decodeCategoryGlobalId,
})
```

4. Перенести `variantRelayQuery` mappings:

```ts
mapWhereFields({
  id: decodeVariantGlobalId,
  productId: decodeProductGlobalId,
})
```

5. Удалить resolver-level `normalizeCategoryWhereInput` и `normalizeVariantWhereInput`, когда все callers перейдут на query-level mapping.
6. Для специальных не-SQL filters вроде `CategoryHierarchyScopeInput` оставить отдельный API normalizer. Это не generated drizzle-query where и не должно попадать в generic mapper.

## Важные edge cases

- `_and`/`_or` могут содержать пустой массив: transformer сохраняет форму, SQL builder уже решает, что делать.
- `null` и `undefined` не передавать в mapper, если operator не должен их обрабатывать. Текущий `WhereBuilder` пропускает такие значения.
- `_not` должен сохранять тот же path prefix, потому что это логическое отрицание, а не relation nesting.
- Relation object и filter object различаются через `isFilterObject`.
- Mapper не должен менять ключ поля или operator, только значение.
- Если mapper возвращает тот же value, subtree может сохранить старую ссылку.

## Проверка реализации

Добавить focused unit coverage в `packages/drizzle-query/src/__tests__/...`:

- maps shorthand field filter;
- maps `_eq`, `_neq`, `_in`, `_notIn`;
- maps nested `_and/_or/_not`;
- maps relation path по full path;
- не маппит похожий leaf в другом path;
- не маппит `_is/_isNot`;
- `execute`, `count`, `getSql`, Relay и Cursor используют одинаковый transformed where.

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
