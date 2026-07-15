"use client";

import { useCallback, useEffect, useState } from "react";
import { requestQuestionEditorContext } from "../api/request-questions";
import type { QuestionEditorContext } from "../graphql/operation-types";

export function useQuestionEditorContext() {
  const [context, setContext] = useState<QuestionEditorContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const execute = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await requestQuestionEditorContext();
      setContext(result);
      return result;
    } catch (cause) {
      const normalized = cause instanceof Error ? cause : new Error("Unable to load products and customers");
      setError(normalized);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void execute(); }, [execute]);
  return { context, loading, error, refetch: execute };
}
