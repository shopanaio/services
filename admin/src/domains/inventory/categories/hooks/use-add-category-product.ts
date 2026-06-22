"use client";

import { useCallback } from "react";
import { useMutation } from "@apollo/client/react";
import type {
  ApiCategory,
  ApiCategoryAddProductInput,
  ApiGenericUserError,
} from "@/graphql/types";
import {
  CATEGORIES_QUERY,
  CATEGORY_ADD_PRODUCT_MUTATION,
  CATEGORY_DETAILS_QUERY,
  CATEGORY_PRODUCTS_QUERY,
} from "../graphql";
import type {
  CategoryAddProductMutationData,
  CategoryAddProductMutationVariables,
} from "../graphql";

interface CategoryProductMutationResult {
  category: ApiCategory | null;
  userErrors: ApiGenericUserError[];
}

interface UseAddCategoryProductReturn {
  addCategoryProduct: (
    input: ApiCategoryAddProductInput,
  ) => Promise<CategoryProductMutationResult>;
  loading: boolean;
  error: Error | null;
  reset: () => void;
}

export function useAddCategoryProduct(): UseAddCategoryProductReturn {
  const [addProductMutation, { loading, error, reset }] = useMutation<
    CategoryAddProductMutationData,
    CategoryAddProductMutationVariables
  >(CATEGORY_ADD_PRODUCT_MUTATION);

  const addCategoryProduct = useCallback(
    async (
      input: ApiCategoryAddProductInput,
    ): Promise<CategoryProductMutationResult> => {
      try {
        const result = await addProductMutation({
          variables: { input },
          refetchQueries: [
            CATEGORY_DETAILS_QUERY,
            CATEGORY_PRODUCTS_QUERY,
            CATEGORIES_QUERY,
          ],
          awaitRefetchQueries: true,
        });
        const payload = result.data?.catalogMutation.categoryAddProduct;

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
    [addProductMutation],
  );

  return {
    addCategoryProduct,
    loading,
    error: error ?? null,
    reset,
  };
}
