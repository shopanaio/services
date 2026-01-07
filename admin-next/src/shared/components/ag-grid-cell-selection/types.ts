/**
 * Represents a selected cell in the grid
 */
export interface ICellSelection {
  rowId: string;
  field: string;
}

/**
 * Configuration options for the cell selection plugin
 */
export interface ICellSelectionConfig {
  /**
   * Restrict selection to a single column at a time
   * @default true
   */
  singleColumnOnly?: boolean;

  /**
   * List of columns that can be selected. If not provided, all columns are selectable.
   */
  selectableColumns?: string[];

  /**
   * Callback fired when selection changes
   */
  onSelectionChange?: (cells: ICellSelection[]) => void;

  /**
   * Callback to get the value of a cell (used for copy/set value operations)
   */
  getCellValue?: (rowId: string, field: string) => unknown;

  /**
   * Callback to set the value of a cell
   */
  setCellValue?: (rowId: string, field: string, value: unknown) => void;
}

/**
 * Public API for cell selection operations
 */
export interface ICellSelectionApi {
  /** Currently selected cells */
  selectedCells: ICellSelection[];

  /** The column that is currently being selected (for single column mode) */
  activeColumn: string | null;

  /** Check if a specific cell is selected */
  isCellSelected: (rowId: string, field: string) => boolean;

  /** Check if there's any selection */
  hasSelection: () => boolean;

  /** Clear all selection */
  clearSelection: () => void;

  /** Select all cells in a column */
  selectAll: (field: string, rowIds: string[]) => void;

  /** Copy values of selected cells to clipboard */
  copySelectedValues: () => Promise<void>;

  /** Set a value to all selected cells */
  setSelectedValues: (value: unknown) => void;

  /** Clear values of all selected cells */
  clearSelectedValues: () => void;
}

/**
 * Internal mouse event handlers for cell selection
 */
export interface ICellSelectionHandlers {
  handleMouseDown: (rowId: string, field: string, event: React.MouseEvent) => void;
  handleMouseEnter: (rowId: string, field: string) => void;
}

/**
 * Context value for cell selection
 */
export interface ICellSelectionContext {
  api: ICellSelectionApi;
  handlers: ICellSelectionHandlers;
  config: ICellSelectionConfig;
}
