"use client";

import { useEffect, useCallback, useMemo, type ReactNode } from "react";
import { usePanelStack, type ActionConfig, type PanelStackConfig } from "../core";
import { PanelStackContainer, PanelWrapper } from "../components";
import { SelectionPanel } from "../presets/selection-panel";
import { EditingPanel } from "../presets/editing-panel";

// ============================================================================
// Types
// ============================================================================

export interface SelectionState {
  /** IDs of selected items */
  selectedIds: string[];
  /** Counts by state (e.g., { active: 5, deleted: 2 }) */
  byState?: Record<string, number>;
}

export interface EditingState {
  /** ID of item being edited (null if not editing) */
  editingId: string | null;
  /** Whether there are unsaved changes */
  hasChanges: boolean;
  /** Number of changes */
  changesCount?: number;
  /** Whether save is in progress */
  isSaving: boolean;
}

export interface SelectionPanelConfig {
  /** Actions to show in selection panel */
  actions: ActionConfig[];
  /** Called when deselect all is clicked */
  onDeselectAll: () => void;
  /** Custom label template (default: "{count} selected") */
  labelTemplate?: string;
}

export interface EditingPanelConfig {
  /** Called when save is clicked */
  onSave: () => void;
  /** Called when discard is clicked */
  onCancel: () => void;
  /** Custom labels */
  labels?: {
    unsaved?: string;
    save?: string;
    discard?: string;
  };
}

export interface UseDataPagePanelsOptions {
  /** Selection state and config */
  selection?: {
    state: SelectionState;
    config: SelectionPanelConfig;
  };
  /** Editing state and config */
  editing?: {
    state: EditingState;
    config: EditingPanelConfig;
  };
  /** Panel stack configuration */
  stackConfig?: PanelStackConfig;
}

export interface UseDataPagePanelsReturn {
  /** Render the floating panel stack */
  renderPanels: () => ReactNode;
  /** Whether user can navigate (no unsaved changes, not saving) */
  canNavigate: boolean;
  /** Whether there are any active panels */
  hasPanels: boolean;
  /** Number of active panels */
  panelCount: number;
}

// ============================================================================
// Hook
// ============================================================================

export function useDataPagePanels(
  options: UseDataPagePanelsOptions
): UseDataPagePanelsReturn {
  const { selection, editing, stackConfig } = options;

  const {
    sortedPanels,
    setPanel,
    removePanel,
    getPosition,
    config,
  } = usePanelStack<unknown>(stackConfig);

  // Sync selection panel state
  useEffect(() => {
    if (selection && selection.state.selectedIds.length > 0) {
      setPanel("selection", "selection", {
        count: selection.state.selectedIds.length,
        byState: selection.state.byState,
        actions: selection.config.actions,
        onDeselectAll: selection.config.onDeselectAll,
        labelTemplate: selection.config.labelTemplate,
      });
    } else {
      removePanel("selection");
    }
  }, [
    selection?.state.selectedIds.length,
    selection?.state.byState,
    selection?.config.actions,
    selection?.config.onDeselectAll,
    selection?.config.labelTemplate,
    setPanel,
    removePanel,
  ]);

  // Sync editing panel state
  useEffect(() => {
    if (editing && editing.state.editingId && editing.state.hasChanges) {
      setPanel("editing", "editing", {
        hasChanges: editing.state.hasChanges,
        changesCount: editing.state.changesCount,
        isSaving: editing.state.isSaving,
        onSave: editing.config.onSave,
        onCancel: editing.config.onCancel,
        labels: editing.config.labels,
      });
    } else if (editing && !editing.state.editingId) {
      removePanel("editing");
    }
  }, [
    editing?.state.editingId,
    editing?.state.hasChanges,
    editing?.state.changesCount,
    editing?.state.isSaving,
    editing?.config.onSave,
    editing?.config.onCancel,
    editing?.config.labels,
    setPanel,
    removePanel,
  ]);

  // Derived state
  const canNavigate = useMemo(() => {
    if (!editing) return true;
    return !editing.state.hasChanges && !editing.state.isSaving;
  }, [editing?.state.hasChanges, editing?.state.isSaving]);

  const hasPanels = sortedPanels.length > 0;
  const panelCount = sortedPanels.length;

  // Render function
  const renderPanels = useCallback(() => {
    if (sortedPanels.length === 0) {
      return null;
    }

    return (
      <PanelStackContainer animationDuration={config.animationDuration}>
        {sortedPanels.map((panel, index) => {
          const position = getPosition(index, sortedPanels.length);

          return (
            <PanelWrapper
              key={panel.id}
              position={position}
              animationState={panel.animationState}
              animationDuration={config.animationDuration}
            >
              {panel.type === "selection" && (
                <SelectionPanel
                  count={(panel.data as any).count}
                  actions={(panel.data as any).actions}
                  labelTemplate={(panel.data as any).labelTemplate}
                />
              )}
              {panel.type === "editing" && (
                <EditingPanel
                  hasChanges={(panel.data as any).hasChanges}
                  changesCount={(panel.data as any).changesCount}
                  saving={(panel.data as any).isSaving}
                  onSave={(panel.data as any).onSave}
                  onCancel={(panel.data as any).onCancel}
                  label={(panel.data as any).labels?.unsaved}
                  saveLabel={(panel.data as any).labels?.save}
                  discardLabel={(panel.data as any).labels?.discard}
                />
              )}
            </PanelWrapper>
          );
        })}
      </PanelStackContainer>
    );
  }, [sortedPanels, getPosition, config.animationDuration]);

  return {
    renderPanels,
    canNavigate,
    hasPanels,
    panelCount,
  };
}
