import { Tile } from "../../tile";
import { useStyles } from "../pricing-block.styles";
import type { ApiVariantPriceHistoryStatistics } from "../types";

export interface IKPIRowProps {
  stats: ApiVariantPriceHistoryStatistics | null;
  costPrice: number | null;
  formatPrice: (amount: number) => string;
}

export const KPIRow = ({ stats, costPrice, formatPrice }: IKPIRowProps) => {
  const { styles } = useStyles();

  return (
    <div className={styles.kpiRow}>
      <Tile
        label="Cost"
        value={costPrice ? formatPrice(costPrice) : "\u2014"}
        tooltip={costPrice ? "Product cost price" : "Cost data missing"}
        centered
        className={styles.kpiTile}
      />
      <Tile
        label="Min"
        value={
          stats?.minPriceMinor ? formatPrice(stats.minPriceMinor) : "\u2014"
        }
        tooltip="Minimum price over the period"
        centered
        className={styles.kpiTile}
      />
      <Tile
        label="Max"
        value={
          stats?.maxPriceMinor ? formatPrice(stats.maxPriceMinor) : "\u2014"
        }
        tooltip="Maximum price over the period"
        centered
        className={styles.kpiTile}
      />
      <Tile
        label="Avg"
        value={
          stats?.avgPriceMinor ? formatPrice(stats.avgPriceMinor) : "\u2014"
        }
        tooltip="Average price over the period"
        centered
        className={styles.kpiTile}
      />
    </div>
  );
};
