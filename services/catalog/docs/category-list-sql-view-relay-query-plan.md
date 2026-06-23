# План: Category list SQL view + drizzle-query Relay filters/sorts

## Цель

Сделать `catalogQuery.categories` пригодным для Admin category grid: поля, по которым таблица должна показывать, сортировать и фильтровать строки, должны быть SQL-полями одного `drizzle-query` source.

Целевые table fields:

- `name` / title категории из `catalog.category_translation.name`;
- `isPublished` как SQL boolean для колонки `Status`;
- `productsCount` из `catalog.category.products_count`;
- `parentName` / parent title для колонки `Parent`;
- `subcategoriesCount` для количества direct child categories;
- существующие технические поля `id`, `parentId`, `handle`, `path`, `depth`, `publishedAt`, `createdAt`, `updatedAt`.

Интеграция должна идти через Drizzle PostgreSQL view, `createQuery(view)`, `createRelayQuery(...)` и generated GraphQL `CategoryWhereInput`, `CategoryOrderField`, `CategoryOrderByInput`. Не добавлять ручные filter/order поля в GraphQL schema.

## Контекст

Текущий backend:

- `services/catalog/src/repositories/category/CategoryRepository.ts`
  - `categoryRelayQuery` построен от базовой таблицы `category`;
  - public generated `CategoryWhereInput` и `CategoryOrderField` содержат только table-level поля вроде `handle`, `path`, `depth`, `publishedAt`, `createdAt`, `updatedAt`;
  - `getConnection()` уже использует `categoryRelayQuery.execute()` и `categoryRelayQuery.count()`.
- `services/catalog/src/api/graphql-admin/schema/category.graphql`
  - `Category.name`, `Category.parent`, `Category.children`, `Category.productsCount` резолвятся через resolver/loaders, поэтому эти поля видны в selection set, но не являются SQL-sort/filter fields для root list.
- `admin/src/domains/inventory/categories/page/page.tsx`
  - grid показывает `Category`, `Status`, `Products`, `Parent`, `Updated`;
  - сортировка сейчас реально доступна только для `Updated`, потому что остальные поля не представлены в generated category order contract.

Нужный cutover: connection list остается `CategoryConnection`, nodes остаются `Category`, но source для cursor/filter/sort становится SQL view с вычисленными list fields.

## Не цели

- Не менять public `Category` node resolver на view-backed resolver. View нужна для list connection, cursor, sort и filter. Поля node по-прежнему могут резолвиться через loaders.
- Не редактировать `services/catalog/src/api/graphql-admin/schema/__generated__/filters.graphql` вручную. Он должен обновляться генерацией.
- Не добавлять кастомные ручные GraphQL inputs вроде `CategoryListWhereInput`.
- Не запускать `test` или `tsc` для проверки этого change. Для реальной реализации использовать codegen/schema generation и build по проектным правилам.
- Не редактировать changeset file.

## 1. Добавить Drizzle view model

Файл: `services/catalog/src/repositories/models/categories.ts`

Добавить view рядом с `category`, `categoryTranslation`, `productCategory`.

Рабочее имя:

```ts
export const categoryListView = catalogSchema.view("category_list_view").as((qb) => ...)
```

View должна возвращать одну строку на `(project_id, category_id, locale)`. Repository будет всегда добавлять internal filter `locale = this.locale`, поэтому public GraphQL filters не должны получать поле `locale`.

Рекомендуемая форма view:

```sql
CREATE VIEW catalog.category_list_view AS
SELECT
  c.project_id,
  c.id,
  c.parent_id,
  c.path,
  c.depth,
  c.handle,
  c.default_sort,
  c.default_sort_direction,
  c.published_at,
  (c.published_at IS NOT NULL AND c.published_at <= now()) AS is_published,
  c.products_count,
  c.created_at,
  c.updated_at,
  c.deleted_at,
  c.revision,
  ct.locale,
  ct.name AS name,
  COALESCE(pct.name, 'Root') AS parent_name,
  COALESCE(child_counts.subcategories_count, 0) AS subcategories_count
FROM catalog.category c
JOIN catalog.category_translation ct
  ON ct.project_id = c.project_id
 AND ct.category_id = c.id
LEFT JOIN catalog.category p
  ON p.project_id = c.project_id
 AND p.id = c.parent_id
 AND p.deleted_at IS NULL
LEFT JOIN catalog.category_translation pct
  ON pct.project_id = c.project_id
 AND pct.category_id = p.id
 AND pct.locale = ct.locale
LEFT JOIN (
  SELECT
    project_id,
    parent_id,
    COUNT(*)::int AS subcategories_count
  FROM catalog.category
  WHERE deleted_at IS NULL
    AND parent_id IS NOT NULL
  GROUP BY project_id, parent_id
) child_counts
  ON child_counts.project_id = c.project_id
 AND child_counts.parent_id = c.id;
```

Drizzle implementation notes:

- Use table aliases for parent category and parent translation.
- Keep `projectId`, `deletedAt`, `revision`, and `locale` in the view for repository-owned filters and internal consistency, but exclude them from public generated filters/orders.
- Use `category.productsCount` rather than recalculating product count from `product_category`; existing scripts already maintain this denormalized counter.
- `subcategoriesCount` means direct non-deleted children only. If UI later needs recursive descendants count, add a separate `descendantsCount` field instead of changing semantics.
- `name` is the public filter/order field matching `Category.name`; do not call it `title` in GraphQL unless the API is intentionally renamed.

Data invariant:

- Each category that should appear in Admin list must have a `category_translation` row for `ctx.locale`.
- If missing translations are possible, add a backfill or fallback policy before cutover. A locale-filtered view cannot sort by a missing localized title.

## 2. Add migration through Drizzle generation

After adding the view model, generate a catalog migration through the project workflow.

Expected SQL migration effect:

```sql
CREATE VIEW "catalog"."category_list_view" AS (...);
```

Do not hand-edit Drizzle meta snapshots unless the project migration workflow requires it. If Drizzle Kit cannot generate the exact SQL cleanly, add a manual SQL migration with the same statement and keep the Drizzle model aligned.

Potential index follow-ups:

- Existing `idx_category_parent_id` helps child counting by parent, but a partial composite index can improve this view:
  `category(project_id, parent_id) WHERE deleted_at IS NULL`.
- Existing `idx_category_translation_project_locale` helps locale filtering.
- `_containsi` filters on `name` / `parentName` may need `pg_trgm` GIN indexes later. Do not introduce `pg_trgm` in the first cut unless there is a measured need and extension policy is clear.

## 3. Replace category relay source with the view

File: `services/catalog/src/repositories/category/CategoryRepository.ts`

Keep the exported name `categoryRelayQuery` so `services/catalog/scripts/generate-filters.ts` can continue to import it, but build it from `categoryListView`.

Target shape:

```ts
const categoryListQuery = createQuery(categoryListView, {
  id: field(categoryListView.id),
  projectId: field(categoryListView.projectId),
  parentId: field(categoryListView.parentId),
  path: field(categoryListView.path),
  depth: field(categoryListView.depth),
  handle: field(categoryListView.handle),
  name: field(categoryListView.name),
  parentName: field(categoryListView.parentName),
  productsCount: field(categoryListView.productsCount),
  subcategoriesCount: field(categoryListView.subcategoriesCount),
  isPublished: field(categoryListView.isPublished),
  defaultSort: field(categoryListView.defaultSort),
  defaultSortDirection: field(categoryListView.defaultSortDirection),
  publishedAt: field(categoryListView.publishedAt),
  createdAt: field(categoryListView.createdAt),
  updatedAt: field(categoryListView.updatedAt),
  deletedAt: field(categoryListView.deletedAt),
  revision: field(categoryListView.revision),
  locale: field(categoryListView.locale),
});

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

`CategoryRepository.getConnection()` must merge repository-owned filters:

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

Default order should remain stable:

```ts
orderBy: orderBy ?? [
  { field: "createdAt", direction: "desc" },
  { field: "id", direction: "desc" },
]
```

Important:

- `scopeWhere` and `productsScopeWhere` must still use fields present on `categoryListView`, especially `id`, `path`, and `parentId`.
- `categoryRelayQuery.count(this.connection, { where: mergedWhere })` remains the source of `totalCount`.
- Edges can continue returning only `nodeId: edge.node.id`; the `CategoryResolver` can load node fields normally.

## 4. Generate public Category filters and order fields from the view

File: `services/catalog/scripts/generate-filters.ts`

Keep category generation, but update excludes:

```ts
const categoryWhere = generateWhereInputType(categoryRelayQuery, "Category", {
  includeDescriptions: true,
  excludeFields: ["projectId", "deletedAt", "revision", "locale"],
});

const categoryOrderBy = generateOrderByInputType(categoryRelayQuery, "Category", {
  includeDescriptions: true,
  excludeFields: ["projectId", "deletedAt", "revision", "locale"],
});
```

Expected generated public additions:

```graphql
input CategoryWhereInput {
  name: StringFilter
  parentName: StringFilter
  productsCount: IntFilter
  subcategoriesCount: IntFilter
  isPublished: BooleanFilter
  ...
}

enum CategoryOrderField {
  name
  parentName
  productsCount
  subcategoriesCount
  isPublished
  ...
}
```

Do not manually add these fields to `base.graphql` or `category.graphql`.

## 5. Resolver and generated TypeScript updates

Files:

- `services/catalog/src/resolvers/admin/CategoryConnectionResolver.ts`
- `services/catalog/src/resolvers/admin/generated/types.ts`
- `services/catalog/src/resolvers/admin/generated/schemas.ts`
- `admin/schema.graphql`
- `admin/src/graphql/types.ts`
- `e2e/schema-admin.graphql`
- `e2e/codegen/admin-gql.ts`

Expected work:

1. Regenerate catalog admin GraphQL resolver types after `filters.graphql` changes.
2. Recompose/fetch admin supergraph schema so `admin/schema.graphql` sees new generated category filters/order fields.
3. Regenerate Admin frontend GraphQL types so `CategoryOrderField`, `ApiCategoryWhereInput`, and `ApiCategoryOrderByInput` include the new fields.
4. Regenerate e2e schema/types if the project workflow requires it.

No resolver should manually map `name`, `parentName`, `productsCount`, `subcategoriesCount`, or `isPublished` order fields. They must pass through generated drizzle-query input.

## 6. Admin category grid integration

File: `admin/src/domains/inventory/categories/page/page.tsx`

Update sort mapping to generated SQL fields:

```ts
const CATEGORY_SORT_FIELDS: Partial<Record<string, CategoryOrderField>> = {
  name: CategoryOrderField.Name,
  isPublished: CategoryOrderField.IsPublished,
  productsCount: CategoryOrderField.ProductsCount,
  parentName: CategoryOrderField.ParentName,
  subcategoriesCount: CategoryOrderField.SubcategoriesCount,
  updatedAt: CategoryOrderField.UpdatedAt,
  createdAt: CategoryOrderField.CreatedAt,
  publishedAt: CategoryOrderField.PublishedAt,
  handle: CategoryOrderField.Handle,
  depth: CategoryOrderField.Depth,
};
```

Column mapping:

- `Category`
  - sort/filter field: `name`;
  - display still selects `Category.name` and `Category.handle`.
- `Status`
  - sort/filter field: `isPublished`;
  - display still derives `Published` / `Draft` from `Category.isPublished`.
- `Products`
  - sort/filter field: `productsCount`.
- `Parent`
  - sort/filter field: `parentName`;
  - display can keep `category.parent?.name ?? "Root"`.
- `Subcategories`
  - optional new column backed by `subcategoriesCount`;
  - if added to UI, the GraphQL query must select a field for display. Since `Category` currently has `children` but not `subcategoriesCount`, either:
    - add `subcategoriesCount: Int!` to `Category` and resolve it from existing child count/read model, or
    - keep it as filter/sort-only until a display field is added.
- `Updated`
  - sort/filter field: `updatedAt`.

Filter schema update:

- Add `name` as `StringFilter`.
- Add `parentName` as `StringFilter`.
- Add `productsCount` as `NumberFilter`.
- Add `subcategoriesCount` as `NumberFilter` only if the UI exposes that filter.
- Add `isPublished` as boolean/status filter.

Search update:

```ts
where: {
  _or: [
    { name: { _containsi: query } },
    { handle: { _containsi: query } },
    { parentName: { _containsi: query } },
  ],
}
```

## 7. Optional API addition: display `subcategoriesCount`

If the category grid must display subcategory count, add a first-class GraphQL field:

```graphql
type Category implements Node @key(fields: "id") {
  ...
  subcategoriesCount: Int!
}
```

Implementation options:

1. Add `subcategoriesCount` resolver that uses a DataLoader counting direct children by category IDs.
2. Add `subcategoriesCount` to the base `category` table as denormalized data and maintain it in hierarchy scripts.
3. Use the list view only for connection edge data and introduce a list-item GraphQL type.

Recommended first implementation: option 1 for display, while sort/filter still uses `category_list_view.subcategories_count`.

Do not overload `children: [Category!]!` as a count field. It is a node relation and can be expensive.

## 8. Verification checklist

Do not run `test` or `tsc` for this task.

For implementation verification use project generation/build workflow:

1. Generate catalog migration after the Drizzle model change.
2. Generate catalog filters so `CategoryWhereInput` / `CategoryOrderField` include view fields.
3. Generate GraphQL resolver types.
4. Compose/regenerate Admin schema and Admin frontend types.
5. Run build only when a new code version needs validation.

Manual behavior checks:

- `catalogQuery.categories(orderBy: [{ field: name, direction: ASC }])` sorts by translated category name for current locale.
- `where: { name: { _containsi: "shoe" } }` filters by translated category name.
- `orderBy: [{ field: parentName, direction: ASC }]` sorts root categories with `Root` parent label consistently.
- `where: { productsCount: { _gte: 1 } }` filters by denormalized product count.
- `where: { subcategoriesCount: { _gt: 0 } }` filters categories with direct children.
- `where: { isPublished: { _eq: true } }` matches published categories.
- Existing `meta.hierarchyScope` and `meta.productsScope` still work with the view-backed relay query.
- `totalCount` changes with the same filters as the paginated connection.

## Rollout order

1. Add `categoryListView` model and migration.
2. Switch `categoryRelayQuery` to view-backed query and keep repository-owned filters.
3. Regenerate generated category filters/order fields.
4. Regenerate GraphQL and Admin types.
5. Enable Admin sorting/filtering for `name`, `isPublished`, `productsCount`, `parentName`, `updatedAt`.
6. Add `subcategoriesCount` display field only if the grid needs to render it, not just sort/filter by it.

## Risks and decisions

- Locale-specific view rows can hide categories missing the current locale translation. Decide whether that is acceptable or add a translation backfill/fallback.
- Sorting by `parentName = 'Root'` is display-friendly but hardcodes an English label into SQL. If locale-sensitive root labels matter, use `parentName = NULL` for SQL and map root display in UI; add `parentSortName` if needed.
- Non-materialized view sorting/filtering by translated names may become slow on large catalogs. Start with the simple view; move to materialized view/read model only with measured need.
- `isPublished` uses `now()`, so results can change over time without row updates. This matches runtime resolver semantics.
