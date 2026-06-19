import { Typography, Flex, Button } from "antd";
import { DownOutlined } from "@ant-design/icons";
import { Paper } from "@/ui-kit/paper";
import { KPITile } from "@/ui-kit/kpi-tile";
import { PeriodSwitch, PERIODS, type Period } from "../../../components/period-switch";
import {
  PriceChart,
  PriceChangeIndicator,
  ScrollableDropdown,
} from "../../../components/pricing/components";
import type {
  ApiVariantConnection,
  ApiVariantPriceConnection,
  ApiVariantPriceHistoryStatistics,
  CurrencyCode,
} from "../../../components/pricing/types";
import { useStyles } from "../price-history-modal.styles";

interface IOverviewSectionProps {
  currentPrice: number;
  compareAtPrice: number | null;
  currency?: CurrencyCode | null;
  history: ApiVariantPriceConnection;
  stats: ApiVariantPriceHistoryStatistics | null;
  variants: ApiVariantConnection;
  selectedVariantId: string | null;
  onVariantSelect: (id: string) => void;
  onLoadMoreVariants: () => void;
  isLoadingVariants: boolean;
  period: Period;
  onPeriodChange: (period: Period) => void;
  formatPrice: (amount: number, currency?: CurrencyCode) => string;
}

export const OverviewSection = ({
  currentPrice,
  compareAtPrice,
  currency,
  history,
  stats,
  variants,
  selectedVariantId,
  onVariantSelect,
  onLoadMoreVariants,
  isLoadingVariants,
  period,
  onPeriodChange,
  formatPrice,
}: IOverviewSectionProps) => {
  const { styles } = useStyles();

  const selectedVariant = variants.edges.find(
    (e) => e.node.id === selectedVariantId
  )?.node;

  const previousPrice =
    history.edges.length > 1 ? history.edges[1]?.node.amountMinor : null;

  const variantMenuItems = variants.edges.map((edge) => ({
    key: edge.node.id,
    label: (
      <Flex justify="space-between" align="center" style={{ width: "100%" }}>
        <span>{edge.node.title ?? "Untitled"}</span>
        <Typography.Text style={{ fontWeight: 600, marginLeft: 24 }}>
          {edge.node.price
            ? formatPrice(edge.node.price.amountMinor, edge.node.price.currency)
            : "—"}
        </Typography.Text>
      </Flex>
    ),
  }));

  return (
    <Paper className={styles.overviewPaper}>
      {variants.edges.length > 1 && (
        <div style={{ marginBottom: 16 }}>
          <Typography.Text
            type="secondary"
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              display: "block",
              marginBottom: 8,
            }}
          >
            Variant
          </Typography.Text>
          <ScrollableDropdown
            menu={{
              items: variantMenuItems,
              selectedKeys: selectedVariantId ? [selectedVariantId] : [],
              onClick: ({ key }) => onVariantSelect(key as string),
            }}
            trigger={["click"]}
            hasNextPage={variants.pageInfo.hasNextPage}
            isLoadingMore={isLoadingVariants}
            onLoadMore={onLoadMoreVariants}
          >
            <Button className={styles.variantSelect}>
              <Flex align="center" gap={8}>
                <span>{selectedVariant?.title || "Select variant"}</span>
                <DownOutlined style={{ fontSize: 10 }} />
              </Flex>
            </Button>
          </ScrollableDropdown>
        </div>
      )}

      <div className={styles.currentPriceSection}>
        <Typography.Text
          type="secondary"
          style={{
            fontSize: 11,
            textTransform: "uppercase",
            display: "block",
            marginBottom: 8,
          }}
        >
          Current Price
        </Typography.Text>
        <div className={styles.currentPriceRow}>
          <Typography.Title level={2} className={styles.mainPrice}>
            {formatPrice(currentPrice, currency ?? undefined)}
          </Typography.Title>
          {previousPrice && previousPrice !== currentPrice && (
            <PriceChangeIndicator
              currentPrice={currentPrice}
              previousPrice={previousPrice}
            />
          )}
          {compareAtPrice && compareAtPrice > currentPrice && (
            <Typography.Text
              delete
              type="secondary"
              className={styles.compareAtPrice}
            >
              {formatPrice(compareAtPrice, currency ?? undefined)}
            </Typography.Text>
          )}
        </div>
      </div>

      <div className={styles.chartSection}>
        <Flex
          align="center"
          justify="space-between"
          className={styles.chartHeader}
        >
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Price Trend
          </Typography.Text>
          <PeriodSwitch
            periods={PERIODS}
            value={period}
            onChange={onPeriodChange}
          />
        </Flex>
        <PriceChart
          history={history}
          currency={currency}
          formatPrice={formatPrice}
          height={180}
          showAxisLabels
          showDateLabels
          gridLineCount={5}
        />
      </div>

      <div className={styles.kpiRow}>
        <KPITile
          label="Min"
          value={stats ? formatPrice(stats.minPriceMinor, stats.currency) : "—"}
          tooltip="Minimum price in period"
          centered
          className={styles.kpiTile}
          variant="success"
        />
        <KPITile
          label="Max"
          value={stats ? formatPrice(stats.maxPriceMinor, stats.currency) : "—"}
          tooltip="Maximum price in period"
          centered
          className={styles.kpiTile}
          variant="danger"
        />
        <KPITile
          label="Average"
          value={stats ? formatPrice(stats.avgPriceMinor, stats.currency) : "—"}
          tooltip="Average price over period"
          centered
          className={styles.kpiTile}
        />
        <KPITile
          label="Changes"
          value={String(history.totalCount)}
          tooltip="Total number of price changes"
          centered
          className={styles.kpiTile}
        />
      </div>
    </Paper>
  );
};
