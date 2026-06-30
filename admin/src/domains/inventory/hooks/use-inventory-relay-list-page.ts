"use client";

import { useCallback, useMemo, type RefObject } from "react";
import type { AgGridReact } from "ag-grid-react";
import type { ApiPageInfo } from "@/graphql/types";
import { usePageConfig } from "@/hooks";
import type {
  FilterTransformer,
  SortFieldMapping,
  UsePageConfigReturn,
} from "@/hooks";
import type { IFilterSchema } from "@/layouts/filters/core/types";
import type { RelayCursorPaginationVariables } from "@/ui-kit/cursor-pagination";

type ListPageConfigInput<
  TWhereInput extends object,
  TOrderField extends string,
> = Pick<
  UsePageConfigReturn<TWhereInput, TOrderField>,
  "first" | "after" | "last" | "before" | "where" | "orderBy"
>;

export interface InventoryRelayListQueryResult {
  totalCount: number;
  pageInfo: ApiPageInfo | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}

export interface UseInventoryRelayListPageOptions<
  TData,
  TWhereInput extends object,
  TOrderField extends string,
  TQueryVariables extends RelayCursorPaginationVariables,
  TListResult extends InventoryRelayListQueryResult,
> {
  gridRef: RefObject<AgGridReact<TData> | null>;
  storageKey: string;
  filterSchema: IFilterSchema[];
  sortFieldMapping: SortFieldMapping<TOrderField>;
  defaultPageSize?: number;
  pageSizeOptions?: number[];
  buildSearchCondition?: (search: string) => Partial<TWhereInput>;
  filterTransformers?: Record<string, FilterTransformer<TWhereInput>>;
  buildQueryVariables: (
    pageConfig: ListPageConfigInput<TWhereInput, TOrderField>,
  ) => TQueryVariables;
  useListQuery: (variables: TQueryVariables) => TListResult;
  getItems: (result: TListResult) => TData[];
}

export interface UseInventoryRelayListPageReturn<
  TData,
  TWhereInput extends object,
  TOrderField extends string,
  TQueryVariables extends RelayCursorPaginationVariables,
  TListResult extends InventoryRelayListQueryResult,
> {
  pageConfig: UsePageConfigReturn<TWhereInput, TOrderField>;
  listQueryVariables: TQueryVariables;
  listResult: TListResult;
  items: TData[];
  totalCount: number;
  pageInfo: ApiPageInfo | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
  handleNextPage: () => void;
  handlePrevPage: () => void;
}

export function useInventoryRelayListPage<
  TData,
  TWhereInput extends object,
  TOrderField extends string,
  TQueryVariables extends RelayCursorPaginationVariables,
  TListResult extends InventoryRelayListQueryResult,
>({
  gridRef,
  storageKey,
  filterSchema,
  sortFieldMapping,
  defaultPageSize = 20,
  pageSizeOptions,
  buildSearchCondition,
  filterTransformers,
  buildQueryVariables,
  useListQuery,
  getItems,
}: UseInventoryRelayListPageOptions<
  TData,
  TWhereInput,
  TOrderField,
  TQueryVariables,
  TListResult
>): UseInventoryRelayListPageReturn<
  TData,
  TWhereInput,
  TOrderField,
  TQueryVariables,
  TListResult
> {
  const pageConfig = usePageConfig<TData, TWhereInput, TOrderField>({
    gridRef,
    storageKey,
    filterSchema,
    sortFieldMapping,
    defaultPageSize,
    pageSizeOptions,
    buildSearchCondition,
    filterTransformers,
  });

  const listQueryVariables = useMemo<TQueryVariables>(
    () => buildQueryVariables(pageConfig),
    [
      buildQueryVariables,
      pageConfig.first,
      pageConfig.after,
      pageConfig.last,
      pageConfig.before,
      pageConfig.where,
      pageConfig.orderBy,
    ],
  );

  const listResult = useListQuery(listQueryVariables);
  const items = getItems(listResult);
  const { pageInfo } = listResult;
  const { goToNextPage, goToPrevPage } = pageConfig;

  const handleNextPage = useCallback(() => {
    if (pageInfo?.endCursor) {
      goToNextPage(pageInfo.endCursor);
    }
  }, [goToNextPage, pageInfo?.endCursor]);

  const handlePrevPage = useCallback(() => {
    if (pageInfo?.startCursor) {
      goToPrevPage(pageInfo.startCursor);
    }
  }, [goToPrevPage, pageInfo?.startCursor]);

  return {
    pageConfig,
    listQueryVariables,
    listResult,
    items,
    totalCount: listResult.totalCount,
    pageInfo,
    loading: listResult.loading,
    error: listResult.error,
    refetch: listResult.refetch,
    handleNextPage,
    handlePrevPage,
  };
}
