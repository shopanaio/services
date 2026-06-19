"use client";

import React, { useCallback, useMemo, useState, useEffect } from "react";
import { App } from "antd";
import { EditorGrid } from "@/shared/components/editor-grid";
import { validateFieldChange } from "@/shared/utils/inventory";
import {
  DEFAULT_DIMENSION_UNIT,
  DEFAULT_WEIGHT_UNIT,
} from "@/domains/inventory/products/utils/product-measurements";
import { useVariantsEditorStore, useVariantsColumns } from "../hooks";
import {
  SELECTABLE_COLUMNS,
} from "../config";
import type {
  IVariantEditorRow,
  IOptionGroup,
  VariantColumnField,
} from "../config/types";

// ============================================================================
// Types
// ============================================================================

export interface IVariantInput {
  id: string;
  title: string;
  imageUrl?: string | null;
  media?: string[] | null;
  options?: Array<{ name: string; value: string }>;
  // Inventory identification
  sku?: string | null;
  barcode?: string | null;
  // Inventory quantities (same model as inventory table)
  onHand?: number;
  unavailable?: number;
  reserved?: number;
  // Pricing
  price?: number;
  compareAtPrice?: number | null;
  costPrice?: number | null;
  // Shipping
  weight?: number | null;
  weightUnit?: string;
  length?: number | null;
  width?: number | null;
  height?: number | null;
  dimensionUnit?: string;
}

interface VariantsEditorGridProps {
  variants: IVariantInput[];
  onChange?: (rows: IVariantEditorRow[]) => void;
  /**
   * When provided, only these columns will be shown.
   * If undefined, all columns are available with user settings.
   */
  availableColumns?: VariantColumnField[];
  /**
   * When true, column visibility ignores user settings and uses availableColumns only.
   * Useful for restricted views like pricing modal.
   */
  ignoreUserSettings?: boolean;
}

// ============================================================================
// Helpers
// ============================================================================

function extractOptionGroups(variants: IVariantInput[]): IOptionGroup[] {
  const groupMap = new Map<string, Set<string>>();

  for (const variant of variants) {
    for (const option of variant.options || []) {
      if (!groupMap.has(option.name)) {
        groupMap.set(option.name, new Set());
      }
      groupMap.get(option.name)!.add(option.value);
    }
  }

  return Array.from(groupMap.entries()).map(([name, values]) => ({
    name,
    values: Array.from(values),
  }));
}

function variantsToRows(variants: IVariantInput[]): IVariantEditorRow[] {
  return variants.map((v) => {
    const onHand = v.onHand ?? 0;
    const unavailable = v.unavailable ?? 0;
    const reserved = v.reserved ?? 0;
    const available = onHand - unavailable - reserved;

    return {
      id: v.id,
      title: v.title,
      imageUrl: v.imageUrl ?? null,
      media: v.media ?? null,
      options: v.options || [],
      // Inventory identification
      sku: v.sku ?? null,
      barcode: v.barcode ?? null,
      // Inventory quantities
      onHand,
      unavailable,
      reserved,
      available,
      // Pricing
      price: v.price ?? 0,
      compareAtPrice: v.compareAtPrice ?? null,
      costPrice: v.costPrice ?? null,
      // Shipping
      weight: v.weight ?? null,
      weightUnit: v.weightUnit ?? DEFAULT_WEIGHT_UNIT,
      length: v.length ?? null,
      width: v.width ?? null,
      height: v.height ?? null,
      dimensionUnit: v.dimensionUnit ?? DEFAULT_DIMENSION_UNIT,
    };
  });
}

// ============================================================================
// Component
// ============================================================================

export const VariantsEditorGrid: React.FC<VariantsEditorGridProps> = ({
  variants,
  onChange,
  availableColumns,
  ignoreUserSettings = false,
}) => {
  // Extract option groups for column generation
  const optionGroups = useMemo(
    () => extractOptionGroups(variants),
    [variants]
  );

  const { message } = App.useApp();

  // Transform variants to row data
  const initialRows = useMemo(
    () => variantsToRows(variants),
    [variants]
  );

  // Store hooks
  const edits = useVariantsEditorStore((s) => s.edits);
  const setFieldValue = useVariantsEditorStore((s) => s.setFieldValue);

  // Columns - pass availableColumns and ignoreUserSettings
  const columns = useVariantsColumns({
    optionGroups,
    availableColumns,
    ignoreUserSettings,
  });

  // Local row state (original data)
  const [rows] = useState<IVariantEditorRow[]>(initialRows);

  // Compute display rows (with edits applied)
  const displayRows = useMemo(() => {
    return rows.map((row) => {
      const rowEdits = edits[row.id];
      if (!rowEdits) return row;

      const updatedRow = { ...row };
      for (const [field, edit] of Object.entries(rowEdits)) {
        (updatedRow as Record<string, unknown>)[field] = edit.currentValue;
      }

      // Recalculate available if any inventory field was edited
      if (rowEdits.onHand || rowEdits.unavailable) {
        updatedRow.available =
          updatedRow.onHand - updatedRow.unavailable - updatedRow.reserved;
      }

      return updatedRow;
    });
  }, [rows, edits]);

  // Notify parent of changes
  useEffect(() => {
    if (Object.keys(edits).length > 0) {
      onChange?.(displayRows);
    }
  }, [displayRows, edits, onChange]);

  // Handle field value change with validation
  const handleSetFieldValue = useCallback(
    (rowId: string, field: string, originalValue: unknown, newValue: unknown) => {
      // Validate inventory fields using shared validator
      if (field === "onHand" || field === "unavailable") {
        const row = rows.find((r) => r.id === rowId);
        if (row) {
          const result = validateFieldChange(field, Number(newValue), {
            onHand: row.onHand,
            unavailable: row.unavailable,
            reserved: row.reserved,
            available: row.available,
          });
          if (!result.isValid) {
            message.error(result.errors[0]?.message || "Invalid value");
            return;
          }
        }
      }

      setFieldValue(rowId, field, originalValue, newValue);
    },
    [setFieldValue, rows, message]
  );

  return (
    <EditorGrid<IVariantEditorRow>
      rows={rows}
      displayRows={displayRows}
      columns={columns}
      selectableColumns={SELECTABLE_COLUMNS}
      onSetFieldValue={handleSetFieldValue}
    />
  );
};

// Re-export extractOptionGroups for use in parent
export { extractOptionGroups };
