"use client";

import { useMutation } from "@apollo/client/react";
import { useCallback } from "react";
import { TOKEN_REFRESH_MUTATION } from "../graphql";
import type {
  ApiUserTokenRefreshInput,
  ApiUserTokenRefreshPayload,
  ApiAuthTokenPayload,
  ApiGenericUserError,
} from "@/graphql/types";

interface TokenRefreshResult {
  token: ApiAuthTokenPayload | null;
  userErrors: ApiGenericUserError[];
}

interface UseTokenRefreshReturn {
  refreshToken: (refreshToken: string) => Promise<TokenRefreshResult>;
  loading: boolean;
  error: Error | null;
}

/**
 * Hook for refreshing access tokens.
 * Takes a refresh token and returns new authentication tokens.
 */
export function useTokenRefresh(): UseTokenRefreshReturn {
  const [mutate, { loading, error }] = useMutation<
    { authMutation: { tokenRefresh: ApiUserTokenRefreshPayload } },
    { input: ApiUserTokenRefreshInput }
  >(TOKEN_REFRESH_MUTATION);

  const refreshToken = useCallback(
    async (token: string): Promise<TokenRefreshResult> => {
      const result = await mutate({
        variables: { input: { refreshToken: token } },
      });
      const payload = result.data?.authMutation.tokenRefresh;

      return {
        token: payload?.token ?? null,
        userErrors: payload?.userErrors ?? [],
      };
    },
    [mutate]
  );

  return {
    refreshToken,
    loading,
    error: error ?? null,
  };
}
