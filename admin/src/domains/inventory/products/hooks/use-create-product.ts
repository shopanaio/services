"use client";

import { useMutation } from "@apollo/client/react";
import { useCallback } from "react";
import { PRODUCT_CREATE_MUTATION, PRODUCTS_QUERY } from "../graphql";
import type { ApiGenericUserError, ApiProduct } from "@/graphql/types";
import {
  prepareProductPayload,
  type CreateProductInput,
} from "../mappers";
import type {
  ProductCreateMutationData,
  ProductCreateMutationVariables,
} from "../graphql/operation-types";

export type { CreateProductInput };

interface CreateProductResult {
  product: ApiProduct | null;
  userErrors: ApiGenericUserError[];
}

interface UseCreateProductReturn {
  createProduct: (input: CreateProductInput) => Promise<CreateProductResult>;
  loading: boolean;
  error: Error | null;
  reset: () => void;
}

// ============================================
// Hook
// ============================================

/**
 * Hook for creating a new product with all its data in a single API call.
 *
 * Media files should already be uploaded before calling this hook.
 * The hook accepts media IDs of already uploaded files.
 *
 * @example
 * ```tsx
 * const { createProduct, loading } = useCreateProduct();
 *
 * const handleSubmit = async (data) => {
 *   const { product, userErrors } = await createProduct({
 *     title: data.title,
 *     handle: data.handle,
 *     description: data.description,
 *     media: data.media, // Already uploaded media with IDs
 *     hasVariants: data.hasVariants,
 *     options: data.options,
 *     variants: data.variants,
 *   });
 *
 *   if (userErrors.length > 0) {
 *     // Handle validation errors
 *   } else if (product) {
 *     // Product created successfully
 *   }
 * };
 * ```
 */
export function useCreateProduct(): UseCreateProductReturn {
  const [createProductMutation, { loading, error, reset }] = useMutation<
    ProductCreateMutationData,
    ProductCreateMutationVariables
  >(PRODUCT_CREATE_MUTATION);

  const createProduct = useCallback(
    async (input: CreateProductInput): Promise<CreateProductResult> => {
      try {
        const payload = prepareProductPayload(input);

        const createResult = await createProductMutation({
          variables: {
            input: payload,
          },
          refetchQueries: [
            {
              query: PRODUCTS_QUERY,
              variables: { first: 20, after: null, last: null, before: null },
            },
          ],
          awaitRefetchQueries: true,
        });

        const createPayload =
          createResult.data?.catalogMutation.productCreate;

        if (createPayload?.userErrors && createPayload.userErrors.length > 0) {
          return {
            product: null,
            userErrors: createPayload.userErrors,
          };
        }

        return {
          product: createPayload?.product ?? null,
          userErrors: [],
        };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "An unexpected error occurred";

        return {
          product: null,
          userErrors: [{ message: errorMessage, code: "UNEXPECTED_ERROR" }],
        };
      }
    },
    [createProductMutation]
  );

  return {
    createProduct,
    loading,
    error: error ?? null,
    reset,
  };
}
