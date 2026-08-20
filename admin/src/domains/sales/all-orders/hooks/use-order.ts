"use client";
import { useCallback, useEffect, useState } from "react";
import { requestOrder } from "../api/request-orders";
import type { ApiOrder } from "../graphql/operation-types";
export function useOrder(id?: string) {
  const [order, setOrder] = useState<ApiOrder | null>(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [error, setError] = useState<Error | null>(null);
  const refetch = useCallback(async () => {
    if (!id) {
      setOrder(null);
      return null;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await requestOrder(id);
      setOrder(result.ordersQuery.order);
      return result;
    } catch (cause) {
      const value = cause instanceof Error ? cause : new Error("Unable to load order");
      setError(value);
      throw value;
    } finally {
      setLoading(false);
    }
  }, [id]);
  useEffect(() => {
    void refetch().catch(() => undefined);
  }, [refetch]);
  return { order, loading, error, refetch };
}
