"use client";

import { useCallback } from "react";
import { useMutation } from "@apollo/client/react";
import type {
  ApiGenericUserError,
  ApiProduct,
} from "@/graphql/types";
import { ProductStatus } from "@/graphql/types";
import { PRODUCT_UPDATE_MUTATION } from "../graphql";
import type {
  ProductUpdateMutationData,
  ProductUpdateMutationVariables,
} from "../graphql/operation-types";

export interface ProductStatusUpdateInput {
  productId: string;
  published: boolean;
  expectedRevision?: number | null;
}

interface UpdateProductStatusResult {
  product: ApiProduct | null;
  userErrors: ApiGenericUserError[];
}

interface UseUpdateProductStatusReturn {
  updateProductStatus: (
    input: ProductStatusUpdateInput,
  ) => Promise<UpdateProductStatusResult>;
  loading: boolean;
  error: Error | null;
  reset: () => void;
}

export function useUpdateProductStatus(): UseUpdateProductStatusReturn {
  const [updateStatusMutation, { loading, error, reset }] = useMutation<
    ProductUpdateMutationData,
    ProductUpdateMutationVariables
  >(PRODUCT_UPDATE_MUTATION);

  const updateProductStatus = useCallback(
    async (
      input: ProductStatusUpdateInput,
    ): Promise<UpdateProductStatusResult> => {
      try {
        const result = await updateStatusMutation({
          variables: {
            productId: input.productId,
            expectedRevision: input.expectedRevision ?? undefined,
            operations: {
              status: input.published
                ? ProductStatus.Published
                : ProductStatus.Draft,
            },
          },
        });

        const payload = result.data?.catalogMutation.productUpdate;

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
