"use client";

import type { CustomCellRendererProps } from "ag-grid-react";
import {
  useInventoryEditStore,
  type EditableField,
} from "../hooks/use-inventory-edit-store";
import { EditableInventoryCell } from "@/shared/components/inventory-cells";
import type { InventoryVariantRow } from "../mappers";
import { getInventoryVariantCellTestId } from "./test-ids";

interface EditableNumberCellProps
  extends CustomCellRendererProps<InventoryVariantRow> {
  field: EditableField;
}

/**
 * AG Grid cell renderer for editable inventory number fields
 * Uses shared EditableInventoryCell component
 */
export function EditableNumberCell(props: EditableNumberCellProps) {
  const { data, value, field } = props;
  const { getFieldEdit } = useInventoryEditStore();

  if (!data) return null;

  const fieldEdit = getFieldEdit(data.id, field);
  const currentValue = value as number;
  const testField = field === "onHand" ? "on-hand" : "unavailable";

  return (
    <EditableInventoryCell
      value={currentValue}
      testId={getInventoryVariantCellTestId(data, testField)}
      edit={fieldEdit ? {
        originalValue: fieldEdit.originalValue as number,
        currentValue: fieldEdit.currentValue as number,
      } : undefined}
    />
  );
}
