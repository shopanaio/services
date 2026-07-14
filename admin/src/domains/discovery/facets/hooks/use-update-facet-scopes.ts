"use client";

import { useCallback } from "react";
import { useMutation } from "@apollo/client/react";
import type {
  ApiFacetScopesUpdateInput,
  ApiGenericUserError,
} from "@/graphql/types";
import {
  FACET_DETAILS_QUERY,
  FACET_GRID_QUERY,
  FACET_SCOPES_UPDATE_MUTATION,
} from "../graphql";
import type {
  FacetGridFields,
  FacetScopesUpdateMutationData,
  FacetScopesUpdateMutationVariables,
} from "../graphql/operation-types";

interface FacetScopesUpdateResult {
  facets: FacetGridFields[];
  userErrors: ApiGenericUserError[];
}

interface UseUpdateFacetScopesReturn {
  updateFacetScopes: (
    input: ApiFacetScopesUpdateInput,
  ) => Promise<FacetScopesUpdateResult>;
  loading: boolean;
  error: Error | null;
  reset: () => void;
}

export function useUpdateFacetScopes(): UseUpdateFacetScopesReturn {
  const [mutation, { loading, error, reset }] = useMutation<
    FacetScopesUpdateMutationData,
    FacetScopesUpdateMutationVariables
  >(FACET_SCOPES_UPDATE_MUTATION);

  const updateFacetScopes = useCallback(
    async (
      input: ApiFacetScopesUpdateInput,
    ): Promise<FacetScopesUpdateResult> => {
      try {
        const result = await mutation({
          variables: { input },
          refetchQueries: [FACET_GRID_QUERY, FACET_DETAILS_QUERY],
          awaitRefetchQueries: true,
        });
        const payload = result.data?.listingMutation.facetScopesUpdate;

        return {
          facets: payload?.facets ?? [],
          userErrors: payload?.userErrors ?? [],
        };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "An unexpected error occurred";
        return {
          facets: [],
          userErrors: [{ message, code: "UNEXPECTED_ERROR" }],
        };
      }
    },
    [mutation],
  );

  return {
    updateFacetScopes,
    loading,
    error: error ?? null,
    reset,
  };
}
