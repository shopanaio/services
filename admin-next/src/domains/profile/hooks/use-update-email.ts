"use client";

import { useMutation } from "@apollo/client/react";
import { useCallback } from "react";
import { UPDATE_EMAIL_MUTATION, CURRENT_USER_QUERY } from "../graphql";
import type {
  ApiUserUpdateEmailInput,
  ApiUserUpdateEmailPayload,
  ApiUser,
  ApiGenericUserError,
} from "@/graphql/types";

interface UpdateEmailResult {
  user: ApiUser | null;
  userErrors: ApiGenericUserError[];
}

interface UseUpdateEmailReturn {
  updateEmail: (newEmail: string) => Promise<UpdateEmailResult>;
  loading: boolean;
  error: Error | null;
}

/**
 * Hook for updating the current user's email address.
 * Automatically refetches current user after update.
 */
export function useUpdateEmail(): UseUpdateEmailReturn {
  const [mutate, { loading, error }] = useMutation<
    { userMutation: { userUpdateEmail: ApiUserUpdateEmailPayload } },
    { input: ApiUserUpdateEmailInput }
  >(UPDATE_EMAIL_MUTATION, {
    refetchQueries: [{ query: CURRENT_USER_QUERY }],
  });

  const updateEmail = useCallback(
    async (newEmail: string): Promise<UpdateEmailResult> => {
      const result = await mutate({
        variables: { input: { newEmail: newEmail as any } },
      });
      const payload = result.data?.userMutation.userUpdateEmail;

      return {
        user: payload?.user ?? null,
        userErrors: payload?.userErrors ?? [],
      };
    },
    [mutate]
  );

  return {
    updateEmail,
    loading,
    error: error ?? null,
  };
}
