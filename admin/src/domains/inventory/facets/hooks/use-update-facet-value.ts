"use client";

import { useCallback } from "react";
import { useMutation } from "@apollo/client/react";
import type { ApiFacetValueUpdateInput } from "@/graphql/types";
import {
  FACET_GRID_QUERY,
  FACET_VALUE_DETAILS_QUERY,
  FACET_VALUE_UPDATE_MUTATION,
} from "../graphql";
import type {
  FacetValueMutationResult,
  FacetValueUpdateMutationData,
  FacetValueUpdateMutationVariables,
} from "../graphql/operation-types";

interface UseUpdateFacetValueReturn {
  updateFacetValue: (
    input: ApiFacetValueUpdateInput,
  ) => Promise<FacetValueMutationResult>;
  loading: boolean;
  error: Error | null;
  reset: () => void;
}

export function useUpdateFacetValue(): UseUpdateFacetValueReturn {
  const [updateFacetValueMutation, { loading, error, reset }] = useMutation<
    FacetValueUpdateMutationData,
    FacetValueUpdateMutationVariables
  >(FACET_VALUE_UPDATE_MUTATION);

  const updateFacetValue = useCallback(
    async (
      input: ApiFacetValueUpdateInput,
    ): Promise<FacetValueMutationResult> => {
      try {
        const result = await updateFacetValueMutation({
          variables: { input },
          refetchQueries: [FACET_GRID_QUERY, FACET_VALUE_DETAILS_QUERY],
          awaitRefetchQueries: true,
        });
        const payload = result.data?.catalogMutation.facetValueUpdate;

        return {
          facetValue: payload?.facetValue ?? null,
          userErrors: payload?.userErrors ?? [],
        };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "An unexpected error occurred";
        return {
          facetValue: null,
          userErrors: [{ message, code: "UNEXPECTED_ERROR" }],
        };
      }
    },
    [updateFacetValueMutation],
  );

  return { updateFacetValue, loading, error: error ?? null, reset };
}
