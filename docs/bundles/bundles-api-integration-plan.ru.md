# План интеграции Bundles API с UI-таблицей

## Цель

Подключить существующую таблицу `BundlesPage` к `catalogQuery.bundles` по тому же паттерну, который уже используется на странице продуктов:

- `useInventoryRelayListPage`;
- `usePageConfig`;
- `FilterWidget {...pageConfig.filterWidgetProps}`;
- сортировка через `pageConfig.onSortChanged`;
- pagination через `pageConfig`;
- query variables через отдельный `page-config.ts`.

Файл UI-таблицы: `admin/src/domains/promos/bundles/page/page.tsx`.

## Текущая UI-таблица

В `page.tsx` уже есть реальная таблица:

| UI | Сейчас | Нужно |
| --- | --- | --- |
| Hook данных | `const { data: bundles } = useBundles();` | Использовать `useInventoryRelayListPage(...)`, как в `ProductsPage`. |
| Фильтры | `useFilters({ schema: filterSchema })` и ручной `FilterWidget` | Убрать ручной `useFilters`; использовать `pageConfig.filterWidgetProps`. |
| Сортировка | `useGridSort` + `console.log` | Убрать ручной `useGridSort`; использовать `pageConfig.onSortChanged`. |
| Grid state | `useGridState` вручную | Убрать ручной `useGridState`; использовать `pageConfig.gridStateProps`. |
| Rows | `rowData={bundles}` | `rowData={bundles}` из API result. |
| Count | `count={bundles.length}` | `count={totalCount}`. |
| Pagination | Заглушки `hasNext={false}`, `onNext={() => {}}` | Использовать `handleNextPage`, `handlePrevPage`, `pageConfig.setPageSize`. |

Колонки остаются текущими:

| Колонка | `field` | Renderer | API поля |
| --- | --- | --- | --- |
| `Bundle` | `title` | `BundleCellRenderer` | `id`, `title`, `media.file.url` |
| `Type` | `type` | `BundleTypeCellRenderer` | `type` |
| `Status` | `isPublished` | `StatusCellRenderer` | `isPublished` |

План должен следовать Admin GraphQL layer conventions:

- GraphQL operations живут в module-specific `graphql/` папке;
- operation types строятся от generated schema types из `@/graphql/types`;
- list hook разворачивает Relay connection в `ApiBundle[]`, `totalCount`, `pageInfo`;
- для Relay list hooks использовать общий `useRelayConnectionQuery`, как в `useProducts`;
- UI потребляет generated `ApiBundle` напрямую, без локальной view model.

## GraphQL operations

Создать `admin/src/domains/promos/bundles/graphql/fragments.ts`:

```ts
import { gql } from "@apollo/client";

export const BUNDLE_LIST_ITEM_FIELDS = gql`
  fragment BundleListItemFields on Bundle {
    id
    title
    handle
    type
    isPublished
    publishedAt
    createdAt
    updatedAt
    revision
    media {
      file {
        id
        url
      }
    }
  }
`;
```

Создать `admin/src/domains/promos/bundles/graphql/queries.ts`:

```ts
import { gql } from "@apollo/client";
import { BUNDLE_LIST_ITEM_FIELDS } from "./fragments";

export const BUNDLES_QUERY = gql`
  ${BUNDLE_LIST_ITEM_FIELDS}

  query Bundles(
    $first: Int
    $after: String
    $last: Int
    $before: String
    $where: BundleWhereInput
    $orderBy: [BundleOrderByInput!]
    $meta: BundleBundlesMetaInput
  ) {
    catalogQuery {
      bundles(
        first: $first
        after: $after
        last: $last
        before: $before
        where: $where
        orderBy: $orderBy
        meta: $meta
      ) {
        edges {
          cursor
          node {
            ...BundleListItemFields
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
`;
```

Создать `admin/src/domains/promos/bundles/graphql/operation-types.ts`:

```ts
import type {
  ApiBundleConnection,
  ApiBundleBundlesMetaInput,
  ApiBundleOrderByInput,
  ApiBundleWhereInput,
  ApiCatalogQuery,
} from "@/graphql/types";

export interface BundlesQueryData {
  catalogQuery: Pick<ApiCatalogQuery, "bundles"> & {
    bundles: ApiBundleConnection;
  };
}

export interface BundlesQueryVariables {
  first?: number;
  after?: string | null;
  last?: number;
  before?: string | null;
  where?: ApiBundleWhereInput | null;
  orderBy?: ApiBundleOrderByInput[] | null;
  meta?: ApiBundleBundlesMetaInput | null;
}
```

Создать `admin/src/domains/promos/bundles/graphql/index.ts`:

```ts
export * from "./fragments";
export * from "./queries";
export type * from "./operation-types";
```

## Hook `useBundles`

Файл: `admin/src/domains/promos/bundles/hooks/use-bundles.ts`

Удалить mock implementation:

- `useState`;
- `useEffect`;
- `setTimeout`;
- `mockBundles`;
- `delay`.

Сделать API hook по тому же Relay connection паттерну, что и `admin/src/domains/inventory/products/hooks/use-products.ts`:

```ts
import type {
  ApiBundle,
  ApiBundleConnection,
  ApiBundleBundlesMetaInput,
  ApiBundleOrderByInput,
  ApiBundleWhereInput,
  ApiPageInfo,
} from "@/graphql/types";
import { useRelayConnectionQuery } from "@/graphql/hooks/use-relay-connection-query";
import type { RelayCursorPaginationVariables } from "@/ui-kit/cursor-pagination";
import { BUNDLES_QUERY } from "../graphql";
import type { BundlesQueryData, BundlesQueryVariables } from "../graphql";

export interface UseBundlesOptions extends RelayCursorPaginationVariables {
  where?: ApiBundleWhereInput | null;
  orderBy?: ApiBundleOrderByInput[] | null;
  meta?: ApiBundleBundlesMetaInput | null;
  skip?: boolean;
}

export interface UseBundlesReturn {
  bundles: ApiBundle[];
  connection: ApiBundleConnection | null;
  totalCount: number;
  pageInfo: ApiPageInfo | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}

export function useBundles(options: UseBundlesOptions = {}): UseBundlesReturn {
  const {
    first,
    after = null,
    last,
    before = null,
    where = null,
    orderBy = null,
    meta = null,
    skip = false,
  } = options;

  const result = useRelayConnectionQuery<
    BundlesQueryData,
    BundlesQueryVariables,
    ApiBundle,
    ApiBundleConnection
  >({
    query: BUNDLES_QUERY,
    variables: { first, after, last, before, where, orderBy, meta },
    skip,
    fetchPolicy: "cache-and-network",
    getConnection: (data) => data?.catalogQuery.bundles,
  });

  return {
    bundles: result.nodes,
    connection: result.connection,
    totalCount: result.totalCount,
    pageInfo: result.pageInfo,
    loading: result.loading,
    error: result.error,
    refetch: result.refetch,
  };
}
```

## `page-config.ts` для Bundles

Создать `admin/src/domains/promos/bundles/page/page-config.ts`.

Это обязательный файл интеграции, как `admin/src/domains/inventory/products/page/page-config.ts`.

```ts
import type {
  FilterTransformer,
  OrderByInput,
  SortFieldMapping,
  UsePageConfigReturn,
} from "@/hooks";
import type {
  ApiBundleOrderByInput,
  ApiBundleWhereInput,
} from "@/graphql/types";
import { BundleOrderField } from "@/graphql/types";
import type { BundlesQueryVariables } from "../graphql";

export const bundleSortFieldMapping: SortFieldMapping<BundleOrderField> = {
  title: BundleOrderField.Name,
  type: BundleOrderField.BundleType,
};

export const buildBundleSearchCondition = (
  search: string,
): Partial<ApiBundleWhereInput> => ({
  name: { _containsi: search },
});

export const bundleFilterTransformers: Record<
  string,
  FilterTransformer<ApiBundleWhereInput>
> = {
  status: (filter) => {
    if (filter.value === "published") {
      return { publishedAt: { _isNot: null } };
    }

    if (filter.value === "draft") {
      return { publishedAt: { _is: null } };
    }

    return null;
  },
};

export function buildBundlesQueryVariables(
  pageConfig: Pick<
    UsePageConfigReturn<ApiBundleWhereInput, BundleOrderField>,
    "first" | "after" | "last" | "before" | "where" | "orderBy"
  >,
): BundlesQueryVariables {
  return {
    first: pageConfig.first,
    after: pageConfig.after,
    last: pageConfig.last,
    before: pageConfig.before,
    where: pageConfig.where ?? null,
    orderBy: (pageConfig.orderBy ?? null) as ApiBundleOrderByInput[] | null,
  };
}

export function toBundlesQueryVariables(
  pageConfig: Pick<
    UsePageConfigReturn<object, string>,
    "first" | "after" | "last" | "before" | "where" | "orderBy"
  >,
): BundlesQueryVariables {
  return buildBundlesQueryVariables({
    ...pageConfig,
    where: pageConfig.where as ApiBundleWhereInput | undefined,
    orderBy: pageConfig.orderBy as
      | OrderByInput<BundleOrderField>[]
      | undefined,
  });
}
```

### Фильтр `bundleType`

`admin/src/domains/promos/bundles/page/filter-schema.ts` уже содержит:

```ts
{
  key: "bundleType",
  label: "Bundle Type",
  type: FilterType.Enum,
  operators: enumOperators,
  payloadKey: "bundleType",
  options: [
    { label: "Fixed Kit", value: BundleType.Fixed },
    { label: "Multipack", value: BundleType.Multipack },
    { label: "Mix & Match", value: BundleType.MixAndMatch },
    { label: "Custom", value: BundleType.Custom },
  ],
}
```

План интеграции должен сохранить этот фильтр и провести его через `usePageConfig` в `ApiBundleWhereInput.bundleType`.

Отдельный transformer для `bundleType` не нужен: `payloadKey: "bundleType"` и стандартная логика `usePageConfig` уже формируют `where.bundleType` с выбранным оператором.

### Сортировка `bundleType`

Для текущей колонки:

```ts
{
  headerName: "Type",
  field: "type",
  cellRenderer: BundleTypeCellRenderer,
  minWidth: 140,
}
```

должна работать серверная сортировка через:

```ts
type: BundleOrderField.BundleType
```

в `bundleSortFieldMapping`.

## Интеграция в `BundlesPage`

В `admin/src/domains/promos/bundles/page/page.tsx` заменить ручные page hooks:

Удалить:

```ts
import { useFilters, FilterWidget } from "@/layouts/filters";
import {
  useGridState,
  useGridSort,
  useAgGridTheme,
  useAgGridRowSelection,
} from "@/hooks";
```

Оставить `FilterWidget`, но убрать `useFilters`:

```ts
import { FilterWidget } from "@/layouts/filters";
import {
  useAgGridTheme,
  useAgGridRowSelection,
} from "@/hooks";
import { useInventoryRelayListPage } from "@/domains/inventory/hooks";
```

Добавить imports:

```ts
import {
  buildBundleSearchCondition,
  buildBundlesQueryVariables,
  bundleFilterTransformers,
  bundleSortFieldMapping,
} from "./page-config";
import type { ApiBundle, ApiBundleWhereInput } from "@/graphql/types";
import { BundleOrderField, BundleType } from "@/graphql/types";
```

Внутри `BundlesPage` удалить:

```ts
const [searchValue, setSearchValue] = useState("");
const { widgetProps } = useFilters({ schema: filterSchema });
const { data: bundles } = useBundles();
const { initialState, onStateUpdated } = useGridState(...);
const { onSortChanged } = useGridSort(...);
```

Добавить:

```ts
const {
  pageConfig,
  items: bundles,
  totalCount,
  pageInfo,
  loading,
  error,
  refetch,
  handleNextPage,
  handlePrevPage,
} = useInventoryRelayListPage<
  ApiBundle,
  ApiBundleWhereInput,
  BundleOrderField,
  ReturnType<typeof buildBundlesQueryVariables>,
  ReturnType<typeof useBundles>
>({
  gridRef,
  storageKey: "bundles-grid-state",
  filterSchema,
  sortFieldMapping: bundleSortFieldMapping,
  defaultPageSize: 20,
  buildSearchCondition: buildBundleSearchCondition,
  filterTransformers: bundleFilterTransformers,
  buildQueryVariables: buildBundlesQueryVariables,
  useListQuery: useBundles,
  getItems: (result) => result.bundles,
});
```

`DataLayout`:

```tsx
<DataLayout
  name="bundles"
  title="Bundles"
  count={totalCount}
  actions={...}
>
```

`FilterWidget`:

```tsx
<FilterWidget
  {...pageConfig.filterWidgetProps}
  searchPlaceholder="Search bundles..."
/>
```

`AgGridReact`:

```tsx
<AgGridReact<ApiBundle>
  ref={gridRef}
  theme={agGridTheme}
  rowData={bundles}
  loading={loading}
  columnDefs={columnDefs}
  defaultColDef={defaultColDef}
  getRowId={(params) => params.data.id}
  rowHeight={52}
  rowSelection={rowSelection}
  selectionColumnDef={selectionColumnDef}
  suppressCellFocus
  suppressMovableColumns
  onCellClicked={onCellClicked}
  onSelectionChanged={handleSelectionChanged}
  onSortChanged={pageConfig.onSortChanged}
  rowStyle={{ cursor: "pointer" }}
  initialState={pageConfig.gridStateProps.initialState}
  onStateUpdated={pageConfig.gridStateProps.onStateUpdated}
/>
```

`CursorPagination`:

```tsx
<CursorPagination
  name="bundles"
  total={totalCount}
  rangeStart={pageConfig.getRangeStart(bundles.length)}
  rangeEnd={Math.min(pageConfig.getRangeEnd(bundles.length), totalCount)}
  pageSize={pageConfig.pageSize}
  pageSizeOptions={pageConfig.pageSizeOptions}
  hasNext={pageInfo?.hasNextPage ?? false}
  hasPrev={pageInfo?.hasPreviousPage ?? false}
  onNext={handleNextPage}
  onPrev={handlePrevPage}
  onPageSizeChange={pageConfig.setPageSize}
/>
```

## Колонки и сортировка

Оставить текущие `columnDefs`, но проверить sortable behavior:

```ts
const columnDefs = useMemo<ColDef<ApiBundle>[]>(
  () => [
    {
      headerName: "Bundle",
      field: "title",
      cellRenderer: BundleCellRenderer,
      minWidth: 280,
    },
    {
      headerName: "Type",
      field: "type",
      cellRenderer: BundleTypeCellRenderer,
      minWidth: 140,
    },
    {
      headerName: "Status",
      field: "isPublished",
      cellRenderer: StatusCellRenderer,
      minWidth: 120,
      resizable: false,
      sortable: false,
    },
  ],
  [],
);
```

Почему `Status` `sortable: false`: UI-колонка показывает boolean `isPublished`, а серверная сортировка доступна по `publishedAt`. Это не прямой эквивалент сортировки boolean-статуса, поэтому колонка не должна показывать серверную сортировку до отдельного решения UX/API.

Сортируемые поля:

| Column `field` | API order field |
| --- | --- |
| `title` | `BundleOrderField.Name` |
| `type` | `BundleOrderField.BundleType` |

## Error/loading

Как на Products page, добавить `Alert` перед таблицей:

```tsx
{error && (
  <Alert
    type="error"
    message={error.message}
    showIcon
    style={{ marginBottom: 12 }}
  />
)}
```

И передать loading в grid:

```tsx
loading={loading}
```

## Файлы

| Файл | Изменение |
| --- | --- |
| `admin/src/domains/promos/bundles/graphql/fragments.ts` | Fragment для строк текущей таблицы. |
| `admin/src/domains/promos/bundles/graphql/queries.ts` | `BUNDLES_QUERY`. |
| `admin/src/domains/promos/bundles/graphql/operation-types.ts` | Operation data/variables. |
| `admin/src/domains/promos/bundles/graphql/index.ts` | Экспорт operations/types. |
| `admin/src/domains/promos/bundles/hooks/use-bundles.ts` | API-backed Relay connection hook через `useRelayConnectionQuery`. |
| `admin/src/domains/promos/bundles/page/page-config.ts` | Search, filters, sort mapping, query variables. |
| `admin/src/domains/promos/bundles/page/page.tsx` | Интеграция через `useInventoryRelayListPage`. |

## Что не делать

- Не создавать новую таблицу.
- Не добавлять новые колонки.
- Не писать ручной pagination state вместо `usePageConfig`.
- Не писать ручной `useGridSort` вместо `pageConfig.onSortChanged`.
- Не писать ручной `useFilters` вместо `pageConfig.filterWidgetProps`.
- Не писать ручной unwrap Relay connection через `useQuery`; использовать `useRelayConnectionQuery`.
- Не маппить `ApiBundle` в локальную view model.
- Не использовать `admin/src/mocks/products/bundles-list.ts` в API hook.
- Не запускать `test` и `tsc`.
- Не редактировать changeset.

## Проверка

Ручная проверка:

- таблица Bundles показывает rows из `catalogQuery.bundles`;
- search работает по `name`;
- фильтр `Bundle Type` отправляет `where.bundleType`;
- фильтр `Status` отправляет условие по `publishedAt`;
- сортировка `Bundle` отправляет `BundleOrderField.Name`;
- сортировка `Type` отправляет `BundleOrderField.BundleType`;
- `Status` не показывает нерабочую серверную сортировку;
- pagination использует `pageConfig` и `pageInfo`;
- row click открывает bundle modal с `ApiBundle.id`.

Если нужна проверка сборкой, запускать build, не `test` и не `tsc`.
