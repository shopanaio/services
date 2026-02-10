"use client";

import { useMutation } from "@apollo/client/react";
import { useCallback } from "react";
import { TOKEN_REFRESH_MUTATION } from "../graphql";
import { createNetworkError } from "../utils";
import type { TokenRefreshResult } from "../context/types";
import type {
  ApiUserTokenRefreshInput,
  ApiUserTokenRefreshPayload,
} from "@/graphql/types";

export interface UseTokenRefreshReturn {
  /** Execute token refresh mutation */
  refreshToken: (refreshToken: string) => Promise<TokenRefreshResult>;
  /** Whether mutation is in progress */
  loading: boolean;
  /** Network/Apollo error if any */
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
      try {
        const { data } = await mutate({
          variables: {
            input: { refreshToken: token },
          },
        });

        const payload = data?.authMutation?.tokenRefresh;

        return {
          success: !!payload?.token && payload.userErrors.length === 0,
          token: payload?.token ?? null,
          userErrors: payload?.userErrors ?? [],
        };
      } catch {
        return {
          success: false,
          token: null,
          userErrors: [createNetworkError()],
        };
      }
    },
    [mutate]
  );

  return { refreshToken, loading, error: error ?? null };
}
