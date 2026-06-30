"use client";

import { App } from "antd";
import { useModalStackContext } from "@/layouts/modals";
import { EntitySeoModal } from "@/domains/inventory/components/entity-edit-forms";
import { useUpdateCategory } from "../../hooks";
import {
  mapCategorySeoToUpdateInput,
  mapCategoryUserErrorsToFormErrors,
} from "../../mappers";
import type { ICategoryEditSeoModalPayload } from "../../modals";

export const EditCategorySeoModal = () => {
  const { message } = App.useApp();
  const { payload, pop } = useModalStackContext();
  const typedPayload = payload as ICategoryEditSeoModalPayload;
  const { category, onSaved } = typedPayload;
  const { updateCategory } = useUpdateCategory();
  const categoryPath = category.path || category.handle;

  return (
    <EntitySeoModal
      name="edit-category-seo"
      title="Edit SEO"
      initialValues={{
        seoTitle: category.seo?.seoTitle ?? "",
        seoDescription: category.seo?.seoDescription ?? "",
        ogTitle: category.seo?.ogTitle ?? "",
        ogDescription: category.seo?.ogDescription ?? "",
        ogImage: category.seo?.ogImage ?? null,
      }}
      entityTitle={category.name}
      entitySlug={categoryPath}
      previewPath={`categories › ${categoryPath}`}
      baseUrl="shopana.store"
      metaTitleTestId="edit-category-seo-title-input"
      metaDescriptionTestId="edit-category-seo-description-input"
      ogTitleTestId="edit-category-seo-og-title-input"
      ogDescriptionTestId="edit-category-seo-og-description-input"
      onClose={pop}
      onSubmit={async (formValues, { setError }) => {
        const result = await updateCategory(
          category.id,
          mapCategorySeoToUpdateInput(formValues),
          category.revision,
        );

        if (result.errors.length > 0) {
          mapCategoryUserErrorsToFormErrors(result.errors).forEach((error) => {
            if (
              error.field === "seoTitle" ||
              error.field === "seoDescription" ||
              error.field === "ogTitle" ||
              error.field === "ogDescription" ||
              error.field === "ogImage"
            ) {
              setError(error.field, { message: error.message });
            }
          });
          message.error(result.errors[0].message);
          return false;
        }

        message.success("Category SEO updated");
        await onSaved?.();
        return true;
      }}
    />
  );
};
