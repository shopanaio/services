"use client";

import { useMutation } from "@apollo/client/react";
import { useCallback, useState } from "react";
import { slugify } from "transliteration/dist/node/src/node/index.js";
import { PRODUCT_CREATE_MUTATION } from "../../graphql";
import type {
  ApiProduct,
  ApiGenericUserError,
  ApiProductCreateInput,
  ApiFile,
} from "@/graphql/types";

// ============================================
// Types
// ============================================

interface IOptionInput {
  id: string;
  name: string;
  values: Array<{
    value: string;
    slug: string;
  }>;
}

interface IGeneratedVariant {
  id: string;
  title: string;
  options: Array<{ name: string; value: string; slug: string }>;
  enabled: boolean;
}

export interface CreateProductInput {
  title: string;
  handle: string;
  description: string;
  media: ApiFile[];
  hasVariants: boolean;
  options: IOptionInput[];
  variants: IGeneratedVariant[];
}

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
      inventoryMutation: {
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
        // Get media file IDs (already uploaded)
        const mediaFileIds = input.media.map((m) => m.id);

        const enabledVariants = input.variants.filter((v) => v.enabled);

        const createResult = await createProductMutation({
          variables: {
            input: {
              title: input.title,
              handle: input.handle,
              description: input.description
                ? {
                    text: input.description,
                    html: `<p>${input.description}</p>`,
                    json: {},
                  }
                : undefined,
              mediaFileIds: mediaFileIds.length > 0 ? mediaFileIds : undefined,
              options:
                input.hasVariants && input.options.length > 0
                  ? input.options
                      .filter((opt) => opt.name.trim() && opt.values.length > 0)
                      .map((opt) => ({
                        name: opt.name,
                        slug: slugify(opt.name),
                        values: opt.values.map((v) => ({
                          name: v.value,
                          slug: v.slug,
                        })),
                      }))
                  : undefined,
              variants:
                input.hasVariants && enabledVariants.length > 0
                  ? enabledVariants.map((v) => ({
                      handle: v.id, // id is built from option value slugs (e.g., "red-s")
                    }))
                  : undefined,
            },
          },
        });

        const createPayload =
          createResult.data?.inventoryMutation.productCreate;

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
