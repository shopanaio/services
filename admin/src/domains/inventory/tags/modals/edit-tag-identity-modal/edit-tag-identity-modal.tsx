"use client";

import { App } from "antd";
import { useModalStackContext } from "@/layouts/modals";
import { EntityIdentityModal } from "@/domains/inventory/components/entity-edit-forms";
import { useUpdateTag } from "../../hooks";
import {
  mapTagIdentityToUpdateInput,
  mapTagUserErrorsToFormErrors,
} from "../../mappers";
import type { ITagEditIdentityModalPayload } from "../../modals";

export const EditTagIdentityModal = () => {
  const { message } = App.useApp();
  const { payload, pop } = useModalStackContext();
  const typedPayload = payload as ITagEditIdentityModalPayload;
  const { tag, onSaved } = typedPayload;
  const { updateTag } = useUpdateTag();

  return (
    <EntityIdentityModal
      name="edit-tag-identity"
      title="Edit tag identity"
      sectionTitle="Identity"
      initialValues={{
        title: tag.name,
        handle: tag.handle,
      }}
      primaryLabel="Name"
      primaryRequiredMessage="Name is required"
      primaryPlaceholder="Summer essentials"
      primaryTestId="edit-tag-identity-name-input"
      handleAddonBefore="#"
      handlePlaceholder="summer-essentials"
      handleTestId="edit-tag-identity-handle-input"
      handleHelpText="URL-friendly tag identifier"
      onClose={pop}
      onSubmit={async (values, { setError }) => {
        const result = await updateTag(
          mapTagIdentityToUpdateInput(tag.id, {
            name: values.title,
            handle: values.handle,
          }),
        );

        if (result.userErrors.length > 0) {
          mapTagUserErrorsToFormErrors(result.userErrors).forEach((error) => {
            if (error.field === "name") {
              setError("title", { message: error.message });
            }
            if (error.field === "handle") {
              setError("handle", { message: error.message });
            }
          });
          message.error(result.userErrors[0].message);
          return false;
        }

        message.success("Tag identity updated");
        await onSaved?.();
        return true;
      }}
    />
  );
};
