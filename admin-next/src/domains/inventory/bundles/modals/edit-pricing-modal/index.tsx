"use client";

import { useState, useCallback } from "react";
import {
  useModalStackContext,
  ModalLayout,
  ModalHeader,
} from "@/layouts/modals";
import { PricingRulesTab } from "./components";
import type {
  PricingRuleTemplate,
  IDependencyRule,
  IComponentGroup,
} from "@/domains/inventory/products/modals/edit-components-modal/types";

// ============================================================================
// Payload
// ============================================================================

export interface IEditPricingModalPayload {
  pricingTemplates: PricingRuleTemplate[];
  dependencyRules: IDependencyRule[];
  groups: IComponentGroup[];
  onSave?: (data: {
    pricingTemplates: PricingRuleTemplate[];
    dependencyRules: IDependencyRule[];
  }) => void;
}

// ============================================================================
// Component
// ============================================================================

export const EditPricingModal = () => {
  const { pop, setDirty, payload } = useModalStackContext();

  const modalPayload = payload as unknown as IEditPricingModalPayload | undefined;

  const [pricingTemplates, setPricingTemplates] = useState<PricingRuleTemplate[]>(
    modalPayload?.pricingTemplates ?? []
  );
  const [dependencyRules, setDependencyRules] = useState<IDependencyRule[]>(
    modalPayload?.dependencyRules ?? []
  );
  const groups = modalPayload?.groups ?? [];

  const handlePricingTemplatesChange = useCallback(
    (templates: PricingRuleTemplate[]) => {
      setPricingTemplates(templates);
      setDirty(true);
    },
    [setDirty]
  );

  const handleDependencyRulesChange = useCallback(
    (rules: IDependencyRule[]) => {
      setDependencyRules(rules);
      setDirty(true);
    },
    [setDirty]
  );

  const handleSave = useCallback(() => {
    modalPayload?.onSave?.({ pricingTemplates, dependencyRules });
    pop();
  }, [pricingTemplates, dependencyRules, modalPayload, pop]);

  return (
    <ModalLayout
      name="edit-bundle-pricing"
      header={
        <ModalHeader
          name="edit-bundle-pricing"
          title="Edit Pricing & Rules"
          onClose={pop}
          submitButtonProps={{
            children: "Save",
            onClick: handleSave,
          }}
        />
      }
    >
      <PricingRulesTab
        pricingTemplates={pricingTemplates}
        onPricingTemplatesChange={handlePricingTemplatesChange}
        dependencyRules={dependencyRules}
        onDependencyRulesChange={handleDependencyRulesChange}
        groups={groups}
      />
    </ModalLayout>
  );
};

export default EditPricingModal;
