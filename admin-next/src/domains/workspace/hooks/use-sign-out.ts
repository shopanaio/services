"use client";

import { useMutation, useApolloClient } from "@apollo/client/react";
import { useCallback } from "react";
import { SIGN_OUT_MUTATION } from "../graphql";
import type {
  ApiUserSignOutInput,
  ApiUserSignOutPayload,
  ApiGenericUserError,
} from "@/graphql/types";

interface SignOutResult {
  success: boolean;
  userErrors: ApiGenericUserError[];
}

interface UseSignOutReturn {
  signOut: (allSessions?: boolean) => Promise<SignOutResult>;
  loading: boolean;
  error: Error | null;
}

/**
 * Hook for signing out the current user.
 * Optionally can sign out from all sessions.
 * Clears the Apollo cache after successful sign-out.
 */
export function useSignOut(): UseSignOutReturn {
  const client = useApolloClient();
  const [mutate, { loading, error }] = useMutation<
    { authMutation: { signOut: ApiUserSignOutPayload } },
    { input: ApiUserSignOutInput }
  >(SIGN_OUT_MUTATION);

  const signOut = useCallback(
    async (allSessions = false): Promise<SignOutResult> => {
      const result = await mutate({
        variables: { input: { allSessions } },
      });
      const payload = result.data?.authMutation.signOut;

      // Clear Apollo cache on successful sign-out
      if (payload?.success) {
        await client.resetStore();
      }

      return {
        success: payload?.success ?? false,
        userErrors: payload?.userErrors ?? [],
      };
    },
    [mutate, client]
  );

  return {
    signOut,
    loading,
    error: error ?? null,
  };
}
