"use client";

import type { ReactNode } from "react";
import { createStyles } from "antd-style";

// ============================================================================
// Styles
// ============================================================================

const useStyles = createStyles(({ token, css }) => ({
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
    height: 64px;
    display: flex;
    align-items: center;
    box-sizing: border-box;
  `,
}));

// ============================================================================
// Component
// ============================================================================

export interface PanelBaseProps {
  children: ReactNode;
  className?: string;
  width?: number | string;
  style?: React.CSSProperties;
}

export function PanelBase({
  children,
  className,
  width = 600,
  style,
}: PanelBaseProps) {
  const { styles, cx } = useStyles();

  return (
    <div
      className={cx(styles.panel, className)}
      style={{ width, ...style }}
    >
      {children}
    </div>
  );
}
