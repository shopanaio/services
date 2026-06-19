import { KPITile } from "@/ui-kit/kpi-tile";
import { useStyles } from "../pricing-block.styles";
import type { ApiVariantPriceHistoryStatistics, CurrencyCode } from "../types";

export interface IKPIRowProps {
  stats: ApiVariantPriceHistoryStatistics | null;
  costPrice: number | null;
  costCurrency?: CurrencyCode | null;
  formatPrice: (amount: number, currency?: CurrencyCode) => string;
}

export const KPIRow = ({
  stats,
  costPrice,
  costCurrency,
  formatPrice,
}: IKPIRowProps) => {
  const { styles } = useStyles();
  const statsCurrency = stats?.currency;
  const resolvedCostCurrency = costCurrency ?? statsCurrency;

  return (
    <div className={styles.kpiRow}>
      <KPITile
        label="Cost"
        value={
          costPrice !== null
            ? formatPrice(costPrice, resolvedCostCurrency)
            : "\u2014"
        }
        tooltip={costPrice !== null ? "Product cost price" : "Cost data missing"}
        centered
        className={styles.kpiTile}
      />
      <KPITile
        label="Min"
        value={
          stats ? formatPrice(stats.minPriceMinor, statsCurrency) : "\u2014"
        }
        tooltip="Minimum price over the period"
        centered
        className={styles.kpiTile}
      />
      <KPITile
        label="Max"
        value={
          stats ? formatPrice(stats.maxPriceMinor, statsCurrency) : "\u2014"
        }
        tooltip="Maximum price over the period"
        centered
        className={styles.kpiTile}
      />
      <KPITile
        label="Avg"
        value={
          stats ? formatPrice(stats.avgPriceMinor, statsCurrency) : "\u2014"
        }
        tooltip="Average price over the period"
        centered
        className={styles.kpiTile}
      />
    </div>
  );
};
