"use client";

import { useQuery } from "@apollo/client/react";
import { CURRENT_USER_QUERY } from "../graphql";
import type { ApiUser } from "@/graphql/types";

export interface UseCurrentUserReturn {
  /** Current user or null if not authenticated */
  user: ApiUser | null;
  /** Whether query is loading */
  loading: boolean;
  /** Query error if any */
  error: Error | null;
  /** Refetch current user */
  refetch: () => void;
}

/**
 * Hook for getting the current authenticated user.
 * Returns null if not authenticated.
 * Automatically polls for updates every 5 minutes.
 */
export function useCurrentUser(): UseCurrentUserReturn {
  const { data, loading, error, refetch } = useQuery<{
    userQuery: { current: ApiUser | null };
  }>(CURRENT_USER_QUERY, {
    fetchPolicy: "cache-and-network",
    pollInterval: 5 * 60 * 1000, // Poll every 5 minutes
  });

  return {
    user: data?.userQuery.current ?? null,
    loading,
    error: error ?? null,
    refetch: () => void refetch(),
  };
}
