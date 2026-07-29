"use client";

import type {
  ApiDiscount,
  ApiDiscountConnection,
  ApiPageInfo,
} from "@/graphql/types";
import { useRelayConnectionQuery } from "@/graphql/hooks/use-relay-connection-query";
import {
  DISCOUNT_REVIEW_FIXTURES_ENABLED,
  discountReviewConnection,
  discountReviewFixtures,
} from "../fixtures/discount-review.fixtures";
import { DISCOUNTS_QUERY } from "../graphql";
import type {
  DiscountsQueryData,
  DiscountsQueryVariables,
} from "../graphql/operation-types";

export interface UseDiscountsReturn {
  discounts: ApiDiscount[];
  connection: ApiDiscountConnection | null;
  totalCount: number;
  pageInfo: ApiPageInfo | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}

export function useDiscounts(
  variables: DiscountsQueryVariables,
): UseDiscountsReturn {
  const result = useRelayConnectionQuery<
    DiscountsQueryData,
    DiscountsQueryVariables,
    ApiDiscount,
    ApiDiscountConnection
  >({
    query: DISCOUNTS_QUERY,
    variables,
    skip: DISCOUNT_REVIEW_FIXTURES_ENABLED,
    fetchPolicy: "cache-and-network",
    getConnection: (data) => data?.pricingQuery.discounts,
  });

  if (DISCOUNT_REVIEW_FIXTURES_ENABLED) {
    return {
      discounts: discountReviewFixtures,
      connection: discountReviewConnection,
      totalCount: discountReviewConnection.totalCount,
      pageInfo: discountReviewConnection.pageInfo,
      loading: false,
      error: null,
      refetch: () => Promise.resolve(undefined),
    };
  }

  return {
    discounts: result.nodes,
    connection: result.connection,
    totalCount: result.totalCount,
    pageInfo: result.pageInfo,
    loading: result.loading,
    error: result.error,
    refetch: result.refetch,
  };
}
