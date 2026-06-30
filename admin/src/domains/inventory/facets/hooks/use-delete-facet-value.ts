"use client";

import { useCallback } from "react";
import { useMutation } from "@apollo/client/react";
import type {
  ApiFacetValueDeleteInput,
  ApiGenericUserError,
} from "@/graphql/types";
import { FACET_GRID_QUERY, FACET_VALUE_DELETE_MUTATION } from "../graphql";
import type {
  FacetValueDeleteMutationData,
  FacetValueDeleteMutationVariables,
} from "../graphql/operation-types";

interface DeleteFacetValueResult {
  deletedFacetValueId: string | null;
  userErrors: ApiGenericUserError[];
}

interface UseDeleteFacetValueReturn {
  deleteFacetValue: (
    input: ApiFacetValueDeleteInput,
  ) => Promise<DeleteFacetValueResult>;
  loading: boolean;
  error: Error | null;
  reset: () => void;
}

export function useDeleteFacetValue(): UseDeleteFacetValueReturn {
  const [deleteFacetValueMutation, { loading, error, reset }] = useMutation<
    FacetValueDeleteMutationData,
    FacetValueDeleteMutationVariables
  >(FACET_VALUE_DELETE_MUTATION);

  const deleteFacetValue = useCallback(
    async (
      input: ApiFacetValueDeleteInput,
    ): Promise<DeleteFacetValueResult> => {
      try {
        const result = await deleteFacetValueMutation({
          variables: { input },
          refetchQueries: [FACET_GRID_QUERY],
          awaitRefetchQueries: true,
        });
        const payload = result.data?.catalogMutation.facetValueDelete;

        return {
          deletedFacetValueId: payload?.deletedFacetValueId ?? null,
          userErrors: payload?.userErrors ?? [],
        };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "An unexpected error occurred";
        return {
          deletedFacetValueId: null,
          userErrors: [{ message, code: "UNEXPECTED_ERROR" }],
        };
      }
    },
    [deleteFacetValueMutation],
  );

  return { deleteFacetValue, loading, error: error ?? null, reset };
}
