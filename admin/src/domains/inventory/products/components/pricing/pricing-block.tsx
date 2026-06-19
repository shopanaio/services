import { Flex, Spin } from "antd";
import { LoadingOutlined } from "@ant-design/icons";
import { Paper } from "@/ui-kit/paper";
import {
  PricingHeader,
  CurrentPriceColumn,
  PriceHistoryChartColumn,
  KPIRow,
} from "./components";
import { usePricingWidget } from "./use-pricing-widget";
import { useStyles } from "./pricing-block.styles";
import type { ApiVariantPriceConnection } from "./types";

interface IPricingBlockProps {
  /** Product ID to fetch pricing data for */
  productId: string;
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

export const PricingBlock = ({ productId }: IPricingBlockProps) => {
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
        productId={productId}
        variants={variants}
        selectedVariantId={selectedVariantId}
        onVariantSelect={selectVariant}
        onLoadMore={loadMoreVariants}
        isLoadingMore={isLoadingVariants}
      />

      <div className={styles.twoColumn}>
        <div className={styles.priceColumnWrapper}>
          <CurrentPriceColumn price={currentPrice} />
        </div>
        <div className={styles.chartColumnWrapper}>
          <PriceHistoryChartColumn
            history={history}
            period={period}
            onPeriodChange={setPeriod}
            currency={priceCurrency}
          />
        </div>
      </div>

      <KPIRow stats={stats} costPrice={costPrice} costCurrency={costCurrency} />
    </Paper>
  );
};
