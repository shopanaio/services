"use client";

import { useCallback, useMemo } from "react";
import { skipToken, useQuery } from "@apollo/client/react";
import type { ApiProductInventoryWidget } from "@/graphql/types";
import { PRODUCT_INVENTORY_WIDGET_QUERY } from "../graphql";
import type {
  ProductInventoryWidgetQueryData,
  ProductInventoryWidgetQueryVariables,
} from "../graphql/operation-types";

export interface UseProductInventoryWidgetOptions {
  productId: string | null;
  skip?: boolean;
}

export interface UseProductInventoryWidgetReturn {
  data: ApiProductInventoryWidget | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<ApiProductInventoryWidget | null>;
}

export function useProductInventoryWidget({
  productId,
  skip = false,
}: UseProductInventoryWidgetOptions): UseProductInventoryWidgetReturn {
  const queryOptions = useMemo(
    () =>
      productId && !skip
        ? {
            variables: { productId },
            fetchPolicy: "cache-and-network" as const,
          }
        : skipToken,
    [productId, skip],
  );

  const {
    data,
    previousData,
    loading: isLoading,
    error,
    refetch: refetchInventoryWidget,
  } = useQuery<
    ProductInventoryWidgetQueryData,
    ProductInventoryWidgetQueryVariables
  >(PRODUCT_INVENTORY_WIDGET_QUERY, queryOptions);

  const refetch = useCallback(async () => {
    if (!productId || skip) {
      return null;
    }

    const result = await refetchInventoryWidget({ productId });

    return result.data?.widgetQuery.inventory ?? null;
  }, [productId, refetchInventoryWidget, skip]);

  const effectiveData = data ?? previousData;

  return useMemo(
    () => ({
      data: effectiveData?.widgetQuery.inventory ?? null,
      isLoading,
      error: error ?? null,
      refetch,
    }),
    [effectiveData, error, isLoading, refetch],
  );
}
