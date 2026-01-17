"use client";

import {
  createContext,
  useContext,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import type { PanelConfig, ActionConfig } from "./floating-panel-stack";

// ============================================================================
// Types
// ============================================================================

export interface SelectionByState {
  active?: number;
  deleted?: number;
  [key: string]: number | undefined;
}

export interface DataPageState {
  // Selection
  selectedIds: string[];
  selectionByState: SelectionByState;

  // Editing
  editingId: string | null;
  editingItemName: string | null;
  hasUnsavedChanges: boolean;
  isSaving: boolean;

  // Derived
  selectedCount: number;
  canNavigate: boolean;
  panels: PanelConfig[];
}

export interface DataPageActions {
  // Selection
  setSelectedIds: (ids: string[]) => void;
  setSelectionByState: (byState: SelectionByState) => void;
  clearSelection: () => void;

  // Editing
  startEditing: (id: string, itemName?: string) => void;
  stopEditing: () => void;
  setHasUnsavedChanges: (hasChanges: boolean) => void;
  setSaving: (saving: boolean) => void;
}

export interface DataPageContextValue extends DataPageState, DataPageActions {}

// ============================================================================
// Context
// ============================================================================

const DataPageContext = createContext<DataPageContextValue | null>(null);

export function useDataPageContext(): DataPageContextValue {
  const context = useContext(DataPageContext);
  if (!context) {
    throw new Error("useDataPageContext must be used within DataPageProvider");
  }
  return context;
}

export function useDataPageContextSafe(): DataPageContextValue | null {
  return useContext(DataPageContext);
}

// ============================================================================
// Hook for building panels
// ============================================================================

export interface UseDataPagePanelsOptions {
  // Selection panel config
  selectionActions?: ActionConfig[];
  onDeselectAll?: () => void;

  // Editing panel config
  onSave?: () => void;
  onCancelEdit?: () => void;
}

export function useDataPagePanels(options: UseDataPagePanelsOptions): PanelConfig[] {
  const context = useDataPageContextSafe();

  return useMemo(() => {
    if (!context) return [];

    const panels: PanelConfig[] = [];

    // Add editing panel (bottom of stack, shows on top)
    if (context.editingId && options.onSave && options.onCancelEdit) {
      panels.push({
        type: "editing",
        hasChanges: context.hasUnsavedChanges,
        saving: context.isSaving,
        onSave: options.onSave,
        onCancel: options.onCancelEdit,
      });
    }

    // Add selection panel (top of stack, shows below editing)
    if (context.selectedCount > 0 && options.selectionActions && options.onDeselectAll) {
      panels.push({
        type: "selection",
        count: context.selectedCount,
        actions: options.selectionActions,
        onDeselectAll: options.onDeselectAll,
      });
    }

    return panels;
  }, [
    context?.editingId,
    context?.editingItemName,
    context?.hasUnsavedChanges,
    context?.isSaving,
    context?.selectedCount,
    options.selectionActions,
    options.onDeselectAll,
    options.onSave,
    options.onCancelEdit,
  ]);
}

// ============================================================================
// Provider
// ============================================================================

export interface DataPageProviderProps {
  children: ReactNode;

  // Selection state (controlled)
  selectedIds?: string[];
  selectionByState?: SelectionByState;
  onSelectionChange?: (ids: string[]) => void;

  // Editing state (controlled)
  editingId?: string | null;
  editingItemName?: string | null;
  hasUnsavedChanges?: boolean;
  isSaving?: boolean;
  onEditingChange?: (id: string | null, itemName?: string | null) => void;
  onUnsavedChangesChange?: (hasChanges: boolean) => void;
  onSavingChange?: (saving: boolean) => void;
}

export function DataPageProvider({
  children,
  selectedIds = [],
  selectionByState = {},
  onSelectionChange,
  editingId = null,
  editingItemName = null,
  hasUnsavedChanges = false,
  isSaving = false,
  onEditingChange,
  onUnsavedChangesChange,
  onSavingChange,
}: DataPageProviderProps) {
  // Selection actions
  const setSelectedIds = useCallback(
    (ids: string[]) => {
      onSelectionChange?.(ids);
    },
    [onSelectionChange]
  );

  const setSelectionByState = useCallback(
    (_byState: SelectionByState) => {
      // This is typically set alongside selectedIds
      // Implement if needed for external state management
    },
    []
  );

  const clearSelection = useCallback(() => {
    onSelectionChange?.([]);
  }, [onSelectionChange]);

  // Editing actions
  const startEditing = useCallback(
    (id: string, itemName?: string) => {
      onEditingChange?.(id, itemName);
    },
    [onEditingChange]
  );

  const stopEditing = useCallback(() => {
    onEditingChange?.(null, null);
    onUnsavedChangesChange?.(false);
  }, [onEditingChange, onUnsavedChangesChange]);

  const setHasUnsavedChanges = useCallback(
    (hasChanges: boolean) => {
      onUnsavedChangesChange?.(hasChanges);
    },
    [onUnsavedChangesChange]
  );

  const setSaving = useCallback(
    (saving: boolean) => {
      onSavingChange?.(saving);
    },
    [onSavingChange]
  );

  // Derived state
  const selectedCount = selectedIds.length;
  const canNavigate = !hasUnsavedChanges && !isSaving;

  // Build panels for convenience
  const panels = useMemo<PanelConfig[]>(() => {
    const result: PanelConfig[] = [];

    // Editing panel would be added by the consumer using useDataPagePanels
    // This is just for reference

    return result;
  }, []);

  const value: DataPageContextValue = useMemo(
    () => ({
      // State
      selectedIds,
      selectionByState,
      editingId,
      editingItemName,
      hasUnsavedChanges,
      isSaving,
      selectedCount,
      canNavigate,
      panels,

      // Actions
      setSelectedIds,
      setSelectionByState,
      clearSelection,
      startEditing,
      stopEditing,
      setHasUnsavedChanges,
      setSaving,
    }),
    [
      selectedIds,
      selectionByState,
      editingId,
      editingItemName,
      hasUnsavedChanges,
      isSaving,
      selectedCount,
      canNavigate,
      panels,
      setSelectedIds,
      setSelectionByState,
      clearSelection,
      startEditing,
      stopEditing,
      setHasUnsavedChanges,
      setSaving,
    ]
  );

  return (
    <DataPageContext.Provider value={value}>
      {children}
    </DataPageContext.Provider>
  );
}
