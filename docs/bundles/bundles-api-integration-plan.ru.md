# План интеграции Bundles API с UI-таблицей

## Задача

Подключить существующую таблицу на странице `admin/src/domains/promos/bundles/page/page.tsx` к GraphQL API `catalogQuery.bundles`.

Текущий UI уже есть: это `AgGridReact<ApiBundle>` на странице Bundles. Нужно убрать mock-источник из `useBundles` и передать в эту же таблицу данные API.

## Реальная таблица, которую интегрируем

Файл: `admin/src/domains/promos/bundles/page/page.tsx`

| Участок | Текущий код | Что должно стать |
| --- | --- | --- |
| Источник строк | `const { data: bundles } = useBundles();` | `useBundles(queryState)` должен читать `catalogQuery.bundles` через Apollo. |
| Счетчик layout | `count={bundles.length}` | `count={totalCount}` из `BundleConnection.totalCount`. |
| AG Grid rows | `rowData={bundles}` | `rowData={bundles}`, где `bundles = edges.map(edge => edge.node)`. |
| Колонки | `columnDefs`: `Bundle`, `Type`, `Status` | Колонки остаются теми же. Новые колонки не добавлять. |
| Pagination | `CursorPagination` с заглушками | Подключить `pageInfo`, `totalCount`, `pageSize`, `goNext`, `goPrev`, `changePageSize`. |
| Sort | `console.log("Sort changed:", model)` | Преобразовать sort model в `ApiBundleOrderByInput[]` и refetch первой страницы. |
| Row click | `push("bundle", { entityId: data.id, level: 1 })` | Оставить без изменений. |
| Selection | `FloatingPanelStack panels={panels}` | Оставить без изменений. |

Текущие реальные колонки:

| Колонка | `field` | Renderer | API поля |
| --- | --- | --- | --- |
| `Bundle` | `title` | `BundleCellRenderer` | `id`, `title`, `media.file.url` |
| `Type` | `type` | `BundleTypeCellRenderer` | `type` |
| `Status` | `isPublished` | `StatusCellRenderer` | `isPublished` |

## GraphQL для этой таблицы

Создать `admin/src/domains/promos/bundles/graphql/fragments.ts`:

```ts
import { gql } from "@apollo/client";

export const BUNDLE_LIST_ITEM_FIELDS = gql`
  fragment BundleListItemFields on Bundle {
    id
    title
    type
    isPublished
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
  ApiBundle,
  ApiBundleBundlesMetaInput,
  ApiBundleOrderByInput,
  ApiBundleWhereInput,
  ApiPageInfo,
} from "@/graphql/types";

export interface BundlesQueryData {
  catalogQuery: {
    bundles: {
      edges: Array<{
        cursor: string;
        node: ApiBundle;
      }>;
      pageInfo: ApiPageInfo;
      totalCount: number;
    };
  };
}

export interface BundlesQueryVariables {
  first?: number;
  after?: string | null;
  last?: number;
  before?: string | null;
  where?: ApiBundleWhereInput;
  orderBy?: ApiBundleOrderByInput[];
  meta?: ApiBundleBundlesMetaInput;
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

Удалить:

- `useState`;
- `useEffect`;
- `setTimeout`;
- `mockBundles`;
- option `delay`.

Сделать hook API-backed:

```ts
import { useMemo } from "react";
import { useQuery } from "@apollo/client";
import type { ApiBundle, ApiPageInfo } from "@/graphql/types";
import {
  BUNDLES_QUERY,
  type BundlesQueryData,
  type BundlesQueryVariables,
} from "../graphql";

interface UseBundlesReturn {
  items: ApiBundle[];
  totalCount: number;
  pageInfo: ApiPageInfo | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useBundles(variables: BundlesQueryVariables): UseBundlesReturn {
  const { data, loading, error, refetch } = useQuery<
    BundlesQueryData,
    BundlesQueryVariables
  >(BUNDLES_QUERY, {
    variables,
    notifyOnNetworkStatusChange: true,
  });

  const connection = data?.catalogQuery.bundles;

  const items = useMemo(
    () => connection?.edges.map((edge) => edge.node) ?? [],
    [connection?.edges],
  );

  return {
    items,
    totalCount: connection?.totalCount ?? 0,
    pageInfo: connection?.pageInfo ?? null,
    loading,
    error: error ?? null,
    refetch: async () => {
      await refetch();
    },
  };
}
```

## Query state в `page.tsx`

Добавить в `BundlesPage` состояние API-запроса:

```ts
const [pageSize, setPageSize] = useState(20);
const [cursor, setCursor] = useState<{
  direction: "next" | "prev" | null;
  after?: string | null;
  before?: string | null;
}>({ direction: null });
const [orderBy, setOrderBy] = useState<ApiBundleOrderByInput[]>([]);
```

Добавить helper:

```ts
const resetCursor = useCallback(() => {
  setCursor({ direction: null });
}, []);
```

Собрать variables:

```ts
const queryState = useMemo(
  () => ({
    first: cursor.direction === "prev" ? undefined : pageSize,
    after: cursor.direction === "next" ? cursor.after : undefined,
    last: cursor.direction === "prev" ? pageSize : undefined,
    before: cursor.direction === "prev" ? cursor.before : undefined,
    orderBy,
  }),
  [cursor, pageSize, orderBy],
);
```

Подключить hook:

```ts
const {
  items: bundles,
  totalCount,
  pageInfo,
  loading,
  error,
  refetch,
} = useBundles(queryState);
```

## Замены в JSX `page.tsx`

`DataLayout`:

```tsx
<DataLayout
  name="bundles"
  title="Bundles"
  count={totalCount}
  actions={...}
>
```

`AgGridReact`:

```tsx
<AgGridReact<ApiBundle>
  ref={gridRef}
  theme={agGridTheme}
  rowData={bundles}
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
  rowStyle={{ cursor: "pointer" }}
  initialState={initialState}
  onStateUpdated={onStateUpdated}
  onSortChanged={onSortChanged}
/>
```

`rowData` остается `bundles`, но это уже не mock data. Это alias для `items` из API hook.

`CursorPagination`:

```tsx
<CursorPagination
  total={totalCount}
  rangeStart={totalCount === 0 ? 0 : 1}
  rangeEnd={bundles.length}
  pageSize={pageSize}
  hasNext={pageInfo?.hasNextPage ?? false}
  hasPrev={pageInfo?.hasPreviousPage ?? false}
  onNext={goNext}
  onPrev={goPrev}
  onPageSizeChange={changePageSize}
/>
```

Добавить handlers:

```ts
const goNext = useCallback(() => {
  if (!pageInfo?.endCursor) return;
  setCursor({ direction: "next", after: pageInfo.endCursor });
}, [pageInfo?.endCursor]);

const goPrev = useCallback(() => {
  if (!pageInfo?.startCursor) return;
  setCursor({ direction: "prev", before: pageInfo.startCursor });
}, [pageInfo?.startCursor]);

const changePageSize = useCallback((nextPageSize: number) => {
  setPageSize(nextPageSize);
  setCursor({ direction: null });
}, []);
```

Если текущий `CursorPagination` требует другой тип аргументов для `onPageSizeChange`, использовать фактический prop type компонента.

## Сортировка реальной таблицы

Сейчас:

```ts
const { onSortChanged } = useGridSort({
  gridRef,
  onSortChange: (model) => {
    console.log("Sort changed:", model);
  },
});
```

Должно стать:

```ts
const { onSortChanged } = useGridSort({
  gridRef,
  onSortChange: (model) => {
    setOrderBy(mapBundleGridSortToOrderBy(model));
    resetCursor();
  },
});
```

Создать mapper `admin/src/domains/promos/bundles/mappers/bundle-list-query.mapper.ts`:

```ts
import type { SortModelItem } from "ag-grid-community";
import type { ApiBundleOrderByInput } from "@/graphql/types";

export function mapBundleGridSortToOrderBy(
  model: SortModelItem[],
): ApiBundleOrderByInput[] {
  return model.flatMap((item) => {
    const direction = item.sort === "desc" ? "DESC" : "ASC";

    switch (item.colId) {
      case "title":
        return [{ name: direction }];
      default:
        return [];
    }
  });
}
```

Перед реализацией проверить фактический generated тип `ApiBundleOrderByInput`. Если поле называется не `name`, использовать реальное поле из `admin/src/graphql/types.ts`.

Для колонок `type` и `isPublished`, если API не поддерживает сортировку по ним, выставить в `columnDefs` `sortable: false`, чтобы UI не показывал нерабочую сортировку.

## Фильтры и поиск

`FilterWidget` уже подключен в `page.tsx`, но текущий файл не передает filter state в `useBundles`.

Нужно:

1. Проверить фактический контракт `useFilters`.
2. Получить из него состояние фильтров, если оно доступно.
3. Создать mapper в `bundle-list-query.mapper.ts`, который возвращает `ApiBundleWhereInput`.
4. Добавить `where` в `queryState`.
5. При изменении `searchValue` или фильтров вызывать `resetCursor()`.

Для поиска по названию:

```ts
where: mapBundleFiltersToWhere({
  searchValue,
  filters,
})
```

Mapper должен использовать только реальные поля `ApiBundleWhereInput` из generated types. Не добавлять frontend-only поля.

## Loading, error, empty

Подключить состояния к той же таблице:

| Состояние hook | UI поведение |
| --- | --- |
| `loading` | Показать AG Grid loading overlay или loading state существующего layout-а. |
| `error` | Показать inline error над таблицей и кнопку `refetch`. |
| `bundles.length === 0 && !loading` | Показать empty state таблицы. |

Если текущая версия AG Grid поддерживает `loading`, передать prop. Если нет, управлять overlay через `gridRef.current?.api` в `useEffect`.

## Файлы, которые нужно изменить

| Файл | Изменение |
| --- | --- |
| `admin/src/domains/promos/bundles/graphql/fragments.ts` | Добавить fragment для текущих колонок таблицы. |
| `admin/src/domains/promos/bundles/graphql/queries.ts` | Добавить `BUNDLES_QUERY`. |
| `admin/src/domains/promos/bundles/graphql/operation-types.ts` | Добавить типы operation data/variables. |
| `admin/src/domains/promos/bundles/graphql/index.ts` | Экспортировать operations и operation types. |
| `admin/src/domains/promos/bundles/hooks/use-bundles.ts` | Заменить mock hook на Apollo `useQuery`. |
| `admin/src/domains/promos/bundles/mappers/bundle-list-query.mapper.ts` | Добавить mapper сортировки и фильтров. |
| `admin/src/domains/promos/bundles/mappers/index.ts` | Экспортировать mapper. |
| `admin/src/domains/promos/bundles/page/page.tsx` | Подключить API hook к существующей таблице, pagination, sort, loading/error. |

## Что не делать

- Не создавать новую таблицу.
- Не добавлять новые колонки сверх текущих `Bundle`, `Type`, `Status`.
- Не маппить `ApiBundle` в локальную view model.
- Не использовать `admin/src/mocks/products/bundles-list.ts` в API hook.
- Не запускать `test` и `tsc`.
- Не редактировать changeset.

## Проверка после реализации

Ручная проверка:

- открыть страницу Bundles;
- убедиться, что текущая AG Grid таблица заполняется из `catalogQuery.bundles`;
- проверить, что `BundleCellRenderer` показывает `title` и image из API;
- проверить, что `Type` и `Status` читаются из API;
- проверить next/prev в `CursorPagination`;
- проверить click по row: модалка открывается с `entityId = ApiBundle.id`;
- проверить empty/error/loading состояния.

Если нужна проверка сборкой, запускать build, не `test` и не `tsc`.

