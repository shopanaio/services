"use client";

import { useCallback, useState } from "react";
import { requestCreateCustomer } from "../api/request-customers";
import type {
  CustomerCreateInput,
  CustomerMutationPayload,
} from "../graphql/operation-types";

export function useCreateCustomer() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createCustomer = useCallback(async (input: CustomerCreateInput): Promise<CustomerMutationPayload> => {
    setLoading(true);
    setError(null);
    try {
      return await requestCreateCustomer(input);
    } catch (cause) {
      const normalized = cause instanceof Error ? cause : new Error("Unable to create customer");
      setError(normalized);
      return {
        customer: null,
        userErrors: [{ code: "UNEXPECTED_ERROR", message: normalized.message }],
      };
    } finally {
      setLoading(false);
    }
  }, []);

  return { createCustomer, loading, error, reset: () => setError(null) };
}
