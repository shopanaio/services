"use client";

import { useModalStackContext } from "@/layouts/modals";
import { EntityIdentityModal } from "@/domains/inventory/components/entity-edit-forms";
import type { IProductEditTitleModalPayload } from "../../modals";

export const EditTitleModal = () => {
  const { payload, pop } = useModalStackContext();
  const typedPayload = payload as IProductEditTitleModalPayload;

  return (
    <EntityIdentityModal
      name="edit-title"
      title="Edit Title"
      sectionTitle="Product Title"
      initialValues={{
        title: typedPayload.title || "",
        handle: typedPayload.handle || "",
      }}
      primaryLabel="Title"
      primaryRequiredMessage="Title is required"
      primaryPlaceholder="Product title"
      primaryTestId="edit-title-title-input"
      handleAddonBefore="/"
      handlePlaceholder="product-handle"
      handleTestId="edit-title-handle-input"
      handleHelpText="URL-friendly identifier for this product"
      onClose={pop}
      onSubmit={(values) => typedPayload.onSave?.(values)}
    />
  );
};
