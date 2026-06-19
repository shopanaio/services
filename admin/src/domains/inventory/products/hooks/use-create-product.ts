"use client";

import { useMutation } from "@apollo/client/react";
import { useCallback, useState } from "react";
import { PRODUCT_CREATE_MUTATION } from "../../graphql";
import type { ApiProduct, ApiGenericUserError, ApiProductCreateInput } from "@/graphql/types";
import {
  prepareProductPayload,
  type CreateProductInput,
} from "../modals/create-product-modal/utils/prepare-product-payload";

export type { CreateProductInput };

interface CreateProductResult {
  product: ApiProduct | null;
  userErrors: ApiGenericUserError[];
}

interface UseCreateProductReturn {
  createProduct: (input: CreateProductInput) => Promise<CreateProductResult>;
  loading: boolean;
  error: Error | null;
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const [createProductMutation] = useMutation<
    {
      catalogMutation: {
        productCreate: {
          product: ApiProduct | null;
          userErrors: ApiGenericUserError[];
        };
      };
    },
    { input: ApiProductCreateInput }
  >(PRODUCT_CREATE_MUTATION);

  const createProduct = useCallback(
    async (input: CreateProductInput): Promise<CreateProductResult> => {
      setLoading(true);
      setError(null);

      try {
        const payload = prepareProductPayload(input);

        const createResult = await createProductMutation({
          variables: {
            input: payload,
          },
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
        setError(err instanceof Error ? err : new Error(errorMessage));

        return {
          product: null,
          userErrors: [{ message: errorMessage, code: "UNEXPECTED_ERROR" }],
        };
      } finally {
        setLoading(false);
      }
    },
    [createProductMutation]
  );

  return {
    createProduct,
    loading,
    error,
  };
}
