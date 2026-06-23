"use client";

import { useState, useCallback } from "react";
import {
  ModalLayout,
  ModalHeader,
  useModalStackContext,
} from "@/layouts/modals";
import { EntityPickerContent } from "./entity-picker-content";
import { categoryPickerConfig } from "./configs/category-picker-config";
import type { IPickableEntity } from "./types";
import type { ApiCategoryCategoriesMetaInput } from "@/domains/inventory/categories/graphql";

export interface ICategoryPickerPayload {
  selectionMode?: "single" | "multi";
  initialSelection?: string[];
  excludeIds?: string[];
  maxSelection?: number;
  queryMeta?: ApiCategoryCategoriesMetaInput;
  onConfirm: (entities: IPickableEntity[], ids: string[]) => void;
}

export function CategoryPickerModal() {
  const { payload, forcePop } = useModalStackContext();
  const typedPayload = payload as unknown as ICategoryPickerPayload;
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
      name="category-picker"
      bodyClassName="entity-picker-body"
      header={
        <ModalHeader
          title="Select Categories"
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
        config={categoryPickerConfig}
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
