"use client";

import { useMemo, useCallback } from "react";
import type { GridState, StateUpdatedEvent } from "ag-grid-community";

export interface UseGridStateOptions {
  /** Unique key for localStorage */
  storageKey: string;
  /** Custom storage (defaults to localStorage) */
  storage?: Storage;
}

export interface UseGridStateReturn {
  /** Initial state to pass to AgGridReact */
  initialState: GridState | undefined;
  /** Callback to pass to onStateUpdated */
  onStateUpdated: (event: StateUpdatedEvent) => void;
  /** Clear saved state */
  clearState: () => void;
}

/**
 * Hook for persisting AG Grid state to localStorage
 *
 * @example
 * const { initialState, onStateUpdated } = useGridState({
 *   storageKey: "my-grid-state",
 * });
 *
 * <AgGridReact
 *   initialState={initialState}
 *   onStateUpdated={onStateUpdated}
 * />
 */
export function useGridState(options: UseGridStateOptions): UseGridStateReturn {
  const { storageKey, storage } = options;

  const getStorage = useCallback(() => {
    if (typeof window === "undefined") return null;
    return storage ?? localStorage;
  }, [storage]);

  const initialState = useMemo<GridState | undefined>(() => {
    const store = getStorage();
    if (!store) return undefined;

    try {
      const saved = store.getItem(storageKey);
      return saved ? JSON.parse(saved) : undefined;
    } catch {
      return undefined;
    }
  }, [storageKey, getStorage]);

  const onStateUpdated = useCallback(
    (event: StateUpdatedEvent) => {
      const store = getStorage();
      if (!store) return;

      try {
        store.setItem(storageKey, JSON.stringify(event.state));
      } catch {
        // Storage full or not available
      }
    },
    [storageKey, getStorage]
  );

  const clearState = useCallback(() => {
    const store = getStorage();
    if (!store) return;

    try {
      store.removeItem(storageKey);
    } catch {
      // Storage not available
    }
  }, [storageKey, getStorage]);

  return {
    initialState,
    onStateUpdated,
    clearState,
  };
}
