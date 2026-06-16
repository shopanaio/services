"use client";

import { useApolloClient, useMutation } from "@apollo/client/react";
import { useCallback } from "react";
import { SIGN_UP_MUTATION, CURRENT_USER_QUERY } from "../graphql";
import { createNetworkError, setStoredTokens } from "../utils";
import type { SignUpInput, SignUpResult } from "../context/types";
import type { ApiUserSignUpInput, ApiUserSignUpPayload } from "@/graphql/types";

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
 * Updates the current user in Apollo cache.
 */
export function useSignUp(): UseSignUpReturn {
  const client = useApolloClient();
  const [mutate, { loading, error, reset }] = useMutation<
    { authMutation: { signUp: ApiUserSignUpPayload } },
    { input: ApiUserSignUpInput }
  >(SIGN_UP_MUTATION);

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
        const success = !!payload?.user && payload.userErrors.length === 0;

        // Store tokens and update Apollo cache
        if (success && payload?.user && payload?.token) {
          setStoredTokens(
            payload.token.accessToken,
            payload.token.refreshToken,
            payload.token.expiresIn
          );

          client.writeQuery({
            query: CURRENT_USER_QUERY,
            data: {
              userQuery: {
                __typename: "UserQuery",
                current: payload.user,
              },
            },
          });
        }

        return {
          success,
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
    [mutate, client]
  );

  return { signUp, loading, error: error ?? null, reset };
}
