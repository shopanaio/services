"use client";

import React, { useCallback, useMemo, useRef } from "react";
import { createStyles } from "antd-style";
import { AgGridReact } from "ag-grid-react";
import type {
  CellEditRequestEvent,
  ColDef,
  GetRowIdParams,
  RowClassParams,
  RowDragEnterEvent,
  RowDragEndEvent,
} from "ag-grid-community";
import {
  CellSelectionProvider,
  ICellSelectionConfig,
  useCellSelectionContext,
} from "@/shared/components/ag-grid-cell-selection";
import type { IEditorGridProps, IEditorRowBase } from "./types";
import { useAgGridTheme } from "@/hooks";

// ============================================================================
// Styles
// ============================================================================

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

    // Selectable cell styles
    ".ag-cell:has([data-selectable])": {
      cursor: "default",
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

    ".ag-header-cell": {
      fontSize: 13,
      fontWeight: 500,
      color: token.colorTextSecondary,
      borderRight: `1px solid ${token.colorBorder}`,
    },

    // Transparent resize handles (visible on hover), full height
    ".ag-header-cell-resize": {
      opacity: 0,
      transition: "opacity 0.2s",
      height: "100%",
      top: 0,
      "&:hover": {
        opacity: 1,
      },
    },

    // Pinned columns
    ".ag-pinned-left-cols-container": {
      backgroundColor: token.colorBgContainer,
    },

    // =========================================================================
    // CELL RENDERER STYLES
    // =========================================================================

    // === Base Cell (for non-selectable cells) ===
    ".ec-cell": {
      display: "flex",
      alignItems: "center",
      width: "100%",
      height: "100%",
    },

    // === Cell Modifiers (work with SelectableCell via className prop) ===
    ".ec-cell--right, [data-selectable].ec-cell--right": {
      justifyContent: "flex-end",
      paddingRight: 4,
    },
    ".ec-cell--center, [data-selectable].ec-cell--center": {
      justifyContent: "center",
    },

    // === Diff (edited value: oldValue → newValue) ===
    ".ec-diff": {
      display: "flex",
      alignItems: "center",
      gap: 4,
      fontStyle: "italic",
    },
    ".ec-diff__old": {
      color: token.colorTextSecondary,
      textDecoration: "line-through",
    },
    ".ec-diff__arrow": {
      color: token.colorTextSecondary,
      fontSize: 12,
    },
    ".ec-diff__new": {
      fontWeight: 600,
    },
    ".ec-diff__new--negative": {
      fontWeight: 600,
      color: token.colorError,
    },

    // === Value States ===
    ".ec-value--zero": {
      color: token.colorError,
    },
    ".ec-value--secondary": {
      color: token.colorTextSecondary,
    },

    // === Title Cell ===
    ".ec-title": {
      display: "flex",
      alignItems: "center",
      gap: 8,
      height: "100%",
      width: "100%",
    },
    ".ec-title__text": {
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    },
    ".ec-title--product": {
      fontWeight: 500,
    },
    ".ec-title--variant": {
      color: token.colorTextSecondary,
      paddingLeft: 16,
    },

    // === Image Cell ===
    ".ec-image": {
      width: 40,
      height: 40,
      borderRadius: 4,
      objectFit: "cover" as const,
    },
    ".ec-image--placeholder": {
      width: 40,
      height: 40,
      borderRadius: 4,
      background: token.colorBgContainerDisabled,
      flexShrink: 0,
    },

    // === Dash (empty/N/A cell) ===
    ".ec-dash": {
      display: "inline-block",
      width: 24,
      height: 4,
      backgroundColor: token.colorBorder,
      borderRadius: 2,
      verticalAlign: "middle",
    },

    // === Option Value (read-only) ===
    ".ec-option": {
      color: token.colorTextSecondary,
    },
  },
}));

// ============================================================================
// Inner Grid Component (has access to cell selection context)
// ============================================================================

interface EditorGridInnerProps<T extends IEditorRowBase> {
  gridRef: React.RefObject<AgGridReact<T> | null>;
  rows: T[];
  displayRows: T[];
  columns: ColDef<T>[];
  rowHeight: number;
  headerHeight: number;
  getRowClass?: (data: T) => string;
  onSetFieldValue: (
    rowId: string,
    field: string,
    originalValue: unknown,
    newValue: unknown
  ) => void;
  // Row drag-drop
  rowDragManaged?: boolean;
  onRowDragEnter?: (event: RowDragEnterEvent<T>) => void;
  onRowDragEnd?: (event: RowDragEndEvent<T>) => void;
  // Layout
  domLayout?: "normal" | "autoHeight" | "print";
  dataTestId?: string;
}

function EditorGridInnerComponent<T extends IEditorRowBase>({
  gridRef,
  rows,
  displayRows,
  columns,
  rowHeight,
  headerHeight,
  getRowClass: getRowClassProp,
  onSetFieldValue,
  rowDragManaged,
  onRowDragEnter,
  onRowDragEnd,
  domLayout,
  dataTestId,
}: EditorGridInnerProps<T>) {
  const { styles } = useStyles();
  const agGridTheme = useAgGridTheme();
  const { api: selectionApi } = useCellSelectionContext();

  // Get row ID
  const getRowId = useCallback((params: GetRowIdParams<T>) => {
    return params.data.id;
  }, []);

  // Get row class
  const getRowClass = useCallback(
    (params: RowClassParams<T>) => {
      if (!params.data || !getRowClassProp) return "";
      return getRowClassProp(params.data);
    },
    [getRowClassProp]
  );

  // Handle cell edit request - update all selected cells
  const handleCellEditRequest = useCallback(
    (event: CellEditRequestEvent<T>) => {
      const { data, colDef, newValue } = event;
      if (!data || !colDef?.field) return;

      const field = colDef.field;
      const selectedCells = selectionApi.selectedCells;

      // If we have selected cells in the same column, update all of them
      if (selectedCells.length > 0 && selectedCells[0].field === field) {
        selectedCells.forEach((cell) => {
          const originalRow = rows.find((r) => r.id === cell.rowId);
          if (originalRow) {
            const originalValue = (originalRow as Record<string, unknown>)[
              field
            ];
            onSetFieldValue(cell.rowId, field, originalValue, newValue);
          }
        });
      } else {
        // No selection or different column - update single cell
        const originalRow = rows.find((r) => r.id === data.id);
        if (!originalRow) return;

        const originalValue = (originalRow as Record<string, unknown>)[field];
        onSetFieldValue(data.id, field, originalValue, newValue);
      }
    },
    [rows, onSetFieldValue, selectionApi]
  );

  return (
    <div className={styles.gridWrapper} data-testid={dataTestId}>
      <AgGridReact<T>
        ref={gridRef}
        theme={agGridTheme}
        rowData={displayRows}
        columnDefs={columns}
        rowHeight={rowHeight}
        headerHeight={headerHeight}
        groupHeaderHeight={0}
        getRowId={getRowId}
        getRowClass={getRowClass}
        readOnlyEdit
        stopEditingWhenCellsLoseFocus
        onCellEditRequest={handleCellEditRequest}
        suppressHeaderFocus
        suppressRowHoverHighlight
        animateRows={rowDragManaged ? true : false}
        suppressColumnVirtualisation
        suppressMovableColumns
        rowDragManaged={rowDragManaged}
        onRowDragEnter={onRowDragEnter}
        onRowDragEnd={onRowDragEnd}
        domLayout={domLayout}
        defaultColDef={{
          resizable: true,
          sortable: false,
          suppressMovable: true,
        }}
      />
    </div>
  );
}

// ============================================================================
// Main EditorGrid Component
// ============================================================================

export function EditorGrid<T extends IEditorRowBase>({
  rows,
  displayRows,
  columns,
  selectableColumns,
  rowHeight = 52,
  headerHeight = 44,
  getRowClass,
  onSetFieldValue,
  rowDragManaged,
  onRowDragEnter,
  onRowDragEnd,
  domLayout,
  dataTestId,
}: IEditorGridProps<T>) {
  const gridRef = useRef<AgGridReact<T>>(null);

  // Cell selection configuration
  const selectionConfig = useMemo(
    (): ICellSelectionConfig => ({
      singleColumnOnly: true,
      selectableColumns,
      enableKeyboardShortcuts: true,
      getCellValue: (rowId, field) => {
        const row = displayRows.find((r) => r.id === rowId);
        return row ? (row as Record<string, unknown>)[field] : undefined;
      },
      setCellValue: (rowId, field, value) => {
        const originalRow = rows.find((r) => r.id === rowId);
        if (originalRow) {
          const originalValue = (originalRow as Record<string, unknown>)[field];
          onSetFieldValue(rowId, field, originalValue, value);
        }
      },
      incrementCellValue: (rowId, field, delta) => {
        const row = displayRows.find((r) => r.id === rowId);
        const originalRow = rows.find((r) => r.id === rowId);
        if (row && originalRow) {
          const currentValue = (row as Record<string, unknown>)[field];
          if (typeof currentValue === "number") {
            const originalValue = (originalRow as Record<string, unknown>)[
              field
            ];
            onSetFieldValue(rowId, field, originalValue, currentValue + delta);
          }
        }
      },
    }),
    [displayRows, rows, selectableColumns, onSetFieldValue]
  );

  return (
    <CellSelectionProvider gridRef={gridRef} config={selectionConfig}>
      <EditorGridInnerComponent<T>
        gridRef={gridRef}
        rows={rows}
        displayRows={displayRows}
        columns={columns}
        rowHeight={rowHeight}
        headerHeight={headerHeight}
        getRowClass={getRowClass}
        onSetFieldValue={onSetFieldValue}
        rowDragManaged={rowDragManaged}
        onRowDragEnter={onRowDragEnter}
        onRowDragEnd={onRowDragEnd}
        domLayout={domLayout}
        dataTestId={dataTestId}
      />
    </CellSelectionProvider>
  );
}
