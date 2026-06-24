"use client";

import { useCallback } from "react";
import { useMutation } from "@apollo/client/react";
import type {
  ApiGenericUserError,
  ApiProductOption,
  ApiProductOptionsSyncInput,
} from "@/graphql/types";
import { PRODUCT_OPTIONS_SYNC_MUTATION } from "../graphql";
import type {
  ProductOptionsSyncMutationData,
  ProductOptionsSyncMutationVariables,
  ProductOptionsSyncProduct,
} from "../graphql/operation-types";

interface SyncProductOptionsResult {
  product: ProductOptionsSyncProduct | null;
  options: ApiProductOption[];
  userErrors: ApiGenericUserError[];
}

interface UseSyncProductOptionsReturn {
  syncProductOptions: (
    input: ApiProductOptionsSyncInput,
  ) => Promise<SyncProductOptionsResult>;
  loading: boolean;
  error: Error | null;
  reset: () => void;
}

export function useSyncProductOptions(): UseSyncProductOptionsReturn {
  const [syncProductOptionsMutation, { loading, error, reset }] = useMutation<
    ProductOptionsSyncMutationData,
    ProductOptionsSyncMutationVariables
  >(PRODUCT_OPTIONS_SYNC_MUTATION);

  const syncProductOptions = useCallback(
    async (
      input: ApiProductOptionsSyncInput,
    ): Promise<SyncProductOptionsResult> => {
      try {
        const result = await syncProductOptionsMutation({
          variables: { input },
        });

        const payload = result.data?.catalogMutation.productOptionsSync;

        return {
          product: payload?.product ?? null,
          options: payload?.options ?? [],
          userErrors: payload?.userErrors ?? [],
        };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "An unexpected error occurred";

        return {
          product: null,
          options: [],
          userErrors: [{ message, code: "UNEXPECTED_ERROR" }],
        };
      }
    },
    [syncProductOptionsMutation],
  );

  return {
    syncProductOptions,
    loading,
    error: error ?? null,
    reset,
  };
}
