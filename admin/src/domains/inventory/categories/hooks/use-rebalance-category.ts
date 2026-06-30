"use client";

import { useCallback } from "react";
import { useMutation } from "@apollo/client/react";
import type {
  ApiCategory,
  ApiCategoryRebalanceInput,
  ApiGenericUserError,
} from "@/graphql/types";
import {
  CATEGORIES_QUERY,
  CATEGORY_DETAILS_QUERY,
  CATEGORY_PRODUCTS_QUERY,
  CATEGORY_REBALANCE_MUTATION,
} from "../graphql";
import type {
  CategoryRebalanceMutationData,
  CategoryRebalanceMutationVariables,
} from "../graphql/operation-types";

interface CategoryProductMutationResult {
  category: ApiCategory | null;
  userErrors: ApiGenericUserError[];
}

interface UseRebalanceCategoryReturn {
  rebalanceCategory: (
    input: ApiCategoryRebalanceInput,
  ) => Promise<CategoryProductMutationResult>;
  loading: boolean;
  error: Error | null;
  reset: () => void;
}

export function useRebalanceCategory(): UseRebalanceCategoryReturn {
  const [rebalanceMutation, { loading, error, reset }] = useMutation<
    CategoryRebalanceMutationData,
    CategoryRebalanceMutationVariables
  >(CATEGORY_REBALANCE_MUTATION);

  const rebalanceCategory = useCallback(
    async (
      input: ApiCategoryRebalanceInput,
    ): Promise<CategoryProductMutationResult> => {
      try {
        const result = await rebalanceMutation({
          variables: { input },
          refetchQueries: [
            CATEGORY_DETAILS_QUERY,
            CATEGORY_PRODUCTS_QUERY,
            CATEGORIES_QUERY,
          ],
          awaitRefetchQueries: true,
        });
        const payload = result.data?.catalogMutation.categoryRebalance;

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
    [rebalanceMutation],
  );

  return {
    rebalanceCategory,
    loading,
    error: error ?? null,
    reset,
  };
}
