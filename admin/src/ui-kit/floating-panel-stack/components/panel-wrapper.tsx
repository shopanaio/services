"use client";

import type { ReactNode } from "react";
import { createStyles } from "antd-style";
import type { PanelPosition, PanelAnimationState } from "../core/types";
import { DEFAULT_STACK_CONFIG } from "../core";

// ============================================================================
// Styles
// ============================================================================

const useStyles = createStyles(({ css }) => ({
  wrapper: css`
    position: absolute;
    bottom: 0;
    left: 50%;
    transform-origin: bottom center;
    pointer-events: auto;
  `,
}));

// ============================================================================
// Component
// ============================================================================

export interface PanelWrapperProps {
  children: ReactNode;
  position: PanelPosition;
  animationState: PanelAnimationState;
  animationDuration?: number;
}

export function PanelWrapper({
  children,
  position,
  animationState,
  animationDuration = DEFAULT_STACK_CONFIG.animationDuration,
}: PanelWrapperProps) {
  const { styles } = useStyles();

  const { scale, translateY, zIndex, isVisible } = position;

  // Calculate styles based on animation state
  const getAnimationStyles = (): React.CSSProperties => {
    switch (animationState) {
      case "entering":
        return {
          animation: `floatingPanelEnter ${animationDuration}ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards`,
        };
      case "exiting":
        return {
          animation: `floatingPanelExit ${animationDuration * 0.8}ms cubic-bezier(0.4, 0, 1, 1) forwards`,
          pointerEvents: "none",
        };
      case "visible":
        return {
          transform: `translateX(-50%) translateY(${translateY}px) scale(${scale})`,
          opacity: isVisible ? 1 : 0,
          transition: `transform ${animationDuration}ms cubic-bezier(0.4, 0, 0.2, 1), opacity ${animationDuration}ms ease`,
        };
      default:
        return {};
    }
  };

  return (
    <div
      className={styles.wrapper}
      data-state={animationState}
      style={{
        zIndex,
        ...getAnimationStyles(),
      }}
    >
      {children}
    </div>
  );
}
