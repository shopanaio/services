"use client";

import type { CustomCellRendererProps } from "ag-grid-react";
import type { IInventoryListItem } from "../mocks/inventory-list";
import { useInventoryEditStore } from "../hooks/useInventoryEditStore";
import { CalculatedAvailableCell as SharedCalculatedAvailableCell } from "@/shared/components/inventory-cells";

/**
 * AG Grid cell renderer for calculated available inventory
 * Uses shared CalculatedAvailableCell component
 */
export function CalculatedAvailableCell(
  props: CustomCellRendererProps<IInventoryListItem>
) {
  const { data } = props;
  const { getFieldEdit } = useInventoryEditStore();

  if (!data) return null;

  // Get edits for inventory fields
  const onHandEdit = getFieldEdit(data.id, "onHand");
  const unavailableEdit = getFieldEdit(data.id, "unavailable");

  return (
    <SharedCalculatedAvailableCell
      onHand={data.onHand}
      unavailable={data.unavailable}
      reserved={data.reserved}
      onHandEdit={onHandEdit ? {
        originalValue: onHandEdit.originalValue as number,
        currentValue: onHandEdit.currentValue as number,
      } : undefined}
      unavailableEdit={unavailableEdit ? {
        originalValue: unavailableEdit.originalValue as number,
        currentValue: unavailableEdit.currentValue as number,
      } : undefined}
    />
  );
}
