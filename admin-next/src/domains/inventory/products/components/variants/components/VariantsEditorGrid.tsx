"use client";

import React, { useCallback, useMemo, useState, useEffect } from "react";
import { EditorGrid } from "@/shared/components/editor-grid";
import { useVariantsEditorStore, useVariantsColumns } from "../hooks";
import {
  SELECTABLE_COLUMNS,
  type IVariantEditorRow,
  type IOptionGroup,
  type StockStatus,
} from "../config";

// ============================================================================
// Types
// ============================================================================

export interface IVariantInput {
  id: string;
  title: string;
  imageUrl?: string | null;
  options?: Array<{ name: string; value: string }>;
  // Inventory
  sku?: string | null;
  barcode?: string | null;
  stock?: number;
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
  lowStockThreshold?: number;
  onChange?: (rows: IVariantEditorRow[]) => void;
}

// ============================================================================
// Helpers
// ============================================================================

function getStockStatus(stock: number, threshold: number): StockStatus {
  if (stock <= 0) return "out_of_stock";
  if (stock <= threshold) return "low_stock";
  return "in_stock";
}

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

function variantsToRows(
  variants: IVariantInput[],
  lowStockThreshold: number
): IVariantEditorRow[] {
  return variants.map((v) => ({
    id: v.id,
    title: v.title,
    imageUrl: v.imageUrl ?? null,
    options: v.options || [],
    // Inventory
    sku: v.sku ?? null,
    barcode: v.barcode ?? null,
    stock: v.stock ?? 0,
    stockStatus: getStockStatus(v.stock ?? 0, lowStockThreshold),
    // Pricing
    price: v.price ?? 0,
    compareAtPrice: v.compareAtPrice ?? null,
    costPrice: v.costPrice ?? null,
    // Shipping
    weight: v.weight ?? null,
    weightUnit: v.weightUnit ?? "G",
    length: v.length ?? null,
    width: v.width ?? null,
    height: v.height ?? null,
    dimensionUnit: v.dimensionUnit ?? "CM",
  }));
}

// ============================================================================
// Component
// ============================================================================

export const VariantsEditorGrid: React.FC<VariantsEditorGridProps> = ({
  variants,
  lowStockThreshold = 10,
  onChange,
}) => {
  // Extract option groups for column generation
  const optionGroups = useMemo(
    () => extractOptionGroups(variants),
    [variants]
  );

  // Transform variants to row data
  const initialRows = useMemo(
    () => variantsToRows(variants, lowStockThreshold),
    [variants, lowStockThreshold]
  );

  // Store hooks
  const edits = useVariantsEditorStore((s) => s.edits);
  const setFieldValue = useVariantsEditorStore((s) => s.setFieldValue);

  // Columns
  const columns = useVariantsColumns(optionGroups);

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

      // Recalculate stock status if stock was edited
      if (rowEdits.stock) {
        updatedRow.stockStatus = getStockStatus(
          updatedRow.stock,
          lowStockThreshold
        );
      }

      return updatedRow;
    });
  }, [rows, edits, lowStockThreshold]);

  // Notify parent of changes
  useEffect(() => {
    if (Object.keys(edits).length > 0) {
      onChange?.(displayRows);
    }
  }, [displayRows, edits, onChange]);

  // Handle field value change
  const handleSetFieldValue = useCallback(
    (rowId: string, field: string, originalValue: unknown, newValue: unknown) => {
      setFieldValue(rowId, field, originalValue, newValue);
    },
    [setFieldValue]
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
