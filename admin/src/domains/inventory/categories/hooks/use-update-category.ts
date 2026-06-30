"use client";

import { useCallback } from "react";
import { useMutation } from "@apollo/client/react";
import type {
  ApiCategory,
  ApiCategoryUpdateInput,
  ApiGenericUserError,
  ApiOperationResult,
} from "@/graphql/types";
import {
  CATEGORIES_QUERY,
  CATEGORY_DETAILS_QUERY,
  CATEGORY_UPDATE_MUTATION,
} from "../graphql";
import type {
  CategoryUpdateMutationData,
  CategoryUpdateMutationVariables,
} from "../graphql/operation-types";
import { normalizeCategoryUpdateErrors } from "../mappers";

interface UpdateCategoryResult {
  category: ApiCategory | null;
  operationResults: ApiOperationResult[];
  userErrors: ApiGenericUserError[];
  errors: ApiGenericUserError[];
}

interface UseUpdateCategoryReturn {
  updateCategory: (
    categoryId: string,
    operations: ApiCategoryUpdateInput,
    expectedRevision?: number | null,
  ) => Promise<UpdateCategoryResult>;
  loading: boolean;
  error: Error | null;
  reset: () => void;
}

export function useUpdateCategory(): UseUpdateCategoryReturn {
  const [updateCategoryMutation, { loading, error, reset }] = useMutation<
    CategoryUpdateMutationData,
    CategoryUpdateMutationVariables
  >(CATEGORY_UPDATE_MUTATION);

  const updateCategory = useCallback(
    async (
      categoryId: string,
      operations: ApiCategoryUpdateInput,
      expectedRevision?: number | null,
    ): Promise<UpdateCategoryResult> => {
      try {
        const result = await updateCategoryMutation({
          variables: {
            categoryId,
            operations,
            expectedRevision: expectedRevision ?? null,
          },
          refetchQueries: [CATEGORY_DETAILS_QUERY, CATEGORIES_QUERY],
          awaitRefetchQueries: true,
        });

        const payload = result.data?.catalogMutation.categoryUpdate;
        const operationResults = payload?.operationResults ?? [];
        const userErrors = payload?.userErrors ?? [];

        return {
          category: payload?.category ?? null,
          operationResults,
          userErrors,
          errors: normalizeCategoryUpdateErrors({
            operationResults,
            userErrors,
          }),
        };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "An unexpected error occurred";
        const userErrors = [{ message, code: "UNEXPECTED_ERROR" }];

        return {
          category: null,
          operationResults: [],
          userErrors,
          errors: userErrors,
        };
      }
    },
    [updateCategoryMutation],
  );

  return {
    updateCategory,
    loading,
    error: error ?? null,
    reset,
  };
}
