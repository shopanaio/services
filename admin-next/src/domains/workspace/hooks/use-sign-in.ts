"use client";

import { useMutation } from "@apollo/client/react";
import { useCallback } from "react";
import { SIGN_IN_MUTATION, CURRENT_USER_QUERY } from "../graphql";
import type {
  ApiUserSignInInput,
  ApiUserSignInPayload,
  ApiUser,
  ApiAuthTokenPayload,
  ApiGenericUserError,
} from "@/graphql/types";

interface SignInResult {
  user: ApiUser | null;
  token: ApiAuthTokenPayload | null;
  userErrors: ApiGenericUserError[];
}

interface UseSignInReturn {
  signIn: (input: ApiUserSignInInput) => Promise<SignInResult>;
  loading: boolean;
  error: Error | null;
}

/**
 * Hook for signing in with email and password.
 * On success, returns user and auth tokens.
 * Automatically refetches the current user query after sign-in.
 */
export function useSignIn(): UseSignInReturn {
  const [mutate, { loading, error }] = useMutation<
    { authMutation: { signIn: ApiUserSignInPayload } },
    { input: ApiUserSignInInput }
  >(SIGN_IN_MUTATION, {
    refetchQueries: [{ query: CURRENT_USER_QUERY }],
  });

  const signIn = useCallback(
    async (input: ApiUserSignInInput): Promise<SignInResult> => {
      const result = await mutate({ variables: { input } });
      const payload = result.data?.authMutation.signIn;

      return {
        user: payload?.user ?? null,
        token: payload?.token ?? null,
        userErrors: payload?.userErrors ?? [],
      };
    },
    [mutate]
  );

  return {
    signIn,
    loading,
    error: error ?? null,
  };
}
