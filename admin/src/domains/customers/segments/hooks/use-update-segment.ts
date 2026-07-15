"use client";

import { useCallback, useState } from "react";
import { requestUpdateCustomerSegment } from "../api/request-segments";
import type {
  CustomerSegmentMutationPayload,
  CustomerSegmentUpdateInput,
} from "../graphql/operation-types";

export function useUpdateCustomerSegment() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const updateSegment = useCallback(async (
    input: CustomerSegmentUpdateInput,
  ): Promise<CustomerSegmentMutationPayload> => {
    setLoading(true);
    setError(null);
    try {
      return await requestUpdateCustomerSegment(input);
    } catch (cause) {
      const normalized = cause instanceof Error ? cause : new Error("Unable to update customer segment");
      setError(normalized);
      return { segment: null, userErrors: [{ code: "UNEXPECTED_ERROR", message: normalized.message }] };
    } finally {
      setLoading(false);
    }
  }, []);

  return { updateSegment, loading, error, reset: () => setError(null) };
}
