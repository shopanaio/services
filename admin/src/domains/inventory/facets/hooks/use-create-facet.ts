"use client";

import { useCallback } from "react";
import { useMutation } from "@apollo/client/react";
import type { ApiFacetCreateInput } from "@/graphql/types";
import { FACET_CREATE_MUTATION, FACET_GRID_QUERY } from "../graphql";
import type {
  FacetCreateMutationData,
  FacetCreateMutationVariables,
  FacetMutationResult,
} from "../graphql/operation-types";

interface UseCreateFacetReturn {
  createFacet: (input: ApiFacetCreateInput) => Promise<FacetMutationResult>;
  loading: boolean;
  error: Error | null;
  reset: () => void;
}

export function useCreateFacet(): UseCreateFacetReturn {
  const [createFacetMutation, { loading, error, reset }] = useMutation<
    FacetCreateMutationData,
    FacetCreateMutationVariables
  >(FACET_CREATE_MUTATION);

  const createFacet = useCallback(
    async (input: ApiFacetCreateInput): Promise<FacetMutationResult> => {
      try {
        const result = await createFacetMutation({
          variables: { input },
          refetchQueries: [FACET_GRID_QUERY],
          awaitRefetchQueries: true,
        });
        const payload = result.data?.catalogMutation.facetCreate;

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
    [createFacetMutation],
  );

  return { createFacet, loading, error: error ?? null, reset };
}
