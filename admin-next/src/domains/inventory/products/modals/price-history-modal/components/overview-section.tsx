import { useState, useMemo } from "react";
import { Typography, Flex, Select } from "antd";
import { Paper } from "../../../components/paper";
import { PaperHeader } from "../../../components/paper-header";
import { Tile } from "../../../components/tile";
import { PeriodSwitch, KPI_PERIODS, KPIPeriod } from "../../../components/period-switch";
import {
  PriceChart,
  PriceChangeIndicator,
} from "../../../components/pricing/components";
import { filterHistoryByPeriod, calculatePriceStats } from "../../../components/pricing/utils";
import type { IPriceHistoryRecord, IVariantPriceData } from "../types";
import { useStyles } from "../price-history-modal.styles";

interface IOverviewSectionProps {
  currentPrice: number;
  compareAtPrice: number | null;
  priceHistory: IPriceHistoryRecord[];
  variants?: IVariantPriceData[];
  selectedVariantId?: string;
  onVariantSelect?: (id: string) => void;
  formatPrice: (amount: number) => string;
}

export const OverviewSection = ({
  currentPrice,
  compareAtPrice,
  priceHistory,
  variants,
  selectedVariantId,
  onVariantSelect,
  formatPrice,
}: IOverviewSectionProps) => {
  const { styles } = useStyles();
  const [timeRange, setTimeRange] = useState<KPIPeriod>("30d");

  const filteredHistory = useMemo(
    () => filterHistoryByPeriod(priceHistory, timeRange),
    [priceHistory, timeRange]
  );

  const stats = useMemo(
    () => calculatePriceStats(priceHistory),
    [priceHistory]
  );

  const previousPrice = priceHistory[1]?.amount ?? null;

  const variantOptions = useMemo(() => {
    if (!variants?.length) return [];

    return [
      {
        value: "all",
        label: (
          <Flex justify="space-between" align="center" style={{ width: "100%" }}>
            <span style={{ fontWeight: 500 }}>All variants</span>
            <Typography.Text type="secondary" style={{ marginLeft: 24 }}>
              {variants.length} variants
            </Typography.Text>
          </Flex>
        ),
      },
      ...variants.map((v) => ({
        value: v.id,
        label: (
          <Flex justify="space-between" align="center" style={{ width: "100%" }}>
            <span>{v.title}</span>
            <Typography.Text style={{ fontWeight: 600, marginLeft: 24 }}>
              {formatPrice(v.price)}
            </Typography.Text>
          </Flex>
        ),
      })),
    ];
  }, [variants, formatPrice]);

  return (
    <Paper className={styles.overviewPaper}>
      {variants && variants.length > 1 && (
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
          <Select
            value={selectedVariantId}
            onChange={onVariantSelect}
            popupMatchSelectWidth={false}
            className={styles.variantSelect}
            options={variantOptions}
          />
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
            periods={KPI_PERIODS}
            value={timeRange}
            onChange={setTimeRange}
          />
        </Flex>
        <PriceChart
          history={filteredHistory}
          formatPrice={formatPrice}
          height={180}
          showBackground
          showAxisLabels
          showDateLabels
          gridLineCount={5}
        />
      </div>

      <div className={styles.kpiRow}>
        <Tile
          label="Min"
          value={formatPrice(stats.min)}
          tooltip="Minimum price in period"
          centered
          className={styles.kpiTile}
          variant="success"
        />
        <Tile
          label="Max"
          value={formatPrice(stats.max)}
          tooltip="Maximum price in period"
          centered
          className={styles.kpiTile}
          variant="danger"
        />
        <Tile
          label="Average"
          value={formatPrice(stats.avg)}
          tooltip="Average price over period"
          centered
          className={styles.kpiTile}
        />
        <Tile
          label="Changes"
          value={String(stats.changes)}
          tooltip="Total number of price changes"
          centered
          className={styles.kpiTile}
        />
      </div>
    </Paper>
  );
};
