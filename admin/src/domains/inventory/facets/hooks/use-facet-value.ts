"use client";

import { useQuery } from "@apollo/client/react";
import { FACET_VALUE_DETAILS_QUERY } from "../graphql";
import type {
  FacetValueDetailsFields,
  FacetValueDetailsQueryData,
  FacetValueDetailsQueryVariables,
} from "../graphql/operation-types";

interface UseFacetValueReturn {
  facetValue: FacetValueDetailsFields | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}

export function useFacetValue(id?: string | null): UseFacetValueReturn {
  const { data, previousData, loading, error, refetch } = useQuery<
    FacetValueDetailsQueryData,
    FacetValueDetailsQueryVariables
  >(FACET_VALUE_DETAILS_QUERY, {
    variables: { id: id ?? "" },
    skip: !id,
    fetchPolicy: "cache-and-network",
  });
  const effectiveData = data ?? previousData;

  return {
    facetValue: effectiveData?.catalogQuery.facetValue ?? null,
    loading,
    error: error ?? null,
    refetch: () => refetch(),
  };
}
