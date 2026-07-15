"use client";

import { useCallback, useState } from "react";
import { requestCreateReview } from "../api/request-reviews";
import type { ReviewCreateInput, ReviewMutationPayload } from "../graphql/operation-types";
import type { ApiFile } from "@/graphql/types";

export function useCreateReview() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createReview = useCallback(async (
    input: ReviewCreateInput,
    optimisticMedia: ApiFile[] = [],
  ): Promise<ReviewMutationPayload> => {
    setLoading(true);
    setError(null);
    try {
      return await requestCreateReview(input, optimisticMedia);
    } catch (cause) {
      const normalized = cause instanceof Error ? cause : new Error("Unable to create review");
      setError(normalized);
      return { review: null, userErrors: [{ code: "UNEXPECTED_ERROR", message: normalized.message }] };
    } finally {
      setLoading(false);
    }
  }, []);

  return { createReview, loading, error, reset: () => setError(null) };
}
