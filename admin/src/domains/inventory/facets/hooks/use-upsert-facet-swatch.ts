"use client";

import { useCallback } from "react";
import { useMutation } from "@apollo/client/react";
import type {
  ApiFacetSwatchCreateInput,
  ApiFacetSwatchUpdateInput,
} from "@/graphql/types";
import {
  FACET_SWATCH_CREATE_MUTATION,
  FACET_SWATCH_UPDATE_MUTATION,
} from "../graphql";
import type {
  FacetSwatchCreateMutationData,
  FacetSwatchCreateMutationVariables,
  FacetSwatchMutationResult,
  FacetSwatchUpdateMutationData,
  FacetSwatchUpdateMutationVariables,
} from "../graphql/operation-types";

interface UseUpsertFacetSwatchReturn {
  createFacetSwatch: (
    input: ApiFacetSwatchCreateInput,
  ) => Promise<FacetSwatchMutationResult>;
  updateFacetSwatch: (
    input: ApiFacetSwatchUpdateInput,
  ) => Promise<FacetSwatchMutationResult>;
  loading: boolean;
}

function getUnexpectedError(error: unknown): FacetSwatchMutationResult {
  return {
    facetSwatch: null,
    userErrors: [
      {
        message:
          error instanceof Error ? error.message : "An unexpected error occurred",
        code: "UNEXPECTED_ERROR",
      },
    ],
  };
}

export function useUpsertFacetSwatch(): UseUpsertFacetSwatchReturn {
  const [createMutation, { loading: creating }] = useMutation<
    FacetSwatchCreateMutationData,
    FacetSwatchCreateMutationVariables
  >(FACET_SWATCH_CREATE_MUTATION);
  const [updateMutation, { loading: updating }] = useMutation<
    FacetSwatchUpdateMutationData,
    FacetSwatchUpdateMutationVariables
  >(FACET_SWATCH_UPDATE_MUTATION);

  const createFacetSwatch = useCallback(
    async (
      input: ApiFacetSwatchCreateInput,
    ): Promise<FacetSwatchMutationResult> => {
      try {
        const result = await createMutation({ variables: { input } });
        const payload = result.data?.catalogMutation.facetSwatchCreate;

        return {
          facetSwatch: payload?.facetSwatch ?? null,
          userErrors: payload?.userErrors ?? [],
        };
      } catch (error) {
        return getUnexpectedError(error);
      }
    },
    [createMutation],
  );

  const updateFacetSwatch = useCallback(
    async (
      input: ApiFacetSwatchUpdateInput,
    ): Promise<FacetSwatchMutationResult> => {
      try {
        const result = await updateMutation({ variables: { input } });
        const payload = result.data?.catalogMutation.facetSwatchUpdate;

        return {
          facetSwatch: payload?.facetSwatch ?? null,
          userErrors: payload?.userErrors ?? [],
        };
      } catch (error) {
        return getUnexpectedError(error);
      }
    },
    [updateMutation],
  );

  return {
    createFacetSwatch,
    updateFacetSwatch,
    loading: creating || updating,
  };
}
