"use client";

import type {
  ApiFacetSourceCandidateOrderByInput,
  ApiFacetSourceCandidateWhereInput,
  ApiPageInfo,
} from "@/graphql/types";
import { useRelayConnectionQuery } from "@/graphql/hooks/use-relay-connection-query";
import type { RelayCursorPaginationVariables } from "@/ui-kit/cursor-pagination";
import { FACET_SOURCE_CANDIDATES_QUERY } from "../graphql";
import type {
  FacetSourceCandidateConnectionFields,
  FacetSourceCandidateFields,
  FacetSourceCandidatesQueryData,
  FacetSourceCandidatesQueryVariables,
} from "../graphql/operation-types";

export interface UseFacetSourceCandidatesOptions
  extends RelayCursorPaginationVariables {
  where?: ApiFacetSourceCandidateWhereInput | null;
  orderBy?: ApiFacetSourceCandidateOrderByInput[] | null;
  skip?: boolean;
}

export interface UseFacetSourceCandidatesReturn {
  candidates: FacetSourceCandidateFields[];
  connection: FacetSourceCandidateConnectionFields | null;
  totalCount: number;
  pageInfo: ApiPageInfo | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}

export function useFacetSourceCandidatesPageQuery(
  options: UseFacetSourceCandidatesOptions = {},
): UseFacetSourceCandidatesReturn {
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
    FacetSourceCandidatesQueryData,
    FacetSourceCandidatesQueryVariables,
    FacetSourceCandidateFields,
    FacetSourceCandidateConnectionFields
  >({
    query: FACET_SOURCE_CANDIDATES_QUERY,
    variables: { first, after, last, before, where, orderBy },
    skip,
    fetchPolicy: "cache-and-network",
    getConnection: (data) => data?.catalogQuery.facetSourceCandidates,
  });

  return {
    candidates: result.nodes,
    connection: result.connection,
    totalCount: result.totalCount,
    pageInfo: result.pageInfo,
    loading: result.loading,
    error: result.error,
    refetch: result.refetch,
  };
}
