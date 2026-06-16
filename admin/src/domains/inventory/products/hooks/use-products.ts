import { useState, useEffect, useCallback } from "react";
import { mockProductsList, type IProductListItem } from "@/mocks/products/products-list";

interface UseProductsOptions {
  /** Simulated delay in milliseconds */
  delay?: number;
}

interface UseProductsReturn {
  data: IProductListItem[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook that simulates an API call to fetch products
 */
export function useProducts(options: UseProductsOptions = {}): UseProductsReturn {
  const { delay = 500 } = options;

  const [data, setData] = useState<IProductListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, delay));

      // Simulate API response
      setData(mockProductsList);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch products"));
    } finally {
      setIsLoading(false);
    }
  }, [delay]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchProducts,
  };
}
