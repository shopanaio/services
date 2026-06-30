"use client";

import { useCallback } from "react";
import type { ApiCategory, ApiGenericUserError } from "@/graphql/types";
import { useUpdateCategory } from "./use-update-category";

interface UpdateCategorySubcategoriesResult {
  errors: ApiGenericUserError[];
}

interface UseUpdateCategorySubcategoriesReturn {
  updateSubcategories: (
    category: ApiCategory,
    selectedChildIds: string[],
  ) => Promise<UpdateCategorySubcategoriesResult>;
  loading: boolean;
  error: Error | null;
  reset: () => void;
}

export function useUpdateCategorySubcategories(): UseUpdateCategorySubcategoriesReturn {
  const { updateCategory, loading, error, reset } = useUpdateCategory();

  const updateSubcategories = useCallback(
    async (
      category: ApiCategory,
      selectedChildIds: string[],
    ): Promise<UpdateCategorySubcategoriesResult> => {
      const currentChildIds = category.children.map((child) => child.id);
      const currentChildIdSet = new Set(currentChildIds);
      const childIdsToAttach = selectedChildIds.filter(
        (childId) => childId !== category.id && !currentChildIdSet.has(childId),
      );
      const errors: ApiGenericUserError[] = [];

      for (const childId of childIdsToAttach) {
        const result = await updateCategory(childId, {
          hierarchy: {
            parentId: category.id,
          },
        });
        errors.push(...result.errors);
      }

      return { errors };
    },
    [updateCategory],
  );

  return {
    updateSubcategories,
    loading,
    error,
    reset,
  };
}
