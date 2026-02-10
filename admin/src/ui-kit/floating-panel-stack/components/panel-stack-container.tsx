"use client";

import { useState, useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { createStyles, createGlobalStyle } from "antd-style";
import { DEFAULT_STACK_CONFIG } from "../core";

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

const useStyles = createStyles(({ css }) => ({
  container: css`
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 1000;
    pointer-events: none;
  `,
}));

// ============================================================================
// Component
// ============================================================================

export interface PanelStackContainerProps {
  children: ReactNode;
  className?: string;
  /** Animation duration in ms */
  animationDuration?: number;
}

export function PanelStackContainer({
  children,
  className,
  animationDuration = DEFAULT_STACK_CONFIG.animationDuration,
}: PanelStackContainerProps) {
  const { styles, cx } = useStyles();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const content = (
    <>
      <GlobalPanelStyles />
      <div className={cx(styles.container, className)}>{children}</div>
    </>
  );

  return createPortal(content, document.body);
}
