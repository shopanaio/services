"use client";

import { useEffect } from "react";
import { Flex, Spin } from "antd";
import { LoadingOutlined } from "@ant-design/icons";
import {
  useModalStackContext,
  ModalLayout,
  ModalHeader,
} from "@/layouts/modals";
import { formatPrice as defaultFormatPrice } from "../../components/pricing/utils";
import { usePricingWidget } from "../../components/pricing/use-pricing-widget";
import type { Period } from "../../components/period-switch";
import { OverviewSection, ChangeLogSection } from "./components";
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
  } = usePricingWidget<Period>(typedPayload.productId);

  const formatPrice = typedPayload.formatPrice || defaultFormatPrice;

  // Extract pricing data from widget response
  const currentPrice = data?.currentPrice?.amountMinor ?? 0;
  const compareAtPrice = data?.currentPrice?.compareAtMinor ?? null;
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
        compareAtPrice={compareAtPrice}
        history={history}
        stats={stats}
        variants={variants}
        selectedVariantId={selectedVariantId}
        onVariantSelect={selectVariant}
        onLoadMoreVariants={loadMoreVariants}
        isLoadingVariants={isLoadingVariants}
        period={period}
        onPeriodChange={setPeriod}
        formatPrice={formatPrice}
      />

      <ChangeLogSection history={history} />
    </ModalLayout>
  );
};
