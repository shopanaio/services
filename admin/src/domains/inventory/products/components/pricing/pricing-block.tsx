"use client";

import { useCallback, useState } from "react";
import { App, Flex, Spin } from "antd";
import { LoadingOutlined } from "@ant-design/icons";
import { Paper } from "@/ui-kit/paper";
import type {
  ApiProduct,
  ApiProductUpdateInput,
  ApiVariant,
  ApiVariantPriceConnection,
} from "@/graphql/types";
import { useDefaultCurrency } from "@/domains/workspace";
import { useProductPricingWidget } from "../../hooks/use-product-pricing-widget";
import { useProductVariantsLoader } from "../../hooks/use-product-variants-loader";
import { useUpdateProduct } from "../../hooks/use-update-product";
import type { VariantEditorSaveRow } from "../../mappers/product-variant-editor.mapper";
import { prepareChangedVariantUpdateOperations } from "../../mappers/product-variant-update.mapper";
import {
  useEditVariantsModal,
  useProductPriceHistoryModal,
  type EditVariantsSaveInput,
  type EditVariantsSaveResult,
} from "../../modals";
import { CurrentPriceColumn } from "./components/current-price-column";
import { KPIRow } from "./components/kpi-row";
import { PriceHistoryChartColumn } from "./components/price-history-chart-column";
import { PricingEmptyState } from "./components/pricing-empty-state";
import { PricingHeader } from "./components/pricing-header";
import { useStyles } from "./pricing-block.styles";

interface IPricingBlockProps {
  product?: ApiProduct;
  productId?: string;
  onProductRefresh?: () => Promise<unknown>;
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
  product,
  productId,
  onProductRefresh,
}: IPricingBlockProps) => {
  const { styles } = useStyles();
  const { message } = App.useApp();
  const defaultCurrency = useDefaultCurrency();
  const { push: openEditVariantsModal } = useEditVariantsModal();
  const { push: openPriceHistoryModal } = useProductPriceHistoryModal();
  const { updateProduct } = useUpdateProduct();
  const { loadAllProductVariants } = useProductVariantsLoader();
  const [isPreparingEditor, setIsPreparingEditor] = useState(false);
  const resolvedProductId = product?.id ?? productId ?? "";

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
    refetch: refetchPricingWidget,
    refetchVariants,
  } = useProductPricingWidget<string>({
    productId: resolvedProductId || null,
    initialPeriod: "30d",
    defaultCurrency,
  });

  const handleSavePrices = useCallback(
    async (
      rows: VariantEditorSaveRow[],
      editorVariants: ApiVariant[],
    ): Promise<EditVariantsSaveResult> => {
      if (!product) {
        return {
          ok: false,
          operationResults: [],
          userErrors: [
            {
              message: "Product is required to save variant prices.",
              code: "PRODUCT_REQUIRED",
            },
          ],
        };
      }

      let variantOperations: NonNullable<ApiProductUpdateInput["variants"]>;

      try {
        variantOperations = prepareChangedVariantUpdateOperations({
          rows,
          variants: editorVariants,
          defaultCurrency,
          includePricing: true,
          includeShipping: false,
          includeMedia: false,
        });
      } catch (err) {
        message.error(
          err instanceof Error ? err.message : "Variant prices are invalid.",
        );
        return {
          ok: false,
          operationResults: [],
          userErrors: [
            {
              message:
                err instanceof Error
                  ? err.message
                  : "Variant prices are invalid.",
              code: "VARIANT_PRICES_INVALID",
            },
          ],
        };
      }

      if (variantOperations.length === 0) {
        message.info("No price changes to save");
        return {
          ok: true,
          operationResults: [],
          userErrors: [],
        };
      }

      const operations: ApiProductUpdateInput = {
        variants: variantOperations,
      };

      const result = await updateProduct({
        productId: product.id,
        expectedRevision: product.revision,
        operations,
      });

      if (result.errors.length > 0) {
        message.error(result.errors[0].message);
        return {
          ok: false,
          operationResults: result.operationResults,
          userErrors: result.userErrors,
        };
      }

      const refreshResults = await Promise.allSettled([
        onProductRefresh?.(),
        refetchVariants(),
        refetchPricingWidget(),
      ]);
      const refreshFailed = refreshResults.some(
        (refreshResult) => refreshResult.status === "rejected",
      );

      if (refreshFailed) {
        message.warning("Variant prices updated, but refresh failed");
      } else {
        message.success("Variant prices updated");
      }

      return {
        ok: true,
        operationResults: result.operationResults,
        userErrors: result.userErrors,
      };
    },
    [
      message,
      defaultCurrency,
      onProductRefresh,
      product,
      refetchPricingWidget,
      refetchVariants,
      updateProduct,
    ],
  );

  const handleEditPrices = useCallback(async () => {
    if (!product) {
      return;
    }

    setIsPreparingEditor(true);

    try {
      const editorVariants = await loadAllProductVariants(product);

      openEditVariantsModal({
        productId: product.id,
        variants: editorVariants,
        productOptions: product.options,
        defaultCurrency,
        availableColumns: ["price", "compareAtPrice"],
        showColumnSettings: false,
        allowDraftRows: false,
        onSave: (input: EditVariantsSaveInput) =>
          handleSavePrices(input.existingRows, editorVariants),
      });
    } catch (err) {
      message.error(
        err instanceof Error
          ? err.message
          : "Product variants could not be loaded",
      );
    } finally {
      setIsPreparingEditor(false);
    }
  }, [
    handleSavePrices,
    defaultCurrency,
    loadAllProductVariants,
    message,
    openEditVariantsModal,
    product,
  ]);

  const handleViewHistory = useCallback(() => {
    if (!resolvedProductId) {
      return;
    }

    openPriceHistoryModal({ productId: resolvedProductId });
  }, [openPriceHistoryModal, resolvedProductId]);

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
  const hasPriceRecords =
    Boolean(currentPrice) || history.totalCount > 0 || history.edges.length > 0;

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
    <div data-testid="pricing-widget">
      <Paper className={styles.card}>
        <PricingHeader
          variants={variants}
          selectedVariantId={selectedVariantId}
          onVariantSelect={selectVariant}
          onLoadMore={loadMoreVariants}
          isLoadingMore={isLoadingVariants}
          onEditPrices={product ? handleEditPrices : undefined}
          isEditPricesLoading={isPreparingEditor}
          onViewHistory={resolvedProductId ? handleViewHistory : undefined}
        />

        {selectedVariantId && !hasPriceRecords ? (
          <PricingEmptyState />
        ) : (
          <>
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

            <KPIRow
              stats={stats}
              costPrice={costPrice}
              costCurrency={costCurrency}
            />
          </>
        )}
      </Paper>
    </div>
  );
};
