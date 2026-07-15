"use client";

import { useCallback, useState } from "react";
import { requestCreateCustomerSegment } from "../api/request-segments";
import type {
  CustomerSegmentCreateInput,
  CustomerSegmentMutationPayload,
} from "../graphql/operation-types";

export function useCreateCustomerSegment() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createSegment = useCallback(async (
    input: CustomerSegmentCreateInput,
  ): Promise<CustomerSegmentMutationPayload> => {
    setLoading(true);
    setError(null);
    try {
      return await requestCreateCustomerSegment(input);
    } catch (cause) {
      const normalized = cause instanceof Error ? cause : new Error("Unable to create customer segment");
      setError(normalized);
      return { segment: null, userErrors: [{ code: "UNEXPECTED_ERROR", message: normalized.message }] };
    } finally {
      setLoading(false);
    }
  }, []);

  return { createSegment, loading, error, reset: () => setError(null) };
}
