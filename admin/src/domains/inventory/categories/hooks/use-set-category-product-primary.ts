"use client";

import { useCallback } from "react";
import { useMutation } from "@apollo/client/react";
import type {
  ApiCategory,
  ApiCategorySetProductPrimaryInput,
  ApiGenericUserError,
} from "@/graphql/types";
import {
  CATEGORIES_QUERY,
  CATEGORY_DETAILS_QUERY,
  CATEGORY_PRODUCTS_QUERY,
  CATEGORY_SET_PRODUCT_PRIMARY_MUTATION,
} from "../graphql";
import type {
  CategorySetProductPrimaryMutationData,
  CategorySetProductPrimaryMutationVariables,
} from "../graphql";

interface CategoryProductMutationResult {
  category: ApiCategory | null;
  userErrors: ApiGenericUserError[];
}

interface UseSetCategoryProductPrimaryReturn {
  setCategoryProductPrimary: (
    input: ApiCategorySetProductPrimaryInput,
  ) => Promise<CategoryProductMutationResult>;
  loading: boolean;
  error: Error | null;
  reset: () => void;
}

export function useSetCategoryProductPrimary(): UseSetCategoryProductPrimaryReturn {
  const [setPrimaryMutation, { loading, error, reset }] = useMutation<
    CategorySetProductPrimaryMutationData,
    CategorySetProductPrimaryMutationVariables
  >(CATEGORY_SET_PRODUCT_PRIMARY_MUTATION);

  const setCategoryProductPrimary = useCallback(
    async (
      input: ApiCategorySetProductPrimaryInput,
    ): Promise<CategoryProductMutationResult> => {
      try {
        const result = await setPrimaryMutation({
          variables: { input },
          refetchQueries: [
            CATEGORY_DETAILS_QUERY,
            CATEGORY_PRODUCTS_QUERY,
            CATEGORIES_QUERY,
          ],
          awaitRefetchQueries: true,
        });
        const payload =
          result.data?.catalogMutation.categorySetProductPrimary;

        return {
          category: payload?.category ?? null,
          userErrors: payload?.userErrors ?? [],
        };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "An unexpected error occurred";
        return {
          category: null,
          userErrors: [{ message, code: "UNEXPECTED_ERROR" }],
        };
      }
    },
    [setPrimaryMutation],
  );

  return {
    setCategoryProductPrimary,
    loading,
    error: error ?? null,
    reset,
  };
}
