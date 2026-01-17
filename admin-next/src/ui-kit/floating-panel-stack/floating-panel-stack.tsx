"use client";

import { useEffect, useState, useRef, createContext, useContext, ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button, Flex, Typography, Tooltip } from "antd";
import { CloseOutlined, CheckSquareOutlined, EditOutlined } from "@ant-design/icons";
import { createStyles, createGlobalStyle } from "antd-style";

// ============================================================================
// Constants
// ============================================================================

const SCALE_FACTOR = 0.05;
const TRANSLATE_Y = 16;
const ANIMATION_DURATION = 300;

// ============================================================================
// Global Animations
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

const useStyles = createStyles(({ token, css }) => ({
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

    &[data-state="entering"] {
      animation: floatingPanelEnter ${ANIMATION_DURATION}ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    }

    &[data-state="exiting"] {
      animation: floatingPanelExit ${ANIMATION_DURATION * 0.8}ms cubic-bezier(0.4, 0, 1, 1) forwards;
      pointer-events: none;
    }
  `,
  panel: css`
    background: ${token.colorBgElevated};
    border: 1px solid ${token.colorBorderSecondary};
    border-radius: ${token.borderRadiusLG}px;
    box-shadow:
      0 6px 16px 0 rgba(0, 0, 0, 0.08),
      0 3px 6px -4px rgba(0, 0, 0, 0.12),
      0 9px 28px 8px rgba(0, 0, 0, 0.05);
    padding: ${token.paddingSM}px ${token.paddingMD}px;
    backdrop-filter: blur(8px);
    width: 600px;
    height: 64px;
    display: flex;
    align-items: center;
    box-sizing: border-box;
  `,
  label: css`
    color: ${token.colorText};
    font-weight: 500;
    white-space: nowrap;
  `,
  icon: css`
    font-size: 16px;
  `,
  selectionIcon: css`
    color: ${token.colorPrimary};
  `,
  editingIcon: css`
    color: ${token.colorWarning};
  `,
  closeButton: css`
    color: ${token.colorTextTertiary};
    &:hover {
      color: ${token.colorText};
    }
  `,
  divider: css`
    width: 1px;
    height: 24px;
    background: ${token.colorBorderSecondary};
    margin: 0 ${token.marginXS}px;
  `,
  actionCount: css`
    margin-left: 4px;
    color: ${token.colorTextSecondary};
  `,
}));

// ============================================================================
// Types
// ============================================================================

export type PanelType = "selection" | "editing";

export interface ActionConfig {
  key: string;
  label: string;
  icon?: ReactNode;
  count?: number;
  danger?: boolean;
  loading?: boolean;
  disabled?: boolean;
  tooltip?: string;
  onClick: () => void;
}

export interface SelectionPanelConfig {
  type: "selection";
  count: number;
  actions: ActionConfig[];
  onDeselectAll: () => void;
}

export interface EditingPanelConfig {
  type: "editing";
  /** Number of unsaved changes */
  changesCount?: number;
  hasChanges: boolean;
  saving?: boolean;
  onSave: () => void;
  onCancel: () => void;
}

export type PanelConfig = SelectionPanelConfig | EditingPanelConfig;

export interface FloatingPanelStackProps {
  panels: PanelConfig[];
}

// ============================================================================
// Context
// ============================================================================

interface FloatingPanelContextValue {
  hasUnsavedChanges: boolean;
  isActionInProgress: boolean;
  canNavigate: boolean;
}

const FloatingPanelContext = createContext<FloatingPanelContextValue>({
  hasUnsavedChanges: false,
  isActionInProgress: false,
  canNavigate: true,
});

export const useFloatingPanelContext = () => useContext(FloatingPanelContext);

// ============================================================================
// Panel Content Components
// ============================================================================

function SelectionPanelContent({ config }: { config: SelectionPanelConfig }) {
  const { styles, cx } = useStyles();
  const { count, actions, onDeselectAll } = config;

  return (
    <div className={styles.panel}>
      <Flex align="center" gap="small" style={{ flex: 1 }}>
        <CheckSquareOutlined className={cx(styles.icon, styles.selectionIcon)} />
        <Typography.Text className={styles.label}>
          {count} selected
        </Typography.Text>
      </Flex>

      <div className={styles.divider} />

      <Flex align="center" gap="small">
        {actions.map((action) => {
          const isDisabled = action.disabled || (action.count !== undefined && action.count === 0);
          const button = (
            <Button
              key={action.key}
              danger={action.danger}
              icon={action.icon}
              loading={action.loading}
              disabled={isDisabled}
              onClick={action.onClick}
              size="middle"
            >
              {action.label}
              {action.count !== undefined && action.count > 0 && (
                <span className={styles.actionCount}>({action.count})</span>
              )}
            </Button>
          );

          if (action.tooltip || (action.count === 0)) {
            return (
              <Tooltip key={action.key} title={action.tooltip || "No items match this action"}>
                {button}
              </Tooltip>
            );
          }

          return button;
        })}
      </Flex>
    </div>
  );
}

function EditingPanelContent({ config }: { config: EditingPanelConfig }) {
  const { styles, cx } = useStyles();
  const { changesCount, saving, onSave, onCancel } = config;

  const label = changesCount !== undefined && changesCount > 0
    ? `Unsaved changes (${changesCount})`
    : "Unsaved changes";

  return (
    <div className={styles.panel}>
      <Flex align="center" gap="small" style={{ flex: 1 }}>
        <EditOutlined className={cx(styles.icon, styles.editingIcon)} />
        <Typography.Text className={styles.label}>{label}</Typography.Text>
      </Flex>

      <div className={styles.divider} />

      <Flex align="center" gap="small">
        <Button size="middle" onClick={onCancel} disabled={saving}>
          Discard
        </Button>
        <Button
          type="primary"
          size="middle"
          onClick={onSave}
          loading={saving}
        >
          Save
        </Button>
      </Flex>
    </div>
  );
}

// ============================================================================
// Animated Panel Wrapper
// ============================================================================

type PanelState = "entering" | "visible" | "exiting";

interface AnimatedPanelWrapperProps {
  config: PanelConfig;
  index: number;
  totalCount: number;
  onExitComplete: (type: PanelType) => void;
}

function AnimatedPanelWrapper({
  config,
  index,
  totalCount,
  onExitComplete,
}: AnimatedPanelWrapperProps) {
  const { styles } = useStyles();
  const [state, setState] = useState<PanelState>("entering");
  const prevIndexRef = useRef(index);

  // depth: 0 = top panel, 1 = behind, etc.
  const depth = index;
  const scale = 1 - SCALE_FACTOR * depth;
  const translateY = -TRANSLATE_Y * depth;
  const zIndex = totalCount - depth;
  const opacity = depth >= 2 ? 0 : 1;

  // Transition from entering to visible
  useEffect(() => {
    if (state === "entering") {
      const timer = setTimeout(() => setState("visible"), ANIMATION_DURATION);
      return () => clearTimeout(timer);
    }
  }, [state]);

  // Track index changes for smooth transitions
  useEffect(() => {
    prevIndexRef.current = index;
  }, [index]);

  const transform = `translateX(-50%) translateY(${translateY}px) scale(${scale})`;

  return (
    <div
      className={styles.panelWrapper}
      data-state={state}
      data-type={config.type}
      style={{
        // Don't apply transform during entering - let animation handle it
        transform: state !== "entering" ? transform : undefined,
        opacity: state === "visible" ? opacity : undefined,
        zIndex,
        transition: state === "visible"
          ? `transform ${ANIMATION_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1), opacity ${ANIMATION_DURATION}ms ease`
          : undefined,
      }}
    >
      {config.type === "selection" ? (
        <SelectionPanelContent config={config} />
      ) : (
        <EditingPanelContent config={config} />
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

interface PanelWithState {
  config: PanelConfig;
  state: "active" | "exiting";
}

export function FloatingPanelStack({ panels }: FloatingPanelStackProps) {
  const { styles } = useStyles();
  const [mounted, setMounted] = useState(false);
  const [panelsWithState, setPanelsWithState] = useState<PanelWithState[]>([]);
  const prevPanelTypesRef = useRef<Set<PanelType>>(new Set());

  useEffect(() => {
    setMounted(true);
  }, []);

  // Track panel changes and manage exit animations
  useEffect(() => {
    const currentTypes = new Set(panels.map((p) => p.type));
    const prevTypes = prevPanelTypesRef.current;

    // Find removed panels
    const removedTypes = [...prevTypes].filter((t) => !currentTypes.has(t));

    // Build new state
    const newState: PanelWithState[] = panels.map((config) => ({
      config,
      state: "active" as const,
    }));

    // Add exiting panels
    removedTypes.forEach((type) => {
      const existingPanel = panelsWithState.find((p) => p.config.type === type);
      if (existingPanel) {
        newState.push({ ...existingPanel, state: "exiting" });
      }
    });

    setPanelsWithState(newState);
    prevPanelTypesRef.current = currentTypes;
  }, [panels]);

  // Handle exit complete
  const handleExitComplete = (type: PanelType) => {
    setPanelsWithState((prev) => prev.filter((p) => !(p.config.type === type && p.state === "exiting")));
  };

  // Remove exiting panels after animation
  useEffect(() => {
    const exitingPanels = panelsWithState.filter((p) => p.state === "exiting");
    if (exitingPanels.length > 0) {
      const timer = setTimeout(() => {
        exitingPanels.forEach((p) => handleExitComplete(p.config.type));
      }, ANIMATION_DURATION);
      return () => clearTimeout(timer);
    }
  }, [panelsWithState]);

  // Context value
  const hasUnsavedChanges = panels.some((p) => p.type === "editing" && p.hasChanges);
  const isActionInProgress = panels.some((p) => p.type === "editing" && p.saving);
  const canNavigate = !hasUnsavedChanges && !isActionInProgress;

  const contextValue: FloatingPanelContextValue = {
    hasUnsavedChanges,
    isActionInProgress,
    canNavigate,
  };

  if (!mounted) {
    return null;
  }

  // Only active panels for rendering order
  const activePanels = panelsWithState.filter((p) => p.state === "active");
  const exitingPanels = panelsWithState.filter((p) => p.state === "exiting");

  if (activePanels.length === 0 && exitingPanels.length === 0) {
    return null;
  }

  const content = (
    <FloatingPanelContext.Provider value={contextValue}>
      <GlobalPanelStyles />
      <div className={styles.container}>
        {/* Render active panels */}
        {activePanels.map((panel, index) => (
          <AnimatedPanelWrapper
            key={panel.config.type}
            config={panel.config}
            index={index}
            totalCount={activePanels.length}
            onExitComplete={handleExitComplete}
          />
        ))}
        {/* Render exiting panels */}
        {exitingPanels.map((panel) => (
          <div
            key={`${panel.config.type}-exit`}
            className={styles.panelWrapper}
            data-state="exiting"
            style={{
              transform: "translateX(-50%)",
              zIndex: 0,
            }}
          >
            {panel.config.type === "selection" ? (
              <SelectionPanelContent config={panel.config as SelectionPanelConfig} />
            ) : (
              <EditingPanelContent config={panel.config as EditingPanelConfig} />
            )}
          </div>
        ))}
      </div>
    </FloatingPanelContext.Provider>
  );

  return createPortal(content, document.body);
}
