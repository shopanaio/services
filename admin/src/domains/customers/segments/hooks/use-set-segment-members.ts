"use client";

import { useCallback, useState } from "react";
import { requestSetCustomerSegmentMembers } from "../api/request-segments";
import type {
  CustomerSegmentMembersSetInput,
  CustomerSegmentMutationPayload,
} from "../graphql/operation-types";

export function useSetCustomerSegmentMembers() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const setSegmentMembers = useCallback(async (
    input: CustomerSegmentMembersSetInput,
  ): Promise<CustomerSegmentMutationPayload> => {
    setLoading(true);
    setError(null);
    try {
      return await requestSetCustomerSegmentMembers(input);
    } catch (cause) {
      const normalized = cause instanceof Error ? cause : new Error("Unable to update segment customers");
      setError(normalized);
      return { segment: null, userErrors: [{ code: "UNEXPECTED_ERROR", message: normalized.message }] };
    } finally {
      setLoading(false);
    }
  }, []);

  return { setSegmentMembers, loading, error, reset: () => setError(null) };
}
