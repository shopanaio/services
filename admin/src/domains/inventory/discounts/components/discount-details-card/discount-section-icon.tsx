"use client";

import type { ReactNode } from "react";
import { Avatar } from "antd";
import { createStyles } from "antd-style";

type DiscountSectionIconTone =
  | "primary"
  | "primaryBordered"
  | "primaryOutline"
  | "neutral"
  | "warning";

interface DiscountSectionIconProps {
  icon: ReactNode;
  tone?: DiscountSectionIconTone;
  shape?: "circle" | "square";
  size?: number;
}

const useStyles = createStyles(({ token }) => ({
  icon: {
    "&&": {
      flexShrink: 0,
      fontSize: token.fontSize,
      border: "1px solid transparent",
    },
  },
  primary: {
    "&&": {
      color: token.colorPrimary,
      background: token.colorPrimaryBg,
      borderColor: "transparent",
    },
  },
  primaryOutline: {
    "&&": {
      color: token.colorPrimary,
      background: token.colorBgContainer,
      borderColor: token.colorPrimaryBorder,
    },
  },
  primaryBordered: {
    "&&": {
      color: token.colorPrimary,
      background: token.colorPrimaryBg,
      borderColor: token.colorPrimaryBorder,
    },
  },
  neutral: {
    "&&": {
      color: token.colorTextTertiary,
      background: token.colorFillSecondary,
      borderColor: token.colorBorderSecondary,
    },
  },
  warning: {
    "&&": {
      color: token.colorWarning,
      background: token.colorWarningBg,
      borderColor: token.colorWarningBorder,
    },
  },
}));

export function DiscountSectionIcon({
  icon,
  tone = "primary",
  shape = "circle",
  size = 28,
}: DiscountSectionIconProps) {
  const { styles, cx } = useStyles();

  return (
    <Avatar
      icon={icon}
      shape={shape}
      size={size}
      className={cx(styles.icon, styles[tone])}
    />
  );
}
