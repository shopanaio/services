"use client";

import type {
  ApiPageInfo,
  ApiProductQuestion,
  ApiProductQuestionConnection,
} from "@/graphql/types";
import { useRelayConnectionQuery } from "@/graphql/hooks/use-relay-connection-query";
import { QUESTIONS_QUERY } from "../graphql";
import type {
  QuestionsQueryData,
  QuestionsQueryVariables,
} from "../graphql/operation-types";

export interface UseQuestionsReturn {
  questions: ApiProductQuestion[];
  connection: ApiProductQuestionConnection | null;
  totalCount: number;
  pageInfo: ApiPageInfo | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}

export function useQuestions(variables: QuestionsQueryVariables): UseQuestionsReturn {
  const result = useRelayConnectionQuery<
    QuestionsQueryData,
    QuestionsQueryVariables,
    ApiProductQuestion,
    ApiProductQuestionConnection
  >({
    query: QUESTIONS_QUERY,
    variables,
    fetchPolicy: "cache-and-network",
    getConnection: (data) => data?.reviewsQuery.productQuestions,
  });

  return {
    questions: result.nodes,
    connection: result.connection,
    totalCount: result.totalCount,
    pageInfo: result.pageInfo,
    loading: result.loading,
    error: result.error,
    refetch: result.refetch,
  };
}
