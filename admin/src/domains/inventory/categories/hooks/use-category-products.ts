"use client";

import type { ApiPageInfo } from "@/graphql/types";
import { useRelayConnectionQuery } from "@/graphql/hooks/use-relay-connection-query";
import type { RelayCursorPaginationVariables } from "@/ui-kit/cursor-pagination";
import { CATEGORY_PRODUCTS_QUERY } from "../graphql";
import type {
  CategoryProductsOrderByInput,
  CategoryProductListItem,
  CategoryProductsQueryData,
  CategoryProductsQueryVariables,
  CategoryProductsWhereInput,
} from "../graphql/operation-types";

export interface UseCategoryProductsOptions extends RelayCursorPaginationVariables {
  where?: CategoryProductsWhereInput | null;
  orderBy?: CategoryProductsOrderByInput[] | null;
  skip?: boolean;
}

export interface UseCategoryProductsReturn {
  products: CategoryProductListItem[];
  connection: CategoryProductsQueryData["catalogQuery"]["products"] | null;
  totalCount: number;
  pageInfo: ApiPageInfo | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}

export function useCategoryProducts(
  categoryId?: string | null,
  options: UseCategoryProductsOptions = {},
): UseCategoryProductsReturn {
  const {
    first,
    after = null,
    last,
    before = null,
    where = null,
    orderBy = null,
    skip = false,
  } = options;

  const result = useRelayConnectionQuery<
    CategoryProductsQueryData,
    CategoryProductsQueryVariables,
    CategoryProductListItem,
    CategoryProductsQueryData["catalogQuery"]["products"]
  >({
    query: CATEGORY_PRODUCTS_QUERY,
    variables: {
      categoryId: categoryId ?? "",
      first,
      after,
      last,
      before,
      where,
      orderBy,
    },
    skip: skip || !categoryId,
    fetchPolicy: "cache-and-network",
    getConnection: (data) => data?.catalogQuery.products,
  });

  return {
    products: result.nodes,
    connection: result.connection,
    totalCount: result.totalCount,
    pageInfo: result.pageInfo,
    loading: result.loading,
    error: result.error,
    refetch: result.refetch,
  };
}
