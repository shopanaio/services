"use client";

import { useCallback, useEffect, useState } from "react";
import { requestQuestion } from "../api/request-questions";
import type { ApiQuestion } from "../graphql/operation-types";

export function useQuestion(id?: string) {
  const [question, setQuestion] = useState<ApiQuestion | null>(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [error, setError] = useState<Error | null>(null);
  const execute = useCallback(async () => {
    if (!id) return null;
    setLoading(true);
    setError(null);
    try {
      const result = await requestQuestion(id);
      setQuestion(result);
      return result;
    } catch (cause) {
      const normalized = cause instanceof Error ? cause : new Error("Unable to load question");
      setError(normalized);
      return null;
    } finally {
      setLoading(false);
    }
  }, [id]);
  useEffect(() => { void execute(); }, [execute]);
  return { question, loading, error, refetch: execute };
}
