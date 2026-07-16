"use client";

import type {
  ApiPageInfo,
  ApiReview,
  ApiReviewConnection,
} from "@/graphql/types";
import { useRelayConnectionQuery } from "@/graphql/hooks/use-relay-connection-query";
import { REVIEWS_QUERY } from "../graphql";
import type {
  ReviewsQueryData,
  ReviewsQueryVariables,
} from "../graphql/operation-types";

export interface UseReviewsReturn {
  reviews: ApiReview[];
  connection: ApiReviewConnection | null;
  totalCount: number;
  pageInfo: ApiPageInfo | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}

export function useReviews(variables: ReviewsQueryVariables): UseReviewsReturn {
  const result = useRelayConnectionQuery<
    ReviewsQueryData,
    ReviewsQueryVariables,
    ApiReview,
    ApiReviewConnection
  >({
    query: REVIEWS_QUERY,
    variables,
    fetchPolicy: "cache-and-network",
    getConnection: (data) => data?.reviewsQuery.reviews,
  });

  return {
    reviews: result.nodes,
    connection: result.connection,
    totalCount: result.totalCount,
    pageInfo: result.pageInfo,
    loading: result.loading,
    error: result.error,
    refetch: result.refetch,
  };
}
