"use client";

import { useCallback } from "react";
import { useMutation } from "@apollo/client/react";
import type {
  ApiCategory,
  ApiCategoryRemoveProductInput,
  ApiGenericUserError,
} from "@/graphql/types";
import {
  CATEGORIES_QUERY,
  CATEGORY_DETAILS_QUERY,
  CATEGORY_PRODUCTS_QUERY,
  CATEGORY_REMOVE_PRODUCT_MUTATION,
} from "../graphql";
import type {
  CategoryRemoveProductMutationData,
  CategoryRemoveProductMutationVariables,
} from "../graphql";

interface CategoryProductMutationResult {
  category: ApiCategory | null;
  userErrors: ApiGenericUserError[];
}

interface UseRemoveCategoryProductReturn {
  removeCategoryProduct: (
    input: ApiCategoryRemoveProductInput,
  ) => Promise<CategoryProductMutationResult>;
  loading: boolean;
  error: Error | null;
  reset: () => void;
}

export function useRemoveCategoryProduct(): UseRemoveCategoryProductReturn {
  const [removeProductMutation, { loading, error, reset }] = useMutation<
    CategoryRemoveProductMutationData,
    CategoryRemoveProductMutationVariables
  >(CATEGORY_REMOVE_PRODUCT_MUTATION);

  const removeCategoryProduct = useCallback(
    async (
      input: ApiCategoryRemoveProductInput,
    ): Promise<CategoryProductMutationResult> => {
      try {
        const result = await removeProductMutation({
          variables: { input },
          refetchQueries: [
            CATEGORY_DETAILS_QUERY,
            CATEGORY_PRODUCTS_QUERY,
            CATEGORIES_QUERY,
          ],
          awaitRefetchQueries: true,
        });
        const payload = result.data?.catalogMutation.categoryRemoveProduct;

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
    [removeProductMutation],
  );

  return {
    removeCategoryProduct,
    loading,
    error: error ?? null,
    reset,
  };
}
