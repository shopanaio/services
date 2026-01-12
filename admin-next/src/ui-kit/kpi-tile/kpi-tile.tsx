"use client";

import { ReactNode } from "react";
import { Typography, Tooltip, Flex } from "antd";
import { createStyles } from "antd-style";
import {
  InfoCircleOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from "@ant-design/icons";

// ============================================================================
// Types
// ============================================================================

export type KPITileVariant =
  | "default"
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "info";

export interface IKPITileProps {
  /** The label displayed below the value */
  label: string;
  /** The main value to display */
  value: ReactNode;
  /** Optional tooltip text */
  tooltip?: string;
  /** Trend value (positive/negative number shows arrow indicator) */
  trend?: number;
  /** Suffix for trend value (default: '%') */
  trendSuffix?: string;
  /** Secondary text below the value */
  secondary?: ReactNode;
  /** Badge element to display in top-right corner */
  badge?: ReactNode;
  /** Color variant for the tile */
  variant?: KPITileVariant;
  /** Icon to display before the value */
  icon?: ReactNode;
  /** Whether the tile is in active/selected state */
  active?: boolean;
  /** Click handler */
  onClick?: () => void;
  /** Additional CSS class */
  className?: string;
}

// ============================================================================
// Styles
// ============================================================================

const useStyles = createStyles(({ token }) => ({
  tile: {
    flex: 1,
    padding: `${token.paddingSM}px ${token.paddingMD}px`,
    backgroundColor: token.colorBgLayout,
    borderRadius: token.borderRadiusLG,
    border: `1px solid ${token.colorBorder}`,
    minHeight: 80,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    transition: "all 0.2s ease",
  },
  tileClickable: {
    cursor: "pointer",
    "&:hover": {
      backgroundColor: token.colorBgTextHover,
      borderColor: token.colorBorderSecondary,
    },
  },
  tileActive: {
    borderColor: token.colorPrimary,
    backgroundColor: token.colorPrimaryBg,
  },
  variantPrimary: {
    borderLeftWidth: 3,
    borderLeftColor: token.colorSuccess,
  },
  variantSuccess: {
    borderLeftWidth: 3,
    borderLeftColor: token.colorSuccess,
  },
  variantWarning: {
    borderLeftWidth: 3,
    borderLeftColor: token.colorWarning,
  },
  variantDanger: {
    borderLeftWidth: 3,
    borderLeftColor: token.colorError,
  },
  variantInfo: {
    borderLeftWidth: 3,
    borderLeftColor: token.colorInfo,
  },
  labelRow: {
    marginBottom: token.marginXXS,
  },
  label: {
    fontSize: token.fontSizeSM - 1,
    fontWeight: 500,
    color: token.colorTextSecondary,
    textTransform: "uppercase" as const,
    letterSpacing: "0.3px",
  },
  tooltipIcon: {
    fontSize: 10,
    color: token.colorTextQuaternary,
    cursor: "help",
    marginLeft: token.marginXXS,
  },
  valueRow: {
    lineHeight: 1.2,
  },
  value: {
    fontSize: token.fontSizeXL,
    fontWeight: 600,
    color: token.colorText,
  },
  icon: {
    fontSize: token.fontSizeLG,
    marginRight: token.marginXS,
    color: token.colorTextSecondary,
  },
  secondary: {
    fontSize: token.fontSizeSM - 1,
    color: token.colorTextTertiary,
    marginTop: token.marginXXS,
  },
  trendPositive: {
    display: "inline-flex",
    alignItems: "center",
    gap: 2,
    padding: "1px 6px",
    borderRadius: 10,
    background: "rgba(82, 196, 26, 0.1)",
    fontSize: 10,
    fontWeight: 500,
    color: token.colorSuccess,
    whiteSpace: "nowrap" as const,
  },
  trendNegative: {
    display: "inline-flex",
    alignItems: "center",
    gap: 2,
    padding: "1px 6px",
    borderRadius: 10,
    background: "rgba(255, 77, 79, 0.1)",
    fontSize: 10,
    fontWeight: 500,
    color: token.colorError,
    whiteSpace: "nowrap" as const,
  },
  trendNeutral: {
    display: "inline-flex",
    alignItems: "center",
    gap: 2,
    padding: "1px 6px",
    borderRadius: 10,
    background: token.colorBgTextHover,
    fontSize: 10,
    fontWeight: 500,
    color: token.colorTextSecondary,
    whiteSpace: "nowrap" as const,
  },
  trendArrow: {
    fontSize: 8,
  },
  trendSuffix: {
    fontSize: 8,
    fontWeight: 400,
    opacity: 0.6,
  },
  badge: {
    marginLeft: "auto",
  },
}));

// ============================================================================
// Trend Indicator Component
// ============================================================================

interface ITrendIndicatorProps {
  value: number;
  suffix?: string;
}

const TrendIndicator = ({ value, suffix = "%" }: ITrendIndicatorProps) => {
  const { styles } = useStyles();

  const isPositive = value > 0;
  const isNeutral = value === 0;

  const trendClass = isNeutral
    ? styles.trendNeutral
    : isPositive
      ? styles.trendPositive
      : styles.trendNegative;

  return (
    <span className={trendClass}>
      {!isNeutral && (
        <span className={styles.trendArrow}>
          {isPositive ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
        </span>
      )}
      <span>
        {isPositive ? "+" : ""}
        {value}
      </span>
      {suffix && <span className={styles.trendSuffix}>{suffix}</span>}
    </span>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const KPITile = ({
  label,
  value,
  tooltip,
  trend,
  trendSuffix = "%",
  secondary,
  badge,
  variant = "default",
  icon,
  active,
  onClick,
  className,
}: IKPITileProps) => {
  const { styles, cx } = useStyles();

  const variantStyles: Record<KPITileVariant, string | undefined> = {
    default: undefined,
    primary: styles.variantPrimary,
    success: styles.variantSuccess,
    warning: styles.variantWarning,
    danger: styles.variantDanger,
    info: styles.variantInfo,
  };

  return (
    <div
      className={cx(
        styles.tile,
        onClick && styles.tileClickable,
        active && styles.tileActive,
        variantStyles[variant],
        className
      )}
      onClick={onClick}
    >
      {/* Label Row with tooltip and badge */}
      <Flex align="center" className={styles.labelRow}>
        <Typography.Text className={styles.label}>{label}</Typography.Text>
        {tooltip && (
          <Tooltip title={tooltip}>
            <InfoCircleOutlined className={styles.tooltipIcon} />
          </Tooltip>
        )}
        {badge && <div className={styles.badge}>{badge}</div>}
      </Flex>

      {/* Value Row with icon */}
      <Flex align="center" className={styles.valueRow}>
        {icon && <span className={styles.icon}>{icon}</span>}
        <Typography.Text className={styles.value}>{value}</Typography.Text>
      </Flex>

      {/* Secondary text or trend */}
      {(secondary || trend !== undefined) && (
        <Flex align="center" gap={8} className={styles.secondary}>
          {secondary && <span>{secondary}</span>}
          {trend !== undefined && (
            <TrendIndicator value={trend} suffix={trendSuffix} />
          )}
        </Flex>
      )}
    </div>
  );
};
