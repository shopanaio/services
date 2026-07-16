"use client";

import { useQuery } from "@apollo/client/react";
import { QUESTION_QUERY } from "../graphql";
import type { QuestionQueryData, QuestionQueryVariables } from "../graphql/operation-types";

export function useQuestion(id?: string) {
  const { data, previousData, loading, error, refetch } = useQuery<
    QuestionQueryData,
    QuestionQueryVariables
  >(QUESTION_QUERY, {
    variables: { id: id ?? "" },
    skip: !id,
    fetchPolicy: "cache-and-network",
  });

  return {
    question: (data ?? previousData)?.reviewsQuery.productQuestion ?? null,
    loading,
    error: error ?? null,
    refetch: () => refetch(),
  };
}
