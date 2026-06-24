"use client";

import type {
  ApiCategory,
  ApiCategoryCategoriesMetaInput,
  ApiCategoryConnection,
  ApiCategoryOrderByInput,
  ApiCategoryWhereInput,
  ApiPageInfo,
} from "@/graphql/types";
import { useRelayConnectionQuery } from "@/graphql/hooks/use-relay-connection-query";
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

export interface UseCategoriesReturn {
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

  const result = useRelayConnectionQuery<
    CategoriesQueryData,
    CategoriesQueryVariables,
    ApiCategory,
    ApiCategoryConnection
  >({
    query: CATEGORIES_QUERY,
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
    getConnection: (data) => data?.catalogQuery.categories,
  });

  return {
    categories: result.nodes,
    connection: result.connection,
    totalCount: result.totalCount,
    pageInfo: result.pageInfo,
    loading: result.loading,
    error: result.error,
    refetch: result.refetch,
  };
}
