"use client";

import { useCallback } from "react";
import { useMutation } from "@apollo/client/react";
import type { ApiFacetValueCreateInput } from "@/graphql/types";
import { FACET_GRID_QUERY, FACET_VALUE_CREATE_MUTATION } from "../graphql";
import type {
  FacetValueCreateMutationData,
  FacetValueCreateMutationVariables,
  FacetValueMutationResult,
} from "../graphql/operation-types";

interface UseCreateFacetValueReturn {
  createFacetValue: (
    input: ApiFacetValueCreateInput,
  ) => Promise<FacetValueMutationResult>;
  loading: boolean;
  error: Error | null;
  reset: () => void;
}

export function useCreateFacetValue(): UseCreateFacetValueReturn {
  const [createFacetValueMutation, { loading, error, reset }] = useMutation<
    FacetValueCreateMutationData,
    FacetValueCreateMutationVariables
  >(FACET_VALUE_CREATE_MUTATION);

  const createFacetValue = useCallback(
    async (
      input: ApiFacetValueCreateInput,
    ): Promise<FacetValueMutationResult> => {
      try {
        const result = await createFacetValueMutation({
          variables: { input },
          refetchQueries: [FACET_GRID_QUERY],
          awaitRefetchQueries: true,
        });
        const payload = result.data?.catalogMutation.facetValueCreate;

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
    [createFacetValueMutation],
  );

  return { createFacetValue, loading, error: error ?? null, reset };
}
