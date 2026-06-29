"use client";

import { useCallback } from "react";
import { useMutation } from "@apollo/client/react";
import type { ApiFacetUpdateInput } from "@/graphql/types";
import {
  FACET_DETAILS_QUERY,
  FACET_GRID_QUERY,
  FACET_UPDATE_MUTATION,
} from "../graphql";
import type {
  FacetMutationResult,
  FacetUpdateMutationData,
  FacetUpdateMutationVariables,
} from "../graphql/operation-types";

interface UseUpdateFacetReturn {
  updateFacet: (input: ApiFacetUpdateInput) => Promise<FacetMutationResult>;
  loading: boolean;
  error: Error | null;
  reset: () => void;
}

export function useUpdateFacet(): UseUpdateFacetReturn {
  const [updateFacetMutation, { loading, error, reset }] = useMutation<
    FacetUpdateMutationData,
    FacetUpdateMutationVariables
  >(FACET_UPDATE_MUTATION);

  const updateFacet = useCallback(
    async (input: ApiFacetUpdateInput): Promise<FacetMutationResult> => {
      try {
        const result = await updateFacetMutation({
          variables: { input },
          refetchQueries: [FACET_GRID_QUERY, FACET_DETAILS_QUERY],
          awaitRefetchQueries: true,
        });
        const payload = result.data?.catalogMutation.facetUpdate;

        return {
          facet: payload?.facet ?? null,
          userErrors: payload?.userErrors ?? [],
        };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "An unexpected error occurred";
        return {
          facet: null,
          userErrors: [{ message, code: "UNEXPECTED_ERROR" }],
        };
      }
    },
    [updateFacetMutation],
  );

  return { updateFacet, loading, error: error ?? null, reset };
}
