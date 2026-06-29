"use client";

import { useCallback } from "react";
import { useMutation } from "@apollo/client/react";
import type { ApiFacetMoveInput } from "@/graphql/types";
import {
  FACET_DETAILS_QUERY,
  FACET_GRID_QUERY,
  FACET_MOVE_MUTATION,
} from "../graphql";
import type {
  FacetMoveMutationData,
  FacetMoveMutationVariables,
  FacetMutationResult,
} from "../graphql/operation-types";

interface UseMoveFacetReturn {
  moveFacet: (input: ApiFacetMoveInput) => Promise<FacetMutationResult>;
  loading: boolean;
  error: Error | null;
  reset: () => void;
}

export function useMoveFacet(): UseMoveFacetReturn {
  const [moveFacetMutation, { loading, error, reset }] = useMutation<
    FacetMoveMutationData,
    FacetMoveMutationVariables
  >(FACET_MOVE_MUTATION);

  const moveFacet = useCallback(
    async (input: ApiFacetMoveInput): Promise<FacetMutationResult> => {
      try {
        const result = await moveFacetMutation({
          variables: { input },
          refetchQueries: [FACET_GRID_QUERY, FACET_DETAILS_QUERY],
          awaitRefetchQueries: true,
        });
        const payload = result.data?.catalogMutation.facetMove;

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
    [moveFacetMutation],
  );

  return { moveFacet, loading, error: error ?? null, reset };
}
