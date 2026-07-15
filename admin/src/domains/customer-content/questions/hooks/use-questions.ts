"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ApiPageInfo } from "@/graphql/types";
import { requestQuestions } from "../api/request-questions";
import type { ApiQuestion, QuestionConnection, QuestionsQueryVariables } from "../graphql/operation-types";

export interface UseQuestionsReturn {
  questions: ApiQuestion[];
  connection: QuestionConnection | null;
  totalCount: number;
  pageInfo: ApiPageInfo | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}

export function useQuestions(variables: QuestionsQueryVariables): UseQuestionsReturn {
  const requestIdRef = useRef(0);
  const [connection, setConnection] = useState<QuestionConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const data = await requestQuestions(variables);
      if (requestId === requestIdRef.current) setConnection(data.reviewQuery.questions);
      return data;
    } catch (cause) {
      const normalized = cause instanceof Error ? cause : new Error("Unable to load questions");
      if (requestId === requestIdRef.current) setError(normalized);
      throw normalized;
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [variables]);

  useEffect(() => { void execute().catch(() => undefined); }, [execute]);

  return {
    questions: connection?.edges.map((edge) => edge.node) ?? [],
    connection,
    totalCount: connection?.totalCount ?? 0,
    pageInfo: connection?.pageInfo ?? null,
    loading,
    error,
    refetch: execute,
  };
}
