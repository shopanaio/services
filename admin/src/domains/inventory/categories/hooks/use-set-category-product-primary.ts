"use client";

import { useCallback } from "react";
import { useMutation } from "@apollo/client/react";
import type {
  ApiCategory,
  ApiGenericUserError,
} from "@/graphql/types";
import { ProductCategoryOperationAction } from "@/graphql/types";
import {
  CATEGORIES_QUERY,
  CATEGORY_DETAILS_QUERY,
  CATEGORY_PRODUCTS_QUERY,
  PRODUCT_CATEGORY_UPDATE_MUTATION,
} from "../graphql";
import type {
  ProductCategoryUpdateMutationData,
  ProductCategoryUpdateMutationVariables,
} from "../graphql/operation-types";

interface CategoryProductMutationResult {
  category: ApiCategory | null;
  userErrors: ApiGenericUserError[];
}

interface UseSetCategoryProductPrimaryReturn {
  setCategoryProductPrimary: (
    input: CategoryProductInput,
  ) => Promise<CategoryProductMutationResult>;
  loading: boolean;
  error: Error | null;
  reset: () => void;
}

interface CategoryProductInput {
  categoryId: string;
  productId: string;
}

export function useSetCategoryProductPrimary(): UseSetCategoryProductPrimaryReturn {
  const [setPrimaryMutation, { loading, error, reset }] = useMutation<
    ProductCategoryUpdateMutationData,
    ProductCategoryUpdateMutationVariables
  >(PRODUCT_CATEGORY_UPDATE_MUTATION);

  const setCategoryProductPrimary = useCallback(
    async (input: CategoryProductInput): Promise<CategoryProductMutationResult> => {
      try {
        const result = await setPrimaryMutation({
          variables: {
            productId: input.productId,
            categories: [
              {
                categoryId: input.categoryId,
                action: ProductCategoryOperationAction.SetPrimary,
              },
            ],
          },
          refetchQueries: [
            CATEGORY_DETAILS_QUERY,
            CATEGORY_PRODUCTS_QUERY,
            CATEGORIES_QUERY,
          ],
          awaitRefetchQueries: true,
        });
        const payload = result.data?.catalogMutation.productUpdate;

        return {
          category: null,
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
