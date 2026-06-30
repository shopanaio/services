"use client";

import type {
  ApiFacetValueCandidateOrderByInput,
  ApiFacetValueCandidateWhereInput,
  ApiFacetValueCandidatesMetaInput,
  ApiPageInfo,
} from "@/graphql/types";
import { FacetValueCandidateType } from "@/graphql/types";
import { useRelayConnectionQuery } from "@/graphql/hooks/use-relay-connection-query";
import type { RelayCursorPaginationVariables } from "@/ui-kit/cursor-pagination";
import { FACET_VALUE_CANDIDATES_QUERY } from "../graphql";
import type {
  FacetValueCandidateConnectionFields,
  FacetValueCandidateFields,
  FacetValueCandidatesQueryData,
  FacetValueCandidatesQueryVariables,
} from "../graphql/operation-types";

export interface UseFacetValueCandidatesOptions
  extends RelayCursorPaginationVariables {
  where?: ApiFacetValueCandidateWhereInput | null;
  orderBy?: ApiFacetValueCandidateOrderByInput[] | null;
  meta?: ApiFacetValueCandidatesMetaInput | null;
  skip?: boolean;
}

export interface UseFacetValueCandidatesReturn {
  candidates: FacetValueCandidateFields[];
  connection: FacetValueCandidateConnectionFields | null;
  totalCount: number;
  pageInfo: ApiPageInfo | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}

export function useFacetValueCandidates(
  options: UseFacetValueCandidatesOptions = {},
): UseFacetValueCandidatesReturn {
  const {
    first,
    after = null,
    last,
    before = null,
    where = null,
    orderBy = null,
    meta,
    skip = false,
  } = options;

  const shouldSkip = skip || !meta;

  const result = useRelayConnectionQuery<
    FacetValueCandidatesQueryData,
    FacetValueCandidatesQueryVariables,
    FacetValueCandidateFields,
    FacetValueCandidateConnectionFields
  >({
    query: FACET_VALUE_CANDIDATES_QUERY,
    variables: {
      first,
      after,
      last,
      before,
      where,
      orderBy,
      meta: meta ?? { candidateType: FacetValueCandidateType.Tag },
    },
    skip: shouldSkip,
    fetchPolicy: "cache-and-network",
    getConnection: (data) => data?.catalogQuery.facetValueCandidates,
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
