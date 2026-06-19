import { useState, useEffect, useCallback, useMemo } from "react";
import type { ApiPricingWidgetPayload, ApiVariantConnection } from "./types";
import { fetchVariants, fetchPricingWidget } from "./mocks";

export interface UsePricingWidgetReturn<T extends string = string> {
  /** Pricing widget data for selected variant */
  data: ApiPricingWidgetPayload | null;
  /** Loading state for widget data */
  isLoading: boolean;
  /** Error if any */
  error: Error | null;
  /** Available variants with pagination */
  variants: ApiVariantConnection;
  /** Loading more variants */
  isLoadingVariants: boolean;
  /** Load more variants for infinite scroll */
  loadMoreVariants: () => void;
  /** Currently selected variant ID */
  selectedVariantId: string | null;
  /** Select a variant */
  selectVariant: (id: string) => void;
  /** Current period filter */
  period: T;
  /** Set period filter */
  setPeriod: (period: T) => void;
}

const EMPTY_CONNECTION: ApiVariantConnection = {
  __typename: "VariantConnection",
  edges: [],
  pageInfo: {
    __typename: "PageInfo",
    hasNextPage: false,
    hasPreviousPage: false,
  },
  totalCount: 0,
};

export function usePricingWidget<T extends string = string>(
  productId: string,
  initialPeriod: T = "30d" as T
): UsePricingWidgetReturn<T> {
  // Variants state
  const [variants, setVariants] =
    useState<ApiVariantConnection>(EMPTY_CONNECTION);
  const [isLoadingVariants, setIsLoadingVariants] = useState(false);

  // Widget data state
  const [data, setData] = useState<ApiPricingWidgetPayload | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Selection state
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    null
  );
  const [period, setPeriod] = useState<T>(initialPeriod);

  // Load initial variants
  useEffect(() => {
    let cancelled = false;

    const loadVariants = async () => {
      setIsLoadingVariants(true);
      try {
        const result = await fetchVariants({ productId });
        if (!cancelled) {
          setVariants(result);
          // Auto-select first variant
          if (result.edges.length > 0) {
            setSelectedVariantId((prev) =>
              prev ? prev : result.edges[0].node.id
            );
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error("Failed to load variants"));
        }
      } finally {
        if (!cancelled) {
          setIsLoadingVariants(false);
        }
      }
    };

    loadVariants();

    return () => {
      cancelled = true;
    };
  }, [productId]);

  // Load more variants for infinite scroll
  const loadMoreVariants = useCallback(async () => {
    if (isLoadingVariants || !variants.pageInfo.hasNextPage) return;

    setIsLoadingVariants(true);
    try {
      const result = await fetchVariants({
        productId,
        after: variants.pageInfo.endCursor ?? undefined,
      });

      setVariants((prev) => ({
        ...result,
        edges: [...prev.edges, ...result.edges],
      }));
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load more variants"));
    } finally {
      setIsLoadingVariants(false);
    }
  }, [productId, variants.pageInfo.endCursor, variants.pageInfo.hasNextPage, isLoadingVariants]);

  // Load widget data when variant or period changes
  useEffect(() => {
    if (!selectedVariantId) return;

    let cancelled = false;

    const loadWidgetData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await fetchPricingWidget({
          variantId: selectedVariantId,
          period,
        });
        if (!cancelled) {
          setData(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error("Failed to load pricing data"));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadWidgetData();

    return () => {
      cancelled = true;
    };
  }, [selectedVariantId, period]);

  // Select variant handler
  const selectVariant = useCallback((id: string) => {
    setSelectedVariantId(id);
  }, []);

  return useMemo(
    () => ({
      data,
      isLoading,
      error,
      variants,
      isLoadingVariants,
      loadMoreVariants,
      selectedVariantId,
      selectVariant,
      period,
      setPeriod,
    }),
    [
      data,
      isLoading,
      error,
      variants,
      isLoadingVariants,
      loadMoreVariants,
      selectedVariantId,
      selectVariant,
      period,
    ]
  );
}
