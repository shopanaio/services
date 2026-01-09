"use client";

import type { CustomCellRendererProps } from "ag-grid-react";
import type { IInventoryListItem } from "../mocks/inventory-list";
import {
  useInventoryEditStore,
  type EditableField,
} from "../hooks/use-inventory-edit-store";
import { EditableInventoryCell } from "@/shared/components/inventory-cells";

interface EditableNumberCellProps
  extends CustomCellRendererProps<IInventoryListItem> {
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
