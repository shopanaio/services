"use client";

import { useQuery } from "@apollo/client/react";
import { FACET_GRID_QUERY } from "../graphql";
import type {
  FacetGridFields,
  FacetGridQueryData,
} from "../graphql/operation-types";

export interface UseFacetsReturn {
  facets: FacetGridFields[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<FacetGridFields[]>;
}

export function useFacets(): UseFacetsReturn {
  const { data, previousData, loading, error, refetch } =
    useQuery<FacetGridQueryData>(FACET_GRID_QUERY, {
      fetchPolicy: "cache-and-network",
    });

  const effectiveData = data ?? previousData;

  return {
    facets: effectiveData?.catalogQuery.facets ?? [],
    loading,
    error: error ?? null,
    refetch: async () => {
      const result = await refetch();
      return result.data?.catalogQuery.facets ?? [];
    },
  };
}
