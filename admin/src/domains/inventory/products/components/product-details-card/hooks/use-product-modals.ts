"use client";

import { useCallback, useState } from "react";
import { App } from "antd";
import { useApolloClient } from "@apollo/client/react";
import type { DocumentNode } from "graphql";
import {
  useProductModal,
  useEditMediaModal,
  useEditOptionsModal,
  useEditAttributesModal,
  useEditSeoModal,
  useEditVariantsModal,
  useEditTagsModal,
  type IEditMediaModalPayload,
  type IEditSeoModalPayload,
  type IEditVariantsModalPayload,
} from "../../../modals";
import type {
  ApiProduct,
  ApiProductUpdateInput,
  ApiVariantUpdateInput,
  CurrencyCode,
} from "@/graphql/types";
import {
  useProductVariantsLoader,
  useUpdateProduct,
} from "../../../hooks";
import { useDefaultWarehouse } from "../../../hooks/use-default-warehouse";
import { useEnsureVariantInventoryItems } from "../../../hooks/use-ensure-variant-inventory-items";
import {
  PRODUCT_PRICING_WIDGET_QUERY,
} from "../../../graphql";
import { prepareChangedVariantUpdateInputs } from "../../../mappers/product-variant-update.mapper";
import { getProductMediaFiles } from "../../../utils/api-product-display";

interface UseProductModalsOptions {
  onProductRefresh?: () => Promise<unknown>;
  defaultCurrency?: CurrencyCode | null;
}

const GENERAL_VARIANTS_EDITABLE_COLUMNS: NonNullable<
  IEditVariantsModalPayload["editableColumns"]
> = [
  "media",
  "price",
  "compareAtPrice",
  "weight",
  "length",
  "width",
  "height",
];

export const useProductModals = (
  product: ApiProduct,
  options: UseProductModalsOptions = {},
) => {
  const client = useApolloClient();
  const { message } = App.useApp();
  const { updateProduct } = useUpdateProduct();
  const { push: openProductModal } = useProductModal();
  const { push: openEditMediaModal } = useEditMediaModal();
  const { push: openEditOptionsModal } = useEditOptionsModal();
  const { push: openEditAttributesModal } = useEditAttributesModal();
  const { push: openEditSeoModal } = useEditSeoModal();
  const { push: openEditVariantsModal } = useEditVariantsModal();
  const { push: openEditTagsModal } = useEditTagsModal();
  const {
    loadAllProductVariants,
    loading: isEditVariantsLoading,
  } = useProductVariantsLoader();
  const {
    defaultWarehouse,
    refetch: refetchDefaultWarehouse,
  } = useDefaultWarehouse();
  const { ensureVariantInventoryItems } = useEnsureVariantInventoryItems();
  const [isPreparingEditVariants, setIsPreparingEditVariants] =
    useState(false);

  const handleOpenProductModal = useCallback(() => {
    openProductModal({ entityId: product.id });
  }, [product.id, openProductModal]);

  const handleEditMedia = useCallback(() => {
    const mediaFiles = getProductMediaFiles(product);

    openEditMediaModal({
      productId: product.id,
      featured: mediaFiles[0] ?? null,
      gallery: mediaFiles,
      onSave: async (
        media: Parameters<NonNullable<IEditMediaModalPayload["onSave"]>>[0],
      ) => {
        const operations: ApiProductUpdateInput = {
          media: {
            fileIds: media.gallery.map((file) => file.id),
          },
        };
        const result = await updateProduct({
          productId: product.id,
          expectedRevision: product.revision,
          operations,
        });

        if (result.errors.length > 0) {
          message.error(result.errors[0].message);
          return false;
        }

        message.success("Product media updated");
        return true;
      },
    });
  }, [message, product, openEditMediaModal, updateProduct]);

  const handleEditTags = useCallback(() => {
    openEditTagsModal({
      productId: product.id,
      selectedTagIds: product.tags?.map((t) => t.id) || [],
      onSave: () => {
        message.info("Tag assignment is not API-backed yet");
        return false;
      },
    });
  }, [message, product.id, product.tags, openEditTagsModal]);

  const handleEditOptions = useCallback(() => {
    openEditOptionsModal({
      productId: product.id,
      options: product.options,
      onSaved: options.onProductRefresh,
    });
  }, [
    product.id,
    product.options,
    options.onProductRefresh,
    openEditOptionsModal,
  ]);

  const handleEditAttributes = useCallback(() => {
    openEditAttributesModal({
      productId: product.id,
      features: product.features,
      onSaved: options.onProductRefresh,
    });
  }, [
    product.id,
    product.features,
    options.onProductRefresh,
    openEditAttributesModal,
  ]);

  const handleEditSeo = useCallback(() => {
    openEditSeoModal({
      productId: product.id,
      productTitle: product.title,
      productSlug: product.handle ?? product.id,
      seoTitle: product.seo?.seoTitle ?? null,
      seoDescription: product.seo?.seoDescription ?? null,
      ogTitle: product.seo?.ogTitle ?? null,
      ogDescription: product.seo?.ogDescription ?? null,
      ogImage: product.seo?.ogImage ?? null,
      onSave: async (
        values: Parameters<NonNullable<IEditSeoModalPayload["onSave"]>>[0]
      ) => {
        const result = await updateProduct({
          productId: product.id,
          expectedRevision: product.revision,
          operations: {
            seo: {
              seoTitle: values.seoTitle,
              seoDescription: values.seoDescription,
              ogTitle: values.ogTitle,
              ogDescription: values.ogDescription,
              ogImageId: values.ogImage?.id ?? null,
            },
          },
        });

        if (result.errors.length > 0) {
          message.error(result.errors[0].message);
          return false;
        }

        message.success("Product SEO updated");
        return true;
      },
    });
  }, [
    message,
    product.id,
    product.revision,
    product.title,
    product.handle,
    product.seo,
    openEditSeoModal,
    updateProduct,
  ]);

  const refreshAfterVariantSave = useCallback(
    async ({
      pricingChanged,
    }: {
      pricingChanged: boolean;
    }): Promise<boolean> => {
      const refreshes: Promise<unknown>[] = [
        loadAllProductVariants(product, { forceNetwork: true }),
      ];
      const include: DocumentNode[] = [];

      if (options.onProductRefresh) {
        refreshes.push(options.onProductRefresh());
      }

      if (pricingChanged) {
        include.push(PRODUCT_PRICING_WIDGET_QUERY);
      }

      if (include.length > 0) {
        refreshes.push(client.refetchQueries({ include }));
      }

      const refreshResults = await Promise.allSettled(refreshes);

      return refreshResults.every(
        (refreshResult) => refreshResult.status === "fulfilled",
      );
    },
    [
      client,
      loadAllProductVariants,
      options.onProductRefresh,
      product,
    ],
  );

  const handleEditVariants = useCallback(async () => {
    if (isPreparingEditVariants || isEditVariantsLoading) {
      return;
    }

    setIsPreparingEditVariants(true);

    try {
      const variants = await loadAllProductVariants(product);
      const hydratedVariants =
        await ensureVariantInventoryItems(variants);
      const resolvedDefaultWarehouse =
        defaultWarehouse ?? (await refetchDefaultWarehouse());

      if (!resolvedDefaultWarehouse) {
        message.error("Default warehouse is required to edit variants.");
        return;
      }

      openEditVariantsModal({
        productId: product.id,
        variants: hydratedVariants,
        productMediaFiles: getProductMediaFiles(product),
        productOptions: product.options,
        defaultCurrency: options.defaultCurrency ?? null,
        variantEditorScope: {
          type: "inventory",
          warehouseId: resolvedDefaultWarehouse.id,
        },
        editableColumns: GENERAL_VARIANTS_EDITABLE_COLUMNS,
        onSave: async (
          rows: Parameters<
            NonNullable<IEditVariantsModalPayload["onSave"]>
          >[0],
          additionalOperations?: ApiProductUpdateInput,
        ): Promise<boolean> => {
          let variantUpdates: ApiVariantUpdateInput[];

          try {
            variantUpdates = prepareChangedVariantUpdateInputs({
              rows,
              variants: hydratedVariants,
              warehouseId: resolvedDefaultWarehouse.id,
              defaultCurrency: options.defaultCurrency ?? null,
              includePricing: true,
              includeInventory: false,
              includeShipping: true,
              includeMedia: true,
            });
          } catch (err) {
            message.error(
              err instanceof Error
                ? err.message
                : "Variant changes are invalid.",
            );
            return false;
          }

          const operations: ApiProductUpdateInput = {
            ...additionalOperations,
            variants: [
              ...variantUpdates,
              ...(additionalOperations?.variants ?? []),
            ],
          };

          if (!operations.variants || operations.variants.length === 0) {
            message.info("No variant changes to save");
            return true;
          }

          const result = await updateProduct({
            productId: product.id,
            expectedRevision: product.revision,
            operations,
          });

          if (result.errors.length > 0) {
            message.error(
              result.errors[0].message ||
                "Variant changes could not be saved.",
            );
            return false;
          }

          const pricingChanged = variantUpdates.some(
            (update) => !!update.pricing,
          );
          const refreshSucceeded = await refreshAfterVariantSave({
            pricingChanged,
          });

          if (refreshSucceeded) {
            message.success("Variant changes saved");
          } else {
            message.warning("Variant changes saved, but refresh failed");
          }

          return true;
        },
      });
    } catch (err) {
      message.error(
        err instanceof Error
          ? err.message
          : "Product variants could not be loaded",
      );
    } finally {
      setIsPreparingEditVariants(false);
    }
  }, [
    defaultWarehouse,
    ensureVariantInventoryItems,
    isEditVariantsLoading,
    isPreparingEditVariants,
    loadAllProductVariants,
    message,
    options.defaultCurrency,
    product,
    openEditVariantsModal,
    refetchDefaultWarehouse,
    refreshAfterVariantSave,
    updateProduct,
  ]);

  return {
    openProductModal: handleOpenProductModal,
    editMedia: handleEditMedia,
    editTags: handleEditTags,
    editOptions: handleEditOptions,
    editAttributes: handleEditAttributes,
    editSeo: handleEditSeo,
    editVariants: handleEditVariants,
    isEditVariantsLoading: isEditVariantsLoading || isPreparingEditVariants,
  };
};
