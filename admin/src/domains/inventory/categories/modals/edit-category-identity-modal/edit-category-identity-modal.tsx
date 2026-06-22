"use client";

import { App } from "antd";
import { useModalStackContext } from "@/layouts/modals";
import { EntityIdentityModal } from "@/domains/inventory/components/entity-edit-forms";
import { useUpdateCategory } from "../../hooks";
import {
  mapCategoryIdentityToUpdateInput,
  mapCategoryUserErrorsToFormErrors,
} from "../../mappers";
import type { ICategoryEditIdentityModalPayload } from "../../modals";

export const EditCategoryIdentityModal = () => {
  const { message } = App.useApp();
  const { payload, pop } = useModalStackContext();
  const typedPayload = payload as ICategoryEditIdentityModalPayload;
  const { category, onSaved } = typedPayload;
  const { updateCategory } = useUpdateCategory();

  return (
    <EntityIdentityModal
      name="edit-category-identity"
      title="Edit category identity"
      sectionTitle="Identity"
      initialValues={{
        title: category.name,
        handle: category.handle,
      }}
      primaryLabel="Name"
      primaryRequiredMessage="Name is required"
      primaryPlaceholder="Audio Equipment"
      primaryTestId="edit-category-identity-name-input"
      handleAddonBefore="/categories/"
      handlePlaceholder="audio-equipment"
      handleTestId="edit-category-identity-handle-input"
      handleHelpText="URL-friendly category identifier"
      onClose={pop}
      onSubmit={async (values, { setError }) => {
        const result = await updateCategory(
          category.id,
          mapCategoryIdentityToUpdateInput({
            name: values.title,
            handle: values.handle,
          }),
          category.revision,
        );

        if (result.errors.length > 0) {
          mapCategoryUserErrorsToFormErrors(result.errors).forEach((error) => {
            if (error.field === "name") {
              setError("title", { message: error.message });
            }
            if (error.field === "handle") {
              setError("handle", { message: error.message });
            }
          });
          message.error(result.errors[0].message);
          return false;
        }

        message.success("Category identity updated");
        await onSaved?.();
        return true;
      }}
    />
  );
};
