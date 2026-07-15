"use client";

import { useCallback, useEffect, useState } from "react";
import { requestCustomerSegment } from "../api/request-segments";
import type { ApiCustomerSegmentDetails } from "../graphql/operation-types";

export function useCustomerSegment(id?: string) {
  const [segment, setSegment] = useState<ApiCustomerSegmentDetails | null>(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(async () => {
    if (!id) return null;
    setLoading(true);
    setError(null);
    try {
      const result = await requestCustomerSegment(id);
      setSegment(result);
      return result;
    } catch (cause) {
      const normalized = cause instanceof Error ? cause : new Error("Unable to load customer segment");
      setError(normalized);
      return null;
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void execute();
  }, [execute]);

  return { segment, loading, error, refetch: execute };
}
