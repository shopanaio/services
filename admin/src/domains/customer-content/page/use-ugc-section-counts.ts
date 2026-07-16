"use client";

import { useQuery } from "@apollo/client/react";
import { UGC_SECTION_COUNTS_QUERY } from "./graphql";

interface UgcSectionCountsQueryData {
  reviewsQuery: {
    reviews: { totalCount: number };
    productQuestions: { totalCount: number };
    contents: { totalCount: number };
    contentReports: { totalCount: number };
    moderationCases: { totalCount: number };
    reviewRequests: { totalCount: number };
    contentExternalReferences: { totalCount: number };
  };
}

export interface UgcSectionCounts {
  reviews: number;
  questions: number;
  moderation: number;
  reports: number;
  moderationCases: number;
  reviewRequests: number;
  externalReferences: number;
}

const EMPTY_COUNTS: UgcSectionCounts = {
  reviews: 0,
  questions: 0,
  moderation: 0,
  reports: 0,
  moderationCases: 0,
  reviewRequests: 0,
  externalReferences: 0,
};

export function useUgcSectionCounts() {
  const { data, previousData, loading, error } = useQuery<UgcSectionCountsQueryData>(
    UGC_SECTION_COUNTS_QUERY,
    { fetchPolicy: "cache-and-network" },
  );
  const query = data ?? previousData;

  return {
    counts: query ? {
      reviews: query.reviewsQuery.reviews.totalCount,
      questions: query.reviewsQuery.productQuestions.totalCount,
      moderation: query.reviewsQuery.contents.totalCount,
      reports: query.reviewsQuery.contentReports.totalCount,
      moderationCases: query.reviewsQuery.moderationCases.totalCount,
      reviewRequests: query.reviewsQuery.reviewRequests.totalCount,
      externalReferences: query.reviewsQuery.contentExternalReferences.totalCount,
    } : EMPTY_COUNTS,
    loading,
    error: (error as Error | undefined) ?? null,
  };
}
