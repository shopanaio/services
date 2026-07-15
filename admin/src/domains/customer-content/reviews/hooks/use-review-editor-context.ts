"use client";

import { useCallback, useEffect, useState } from "react";
import { requestReviewEditorContext } from "../api/request-reviews";
import type { ReviewEditorContext } from "../graphql/operation-types";

export function useReviewEditorContext() {
  const [context, setContext] = useState<ReviewEditorContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await requestReviewEditorContext();
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

  useEffect(() => {
    void execute();
  }, [execute]);

  return { context, loading, error, refetch: execute };
}
