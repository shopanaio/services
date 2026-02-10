"use client";

import { useQuery, useLazyQuery } from "@apollo/client/react";
import { useCallback } from "react";
import { AUTHORIZE_QUERY } from "../graphql";
import type { ApiAuthorizeInput, ApiAuthorizePayload } from "@/graphql/types";

interface AuthorizeResult {
  allowed: boolean;
  deniedReason: string | null;
}

// ============================================
// Reactive authorization hook (for continuous checks)
// ============================================

interface UseAuthorizeOptions {
  skip?: boolean;
}

interface UseAuthorizeReturn {
  allowed: boolean;
  deniedReason: string | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Hook for reactive authorization checks.
 * Automatically re-checks when dependencies change.
 * Use for UI elements that need to show/hide based on permissions.
 *
 * @param input - Authorization check parameters
 * @param options - Optional configuration
 */
export function useAuthorize(
  input: ApiAuthorizeInput,
  options: UseAuthorizeOptions = {}
): UseAuthorizeReturn {
  const { skip = false } = options;

  const { data, loading, error, refetch } = useQuery<{
    userQuery: { authorize: ApiAuthorizePayload };
  }>(AUTHORIZE_QUERY, {
    variables: { input },
    skip,
    fetchPolicy: "cache-first",
  });

  const payload = data?.userQuery.authorize;

  return {
    allowed: payload?.allowed ?? false,
    deniedReason: payload?.deniedReason ?? null,
    loading,
    error: error ?? null,
    refetch: () => void refetch(),
  };
}

// ============================================
// Lazy authorization hook (for on-demand checks)
// ============================================

interface UseAuthorizeCheckReturn {
  checkAuthorization: (input: ApiAuthorizeInput) => Promise<AuthorizeResult>;
  loading: boolean;
  error: Error | null;
}

/**
 * Hook for on-demand authorization checks.
 * Use before performing actions that require specific permissions.
 * More efficient than reactive check when you only need to verify once.
 */
export function useAuthorizeCheck(): UseAuthorizeCheckReturn {
  const [executeQuery, { loading, error }] = useLazyQuery<
    { userQuery: { authorize: ApiAuthorizePayload } },
    { input: ApiAuthorizeInput }
  >(AUTHORIZE_QUERY, {
    fetchPolicy: "network-only",
  });

  const checkAuthorization = useCallback(
    async (input: ApiAuthorizeInput): Promise<AuthorizeResult> => {
      const result = await executeQuery({ variables: { input } });
      const payload = result.data?.userQuery.authorize;

      return {
        allowed: payload?.allowed ?? false,
        deniedReason: payload?.deniedReason ?? null,
      };
    },
    [executeQuery]
  );

  return {
    checkAuthorization,
    loading,
    error: error ?? null,
  };
}
