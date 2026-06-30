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
   * Enable keyboard shortcuts (Escape, Delete, Ctrl+C, Ctrl+A)
   * @default true
   */
  enableKeyboardShortcuts?: boolean;

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

  /**
   * Callback to increment a cell value by delta (for numeric cells)
   */
  incrementCellValue?: (rowId: string, field: string, delta: number) => void;

  /**
   * Callback fired when Enter is pressed with selected cells.
   */
  onSelectionEnter?: (cells: ICellSelection[]) => boolean | void;
}

/**
 * Public API for cell selection operations
 */
export interface ICellSelectionApi {
  /** Currently selected cells */
  selectedCells: ICellSelection[];

  /** The column that is currently being selected (for single column mode) */
  activeColumn: string | null;

  /** Number of selected cells */
  selectionCount: number;

  /** Check if a specific cell is selected */
  isCellSelected: (rowId: string, field: string) => boolean;

  /** Check if there's any selection */
  hasSelection: () => boolean;

  /** Clear all selection */
  clearSelection: () => void;

  /** Select all cells in a column */
  selectAll: (field: string, rowIds?: string[]) => void;

  /** Copy values of selected cells to clipboard */
  copySelectedValues: () => Promise<void>;

  /** Paste values from clipboard to selected cells */
  pasteToSelectedCells: () => Promise<void>;

  /** Set a value to all selected cells */
  setSelectedValues: (value: unknown) => void;

  /** Clear values of all selected cells (set to null) */
  clearSelectedValues: () => void;

  /** Increment all selected cell values by delta (for numeric cells) */
  incrementSelectedValues: (delta: number) => void;

  /** Get all values from selected cells */
  getSelectedValues: () => unknown[];
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
