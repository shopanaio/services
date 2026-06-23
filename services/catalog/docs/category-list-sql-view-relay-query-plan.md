# План: Category list small views + joined Relay query

## Цель

Сделать `catalogQuery.categories` пригодным для Admin category grid без большой плоской
`category_list_view`, которая дублирует почти всю `catalog.category`.

Новый target:

```text
catalog.category
  + small view: catalog.category_list_labels_view
  + optional small view: catalog.category_list_child_counts_view
  -> createQuery(category, joins)
  -> createRelayQuery(...)
  -> generated GraphQL CategoryWhereInput / CategoryOrderField
```

Основная таблица `catalog.category` остается source для обычных table fields:

- `id`, `parentId`, `handle`, `path`, `depth`;
- `defaultSort`, `defaultSortDirection`;
- `productsCount`;
- `publishedAt`, `createdAt`, `updatedAt`;
- `deletedAt`, `revision`, `projectId` для repository-owned filters.

Small views нужны только для полей, которых нет в `category`:

- `name` из `catalog.category_translation.name`;
- `parentName` из parent category translation;
- `subcategoriesCount` как direct child count, если grid/filter действительно использует это поле.

`isPublished` не требует отдельной view. Для этого cutover статус фильтруется/сортируется через
`publishedAt`, чтобы GraphQL API соответствовал текущей модели `drizzle-query`.

## Изученные локальные примеры

Перед реализацией сверяться с этими примерами в workspace package `@shopana/drizzle-query`.

- `packages/drizzle-query/src/__tests__/sql-view-snapshots.test.ts`
  - `productsWithStatsQuery`: table -> view join через
    `field(products.id).leftJoin(productStatsViewQuery, productStatsView.productId)`;
  - `usersWithSummaryQuery`: table -> view join;
  - `publishedWithCategoryStatsQuery`: view -> view join;
  - `categoriesWithTranslationsQuery`: table -> joined translation query.
- `packages/drizzle-query/src/__tests__/type-inference.test.ts`
  - `productsViewWithJoinQuery`: view source + joined translation query.
- `packages/drizzle-query/src/__tests__/builder.test.ts`
  - join появляется в SQL только когда используется joined path в `select`, `where` или `order`;
  - where по joined field пишется nested shape:
    `{ translation: { value: { _containsi: "test" } } }`.
- `packages/drizzle-query/src/__tests__/where-transform.test.ts`
  - joined query использует mapper своего builder scope, например mapper translation не смешивается
    с mapper product.
- `services/catalog/src/repositories/product/ProductRepository.ts`
  - текущий production-паттерн joined query: `vendor` join внутри `productRelayQuery`.

Важное ограничение текущего GraphQL generator:

- `packages/drizzle-query/src/graphql.ts` берет `query.getSnapshot().fields`;
- `getSnapshot().fields` возвращает только top-level keys из `createQuery(..., fields)`;
- joined field вроде `labels` будет виден generator как одно поле `labels`, а не как
  `labels.name` / `labels.parentName`;
- типы generator берет из base table columns, поэтому joined field без специальной поддержки
  не может корректно стать public `name: StringFilter`.

Вывод: query с join на view уже поддерживается для runtime SQL, Relay, where/order nested paths.
GraphQL API для этого cutover должен отражать эту модель. То есть
фильтр по имени должен быть nested:

```graphql
where: {
  labels: {
    name: { _containsi: "shoe" }
  }
}
```

Для `orderBy` dotted path нельзя представить напрямую в GraphQL enum value, поэтому generator должен
либо кодировать nested path в enum name (`labels_name` -> `labels.name`), либо использовать другой
уже принятый в проекте формат.

## Не цели

- Не менять public `Category` node resolver на view-backed resolver.
- Не делать одну большую `category_list_view`, содержащую все поля `category`.
- Не редактировать `services/catalog/src/api/graphql-admin/schema/__generated__/filters.graphql`
  вручную.
- Не добавлять ручные GraphQL inputs вроде `CategoryListWhereInput`.
- Не запускать `test` или `tsc` для проверки. Для реализации использовать generation/build workflow.
- Не редактировать changeset file.

## 1. Добавить small view для category labels

Файл: `services/catalog/src/repositories/models/categories.ts`

Добавить view рядом с `category`, `categoryTranslation`, `productCategory`.

Рабочее имя:

```ts
export const categoryListLabelsView = catalogSchema
  .view("category_list_labels_view")
  .as((qb) => ...);
```

View возвращает одну строку на `(project_id, category_id, locale)`:

```sql
CREATE VIEW catalog.category_list_labels_view AS
SELECT
  c.project_id,
  c.id AS category_id,
  ct.locale,
  ct.name AS name,
  pct.name AS parent_name
FROM catalog.category c
JOIN catalog.category_translation ct
  ON ct.project_id = c.project_id
 AND ct.category_id = c.id
LEFT JOIN catalog.category p
  ON p.project_id = c.project_id
 AND p.id = c.parent_id
 AND p.deleted_at IS NULL
LEFT JOIN catalog.category_translation pct
  ON pct.project_id = p.project_id
 AND pct.category_id = p.id
 AND pct.locale = ct.locale;
```

Drizzle notes:

- Use table aliases for parent category and parent translation.
- Keep `projectId`, `categoryId`, `locale`, `name`, `parentName` only.
- Do not put `handle`, `path`, `depth`, timestamps, `productsCount`, `deletedAt`, `revision` into
  this view; those remain on `category`.
- Prefer `parentName = NULL` for root categories. UI can render `Root`. Do not hardcode `"Root"` in
  SQL unless the API intentionally wants an English filter/sort value.

Data invariant:

- Every category visible in Admin list must have `category_translation` for `ctx.locale`.
- If this is not guaranteed, add a backfill or fallback policy before cutover. Otherwise an
  `innerJoin` to labels + `locale = ctx.locale` will hide categories missing that locale.

## 2. Optional small view for direct child counts

Only add this if `subcategoriesCount` is exposed as filter/order/display field in this cutover.

Рабочее имя:

```ts
export const categoryListChildCountsView = catalogSchema
  .view("category_list_child_counts_view")
  .as((qb) => ...);
```

SQL shape:

```sql
CREATE VIEW catalog.category_list_child_counts_view AS
SELECT
  project_id,
  parent_id AS category_id,
  COUNT(*)::int AS subcategories_count
FROM catalog.category
WHERE deleted_at IS NULL
  AND parent_id IS NOT NULL
GROUP BY project_id, parent_id;
```

Semantics:

- `subcategoriesCount` means direct non-deleted children only.
- Categories with no children have no row in this view; the query layer must treat missing stats as
  `0` for display/filter semantics.
- If recursive descendants are needed later, add a separate `descendantsCount` field.

Index follow-up:

- Existing `idx_category_parent_id` helps, but a project-aware partial index is better:
  `category(project_id, parent_id) WHERE deleted_at IS NULL`.

## 3. Build category query with joins to small views

Файл: `services/catalog/src/repositories/category/CategoryRepository.ts`

Keep the exported name `categoryRelayQuery` so `services/catalog/scripts/generate-filters.ts` keeps
importing the same symbol.

Pattern from `drizzle-query` tests:

```ts
const categoryLabelsQuery = createQuery(categoryListLabelsView, {
  projectId: field(categoryListLabelsView.projectId),
  categoryId: field(categoryListLabelsView.categoryId),
  locale: field(categoryListLabelsView.locale),
  name: field(categoryListLabelsView.name),
  parentName: field(categoryListLabelsView.parentName),
});

const categoryChildCountsQuery = createQuery(categoryListChildCountsView, {
  projectId: field(categoryListChildCountsView.projectId),
  categoryId: field(categoryListChildCountsView.categoryId),
  subcategoriesCount: field(categoryListChildCountsView.subcategoriesCount),
});

const categoryListQuery = createQuery(category, {
  id: field(category.id),
  projectId: field(category.projectId),
  parentId: field(category.parentId),
  path: field(category.path),
  depth: field(category.depth),
  handle: field(category.handle),
  defaultSort: field(category.defaultSort),
  defaultSortDirection: field(category.defaultSortDirection),
  productsCount: field(category.productsCount),
  publishedAt: field(category.publishedAt),
  createdAt: field(category.createdAt),
  updatedAt: field(category.updatedAt),
  deletedAt: field(category.deletedAt),
  revision: field(category.revision),

  labels: field(category.id).innerJoin(
    categoryLabelsQuery,
    categoryListLabelsView.categoryId,
  ),

  childCounts: field(category.id).leftJoin(
    categoryChildCountsQuery,
    categoryListChildCountsView.categoryId,
  ),
});
```

Join choices:

- `labels` is `innerJoin` because localized `name` is required for list sorting/filtering.
- `childCounts` is `leftJoin` so categories without children stay visible.
- If `subcategoriesCount` is not included in this cutover, skip `categoryListChildCountsView` and
  the `childCounts` join entirely.

Repository-owned filters:

```ts
const mergedWhere: CategoryRelayInput["where"] = {
  _and: [
    { projectId: { _eq: this.storeId } },
    { deletedAt: { _is: null } },
    { labels: { projectId: { _eq: this.storeId } } },
    { labels: { locale: { _eq: this.locale } } },
    ...(where ? [where] : []),
    ...(scopeWhere ? [scopeWhere] : []),
    ...(productsScopeWhere ? [productsScopeWhere] : []),
  ],
};
```

Notes:

- The locale filter must be repository-owned and always present. Without it, translation rows create
  duplicate category rows and break Relay pagination/count.
- Do not add `{ childCounts: { projectId: ... } }` to `where` unless null/no-children behavior is
  handled explicitly. A `WHERE childCounts.projectId = ...` condition turns the left join into an
  effective inner join and hides categories with zero children.
- Since `category.id` is the primary key, joining child counts by `category_id` is tenant-safe. Keep
  `projectId` in the child-count view for debugging and future composite join support.

Relay query:

```ts
export const categoryRelayQuery = createRelayQuery(
  categoryListQuery
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

Default order remains:

```ts
orderBy: orderBy ?? [
  { field: "createdAt", direction: "desc" },
  { field: "id", direction: "desc" },
]
```

Existing `scopeWhere` and `productsScopeWhere` continue using base fields `id`, `path`, `parentId`,
so they stay compatible with the joined query.

## 4. Generate nested Category filters and order fields

Файл: `services/catalog/scripts/generate-filters.ts`

Category generation should expose joined fields in the same shape that `drizzle-query` accepts at
runtime. Do not introduce top-level public fields for `labels.name` or `labels.parentName`.

Where input target:

```graphql
input CategoryWhereInput {
  _and: [CategoryWhereInput!]
  _or: [CategoryWhereInput!]
  _not: CategoryWhereInput
  id: IDFilter
  parentId: IDFilter
  handle: StringFilter
  productsCount: IntFilter
  publishedAt: DateTimeFilter
  labels: CategoryLabelsWhereInput
  childCounts: CategoryChildCountsWhereInput
  ...
}

input CategoryLabelsWhereInput {
  name: StringFilter
  parentName: StringFilter
}

input CategoryChildCountsWhereInput {
  subcategoriesCount: IntFilter
}
```

Order field target:

```graphql
enum CategoryOrderField {
  id
  handle
  productsCount
  publishedAt
  createdAt
  updatedAt
  labels_name
  labels_parentName
  childCounts_subcategoriesCount
}
```

`labels_name` / `labels_parentName` are GraphQL-safe enum names for the existing `drizzle-query`
paths `labels.name` / `labels.parentName`. The request mapper that converts GraphQL enum values to
repository input must decode those enum names back to dotted paths before calling
`categoryRelayQuery.execute`.

Generator call should still exclude repository-owned internals:

```ts
const categoryWhere = generateWhereInputType(categoryRelayQuery, "Category", {
  includeDescriptions: true,
  excludeFields: [
    "projectId",
    "deletedAt",
    "revision",
  ],
});

const categoryOrderBy = generateOrderByInputType(categoryRelayQuery, "Category", {
  includeDescriptions: true,
  excludeFields: [
    "projectId",
    "deletedAt",
    "revision",
  ],
});
```

If nested GraphQL generation is considered too large for this category-grid cutover, fallback to a
flat `category_list_view` remains the smaller implementation.

Status filter/order uses `publishedAt`; do not add `isPublished` in this cutover.

## 5. Migration workflow

After adding the Drizzle view model(s), generate catalog migration through the project workflow.

Expected migration effects:

```sql
CREATE VIEW "catalog"."category_list_labels_view" AS (...);
```

Optional:

```sql
CREATE VIEW "catalog"."category_list_child_counts_view" AS (...);
```

Do not hand-edit Drizzle meta snapshots unless the project migration workflow requires it. If
Drizzle Kit cannot generate exact SQL cleanly, add manual SQL migration and keep Drizzle model
aligned with that SQL.

## 6. Resolver and generated TypeScript updates

Files:

- `services/catalog/src/resolvers/admin/CategoryConnectionResolver.ts`
- `services/catalog/src/resolvers/admin/generated/types.ts`
- `services/catalog/src/resolvers/admin/generated/schemas.ts`
- `admin/schema.graphql`
- `admin/src/graphql/types.ts`
- `e2e/schema-admin.graphql`
- `e2e/codegen/admin-gql.ts`

Expected work:

1. Regenerate catalog filters after `categoryRelayQuery` and nested joined field generation changes.
2. Regenerate catalog admin GraphQL resolver types after `filters.graphql` changes.
3. Recompose/fetch admin supergraph schema so `admin/schema.graphql` sees new category fields.
4. Regenerate Admin frontend GraphQL types.
5. Regenerate e2e schema/types if the project workflow requires it.

Resolvers should pass where/order to `categoryRelayQuery` in the same nested shape that
`drizzle-query` accepts. If GraphQL enum values encode dotted paths, decode only the enum token
(`labels_name`) to the existing path (`labels.name`); do not add top-level field mapping.

## 7. Admin category grid integration

File: `admin/src/domains/inventory/categories/page/page.tsx`

Sort mapping after generated types include new fields:

```ts
const CATEGORY_SORT_FIELDS: Partial<Record<string, CategoryOrderField>> = {
  name: CategoryOrderField.LabelsName,
  productsCount: CategoryOrderField.ProductsCount,
  parentName: CategoryOrderField.LabelsParentName,
  subcategoriesCount: CategoryOrderField.ChildCountsSubcategoriesCount,
  updatedAt: CategoryOrderField.UpdatedAt,
  createdAt: CategoryOrderField.CreatedAt,
  publishedAt: CategoryOrderField.PublishedAt,
  handle: CategoryOrderField.Handle,
  depth: CategoryOrderField.Depth,
};
```

Column mapping:

- `Category`
  - sort field: `labels_name`;
  - filter field: `labels.name`;
  - display still selects `Category.name` and `Category.handle`.
- `Parent`
  - sort field: `labels_parentName`;
  - filter field: `labels.parentName`;
  - display can keep `category.parent?.name ?? "Root"`.
- `Products`
  - sort/filter field: `productsCount`.
- `Subcategories`
  - use `childCounts.subcategoriesCount` only if the API field/filter/order is added.
- `Status`
  - use `publishedAt` filters and keep display from `Category.isPublished`.

Search update:

```ts
where: {
  _or: [
    { labels: { name: { _containsi: query } } },
    { handle: { _containsi: query } },
    { labels: { parentName: { _containsi: query } } },
  ],
}
```

## 8. Optional API addition: display subcategoriesCount

If the category grid must display subcategory count, add a first-class GraphQL field:

```graphql
type Category implements Node @key(fields: "id") {
  ...
  subcategoriesCount: Int!
}
```

Recommended first implementation:

- Add DataLoader/repository method counting direct children by category IDs, or reuse
  `category_list_child_counts_view` through a loader.
- Sort/filter can still use the nested Relay query path.
- Do not overload `children: [Category!]!` as a count field.

## 9. Verification checklist

Do not run `test` or `tsc` for this task.

For implementation verification use project generation/build workflow:

1. Generate catalog migration after the Drizzle view model changes.
2. Generate catalog filters so `CategoryWhereInput` / `CategoryOrderField` include nested joined
   fields.
3. Generate GraphQL resolver types.
4. Compose/regenerate Admin schema and Admin frontend types.
5. Run build only when a new code version needs validation.

Manual behavior checks:

- `catalogQuery.categories(orderBy: [{ field: labels_name, direction: ASC }])` sorts by translated
  category name for current locale.
- `where: { labels: { name: { _containsi: "shoe" } } }` filters by translated category name.
- `where: { labels: { parentName: { _containsi: "summer" } } }` filters by parent translated
  category name.
- Root categories with `parentName = null` still render as `Root` in Admin UI.
- `where: { productsCount: { _gte: 1 } }` filters by denormalized product count from `category`.
- If included, `where: { childCounts: { subcategoriesCount: { _gt: 0 } } }` filters categories with
  direct children.
- Existing `meta.hierarchyScope` and `meta.productsScope` still work.
- `totalCount` changes with the same filters as the paginated connection.
- Missing current-locale translations are either backfilled/fallbacked or intentionally hidden.

## Rollout order

1. Add `categoryListLabelsView` Drizzle model and migration.
2. Add `categoryListChildCountsView` only if this cutover exposes `subcategoriesCount`.
3. Add nested joined field generation for Category filters/order fields without top-level fields.
4. Switch `categoryRelayQuery` to base `category` query with joins to small views.
5. Regenerate GraphQL and Admin types.
6. Enable Admin sorting/filtering for `labels.name`, `labels.parentName`, `productsCount`, and
   `publishedAt`.
7. Add `subcategoriesCount` display field only if the grid needs to render it.

## Risks and decisions

- The small-view approach avoids duplicating `category` columns, but generated GraphQL must support
  nested joined fields in the same shape that `drizzle-query` already uses.
- Locale-specific labels can hide categories missing the current locale translation.
- Root parent label should stay UI display concern unless product/API explicitly wants `"Root"` as
  filterable backend value.
- Non-materialized label view sorting/filtering by translated names may become slow on large
  catalogs. Add trigram indexes only after measurement and extension policy decision.
- If nested joined field generation becomes larger than expected, the pragmatic fallback is one flat
  list view.
