"use client";

import { useCurrentUser } from "@/domains/workspace/hooks";
import type { ApiUser } from "@/graphql/types";

export interface UseSessionReturn {
  user: ApiUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: Error | null;
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
