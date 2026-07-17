"use client";

import { useCallback, useMemo } from "react";
import { skipToken, useQuery } from "@apollo/client/react";
import type { ApiProductReviewsWidget } from "@/graphql/types";
import { PRODUCT_REVIEWS_WIDGET_QUERY } from "../graphql";
import type {
  ProductReviewsWidgetQueryData,
  ProductReviewsWidgetQueryVariables,
} from "../graphql/operation-types";

export function useProductReviewsWidget(productId?: string) {
  const queryOptions = useMemo(
    () =>
      productId
        ? {
            variables: { productId },
            fetchPolicy: "cache-and-network" as const,
          }
        : skipToken,
    [productId],
  );

  const { data, previousData, loading, error, refetch } = useQuery<
    ProductReviewsWidgetQueryData,
    ProductReviewsWidgetQueryVariables
  >(PRODUCT_REVIEWS_WIDGET_QUERY, queryOptions);

  const refresh = useCallback(async (): Promise<ApiProductReviewsWidget | null> => {
    if (!productId) return null;
    const result = await refetch({ productId });
    return result.data?.widgetQuery.reviews ?? null;
  }, [productId, refetch]);

  const effectiveData = data ?? previousData;

  return useMemo(
    () => ({
      data: effectiveData?.widgetQuery.reviews ?? null,
      loading,
      error: error ?? null,
      refetch: refresh,
    }),
    [effectiveData, error, loading, refresh],
  );
}
