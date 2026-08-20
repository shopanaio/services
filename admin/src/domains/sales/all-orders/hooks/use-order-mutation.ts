"use client";
import { useCallback, useState } from "react";
import type { OrderMutationPayload } from "../graphql/operation-types";
export function useOrderMutation<TInput>(
  request: (input: TInput) => Promise<OrderMutationPayload>,
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const mutate = useCallback(
    async (input: TInput) => {
      setLoading(true);
      setError(null);
      try {
        return await request(input);
      } catch (cause) {
        const value = cause instanceof Error ? cause : new Error("Unable to update order");
        setError(value);
        throw value;
      } finally {
        setLoading(false);
      }
    },
    [request],
  );
  return { mutate, loading, error, reset: () => setError(null) };
}
