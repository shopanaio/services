"use client";

import { useCallback, useState } from "react";
import { requestCreateQuestion } from "../api/request-questions";
import type { QuestionCreateInput, QuestionMutationPayload } from "../graphql/operation-types";

export function useCreateQuestion() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const createQuestion = useCallback(async (input: QuestionCreateInput): Promise<QuestionMutationPayload> => {
    setLoading(true);
    setError(null);
    try {
      return await requestCreateQuestion(input);
    } catch (cause) {
      const normalized = cause instanceof Error ? cause : new Error("Unable to create question");
      setError(normalized);
      return { question: null, userErrors: [{ code: "UNEXPECTED_ERROR", message: normalized.message }] };
    } finally {
      setLoading(false);
    }
  }, []);
  return { createQuestion, loading, error, reset: () => setError(null) };
}
