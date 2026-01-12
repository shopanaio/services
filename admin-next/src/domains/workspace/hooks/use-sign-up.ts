"use client";

import { useMutation } from "@apollo/client/react";
import { useCallback } from "react";
import { SIGN_UP_MUTATION, CURRENT_USER_QUERY } from "../graphql";
import type {
  ApiUserSignUpInput,
  ApiUserSignUpPayload,
  ApiUser,
  ApiAuthTokenPayload,
  ApiGenericUserError,
} from "@/graphql/types";

interface SignUpResult {
  user: ApiUser | null;
  token: ApiAuthTokenPayload | null;
  userErrors: ApiGenericUserError[];
}

interface UseSignUpReturn {
  signUp: (input: ApiUserSignUpInput) => Promise<SignUpResult>;
  loading: boolean;
  error: Error | null;
}

/**
 * Hook for creating a new user account.
 * On success, returns the created user and auth tokens.
 * Automatically refetches the current user query after sign-up.
 */
export function useSignUp(): UseSignUpReturn {
  const [mutate, { loading, error }] = useMutation<
    { authMutation: { signUp: ApiUserSignUpPayload } },
    { input: ApiUserSignUpInput }
  >(SIGN_UP_MUTATION, {
    refetchQueries: [{ query: CURRENT_USER_QUERY }],
  });

  const signUp = useCallback(
    async (input: ApiUserSignUpInput): Promise<SignUpResult> => {
      const result = await mutate({ variables: { input } });
      const payload = result.data?.authMutation.signUp;

      return {
        user: payload?.user ?? null,
        token: payload?.token ?? null,
        userErrors: payload?.userErrors ?? [],
      };
    },
    [mutate]
  );

  return {
    signUp,
    loading,
    error: error ?? null,
  };
}
