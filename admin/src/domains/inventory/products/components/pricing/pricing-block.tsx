import { Flex, Spin } from "antd";
import { LoadingOutlined } from "@ant-design/icons";
import { Paper } from "@/ui-kit/paper";
import type {
  ApiPricingWidgetPayload,
  ApiVariantConnection,
  ApiVariantPriceConnection,
} from "@/graphql/types";
import { CurrentPriceColumn } from "./components/current-price-column";
import { KPIRow } from "./components/kpi-row";
import { PriceHistoryChartColumn } from "./components/price-history-chart-column";
import { PricingHeader } from "./components/pricing-header";
import { useStyles } from "./pricing-block.styles";

interface IPricingBlockProps {
  data: ApiPricingWidgetPayload | null;
  isLoading: boolean;
  variants: ApiVariantConnection;
  isLoadingVariants: boolean;
  onLoadMoreVariants: () => void | Promise<unknown>;
  selectedVariantId: string | null;
  onVariantSelect: (id: string) => void;
  period: string;
  onPeriodChange: (period: string) => void;
  onEditPrices?: () => void;
  isEditPricesLoading?: boolean;
  onViewHistory?: () => void;
}

const EMPTY_HISTORY: ApiVariantPriceConnection = {
  __typename: "VariantPriceConnection",
  edges: [],
  pageInfo: {
    __typename: "PageInfo",
    hasNextPage: false,
    hasPreviousPage: false,
  },
  totalCount: 0,
};

export const PricingBlock = ({
  data,
  isLoading,
  variants,
  isLoadingVariants,
  onLoadMoreVariants,
  selectedVariantId,
  onVariantSelect,
  period,
  onPeriodChange,
  onEditPrices,
  isEditPricesLoading = false,
  onViewHistory,
}: IPricingBlockProps) => {
  const { styles } = useStyles();
  const currentPrice = data?.currentPrice ?? null;
  const costPrice = data?.currentCostPrice?.unitCostMinor ?? null;
  const priceCurrency =
    data?.currentPrice?.currency ??
    data?.currentCostPrice?.currency ??
    data?.statistics.currency;
  const costCurrency =
    data?.currentCostPrice?.currency ??
    data?.currentPrice?.currency ??
    data?.statistics.currency;
  const history = data?.history ?? EMPTY_HISTORY;
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
        onVariantSelect={onVariantSelect}
        onLoadMore={onLoadMoreVariants}
        isLoadingMore={isLoadingVariants}
        onEditPrices={onEditPrices}
        isEditPricesLoading={isEditPricesLoading}
        onViewHistory={onViewHistory}
      />

      <div className={styles.twoColumn}>
        <div className={styles.priceColumnWrapper}>
          <CurrentPriceColumn price={currentPrice} />
        </div>
        <div className={styles.chartColumnWrapper}>
          <PriceHistoryChartColumn
            history={history}
            period={period}
            onPeriodChange={onPeriodChange}
            currency={priceCurrency}
          />
        </div>
      </div>

      <KPIRow stats={stats} costPrice={costPrice} costCurrency={costCurrency} />
    </Paper>
  );
};
