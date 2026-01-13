"use client";

import { useCallback, useMemo, useState } from "react";
import { useApolloClient, useQuery } from "@apollo/client/react";
import { AuthContext } from "../context";
import { CURRENT_USER_QUERY } from "../graphql";
import { useSignIn, useSignUp, useSignOut } from "../hooks";
import { createNetworkError } from "../utils";
import type { ApiUser } from "@/graphql/types";
import type {
  AuthContextValue,
  AuthError,
  SignInInput,
  SignInResult,
  SignUpInput,
  SignUpResult,
  SignOutOptions,
  SignOutResult,
} from "../context/types";

interface SessionProviderProps {
  children: React.ReactNode;
}

/**
 * Auth context provider component.
 * Provides authentication state and operations to the app.
 * Should wrap the entire application (typically in root layout).
 */
export function SessionProvider({ children }: SessionProviderProps) {
  const client = useApolloClient();
  const [error, setError] = useState<AuthError | null>(null);

  // Current user query with polling
  const {
    data,
    loading: queryLoading,
    error: queryError,
    refetch,
  } = useQuery<{ userQuery: { current: ApiUser | null } }>(CURRENT_USER_QUERY, {
    fetchPolicy: "cache-and-network",
    pollInterval: 5 * 60 * 1000, // 5 minutes
  });

  // Set error from query if present
  if (queryError && !error) {
    setError({
      code: "SESSION_ERROR",
      message: "Failed to verify session",
    });
  }

  // Auth operation hooks
  const { signIn: doSignIn, loading: signInLoading } = useSignIn();
  const { signUp: doSignUp, loading: signUpLoading } = useSignUp();
  const { signOut: doSignOut, loading: signOutLoading } = useSignOut();

  const user = (data?.userQuery?.current as ApiUser | null) ?? null;
  const isAuthenticated = !!user;
  const isLoading =
    queryLoading || signInLoading || signUpLoading || signOutLoading;

  // Sign in with error handling
  const signIn = useCallback(
    async (input: SignInInput): Promise<SignInResult> => {
      setError(null);
      const result = await doSignIn(input);

      if (!result.success && result.userErrors.length > 0) {
        setError({
          code: result.userErrors[0].code ?? "SIGN_IN_ERROR",
          message: result.userErrors[0].message,
          field: result.userErrors[0].field ?? undefined,
        });
      }

      return result;
    },
    [doSignIn]
  );

  // Sign up with error handling
  const signUp = useCallback(
    async (input: SignUpInput): Promise<SignUpResult> => {
      setError(null);
      const result = await doSignUp(input);

      if (!result.success && result.userErrors.length > 0) {
        setError({
          code: result.userErrors[0].code ?? "SIGN_UP_ERROR",
          message: result.userErrors[0].message,
          field: result.userErrors[0].field ?? undefined,
        });
      }

      return result;
    },
    [doSignUp]
  );

  // Sign out with cache clear
  const signOut = useCallback(
    async (options?: SignOutOptions): Promise<SignOutResult> => {
      setError(null);

      try {
        const result = await doSignOut(options);

        if (result.success) {
          await client.resetStore();
        } else if (result.userErrors.length > 0) {
          setError({
            code: result.userErrors[0].code ?? "SIGN_OUT_ERROR",
            message: result.userErrors[0].message,
          });
        }

        return result;
      } catch {
        const networkError = createNetworkError();
        setError({
          code: networkError.code ?? "SIGN_OUT_ERROR",
          message: networkError.message,
        });
        return {
          success: false,
          userErrors: [networkError],
        };
      }
    },
    [doSignOut, client]
  );

  // Refresh session
  const refreshSession = useCallback(async () => {
    setError(null);
    await refetch();
  }, [refetch]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated,
      isLoading,
      error,
      signIn,
      signUp,
      signOut,
      refreshSession,
      clearError,
    }),
    [
      user,
      isAuthenticated,
      isLoading,
      error,
      signIn,
      signUp,
      signOut,
      refreshSession,
      clearError,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
