"use client";

import { useCallback } from "react";
import { useMutation } from "@apollo/client/react";
import type {
  ApiGenericUserError,
  ApiProduct,
  ApiProductUpdateStatusInput,
} from "@/graphql/types";
import { PRODUCT_UPDATE_STATUS_MUTATION } from "../graphql";
import type {
  ProductUpdateStatusMutationData,
  ProductUpdateStatusMutationVariables,
} from "../graphql";

interface UpdateProductStatusResult {
  product: ApiProduct | null;
  userErrors: ApiGenericUserError[];
}

interface UseUpdateProductStatusReturn {
  updateProductStatus: (
    input: ApiProductUpdateStatusInput,
  ) => Promise<UpdateProductStatusResult>;
  loading: boolean;
  error: Error | null;
  reset: () => void;
}

export function useUpdateProductStatus(): UseUpdateProductStatusReturn {
  const [updateStatusMutation, { loading, error, reset }] = useMutation<
    ProductUpdateStatusMutationData,
    ProductUpdateStatusMutationVariables
  >(PRODUCT_UPDATE_STATUS_MUTATION);

  const updateProductStatus = useCallback(
    async (
      input: ApiProductUpdateStatusInput,
    ): Promise<UpdateProductStatusResult> => {
      try {
        const result = await updateStatusMutation({
          variables: { input },
        });

        const payload = result.data?.catalogMutation.productUpdateStatus;

        return {
          product: payload?.product ?? null,
          userErrors: payload?.userErrors ?? [],
        };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "An unexpected error occurred";

        return {
          product: null,
          userErrors: [{ message, code: "UNEXPECTED_ERROR" }],
        };
      }
    },
    [updateStatusMutation],
  );

  return {
    updateProductStatus,
    loading,
    error: error ?? null,
    reset,
  };
}
