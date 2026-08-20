"use client";

import { useCallback } from "react";
import { useMutation } from "@apollo/client/react";
import type { ApiFacetValueUnmergeInput } from "@/graphql/types";
import { FACET_GRID_QUERY, FACET_VALUE_UNMERGE_MUTATION } from "../graphql";
import type {
  FacetValueUnmergeMutationData,
  FacetValueUnmergeMutationResult,
  FacetValueUnmergeMutationVariables,
} from "../graphql/operation-types";

interface UseUnmergeFacetValuesReturn {
  unmergeFacetValues: (
    input: ApiFacetValueUnmergeInput,
  ) => Promise<FacetValueUnmergeMutationResult>;
  loading: boolean;
  error: Error | null;
  reset: () => void;
}

export function useUnmergeFacetValues(): UseUnmergeFacetValuesReturn {
  const [unmergeFacetValuesMutation, { loading, error, reset }] = useMutation<
    FacetValueUnmergeMutationData,
    FacetValueUnmergeMutationVariables
  >(FACET_VALUE_UNMERGE_MUTATION);

  const unmergeFacetValues = useCallback(
    async (input: ApiFacetValueUnmergeInput): Promise<FacetValueUnmergeMutationResult> => {
      try {
        const result = await unmergeFacetValuesMutation({
          variables: { input },
          refetchQueries: [FACET_GRID_QUERY],
          awaitRefetchQueries: true,
        });
        const payload = result.data?.listingMutation.facetValueUnmerge;

        return {
          sourceValues: payload?.sourceValues ?? [],
          affectedGroupValues: payload?.affectedGroupValues ?? [],
          userErrors: payload?.userErrors ?? [],
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : "An unexpected error occurred";
        return {
          sourceValues: [],
          affectedGroupValues: [],
          userErrors: [{ message, code: "UNEXPECTED_ERROR" }],
        };
      }
    },
    [unmergeFacetValuesMutation],
  );

  return { unmergeFacetValues, loading, error: error ?? null, reset };
}
