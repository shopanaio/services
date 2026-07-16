"use client";

import { useQuery } from "@apollo/client/react";
import type { ApiProductQuestionSummary } from "@/graphql/types";
import { PRODUCT_QUESTION_SUMMARY_QUERY } from "./graphql";

export function useProductQuestionSummary(productId: string) {
  const query = useQuery<{
    reviewsQuery: { productQuestionSummary: ApiProductQuestionSummary | null };
  }, { productId: string }>(PRODUCT_QUESTION_SUMMARY_QUERY, {
    variables: { productId },
    fetchPolicy: "cache-and-network",
  });

  return {
    summary: (query.data ?? query.previousData)?.reviewsQuery.productQuestionSummary ?? null,
    loading: query.loading,
    error: query.error ?? null,
  };
}
