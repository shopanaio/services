"use client";

import { useCallback } from "react";
import { useMutation } from "@apollo/client/react";
import type {
  ApiGenericUserError,
  ApiProductFeature,
  ApiProductFeaturesSyncInput,
} from "@/graphql/types";
import { PRODUCT_FEATURES_SYNC_MUTATION } from "../graphql";
import type {
  ProductFeaturesSyncMutationData,
  ProductFeaturesSyncMutationVariables,
  ProductFeaturesSyncProduct,
} from "../graphql";

interface SyncProductFeaturesResult {
  product: ProductFeaturesSyncProduct | null;
  features: ApiProductFeature[];
  userErrors: ApiGenericUserError[];
}

interface UseSyncProductFeaturesReturn {
  syncProductFeatures: (
    input: ApiProductFeaturesSyncInput,
  ) => Promise<SyncProductFeaturesResult>;
  loading: boolean;
  error: Error | null;
  reset: () => void;
}

export function useSyncProductFeatures(): UseSyncProductFeaturesReturn {
  const [syncProductFeaturesMutation, { loading, error, reset }] = useMutation<
    ProductFeaturesSyncMutationData,
    ProductFeaturesSyncMutationVariables
  >(PRODUCT_FEATURES_SYNC_MUTATION);

  const syncProductFeatures = useCallback(
    async (
      input: ApiProductFeaturesSyncInput,
    ): Promise<SyncProductFeaturesResult> => {
      try {
        const result = await syncProductFeaturesMutation({
          variables: { input },
        });

        const payload = result.data?.catalogMutation.productFeaturesSync;

        return {
          product: payload?.product ?? null,
          features: payload?.features ?? [],
          userErrors: payload?.userErrors ?? [],
        };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "An unexpected error occurred";

        return {
          product: null,
          features: [],
          userErrors: [{ message, code: "UNEXPECTED_ERROR" }],
        };
      }
    },
    [syncProductFeaturesMutation],
  );

  return {
    syncProductFeatures,
    loading,
    error: error ?? null,
    reset,
  };
}
