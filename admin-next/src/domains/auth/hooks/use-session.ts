"use client";

import { useCurrentUser } from "./use-current-user";
import type { ApiUser } from "@/graphql/types";

export interface UseSessionReturn {
  /** Current user or null if not authenticated */
  user: ApiUser | null;
  /** Whether user is authenticated */
  isAuthenticated: boolean;
  /** Whether session is being loaded/verified */
  isLoading: boolean;
  /** Session error if any */
  error: Error | null;
  /** Refetch session data */
  refetch: () => void;
}

/**
 * Hook for getting the current session state.
 * Returns user data if authenticated, null otherwise.
 * Provides convenient `isAuthenticated` flag for checking auth status.
 */
export function useSession(): UseSessionReturn {
  const { user, loading, error, refetch } = useCurrentUser();

  return {
    user,
    isAuthenticated: !!user,
    isLoading: loading,
    error,
    refetch,
  };
}
