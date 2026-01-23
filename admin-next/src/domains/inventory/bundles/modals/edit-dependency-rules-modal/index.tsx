"use client";

import { useState, useCallback } from "react";
import {
  useModalStackContext,
  ModalLayout,
  ModalHeader,
} from "@/layouts/modals";
import { DependencyRulesTab } from "./components";
import type {
  IDependencyRule,
  IComponentGroup,
} from "@/domains/inventory/products/modals/edit-components-modal/types";

// ============================================================================
// Payload
// ============================================================================

export interface IEditDependencyRulesModalPayload {
  dependencyRules: IDependencyRule[];
  groups: IComponentGroup[];
  onSave?: (data: { dependencyRules: IDependencyRule[] }) => void;
}

// ============================================================================
// Component
// ============================================================================

export const EditDependencyRulesModal = () => {
  const { pop, setDirty, payload } = useModalStackContext();

  const modalPayload = payload as unknown as IEditDependencyRulesModalPayload | undefined;

  const [dependencyRules, setDependencyRules] = useState<IDependencyRule[]>(
    modalPayload?.dependencyRules ?? []
  );
  const groups = modalPayload?.groups ?? [];

  const handleDependencyRulesChange = useCallback(
    (rules: IDependencyRule[]) => {
      setDependencyRules(rules);
      setDirty(true);
    },
    [setDirty]
  );

  const handleSave = useCallback(() => {
    modalPayload?.onSave?.({ dependencyRules });
    pop();
  }, [dependencyRules, modalPayload, pop]);

  return (
    <ModalLayout
      name="edit-bundle-dependency-rules"
      header={
        <ModalHeader
          name="edit-bundle-dependency-rules"
          title="Edit Dependency Rules"
          onClose={pop}
          submitButtonProps={{
            children: "Save",
            onClick: handleSave,
          }}
        />
      }
    >
      <DependencyRulesTab
        dependencyRules={dependencyRules}
        onDependencyRulesChange={handleDependencyRulesChange}
        groups={groups}
      />
    </ModalLayout>
  );
};

export default EditDependencyRulesModal;
