"use client";

import { useState, useCallback } from "react";
import { ModalLayout, ModalHeader, useModalStackContext } from "@/layouts/modals";
import { EntityPickerContent } from "./entity-picker-content";
import { getEntityPickerConfig } from "./configs";
import type { IEntityPickerPayload, IPickableEntity } from "./types";

export function EntityPickerModal() {
  const { payload, forcePop } = useModalStackContext();
  const typedPayload = payload as unknown as IEntityPickerPayload;
  const {
    entityType,
    selectionMode = "multi",
    initialSelection = [],
    excludeIds = [],
    maxSelection,
    onConfirm,
  } = typedPayload;

  const config = getEntityPickerConfig(entityType);
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelection);
  const [selectedEntities, setSelectedEntities] = useState<IPickableEntity[]>(
    []
  );

  const handleSelectionChange = useCallback(
    (ids: string[], entities: IPickableEntity[]) => {
      setSelectedIds(ids);
      setSelectedEntities(entities);
    },
    []
  );

  const handleConfirm = useCallback(() => {
    onConfirm(selectedEntities, selectedIds);
    forcePop();
  }, [selectedEntities, selectedIds, onConfirm, forcePop]);

  const handleCancel = useCallback(() => {
    forcePop();
  }, [forcePop]);

  if (!config) {
    return (
      <ModalLayout
        name="entity-picker-error"
        header={
          <ModalHeader
            title="Error"
            onClose={handleCancel}
            submitButtonProps={null}
          />
        }
      >
        <div style={{ padding: 24 }}>Unknown entity type: {entityType}</div>
      </ModalLayout>
    );
  }

  const confirmText =
    selectedIds.length > 0 ? `Confirm (${selectedIds.length})` : "Confirm";

  return (
    <ModalLayout
      fullWidth
      name="entity-picker"
      bodyClassName="entity-picker-body"
      header={
        <ModalHeader
          title={`Select ${config.entityNamePlural}`}
          onClose={handleCancel}
          submitButtonProps={{
            onClick: handleConfirm,
            disabled: selectedIds.length === 0,
            children: confirmText,
          }}
        />
      }
    >
      <EntityPickerContent
        config={config}
        selectionMode={selectionMode}
        initialSelection={initialSelection}
        excludeIds={excludeIds}
        maxSelection={maxSelection}
        onSelectionChange={handleSelectionChange}
      />
    </ModalLayout>
  );
}
