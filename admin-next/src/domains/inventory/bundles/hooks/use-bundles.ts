import { useState, useEffect, useCallback } from "react";
import {
  mockBundlesList,
  type IBundleListItem,
} from "@/mocks/products/bundles-list";

interface UseBundlesOptions {
  delay?: number;
}

interface UseBundlesReturn {
  data: IBundleListItem[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useBundles(options: UseBundlesOptions = {}): UseBundlesReturn {
  const { delay = 500 } = options;

  const [data, setData] = useState<IBundleListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchBundles = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      await new Promise((resolve) => setTimeout(resolve, delay));
      setData(mockBundlesList);
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to fetch bundles"),
      );
    } finally {
      setIsLoading(false);
    }
  }, [delay]);

  useEffect(() => {
    fetchBundles();
  }, [fetchBundles]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchBundles,
  };
}
