"use client";

import type {
  ApiCategoryProductConnection,
  ApiCategoryProductWhereInput,
  ApiListingOrderByInput,
  ApiPageInfo,
  ApiProduct,
} from "@/graphql/types";
import { useRelayConnectionQuery } from "@/graphql/hooks/use-relay-connection-query";
import type { RelayCursorPaginationVariables } from "@/ui-kit/cursor-pagination";
import { CATEGORY_PRODUCTS_QUERY } from "../graphql";
import type {
  CategoryProductsQueryData,
  CategoryProductsQueryVariables,
} from "../graphql/operation-types";

export interface UseCategoryProductsOptions
  extends RelayCursorPaginationVariables {
  where?: ApiCategoryProductWhereInput | null;
  orderBy?: ApiListingOrderByInput[] | null;
  skip?: boolean;
}

export interface UseCategoryProductsReturn {
  products: ApiProduct[];
  connection: ApiCategoryProductConnection | null;
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
    ApiProduct,
    ApiCategoryProductConnection
  >({
    query: CATEGORY_PRODUCTS_QUERY,
    variables: {
      id: categoryId ?? "",
      first,
      after,
      last,
      before,
      where,
      orderBy,
    },
    skip: skip || !categoryId,
    fetchPolicy: "cache-and-network",
    getConnection: (data) => data?.catalogQuery.category?.products,
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
