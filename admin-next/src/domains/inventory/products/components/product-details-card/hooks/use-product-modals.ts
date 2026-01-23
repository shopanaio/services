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
  useEditBundleItemsModal,
  type IEditSeoModalPayload,
} from "../../../modals";
import type { IProduct, IMediaFile } from "@/mocks/products/types";
import type { IBundleGroup, PricingRuleTemplate, IDependencyRule } from "../../../modals/edit-components-modal/types";

interface IUseProductModalsOptions {
  bundleItems?: IBundleGroup[];
  pricingTemplates?: PricingRuleTemplate[];
  dependencyRules?: IDependencyRule[];
}

export const useProductModals = (product: IProduct, options: IUseProductModalsOptions = {}) => {
  const { push: openProductModal } = useProductModal();
  const { push: openEditMediaModal } = useEditMediaModal();
  const { push: openEditOptionsModal } = useEditOptionsModal();
  const { push: openEditAttributesModal } = useEditAttributesModal();
  const { push: openEditSeoModal } = useEditSeoModal();
  const { push: openEditVariantsModal } = useEditVariantsModal();
  const { push: openEditCategoriesModal } = useEditCategoriesModal();
  const { push: openEditTagsModal } = useEditTagsModal();
  const { push: openEditBundleItemsModal } = useEditBundleItemsModal();

  const handleOpenProductModal = useCallback(() => {
    openProductModal({ entityId: product.id });
  }, [product.id, openProductModal]);

  const handleEditMedia = useCallback(() => {
    openEditMediaModal({
      productId: product.id,
      featured: product.featured,
      gallery: product.gallery,
      onSave: (media: { featured: IMediaFile | null; gallery: IMediaFile[] }) => {
        console.log("Saved media:", media);
      },
    });
  }, [product.id, product.featured, product.gallery, openEditMediaModal]);

  const handleEditCategories = useCallback(() => {
    openEditCategoriesModal({
      productId: product.id,
      primaryCategoryId: product.primaryCategory?.id ?? null,
      categoryIds: product.categories?.map((c) => c.id) || [],
      onSave: () => {
        console.log("Saved categories");
      },
    });
  }, [
    product.id,
    product.primaryCategory?.id,
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

  const handleEditBundleItems = useCallback(() => {
    openEditBundleItemsModal({
      productId: product.id,
      groups: options.bundleItems,
      pricingTemplates: options.pricingTemplates,
      dependencyRules: options.dependencyRules,
    });
  }, [product.id, options.bundleItems, options.pricingTemplates, options.dependencyRules, openEditBundleItemsModal]);

  const handleEditSeo = useCallback(() => {
    openEditSeoModal({
      productId: product.id,
      productTitle: product.title,
      productSlug: product.slug,
      seoTitle: product.seoTitle,
      seoDescription: product.seoDescription,
      onSave: (
        values: Parameters<NonNullable<IEditSeoModalPayload["onSave"]>>[0]
      ) => {
        console.log("Saved SEO:", values);
      },
    });
  }, [
    product.id,
    product.title,
    product.slug,
    product.seoTitle,
    product.seoDescription,
    openEditSeoModal,
  ]);

  const handleEditVariants = useCallback(() => {
    openEditVariantsModal({
      productId: product.id,
      variants:
        product.variants?.map((v) => ({
          id: v.id,
          title:
            v.title ||
            v.options?.map((o) => o.title).join(" / ") ||
            v.sku ||
            v.id,
          imageUrl: v.gallery?.[0]?.url || null,
          media: v.gallery?.map((m) => m.url) || null,
          sku: v.sku,
          stock: Math.floor(Math.random() * 100),
          barcode: null,
          price: v.price,
          compareAtPrice: v.oldPrice || null,
          costPrice: v.costPrice || null,
          weight: v.weight,
          weightUnit: v.weightUnit,
          length: v.length,
          width: v.width,
          height: v.height,
          dimensionUnit: v.dimensionUnit,
          options: v.options?.map((opt) => ({
            title: opt.title,
            group: {
              slug: opt.group.slug,
              title: opt.group.title,
            },
          })),
        })) || [],
      onSave: (
        updated: Array<{
          id: string;
          sku: string | null;
          stock: number;
          barcode: string | null;
          price: number;
          compareAtPrice: number | null;
          costPrice: number | null;
          weight: number | null;
          weightUnit: string;
          length: number | null;
          width: number | null;
          height: number | null;
          dimensionUnit: string;
        }>
      ) => {
        console.log("Saved variants:", updated);
      },
    });
  }, [product.id, product.variants, openEditVariantsModal]);

  return {
    openProductModal: handleOpenProductModal,
    editMedia: handleEditMedia,
    editCategories: handleEditCategories,
    editTags: handleEditTags,
    editOptions: handleEditOptions,
    editAttributes: handleEditAttributes,
    editBundleItems: handleEditBundleItems,
    editSeo: handleEditSeo,
    editVariants: handleEditVariants,
  };
};
