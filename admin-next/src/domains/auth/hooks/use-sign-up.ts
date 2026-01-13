"use client";

import { useMutation } from "@apollo/client/react";
import { useCallback } from "react";
import { SIGN_UP_MUTATION, CURRENT_USER_QUERY } from "../graphql";
import { createNetworkError } from "../utils";
import type { SignUpInput, SignUpResult } from "../context/types";
import type {
  ApiUserSignUpInput,
  ApiUserSignUpPayload,
} from "@/graphql/types";

export interface UseSignUpReturn {
  /** Execute sign-up mutation */
  signUp: (input: SignUpInput) => Promise<SignUpResult>;
  /** Whether mutation is in progress */
  loading: boolean;
  /** Network/Apollo error if any */
  error: Error | null;
  /** Reset mutation state */
  reset: () => void;
}

/**
 * Hook for creating a new user account.
 * On success, returns the created user and auth tokens.
 * Automatically refetches the current user query after sign-up.
 */
export function useSignUp(): UseSignUpReturn {
  const [mutate, { loading, error, reset }] = useMutation<
    { authMutation: { signUp: ApiUserSignUpPayload } },
    { input: ApiUserSignUpInput }
  >(SIGN_UP_MUTATION, {
    refetchQueries: [{ query: CURRENT_USER_QUERY }],
    awaitRefetchQueries: true,
  });

  const signUp = useCallback(
    async (input: SignUpInput): Promise<SignUpResult> => {
      try {
        const { data } = await mutate({
          variables: {
            input: {
              email: input.email,
              password: input.password,
            },
          },
        });

        const payload = data?.authMutation?.signUp;

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

  return { signUp, loading, error: error ?? null, reset };
}
