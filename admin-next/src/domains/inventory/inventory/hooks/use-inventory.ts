import { useState, useEffect, useCallback } from "react";
import {
  mockInventoryList,
  type IInventoryListItem,
} from "@/mocks/inventory/inventory-list";

interface UseInventoryOptions {
  /** Simulated delay in milliseconds */
  delay?: number;
}

interface UseInventoryReturn {
  data: IInventoryListItem[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook that simulates an API call to fetch inventory
 */
export function useInventory(
  options: UseInventoryOptions = {}
): UseInventoryReturn {
  const { delay = 500 } = options;

  const [data, setData] = useState<IInventoryListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchInventory = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, delay));

      // Simulate API response
      setData(mockInventoryList);
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to fetch inventory")
      );
    } finally {
      setIsLoading(false);
    }
  }, [delay]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchInventory,
  };
}
