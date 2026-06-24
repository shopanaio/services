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
} from "../graphql";

interface CategoryProductMutationResult {
  category: ApiCategory | null;
  userErrors: ApiGenericUserError[];
}

interface UseRemoveCategoryProductReturn {
  removeCategoryProduct: (
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

export function useRemoveCategoryProduct(): UseRemoveCategoryProductReturn {
  const [removeProductMutation, { loading, error, reset }] = useMutation<
    ProductCategoryUpdateMutationData,
    ProductCategoryUpdateMutationVariables
  >(PRODUCT_CATEGORY_UPDATE_MUTATION);

  const removeCategoryProduct = useCallback(
    async (input: CategoryProductInput): Promise<CategoryProductMutationResult> => {
      try {
        const result = await removeProductMutation({
          variables: {
            productId: input.productId,
            categories: [
              {
                categoryId: input.categoryId,
                action: ProductCategoryOperationAction.Remove,
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
    [removeProductMutation],
  );

  return {
    removeCategoryProduct,
    loading,
    error: error ?? null,
    reset,
  };
}
