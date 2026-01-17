"use client";

import { useMemo, useEffect, type ReactNode } from "react";
import { usePanelStack, type ActionConfig, type PanelStackConfig } from "../core";
import { PanelStackContainer, PanelWrapper } from "../components";
import { SelectionPanel } from "../presets/selection-panel";
import { EditingPanel } from "../presets/editing-panel";

// ============================================================================
// Types
// ============================================================================

export interface SelectionPanelConfig {
  type: "selection";
  count: number;
  actions: ActionConfig[];
  onDeselectAll: () => void;
  labelTemplate?: string;
}

export interface EditingPanelConfig {
  type: "editing";
  changesCount?: number;
  hasChanges: boolean;
  saving?: boolean;
  onSave: () => void;
  onCancel: () => void;
}

export interface CustomPanelConfig {
  type: "custom";
  id: string;
  render: () => ReactNode;
}

export type PanelConfig = SelectionPanelConfig | EditingPanelConfig | CustomPanelConfig;

export interface FloatingPanelStackProps {
  /** Array of panel configurations */
  panels: PanelConfig[];
  /** Stack configuration */
  config?: PanelStackConfig;
}

// ============================================================================
// Component
// ============================================================================

/**
 * Composed FloatingPanelStack component for easy integration.
 *
 * Usage:
 * ```tsx
 * const panels = useMemo(() => {
 *   const result: PanelConfig[] = [];
 *   if (selectedIds.length > 0) {
 *     result.push({
 *       type: "selection",
 *       count: selectedIds.length,
 *       actions: [...],
 *       onDeselectAll: () => setSelectedIds([]),
 *     });
 *   }
 *   if (hasChanges) {
 *     result.push({
 *       type: "editing",
 *       hasChanges: true,
 *       onSave: handleSave,
 *       onCancel: handleDiscard,
 *     });
 *   }
 *   return result;
 * }, [selectedIds, hasChanges, ...]);
 *
 * return <FloatingPanelStack panels={panels} />;
 * ```
 */
export function FloatingPanelStack({ panels, config }: FloatingPanelStackProps) {
  const {
    sortedPanels,
    setPanel,
    removePanel,
    getPosition,
    config: stackConfig,
  } = usePanelStack<PanelConfig>(config);

  // Sync panels with stack state
  useEffect(() => {
    const currentIds = new Set(panels.map((p) => p.type === "custom" ? p.id : p.type));
    const stackIds = new Set(sortedPanels.map((p) => p.id));

    // Add or update panels
    panels.forEach((panel) => {
      const id = panel.type === "custom" ? panel.id : panel.type;
      setPanel(id, panel.type, panel);
    });

    // Remove panels that are no longer in the config
    stackIds.forEach((id) => {
      if (!currentIds.has(id)) {
        removePanel(id);
      }
    });
  }, [panels, setPanel, removePanel]);

  if (sortedPanels.length === 0) {
    return null;
  }

  return (
    <PanelStackContainer animationDuration={stackConfig.animationDuration}>
      {sortedPanels.map((panel, index) => {
        const position = getPosition(index, sortedPanels.length);
        const panelConfig = panel.data as PanelConfig;

        return (
          <PanelWrapper
            key={panel.id}
            position={position}
            animationState={panel.animationState}
            animationDuration={stackConfig.animationDuration}
          >
            {renderPanel(panelConfig)}
          </PanelWrapper>
        );
      })}
    </PanelStackContainer>
  );
}

function renderPanel(config: PanelConfig): ReactNode {
  switch (config.type) {
    case "selection":
      return (
        <SelectionPanel
          count={config.count}
          actions={config.actions}
          labelTemplate={config.labelTemplate}
        />
      );
    case "editing":
      return (
        <EditingPanel
          hasChanges={config.hasChanges}
          changesCount={config.changesCount}
          saving={config.saving}
          onSave={config.onSave}
          onCancel={config.onCancel}
        />
      );
    case "custom":
      return config.render();
    default:
      return null;
  }
}
