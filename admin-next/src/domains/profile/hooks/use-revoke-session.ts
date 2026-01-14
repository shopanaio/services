"use client";

import { useMutation } from "@apollo/client/react";
import { useCallback } from "react";
import {
  REVOKE_SESSION_MUTATION,
  REVOKE_ALL_SESSIONS_MUTATION,
  MY_SESSIONS_QUERY,
} from "../graphql";
import type {
  ApiSessionRevokePayload,
  ApiSessionRevokeAllPayload,
  ApiGenericUserError,
} from "@/graphql/types";

interface RevokeSessionResult {
  success: boolean;
  userErrors: ApiGenericUserError[];
}

interface RevokeAllSessionsResult {
  revokedCount: number;
  userErrors: ApiGenericUserError[];
}

interface UseRevokeSessionReturn {
  revokeSession: (sessionId: string) => Promise<RevokeSessionResult>;
  revokeAllSessions: () => Promise<RevokeAllSessionsResult>;
  loading: boolean;
  error: Error | null;
}

/**
 * Hook for revoking user sessions.
 * Provides methods to revoke a specific session or all sessions except current.
 */
export function useRevokeSession(): UseRevokeSessionReturn {
  const [revokeMutate, { loading: revokeLoading, error: revokeError }] =
    useMutation<
      { userMutation: { sessionRevoke: ApiSessionRevokePayload } },
      { input: { sessionId: string } }
    >(REVOKE_SESSION_MUTATION, {
      refetchQueries: [{ query: MY_SESSIONS_QUERY }],
    });

  const [revokeAllMutate, { loading: revokeAllLoading, error: revokeAllError }] =
    useMutation<{ userMutation: { sessionRevokeAll: ApiSessionRevokeAllPayload } }>(
      REVOKE_ALL_SESSIONS_MUTATION,
      {
        refetchQueries: [{ query: MY_SESSIONS_QUERY }],
      }
    );

  const revokeSession = useCallback(
    async (sessionId: string): Promise<RevokeSessionResult> => {
      const result = await revokeMutate({ variables: { input: { sessionId } } });
      const payload = result.data?.userMutation.sessionRevoke;

      return {
        success: payload?.success ?? false,
        userErrors: payload?.userErrors ?? [],
      };
    },
    [revokeMutate]
  );

  const revokeAllSessions = useCallback(async (): Promise<RevokeAllSessionsResult> => {
    const result = await revokeAllMutate();
    const payload = result.data?.userMutation.sessionRevokeAll;

    return {
      revokedCount: payload?.revokedCount ?? 0,
      userErrors: payload?.userErrors ?? [],
    };
  }, [revokeAllMutate]);

  return {
    revokeSession,
    revokeAllSessions,
    loading: revokeLoading || revokeAllLoading,
    error: revokeError ?? revokeAllError ?? null,
  };
}
