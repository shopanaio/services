"use client";

import { useCallback } from "react";
import { useMutation } from "@apollo/client/react";
import type { ApiGenericUserError, ApiProductDeleteInput } from "@/graphql/types";
import { PRODUCT_DELETE_MUTATION, PRODUCTS_QUERY } from "../graphql";
import type {
  ProductDeleteMutationData,
  ProductDeleteMutationVariables,
} from "../graphql/operation-types";

interface DeleteProductResult {
  deletedProductId: string | null;
  userErrors: ApiGenericUserError[];
}

interface UseDeleteProductReturn {
  deleteProduct: (input: ApiProductDeleteInput) => Promise<DeleteProductResult>;
  loading: boolean;
  error: Error | null;
  reset: () => void;
}

export function useDeleteProduct(): UseDeleteProductReturn {
  const [deleteProductMutation, { loading, error, reset }] = useMutation<
    ProductDeleteMutationData,
    ProductDeleteMutationVariables
  >(PRODUCT_DELETE_MUTATION);

  const deleteProduct = useCallback(
    async (input: ApiProductDeleteInput): Promise<DeleteProductResult> => {
      try {
        const result = await deleteProductMutation({
          variables: { input },
          refetchQueries: [
            {
              query: PRODUCTS_QUERY,
              variables: { first: 20, after: null, last: null, before: null },
            },
          ],
        });

        const payload = result.data?.catalogMutation.productDelete;

        return {
          deletedProductId: payload?.deletedProductId ?? null,
          userErrors: payload?.userErrors ?? [],
        };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "An unexpected error occurred";

        return {
          deletedProductId: null,
          userErrors: [{ message, code: "UNEXPECTED_ERROR" }],
        };
      }
    },
    [deleteProductMutation],
  );

  return {
    deleteProduct,
    loading,
    error: error ?? null,
    reset,
  };
}
