"use client";

import React, { useCallback } from "react";
import { createStyles } from "antd-style";
import { EditorGrid } from "@/shared/components/editor-grid";
import { IBulkEditorRow } from "../types";
import { useBulkEditorStore } from "../hooks/useBulkEditorStore";
import { useBulkEditorData } from "../hooks/useBulkEditorData";
import { useBulkEditorColumns } from "../hooks/useBulkEditorColumns";

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

  // Handle field value change
  const handleSetFieldValue = useCallback(
    (rowId: string, field: string, originalValue: unknown, newValue: unknown) => {
      setFieldValue(rowId, field, originalValue, newValue);
    },
    [setFieldValue]
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
