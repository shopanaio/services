"use client";

import type { CustomCellRendererProps } from "ag-grid-react";
import {
  useInventoryEditStore,
  type EditableField,
} from "../hooks/use-inventory-edit-store";
import { EditableInventoryCell } from "@/shared/components/inventory-cells";
import type { InventoryVariantRow } from "../mappers";

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

  return (
    <EditableInventoryCell
      value={currentValue}
      edit={fieldEdit ? {
        originalValue: fieldEdit.originalValue as number,
        currentValue: fieldEdit.currentValue as number,
      } : undefined}
    />
  );
}
