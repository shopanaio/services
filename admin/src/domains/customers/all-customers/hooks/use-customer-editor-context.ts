"use client";

import { useCallback, useEffect, useState } from "react";
import { requestCustomerEditorContext } from "../api/request-customers";

type CustomerEditorContext = Awaited<ReturnType<typeof requestCustomerEditorContext>>;

export function useCustomerEditorContext() {
  const [context, setContext] = useState<CustomerEditorContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await requestCustomerEditorContext();
      setContext(result);
      return result;
    } catch (cause) {
      const normalized = cause instanceof Error ? cause : new Error("Unable to load customer editor data");
      setError(normalized);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void execute();
  }, [execute]);

  return { context, loading, error, refetch: execute };
}
