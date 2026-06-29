"use client";

import { useQuery } from "@apollo/client/react";
import { FACET_DETAILS_QUERY } from "../graphql";
import type {
  FacetDetailsQueryData,
  FacetDetailsQueryVariables,
  FacetGridFields,
} from "../graphql/operation-types";

interface UseFacetReturn {
  facet: FacetGridFields | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}

export function useFacet(id?: string | null): UseFacetReturn {
  const { data, previousData, loading, error, refetch } = useQuery<
    FacetDetailsQueryData,
    FacetDetailsQueryVariables
  >(FACET_DETAILS_QUERY, {
    variables: { id: id ?? "" },
    skip: !id,
    fetchPolicy: "cache-and-network",
  });
  const effectiveData = data ?? previousData;

  return {
    facet: effectiveData?.catalogQuery.facet ?? null,
    loading,
    error: error ?? null,
    refetch: () => refetch(),
  };
}
