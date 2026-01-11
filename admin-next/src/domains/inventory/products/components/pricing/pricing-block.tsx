import { createStyles } from "antd-style";
import { Typography, Button, Tag, Tooltip, Dropdown, Flex } from "antd";
import { DownOutlined } from "@ant-design/icons";
import { useState, useMemo } from "react";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { Tile } from "../tile";
import { PeriodSwitch, CHART_PERIODS, ChartPeriod } from "../period-switch";
import { PriceChart } from "./components";
import { formatPrice as defaultFormatPrice } from "./utils";
import type {
  IPricingBlockProps,
  ApiVariant,
  ApiVariantPriceConnection,
  ApiVariantPriceHistoryStatistics,
} from "./types";

// Non-breaking space for currency formatting
const NBSP = "\u00A0";

// ============================================================================
// Styles
// ============================================================================

const useStyles = createStyles(({ token }) => ({
  card: {
    padding: 16,
    minHeight: "auto",
  },
  headerSelect: {
    fontSize: 12,
  },
  twoColumn: {
    display: "flex",
    gap: 8,
    alignItems: "stretch",
    marginBottom: 8,
    "@media (max-width: 768px)": {
      flexDirection: "column",
    },
  },
  priceColumnWrapper: {
    flex: 1,
    minWidth: 0,
    display: "flex",
  },
  chartColumnWrapper: {
    flex: 1.5,
    minWidth: 0,
    display: "flex",
  },
  column: {
    padding: 12,
    background: token.colorBgContainer,
    borderRadius: 8,
    border: `1px solid ${token.colorBorderSecondary}`,
    flex: 1,
    width: "100%",
  },
  sectionLabel: {
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    display: "block",
    marginBottom: 8,
    color: token.colorTextSecondary,
    fontWeight: 500,
  },
  mainPrice: {
    "&&": {
      fontSize: 32,
      fontWeight: 700,
      margin: 0,
      lineHeight: 1.2,
      whiteSpace: "nowrap",
    },
  },
  discountTag: {
    margin: 0,
    fontSize: 11,
    fontWeight: 600,
    background: token.colorBgContainerDisabled,
    color: token.colorText,
  },
  sourceTag: {
    margin: 0,
    fontSize: 10,
    background: "transparent",
    color: token.colorTextSecondary,
    cursor: "help",
  },
  kpiRow: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 8,
    "@media (max-width: 768px)": {
      gridTemplateColumns: "repeat(2, 1fr)",
    },
  },
  kpiTile: {
    textAlign: "center",
    minHeight: 56,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
  },
  warningIcon: {
    color: token.colorWarning,
    fontSize: 10,
  },
}));

// ============================================================================
// Sub-components
// ============================================================================

interface IPricingHeaderProps {
  variants?: ApiVariant[];
  selectedVariantId?: string;
  onVariantSelect?: (id: string) => void;
  formatPrice?: (amount: number) => string;
}

const PricingHeader = ({
  variants,
  selectedVariantId,
  onVariantSelect,
  formatPrice,
}: IPricingHeaderProps) => {
  const { styles } = useStyles();
  const selectedVariant = variants?.find((v) => v.id === selectedVariantId);

  const getPrice = (v: ApiVariant): number => v.price?.amountMinor ?? 0;

  const variantMenuItems = variants?.map((v) => ({
    key: v.id,
    label: (
      <Flex justify="space-between" align="center" style={{ width: "100%" }}>
        <span>{v.title ?? "Untitled"}</span>
        <Typography.Text style={{ fontWeight: 600, marginLeft: 24 }}>
          {formatPrice ? formatPrice(getPrice(v)) : getPrice(v)}
        </Typography.Text>
      </Flex>
    ),
  }));

  const variantSelect =
    variants && variants.length > 1 ? (
      <Dropdown
        menu={{
          items: variantMenuItems,
          selectedKeys: selectedVariantId ? [selectedVariantId] : [],
          onClick: ({ key }) => onVariantSelect?.(key),
        }}
        trigger={["click"]}
      >
        <Button
          size="small"
          className={styles.headerSelect}
          variant="text"
          color="default"
        >
          <Flex align="center" gap={4}>
            <span>{selectedVariant?.title || "Select variant"}</span>
            <DownOutlined style={{ fontSize: 10, marginLeft: 4 }} />
          </Flex>
        </Button>
      </Dropdown>
    ) : undefined;

  return <PaperHeader title="Pricing" actions={variantSelect} />;
};

interface ICurrentPriceColumnProps {
  price: number;
  compareAtPrice: number | null;
  formatPrice: (amount: number) => string;
}

const CurrentPriceColumn = ({
  price,
  compareAtPrice,
  formatPrice,
}: ICurrentPriceColumnProps) => {
  const { styles } = useStyles();

  const saving =
    compareAtPrice && compareAtPrice > price ? compareAtPrice - price : null;
  const discountPercent =
    saving && compareAtPrice
      ? Math.round((saving / compareAtPrice) * 100)
      : null;

  return (
    <div className={styles.column}>
      <Typography.Text className={styles.sectionLabel}>
        Current price
      </Typography.Text>

      <Typography.Title level={2} className={styles.mainPrice}>
        {formatPrice(price)}
      </Typography.Title>

      <Flex align="center" gap={8} style={{ marginTop: 8 }}>
        {discountPercent && (
          <Tag className={styles.discountTag}>-{discountPercent}%</Tag>
        )}
        <Tooltip title="Price set manually by user">
          <Tag className={styles.sourceTag}>Manual</Tag>
        </Tooltip>
      </Flex>

      {compareAtPrice && compareAtPrice > price && (
        <Flex align="center" gap={12} style={{ marginTop: 12, fontSize: 13 }}>
          <Typography.Text type="secondary">
            Was:{NBSP}
            <Typography.Text delete type="secondary">
              {formatPrice(compareAtPrice)}
            </Typography.Text>
          </Typography.Text>
          {saving && (
            <Typography.Text type="secondary">
              Save{NBSP}
              {formatPrice(saving)}
            </Typography.Text>
          )}
        </Flex>
      )}
    </div>
  );
};

interface IPriceHistoryChartColumnProps {
  history: ApiVariantPriceConnection;
  formatPrice: (amount: number) => string;
}

const PriceHistoryChartColumn = ({
  history,
  formatPrice,
}: IPriceHistoryChartColumnProps) => {
  const { styles } = useStyles();
  const [timeRange, setTimeRange] = useState<ChartPeriod>("30D");

  // Filter history by time range
  const filteredHistory = useMemo((): ApiVariantPriceConnection => {
    const now = new Date();
    const daysMap: Record<ChartPeriod, number> = {
      "7D": 7,
      "30D": 30,
      "90D": 90,
    };
    const days = daysMap[timeRange];
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const filteredEdges = history.edges.filter(
      (edge) => new Date(edge.node.effectiveFrom) >= cutoff
    );

    return {
      ...history,
      edges: filteredEdges,
      totalCount: filteredEdges.length,
    };
  }, [history, timeRange]);

  return (
    <div className={styles.column}>
      <Flex align="center" justify="space-between" style={{ marginBottom: 8 }}>
        <Typography.Text
          className={styles.sectionLabel}
          style={{ marginBottom: 0 }}
        >
          Price history
        </Typography.Text>

        <PeriodSwitch
          periods={CHART_PERIODS}
          value={timeRange}
          onChange={setTimeRange}
        />
      </Flex>

      <PriceChart
        history={filteredHistory}
        formatPrice={formatPrice}
        height={100}
        gridLineCount={3}
      />
    </div>
  );
};

interface IKPIRowProps {
  stats: ApiVariantPriceHistoryStatistics | null;
  costPrice: number | null;
  formatPrice: (amount: number) => string;
}

const KPIRow = ({ stats, costPrice, formatPrice }: IKPIRowProps) => {
  const { styles } = useStyles();

  return (
    <div className={styles.kpiRow}>
      <Tile
        label="Cost"
        value={costPrice ? formatPrice(costPrice) : "—"}
        tooltip={costPrice ? "Product cost price" : "Cost data missing"}
        centered
        className={styles.kpiTile}
      />
      <Tile
        label="Min"
        value={stats?.minPriceMinor ? formatPrice(stats.minPriceMinor) : "—"}
        tooltip="Minimum price over the period"
        centered
        className={styles.kpiTile}
      />
      <Tile
        label="Max"
        value={stats?.maxPriceMinor ? formatPrice(stats.maxPriceMinor) : "—"}
        tooltip="Maximum price over the period"
        centered
        className={styles.kpiTile}
      />
      <Tile
        label="Avg"
        value={stats?.avgPriceMinor ? formatPrice(stats.avgPriceMinor) : "—"}
        tooltip="Average price over the period"
        centered
        className={styles.kpiTile}
      />
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const PricingBlock = ({
  variants,
  selectedVariantId: selectedVariantIdProp,
  onVariantSelect,
  stats = null,
  formatPrice: formatPriceProp,
}: IPricingBlockProps) => {
  const { styles } = useStyles();

  const [internalSelectedVariantId, setInternalSelectedVariantId] = useState<
    string | undefined
  >(variants[0]?.id);
  const selectedVariantId = selectedVariantIdProp ?? internalSelectedVariantId;

  const handleVariantSelect = (id: string) => {
    setInternalSelectedVariantId(id);
    onVariantSelect?.(id);
  };

  const formatPrice =
    formatPriceProp ||
    ((amount: number) => {
      return defaultFormatPrice(amount);
    });

  // Get selected variant data
  const selectedVariant = useMemo(() => {
    return variants.find((v) => v.id === selectedVariantId) ?? variants[0];
  }, [variants, selectedVariantId]);

  // Extract pricing data from selected variant
  const price = selectedVariant?.price?.amountMinor ?? 0;
  const compareAtPrice = selectedVariant?.price?.compareAtMinor ?? null;
  const costPrice = selectedVariant?.cost?.unitCostMinor ?? null;
  const priceHistory = selectedVariant?.priceHistory ?? {
    edges: [],
    pageInfo: { hasNextPage: false, hasPreviousPage: false },
    totalCount: 0,
  };

  return (
    <Paper className={styles.card}>
      <PricingHeader
        variants={variants}
        selectedVariantId={selectedVariantId}
        onVariantSelect={handleVariantSelect}
        formatPrice={formatPrice}
      />

      <div className={styles.twoColumn}>
        <div className={styles.priceColumnWrapper}>
          <CurrentPriceColumn
            price={price}
            compareAtPrice={compareAtPrice}
            formatPrice={formatPrice}
          />
        </div>
        <div className={styles.chartColumnWrapper}>
          <PriceHistoryChartColumn
            history={priceHistory}
            formatPrice={formatPrice}
          />
        </div>
      </div>

      <KPIRow stats={stats} costPrice={costPrice} formatPrice={formatPrice} />
    </Paper>
  );
};
