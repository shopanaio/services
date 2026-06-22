"use client";

import { useCallback } from "react";
import { useMutation } from "@apollo/client/react";
import type {
  ApiCategory,
  ApiCategoryMoveProductInput,
  ApiGenericUserError,
} from "@/graphql/types";
import {
  CATEGORIES_QUERY,
  CATEGORY_DETAILS_QUERY,
  CATEGORY_MOVE_PRODUCT_MUTATION,
  CATEGORY_PRODUCTS_QUERY,
} from "../graphql";
import type {
  CategoryMoveProductMutationData,
  CategoryMoveProductMutationVariables,
} from "../graphql";

interface CategoryProductMutationResult {
  category: ApiCategory | null;
  userErrors: ApiGenericUserError[];
}

interface UseMoveCategoryProductReturn {
  moveCategoryProduct: (
    input: ApiCategoryMoveProductInput,
  ) => Promise<CategoryProductMutationResult>;
  loading: boolean;
  error: Error | null;
  reset: () => void;
}

export function useMoveCategoryProduct(): UseMoveCategoryProductReturn {
  const [moveProductMutation, { loading, error, reset }] = useMutation<
    CategoryMoveProductMutationData,
    CategoryMoveProductMutationVariables
  >(CATEGORY_MOVE_PRODUCT_MUTATION);

  const moveCategoryProduct = useCallback(
    async (
      input: ApiCategoryMoveProductInput,
    ): Promise<CategoryProductMutationResult> => {
      try {
        const result = await moveProductMutation({
          variables: { input },
          refetchQueries: [
            CATEGORY_DETAILS_QUERY,
            CATEGORY_PRODUCTS_QUERY,
            CATEGORIES_QUERY,
          ],
          awaitRefetchQueries: true,
        });
        const payload = result.data?.catalogMutation.categoryMoveProduct;

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
    [moveProductMutation],
  );

  return {
    moveCategoryProduct,
    loading,
    error: error ?? null,
    reset,
  };
}
