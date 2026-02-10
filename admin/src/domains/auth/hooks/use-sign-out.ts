"use client";

import { useMutation, useApolloClient } from "@apollo/client/react";
import { useCallback } from "react";
import { SIGN_OUT_MUTATION } from "../graphql";
import { createNetworkError, clearStoredTokens } from "../utils";
import type { SignOutOptions, SignOutResult } from "../context/types";
import type {
  ApiUserSignOutInput,
  ApiUserSignOutPayload,
} from "@/graphql/types";

export interface UseSignOutReturn {
  /** Execute sign-out mutation */
  signOut: (options?: SignOutOptions) => Promise<SignOutResult>;
  /** Whether mutation is in progress */
  loading: boolean;
  /** Network/Apollo error if any */
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
    async (options?: SignOutOptions): Promise<SignOutResult> => {
      try {
        const { data } = await mutate({
          variables: {
            input: { allSessions: options?.allSessions ?? false },
          },
        });

        const payload = data?.authMutation?.signOut;

        // Clear tokens and Apollo cache on successful sign-out
        if (payload?.success) {
          clearStoredTokens();
          await client.resetStore();
        }

        return {
          success: payload?.success ?? false,
          userErrors: payload?.userErrors ?? [],
        };
      } catch {
        return {
          success: false,
          userErrors: [createNetworkError()],
        };
      }
    },
    [mutate, client]
  );

  return { signOut, loading, error: error ?? null };
}
