"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { requestReviews } from "../api/request-reviews";
import type {
  ApiReview,
  ReviewConnection,
  ReviewsQueryVariables,
} from "../graphql/operation-types";
import type { ApiPageInfo } from "@/graphql/types";

export interface UseReviewsReturn {
  reviews: ApiReview[];
  connection: ReviewConnection | null;
  totalCount: number;
  pageInfo: ApiPageInfo | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}

export function useReviews(variables: ReviewsQueryVariables): UseReviewsReturn {
  const requestIdRef = useRef(0);
  const [connection, setConnection] = useState<ReviewConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);

    try {
      const data = await requestReviews(variables);
      if (requestId === requestIdRef.current) {
        setConnection(data.reviewQuery.reviews);
      }
      return data;
    } catch (requestError) {
      const normalizedError = requestError instanceof Error
        ? requestError
        : new Error("Unable to load reviews");
      if (requestId === requestIdRef.current) setError(normalizedError);
      throw normalizedError;
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [variables]);

  useEffect(() => {
    void execute().catch(() => undefined);
  }, [execute]);

  return {
    reviews: connection?.edges.map((edge) => edge.node) ?? [],
    connection,
    totalCount: connection?.totalCount ?? 0,
    pageInfo: connection?.pageInfo ?? null,
    loading,
    error,
    refetch: execute,
  };
}
