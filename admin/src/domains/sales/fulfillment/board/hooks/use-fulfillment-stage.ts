"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { requestFulfillmentStage } from "../api";
import type { ApiFulfillmentStage } from "../graphql/operation-types";

export function useFulfillmentStage(id?: string) {
  const [stage, setStage] = useState<ApiFulfillmentStage | null>(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [error, setError] = useState<Error | null>(null);
  const requestId = useRef(0);
  const refetch = useCallback(async () => {
    if (!id) {
      setStage(null);
      setLoading(false);
      return null;
    }
    const current = ++requestId.current;
    setLoading(true);
    try {
      const value = await requestFulfillmentStage(id);
      if (current === requestId.current) {
        setStage(value);
        setError(null);
      }
      return value;
    } catch (reason) {
      const next = reason instanceof Error ? reason : new Error("Unable to load the stage.");
      if (current === requestId.current) setError(next);
      return null;
    } finally {
      if (current === requestId.current) setLoading(false);
    }
  }, [id]);
  useEffect(() => {
    void refetch();
  }, [refetch]);
  return { stage, loading, error, refetch };
}
