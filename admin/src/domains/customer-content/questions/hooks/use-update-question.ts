"use client";

import { useCallback, useState } from "react";
import { requestUpdateQuestion } from "../api/request-questions";
import type { QuestionMutationPayload, QuestionUpdateInput } from "../graphql/operation-types";

export function useUpdateQuestion() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const updateQuestion = useCallback(async (input: QuestionUpdateInput): Promise<QuestionMutationPayload> => {
    setLoading(true);
    setError(null);
    try {
      return await requestUpdateQuestion(input);
    } catch (cause) {
      const normalized = cause instanceof Error ? cause : new Error("Unable to update question");
      setError(normalized);
      return { question: null, userErrors: [{ code: "UNEXPECTED_ERROR", message: normalized.message }] };
    } finally {
      setLoading(false);
    }
  }, []);
  return { updateQuestion, loading, error, reset: () => setError(null) };
}
