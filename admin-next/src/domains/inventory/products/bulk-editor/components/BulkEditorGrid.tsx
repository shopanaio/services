import React, { useCallback, useMemo, useRef } from "react";
import { createStyles } from "antd-style";
import { AgGridReact } from "ag-grid-react";
import type {
  CellEditRequestEvent,
  GetRowIdParams,
  RowClassParams,
} from "ag-grid-community";
import { IBulkEditorRow } from "../types";
import { useBulkEditorStore } from "../hooks/useBulkEditorStore";
import { useBulkEditorData } from "../hooks/useBulkEditorData";
import { useBulkEditorColumns } from "../hooks/useBulkEditorColumns";
import {
  CellSelectionProvider,
  ICellSelectionConfig,
  useCellSelectionContext,
} from "@/shared/components/ag-grid-cell-selection";

const useStyles = createStyles(({ token }) => ({
  gridWrapper: {
    height: "100%",
    width: "100%",

    // AG Grid CSS variables for borders
    "--ag-borders": "solid 1px",
    "--ag-border-color": token.colorBorder,
    "--ag-row-border-color": token.colorBorder,
    "--ag-cell-horizontal-padding": "4px",
    "--ag-header-column-separator-display": "block",
    "--ag-header-column-separator-color": token.colorBorder,
    "--ag-header-column-separator-width": "1px",

    ".ag-root-wrapper": {
      borderRadius: token.borderRadius,
    },

    ".ag-header": {
      backgroundColor: token.colorFillQuaternary,
    },

    ".ag-row-hover": {
      backgroundColor: token.colorBgTextHover,
    },

    ".ag-cell": {
      display: "flex",
      alignItems: "center",
      fontSize: 13,
      borderRight: `1px solid ${token.colorBorder}`,
    },

    // Selectable cell styles
    ".ag-cell:has([data-selectable])": {
      cursor: "cell",
      userSelect: "none",
    },

    // Make selectable div fill the cell
    "[data-selectable]": {
      width: "100%",
      height: "100%",
      display: "flex",
      alignItems: "center",
    },

    // Selected cell styles
    ".ag-cell:has([data-selected='true'])": {
      backgroundColor: "var(--ag-range-selection-background-color)",
    },

    // Fix input alignment in edit mode
    "& .ag-cell-editor input": {
      textAlign: "right",
      paddingRight: token.padding,
    },

    ".ag-header-cell": {
      fontSize: 13,
      fontWeight: 500,
      color: token.colorTextSecondary,
      borderRight: `1px solid ${token.colorBorder}`,
    },

    // Transparent resize handles (visible on hover)
    ".ag-header-cell-resize": {
      opacity: 0,
      transition: "opacity 0.2s",
      "&:hover": {
        opacity: 1,
      },
    },

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

    // Pinned columns
    ".ag-pinned-left-cols-container": {
      backgroundColor: token.colorBgContainer,
    },

  },
}));

// Editable columns that support cell selection
const SELECTABLE_COLUMNS = [
  "price",
  "compareAtPrice",
  "costPrice",
  "stock",
  "sku",
  "barcode",
  "weight",
  "length",
  "width",
  "height",
];

interface BulkEditorGridInnerProps {
  gridRef: React.RefObject<AgGridReact<IBulkEditorRow> | null>;
}

// Inner grid component that has access to cell selection context
const BulkEditorGridInner: React.FC<BulkEditorGridInnerProps> = ({ gridRef }) => {
  const { styles } = useStyles();

  const { displayRows, rows } = useBulkEditorData();
  const columns = useBulkEditorColumns();
  const setFieldValue = useBulkEditorStore((s) => s.setFieldValue);
  const { api: selectionApi } = useCellSelectionContext();

  // Get row ID
  const getRowId = useCallback((params: GetRowIdParams<IBulkEditorRow>) => {
    return params.data.id;
  }, []);

  // Get row class based on row type
  const getRowClass = useCallback((params: RowClassParams<IBulkEditorRow>) => {
    if (!params.data) return "";
    switch (params.data.rowType) {
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

  // Handle cell edit request - update all selected cells
  const handleCellEditRequest = useCallback(
    (event: CellEditRequestEvent<IBulkEditorRow>) => {
      const { data, colDef, newValue } = event;
      if (!data || !colDef?.field) return;

      const field = colDef.field as keyof IBulkEditorRow;
      const selectedCells = selectionApi.selectedCells;

      // If we have selected cells in the same column, update all of them
      if (selectedCells.length > 0 && selectedCells[0].field === field) {
        selectedCells.forEach((cell) => {
          const originalRow = rows.find((r) => r.id === cell.rowId);
          if (originalRow) {
            const originalValue = originalRow[field];
            setFieldValue(cell.rowId, field, originalValue, newValue);
          }
        });
      } else {
        // No selection or different column - update single cell
        const originalRow = rows.find((r) => r.id === data.id);
        if (!originalRow) return;

        const originalValue = originalRow[field];
        setFieldValue(data.id, field, originalValue, newValue);
      }
    },
    [rows, setFieldValue, selectionApi]
  );

  return (
    <div className={styles.gridWrapper}>
      <AgGridReact<IBulkEditorRow>
        ref={gridRef}
        rowData={displayRows}
        columnDefs={columns}
        rowHeight={52}
        headerHeight={44}
        getRowId={getRowId}
        getRowClass={getRowClass}
        readOnlyEdit
        stopEditingWhenCellsLoseFocus
        onCellEditRequest={handleCellEditRequest}
        animateRows={false}
        defaultColDef={{
          resizable: true,
          sortable: true,
          suppressMovable: true,
        }}
      />
    </div>
  );
};

export const BulkEditorGrid: React.FC = () => {
  const gridRef = useRef<AgGridReact<IBulkEditorRow>>(null);
  const { displayRows, rows } = useBulkEditorData();
  const setFieldValue = useBulkEditorStore((s) => s.setFieldValue);

  // Cell selection configuration
  const selectionConfig = useMemo((): ICellSelectionConfig => ({
    singleColumnOnly: true,
    selectableColumns: SELECTABLE_COLUMNS,
    enableKeyboardShortcuts: true,
    getCellValue: (rowId, field) => {
      const row = displayRows.find((r) => r.id === rowId);
      return row ? row[field as keyof IBulkEditorRow] : undefined;
    },
    setCellValue: (rowId, field, value) => {
      const originalRow = rows.find((r) => r.id === rowId);
      if (originalRow) {
        const originalValue = originalRow[field as keyof IBulkEditorRow];
        setFieldValue(rowId, field, originalValue, value);
      }
    },
    incrementCellValue: (rowId, field, delta) => {
      const row = displayRows.find((r) => r.id === rowId);
      const originalRow = rows.find((r) => r.id === rowId);
      if (row && originalRow) {
        const currentValue = row[field as keyof IBulkEditorRow];
        if (typeof currentValue === "number") {
          const originalValue = originalRow[field as keyof IBulkEditorRow];
          setFieldValue(rowId, field, originalValue, currentValue + delta);
        }
      }
    },
  }), [displayRows, rows, setFieldValue]);

  return (
    <CellSelectionProvider gridRef={gridRef} config={selectionConfig}>
      <BulkEditorGridInner gridRef={gridRef} />
    </CellSelectionProvider>
  );
};
