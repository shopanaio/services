"use client";

import { useCallback } from "react";
import { App } from "antd";
import {
  useProductModal,
  useEditMediaModal,
  useEditOptionsModal,
  useEditAttributesModal,
  useEditSeoModal,
  useEditVariantsModal,
  useEditCategoriesModal,
  useEditTagsModal,
  type IEditMediaModalPayload,
  type IEditSeoModalPayload,
  type IEditVariantsModalPayload,
} from "../../../modals";
import type {
  ApiProduct,
  ApiProductUpdateInput,
  CurrencyCode,
} from "@/graphql/types";
import {
  useProductVariantsLoader,
  useUpdateProduct,
} from "../../../hooks";
import { getProductMediaFiles } from "../../../utils/api-product-display";

interface UseProductModalsOptions {
  onProductRefresh?: () => Promise<unknown>;
  defaultCurrency?: CurrencyCode | null;
}

export const useProductModals = (
  product: ApiProduct,
  options: UseProductModalsOptions = {},
) => {
  const { message } = App.useApp();
  const { updateProduct } = useUpdateProduct();
  const { push: openProductModal } = useProductModal();
  const { push: openEditMediaModal } = useEditMediaModal();
  const { push: openEditOptionsModal } = useEditOptionsModal();
  const { push: openEditAttributesModal } = useEditAttributesModal();
  const { push: openEditSeoModal } = useEditSeoModal();
  const { push: openEditVariantsModal } = useEditVariantsModal();
  const { push: openEditCategoriesModal } = useEditCategoriesModal();
  const { push: openEditTagsModal } = useEditTagsModal();
  const {
    loadAllProductVariants,
    loading: isEditVariantsLoading,
  } = useProductVariantsLoader();

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

  const handleEditCategories = useCallback(() => {
    openEditCategoriesModal({
      productId: product.id,
      primaryCategoryId: product.categories[0]?.id ?? null,
      categoryIds: product.categories?.map((c) => c.id) || [],
      onSave: () => {
        message.info("Category assignment is not API-backed yet");
        return false;
      },
    });
  }, [
    message,
    product.id,
    product.categories,
    openEditCategoriesModal,
  ]);

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

  const handleEditVariants = useCallback(async () => {
    if (isEditVariantsLoading) {
      return;
    }

    try {
      const variants = await loadAllProductVariants(product);

      openEditVariantsModal({
        productId: product.id,
        variants,
        productOptions: product.options,
        defaultCurrency: options.defaultCurrency ?? null,
        onSave: (
          updated: Parameters<
            NonNullable<IEditVariantsModalPayload["onSave"]>
          >[0],
        ) => {
          void updated;
          message.info("Variant save is read-only in this integration");
          return false;
        },
      });
    } catch (err) {
      message.error(
        err instanceof Error
          ? err.message
          : "Product variants could not be loaded",
      );
    }
  }, [
    isEditVariantsLoading,
    loadAllProductVariants,
    message,
    options.defaultCurrency,
    product,
    openEditVariantsModal,
  ]);

  return {
    openProductModal: handleOpenProductModal,
    editMedia: handleEditMedia,
    editCategories: handleEditCategories,
    editTags: handleEditTags,
    editOptions: handleEditOptions,
    editAttributes: handleEditAttributes,
    editSeo: handleEditSeo,
    editVariants: handleEditVariants,
    isEditVariantsLoading,
  };
};
