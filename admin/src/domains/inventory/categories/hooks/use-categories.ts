import { useState, useEffect, useCallback } from "react";
import {
  mockCategoriesList,
  type ICategoryListItem,
} from "@/mocks/products/categories-list";

interface UseCategoriesOptions {
  delay?: number;
}

interface UseCategoriesReturn {
  data: ICategoryListItem[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useCategories(
  options: UseCategoriesOptions = {}
): UseCategoriesReturn {
  const { delay = 500 } = options;

  const [data, setData] = useState<ICategoryListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      await new Promise((resolve) => setTimeout(resolve, delay));
      setData(mockCategoriesList);
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to fetch categories")
      );
    } finally {
      setIsLoading(false);
    }
  }, [delay]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchCategories,
  };
}
