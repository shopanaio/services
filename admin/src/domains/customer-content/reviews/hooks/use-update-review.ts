"use client";

import { useCallback, useState } from "react";
import { requestUpdateReview } from "../api/request-reviews";
import type { ReviewMutationPayload, ReviewUpdateInput } from "../graphql/operation-types";
import type { ApiFile } from "@/graphql/types";

export function useUpdateReview() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const updateReview = useCallback(async (
    input: ReviewUpdateInput,
    optimisticMedia: ApiFile[] = [],
  ): Promise<ReviewMutationPayload> => {
    setLoading(true);
    setError(null);
    try {
      return await requestUpdateReview(input, optimisticMedia);
    } catch (cause) {
      const normalized = cause instanceof Error ? cause : new Error("Unable to update review");
      setError(normalized);
      return { review: null, userErrors: [{ code: "UNEXPECTED_ERROR", message: normalized.message }] };
    } finally {
      setLoading(false);
    }
  }, []);

  return { updateReview, loading, error, reset: () => setError(null) };
}
