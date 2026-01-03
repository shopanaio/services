import { createStyles } from "antd-style";
import { Typography, Tooltip, Flex } from "antd";
import {
  InfoCircleOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from "@ant-design/icons";
import { ReactNode } from "react";

// ============================================================================
// Types
// ============================================================================

export type TileVariant =
  | "default"
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "purple";

export interface ITileProps {
  /** Label text displayed above/below value */
  label: string;
  /** Main value to display */
  value: ReactNode;
  /** Secondary text below value */
  secondary?: ReactNode;
  /** Tooltip text for info icon */
  tooltip?: string;
  /** Visual variant for border accent */
  variant?: TileVariant;
  /** Badge element (tag, icon, etc.) */
  badge?: ReactNode;
  /** Active/selected state */
  active?: boolean;
  /** Click handler */
  onClick?: () => void;
  /** Primary tile style (larger, success border) */
  isPrimary?: boolean;
  /** Trend value for indicator */
  trend?: number;
  /** Trend suffix (default: '%') */
  trendSuffix?: string;
  /** Center content */
  centered?: boolean;
  /** Custom className */
  className?: string;
}

// ============================================================================
// Styles
// ============================================================================

const useStyles = createStyles(({ token }) => ({
  tile: {
    padding: "8px 12px",
    background: token.colorBgContainer,
    borderRadius: 6,
    border: `1px solid ${token.colorBorderSecondary}`,
    cursor: "default",
    transition: "all 0.2s ease",
    position: "relative",
    minWidth: 0,
    flex: 1,
  },
  tileClickable: {
    cursor: "pointer",
    "&:hover": {
      background: token.colorBgContainerDisabled,
      borderColor: token.colorBorder,
    },
  },
  tileActive: {
    borderColor: token.colorPrimary,
    background: token.colorPrimaryBg,
  },
  tilePrimary: {
    flex: 1.5,
    borderLeft: "2px solid #13c2c2", // cyan
  },
  tileCentered: {
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    minHeight: 56,
  },
  // Border variants (left accent)
  variantSuccess: {
    borderLeft: `2px solid ${token.colorSuccess}`,
  },
  variantWarning: {
    borderLeft: `2px solid ${token.colorWarning}`,
  },
  variantDanger: {
    borderLeft: `2px solid ${token.colorError}`,
  },
  variantInfo: {
    borderLeft: `2px solid ${token.colorInfo}`,
  },
  variantPurple: {
    borderLeft: "2px solid #722ed1",
  },
  // Label
  label: {
    fontSize: 10,
    fontWeight: 500,
    color: token.colorTextTertiary,
    textTransform: "uppercase",
    letterSpacing: "0.3px",
  },
  infoIcon: {
    fontSize: 10,
    color: token.colorTextTertiary,
    cursor: "help",
  },
  badgeWrapper: {
    marginLeft: "auto",
  },
  // Value
  value: {
    fontSize: token.fontSizeXL,
    fontWeight: 600,
    display: "block",
    lineHeight: 1.2,
    color: token.colorText,
  },
  // Secondary
  secondary: {
    fontSize: 10,
    color: token.colorTextTertiary,
    display: "block",
    marginTop: 2,
  },
  // Trend indicator
  trendBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 2,
    padding: "1px 6px",
    borderRadius: 10,
    fontSize: 10,
    fontWeight: 500,
    whiteSpace: "nowrap",
  },
  trendPositive: {
    background: "rgba(82, 196, 26, 0.1)",
    color: token.colorSuccess,
  },
  trendNegative: {
    background: "rgba(255, 77, 79, 0.1)",
    color: token.colorError,
  },
  trendNeutral: {
    background: token.colorBgContainerDisabled,
    color: token.colorTextSecondary,
  },
  trendArrow: {
    fontSize: 8,
  },
  trendSuffix: {
    fontSize: 8,
    fontWeight: 400,
    opacity: 0.6,
  },
}));

// ============================================================================
// Sub-components
// ============================================================================

interface ITrendIndicatorProps {
  value: number;
  suffix?: string;
}

const TrendIndicator = ({ value, suffix = "%" }: ITrendIndicatorProps) => {
  const { styles, cx } = useStyles();
  const isPositive = value > 0;
  const isNeutral = value === 0;

  return (
    <span
      className={cx(
        styles.trendBadge,
        isNeutral
          ? styles.trendNeutral
          : isPositive
          ? styles.trendPositive
          : styles.trendNegative
      )}
    >
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

export const Tile = ({
  label,
  value,
  secondary,
  tooltip,
  variant = "default",
  badge,
  active,
  onClick,
  isPrimary,
  trend,
  trendSuffix = "%",
  centered,
  className,
}: ITileProps) => {
  const { styles, cx } = useStyles();

  const getVariantClass = () => {
    if (isPrimary) return styles.tilePrimary;
    switch (variant) {
      case "success":
        return styles.variantSuccess;
      case "warning":
        return styles.variantWarning;
      case "danger":
        return styles.variantDanger;
      case "info":
        return styles.variantInfo;
      case "purple":
        return styles.variantPurple;
      default:
        return undefined;
    }
  };

  return (
    <div
      className={cx(
        styles.tile,
        onClick && styles.tileClickable,
        active && styles.tileActive,
        centered && styles.tileCentered,
        getVariantClass(),
        className
      )}
      onClick={onClick}
    >
      {/* Header row: label + info icon + badge */}
      <Flex
        align="center"
        gap={4}
        justify={centered ? "center" : undefined}
        style={{ marginBottom: 2 }}
      >
        <Typography.Text className={styles.label}>{label}</Typography.Text>
        {tooltip && (
          <Tooltip title={tooltip}>
            <InfoCircleOutlined className={styles.infoIcon} />
          </Tooltip>
        )}
        {badge && <div className={styles.badgeWrapper}>{badge}</div>}
      </Flex>

      {/* Value */}
      <Typography.Text className={styles.value}>{value}</Typography.Text>

      {/* Secondary row: secondary text + trend */}
      {(secondary || trend !== undefined) && (
        <Flex
          align="center"
          gap={8}
          justify={centered ? "center" : undefined}
          style={{ marginTop: 4 }}
        >
          {secondary && (
            <Typography.Text className={styles.secondary}>
              {secondary}
            </Typography.Text>
          )}
          {trend !== undefined && (
            <TrendIndicator value={trend} suffix={trendSuffix} />
          )}
        </Flex>
      )}
    </div>
  );
};

// Re-export types for convenience
export type { ITrendIndicatorProps };
