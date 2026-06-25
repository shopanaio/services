# План создания `category_list_view` и интеграции с drizzle-query Relay

## Цель

Перевести backend списка категорий `catalogQuery.categories` на dedicated PostgreSQL VIEW по той же модели, по которой сейчас работает список продуктов через `catalog.product_list_view`.

После изменения root список категорий должен:

- возвращать те же `CategoryConnection` / `CategoryEdge` / `PageInfo`;
- использовать `@shopana/drizzle-query` Relay pagination через `createRelayQuery`;
- поддерживать generated `CategoryWhereInput` и `CategoryOrderByInput` по полям list view;
- фильтровать и сортировать по локализованному `name`, а не только по полям таблицы `category`;
- всегда ограничиваться текущим `projectId`, `deletedAt IS NULL` и текущей `locale`;
- сохранить существующее поведение `Category.products(...)`: продукты внутри категории остаются отдельным connection и продолжают сортироваться через `ListingOrderByInput` (`MANUAL`, `NAME`, `NEWEST`, `PRICE`).

## Текущий baseline

Products list уже использует dedicated view:

- модель: `services/catalog/src/repositories/models/productListView.ts`;
- relay query: `productRelayQuery` в `services/catalog/src/repositories/product/ProductRepository.ts`;
- фильтры и сортировки: `services/catalog/scripts/generate-filters.ts`;
- GraphQL вход: `catalogQuery.products(where/orderBy/meta)` в `services/catalog/src/api/graphql-admin/schema/base.graphql`.

Ключевые свойства products list:

- `productListView` разворачивает translated `name`, `locale`, price range, primary category и vendor/brand в одну read-модель;
- `ProductRepository.getConnection()` добавляет repository-owned filters:
  - `projectId = storeId`;
  - `deletedAt IS NULL`;
  - `locale = ctx.locale ?? ctx.store.defaultLocale`;
  - `currency = ctx.currency ?? "UAH"` или `currency IS NULL`;
- `totalCount` считается через `productRelayQuery.count()` с тем же `mergedWhere`, что и page query;
- public ID filters мапятся из GraphQL global IDs в database UUID через `mapWhereFields`.

Categories list сейчас работает иначе:

- `categoryRelayQuery` построен напрямую от таблицы `category`;
- generated `CategoryWhereInput` не содержит `name` и `locale`;
- сортировка по названию категории невозможна на уровне root categories query;
- поле `Category.name` резолвится отдельно через loader `categoryTranslation`, поэтому список может показать имя, но не может фильтровать/сортировать по нему в SQL;
- `Category.products(...)` уже является отдельным Relay connection и не должен смешиваться с root category list view.

## Target backend files

```text
services/catalog/src/repositories/models/categoryListView.ts
services/catalog/src/repositories/models/index.ts
services/catalog/src/repositories/category/CategoryRepository.ts
services/catalog/scripts/generate-filters.ts
services/catalog/src/api/graphql-admin/schema/__generated__/filters.graphql
services/catalog/migrations/<next>_*.sql
services/catalog/migrations/meta/<next>_snapshot.json
```

Generated GraphQL/runtime files после codegen:

```text
services/catalog/src/resolvers/admin/generated/types.ts
services/catalog/src/resolvers/admin/generated/schemas.ts
admin/src/graphql/types.ts
```

## 1. Создать Drizzle model для PostgreSQL VIEW

Добавить `services/catalog/src/repositories/models/categoryListView.ts`.

Минимальный состав view должен покрывать поля, которые нужны списку и фильтрам:

```ts
import { sql } from "drizzle-orm";
import { catalogSchema } from "./schema";
import { category, categoryTranslation } from "./categories";

export const categoryListView = catalogSchema.view("category_list_view").as((qb) =>
  qb
    .select({
      projectId: category.projectId,
      id: category.id,
      parentId: category.parentId,
      path: category.path,
      depth: category.depth,
      handle: category.handle,
      defaultSort: category.defaultSort,
      defaultSortDirection: category.defaultSortDirection,
      publishedAt: category.publishedAt,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
      deletedAt: category.deletedAt,
      revision: category.revision,
      productsCount: category.productsCount,
      locale: categoryTranslation.locale,
      name: categoryTranslation.name,
    })
    .from(category)
    .innerJoin(
      categoryTranslation,
      sql`${categoryTranslation.projectId} = ${category.projectId} AND ${categoryTranslation.categoryId} = ${category.id}`,
    )
);
```

Нужен `innerJoin`, как у `productListView` с `productTranslation`: list view представляет локализованную строку категории. Категории без перевода в текущей локали не должны попадать в локализованный list result. Если бизнес-требование другое, нужно отдельно определить fallback locale, но не добавлять fallback в resolver.

Экспортировать model из `services/catalog/src/repositories/models/index.ts` рядом с `productListView`.

## 2. Сгенерировать migration для `catalog.category_list_view`

Создать migration через проектный approved command для Drizzle migrations. Ручное редактирование generated migration нежелательно; если SQL не совпадает с ожидаемой view definition, сначала исправить Drizzle model и перегенерировать.

Ожидаемая migration shape:

```sql
CREATE VIEW "catalog"."category_list_view" AS (
  select
    "catalog"."category"."project_id",
    "catalog"."category"."id",
    "catalog"."category"."parent_id",
    "catalog"."category"."path",
    "catalog"."category"."depth",
    "catalog"."category"."handle",
    "catalog"."category"."default_sort",
    "catalog"."category"."default_sort_direction",
    "catalog"."category"."published_at",
    "catalog"."category"."created_at",
    "catalog"."category"."updated_at",
    "catalog"."category"."deleted_at",
    "catalog"."category"."revision",
    "catalog"."category"."products_count",
    "catalog"."category_translation"."locale",
    "catalog"."category_translation"."name"
  from "catalog"."category"
  inner join "catalog"."category_translation"
    on ...
);
```

Acceptance:

- view называется `catalog.category_list_view`;
- view не материализованная;
- нет агрегатов и cross-service данных;
- `products_count` берется из denormalized `category.products_count`;
- `locale` и `name` берутся из `category_translation`;
- join обязательно tenant-aware через `project_id`.

## 3. Переключить `categoryRelayQuery` на view

В `services/catalog/src/repositories/category/CategoryRepository.ts` заменить root relay query source:

```ts
export const categoryRelayQuery = createRelayQuery(
  createQuery(categoryListView)
    .include(["id"])
    .mapWhereFields({
      id: decodeCategoryGlobalId,
      parentId: decodeCategoryGlobalId,
    })
    .maxLimit(100)
    .defaultLimit(20),
  { name: "category", tieBreaker: "id" },
);
```

`categoryQuery` для `getOne`, `getMany`, loaders и CRUD остается на таблице `category`.

`CategoryRelayInput` должен остаться:

```ts
export type CategoryRelayInput = InferRelayInput<typeof categoryRelayQuery>;
```

Не добавлять отдельные GraphQL-only поля вручную. Public filter/order surface должен выводиться из `categoryRelayQuery`.

## 4. Обновить `CategoryRepository.getConnection()`

`getConnection()` должен повторять структуру `ProductRepository.getConnection()`.

Target merge-фильтр:

```ts
const mergedWhere: CategoryRelayInput["where"] = {
  _and: [
    { projectId: { _eq: this.storeId } },
    { deletedAt: { _is: null } },
    { locale: { _eq: this.locale } },
    ...(where ? [where] : []),
    ...(scopeWhere ? [scopeWhere] : []),
    ...(productsScopeWhere ? [productsScopeWhere] : []),
  ],
};
```

Default order:

```ts
orderBy: orderBy ?? [
  { field: "createdAt", direction: "desc" },
  { field: "id", direction: "desc" },
]
```

Execution:

```ts
const [result, totalCount] = await Promise.all([
  categoryRelayQuery.execute(this.connection, executeInput),
  categoryRelayQuery.count(this.connection, { where: mergedWhere }),
]);
```

Return shape не меняется:

```ts
return {
  edges: result.edges.map((edge) => ({
    cursor: edge.cursor,
    nodeId: edge.node.id,
  })),
  pageInfo: result.pageInfo,
  totalCount,
};
```

Important: `CategoryConnectionResolver` должен продолжать создавать `CategoryResolver(nodeId)`. List view не заменяет domain entity resolver; view только выбирает IDs и строит cursor/page.

## 5. Проверить scope builders после перехода на view

`buildHierarchyScopeWhere()` может остаться прежним, потому что `categoryListView` содержит:

- `id`;
- `parentId`;
- `path`;
- `depth`.

`buildProductsScopeWhere()` тоже может остаться прежним, потому что возвращает filter по `id`.

Нужно только убедиться, что empty where типизируется через новый `CategoryRelayInput["where"]`:

```ts
const EMPTY_CATEGORY_WHERE: CategoryRelayInput["where"] = {
  id: { _in: ["00000000-0000-0000-0000-000000000000"] },
};
```

## 6. Обновить generated filters/order для Category

В `services/catalog/scripts/generate-filters.ts` добавить field type map по аналогии с `productListFieldTypes`:

```ts
const categoryListFieldTypes: Record<string, GraphQLFieldType> = {
  id: "ID",
  parentId: "ID",
  path: "String",
  depth: "Int",
  handle: "String",
  defaultSort: "String",
  defaultSortDirection: "String",
  publishedAt: "DateTime",
  createdAt: "DateTime",
  updatedAt: "DateTime",
  productsCount: "Int",
  locale: "String",
  name: "String",
};
```

Генерация:

```ts
const categoryWhere = generateWhereInputType(categoryRelayQuery, "Category", {
  includeDescriptions: true,
  fieldTypes: categoryListFieldTypes,
  excludeFields: ["projectId", "deletedAt", "revision"],
});

const categoryOrderBy = generateOrderByInputType(categoryRelayQuery, "Category", {
  includeDescriptions: true,
  fieldTypes: categoryListFieldTypes,
  excludeFields: ["projectId", "deletedAt", "revision"],
});
```

Решение по `productsCount`: текущий generated schema исключает `productsCount`. Для parity со list UI лучше включить его как public filter/order field, потому что это list-level denormalized поле категории. Если product count не должен быть публичным filter/order, оставить в `excludeFields`, но тогда явно зафиксировать это в UI requirements.

После генерации `CategoryWhereInput` должен получить:

- `locale: StringFilter`;
- `name: StringFilter`;
- опционально `productsCount: IntFilter`.

`CategoryOrderField` должен получить:

- `locale`;
- `name`;
- опционально `productsCount`.

Не редактировать `services/catalog/src/api/graphql-admin/schema/__generated__/filters.graphql` вручную.

## 7. GraphQL schema contract

`services/catalog/src/api/graphql-admin/schema/base.graphql` менять не нужно, если `catalogQuery.categories` уже принимает:

```graphql
where: CategoryWhereInput
orderBy: [CategoryOrderByInput!]
meta: CategoryCategoriesMetaInput
```

`services/catalog/src/api/graphql-admin/schema/category.graphql` менять не нужно для root categories.

`Category.products(...)` обязательно оставить отдельным контрактом:

```graphql
products(
  first: Int
  after: String
  last: Int
  before: String
  orderBy: [ListingOrderByInput!]
  where: CategoryProductWhereInput
): CategoryProductConnection!
```

Это и есть backend parity с "view продуктов в категории": root category list получает свой SQL list view, а products-in-category остаются отдельной query surface с manual listing sort mapping.

## 8. Сохранить поведение products-in-category

Не переносить `Category.products(...)` на `category_list_view`.

Текущая логика в `getCategoryProductsConnection()` должна остаться отдельной:

- base filters:
  - `projectId = storeId`;
  - `deletedAt IS NULL`;
  - `category.categoryId = categoryId`;
- default sort:
  - `category.lexoRank ASC`;
  - `id ASC`;
- `ListingOrderByInput` mapping:
  - `MANUAL` -> `category.lexoRank`;
  - `NAME` -> `translation.name`;
  - `NEWEST` -> `createdAt`;
  - `PRICE ASC` -> `priceRange.minAmountMinor`;
  - `PRICE DESC` -> `priceRange.maxAmountMinor`.

Однако нужно проверить locale/currency parity:

- сейчас `categoryProductsQuery` join на `productTranslation` и `productPriceRange` не ограничивает `locale`/`currency`;
- если user-visible behavior должен полностью повторять product list, добавить в `getCategoryProductsConnection()` repository-owned filters:
  - `{ translation: { locale: { _eq: this.locale } } }`, если query builder exposed field содержит locale;
  - `{ _or: [{ priceRange: { currency: { _eq: this.currency } } }, { priceRange: { currency: { _is: null } } }] }`, если category products price sorting/filtering должен учитывать current currency.

Этот пункт лучше делать отдельным small follow-up, если сейчас generated `CategoryProductWhereInput` не содержит nested translation/price fields. В рамках `category_list_view` нельзя ломать существующий category-products contract.

## 9. Global ID filters

Для root category list сохранить `mapWhereFields`:

- `id` -> `decodeCategoryGlobalId`;
- `parentId` -> `decodeCategoryGlobalId`.

Этого достаточно для generated `IDFilter`, включая `_eq`, `_in`, `_notIn` и вложенные logical filters, потому что mapping выполняется в drizzle-query layer.

Не нужно добавлять отдельный resolver normalizer для `where`, пока `categoryRelayQuery.mapWhereFields()` покрывает public ID fields. Scope inputs (`hierarchyScope`, `productsScope`) остаются в `filter-normalizers.ts`, потому что это не generated drizzle-query filters, а GraphQL meta contract.

## 10. Codegen и build

После backend изменений выполнить только разрешенные проектом команды:

1. Drizzle migration generation через проектный command.
2. Filter generation:

```bash
npm run <catalog-generate-filters-command>
```

3. GraphQL/types codegen через project-approved command, если generated resolver/admin types не обновляются автоматически.
4. `build`, когда нужна проверка новой версии кода.

Не запускать `test` и `tsc` для проверки.

## 11. Acceptance criteria

Backend acceptance:

- `catalog.category_list_view` существует в Drizzle model и migration snapshot.
- `categoryRelayQuery` построен от `categoryListView`, а не от `category`.
- `CategoryRepository.getConnection()` всегда добавляет `projectId`, `deletedAt`, `locale`.
- `totalCount` считается через `categoryRelayQuery.count()` с тем же `mergedWhere`.
- `CategoryWhereInput` содержит `name` и `locale`.
- `CategoryOrderField` содержит `name` и `locale`.
- `id` и `parentId` filters принимают GraphQL global IDs и декодируются до UUID.
- `CategoryConnectionResolver` по-прежнему возвращает `CategoryResolver` по `nodeId`.
- `Category.products(...)` не меняет GraphQL contract и продолжает работать через `CategoryProductConnectionResolver`.
- Generated files обновлены генерацией, а не ручным редактированием.

Functional acceptance examples:

```graphql
query CategoriesByName($where: CategoryWhereInput, $orderBy: [CategoryOrderByInput!]) {
  catalogQuery {
    categories(where: $where, orderBy: $orderBy, first: 20) {
      totalCount
      edges {
        cursor
        node {
          id
          handle
          name
          productsCount
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
}
```

Variables:

```json
{
  "where": {
    "name": { "_ilike": "%кава%" }
  },
  "orderBy": [
    { "field": "name", "direction": "asc" },
    { "field": "id", "direction": "asc" }
  ]
}
```

Expected:

- SQL идет через `catalog.category_list_view`;
- результат содержит только категории текущего tenant и locale;
- cursor pagination stable за счет `id` tie breaker;
- `totalCount` совпадает с фильтром по `name`.

## 12. Риски и решения

Риск: категории без перевода пропадут из списка.

Решение: это соответствует `product_list_view`. Если нужен fallback, сначала описать fallback locale rule и реализовать его в view/repository, а не в resolver.

Риск: `CategoryResolver.name()` делает дополнительный loader lookup, хотя list view уже выбрал `name`.

Решение: это приемлемо для первого cutover, потому что connection возвращает только IDs. Оптимизацию можно делать отдельно через preload/data shape changes, но не смешивать с migration на view.

Риск: `productsCount` станет public filter/order полем.

Решение: принять явно. Для admin list это полезно и соответствует list-level данным. Если поле не нужно в filters/order, оставить его excluded и зафиксировать это как intentional limitation.

Риск: category-products locale/currency отличается от product list.

Решение: не менять в этом cutover без отдельной проверки UI behavior. Для полного parity добавить отдельный план на `categoryProductsRelayQuery` через dedicated product-in-category list view или расширение текущих joins.

## 13. Рекомендуемый порядок работ

1. Добавить `categoryListView` model и export.
2. Сгенерировать migration для `catalog.category_list_view`.
3. Переключить `categoryRelayQuery` на `categoryListView`.
4. Добавить `locale` в repository-owned filters `getConnection()`.
5. Обновить `generate-filters.ts` для category list field types.
6. Запустить генерацию filters GraphQL.
7. Запустить GraphQL/types codegen, если требуется.
8. Запустить `build`.
9. Проверить вручную GraphQL query:
   - сортировка по `name`;
   - фильтр по `name`;
   - фильтр по `parentId` global ID;
   - `meta.hierarchyScope`;
   - `meta.productsScope`;
   - forward pagination `first/after`.
