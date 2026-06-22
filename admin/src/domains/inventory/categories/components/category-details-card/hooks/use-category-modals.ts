"use client";

import { useCallback, useMemo } from "react";
import { App } from "antd";
import type { ApiCategory } from "@/graphql/types";
import { useCategoryPicker } from "@/shared/components/entity-picker-modal";
import {
  useUpdateCategory,
  useUpdateCategorySubcategories,
} from "../../../hooks";
import {
  useCategoryAssignProductsModal,
  useCategoryEditContentModal,
  useCategoryEditIdentityModal,
  useCategoryEditMediaModal,
  useCategoryEditSeoModal,
  useCategoryEditSortModal,
  useCategoryEditStatusModal,
} from "../../../modals";

export const useCategoryModals = (
  category: ApiCategory,
  onRefetch?: () => Promise<unknown>,
) => {
  const { message } = App.useApp();
  const { push: openEditIdentityModal } = useCategoryEditIdentityModal();
  const { push: openEditContentModal } = useCategoryEditContentModal();
  const { push: openEditSeoModal } = useCategoryEditSeoModal();
  const { push: openEditMediaModal } = useCategoryEditMediaModal();
  const { push: openEditSortModal } = useCategoryEditSortModal();
  const { push: openEditStatusModal } = useCategoryEditStatusModal();
  const { push: openAssignProductsModal } = useCategoryAssignProductsModal();
  const { updateCategory } = useUpdateCategory();
  const { updateSubcategories } = useUpdateCategorySubcategories();

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

  const editSort = useCallback(() => {
    openEditSortModal({ category, onSaved: handleSaved });
  }, [category, handleSaved, openEditSortModal]);

  const changeStatus = useCallback(() => {
    openEditStatusModal({ category, onSaved: handleSaved });
  }, [category, handleSaved, openEditStatusModal]);

  const assignProducts = useCallback(() => {
    openAssignProductsModal({ category, onSaved: handleSaved });
  }, [category, handleSaved, openAssignProductsModal]);

  const parentInitialSelection = useMemo(
    () => (category.parent?.id ? [category.parent.id] : []),
    [category.parent?.id],
  );
  const parentExcludeIds = useMemo(
    () => [category.id],
    [category.id],
  );
  const subcategoryExcludeIds = useMemo(
    () => [category.id, ...category.children.map((child) => child.id)],
    [category.children, category.id],
  );

  const { openPicker: editParent } = useCategoryPicker({
    selectionMode: "single",
    initialSelection: parentInitialSelection,
    excludeIds: parentExcludeIds,
    onConfirm: (_entities, selectedIds) => {
      void (async () => {
        const parentId = selectedIds[0];
        if (!parentId) {
          return;
        }

        const result = await updateCategory(
          category.id,
          {
            hierarchy: {
              parentId,
            },
          },
          category.revision,
        );

        if (result.errors.length > 0) {
          message.error(result.errors[0].message);
          return;
        }

        message.success("Parent updated");
        await handleSaved();
      })();
    },
  });

  const clearParent = useCallback(() => {
    if (!category.parent?.id) {
      return;
    }

    void (async () => {
      const result = await updateCategory(
        category.id,
        {
          hierarchy: {
            parentId: null,
          },
        },
        category.revision,
      );

      if (result.errors.length > 0) {
        message.error(result.errors[0].message);
        return;
      }

      message.success("Parent cleared");
      await handleSaved();
    })();
  }, [
    category.id,
    category.parent?.id,
    category.revision,
    handleSaved,
    message,
    updateCategory,
  ]);

  const { openPicker: editSubcategories } = useCategoryPicker({
    excludeIds: subcategoryExcludeIds,
    onConfirm: (_entities, selectedIds) => {
      void (async () => {
        const result = await updateSubcategories(category, selectedIds);

        if (result.errors.length > 0) {
          message.error(result.errors[0].message);
          return;
        }

        message.success("Subcategories added");
        await handleSaved();
      })();
    },
  });

  const removeSubcategory = useCallback(
    (subcategory: ApiCategory) => {
      void (async () => {
        const result = await updateCategory(subcategory.id, {
          hierarchy: {
            parentId: null,
          },
        });

        if (result.errors.length > 0) {
          message.error(result.errors[0].message);
          return;
        }

        message.success("Subcategory deleted");
        await handleSaved();
      })();
    },
    [handleSaved, message, updateCategory],
  );

  return {
    editIdentity,
    editContent,
    editMedia,
    editSeo,
    editParent,
    clearParent,
    editSort,
    changeStatus,
    editSubcategories,
    removeSubcategory,
    assignProducts,
  };
};
