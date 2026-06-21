"use client";

import type { CustomCellRendererProps } from "ag-grid-react";
import { useInventoryEditStore } from "../hooks/use-inventory-edit-store";
import { CalculatedAvailableCell as SharedCalculatedAvailableCell } from "@/shared/components/inventory-cells";
import type { InventoryVariantRow } from "../mappers";
import { getInventoryVariantCellTestId } from "./test-ids";

/**
 * AG Grid cell renderer for calculated available inventory
 * Uses shared CalculatedAvailableCell component
 */
export function CalculatedAvailableCell(
  props: CustomCellRendererProps<InventoryVariantRow>
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
      testId={getInventoryVariantCellTestId(data, "available")}
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
