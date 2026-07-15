"use client";

import { useCallback, useState } from "react";
import { requestUpdateCustomer } from "../api/request-customers";
import type {
  CustomerMutationPayload,
  CustomerUpdateInput,
} from "../graphql/operation-types";

export function useUpdateCustomer() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const updateCustomer = useCallback(async (input: CustomerUpdateInput): Promise<CustomerMutationPayload> => {
    setLoading(true);
    setError(null);
    try {
      return await requestUpdateCustomer(input);
    } catch (cause) {
      const normalized = cause instanceof Error ? cause : new Error("Unable to update customer");
      setError(normalized);
      return {
        customer: null,
        userErrors: [{ code: "UNEXPECTED_ERROR", message: normalized.message }],
      };
    } finally {
      setLoading(false);
    }
  }, []);

  return { updateCustomer, loading, error, reset: () => setError(null) };
}
