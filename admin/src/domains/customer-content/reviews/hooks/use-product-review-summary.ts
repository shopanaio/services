"use client";

import { useQuery } from "@apollo/client/react";
import { PRODUCT_REVIEW_SUMMARY_QUERY } from "../graphql";
import type {
  ProductReviewSummaryQueryData,
  ProductReviewSummaryQueryVariables,
} from "../graphql/operation-types";

export function useProductReviewSummary(productId?: string) {
  const { data, previousData, loading, error, refetch } = useQuery<
    ProductReviewSummaryQueryData,
    ProductReviewSummaryQueryVariables
  >(PRODUCT_REVIEW_SUMMARY_QUERY, {
    variables: { productId: productId ?? "" },
    skip: !productId,
    fetchPolicy: "cache-and-network",
  });

  return {
    summary: (data ?? previousData)?.reviewsQuery.productReviewSummary ?? null,
    loading,
    error: error ?? null,
    refetch: () => refetch(),
  };
}
