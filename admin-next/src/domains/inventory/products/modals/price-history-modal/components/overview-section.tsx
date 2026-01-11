import { Typography, Flex, Dropdown, Button, Spin } from "antd";
import { DownOutlined, LoadingOutlined } from "@ant-design/icons";
import { useCallback, useRef } from "react";
import { Paper } from "@/ui-kit/paper";
import { Tile } from "../../../components/tile";
import { PeriodSwitch, CHART_PERIODS } from "../../../components/period-switch";
import {
  PriceChart,
  PriceChangeIndicator,
} from "../../../components/pricing/components";
import type {
  ApiVariantConnection,
  ApiVariantPriceConnection,
  ApiVariantPriceHistoryStatistics,
  ChartPeriod,
} from "../../../components/pricing/types";
import { useStyles } from "../price-history-modal.styles";

interface IOverviewSectionProps {
  currentPrice: number;
  compareAtPrice: number | null;
  history: ApiVariantPriceConnection;
  stats: ApiVariantPriceHistoryStatistics | null;
  variants: ApiVariantConnection;
  selectedVariantId: string | null;
  onVariantSelect: (id: string) => void;
  onLoadMoreVariants: () => void;
  isLoadingVariants: boolean;
  period: ChartPeriod;
  onPeriodChange: (period: ChartPeriod) => void;
  formatPrice: (amount: number) => string;
}

export const OverviewSection = ({
  currentPrice,
  compareAtPrice,
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
  const menuRef = useRef<HTMLDivElement>(null);

  const selectedVariant = variants.edges.find(
    (e) => e.node.id === selectedVariantId
  )?.node;

  const previousPrice =
    history.edges.length > 1 ? history.edges[1]?.node.amountMinor : null;

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const target = e.target as HTMLDivElement;
      const isNearBottom =
        target.scrollHeight - target.scrollTop - target.clientHeight < 50;

      if (isNearBottom && variants.pageInfo.hasNextPage && !isLoadingVariants) {
        onLoadMoreVariants();
      }
    },
    [variants.pageInfo.hasNextPage, isLoadingVariants, onLoadMoreVariants]
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

  if (isLoadingVariants) {
    variantMenuItems.push({
      key: "loading",
      label: (
        <Flex justify="center" style={{ padding: "8px 0" }}>
          <Spin indicator={<LoadingOutlined spin />} size="small" />
        </Flex>
      ),
    });
  }

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
                style={{ maxHeight: 300, overflowY: "auto" }}
                onScroll={handleScroll}
              >
                {menu}
              </div>
            )}
          >
            <Button className={styles.variantSelect}>
              <Flex align="center" gap={8}>
                <span>{selectedVariant?.title || "Select variant"}</span>
                <DownOutlined style={{ fontSize: 10 }} />
              </Flex>
            </Button>
          </Dropdown>
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
            {formatPrice(currentPrice)}
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
              {formatPrice(compareAtPrice)}
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
            periods={CHART_PERIODS}
            value={period}
            onChange={onPeriodChange}
          />
        </Flex>
        <PriceChart
          history={history}
          formatPrice={formatPrice}
          height={180}
          showAxisLabels
          showDateLabels
          gridLineCount={5}
        />
      </div>

      <div className={styles.kpiRow}>
        <Tile
          label="Min"
          value={stats?.minPriceMinor ? formatPrice(stats.minPriceMinor) : "—"}
          tooltip="Minimum price in period"
          centered
          className={styles.kpiTile}
          variant="success"
        />
        <Tile
          label="Max"
          value={stats?.maxPriceMinor ? formatPrice(stats.maxPriceMinor) : "—"}
          tooltip="Maximum price in period"
          centered
          className={styles.kpiTile}
          variant="danger"
        />
        <Tile
          label="Average"
          value={stats?.avgPriceMinor ? formatPrice(stats.avgPriceMinor) : "—"}
          tooltip="Average price over period"
          centered
          className={styles.kpiTile}
        />
        <Tile
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
