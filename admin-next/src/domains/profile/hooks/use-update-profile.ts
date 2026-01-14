"use client";

import { useMutation } from "@apollo/client/react";
import { useCallback } from "react";
import { UPDATE_PROFILE_MUTATION, CURRENT_USER_QUERY } from "../graphql";
import type {
  ApiUserUpdateProfileInput,
  ApiUserUpdateProfilePayload,
  ApiUser,
  ApiGenericUserError,
} from "@/graphql/types";

interface UpdateProfileResult {
  user: ApiUser | null;
  userErrors: ApiGenericUserError[];
}

interface UseUpdateProfileReturn {
  updateProfile: (input: ApiUserUpdateProfileInput) => Promise<UpdateProfileResult>;
  loading: boolean;
  error: Error | null;
}

/**
 * Hook for updating the current user's profile.
 * Can update firstName, lastName, and locale.
 * Automatically refetches current user after update.
 */
export function useUpdateProfile(): UseUpdateProfileReturn {
  const [mutate, { loading, error }] = useMutation<
    { userMutation: { userUpdateProfile: ApiUserUpdateProfilePayload } },
    { input: ApiUserUpdateProfileInput }
  >(UPDATE_PROFILE_MUTATION, {
    refetchQueries: [{ query: CURRENT_USER_QUERY }],
  });

  const updateProfile = useCallback(
    async (input: ApiUserUpdateProfileInput): Promise<UpdateProfileResult> => {
      const result = await mutate({ variables: { input } });
      const payload = result.data?.userMutation.userUpdateProfile;

      return {
        user: payload?.user ?? null,
        userErrors: payload?.userErrors ?? [],
      };
    },
    [mutate]
  );

  return {
    updateProfile,
    loading,
    error: error ?? null,
  };
}
