"use client";

import { useCallback, useState } from "react";
import { requestDeleteCustomerSegment } from "../api/request-segments";
import type {
  CustomerSegmentDeleteInput,
  CustomerSegmentDeletePayload,
} from "../graphql/operation-types";

export function useDeleteCustomerSegment() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const deleteSegment = useCallback(async (
    input: CustomerSegmentDeleteInput,
  ): Promise<CustomerSegmentDeletePayload> => {
    setLoading(true);
    setError(null);
    try {
      return await requestDeleteCustomerSegment(input);
    } catch (cause) {
      const normalized = cause instanceof Error ? cause : new Error("Unable to delete customer segment");
      setError(normalized);
      return { deletedSegmentId: null, userErrors: [{ code: "UNEXPECTED_ERROR", message: normalized.message }] };
    } finally {
      setLoading(false);
    }
  }, []);

  return { deleteSegment, loading, error, reset: () => setError(null) };
}
