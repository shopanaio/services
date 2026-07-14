"use client";

import type {
  ApiPageInfo,
  ApiSearchProductBoost,
  ApiSearchProductBoostConnection,
  ApiSearchProductBoostOrderByInput,
  ApiSearchProductBoostWhereInput,
} from "@/graphql/types";
import { useRelayConnectionQuery } from "@/graphql/hooks/use-relay-connection-query";
import type { RelayCursorPaginationVariables } from "@/ui-kit/cursor-pagination";
import { SEARCH_PRODUCT_BOOSTS_QUERY } from "../graphql";
import type {
  SearchProductBoostsQueryData,
  SearchProductBoostsQueryVariables,
} from "../graphql/operation-types";

export interface UseProductBoostsOptions extends RelayCursorPaginationVariables {
  where?: ApiSearchProductBoostWhereInput | null;
  orderBy?: ApiSearchProductBoostOrderByInput[] | null;
  skip?: boolean;
}

export interface UseProductBoostsReturn {
  productBoosts: ApiSearchProductBoost[];
  connection: ApiSearchProductBoostConnection | null;
  totalCount: number;
  pageInfo: ApiPageInfo | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}

export function useProductBoosts(
  options: UseProductBoostsOptions = {},
): UseProductBoostsReturn {
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
    SearchProductBoostsQueryData,
    SearchProductBoostsQueryVariables,
    ApiSearchProductBoost,
    ApiSearchProductBoostConnection
  >({
    query: SEARCH_PRODUCT_BOOSTS_QUERY,
    variables: { first, after, last, before, where, orderBy },
    skip,
    fetchPolicy: "cache-and-network",
    getConnection: (data) => data?.listingQuery.search.productBoosts,
  });

  return {
    productBoosts: result.nodes,
    connection: result.connection,
    totalCount: result.totalCount,
    pageInfo: result.pageInfo,
    loading: result.loading,
    error: result.error,
    refetch: result.refetch,
  };
}
