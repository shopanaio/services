import { createStyles } from "antd-style";
import { Typography, Button, Tag, Tooltip, Dropdown, Flex, Spin } from "antd";
import { DownOutlined, LoadingOutlined } from "@ant-design/icons";
import { useCallback, useRef } from "react";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { Tile } from "../tile";
import { PeriodSwitch, CHART_PERIODS } from "../period-switch";
import { PriceChart } from "./components";
import { formatPrice as defaultFormatPrice } from "./utils";
import { usePricingWidget } from "./use-pricing-widget";
import type {
  IPricingBlockProps,
  ApiVariantConnection,
  ApiVariantPriceConnection,
  ApiVariantPriceHistoryStatistics,
  ChartPeriod,
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
  dropdownMenu: {
    maxHeight: 300,
    overflowY: "auto",
  },
  loadingItem: {
    display: "flex",
    justifyContent: "center",
    padding: "8px 0",
  },
}));

// ============================================================================
// Sub-components
// ============================================================================

interface IPricingHeaderProps {
  variants: ApiVariantConnection;
  selectedVariantId: string | null;
  onVariantSelect: (id: string) => void;
  onLoadMore: () => void;
  isLoadingMore: boolean;
  formatPrice: (amount: number) => string;
}

const PricingHeader = ({
  variants,
  selectedVariantId,
  onVariantSelect,
  onLoadMore,
  isLoadingMore,
  formatPrice,
}: IPricingHeaderProps) => {
  const { styles } = useStyles();
  const menuRef = useRef<HTMLDivElement>(null);
  const selectedVariant = variants.edges.find(
    (e) => e.node.id === selectedVariantId
  )?.node;

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const target = e.target as HTMLDivElement;
      const isNearBottom =
        target.scrollHeight - target.scrollTop - target.clientHeight < 50;

      if (isNearBottom && variants.pageInfo.hasNextPage && !isLoadingMore) {
        onLoadMore();
      }
    },
    [variants.pageInfo.hasNextPage, isLoadingMore, onLoadMore]
  );

  const variantMenuItems = variants.edges.map((edge) => ({
    key: edge.node.id,
    label: (
      <Flex justify="space-between" align="center" style={{ width: "100%" }}>
        <span>{edge.node.title ?? "Untitled"}</span>
        <Typography.Text style={{ fontWeight: 600, marginLeft: 24 }}>
          {formatPrice(edge.node.price?.amountMinor ?? 0)}
        </Typography.Text>
      </Flex>
    ),
  }));

  if (isLoadingMore) {
    variantMenuItems.push({
      key: "loading",
      label: (
        <div className={styles.loadingItem}>
          <Spin indicator={<LoadingOutlined spin />} size="small" />
        </div>
      ),
    });
  }

  const variantSelect =
    variants.edges.length > 1 ? (
      <Dropdown
        menu={{
          items: variantMenuItems,
          selectedKeys: selectedVariantId ? [selectedVariantId] : [],
          onClick: ({ key }) => {
            if (key !== "loading") {
              onVariantSelect(key);
            }
          },
        }}
        trigger={["click"]}
        dropdownRender={(menu) => (
          <div
            ref={menuRef}
            className={styles.dropdownMenu}
            onScroll={handleScroll}
          >
            {menu}
          </div>
        )}
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
  period: ChartPeriod;
  onPeriodChange: (period: ChartPeriod) => void;
  formatPrice: (amount: number) => string;
}

const PriceHistoryChartColumn = ({
  history,
  period,
  onPeriodChange,
  formatPrice,
}: IPriceHistoryChartColumnProps) => {
  const { styles } = useStyles();

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
          value={period}
          onChange={onPeriodChange}
        />
      </Flex>

      <PriceChart
        history={history}
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
  productId,
  formatPrice: formatPriceProp,
}: IPricingBlockProps) => {
  const { styles } = useStyles();

  const {
    data,
    isLoading,
    variants,
    isLoadingVariants,
    loadMoreVariants,
    selectedVariantId,
    selectVariant,
    period,
    setPeriod,
  } = usePricingWidget(productId);

  const formatPrice =
    formatPriceProp ||
    ((amount: number) => {
      return defaultFormatPrice(amount);
    });

  // Extract pricing data from widget response
  const price = data?.currentPrice?.amountMinor ?? 0;
  const compareAtPrice = data?.currentPrice?.compareAtMinor ?? null;
  const costPrice = data?.currentCostPrice?.unitCostMinor ?? null;
  const history = data?.history ?? {
    __typename: "VariantPriceConnection" as const,
    edges: [],
    pageInfo: {
      __typename: "PageInfo" as const,
      hasNextPage: false,
      hasPreviousPage: false,
    },
    totalCount: 0,
  };
  const stats = data?.statistics ?? null;

  if (isLoading && !data) {
    return (
      <Paper className={styles.card}>
        <Flex justify="center" align="center" style={{ minHeight: 200 }}>
          <Spin indicator={<LoadingOutlined spin />} />
        </Flex>
      </Paper>
    );
  }

  return (
    <Paper className={styles.card}>
      <PricingHeader
        variants={variants}
        selectedVariantId={selectedVariantId}
        onVariantSelect={selectVariant}
        onLoadMore={loadMoreVariants}
        isLoadingMore={isLoadingVariants}
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
            history={history}
            period={period}
            onPeriodChange={setPeriod}
            formatPrice={formatPrice}
          />
        </div>
      </div>

      <KPIRow stats={stats} costPrice={costPrice} formatPrice={formatPrice} />
    </Paper>
  );
};
