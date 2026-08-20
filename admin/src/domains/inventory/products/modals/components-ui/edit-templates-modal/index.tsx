"use client";

import { useState, useCallback } from "react";
import { useModalStackContext, ModalLayout, ModalHeader } from "@/layouts/modals";
import { TemplatesTab } from "./components";
import type { ApiProductComponentPricingTemplate } from "@/graphql/types";

// ============================================================================
// Payload
// ============================================================================

export interface IEditTemplatesModalPayload {
  pricingTemplates: ApiProductComponentPricingTemplate[];
  onSave?: (data: {
    pricingTemplates: ApiProductComponentPricingTemplate[];
  }) => boolean | void | Promise<boolean | void>;
}

// ============================================================================
// Component
// ============================================================================

export const EditTemplatesModal = () => {
  const { pop, forcePop, setDirty, payload } = useModalStackContext();

  const modalPayload = payload as unknown as IEditTemplatesModalPayload | undefined;

  const [pricingTemplates, setPricingTemplates] = useState<ApiProductComponentPricingTemplate[]>(
    modalPayload?.pricingTemplates ?? [],
  );
  const [saving, setSaving] = useState(false);

  const handlePricingTemplatesChange = useCallback(
    (templates: ApiProductComponentPricingTemplate[]) => {
      setPricingTemplates(templates);
      setDirty(true);
    },
    [setDirty],
  );

  const handleSave = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      const shouldClose = await modalPayload?.onSave?.({ pricingTemplates });
      if (shouldClose !== false) {
        setDirty(false);
        forcePop();
      }
    } finally {
      setSaving(false);
    }
  }, [forcePop, modalPayload, pricingTemplates, saving, setDirty]);

  return (
    <ModalLayout
      name="edit-component-templates"
      header={
        <ModalHeader
          name="edit-component-templates"
          title="Edit Pricing Templates"
          onClose={pop}
          submitButtonProps={{
            children: "Save",
            onClick: handleSave,
            loading: saving,
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
