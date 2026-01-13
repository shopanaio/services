"use client";

import { useMutation } from "@apollo/client/react";
import { useCallback } from "react";
import { SIGN_IN_MUTATION, CURRENT_USER_QUERY } from "../graphql";
import { createNetworkError } from "../utils";
import type { SignInInput, SignInResult } from "../context/types";
import type { ApiUserSignInInput, ApiUserSignInPayload } from "@/graphql/types";

export interface UseSignInReturn {
  /** Execute sign-in mutation */
  signIn: (input: SignInInput) => Promise<SignInResult>;
  /** Whether mutation is in progress */
  loading: boolean;
  /** Network/Apollo error if any */
  error: Error | null;
  /** Reset mutation state */
  reset: () => void;
}

/**
 * Hook for signing in with email and password.
 * On success, returns user and auth tokens.
 * Updates the current user in Apollo cache.
 */
export function useSignIn(): UseSignInReturn {
  const [mutate, { loading, error, reset }] = useMutation<
    { authMutation: { signIn: ApiUserSignInPayload } },
    { input: ApiUserSignInInput }
  >(SIGN_IN_MUTATION);

  const signIn = useCallback(
    async (input: SignInInput): Promise<SignInResult> => {
      try {
        const { data } = await mutate({
          variables: {
            input: {
              email: input.email,
              password: input.password,
            },
          },
        });

        const payload = data?.authMutation?.signIn;

        return {
          success: !!payload?.user && payload.userErrors.length === 0,
          user: payload?.user ?? null,
          token: payload?.token ?? null,
          userErrors: payload?.userErrors ?? [],
        };
      } catch {
        return {
          success: false,
          user: null,
          token: null,
          userErrors: [createNetworkError()],
        };
      }
    },
    [mutate]
  );

  return { signIn, loading, error: error ?? null, reset };
}
