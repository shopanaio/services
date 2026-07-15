"use client";

import { useCallback, useState } from "react";

export function useRequestMutation<TInput, TResult>(request: (input: TInput) => Promise<TResult>) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const mutate = useCallback(async (input: TInput) => {
    setLoading(true);
    setError(null);
    try { return await request(input); }
    catch (reason) {
      const next = reason instanceof Error ? reason : new Error("The fulfillment request failed.");
      setError(next);
      throw next;
    } finally { setLoading(false); }
  }, [request]);
  const reset = useCallback(() => setError(null), []);
  return { mutate, loading, error, reset };
}
