"use client";

import type { ReactNode } from "react";

// ============================================================================
// Core Panel Types
// ============================================================================

export type PanelId = string;

export type PanelAnimationState = "entering" | "visible" | "exiting";

export interface PanelStackItem<T = unknown> {
  id: PanelId;
  type: string;
  data: T;
  animationState: PanelAnimationState;
  activatedAt: number;
}

// ============================================================================
// Stack Configuration
// ============================================================================

export interface PanelStackConfig {
  /** Maximum number of visible panels in the stack */
  maxVisible?: number;
  /** Animation duration in milliseconds */
  animationDuration?: number;
  /** Scale factor for stacked panels (0-1) */
  scaleFactor?: number;
  /** Vertical offset for stacked panels in pixels */
  translateY?: number;
}

export const DEFAULT_STACK_CONFIG: Required<PanelStackConfig> = {
  maxVisible: 3,
  animationDuration: 300,
  scaleFactor: 0.05,
  translateY: 16,
};

// ============================================================================
// Panel Position
// ============================================================================

export interface PanelPosition {
  /** Depth in the stack (0 = top) */
  depth: number;
  /** Total panels in stack */
  total: number;
  /** Calculated scale */
  scale: number;
  /** Calculated Y offset */
  translateY: number;
  /** Z-index for stacking */
  zIndex: number;
  /** Whether panel is visible (within maxVisible) */
  isVisible: boolean;
}

// ============================================================================
// Action Configuration (for presets)
// ============================================================================

export interface ActionConfig {
  key: string;
  label: string;
  icon?: ReactNode;
  /** Count to display (e.g., number of items this action applies to) */
  count?: number;
  danger?: boolean;
  loading?: boolean;
  disabled?: boolean;
  tooltip?: string;
  onClick: () => void;
}

// ============================================================================
// Preset Panel Configurations
// ============================================================================

export interface SelectionPanelData {
  count: number;
  actions: ActionConfig[];
  onDeselectAll: () => void;
}

export interface EditingPanelData {
  changesCount?: number;
  hasChanges: boolean;
  saving?: boolean;
  onSave: () => void;
  onCancel: () => void;
}

// ============================================================================
// Built-in Panel Types
// ============================================================================

export type BuiltInPanelType = "selection" | "editing";

export type SelectionPanel = PanelStackItem<SelectionPanelData> & { type: "selection" };
export type EditingPanel = PanelStackItem<EditingPanelData> & { type: "editing" };

// ============================================================================
// Panel Stack State
// ============================================================================

export interface PanelStackState<T = unknown> {
  panels: PanelStackItem<T>[];
  config: Required<PanelStackConfig>;
}

// ============================================================================
// Panel Stack Actions
// ============================================================================

export interface PanelStackActions<T = unknown> {
  /** Add or update a panel */
  setPanel: (id: PanelId, type: string, data: T) => void;
  /** Remove a panel (triggers exit animation) */
  removePanel: (id: PanelId) => void;
  /** Clear all panels */
  clearAll: () => void;
  /** Get sorted panels (by activation order, most recent first) */
  getSortedPanels: () => PanelStackItem<T>[];
  /** Calculate position for a panel at given index */
  getPosition: (index: number, total: number) => PanelPosition;
}

// ============================================================================
// Component Props
// ============================================================================

export interface PanelStackContainerProps {
  children: ReactNode;
  className?: string;
}

export interface PanelWrapperProps {
  children: ReactNode;
  position: PanelPosition;
  animationState: PanelAnimationState;
  animationDuration: number;
}

export interface PanelBaseProps {
  children: ReactNode;
  className?: string;
  width?: number | string;
}
