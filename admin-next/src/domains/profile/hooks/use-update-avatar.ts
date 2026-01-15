"use client";

import { useMutation } from "@apollo/client/react";
import { useCallback } from "react";
import { UPDATE_AVATAR_MUTATION } from "../graphql";
import { CURRENT_USER_QUERY } from "@/domains/auth/graphql";
import type {
  ApiUserUpdateAvatarInput,
  ApiUserUpdateAvatarPayload,
  ApiUser,
  ApiGenericUserError,
} from "@/graphql/types";

interface UpdateAvatarResult {
  user: ApiUser | null;
  userErrors: ApiGenericUserError[];
}

interface UseUpdateAvatarReturn {
  updateAvatar: (input: ApiUserUpdateAvatarInput) => Promise<UpdateAvatarResult>;
  loading: boolean;
  error: Error | null;
}

/**
 * Hook for updating the current user's avatar.
 * Pass avatarId to set avatar, or null to remove it.
 * Automatically refetches current user after update.
 */
export function useUpdateAvatar(): UseUpdateAvatarReturn {
  const [mutate, { loading, error }] = useMutation<
    { userMutation: { userUpdateAvatar: ApiUserUpdateAvatarPayload } },
    { input: ApiUserUpdateAvatarInput }
  >(UPDATE_AVATAR_MUTATION, {
    refetchQueries: [{ query: CURRENT_USER_QUERY }],
    awaitRefetchQueries: true,
  });

  const updateAvatar = useCallback(
    async (input: ApiUserUpdateAvatarInput): Promise<UpdateAvatarResult> => {
      const result = await mutate({ variables: { input } });
      const payload = result.data?.userMutation.userUpdateAvatar;

      return {
        user: payload?.user ?? null,
        userErrors: payload?.userErrors ?? [],
      };
    },
    [mutate]
  );

  return {
    updateAvatar,
    loading,
    error: error ?? null,
  };
}
