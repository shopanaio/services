"use client";

import { useCallback, useMemo } from "react";
import { App } from "antd";
import {
  CategoryHierarchyScopeMode,
  CategoryStatus,
  type ApiCategory,
  type ApiProductProductsMetaInput,
} from "@/graphql/types";
import type { ApiCategoryCategoriesMetaInput } from "../../../graphql";
import { useModalStackContext } from "@/layouts/modals";
import {
  useCategoryPicker,
  useProductPicker,
} from "@/shared/components/entity-picker-modal";
import {
  useAddCategoryProduct,
  useDeleteCategory,
  useUpdateCategory,
  useUpdateCategorySubcategories,
} from "../../../hooks";
import {
  useCategoryEditContentModal,
  useCategoryEditIdentityModal,
  useCategoryEditMediaModal,
  useCategoryEditSeoModal,
  useCategoryEditSortModal,
} from "../../../modals";

export const useCategoryModals = (
  category: ApiCategory,
  onRefetch?: () => Promise<unknown>,
) => {
  const { message } = App.useApp();
  const { forcePop } = useModalStackContext();
  const { push: openEditIdentityModal } = useCategoryEditIdentityModal();
  const { push: openEditContentModal } = useCategoryEditContentModal();
  const { push: openEditSeoModal } = useCategoryEditSeoModal();
  const { push: openEditMediaModal } = useCategoryEditMediaModal();
  const { push: openEditSortModal } = useCategoryEditSortModal();
  const { updateCategory } = useUpdateCategory();
  const { deleteCategory } = useDeleteCategory();
  const { updateSubcategories } = useUpdateCategorySubcategories();
  const { addCategoryProduct } = useAddCategoryProduct();

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
    void (async () => {
      const nextStatus = category.isPublished
        ? CategoryStatus.Draft
        : CategoryStatus.Published;
      const result = await updateCategory(
        category.id,
        { status: nextStatus },
        category.revision,
      );

      if (result.errors.length > 0) {
        message.error(result.errors[0].message);
        return;
      }

      message.success(
        category.isPublished ? "Category unpublished" : "Category published",
      );
      await handleSaved();
    })();
  }, [
    category.id,
    category.isPublished,
    category.revision,
    handleSaved,
    message,
    updateCategory,
  ]);

  const archive = useCallback(() => {
    void (async () => {
      const result = await deleteCategory({
        id: category.id,
        permanent: false,
      });

      if (result.userErrors.length > 0) {
        message.error(result.userErrors[0].message);
        return;
      }

      message.success("Category archived");
      await handleSaved();
      forcePop();
    })();
  }, [category.id, deleteCategory, forcePop, handleSaved, message]);

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
  const safeParentCandidatesMeta = useMemo<ApiCategoryCategoriesMetaInput>(
    () => ({
      hierarchyScope: {
        referenceId: category.id,
        direction: "DESCENDANTS",
        includeReference: true,
        mode: "EXCLUDE",
      },
    }),
    [category.id],
  );
  const safeSubcategoryCandidatesMeta = useMemo<ApiCategoryCategoriesMetaInput>(
    () => ({
      hierarchyScope: {
        referenceId: category.id,
        direction: "ANCESTORS",
        includeReference: true,
        mode: "EXCLUDE",
      },
    }),
    [category.id],
  );
  const safeProductCandidatesMeta = useMemo<ApiProductProductsMetaInput>(
    () => ({
      categoriesScope: {
        referenceIds: [category.id],
        mode: CategoryHierarchyScopeMode.Exclude,
      },
    }),
    [category.id],
  );

  const { openPicker: editParent } = useCategoryPicker({
    selectionMode: "single",
    initialSelection: parentInitialSelection,
    excludeIds: parentExcludeIds,
    queryMeta: safeParentCandidatesMeta,
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
    queryMeta: safeSubcategoryCandidatesMeta,
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

  const { openPicker: assignProducts } = useProductPicker({
    selectionMode: "multi",
    queryMeta: safeProductCandidatesMeta,
    onConfirm: (_entities, selectedIds) => {
      void (async () => {
        for (const productId of selectedIds) {
          const result = await addCategoryProduct({
            categoryId: category.id,
            productId,
          });

          if (result.userErrors.length > 0) {
            message.error(result.userErrors[0].message);
            return;
          }
        }

        message.success("Category products updated");
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
    archive,
    editSubcategories,
    removeSubcategory,
    assignProducts,
  };
};
