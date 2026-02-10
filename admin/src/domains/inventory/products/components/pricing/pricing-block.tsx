import { Flex, Spin } from "antd";
import { LoadingOutlined } from "@ant-design/icons";
import { Paper } from "@/ui-kit/paper";
import {
  PricingHeader,
  CurrentPriceColumn,
  PriceHistoryChartColumn,
  KPIRow,
} from "./components";
import { formatPrice as defaultFormatPrice } from "./utils";
import { usePricingWidget } from "./use-pricing-widget";
import { useStyles } from "./pricing-block.styles";
import type { ApiVariantPriceConnection, CurrencyCode } from "./types";

interface IPricingBlockProps {
  /** Product ID to fetch pricing data for */
  productId: string;
  /** Custom price formatter */
  formatPrice?: (amount: number, currency?: CurrencyCode) => string;
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

  const formatPrice = formatPriceProp || defaultFormatPrice;

  const price = data?.currentPrice?.amountMinor ?? 0;
  const compareAtPrice = data?.currentPrice?.compareAtMinor ?? null;
  const costPrice = data?.currentCostPrice?.unitCostMinor ?? null;
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
