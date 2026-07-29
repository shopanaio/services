"use client";

import { useQuery } from "@apollo/client/react";
import type { ApiDiscount } from "@/graphql/types";
import {
  DISCOUNT_REVIEW_FIXTURES_ENABLED,
  getDiscountReviewFixture,
} from "../fixtures/discount-review.fixtures";
import { DISCOUNT_DETAILS_QUERY } from "../graphql";
import type {
  DiscountDetailsQueryData,
  DiscountDetailsQueryVariables,
} from "../graphql/operation-types";

interface UseDiscountReturn {
  discount: ApiDiscount | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}

export function useDiscount(id?: string | null): UseDiscountReturn {
  const reviewFixture = getDiscountReviewFixture(id);
  const { data, previousData, loading, error, refetch } = useQuery<
    DiscountDetailsQueryData,
    DiscountDetailsQueryVariables
  >(DISCOUNT_DETAILS_QUERY, {
    variables: { id: id ?? "" },
    skip: !id || DISCOUNT_REVIEW_FIXTURES_ENABLED,
    fetchPolicy: "cache-and-network",
  });

  if (DISCOUNT_REVIEW_FIXTURES_ENABLED) {
    return {
      discount: reviewFixture,
      loading: false,
      error: null,
      refetch: () => Promise.resolve(undefined),
    };
  }

  const effectiveData = data ?? previousData;

  return {
    discount: effectiveData?.pricingQuery.discount ?? null,
    loading,
    error: error ?? null,
    refetch: () => refetch(),
  };
}
