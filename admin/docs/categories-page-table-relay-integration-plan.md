# План интеграции Categories Page с Relay pagination table

## Цель

Перевести `admin/src/domains/inventory/categories/page/page.tsx` с mock-only списка на Admin GraphQL API через `catalogQuery.categories`, сохранив паттерны проекта:

- module-local GraphQL layer: `graphql/fragments.ts`, `queries.ts`, `operation-types.ts`, `index.ts`;
- API-backed hook в `hooks/use-categories.ts`;
- компоненты страницы consume generated API shapes из `@/graphql/types` напрямую;
- таблица использует Relay cursor pagination, `totalCount` и `pageInfo`;
- mocks не импортируются в API-backed hook/page.

План выровнен с `knowledge/vault/patterns/admin-graphql-layer.md`, текущими warehouse/inventory page паттернами и generated Admin API types.

## Текущий baseline

- `admin/src/domains/inventory/categories/page/page.tsx` рендерит `AgGridReact<ICategoryListItem>`.
- `useCategories` симулирует задержку и возвращает `mockCategoriesList` из `@/mocks/products/categories-list`.
- `CursorPagination` на странице статический: `total={categories.length}`, `pageSize={30}`, `hasNext={false}`.
- create/delete сейчас только логируются.
- row click открывает `push("category", { level: 1 })`, без `entityId`.
- `filter-schema.ts` содержит mock/API-mismatched поля `status`, `name`, `productsCount`.

## Доступный API contract

Generated frontend types уже содержат:

- `ApiCategory`
- `ApiCategoryConnection`
- `ApiCategoryWhereInput`
- `ApiCategoryOrderByInput`
- `CategoryOrderField`
- `SortDirection`
- `ApiPageInfo`

`CatalogQuery.categories`:

```graphql
categories(
  first: Int
  after: String
  last: Int
  before: String
  where: CategoryWhereInput
  orderBy: [CategoryOrderByInput!]
): CategoryConnection!
```

Текущий `CategoryWhereInput` поддерживает `id`, `parentId`, `path`, `depth`, `handle`, `defaultSort`, `defaultSortDirection`, `publishedAt`, `createdAt`, `updatedAt`.

Текущий `CategoryOrderField` поддерживает `id`, `parentId`, `path`, `depth`, `handle`, `defaultSort`, `defaultSortDirection`, `publishedAt`, `createdAt`, `updatedAt`.

Важное ограничение: `CategoryWhereInput` и `CategoryOrderField` сейчас не содержат `name`, `isPublished`, `productsCount`. Поэтому первый API-backed вариант не должен притворяться, что search/filter/sort по этим полям серверные. Для них нужен отдельный backend/schema follow-up или временное отключение соответствующих UI controls.

## Target file structure

Добавить module-local GraphQL слой:

```text
admin/src/domains/inventory/categories/
  graphql/
    fragments.ts
    queries.ts
    operation-types.ts
    index.ts
  hooks/
    use-categories.ts
    index.ts
  page/
    filter-schema.ts
    page.tsx
```

Не реэкспортить generated API types из module barrels. В местах использования импортировать типы напрямую из `@/graphql/types`.

## GraphQL operations

### `graphql/fragments.ts`

```ts
import { gql } from "@apollo/client";

export const CATEGORY_LIST_FRAGMENT = gql`
  fragment CategoryListFields on Category {
    id
    name
    handle
    isPublished
    publishedAt
    productsCount
    depth
    path
    createdAt
    updatedAt
    media {
      sortIndex
      file {
        id
        url
        originalName
        mimeType
        altText
      }
    }
    parent {
      id
      name
      handle
    }
  }
`;
```

Notes:

- Keep the list fragment compact. Do not include `children`, `ancestors`, `description`, `seo`, or `products`.
- Use `media[0].file` only as a best-effort thumbnail on the page.
- API date/time scalars stay strings; format only at the display boundary.

### `graphql/queries.ts`

```ts
import { gql } from "@apollo/client";
import { CATEGORY_LIST_FRAGMENT } from "./fragments";

export const CATEGORIES_QUERY = gql`
  query Categories(
    $first: Int
    $after: String
    $last: Int
    $before: String
    $where: CategoryWhereInput
    $orderBy: [CategoryOrderByInput!]
  ) {
    catalogQuery {
      categories(
        first: $first
        after: $after
        last: $last
        before: $before
        where: $where
        orderBy: $orderBy
      ) {
        edges {
          cursor
          node {
            ...CategoryListFields
          }
        }
        pageInfo {
          hasNextPage
          hasPreviousPage
          startCursor
          endCursor
        }
        totalCount
      }
    }
  }
  ${CATEGORY_LIST_FRAGMENT}
`;
```

### `graphql/operation-types.ts`

```ts
import type {
  ApiCatalogQuery,
  ApiCategoryConnection,
  ApiCategoryOrderByInput,
  ApiCategoryWhereInput,
} from "@/graphql/types";

export interface CategoriesQueryData {
  catalogQuery: Pick<ApiCatalogQuery, "categories"> & {
    categories: ApiCategoryConnection;
  };
}

export interface CategoriesQueryVariables {
  first?: number;
  after?: string | null;
  last?: number;
  before?: string | null;
  where?: ApiCategoryWhereInput | null;
  orderBy?: ApiCategoryOrderByInput[] | null;
}
```

## Hook contract

Replace mock logic in `hooks/use-categories.ts` with Apollo `useQuery`.

```ts
export interface UseCategoriesOptions extends RelayCursorPaginationVariables {
  where?: ApiCategoryWhereInput | null;
  orderBy?: ApiCategoryOrderByInput[] | null;
  skip?: boolean;
}

interface UseCategoriesReturn {
  categories: ApiCategory[];
  connection: ApiCategoryConnection | null;
  totalCount: number;
  pageInfo: ApiPageInfo | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}
```

Implementation rules:

- Use `CATEGORIES_QUERY`.
- Use `fetchPolicy: "cache-and-network"`.
- Use `data ?? previousData` to avoid grid flicker during pagination.
- Return `connection?.edges.map((edge) => edge.node) ?? []`.
- Do not import from `@/mocks`.
- Keep output API-shaped: return `ApiCategory[]`, not `CategoryListItem` view models.

## Page integration

### Types and table data

- Replace `ICategoryListItem` with `ApiCategory`.
- `rowData={categories}`.
- `getRowId={(params) => params.data.id}`.
- `DataLayout.count={totalCount}`.
- Pass `loading` to `AgGridReact`.
- Render `Alert` for `error` like warehouse page.

### Pagination

Use the newer warehouse/inventory pattern:

- import `RelayCursorPagination` and `useRelayCursorPagination` from `@/ui-kit/cursor-pagination`;
- create `resetKey` from API-backed parameters such as `where` and `orderBy`;
- pass `...pagination.variables` into `useCategories`;
- render:

```tsx
<RelayCursorPagination
  name="categories"
  pagination={pagination}
  pageInfo={pageInfo}
  totalCount={totalCount}
  loadedRowsCount={categories.length}
/>
```

Do not keep the old static `CursorPagination` values.

### Columns

Initial API-backed columns:

- `Category`: thumbnail from sorted `category.media[0]?.file.url`, fallback `FolderOutlined`, and `category.name`.
- `Status`: derive from `category.isPublished` as `Published` / `Draft`.
- `Products`: `category.productsCount`.
- `Parent`: `category.parent?.name ?? "Root"`.
- `Updated`: formatted `category.updatedAt`.

Sorting must be server-side only for supported API fields:

```ts
const CATEGORY_SORT_FIELDS: Partial<Record<string, CategoryOrderField>> = {
  handle: CategoryOrderField.Handle,
  depth: CategoryOrderField.Depth,
  updatedAt: CategoryOrderField.UpdatedAt,
  createdAt: CategoryOrderField.CreatedAt,
  publishedAt: CategoryOrderField.PublishedAt,
};
```

Columns without API sort support must have `sortable: false` or no mapping:

- `name`
- `isPublished`
- `productsCount`
- `parent.name`

### Search and filters

First API-backed version should avoid unsupported server-backed controls.

Recommended initial behavior:

- Search by `handle` only, or label placeholder accordingly, because `name` is not in `CategoryWhereInput`.
- Replace/limit `filter-schema.ts` to fields backed by `CategoryWhereInput`, for example `handle`, `depth`, `publishedAt`, `createdAt`, `updatedAt`.
- For status, either defer the filter or map:
  - published: `publishedAt: { _isNot: true }`
  - draft: `publishedAt: { _is: true }`
  This only works if API semantics are "publishedAt null means draft"; verify before implementing.
- Do not expose products count filter until API adds `productsCount` to `CategoryWhereInput`.

If product owner requires `name/status/productsCount` filtering in this iteration, add a backend follow-up before frontend wiring:

- add generated filter support for `name`;
- decide whether `isPublished` should be filterable directly or derived from `publishedAt`;
- add filter/sort support for `productsCount` only if repository query can do it efficiently.

### Row actions

- On row click open the existing category modal with the real entity id:

```ts
onRowAction: (category) => push("category", { entityId: category.id })
```

- Keep create/delete out of scope unless the same task adds `categoryCreate` / `categoryDelete` hooks.
- If delete selection remains visible before mutation integration, disable it with tooltip or remove it from `selectionActions`.

## Implementation phases

### 1. Add category GraphQL module

- Create `categories/graphql/fragments.ts`.
- Create `categories/graphql/queries.ts`.
- Create `categories/graphql/operation-types.ts`.
- Create `categories/graphql/index.ts` barrel for operation documents and operation-local TS types only.

### 2. Replace `useCategories`

- Remove mock delay/state implementation.
- Add Apollo `useQuery`.
- Return `categories`, `connection`, `totalCount`, `pageInfo`, `loading`, `error`, `refetch`.
- Keep hook API consistent with warehouse/products hooks.

### 3. Wire page to API data

- Update imports and `AgGridReact<ApiCategory>`.
- Update cell renderers to read `ApiCategory` fields directly.
- Add loading/error states.
- Replace static count/pagination with `totalCount`, `pageInfo`, and `RelayCursorPagination`.
- Pass real `entityId` to category modal.

### 4. Add server-side sort mapping

- Add `sortModel` state.
- Add `mapCategorySortModelToOrderBy`.
- Use `useGridSort` controlled by `sortModel`.
- Disable or ignore unsupported sort columns.
- Reset pagination when `orderBy` changes.

### 5. Align search/filter controls

- Decide first-scope UX:
  - minimal: keep only handle/depth/date filters;
  - or backend follow-up for `name`, `isPublished`, `productsCount`.
- Ensure `where` only contains fields from `ApiCategoryWhereInput`.
- Reset Relay pagination on `where` changes.

## Verification

Project instruction says not to run tests or `tsc` for verification.

Recommended verification for the implementation PR:

- Run build only if a fresh compiled version is needed.
- Manually inspect the page in Admin:
  - table loads from `catalogQuery.categories`;
  - next/previous pagination uses cursors;
  - `DataLayout` count equals API `totalCount`;
  - row click opens category modal with `entityId`;
  - unsupported sort/filter controls are not shown as server-backed.

## Acceptance criteria

- `admin/src/domains/inventory/categories/hooks/use-categories.ts` no longer imports mocks.
- Categories page uses `ApiCategory[]` from `@/graphql/types`.
- `CATEGORIES_QUERY` uses Relay variables and requests `pageInfo` + `totalCount`.
- Pagination is driven by `RelayCursorPagination`.
- The page does not send unsupported `where` or `orderBy` fields.
- `name`, `isPublished`, and `productsCount` API gaps are either deferred in UI or covered by a backend/schema change before frontend use.
