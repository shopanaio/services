"use client";

import { useCallback } from "react";
import type { ApiCategory } from "@/graphql/types";
import {
  useCategoryAssignProductsModal,
  useCategoryEditContentModal,
  useCategoryEditHierarchyModal,
  useCategoryEditIdentityModal,
  useCategoryEditMediaModal,
  useCategoryEditSeoModal,
  useCategoryEditSortModal,
  useCategoryEditStatusModal,
  useCreateCategoryModal,
} from "../../../modals";

export const useCategoryModals = (
  category: ApiCategory,
  onRefetch?: () => Promise<unknown>,
) => {
  const { push: openEditIdentityModal } = useCategoryEditIdentityModal();
  const { push: openEditContentModal } = useCategoryEditContentModal();
  const { push: openEditSeoModal } = useCategoryEditSeoModal();
  const { push: openEditMediaModal } = useCategoryEditMediaModal();
  const { push: openEditHierarchyModal } = useCategoryEditHierarchyModal();
  const { push: openEditSortModal } = useCategoryEditSortModal();
  const { push: openEditStatusModal } = useCategoryEditStatusModal();
  const { push: openAssignProductsModal } = useCategoryAssignProductsModal();
  const { push: openCreateCategoryModal } = useCreateCategoryModal();

  const handleSaved = useCallback(async () => {
    await onRefetch?.();
  }, [onRefetch]);

  const editIdentity = useCallback(() => {
    openEditIdentityModal({ category, onSaved: handleSaved });
  }, [category, handleSaved, openEditIdentityModal]);

  const editContent = useCallback(() => {
    openEditContentModal({ category, onSaved: handleSaved });
  }, [category, handleSaved, openEditContentModal]);

  const editSeo = useCallback(() => {
    openEditSeoModal({ category, onSaved: handleSaved });
  }, [category, handleSaved, openEditSeoModal]);

  const editMedia = useCallback(() => {
    openEditMediaModal({ category, onSaved: handleSaved });
  }, [category, handleSaved, openEditMediaModal]);

  const editHierarchy = useCallback(() => {
    openEditHierarchyModal({ category, onSaved: handleSaved });
  }, [category, handleSaved, openEditHierarchyModal]);

  const editSort = useCallback(() => {
    openEditSortModal({ category, onSaved: handleSaved });
  }, [category, handleSaved, openEditSortModal]);

  const changeStatus = useCallback(() => {
    openEditStatusModal({ category, onSaved: handleSaved });
  }, [category, handleSaved, openEditStatusModal]);

  const assignProducts = useCallback(() => {
    openAssignProductsModal({ category, onSaved: handleSaved });
  }, [category, handleSaved, openAssignProductsModal]);

  const addSubcategory = useCallback(() => {
    openCreateCategoryModal({
      parentId: category.id,
      onCreated: () => {
        void handleSaved();
      },
    });
  }, [category.id, handleSaved, openCreateCategoryModal]);

  return {
    editIdentity,
    editContent,
    editMedia,
    editSeo,
    editHierarchy,
    editSort,
    changeStatus,
    addSubcategory,
    assignProducts,
  };
};
