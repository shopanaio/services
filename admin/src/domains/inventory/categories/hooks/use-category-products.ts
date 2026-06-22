"use client";

import { useQuery } from "@apollo/client/react";
import type {
  ApiCategoryProductConnection,
  ApiCategoryProductWhereInput,
  ApiPageInfo,
  ApiProduct,
  ApiProductOrderByInput,
} from "@/graphql/types";
import type { RelayCursorPaginationVariables } from "@/ui-kit/cursor-pagination";
import { CATEGORY_PRODUCTS_QUERY } from "../graphql";
import type {
  CategoryProductsQueryData,
  CategoryProductsQueryVariables,
} from "../graphql";

export interface UseCategoryProductsOptions
  extends RelayCursorPaginationVariables {
  where?: ApiCategoryProductWhereInput | null;
  orderBy?: ApiProductOrderByInput[] | null;
  skip?: boolean;
}

interface UseCategoryProductsReturn {
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

  const { data, previousData, loading, error, refetch } = useQuery<
    CategoryProductsQueryData,
    CategoryProductsQueryVariables
  >(CATEGORY_PRODUCTS_QUERY, {
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
  });

  const effectiveData = data ?? previousData;
  const connection = effectiveData?.catalogQuery.category?.products ?? null;

  return {
    products: connection?.edges.map((edge) => edge.node) ?? [],
    connection,
    totalCount: connection?.totalCount ?? 0,
    pageInfo: connection?.pageInfo ?? null,
    loading,
    error: error ?? null,
    refetch: () => refetch(),
  };
}
