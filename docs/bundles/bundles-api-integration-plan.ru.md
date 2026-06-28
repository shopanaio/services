# План интеграции Bundles UI-таблицы с GraphQL

## Цель

Подключить таблицу `BundlesPage` к реальному `catalogQuery.bundles` без копирования product-list логики.

Контекст Admin UI:

- Bundles table использует тот же list UX, что Products table;
- общие поля списка (`id`, `handle`, `publishedAt`, `createdAt`, `updatedAt`, `revision`, `vendor`, `media`, `options`, `features`, `primaryCategory`, `tags`, `title`, `description`, `excerpt`, `seo`) совпадают с product/listing contract;
- bundle-специфика для UI-таблицы — `type`;
- list filter/order contract почти совпадает с products и дополнительно содержит `bundleType`.

Поэтому Admin-интеграция должна вынести общий product-like/listing list config и использовать его в Products и Bundles.

## Текущее состояние

Уже есть:

- `ProductsPage` с правильным pattern:
  - `useInventoryRelayListPage`;
  - `usePageConfig`;
  - `FilterWidget {...pageConfig.filterWidgetProps}`;
  - `pageConfig.onSortChanged`;
  - cursor pagination;
  - `useRelayConnectionQuery`.
- `BundlesPage` с реальной таблицей, но mock hook и ручные filters/grid/sort/pagination.

Архитектурный риск, которого нужно избежать:

- отдельный `bundles/page/page-config.ts` может легко превратиться в копию product list config;
- bundle и product list filters/sort/search фактически общие, кроме `bundleType` и другого query;
- нужно вынести общий модуль, а bundle оставить тонкой настройкой.

## Admin frontend design

## 1. Общий module для product-like list pages

Создать общий frontend module:

`admin/src/domains/inventory/products/list-page/`

Почему здесь, а не в `promos/bundles`:

- shared filters/sort/search уже принадлежат product/listing list behavior;
- bundle page должна только добавить `bundleType` и свой query.

Файлы:

```text
admin/src/domains/inventory/products/list-page/
  filter-schema.ts
  page-config.ts
  index.ts
```

### `filter-schema.ts`

Вынести общие product-like фильтры из ProductsPage:

```ts
import {
  FilterType,
  priceOperators,
  relationOperators,
  stringOperators,
  dateOperators,
} from "@/layouts/filters";
import type { IFilterSchema } from "@/layouts/filters/core/types";

export const productLikeBaseFilterSchema: IFilterSchema[] = [
  {
    key: "primaryCategory",
    label: "Primary category",
    description: "Filter by primary category",
    type: FilterType.Relation,
    operators: relationOperators,
    payloadKey: "primaryCategoryId",
    entity: "category",
  },
  {
    key: "minPrice",
    label: "Min price",
    description: "Filter by minimum price",
    type: FilterType.Price,
    operators: priceOperators,
    payloadKey: "minPriceMinor",
  },
  {
    key: "maxPrice",
    label: "Max price",
    description: "Filter by maximum price",
    type: FilterType.Price,
    operators: priceOperators,
    payloadKey: "maxPriceMinor",
  },
  {
    key: "brand",
    label: "Brand",
    description: "Filter by brand/vendor",
    type: FilterType.Relation,
    operators: relationOperators,
    payloadKey: "vendorId",
    entity: "vendor",
  },
  {
    key: "name",
    label: "Name",
    description: "Filter by name",
    type: FilterType.String,
    operators: stringOperators,
    payloadKey: "name",
  },
  {
    key: "publishedAt",
    label: "Published at",
    description: "Filter by publication date",
    type: FilterType.DateRange,
    operators: dateOperators,
    payloadKey: "publishedAt",
  },
];
```

Не добавлять сюда `bundleType`: это bundle-specific filter.

### `page-config.ts`

Вынести shared builders и factories.

```ts
import {
  createMinorUnitPriceTransformer,
  createRelationInTransformer,
} from "@/hooks";
import type {
  FilterTransformer,
  OrderByInput,
  SortFieldMapping,
  UsePageConfigReturn,
} from "@/hooks";
import {
  createGraphqlDateTimeRangeFilterTransformer,
  createGraphqlStringFilterTransformer,
} from "@/layouts/filters";

type ProductLikeCommonOrderField =
  | "Name"
  | "MinPriceMinor"
  | "MaxPriceMinor"
  | "PrimaryCategoryName"
  | "BrandName"
  | "CreatedAt"
  | "UpdatedAt"
  | "PublishedAt";

export type ProductLikeOrderFieldEnum = Record<
  ProductLikeCommonOrderField,
  string
>;

export function createProductLikeSortFieldMapping<
  TOrderField extends string,
>(
  fields: ProductLikeOrderFieldEnum,
): SortFieldMapping<TOrderField> {
  return {
    title: fields.Name,
    minPriceMinor: fields.MinPriceMinor,
    maxPriceMinor: fields.MaxPriceMinor,
    primaryCategoryName: fields.PrimaryCategoryName,
    brand: fields.BrandName,
    createdAt: fields.CreatedAt,
    updatedAt: fields.UpdatedAt,
    publishedAt: fields.PublishedAt,
  } as SortFieldMapping<TOrderField>;
}

export function buildProductLikeSearchCondition<TWhereInput extends object>(
  search: string,
): Partial<TWhereInput> {
  return { name: { _containsi: search } } as Partial<TWhereInput>;
}

export function createProductLikeFilterTransformers<
  TWhereInput extends object,
>(): Record<string, FilterTransformer<TWhereInput>> {
  return {
    name: createGraphqlStringFilterTransformer<TWhereInput>("name"),
    primaryCategoryId:
      createRelationInTransformer<TWhereInput>("primaryCategoryId"),
    minPriceMinor:
      createMinorUnitPriceTransformer<TWhereInput>("minPriceMinor"),
    maxPriceMinor:
      createMinorUnitPriceTransformer<TWhereInput>("maxPriceMinor"),
    vendorId: createRelationInTransformer<TWhereInput>("vendorId"),
    publishedAt:
      createGraphqlDateTimeRangeFilterTransformer<TWhereInput>("publishedAt"),
  };
}

export function buildProductLikeQueryVariables<
  TVariables,
  TWhereInput extends object,
  TOrderField extends string,
  TOrderByInput,
>(
  pageConfig: Pick<
    UsePageConfigReturn<TWhereInput, TOrderField>,
    "first" | "after" | "last" | "before" | "where" | "orderBy"
  >,
): TVariables {
  return {
    first: pageConfig.first,
    after: pageConfig.after,
    last: pageConfig.last,
    before: pageConfig.before,
    where: pageConfig.where ?? null,
    orderBy: (pageConfig.orderBy ?? null) as TOrderByInput[] | null,
  } as TVariables;
}

export function toProductLikeQueryVariables<
  TVariables,
  TWhereInput extends object,
  TOrderField extends string,
  TOrderByInput,
>(
  pageConfig: Pick<
    UsePageConfigReturn<object, string>,
    "first" | "after" | "last" | "before" | "where" | "orderBy"
  >,
): TVariables {
  return buildProductLikeQueryVariables<
    TVariables,
    TWhereInput,
    TOrderField,
    TOrderByInput
  >({
    ...pageConfig,
    where: pageConfig.where as TWhereInput | undefined,
    orderBy: pageConfig.orderBy as
      | OrderByInput<TOrderField>[]
      | undefined,
  });
}
```

Цель helper-ов:

- не импортировать `productSortFieldMapping` в bundles;
- не смешивать `ApiProductWhereInput` и `ApiBundleWhereInput`;
- переиспользовать behavior через generic factories;
- оставить generated GraphQL types видимыми в конкретных page-config files.

### `index.ts`

```ts
export * from "./filter-schema";
export * from "./page-config";
```

## 2. Обновить ProductsPage config на общий module

Файл:

`admin/src/domains/inventory/products/page/filter-schema.ts`

Заменить локальное определение common filters на re-export:

```ts
export { productLikeBaseFilterSchema as filterSchema } from "../list-page";
```

Файл:

`admin/src/domains/inventory/products/page/page-config.ts`

Оставить product-specific binding generated types/enums:

```ts
import type {
  ApiProductOrderByInput,
  ApiProductWhereInput,
} from "@/graphql/types";
import { ProductOrderField } from "@/graphql/types";
import {
  buildProductLikeQueryVariables,
  buildProductLikeSearchCondition,
  createProductLikeFilterTransformers,
  createProductLikeSortFieldMapping,
  toProductLikeQueryVariables,
} from "../list-page";
import type { ProductsQueryVariables } from "../graphql/operation-types";

export const productSortFieldMapping =
  createProductLikeSortFieldMapping<ProductOrderField>(ProductOrderField);

export const buildProductSearchCondition =
  buildProductLikeSearchCondition<ApiProductWhereInput>;

export const productFilterTransformers =
  createProductLikeFilterTransformers<ApiProductWhereInput>();

export function buildProductsQueryVariables(...): ProductsQueryVariables {
  return buildProductLikeQueryVariables<
    ProductsQueryVariables,
    ApiProductWhereInput,
    ProductOrderField,
    ApiProductOrderByInput
  >(pageConfig);
}

export function toProductsQueryVariables(...): ProductsQueryVariables {
  return toProductLikeQueryVariables<
    ProductsQueryVariables,
    ApiProductWhereInput,
    ProductOrderField,
    ApiProductOrderByInput
  >(pageConfig);
}
```

Products behavior should not change.

## 3. Admin GraphQL operations for Bundles

Создать:

```text
admin/src/domains/promos/bundles/graphql/
  fragments.ts
  queries.ts
  operation-types.ts
  index.ts
```

### `fragments.ts`

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

### `queries.ts`

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

### `operation-types.ts`

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

### `index.ts`

```ts
export * from "./fragments";
export * from "./queries";
export type * from "./operation-types";
```

## 4. GraphQL hook `useBundles`

Файл:

`admin/src/domains/promos/bundles/hooks/use-bundles.ts`

Удалить mock implementation:

- `useState`;
- `useEffect`;
- `setTimeout`;
- `mockBundles`;
- `delay`;
- return shape `{ data, isLoading }`.

Сделать Relay hook:

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

## 5. Bundle page config как тонкая настройка

Файл:

`admin/src/domains/promos/bundles/page/filter-schema.ts`

Собрать schema из common filters + bundle-specific filter:

```ts
import { FilterType, enumOperators } from "@/layouts/filters";
import type { IFilterSchema } from "@/layouts/filters/core/types";
import { BundleType } from "@/graphql/types";
import { productLikeBaseFilterSchema } from "@/domains/inventory/products/list-page";

export const filterSchema: IFilterSchema[] = [
  ...productLikeBaseFilterSchema,
  {
    key: "bundleType",
    label: "Bundle Type",
    description: "Filter by bundle type",
    type: FilterType.Enum,
    operators: enumOperators,
    payloadKey: "bundleType",
    options: [
      { label: "Fixed Kit", value: BundleType.Fixed },
      { label: "Multipack", value: BundleType.Multipack },
      { label: "Mix & Match", value: BundleType.MixAndMatch },
      { label: "Custom", value: BundleType.Custom },
    ],
  },
];
```

Не добавлять отдельный `status` filter, если общий `publishedAt` уже есть. Если нужен именно status UX (`Published/Draft`), его надо добавлять как отдельный shared status transformer, но не смешивать с date range `publishedAt`.

Файл:

`admin/src/domains/promos/bundles/page/page-config.ts`

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
import {
  buildProductLikeQueryVariables,
  buildProductLikeSearchCondition,
  createProductLikeFilterTransformers,
  createProductLikeSortFieldMapping,
  toProductLikeQueryVariables,
} from "@/domains/inventory/products/list-page";
import type { BundlesQueryVariables } from "../graphql";

export const bundleSortFieldMapping: SortFieldMapping<BundleOrderField> = {
  ...createProductLikeSortFieldMapping<BundleOrderField>(BundleOrderField),
  // UI field is ApiBundle.type, list view/order field is bundleType.
  type: BundleOrderField.BundleType,
};

export const buildBundleSearchCondition =
  buildProductLikeSearchCondition<ApiBundleWhereInput>;

export const bundleFilterTransformers: Record<
  string,
  FilterTransformer<ApiBundleWhereInput>
> = {
  ...createProductLikeFilterTransformers<ApiBundleWhereInput>(),
};

export function buildBundlesQueryVariables(
  pageConfig: Pick<
    UsePageConfigReturn<ApiBundleWhereInput, BundleOrderField>,
    "first" | "after" | "last" | "before" | "where" | "orderBy"
  >,
): BundlesQueryVariables {
  return buildProductLikeQueryVariables<
    BundlesQueryVariables,
    ApiBundleWhereInput,
    BundleOrderField,
    ApiBundleOrderByInput
  >(pageConfig);
}

export function toBundlesQueryVariables(
  pageConfig: Pick<
    UsePageConfigReturn<object, string>,
    "first" | "after" | "last" | "before" | "where" | "orderBy"
  >,
): BundlesQueryVariables {
  return toProductLikeQueryVariables<
    BundlesQueryVariables,
    ApiBundleWhereInput,
    BundleOrderField,
    ApiBundleOrderByInput
  >(pageConfig);
}
```

Почему `bundleType` transformer не нужен:

- filter uses `enumOperators`;
- `usePageConfig` handles `FilterOperator.In` with arrays;
- `ApiBundleWhereInput.bundleType` is `StringFilter`, so `{ bundleType: { _in: [...] } }` matches generated input.

## 6. Интеграция в `BundlesPage`

Файл:

`admin/src/domains/promos/bundles/page/page.tsx`

Удалить ручное состояние:

- `searchValue`;
- `useFilters`;
- mock `const { data: bundles } = useBundles()`;
- `useGridState`;
- `useGridSort`.

Импорты:

```ts
import { Alert, Typography, Flex, Button, Tag } from "antd";
import { FilterWidget } from "@/layouts/filters";
import {
  useAgGridTheme,
  useAgGridRowSelection,
} from "@/hooks";
import { useInventoryRelayListPage } from "@/domains/inventory/hooks";
import {
  buildBundleSearchCondition,
  buildBundlesQueryVariables,
  bundleFilterTransformers,
  bundleSortFieldMapping,
} from "./page-config";
import type { ApiBundle, ApiBundleWhereInput } from "@/graphql/types";
import { BundleOrderField, BundleType } from "@/graphql/types";
```

Page hook:

```ts
const {
  pageConfig,
  items: bundles,
  totalCount,
  pageInfo,
  loading,
  error,
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

Не деструктурировать `refetch`, если он не используется.

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

Error/loading:

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

## 7. Колонки BundlesPage

Текущие колонки оставить, но включить server sort только для реально сматченных полей.

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

Сортировка:

| UI column field | GraphQL order field |
| --- | --- |
| `title` | `BundleOrderField.Name` |
| `type` | `BundleOrderField.BundleType` |

`Status` не сортировать:

- UI показывает boolean `isPublished`;
- GraphQL order field — `publishedAt`;
- это не тот же UX, что сортировка boolean Published/Draft.

## 8. Файлы

| Файл | Изменение |
| --- | --- |
| `admin/src/domains/inventory/products/list-page/filter-schema.ts` | Общие product-like filters. |
| `admin/src/domains/inventory/products/list-page/page-config.ts` | Общие factories/builders. |
| `admin/src/domains/inventory/products/list-page/index.ts` | Barrel. |
| `admin/src/domains/inventory/products/page/filter-schema.ts` | Re-export common schema. |
| `admin/src/domains/inventory/products/page/page-config.ts` | Перейти на common factories. |
| `admin/src/domains/promos/bundles/graphql/fragments.ts` | Bundle list fragment. |
| `admin/src/domains/promos/bundles/graphql/queries.ts` | `BUNDLES_QUERY`. |
| `admin/src/domains/promos/bundles/graphql/operation-types.ts` | Operation data/variables. |
| `admin/src/domains/promos/bundles/graphql/index.ts` | Export operations/types. |
| `admin/src/domains/promos/bundles/hooks/use-bundles.ts` | GraphQL-backed Relay hook. |
| `admin/src/domains/promos/bundles/page/filter-schema.ts` | Common filters + `bundleType`. |
| `admin/src/domains/promos/bundles/page/page-config.ts` | Thin bundle-specific config. |
| `admin/src/domains/promos/bundles/page/page.tsx` | Интеграция через `useInventoryRelayListPage`. |

## 9. Что не делать

- Не создавать независимую копию product page config внутри bundles.
- Не импортировать `productSortFieldMapping` напрямую в bundles.
- Не типизировать bundle filters через `ApiProductWhereInput`.
- Не добавлять local view model для `ApiBundle`.
- Не unwrap Relay connection вручную через `useQuery`; использовать `useRelayConnectionQuery`.
- Не использовать `admin/src/mocks/products/bundles-list.ts` в GraphQL hook.
- Не писать ручной pagination/sort/filter state вместо `useInventoryRelayListPage`.
- Не запускать `test` и `tsc`.
- Не редактировать changeset.

## 10. Проверка

Admin GraphQL/manual:

- `where.name` работает для bundles;
- `where.bundleType` работает для bundles;
- `orderBy.name` работает для bundles;
- `orderBy.bundleType` работает для bundles;
- pagination по `first/after/last/before` работает;
- `meta.categoriesScope` работает для bundles, если UI начнет его передавать.

Admin manual:

- Products page не изменила поведение после перехода на common module;
- Bundles table показывает rows из `catalogQuery.bundles`;
- search отправляет `where.name`;
- common filters отправляют те же поля, что Products page:
  - `primaryCategoryId`;
  - `minPriceMinor`;
  - `maxPriceMinor`;
  - `vendorId`;
  - `publishedAt`;
- Bundle Type filter отправляет `where.bundleType`;
- sort Bundle отправляет `BundleOrderField.Name`;
- sort Type отправляет `BundleOrderField.BundleType`;
- Status column не показывает server sort;
- pagination использует `pageConfig` и `pageInfo`;
- row click открывает bundle modal с `ApiBundle.id`.

Если нужна проверка сборкой, запускать build, не `test` и не `tsc`.
