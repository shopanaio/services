"use client";

import { useQuery } from "@apollo/client/react";
import type { ApiCategory } from "@/graphql/types";
import { CATEGORY_DETAILS_QUERY } from "../graphql";
import type {
  CategoryDetailsQueryData,
  CategoryDetailsQueryVariables,
} from "../graphql";

interface UseCategoryReturn {
  category: ApiCategory | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}

export function useCategory(id?: string | null): UseCategoryReturn {
  const { data, previousData, loading, error, refetch } = useQuery<
    CategoryDetailsQueryData,
    CategoryDetailsQueryVariables
  >(CATEGORY_DETAILS_QUERY, {
    variables: { id: id ?? "" },
    skip: !id,
    fetchPolicy: "cache-and-network",
  });

  const effectiveData = data ?? previousData;

  return {
    category: effectiveData?.catalogQuery.category ?? null,
    loading,
    error: error ?? null,
    refetch: () => refetch(),
  };
}
