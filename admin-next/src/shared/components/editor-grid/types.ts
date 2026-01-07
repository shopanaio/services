import type { ColDef } from "ag-grid-community";

// Generic row interface - requires at least an id
export interface IEditorRowBase {
  id: string;
}

// Edit tracking
export interface IFieldEdit<T = unknown> {
  originalValue: T;
  currentValue: T;
}

export interface IRowEdits {
  [field: string]: IFieldEdit;
}

// Props for the generic EditorGrid component
export interface IEditorGridProps<T extends IEditorRowBase> {
  // Data
  rows: T[];
  displayRows: T[];
  columns: ColDef<T>[];

  // Configuration
  selectableColumns: string[];
  rowHeight?: number;
  headerHeight?: number;

  // Callbacks
  getRowClass?: (data: T) => string;
  onSetFieldValue: (rowId: string, field: string, originalValue: unknown, newValue: unknown) => void;

  // Optional custom styles class
  className?: string;
}
