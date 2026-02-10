// Types
export type {
  ICellSelection,
  ICellSelectionConfig,
  ICellSelectionApi,
  ICellSelectionHandlers,
  ICellSelectionContext,
} from "./types";

// Provider and hooks
export {
  CellSelectionProvider,
  useCellSelectionContext,
  useCellSelectionStore,
} from "./cell-selection-provider";

export { useCellSelection } from "./use-cell-selection";

// Components
export { SelectableCell } from "./selectable-cell";

// Styles
export { useSelectionStyles, SELECTING_BODY_CLASS } from "./styles";

// Store (for advanced usage)
export {
  createCellSelectionStore,
  type CellSelectionStore,
} from "./use-cell-selection-store";
