"use client";

import React, { useCallback } from "react";
import { App } from "antd";
import { createStyles } from "antd-style";
import { EditorGrid } from "@/shared/components/editor-grid";
import { validateFieldChange } from "@/shared/utils/inventory";
import { IBulkEditorRow } from "../types";
import { useBulkEditorStore } from "../hooks/use-bulk-editor-store";
import { useBulkEditorData } from "../hooks/use-bulk-editor-data";
import { useBulkEditorColumns } from "../hooks/use-bulk-editor-columns";

// ============================================================================
// Styles (bulk editor specific row styles)
// ============================================================================

const useStyles = createStyles(({ token }) => ({
  wrapper: {
    height: "100%",
    width: "100%",

    // Product row styling
    ".bulk-editor-product-row": {
      backgroundColor: token.colorBgContainer,
      fontWeight: 500,
    },

    // Variant row styling
    ".bulk-editor-variant-row": {
      backgroundColor: token.colorBgLayout,
    },

    // Single variant product row
    ".bulk-editor-single-variant-row": {
      backgroundColor: token.colorBgContainer,
    },
  },
}));

// ============================================================================
// Selectable columns for cell selection
// ============================================================================

const SELECTABLE_COLUMNS = [
  "price",
  "compareAtPrice",
  "costPrice",
  "onHand",
  "unavailable",
  "sku",
  "barcode",
  "weight",
  "length",
  "width",
  "height",
];

// ============================================================================
// Component
// ============================================================================

export const BulkEditorGrid: React.FC = () => {
  const { styles } = useStyles();
  const { message } = App.useApp();
  const { displayRows, rows } = useBulkEditorData();
  const columns = useBulkEditorColumns();
  const setFieldValue = useBulkEditorStore((s) => s.setFieldValue);

  // Get row class based on row type
  const getRowClass = useCallback((data: IBulkEditorRow): string => {
    switch (data.rowType) {
      case "product":
        return "bulk-editor-product-row";
      case "variant":
        return "bulk-editor-variant-row";
      case "single-variant-product":
        return "bulk-editor-single-variant-row";
      default:
        return "";
    }
  }, []);

  // Handle field value change with validation
  const handleSetFieldValue = useCallback(
    (rowId: string, field: string, originalValue: unknown, newValue: unknown) => {
      // Validate inventory fields using shared validator (only for variant rows)
      if (field === "onHand" || field === "unavailable") {
        const row = rows.find((r) => r.id === rowId);
        if (row && row.rowType === "variant") {
          const result = validateFieldChange(field, Number(newValue), {
            onHand: row.onHand ?? 0,
            unavailable: row.unavailable ?? 0,
            reserved: row.reserved ?? 0,
            available: row.available ?? 0,
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
    <div className={styles.wrapper}>
      <EditorGrid<IBulkEditorRow>
        rows={rows}
        displayRows={displayRows}
        columns={columns}
        selectableColumns={SELECTABLE_COLUMNS}
        getRowClass={getRowClass}
        onSetFieldValue={handleSetFieldValue}
      />
    </div>
  );
};
