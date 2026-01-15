"use client";

import { useMutation } from "@apollo/client/react";
import { useCallback, useState } from "react";
import {
  PRODUCT_CREATE_MUTATION,
  PRODUCT_UPDATE_MUTATION,
  PRODUCT_OPTION_CREATE_MUTATION,
  VARIANT_SET_MEDIA_MUTATION,
  FILE_UPLOAD_MUTATION,
} from "../../graphql";
import type {
  ApiProduct,
  ApiGenericUserError,
  ApiProductUpdateInput,
  ApiProductOptionCreateInput,
  ApiVariantSetMediaInput,
  ApiFileUploadMultipartInput,
  ApiFile,
  OptionDisplayType,
} from "@/graphql/types";

// ============================================
// Types
// ============================================

interface ILocalMediaItem {
  id: string;
  file: File;
  url: string;
  name: string;
  size: number;
  isFeatured: boolean;
}

interface IOptionInput {
  id: string;
  name: string;
  values: Array<{
    value: string;
    slug: string;
  }>;
}

export interface CreateProductInput {
  title: string;
  handle: string;
  description: string;
  media: ILocalMediaItem[];
  hasVariants: boolean;
  options: IOptionInput[];
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
 * Hook for creating a new product with all its data.
 * Orchestrates the multi-step creation process:
 * 1. Create empty product
 * 2. Update with title, handle, description
 * 3. Upload media files
 * 4. Associate media with default variant
 * 5. Create options (which auto-creates variants)
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
 *     media: data.media,
 *     hasVariants: data.hasVariants,
 *     options: data.options,
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

  // Mutations
  const [createProductMutation] = useMutation<{
    inventoryMutation: {
      productCreate: {
        product: {
          id: string;
          variants: {
            edges: Array<{
              node: {
                id: string;
                isDefault: boolean;
              };
            }>;
          };
        } | null;
        userErrors: ApiGenericUserError[];
      };
    };
  }>(PRODUCT_CREATE_MUTATION);

  const [updateProductMutation] = useMutation<
    {
      inventoryMutation: {
        productUpdate: {
          product: ApiProduct | null;
          userErrors: ApiGenericUserError[];
        };
      };
    },
    { input: ApiProductUpdateInput }
  >(PRODUCT_UPDATE_MUTATION);

  const [uploadFileMutation] = useMutation<
    {
      mediaMutation: {
        fileUpload: {
          file: ApiFile | null;
          userErrors: ApiGenericUserError[];
        };
      };
    },
    { input: ApiFileUploadMultipartInput }
  >(FILE_UPLOAD_MUTATION);

  const [setVariantMediaMutation] = useMutation<
    {
      inventoryMutation: {
        variantSetMedia: {
          variant: { id: string } | null;
          userErrors: ApiGenericUserError[];
        };
      };
    },
    { input: ApiVariantSetMediaInput }
  >(VARIANT_SET_MEDIA_MUTATION);

  const [createOptionMutation] = useMutation<
    {
      inventoryMutation: {
        productOptionCreate: {
          product: ApiProduct | null;
          userErrors: ApiGenericUserError[];
        };
      };
    },
    { input: ApiProductOptionCreateInput }
  >(PRODUCT_OPTION_CREATE_MUTATION);

  // Main create function
  const createProduct = useCallback(
    async (input: CreateProductInput): Promise<CreateProductResult> => {
      setLoading(true);
      setError(null);

      try {
        // Step 1: Create empty product
        const createResult = await createProductMutation();
        const createPayload =
          createResult.data?.inventoryMutation.productCreate;

        if (!createPayload?.product) {
          return {
            product: null,
            userErrors: createPayload?.userErrors ?? [
              { message: "Failed to create product", code: "CREATE_FAILED" },
            ],
          };
        }

        const productId = createPayload.product.id;
        const defaultVariantId =
          createPayload.product.variants.edges.find((e) => e.node.isDefault)
            ?.node.id ?? createPayload.product.variants.edges[0]?.node.id;

        // Step 2: Update product with title, handle, description
        const updateResult = await updateProductMutation({
          variables: {
            input: {
              id: productId,
              title: input.title,
              handle: input.handle,
              description: input.description
                ? {
                    text: input.description,
                    html: `<p>${input.description}</p>`,
                    json: {},
                  }
                : undefined,
            },
          },
        });

        const updatePayload =
          updateResult.data?.inventoryMutation.productUpdate;

        if (updatePayload?.userErrors && updatePayload.userErrors.length > 0) {
          return {
            product: null,
            userErrors: updatePayload.userErrors,
          };
        }

        // Step 3: Upload media files
        if (input.media.length > 0 && defaultVariantId) {
          const uploadedFileIds: string[] = [];

          for (const mediaItem of input.media) {
            const uploadResult = await uploadFileMutation({
              variables: {
                input: {
                  file: mediaItem.file,
                },
              },
            });

            const uploadPayload =
              uploadResult.data?.mediaMutation.fileUpload;

            if (uploadPayload?.file?.id) {
              uploadedFileIds.push(uploadPayload.file.id);
            }
          }

          // Step 4: Associate media with default variant
          if (uploadedFileIds.length > 0) {
            await setVariantMediaMutation({
              variables: {
                input: {
                  variantId: defaultVariantId,
                  fileIds: uploadedFileIds,
                },
              },
            });
          }
        }

        // Step 5: Create options (if hasVariants)
        if (input.hasVariants && input.options.length > 0) {
          for (const option of input.options) {
            if (option.name.trim() && option.values.length > 0) {
              await createOptionMutation({
                variables: {
                  input: {
                    productId,
                    name: option.name,
                    slug: option.name.toLowerCase().replace(/\s+/g, "-"),
                    displayType: "DROPDOWN" as OptionDisplayType,
                    values: option.values.map((v) => ({
                      name: v.value,
                      slug: v.slug,
                    })),
                  },
                },
              });
            }
          }
        }

        return {
          product: updatePayload?.product ?? null,
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
    [
      createProductMutation,
      updateProductMutation,
      uploadFileMutation,
      setVariantMediaMutation,
      createOptionMutation,
    ]
  );

  return {
    createProduct,
    loading,
    error,
  };
}
