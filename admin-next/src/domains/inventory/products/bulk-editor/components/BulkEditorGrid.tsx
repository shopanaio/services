import React, { useCallback, useRef } from "react";
import { createStyles } from "antd-style";
import { AgGridReact } from "ag-grid-react";
import type {
  CellEditRequestEvent,
  GridReadyEvent,
  GetDataPath,
  GetRowIdParams,
  RowClassParams,
} from "ag-grid-community";
import { IBulkEditorRow } from "../types";
import { useBulkEditorStore } from "../hooks/useBulkEditorStore";
import { useBulkEditorData } from "../hooks/useBulkEditorData";
import { useBulkEditorColumns } from "../hooks/useBulkEditorColumns";

const useStyles = createStyles(({ token }) => ({
  gridWrapper: {
    height: "100%",
    width: "100%",

    // AG Grid CSS variables for borders
    "--ag-borders": "solid 1px",
    "--ag-border-color": token.colorBorder,
    "--ag-row-border-color": token.colorBorder,
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

    ".ag-cell-focus": {
      borderColor: `${token.colorPrimary} !important`,
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

export const BulkEditorGrid: React.FC = () => {
  const { styles } = useStyles();
  const gridRef = useRef<AgGridReact<IBulkEditorRow>>(null);

  const { displayRows, rows } = useBulkEditorData();
  const columns = useBulkEditorColumns();
  const setFieldValue = useBulkEditorStore((s) => s.setFieldValue);

  // Get data path for tree data
  const getDataPath: GetDataPath<IBulkEditorRow> = useCallback((data) => {
    return data.path;
  }, []);

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

  // Handle cell edit request
  const handleCellEditRequest = useCallback(
    (event: CellEditRequestEvent<IBulkEditorRow>) => {
      const { data, colDef, newValue } = event;
      if (!data || !colDef?.field) return;

      const field = colDef.field as keyof IBulkEditorRow;

      // Find original value from non-edited rows
      const originalRow = rows.find((r) => r.id === data.id);
      if (!originalRow) return;

      const originalValue = originalRow[field];

      // Update store
      setFieldValue(data.id, field, originalValue, newValue);
    },
    [rows, setFieldValue]
  );

  // Grid ready handler
  const handleGridReady = useCallback((_event: GridReadyEvent) => {
    // Auto-size columns if needed
  }, []);

  return (
    <div className={styles.gridWrapper}>
      <AgGridReact<IBulkEditorRow>
        ref={gridRef}
        rowData={displayRows}
        columnDefs={columns}
        treeData
        getDataPath={getDataPath}
        groupDefaultExpanded={-1}
        rowHeight={52}
        headerHeight={44}
        getRowId={getRowId}
        getRowClass={getRowClass}
        readOnlyEdit
        stopEditingWhenCellsLoseFocus
        onCellEditRequest={handleCellEditRequest}
        onGridReady={handleGridReady}
        suppressRowClickSelection
        animateRows={false}
        defaultColDef={{
          resizable: true,
          sortable: true,
          suppressMovable: true,
        }}
        autoGroupColumnDef={{
          headerName: "Product / Variant",
          minWidth: 250,
          flex: 1,
          cellRendererParams: {
            suppressCount: true,
          },
        }}
      />
    </div>
  );
};
