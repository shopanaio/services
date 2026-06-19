import { useState, useEffect, useCallback } from "react";
import type { ApiPageInfo, ApiProduct, ApiProductConnection } from "@/graphql/types";
import { mockProductsList } from "@/mocks/products";
import {
  createMockApiProductConnection,
  createMockPageInfo,
} from "@/mocks/products/api-builders";

interface UseProductsOptions {
  /** Simulated delay in milliseconds */
  delay?: number;
  page?: number;
  pageSize?: number;
}

interface UseProductsReturn {
  products: ApiProduct[];
  connection: ApiProductConnection | null;
  totalCount: number;
  pageInfo: ApiPageInfo | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook that simulates an API call to fetch products
 */
export function useProducts(options: UseProductsOptions = {}): UseProductsReturn {
  const { delay = 500, page = 0, pageSize = 20 } = options;

  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [connection, setConnection] = useState<ApiProductConnection | null>(null);
  const [pageInfo, setPageInfo] = useState<ApiPageInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      await new Promise((resolve) => setTimeout(resolve, delay));

      const start = page * pageSize;
      const end = Math.min(start + pageSize, mockProductsList.length);
      const pagedProducts = mockProductsList.slice(start, end);
      const nextPageInfo = createMockPageInfo({
        hasNextPage: end < mockProductsList.length,
        hasPreviousPage: page > 0,
        startCursor: pagedProducts.length ? `product-cursor-${start}` : null,
        endCursor: pagedProducts.length ? `product-cursor-${end - 1}` : null,
      });

      setProducts(pagedProducts);
      setPageInfo(nextPageInfo);
      setConnection(
        createMockApiProductConnection(
          pagedProducts,
          nextPageInfo,
          mockProductsList.length,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch products"));
    } finally {
      setLoading(false);
    }
  }, [delay, page, pageSize]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return {
    products,
    connection,
    totalCount: connection?.totalCount ?? mockProductsList.length,
    pageInfo,
    loading,
    error,
    refetch: fetchProducts,
  };
}
