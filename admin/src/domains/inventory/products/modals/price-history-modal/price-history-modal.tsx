"use client";

import { useEffect } from "react";
import { Flex, Spin } from "antd";
import { LoadingOutlined } from "@ant-design/icons";
import {
  useModalStackContext,
  ModalLayout,
  ModalHeader,
} from "@/layouts/modals";
import { useProductPricingWidget } from "../../hooks";
import type { Period } from "../../utils/periods";
import { ChangeLogSection } from "./components/change-log-section";
import { OverviewSection } from "./components/overview-section";
import type { IPriceHistoryModalPayload } from "./types";

export const PriceHistoryModal = () => {
  const { payload, pop } = useModalStackContext();
  const typedPayload = payload as unknown as IPriceHistoryModalPayload;

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
  } = useProductPricingWidget<Period>({
    productId: typedPayload.productId,
  });

  // Extract pricing data from widget response
  const currentPrice = data?.currentPrice ?? null;
  const currency =
    data?.currentPrice?.currency ??
    data?.currentCostPrice?.currency ??
    data?.statistics.currency;
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        pop();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pop]);

  if (isLoading && !data) {
    return (
      <ModalLayout
        name="price-history"
        header={
          <ModalHeader
            name="price-history"
            title="Price History"
            onClose={pop}
            submitButtonProps={null}
          />
        }
      >
        <Flex justify="center" align="center" style={{ minHeight: 300 }}>
          <Spin indicator={<LoadingOutlined spin />} size="large" />
        </Flex>
      </ModalLayout>
    );
  }

  return (
    <ModalLayout
      name="price-history"
      header={
        <ModalHeader
          name="price-history"
          title="Price History"
          onClose={pop}
          submitButtonProps={null}
        />
      }
    >
      <OverviewSection
        currentPrice={currentPrice}
        currency={currency}
        history={history}
        stats={stats}
        variants={variants}
        selectedVariantId={selectedVariantId}
        onVariantSelect={selectVariant}
        onLoadMoreVariants={loadMoreVariants}
        isLoadingVariants={isLoadingVariants}
        period={period}
        onPeriodChange={setPeriod}
      />

      <ChangeLogSection history={history} />
    </ModalLayout>
  );
};
