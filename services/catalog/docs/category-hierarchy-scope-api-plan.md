# Category Hierarchy Scope API Plan

## Цель

Добавить backend API для безопасной фильтрации категорий относительно выбранной категории:

- вниз по дереву: descendants и subtree;
- вверх по дереву: ancestors;
- inverse-фильтры для UI picker, например "может быть parent для этой категории" и "может быть subcategory для этой категории".

Главная задача - убрать знание о `path`-формате из Admin FE. FE должен передавать только category global ID и желаемую иерархическую область, а backend должен сам вычислять корректный фильтр.

## Текущее состояние

- `catalog.category` уже хранит materialized path:
  - `parent_id`;
  - `path`, например `rootId.childId.leafId`;
  - `depth`.
- `CategoryRepository.move()` пересчитывает `path` и `depth` для перемещаемой категории и всех descendants.
- `CategoryUpdateHierarchyScript` уже защищает mutation path:
  - запрещает `parentId === categoryId`;
  - запрещает move в собственного descendant через `parent.path.startsWith(existing.path + ".")`.
- `categories(...)` использует generated `CategoryWhereInput` и `CategoryOrderByInput`.
- `CategoryWhereInput.path: StringFilter` уже технически позволяет фильтровать descendants через `_startsWith`, но это раскрывает FE внутренний формат `path`.

## API решение

Не расширять generated `CategoryWhereInput` вручную. Он остается generated contract от `@shopana/drizzle-query`.

Добавить отдельный ручной аргумент к `CatalogQuery.categories`:

```graphql
enum CategoryHierarchyScopeDirection {
  ANCESTORS
  DESCENDANTS
}

enum CategoryHierarchyScopeMode {
  INCLUDE
  EXCLUDE
}

input CategoryHierarchyScopeInput {
  referenceId: ID!
  direction: CategoryHierarchyScopeDirection!
  includeReference: Boolean = false
  mode: CategoryHierarchyScopeMode = INCLUDE
}

type CatalogQuery {
  categories(
    first: Int
    after: String
    last: Int
    before: String
    where: CategoryWhereInput
    orderBy: [CategoryOrderByInput!]
    hierarchyScope: CategoryHierarchyScopeInput
  ): CategoryConnection!
}
```

Почему отдельный аргумент:

- `where` остается чистым generated filter API;
- FE не работает с raw `path`;
- backend может переиспользовать materialized path, не фиксируя его как публичный filter contract;
- один и тот же механизм покрывает include и exclude сценарии.

## Семантика

Пусть reference category имеет:

```ts
id = "c"
path = "a.b.c"
```

### DESCENDANTS

`direction: DESCENDANTS, includeReference: false, mode: INCLUDE`

Возвращает категории ниже reference:

```ts
path starts with "a.b.c."
```

`includeReference: true`

Возвращает reference + descendants:

```ts
id = "c" OR path starts with "a.b.c."
```

### ANCESTORS

`direction: ANCESTORS, includeReference: false, mode: INCLUDE`

Возвращает категории выше reference:

```ts
id IN ["a", "b"]
```

`includeReference: true`

Возвращает ancestors + reference:

```ts
id IN ["a", "b", "c"]
```

### EXCLUDE

`mode: EXCLUDE` инвертирует вычисленную область.

Пример eligible parents для категории:

```graphql
categories(
  hierarchyScope: {
    referenceId: $categoryId
    direction: DESCENDANTS
    includeReference: true
    mode: EXCLUDE
  }
)
```

Это исключает текущую категорию и всех ее descendants. Такой список безопасен для выбора нового parent.

Пример eligible subcategories:

```graphql
categories(
  hierarchyScope: {
    referenceId: $categoryId
    direction: ANCESTORS
    includeReference: true
    mode: EXCLUDE
  }
  where: { id: { _notIn: $directChildIds } }
)
```

Это исключает текущую категорию, всех ancestors и уже привязанных direct children.

## Ошибки и пустые результаты

Для query API лучше не добавлять mutation-style `userErrors`.

Рекомендуемое поведение:

- invalid `referenceId` global ID - вернуть пустой connection;
- reference category not found, soft-deleted или из другого project - вернуть пустой connection;
- `ANCESTORS` без ancestors и `includeReference: false` - вернуть пустой connection;
- `EXCLUDE` с invalid/not found reference - тоже вернуть пустой connection, чтобы fail closed и не показать потенциально опасный picker list.

Это консервативнее, чем возвращать полный список при невалидном exclusion scope.

## Backend implementation

### 1. Schema

Изменить ручную GraphQL schema, не generated filter file:

- `services/catalog/src/api/graphql-admin/schema/category.graphql`
  - добавить enum/input `CategoryHierarchyScopeDirection`;
  - добавить enum/input `CategoryHierarchyScopeMode`;
  - добавить input `CategoryHierarchyScopeInput`.
- `services/catalog/src/api/graphql-admin/schema/base.graphql`
  - добавить аргумент `hierarchyScope: CategoryHierarchyScopeInput` в `CatalogQuery.categories`.

Generated файлы обновлять только через project codegen/schema generation.

### 2. Resolver input normalization

В `services/catalog/src/resolvers/admin/filter-normalizers.ts` оставить `normalizeCategoryWhereInput` только для generated `where`.

Добавить отдельный normalizer:

```ts
export type NormalizedCategoryHierarchyScope = {
  referenceId: string;
  direction: "ANCESTORS" | "DESCENDANTS";
  includeReference: boolean;
  mode: "INCLUDE" | "EXCLUDE";
};
```

Правила:

- strict decode `referenceId` как `GlobalIdEntity.Category`;
- если decode failed, вернуть sentinel empty scope;
- defaults:
  - `includeReference: false`;
  - `mode: "INCLUDE"`.

`QueryResolver.categories(args)` должен передавать в `CategoryConnectionResolver`:

```ts
{
  ...args,
  where: normalizeCategoryWhereInput(args.where),
  hierarchyScope: normalizeCategoryHierarchyScopeInput(args.hierarchyScope),
}
```

Не пропускать raw global ID в repository.

### 3. Repository input type

Расширить repository-level connection args отдельным internal полем:

```ts
export type CategoryConnectionInput = CategoryRelayInput & {
  hierarchyScope?: NormalizedCategoryHierarchyScope | EmptyHierarchyScope;
};
```

Если generated resolver types конфликтуют с repository type, создать явный локальный тип около `CategoryConnectionResolver`, а не смешивать GraphQL generated input с `InferRelayInput` напрямую.

### 4. Scope to where

В `CategoryRepository.getConnection()` перед сборкой `mergedWhere` построить дополнительный `scopeWhere`.

Алгоритм:

```ts
const scopeWhere = await this.buildHierarchyScopeWhere(args.hierarchyScope);

const mergedWhere = {
  _and: [
    { projectId: { _eq: this.storeId } },
    { deletedAt: { _is: null } },
    ...(where ? [where] : []),
    ...(scopeWhere ? [scopeWhere] : []),
  ],
};
```

`buildHierarchyScopeWhere()`:

- загружает reference category через `findById(referenceId)`;
- если reference не найден, возвращает `EMPTY_WHERE`;
- для descendants:
  - base include where:
    - without reference: `{ path: { _startsWith: reference.path + "." } }`;
    - with reference: `{ _or: [{ id: { _eq: reference.id } }, { path: { _startsWith: reference.path + "." } }] }`;
  - exclude mode: `{ _not: baseIncludeWhere }`;
- для ancestors:
  - `ids = reference.path.split(".")`;
  - remove `reference.id`, если `includeReference === false`;
  - если `ids.length === 0`, вернуть `EMPTY_WHERE`;
  - include mode: `{ id: { _in: ids } }`;
  - exclude mode: `{ id: { _notIn: ids } }`.

`EMPTY_WHERE` должен гарантированно вернуть 0 rows. Предпочтительно:

```ts
{ id: { _in: ["00000000-0000-0000-0000-000000000000"] } }
```

Не использовать пустой `_in: []`, если `@shopana/drizzle-query` не гарантирует корректную генерацию SQL для empty arrays.

### 5. Pagination and totalCount

`categoryRelayQuery.execute()` и `categoryRelayQuery.count()` должны получать один и тот же `mergedWhere`.

Нельзя считать `totalCount` отдельным unscoped count.

### 6. Ordering

Для generic API order остается через `orderBy`.

Рекомендованные frontend order для иерархии:

- descendants/subtree: `{ field: path, direction: asc }`;
- ancestors: `{ field: depth, direction: asc }`;
- picker lists: текущий UI order или default `createdAt desc`.

Backend не должен silently менять `orderBy`, иначе cursor pagination станет менее предсказуемой.

### 7. Indexing

Существующий `idx_category_path` помогает не во всех Postgres collations для prefix `LIKE`.

Добавить миграцию с prefix-friendly index:

```sql
CREATE INDEX IF NOT EXISTS idx_category_project_path_prefix
  ON catalog.category (project_id, path text_pattern_ops)
  WHERE deleted_at IS NULL;
```

Если Drizzle migration helper не поддерживает `text_pattern_ops` удобно, использовать raw SQL migration.

## Admin FE usage

### Parent picker

Для выбора parent категории:

```graphql
categories(
  first: $first
  after: $after
  hierarchyScope: {
    referenceId: $categoryId
    direction: DESCENDANTS
    includeReference: true
    mode: EXCLUDE
  }
)
```

Это закрывает выбор:

- самой категории;
- direct children;
- descendants любой глубины.

### Subcategories picker

Для добавления subcategories:

```graphql
categories(
  first: $first
  after: $after
  where: { id: { _notIn: $currentChildIds } }
  hierarchyScope: {
    referenceId: $categoryId
    direction: ANCESTORS
    includeReference: true
    mode: EXCLUDE
  }
)
```

Это закрывает выбор:

- самой категории;
- parent;
- ancestors любой глубины;
- уже привязанных direct children.

Descendants, которые не являются direct children, остаются валидными: их можно переместить ближе к текущей категории без цикла.

## Verification plan

Не запускать `test` и `tsc` для проверки.

После реализации:

- сгенерировать schema/types через project-approved codegen flow;
- запустить build, когда нужна новая версия кода;
- вручную проверить GraphQL queries:
  - descendants include/exclude;
  - ancestors include/exclude;
  - invalid `referenceId`;
  - `totalCount` совпадает с scoped result;
  - cursor pagination работает с `hierarchyScope`.

## Acceptance criteria

- FE может запросить eligible parent categories без знания `path`.
- FE может запросить eligible subcategories без знания `path`.
- `CategoryWhereInput` остается generated и не редактируется вручную.
- Все incoming GraphQL category IDs декодируются на resolver boundary.
- Repository всегда применяет `projectId` и `deletedAt` вместе с hierarchy scope.
- Mutation validation от циклов остается обязательной и не заменяется UI фильтрацией.
- `totalCount` использует те же filters, что и paginated connection.
