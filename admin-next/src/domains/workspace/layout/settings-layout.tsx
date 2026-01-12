"use client";

import { ReactNode } from "react";
import { createStyles } from "antd-style";

// ============================================================================
// Styles
// ============================================================================

const useStyles = createStyles(({ token }) => ({
  layout: {
    width: "100%",
    maxWidth: 800,
    margin: "0 auto",
    padding: token.paddingLG,
    display: "flex",
    flexDirection: "column",
    gap: token.marginLG,
  },
}));

// ============================================================================
// Types
// ============================================================================

export interface ISettingsLayoutProps {
  children: ReactNode;
  className?: string;
  name?: string;
}

// ============================================================================
// Component
// ============================================================================

export const SettingsLayout = ({
  children,
  className,
  name,
}: ISettingsLayoutProps) => {
  const { styles, cx } = useStyles();

  return (
    <div
      className={cx(styles.layout, className)}
      data-testid={name ? `${name}-layout` : "settings-layout"}
    >
      {children}
    </div>
  );
};
