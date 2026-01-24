"use client";

import { useState, useCallback } from "react";
import {
  useModalStackContext,
  ModalLayout,
  ModalHeader,
} from "@/layouts/modals";
import { TemplatesTab } from "./components";
import type {
  PricingRuleTemplate,
} from "@/domains/inventory/bundles/types";

// ============================================================================
// Payload
// ============================================================================

export interface IEditTemplatesModalPayload {
  pricingTemplates: PricingRuleTemplate[];
  onSave?: (data: { pricingTemplates: PricingRuleTemplate[] }) => void;
}

// ============================================================================
// Component
// ============================================================================

export const EditTemplatesModal = () => {
  const { pop, setDirty, payload } = useModalStackContext();

  const modalPayload = payload as unknown as IEditTemplatesModalPayload | undefined;

  const [pricingTemplates, setPricingTemplates] = useState<PricingRuleTemplate[]>(
    modalPayload?.pricingTemplates ?? []
  );

  const handlePricingTemplatesChange = useCallback(
    (templates: PricingRuleTemplate[]) => {
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
