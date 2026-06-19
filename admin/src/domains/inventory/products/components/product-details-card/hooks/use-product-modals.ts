"use client";

import { useCallback } from "react";
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
import type { ApiProduct } from "@/graphql/types";
import {
  getDefaultVariant,
  getProductMediaFiles,
  getProductVariants,
} from "../../../utils/api-product-display";

export const useProductModals = (product: ApiProduct) => {
  const { push: openProductModal } = useProductModal();
  const { push: openEditMediaModal } = useEditMediaModal();
  const { push: openEditOptionsModal } = useEditOptionsModal();
  const { push: openEditAttributesModal } = useEditAttributesModal();
  const { push: openEditSeoModal } = useEditSeoModal();
  const { push: openEditVariantsModal } = useEditVariantsModal();
  const { push: openEditCategoriesModal } = useEditCategoriesModal();
  const { push: openEditTagsModal } = useEditTagsModal();

  const handleOpenProductModal = useCallback(() => {
    openProductModal({ entityId: product.id });
  }, [product.id, openProductModal]);

  const handleEditMedia = useCallback(() => {
    const defaultVariant = getDefaultVariant(product);
    const mediaFiles = getProductMediaFiles(product);

    openEditMediaModal({
      productId: product.id,
      variantId: defaultVariant?.id,
      featured: mediaFiles[0] ?? null,
      gallery: mediaFiles,
      onSave: (
        media: Parameters<NonNullable<IEditMediaModalPayload["onSave"]>>[0],
      ) => {
        console.log("Saved media:", media);
      },
    });
  }, [product, openEditMediaModal]);

  const handleEditCategories = useCallback(() => {
    openEditCategoriesModal({
      productId: product.id,
      primaryCategoryId: product.categories[0]?.id ?? null,
      categoryIds: product.categories?.map((c) => c.id) || [],
      onSave: () => {
        console.log("Saved categories");
      },
    });
  }, [
    product.id,
    product.categories,
    openEditCategoriesModal,
  ]);

  const handleEditTags = useCallback(() => {
    openEditTagsModal({
      productId: product.id,
      selectedTagIds: product.tags?.map((t) => t.id) || [],
      onSave: (data: { tagIds: string[] }) => {
        console.log("Saved tags:", data);
      },
    });
  }, [product.id, product.tags, openEditTagsModal]);

  const handleEditOptions = useCallback(() => {
    openEditOptionsModal({ productId: product.id });
  }, [product.id, openEditOptionsModal]);

  const handleEditAttributes = useCallback(() => {
    openEditAttributesModal({ productId: product.id });
  }, [product.id, openEditAttributesModal]);

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
      onSave: (
        values: Parameters<NonNullable<IEditSeoModalPayload["onSave"]>>[0]
      ) => {
        console.log("Saved SEO:", values);
      },
    });
  }, [
    product.id,
    product.title,
    product.handle,
    product.seo,
    openEditSeoModal,
  ]);

  const handleEditVariants = useCallback(() => {
    openEditVariantsModal({
      productId: product.id,
      variants: getProductVariants(product),
      productOptions: product.options,
      onSave: (
        updated: Parameters<
          NonNullable<IEditVariantsModalPayload["onSave"]>
        >[0],
      ) => {
        console.log("Saved variants:", updated);
      },
    });
  }, [product, openEditVariantsModal]);

  return {
    openProductModal: handleOpenProductModal,
    editMedia: handleEditMedia,
    editCategories: handleEditCategories,
    editTags: handleEditTags,
    editOptions: handleEditOptions,
    editAttributes: handleEditAttributes,
    editSeo: handleEditSeo,
    editVariants: handleEditVariants,
  };
};
