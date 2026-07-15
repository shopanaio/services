"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ApiPageInfo } from "@/graphql/types";
import { requestCustomerSegments } from "../api/request-segments";
import type {
  ApiCustomerSegment,
  CustomerSegmentConnection,
  CustomerSegmentsQueryVariables,
} from "../graphql/operation-types";

export interface UseCustomerSegmentsReturn {
  segments: ApiCustomerSegment[];
  connection: CustomerSegmentConnection | null;
  totalCount: number;
  pageInfo: ApiPageInfo | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}

export function useCustomerSegments(
  variables: CustomerSegmentsQueryVariables,
): UseCustomerSegmentsReturn {
  const requestIdRef = useRef(0);
  const [connection, setConnection] = useState<CustomerSegmentConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const data = await requestCustomerSegments(variables);
      if (requestId === requestIdRef.current) {
        setConnection(data.customersQuery.segments);
      }
      return data;
    } catch (cause) {
      const normalized = cause instanceof Error ? cause : new Error("Unable to load customer segments");
      if (requestId === requestIdRef.current) setError(normalized);
      throw normalized;
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [variables]);

  useEffect(() => {
    void execute().catch(() => undefined);
  }, [execute]);

  return {
    segments: connection?.edges.map((edge) => edge.node) ?? [],
    connection,
    totalCount: connection?.totalCount ?? 0,
    pageInfo: connection?.pageInfo ?? null,
    loading,
    error,
    refetch: execute,
  };
}
