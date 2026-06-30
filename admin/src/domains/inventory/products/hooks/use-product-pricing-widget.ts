"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { skipToken, useQuery } from "@apollo/client/react";
import type {
  ApiPricingWidgetInput,
  ApiPricingWidgetPayload,
  ApiVariantConnection,
  CurrencyCode,
} from "@/graphql/types";
import { useDefaultCurrency } from "@/domains/workspace";
import { PRODUCT_PRICING_WIDGET_QUERY } from "../graphql";
import type {
  ProductPricingWidgetQueryData,
  ProductPricingWidgetQueryVariables,
} from "../graphql/operation-types";
import {
  useProductVariantsConnection,
  type UseProductVariantsConnectionReturn,
} from "./use-product-variants-connection";
import { getDateRangeForPeriod, type Period } from "../utils/periods";

export interface UseProductPricingWidgetOptions<T extends string = Period> {
  productId: string | null;
  initialPeriod?: T;
  defaultCurrency?: CurrencyCode | null;
}

export interface UseProductPricingWidgetReturn<T extends string = Period> {
  data: ApiPricingWidgetPayload | null;
  isLoading: boolean;
  error: Error | null;
  variants: ApiVariantConnection;
  isLoadingVariants: boolean;
  loadMoreVariants: UseProductVariantsConnectionReturn["loadMore"];
  selectedVariantId: string | null;
  selectVariant: (id: string) => void;
  period: T;
  setPeriod: (period: T) => void;
  refetch: () => Promise<ApiPricingWidgetPayload | null>;
  refetchVariants: UseProductVariantsConnectionReturn["refetch"];
}

const VARIANTS_PAGE_SIZE = 20;
const PRICE_HISTORY_PAGE_SIZE = 100;

function buildPricingInput(
  variantId: string | null,
  currency: CurrencyCode | null | undefined,
  defaultCurrency: CurrencyCode | null | undefined,
  period: string,
): ApiPricingWidgetInput | null {
  if (!variantId) {
    return null;
  }

  const resolvedCurrency = currency ?? defaultCurrency;

  if (!resolvedCurrency) {
    return null;
  }

  const range = getDateRangeForPeriod(period as Period);

  return {
    variantId,
    currency: resolvedCurrency,
    from: range.gte,
    to: range.lt,
    first: PRICE_HISTORY_PAGE_SIZE,
  };
}

export function useProductPricingWidget<T extends string = Period>({
  productId,
  initialPeriod = "30d" as T,
  defaultCurrency,
}: UseProductPricingWidgetOptions<T>): UseProductPricingWidgetReturn<T> {
  const storeDefaultCurrency = useDefaultCurrency();
  const fallbackCurrency = defaultCurrency ?? storeDefaultCurrency;
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    null,
  );
  const [period, setPeriod] = useState<T>(initialPeriod);

  const {
    variants,
    loading: isLoadingVariants,
    error: variantsError,
    loadMore: loadMoreVariants,
    refetch: refetchVariants,
  } = useProductVariantsConnection({
    productId,
    pageSize: VARIANTS_PAGE_SIZE,
    skip: !productId,
  });

  useEffect(() => {
    setSelectedVariantId(null);
  }, [productId]);

  useEffect(() => {
    setSelectedVariantId((current) => {
      if (current && variants.edges.some((edge) => edge.node.id === current)) {
        return current;
      }

      return variants.edges[0]?.node.id ?? null;
    });
  }, [variants.edges]);

  const selectedVariant = useMemo(
    () =>
      variants.edges.find((edge) => edge.node.id === selectedVariantId)?.node ??
      null,
    [selectedVariantId, variants.edges],
  );

  const pricingInput = useMemo(
    () =>
      buildPricingInput(
        selectedVariantId,
        selectedVariant?.price?.currency,
        fallbackCurrency,
        period,
      ),
    [
      fallbackCurrency,
      period,
      selectedVariant?.price?.currency,
      selectedVariantId,
    ],
  );

  const pricingQueryOptions = useMemo(
    () =>
      pricingInput
        ? {
            variables: { input: pricingInput },
            fetchPolicy: "cache-and-network" as const,
          }
        : skipToken,
    [pricingInput],
  );

  const {
    data: pricingData,
    previousData: previousPricingData,
    loading: isLoadingPricing,
    error: pricingError,
    refetch: refetchPricing,
  } = useQuery<
    ProductPricingWidgetQueryData,
    ProductPricingWidgetQueryVariables
  >(PRODUCT_PRICING_WIDGET_QUERY, pricingQueryOptions);

  const selectVariant = useCallback((id: string) => {
    setSelectedVariantId(id);
  }, []);

  const refetch = useCallback(async () => {
    if (!pricingInput) {
      return null;
    }

    const result = await refetchPricing({ input: pricingInput });

    return result.data?.widgetQuery.pricing ?? null;
  }, [pricingInput, refetchPricing]);

  const effectivePricingData = pricingData ?? previousPricingData;

  return useMemo(
    () => ({
      data: effectivePricingData?.widgetQuery.pricing ?? null,
      isLoading: isLoadingVariants || isLoadingPricing,
      error: variantsError ?? pricingError ?? null,
      variants,
      isLoadingVariants,
      loadMoreVariants,
      selectedVariantId,
      selectVariant,
      period,
      setPeriod,
      refetch,
      refetchVariants,
    }),
    [
      effectivePricingData,
      isLoadingPricing,
      isLoadingVariants,
      loadMoreVariants,
      period,
      pricingError,
      refetch,
      refetchVariants,
      selectVariant,
      selectedVariantId,
      variants,
      variantsError,
    ],
  );
}
