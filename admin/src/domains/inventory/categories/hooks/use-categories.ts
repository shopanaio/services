"use client";

import { useQuery } from "@apollo/client/react";
import type {
  ApiCategory,
  ApiCategoryCategoriesMetaInput,
  ApiCategoryConnection,
  ApiCategoryOrderByInput,
  ApiCategoryWhereInput,
  ApiPageInfo,
} from "@/graphql/types";
import type { RelayCursorPaginationVariables } from "@/ui-kit/cursor-pagination";
import { CATEGORIES_QUERY } from "../graphql";
import type {
  CategoriesQueryData,
  CategoriesQueryVariables,
} from "../graphql/operation-types";

export interface UseCategoriesOptions extends RelayCursorPaginationVariables {
  where?: ApiCategoryWhereInput | null;
  orderBy?: ApiCategoryOrderByInput[] | null;
  meta?: ApiCategoryCategoriesMetaInput | null;
  skip?: boolean;
  fetchPolicy?: "cache-and-network" | "network-only";
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

export function useCategories(
  options: UseCategoriesOptions = {},
): UseCategoriesReturn {
  const {
    first,
    after = null,
    last,
    before = null,
    where = null,
    orderBy = null,
    meta = null,
    skip = false,
    fetchPolicy = "cache-and-network",
  } = options;

  const { data, previousData, loading, error, refetch } = useQuery<
    CategoriesQueryData,
    CategoriesQueryVariables
  >(CATEGORIES_QUERY, {
    variables: {
      first,
      after,
      last,
      before,
      where,
      orderBy,
      meta,
    },
    skip,
    fetchPolicy,
  });

  const effectiveData = data ?? previousData;
  const connection = effectiveData?.catalogQuery.categories ?? null;

  return {
    categories: connection?.edges.map((edge) => edge.node) ?? [],
    connection,
    totalCount: connection?.totalCount ?? 0,
    pageInfo: connection?.pageInfo ?? null,
    loading,
    error: error ?? null,
    refetch: () => refetch(),
  };
}
