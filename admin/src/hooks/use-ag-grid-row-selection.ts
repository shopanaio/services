import { useCallback, useMemo } from "react";
import type { CellClickedEvent, RowSelectionOptions, SelectionColumnDef } from "ag-grid-community";

const AG_GRID_SELECTION_COLUMN_ID = "ag-Grid-SelectionColumn";

export interface UseAgGridRowSelectionOptions<T> {
  /**
   * Selection mode: "single" or "multi"
   * @default "multi"
   */
  mode?: "single" | "multi";
  /**
   * Callback when a non-checkbox cell is clicked
   */
  onRowAction?: (data: T) => void;
}

export interface UseAgGridRowSelectionReturn<T> {
  /**
   * Row selection configuration for AG Grid
   * Pass this to the `rowSelection` prop
   */
  rowSelection: RowSelectionOptions;
  /**
   * Selection column definition
   * Pass this to the `selectionColumnDef` prop
   */
  selectionColumnDef: SelectionColumnDef;
  /**
   * Cell click handler that manages checkbox selection
   * Pass this to the `onCellClicked` prop
   */
  onCellClicked: (event: CellClickedEvent<T>) => void;
}

/**
 * Hook for standardized AG Grid row selection behavior.
 *
 * This ensures consistent behavior across all AG Grid tables:
 * - Clicking checkbox column toggles selection
 * - Clicking other columns triggers row action (navigation, modal, etc.)
 * - Row click does NOT toggle selection (only checkbox does)
 *
 * @example
 * ```tsx
 * const { rowSelection, selectionColumnDef, onCellClicked } = useAgGridRowSelection({
 *   onRowAction: (data) => push("product", { id: data.id }),
 * });
 *
 * <AgGridReact
 *   rowSelection={rowSelection}
 *   selectionColumnDef={selectionColumnDef}
 *   onCellClicked={onCellClicked}
 * />
 * ```
 */
export function useAgGridRowSelection<T>({
  mode = "multi",
  onRowAction,
}: UseAgGridRowSelectionOptions<T> = {}): UseAgGridRowSelectionReturn<T> {
  const rowSelection = useMemo<RowSelectionOptions>(
    () => ({
      mode: mode === "single" ? "singleRow" : "multiRow",
      checkboxes: true,
      headerCheckbox: mode === "multi",
      enableClickSelection: false,
    }),
    [mode]
  );

  const selectionColumnDef = useMemo<SelectionColumnDef>(
    () => ({
      cellStyle: { display: "flex", alignItems: "center" },
    }),
    []
  );

  const onCellClicked = useCallback(
    (event: CellClickedEvent<T>) => {
      if (event.column.getColId() === AG_GRID_SELECTION_COLUMN_ID) {
        event.node.setSelected(!event.node.isSelected());
        return;
      }

      if (onRowAction && event.data) {
        onRowAction(event.data);
      }
    },
    [onRowAction]
  );

  return {
    rowSelection,
    selectionColumnDef,
    onCellClicked,
  };
}
