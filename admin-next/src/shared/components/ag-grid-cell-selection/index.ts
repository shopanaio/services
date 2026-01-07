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
} from "./CellSelectionProvider";

export { useCellSelection } from "./useCellSelection";

// Components
export { SelectableCell } from "./SelectableCell";
export { SelectionToolbar } from "./SelectionToolbar";
export { SetValuePopover } from "./SetValuePopover";

// Styles
export { useSelectionStyles, SELECTING_BODY_CLASS } from "./styles";

// Store (for advanced usage)
export {
  createCellSelectionStore,
  type CellSelectionStore,
} from "./useCellSelectionStore";
