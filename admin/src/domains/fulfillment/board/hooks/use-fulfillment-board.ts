"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { requestFulfillmentBoard } from "../api";
import type { ApiFulfillmentStageConnection, FulfillmentBoardQueryVariables } from "../graphql/operation-types";

function normalizeError(error: unknown) {
  return error instanceof Error ? error : new Error("Unable to load the fulfillment board.");
}

export function useFulfillmentBoard(variables: FulfillmentBoardQueryVariables) {
  const [connection, setConnection] = useState<ApiFulfillmentStageConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const requestId = useRef(0);

  const refetch = useCallback(async () => {
    const currentRequest = ++requestId.current;
    setLoading(true);
    try {
      const response = await requestFulfillmentBoard(variables);
      if (requestId.current !== currentRequest) return null;
      setConnection(response.fulfillmentQuery.stages);
      setError(null);
      return response.fulfillmentQuery.stages;
    } catch (reason) {
      if (requestId.current === currentRequest) setError(normalizeError(reason));
      return null;
    } finally {
      if (requestId.current === currentRequest) setLoading(false);
    }
  }, [variables]);

  useEffect(() => { void refetch(); }, [refetch]);

  return {
    connection,
    stages: connection?.edges.map((edge) => edge.node) ?? [],
    loading,
    error,
    refetch,
  };
}
