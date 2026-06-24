"use client";

import { useState, useCallback } from "react";
import {
  ModalLayout,
  ModalHeader,
  useModalStackContext,
} from "@/layouts/modals";
import { EntityPickerContent } from "./entity-picker-content";
import { tagPickerConfig } from "./configs/tag-picker-config";
import type { IPickableEntity } from "./types";

export interface ITagPickerPayload {
  selectionMode?: "single" | "multi";
  initialSelection?: string[];
  excludeIds?: string[];
  maxSelection?: number;
  onConfirm: (entities: IPickableEntity[], ids: string[]) => void;
}

export function TagPickerModal() {
  const { payload, forcePop } = useModalStackContext();
  const typedPayload = payload as unknown as ITagPickerPayload;
  const {
    selectionMode = "multi",
    initialSelection = [],
    excludeIds = [],
    maxSelection,
    onConfirm,
  } = typedPayload;

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

  const confirmText =
    selectedIds.length > 0 ? `Confirm (${selectedIds.length})` : "Confirm";

  return (
    <ModalLayout
      name="tag-picker"
      bodyClassName="entity-picker-body"
      header={
        <ModalHeader
          name="tag-picker"
          title="Select Tags"
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
        config={tagPickerConfig}
        selectionMode={selectionMode}
        initialSelection={initialSelection}
        excludeIds={excludeIds}
        maxSelection={maxSelection}
        onSelectionChange={handleSelectionChange}
      />
    </ModalLayout>
  );
}
