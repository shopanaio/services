"use client";

import { useQuery } from "@apollo/client/react";
import { QUESTION_EDITOR_CONTEXT_QUERY } from "../graphql";
import type { QuestionEditorContextQueryData } from "../graphql/operation-types";

export function useQuestionEditorContext() {
  const { data, previousData, loading, error, refetch } = useQuery<QuestionEditorContextQueryData>(
    QUESTION_EDITOR_CONTEXT_QUERY,
    { fetchPolicy: "cache-and-network" },
  );
  const result = data ?? previousData;

  return {
    context: result
      ? {
          products: result.catalogQuery.products.edges.map((edge) => edge.node),
          customers: result.customersQuery.customers.edges.map((edge) => edge.node),
        }
      : null,
    loading,
    error: error ?? null,
    refetch: () => refetch(),
  };
}
