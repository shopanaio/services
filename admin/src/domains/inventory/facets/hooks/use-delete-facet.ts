"use client";

import { useCallback } from "react";
import { useMutation } from "@apollo/client/react";
import type { ApiFacetDeleteInput, ApiGenericUserError } from "@/graphql/types";
import { FACET_DELETE_MUTATION, FACET_GRID_QUERY } from "../graphql";
import type {
  FacetDeleteMutationData,
  FacetDeleteMutationVariables,
} from "../graphql/operation-types";

interface DeleteFacetResult {
  deletedFacetId: string | null;
  userErrors: ApiGenericUserError[];
}

interface UseDeleteFacetReturn {
  deleteFacet: (input: ApiFacetDeleteInput) => Promise<DeleteFacetResult>;
  loading: boolean;
  error: Error | null;
  reset: () => void;
}

export function useDeleteFacet(): UseDeleteFacetReturn {
  const [deleteFacetMutation, { loading, error, reset }] = useMutation<
    FacetDeleteMutationData,
    FacetDeleteMutationVariables
  >(FACET_DELETE_MUTATION);

  const deleteFacet = useCallback(
    async (input: ApiFacetDeleteInput): Promise<DeleteFacetResult> => {
      try {
        const result = await deleteFacetMutation({
          variables: { input },
          refetchQueries: [FACET_GRID_QUERY],
          awaitRefetchQueries: true,
        });
        const payload = result.data?.catalogMutation.facetDelete;

        return {
          deletedFacetId: payload?.deletedFacetId ?? null,
          userErrors: payload?.userErrors ?? [],
        };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "An unexpected error occurred";
        return {
          deletedFacetId: null,
          userErrors: [{ message, code: "UNEXPECTED_ERROR" }],
        };
      }
    },
    [deleteFacetMutation],
  );

  return { deleteFacet, loading, error: error ?? null, reset };
}
