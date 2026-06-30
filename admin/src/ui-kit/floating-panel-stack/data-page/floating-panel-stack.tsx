"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { createStyles, createGlobalStyle } from "antd-style";
import type { ActionConfig } from "../core/types";
import { DEFAULT_STACK_CONFIG } from "../core";
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
}

// ============================================================================
// Constants
// ============================================================================

const ANIMATION_DURATION = DEFAULT_STACK_CONFIG.animationDuration;
const SCALE_FACTOR = 0.08; // Increased from 0.05 for more visible stacking
const TRANSLATE_Y = 20;

// ============================================================================
// Global Styles
// ============================================================================

const GlobalPanelStyles = createGlobalStyle`
  @keyframes floatingPanelEnter {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(30px) scale(0.9);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0) scale(1);
    }
  }

  @keyframes floatingPanelExit {
    from {
      opacity: 1;
      transform: translateX(-50%) translateY(0) scale(1);
    }
    to {
      opacity: 0;
      transform: translateX(-50%) translateY(30px) scale(0.9);
    }
  }
`;

// ============================================================================
// Styles
// ============================================================================

const useStyles = createStyles(({ css }) => ({
  container: css`
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 1000;
    pointer-events: none;
  `,
  panelWrapper: css`
    position: absolute;
    bottom: 0;
    left: 50%;
    transform-origin: bottom center;
    pointer-events: auto;
  `,
}));

// ============================================================================
// Types for internal state
// ============================================================================

type PanelId = string;
type AnimationState = "entering" | "visible" | "exiting";

interface InternalPanel {
  id: PanelId;
  config: PanelConfig;
  state: AnimationState;
  activatedAt: number;
}

// ============================================================================
// Component
// ============================================================================

export function FloatingPanelStack({ panels }: FloatingPanelStackProps) {
  const { styles } = useStyles();
  const [mounted, setMounted] = useState(false);
  const [internalPanels, setInternalPanels] = useState<InternalPanel[]>([]);
  const prevPanelIdsRef = useRef<Set<PanelId>>(new Set());

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mounting state for portal
    setMounted(true);
  }, []);

  // Sync external panels with internal state
  useEffect(() => {
    const currentIds = new Set(panels.map((p) => p.type === "custom" ? p.id : p.type));

    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing props to state is a valid pattern
    setInternalPanels((prev) => {
      const result: InternalPanel[] = [];

      // Update or add panels from props
      panels.forEach((config) => {
        const id = config.type === "custom" ? config.id : config.type;
        const existing = prev.find((p) => p.id === id);

        if (existing) {
          // Update existing - keep state unless it was exiting
          result.push({
            ...existing,
            config,
            state: existing.state === "exiting" ? "entering" : existing.state,
          });
        } else {
          // New panel
          result.push({
            id,
            config,
            state: "entering",
            activatedAt: Date.now(),
          });
        }
      });

      // Mark removed panels as exiting
      prev.forEach((p) => {
        if (!currentIds.has(p.id) && p.state !== "exiting") {
          result.push({ ...p, state: "exiting" });
        }
      });

      // Keep exiting panels that are still animating
      prev.forEach((p) => {
        if (p.state === "exiting" && !result.some((r) => r.id === p.id)) {
          result.push(p);
        }
      });

      return result;
    });

    prevPanelIdsRef.current = currentIds;
  }, [panels]);

  // Transition entering panels to visible
  useEffect(() => {
    const enteringPanels = internalPanels.filter((p) => p.state === "entering");
    if (enteringPanels.length === 0) return;

    const timer = setTimeout(() => {
      setInternalPanels((prev) =>
        prev.map((p) =>
          p.state === "entering" ? { ...p, state: "visible" } : p
        )
      );
    }, ANIMATION_DURATION);

    return () => clearTimeout(timer);
  }, [internalPanels]);

  // Remove exiting panels after animation
  useEffect(() => {
    const exitingPanels = internalPanels.filter((p) => p.state === "exiting");
    if (exitingPanels.length === 0) return;

    const timer = setTimeout(() => {
      setInternalPanels((prev) => prev.filter((p) => p.state !== "exiting"));
    }, ANIMATION_DURATION);

    return () => clearTimeout(timer);
  }, [internalPanels]);

  if (!mounted) return null;

  // Sort: active panels first (by activation time), then exiting
  const activePanels = internalPanels
    .filter((p) => p.state !== "exiting")
    .sort((a, b) => b.activatedAt - a.activatedAt);
  const exitingPanels = internalPanels.filter((p) => p.state === "exiting");

  if (activePanels.length === 0 && exitingPanels.length === 0) {
    return null;
  }

  const content = (
    <>
      <GlobalPanelStyles />
      <div className={styles.container}>
        {/* Render active panels */}
        {activePanels.map((panel, index) => {
          const depth = index;
          const scale = 1 - SCALE_FACTOR * depth;
          const translateY = -TRANSLATE_Y * depth;
          const zIndex = activePanels.length - depth;
          const isVisible = depth < 3;

          return (
            <div
              key={panel.id}
              className={styles.panelWrapper}
              data-state={panel.state}
              style={{
                transform:
                  panel.state === "entering"
                    ? undefined
                    : `translateX(-50%) translateY(${translateY}px) scale(${scale})`,
                opacity: panel.state === "visible" ? (isVisible ? 1 : 0) : undefined,
                zIndex,
                transition:
                  panel.state === "visible"
                    ? `transform ${ANIMATION_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1), opacity ${ANIMATION_DURATION}ms ease`
                    : undefined,
                animation:
                  panel.state === "entering"
                    ? `floatingPanelEnter ${ANIMATION_DURATION}ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards`
                    : undefined,
              }}
            >
              {renderPanel(panel.config)}
            </div>
          );
        })}
        {/* Render exiting panels */}
        {exitingPanels.map((panel) => (
          <div
            key={`${panel.id}-exit`}
            className={styles.panelWrapper}
            data-state="exiting"
            style={{
              transform: "translateX(-50%)",
              zIndex: 0,
              animation: `floatingPanelExit ${ANIMATION_DURATION * 0.8}ms cubic-bezier(0.4, 0, 1, 1) forwards`,
              pointerEvents: "none",
            }}
          >
            {renderPanel(panel.config)}
          </div>
        ))}
      </div>
    </>
  );

  return createPortal(content, document.body);
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
