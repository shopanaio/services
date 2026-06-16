"use client";

import { useQuery } from "@apollo/client/react";
import { MY_SESSIONS_QUERY } from "../graphql";
import type { ApiSession } from "@/graphql/types";

interface UseSessionsReturn {
  sessions: ApiSession[];
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Hook for fetching the current user's active sessions.
 */
export function useSessions(): UseSessionsReturn {
  const { data, loading, error, refetch } = useQuery<{
    userQuery: { mySessions: ApiSession[] };
  }>(MY_SESSIONS_QUERY, {
    fetchPolicy: "no-cache",
  });

  return {
    sessions: data?.userQuery.mySessions ?? [],
    loading,
    error: error ?? null,
    refetch,
  };
}
