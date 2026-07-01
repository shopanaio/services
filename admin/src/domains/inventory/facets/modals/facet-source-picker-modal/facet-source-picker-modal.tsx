"use client";

import { useCallback, useMemo, useState } from "react";
import {
  ModalHeader,
  ModalLayout,
  useModalStackContext,
} from "@/layouts/modals";
import { EntityPickerContent } from "@/shared/components/entity-picker-modal";
import type { IPickableEntity } from "@/shared/components/entity-picker-modal/types";
import type { IFacetSourcePickerModalPayload } from "../../modals";
import {
  facetSourcePickerConfig,
  type FacetSourcePickerEntity,
} from "../../pickers/facet-source-picker-config";

export function FacetSourcePickerModal() {
  const { payload, forcePop } = useModalStackContext();
  const typedPayload = payload as IFacetSourcePickerModalPayload;
  const {
    selectionMode = "multi",
    initialSelection = [],
    excludeIds = [],
    maxSelection,
    queryMeta,
    initialFacetType,
    onConfirm,
  } = typedPayload;

  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelection);
  const [selectedEntities, setSelectedEntities] = useState<
    FacetSourcePickerEntity[]
  >([]);

  const selectedFacetType = selectedEntities[0]?.facetType ?? initialFacetType;
  const config = useMemo(
    () => ({
      ...facetSourcePickerConfig,
      isRowDisabled: (entity: FacetSourcePickerEntity) =>
        Boolean(selectedFacetType && entity.facetType !== selectedFacetType),
    }),
    [selectedFacetType],
  );

  const handleSelectionChange = useCallback(
    (ids: string[], entities: IPickableEntity[]) => {
      setSelectedIds(ids);
      setSelectedEntities(entities as FacetSourcePickerEntity[]);
    },
    [],
  );

  const handleConfirm = useCallback(() => {
    onConfirm(selectedEntities, selectedIds);
    forcePop();
  }, [forcePop, onConfirm, selectedEntities, selectedIds]);

  const handleCancel = useCallback(() => {
    forcePop();
  }, [forcePop]);

  const confirmText =
    selectedIds.length > 0 ? `Confirm (${selectedIds.length})` : "Confirm";

  return (
    <ModalLayout
      name="facet-source-picker"
      bodyClassName="entity-picker-body"
      header={
        <ModalHeader
          name="facet-source-picker"
          title="Select Sources"
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
        queryMeta={queryMeta}
        onSelectionChange={handleSelectionChange}
      />
    </ModalLayout>
  );
}
