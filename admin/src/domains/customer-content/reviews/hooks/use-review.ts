"use client";

import { useCallback, useEffect, useState } from "react";
import { requestReview } from "../api/request-reviews";
import type { ApiReview } from "../graphql/operation-types";

export function useReview(id?: string) {
  const [review, setReview] = useState<ApiReview | null>(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(async () => {
    if (!id) return null;
    setLoading(true);
    setError(null);
    try {
      const result = await requestReview(id);
      setReview(result);
      return result;
    } catch (cause) {
      const normalized = cause instanceof Error ? cause : new Error("Unable to load review");
      setError(normalized);
      return null;
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void execute();
  }, [execute]);

  return { review, loading, error, refetch: execute };
}
