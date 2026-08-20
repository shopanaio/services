"use client";

import { useCallback } from "react";
import { useMutation } from "@apollo/client/react";
import type { ApiFacetValueMergeInput } from "@/graphql/types";
import { FACET_GRID_QUERY, FACET_VALUE_MERGE_MUTATION } from "../graphql";
import type {
  FacetValueMergeMutationData,
  FacetValueMergeMutationResult,
  FacetValueMergeMutationVariables,
} from "../graphql/operation-types";

interface UseMergeFacetValuesReturn {
  mergeFacetValues: (input: ApiFacetValueMergeInput) => Promise<FacetValueMergeMutationResult>;
  loading: boolean;
  error: Error | null;
  reset: () => void;
}

export function useMergeFacetValues(): UseMergeFacetValuesReturn {
  const [mergeFacetValuesMutation, { loading, error, reset }] = useMutation<
    FacetValueMergeMutationData,
    FacetValueMergeMutationVariables
  >(FACET_VALUE_MERGE_MUTATION);

  const mergeFacetValues = useCallback(
    async (input: ApiFacetValueMergeInput): Promise<FacetValueMergeMutationResult> => {
      try {
        const result = await mergeFacetValuesMutation({
          variables: { input },
          refetchQueries: [FACET_GRID_QUERY],
          awaitRefetchQueries: true,
        });
        const payload = result.data?.listingMutation.facetValueMerge;

        return {
          facetValue: payload?.facetValue ?? null,
          sourceValues: payload?.sourceValues ?? [],
          userErrors: payload?.userErrors ?? [],
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : "An unexpected error occurred";
        return {
          facetValue: null,
          sourceValues: [],
          userErrors: [{ message, code: "UNEXPECTED_ERROR" }],
        };
      }
    },
    [mergeFacetValuesMutation],
  );

  return { mergeFacetValues, loading, error: error ?? null, reset };
}
