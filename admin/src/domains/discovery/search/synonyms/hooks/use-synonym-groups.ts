"use client";

import type {
  ApiPageInfo,
  ApiSearchSynonymGroup,
  ApiSearchSynonymGroupConnection,
  ApiSearchSynonymGroupOrderByInput,
  ApiSearchSynonymGroupWhereInput,
} from "@/graphql/types";
import { useRelayConnectionQuery } from "@/graphql/hooks/use-relay-connection-query";
import type { RelayCursorPaginationVariables } from "@/ui-kit/cursor-pagination";
import { SEARCH_SYNONYM_GROUPS_QUERY } from "../graphql";
import type {
  SearchSynonymGroupsQueryData,
  SearchSynonymGroupsQueryVariables,
} from "../graphql/operation-types";

export interface UseSynonymGroupsOptions extends RelayCursorPaginationVariables {
  where?: ApiSearchSynonymGroupWhereInput | null;
  orderBy?: ApiSearchSynonymGroupOrderByInput[] | null;
  skip?: boolean;
}

export interface UseSynonymGroupsReturn {
  synonymGroups: ApiSearchSynonymGroup[];
  connection: ApiSearchSynonymGroupConnection | null;
  totalCount: number;
  pageInfo: ApiPageInfo | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}

export function useSynonymGroups(options: UseSynonymGroupsOptions = {}): UseSynonymGroupsReturn {
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
    SearchSynonymGroupsQueryData,
    SearchSynonymGroupsQueryVariables,
    ApiSearchSynonymGroup,
    ApiSearchSynonymGroupConnection
  >({
    query: SEARCH_SYNONYM_GROUPS_QUERY,
    variables: { first, after, last, before, where, orderBy },
    skip,
    fetchPolicy: "cache-and-network",
    getConnection: (data) => data?.listingQuery.search.synonymGroups,
  });

  return {
    synonymGroups: result.nodes,
    connection: result.connection,
    totalCount: result.totalCount,
    pageInfo: result.pageInfo,
    loading: result.loading,
    error: result.error,
    refetch: result.refetch,
  };
}
