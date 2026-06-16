import React, { createContext, useContext, RefObject, useEffect } from "react";
import { AgGridReact } from "ag-grid-react";
import { ICellSelectionConfig, ICellSelectionContext } from "./types";
import { useCellSelection } from "./use-cell-selection";
import { CellSelectionStore } from "./use-cell-selection-store";
import { globalSelectingStyles } from "./styles";

// Inject global styles once
let stylesInjected = false;
const injectGlobalStyles = () => {
  if (stylesInjected) return;
  const style = document.createElement("style");
  style.textContent = globalSelectingStyles;
  document.head.appendChild(style);
  stylesInjected = true;
};

// Context for cell selection
const CellSelectionContext = createContext<ICellSelectionContext | null>(null);

// Store context for direct store access (used by SelectableCell for performance)
const CellSelectionStoreContext = createContext<CellSelectionStore | null>(
  null
);

interface CellSelectionProviderProps<TData = unknown> {
  gridRef: RefObject<AgGridReact<TData> | null>;
  config?: ICellSelectionConfig;
  children: React.ReactNode;
}

/**
 * Provider component that enables cell selection for an AG Grid instance
 *
 * @example
 * ```tsx
 * <CellSelectionProvider gridRef={gridRef} config={config}>
 *   <AgGridReact ref={gridRef} ... />
 * </CellSelectionProvider>
 * ```
 */
export function CellSelectionProvider<TData = unknown>({
  gridRef,
  config = {},
  children,
}: CellSelectionProviderProps<TData>) {
  // Inject global styles on mount
  useEffect(() => {
    injectGlobalStyles();
  }, []);

  const { api, handlers, store } = useCellSelection(gridRef, config);

  const contextValue: ICellSelectionContext = {
    api,
    handlers,
    config,
  };

  return (
    <CellSelectionContext.Provider value={contextValue}>
      <CellSelectionStoreContext.Provider value={store}>
        {children}
      </CellSelectionStoreContext.Provider>
    </CellSelectionContext.Provider>
  );
}

/**
 * Hook to access cell selection context
 * Must be used within a CellSelectionProvider
 */
export const useCellSelectionContext = (): ICellSelectionContext => {
  const ctx = useContext(CellSelectionContext);
  if (!ctx) {
    throw new Error(
      "useCellSelectionContext must be used within a CellSelectionProvider"
    );
  }
  return ctx;
};

/**
 * Hook to access the cell selection store directly
 * Useful for performance-critical components that need to subscribe to specific state
 */
export const useCellSelectionStore = (): CellSelectionStore => {
  const store = useContext(CellSelectionStoreContext);
  if (!store) {
    throw new Error(
      "useCellSelectionStore must be used within a CellSelectionProvider"
    );
  }
  return store;
};
