"use client";

import { useCallback, useEffect, useState } from "react";
import { requestCustomer } from "../api/request-customers";
import type { ApiCustomer } from "../graphql/operation-types";

export function useCustomer(id?: string) {
  const [customer, setCustomer] = useState<ApiCustomer | null>(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(async () => {
    if (!id) return null;
    setLoading(true);
    setError(null);
    try {
      const result = await requestCustomer(id);
      setCustomer(result);
      return result;
    } catch (cause) {
      const normalized = cause instanceof Error ? cause : new Error("Unable to load customer");
      setError(normalized);
      return null;
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void execute();
  }, [execute]);

  return { customer, loading, error, refetch: execute };
}
