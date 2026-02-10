"use client";

import { useCallback } from "react";
import {
  useEditMediaModal,
  useEditSeoModal,
  useEditTagsModal,
  type IEditSeoModalPayload,
} from "@/domains/inventory/products/modals";
import type { ApiFile } from "@/graphql/types";
import type { ICategoryDetail } from "../types";

export const useCategoryModals = (category: ICategoryDetail) => {
  const { push: openEditMediaModal } = useEditMediaModal();
  const { push: openEditSeoModal } = useEditSeoModal();
  const { push: openEditTagsModal } = useEditTagsModal();

  const handleEditMedia = useCallback(() => {
    openEditMediaModal({
      productId: category.id,
      featured: category.featured,
      gallery: category.gallery,
      onSave: (media: { featured: ApiFile | null; gallery: ApiFile[] }) => {
        console.log("Saved category media:", media);
      },
    });
  }, [category.id, category.featured, category.gallery, openEditMediaModal]);

  const handleEditSeo = useCallback(() => {
    openEditSeoModal({
      productId: category.id,
      productTitle: category.title,
      productSlug: category.slug,
      seoTitle: category.seoTitle,
      seoDescription: category.seoDescription,
      onSave: (
        values: Parameters<NonNullable<IEditSeoModalPayload["onSave"]>>[0]
      ) => {
        console.log("Saved category SEO:", values);
      },
    });
  }, [
    category.id,
    category.title,
    category.slug,
    category.seoTitle,
    category.seoDescription,
    openEditSeoModal,
  ]);

  const handleEditTags = useCallback(() => {
    openEditTagsModal({
      productId: category.id,
      selectedTagIds: [],
      onSave: (data: { tagIds: string[] }) => {
        console.log("Saved category tags:", data);
      },
    });
  }, [category.id, openEditTagsModal]);

  const handleEditHierarchy = useCallback(() => {
    console.log("Edit hierarchy for category:", category.id);
  }, [category.id]);

  const handleAddSubcategory = useCallback(() => {
    console.log("Add subcategory to:", category.id);
  }, [category.id]);

  const handleOpenProductPicker = useCallback(() => {
    console.log("Open product picker for category:", category.id);
  }, [category.id]);

  const handleArchiveCategory = useCallback(() => {
    console.log("Archive category:", category.id);
  }, [category.id]);

  const handleDeleteCategory = useCallback(() => {
    console.log("Delete category:", category.id);
  }, [category.id]);

  return {
    editMedia: handleEditMedia,
    editSeo: handleEditSeo,
    editTags: handleEditTags,
    editHierarchy: handleEditHierarchy,
    addSubcategory: handleAddSubcategory,
    openProductPicker: handleOpenProductPicker,
    archiveCategory: handleArchiveCategory,
    deleteCategory: handleDeleteCategory,
  };
};
