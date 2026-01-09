import { createStyles } from "antd-style";
import { Tag, Flex, Switch, Typography, Tooltip } from "antd";

// ============================================================================
// Types
// ============================================================================

interface IPeriodOption<T extends string> {
  value: T;
  label: string;
}

interface IPeriodSwitchProps<T extends string> {
  periods: readonly IPeriodOption<T>[];
  value: T;
  onChange: (value: T) => void;
  compareEnabled?: boolean;
  onCompareChange?: (enabled: boolean) => void;
  showCompare?: boolean;
}

// ============================================================================
// Styles
// ============================================================================

const useStyles = createStyles(({ token }) => ({
  periodTag: {
    margin: 0,
    cursor: "pointer",
    userSelect: "none",
    transition: "all 0.2s",
  },
  periodTagDefault: {
    fontSize: token.fontSizeSM,
    padding: "2px 8px",
    lineHeight: "16px",
  },

  periodTagActive: {
    background: token.colorText,
    color: token.colorBgContainer,
    borderColor: token.colorText,
  },
  periodTagInactive: {
    background: token.colorBgLayout,
    color: token.colorTextSecondary,
    borderColor: token.colorBorder,
    "&:hover": {
      borderColor: token.colorTextTertiary,
      color: token.colorText,
    },
  },
  compareText: {
    fontSize: 12,
    cursor: "pointer",
    userSelect: "none",
  },
}));

// ============================================================================
// Component
// ============================================================================

export function PeriodSwitch<T extends string>({
  periods,
  value,
  onChange,
  compareEnabled,
  onCompareChange,
  showCompare = false,
}: IPeriodSwitchProps<T>) {
  const { styles, cx } = useStyles();

  return (
    <Flex align="center" justify="space-between" gap={12}>
      <Flex align="center" gap={4}>
        {periods.map((period) => (
          <Tag
            key={period.value}
            onClick={() => onChange(period.value)}
            className={cx(
              styles.periodTag,
              styles.periodTagDefault,
              value === period.value
                ? styles.periodTagActive
                : styles.periodTagInactive
            )}
          >
            {period.label}
          </Tag>
        ))}
      </Flex>

      {showCompare && onCompareChange && (
        <Flex align="center" gap={8}>
          <Tooltip title="Compare with previous period">
            <Typography.Text
              type="secondary"
              className={styles.compareText}
              onClick={() => onCompareChange(!compareEnabled)}
            >
              Compare
            </Typography.Text>
          </Tooltip>
          <Switch
            size="small"
            checked={compareEnabled}
            onChange={onCompareChange}
          />
        </Flex>
      )}
    </Flex>
  );
}

// ============================================================================
// Predefined period sets
// ============================================================================

export const KPI_PERIODS = [
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
  { value: "90d", label: "90D" },
  { value: "ytd", label: "YTD" },
  { value: "all", label: "All" },
] as const;

export const CHART_PERIODS = [
  { value: "7D", label: "7D" },
  { value: "30D", label: "30D" },
  { value: "90D", label: "90D" },
] as const;

export type KPIPeriod = (typeof KPI_PERIODS)[number]["value"];
export type ChartPeriod = (typeof CHART_PERIODS)[number]["value"];
