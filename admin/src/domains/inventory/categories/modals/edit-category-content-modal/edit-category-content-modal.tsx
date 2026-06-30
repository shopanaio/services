"use client";

import { App } from "antd";
import type { OutputData } from "@editorjs/editorjs";
import { useModalStackContext } from "@/layouts/modals";
import { EntityContentModal } from "@/domains/inventory/components/entity-edit-forms";
import { useUpdateCategory } from "../../hooks";
import { mapCategoryContentToUpdateInput } from "../../mappers";
import type { ICategoryEditContentModalPayload } from "../../modals";

function parseEditorData(json: unknown): OutputData | null {
  if (!json) return null;

  try {
    if (typeof json === "string") {
      return JSON.parse(json) as OutputData;
    }
    return json as OutputData;
  } catch {
    return null;
  }
}

export const EditCategoryContentModal = () => {
  const { message } = App.useApp();
  const { payload, pop } = useModalStackContext();
  const typedPayload = payload as ICategoryEditContentModalPayload;
  const { category, onSaved } = typedPayload;
  const { updateCategory } = useUpdateCategory();

  return (
    <EntityContentModal
      name="edit-category-content"
      title="Edit category content"
      initialValues={{
        description: parseEditorData(category.description?.json),
        excerpt: parseEditorData(category.excerpt?.json),
      }}
      descriptionPlaceholder="Write category description..."
      excerptPlaceholder="Write a short category excerpt..."
      descriptionTestId="edit-category-content-description-editor"
      excerptTestId="edit-category-content-excerpt-editor"
      onClose={pop}
      onSubmit={async (values) => {
        const result = await updateCategory(
          category.id,
          mapCategoryContentToUpdateInput(values),
          category.revision,
        );

        if (result.errors.length > 0) {
          message.error(result.errors[0].message);
          return false;
        }

        message.success("Category content updated");
        await onSaved?.();
        return true;
      }}
    />
  );
};
