"use client";

import { useState, useCallback } from "react";
import {
  useModalStackContext,
  ModalLayout,
  ModalHeader,
} from "@/layouts/modals";
import { TemplatesTab } from "./components";
import type { ApiProductComponentPricingTemplate } from "@/graphql/types";

// ============================================================================
// Payload
// ============================================================================

export interface IEditTemplatesModalPayload {
  pricingTemplates: ApiProductComponentPricingTemplate[];
  onSave?: (data: { pricingTemplates: ApiProductComponentPricingTemplate[] }) => void;
}

// ============================================================================
// Component
// ============================================================================

export const EditTemplatesModal = () => {
  const { pop, setDirty, payload } = useModalStackContext();

  const modalPayload = payload as unknown as IEditTemplatesModalPayload | undefined;

  const [pricingTemplates, setPricingTemplates] = useState<ApiProductComponentPricingTemplate[]>(
    modalPayload?.pricingTemplates ?? []
  );

  const handlePricingTemplatesChange = useCallback(
    (templates: ApiProductComponentPricingTemplate[]) => {
      setPricingTemplates(templates);
      setDirty(true);
    },
    [setDirty]
  );

  const handleSave = useCallback(() => {
    modalPayload?.onSave?.({ pricingTemplates });
    pop();
  }, [pricingTemplates, modalPayload, pop]);

  return (
    <ModalLayout
      name="edit-bundle-templates"
      header={
        <ModalHeader
          name="edit-bundle-templates"
          title="Edit Pricing Templates"
          onClose={pop}
          submitButtonProps={{
            children: "Save",
            onClick: handleSave,
          }}
        />
      }
    >
      <TemplatesTab
        pricingTemplates={pricingTemplates}
        onPricingTemplatesChange={handlePricingTemplatesChange}
      />
    </ModalLayout>
  );
};

export default EditTemplatesModal;
