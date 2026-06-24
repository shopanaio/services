"use client";

import { useCallback } from "react";
import { useMutation } from "@apollo/client/react";
import type {
  ApiGenericUserError,
  ApiOperationResult,
  ApiProduct,
  ApiProductUpdateInput,
} from "@/graphql/types";
import { PRODUCT_UPDATE_MUTATION } from "../graphql";
import type {
  ProductUpdateMutationData,
  ProductUpdateMutationVariables,
} from "../graphql/operation-types";
import { normalizeProductUpdateErrors } from "../mappers/product-errors.mapper";

interface UpdateProductInput {
  productId: string;
  operations: ApiProductUpdateInput;
  expectedRevision?: number | null;
}

interface UpdateProductResult {
  product: ApiProduct | null;
  operationResults: ApiOperationResult[];
  userErrors: ApiGenericUserError[];
  errors: ApiGenericUserError[];
}

interface UseUpdateProductReturn {
  updateProduct: (input: UpdateProductInput) => Promise<UpdateProductResult>;
  loading: boolean;
  error: Error | null;
  reset: () => void;
}

export function useUpdateProduct(): UseUpdateProductReturn {
  const [updateProductMutation, { loading, error, reset }] = useMutation<
    ProductUpdateMutationData,
    ProductUpdateMutationVariables
  >(PRODUCT_UPDATE_MUTATION);

  const updateProduct = useCallback(
    async (input: UpdateProductInput): Promise<UpdateProductResult> => {
      try {
        const result = await updateProductMutation({
          variables: {
            productId: input.productId,
            operations: input.operations,
            expectedRevision: input.expectedRevision ?? null,
          },
        });

        const payload = result.data?.catalogMutation.productUpdate;

        const operationResults = payload?.operationResults ?? [];
        const userErrors = payload?.userErrors ?? [];

        return {
          product: payload?.product ?? null,
          operationResults,
          userErrors,
          errors: normalizeProductUpdateErrors({
            operationResults,
            userErrors,
          }),
        };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "An unexpected error occurred";
        const userErrors = [{ message, code: "UNEXPECTED_ERROR" }];

        return {
          product: null,
          operationResults: [],
          userErrors,
          errors: userErrors,
        };
      }
    },
    [updateProductMutation],
  );

  return {
    updateProduct,
    loading,
    error: error ?? null,
    reset,
  };
}
