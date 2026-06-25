"use client";

import { useState, useCallback } from "react";
import {
  ModalLayout,
  ModalHeader,
  useModalStackContext,
} from "@/layouts/modals";
import { EntityPickerContent } from "./entity-picker-content";
import { variantPickerConfig } from "./configs/variant-picker-config";
import type { IPickableEntity } from "./types";

export interface IVariantPickerPayload {
  selectionMode?: "single" | "multi";
  initialSelection?: string[];
  excludeIds?: string[];
  maxSelection?: number;
  queryMeta?: {
    warehouseId?: string | null;
  };
  onConfirm: (entities: IPickableEntity[], ids: string[]) => void;
}

export function VariantPickerModal() {
  const { payload, forcePop } = useModalStackContext();
  const typedPayload = payload as unknown as IVariantPickerPayload;
  const {
    selectionMode = "multi",
    initialSelection = [],
    excludeIds = [],
    maxSelection,
    queryMeta,
    onConfirm,
  } = typedPayload;

  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelection);
  const [selectedEntities, setSelectedEntities] = useState<IPickableEntity[]>(
    [],
  );

  const handleSelectionChange = useCallback(
    (ids: string[], entities: IPickableEntity[]) => {
      setSelectedIds(ids);
      setSelectedEntities(entities);
    },
    [],
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
      name="variant-picker"
      bodyClassName="entity-picker-body"
      header={
        <ModalHeader
          name="variant-picker"
          title="Select Variants"
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
        config={variantPickerConfig}
        selectionMode={selectionMode}
        initialSelection={initialSelection}
        excludeIds={excludeIds}
        maxSelection={maxSelection}
        queryMeta={queryMeta}
        onSelectionChange={handleSelectionChange}
      />
    </ModalLayout>
  );
}
