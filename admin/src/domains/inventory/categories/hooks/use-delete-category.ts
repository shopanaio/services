"use client";

import { useCallback } from "react";
import { useMutation } from "@apollo/client/react";
import type { ApiCategoryDeleteInput, ApiGenericUserError } from "@/graphql/types";
import { CATEGORIES_QUERY, CATEGORY_DELETE_MUTATION } from "../graphql";
import type {
  CategoryDeleteMutationData,
  CategoryDeleteMutationVariables,
} from "../graphql";

interface DeleteCategoryResult {
  deletedCategoryId: string | null;
  userErrors: ApiGenericUserError[];
}

interface UseDeleteCategoryReturn {
  deleteCategory: (
    input: ApiCategoryDeleteInput,
  ) => Promise<DeleteCategoryResult>;
  loading: boolean;
  error: Error | null;
  reset: () => void;
}

export function useDeleteCategory(): UseDeleteCategoryReturn {
  const [deleteCategoryMutation, { loading, error, reset }] = useMutation<
    CategoryDeleteMutationData,
    CategoryDeleteMutationVariables
  >(CATEGORY_DELETE_MUTATION);

  const deleteCategory = useCallback(
    async (input: ApiCategoryDeleteInput): Promise<DeleteCategoryResult> => {
      try {
        const result = await deleteCategoryMutation({
          variables: { input },
          refetchQueries: [CATEGORIES_QUERY],
          awaitRefetchQueries: true,
        });

        const payload = result.data?.catalogMutation.categoryDelete;

        return {
          deletedCategoryId: payload?.deletedCategoryId ?? null,
          userErrors: payload?.userErrors ?? [],
        };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "An unexpected error occurred";

        return {
          deletedCategoryId: null,
          userErrors: [{ message, code: "UNEXPECTED_ERROR" }],
        };
      }
    },
    [deleteCategoryMutation],
  );

  return {
    deleteCategory,
    loading,
    error: error ?? null,
    reset,
  };
}
