"use client";

import { useQuery } from "@apollo/client/react";
import { REVIEW_QUERY } from "../graphql";
import type { ReviewQueryData, ReviewQueryVariables } from "../graphql/operation-types";

export function useReview(id?: string) {
  const { data, previousData, loading, error, refetch } = useQuery<
    ReviewQueryData,
    ReviewQueryVariables
  >(REVIEW_QUERY, {
    variables: { id: id ?? "" },
    skip: !id,
    fetchPolicy: "cache-and-network",
  });

  return {
    review: (data ?? previousData)?.reviewsQuery.review ?? null,
    loading,
    error: error ?? null,
    refetch: () => refetch(),
  };
}
