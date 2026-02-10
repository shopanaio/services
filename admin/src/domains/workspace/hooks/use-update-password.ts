"use client";

import { useMutation } from "@apollo/client/react";
import { useCallback } from "react";
import { UPDATE_PASSWORD_MUTATION } from "../graphql";
import type {
  ApiUserUpdatePasswordInput,
  ApiUserUpdatePasswordPayload,
  ApiGenericUserError,
} from "@/graphql/types";

interface UpdatePasswordResult {
  success: boolean;
  userErrors: ApiGenericUserError[];
}

interface UseUpdatePasswordReturn {
  updatePassword: (currentPassword: string, newPassword: string) => Promise<UpdatePasswordResult>;
  loading: boolean;
  error: Error | null;
}

/**
 * Hook for updating the current user's password.
 * Requires current password for verification.
 */
export function useUpdatePassword(): UseUpdatePasswordReturn {
  const [mutate, { loading, error }] = useMutation<
    { userMutation: { userUpdatePassword: ApiUserUpdatePasswordPayload } },
    { input: ApiUserUpdatePasswordInput }
  >(UPDATE_PASSWORD_MUTATION);

  const updatePassword = useCallback(
    async (currentPassword: string, newPassword: string): Promise<UpdatePasswordResult> => {
      const result = await mutate({
        variables: { input: { currentPassword, newPassword } },
      });
      const payload = result.data?.userMutation.userUpdatePassword;

      return {
        success: payload?.success ?? false,
        userErrors: payload?.userErrors ?? [],
      };
    },
    [mutate]
  );

  return {
    updatePassword,
    loading,
    error: error ?? null,
  };
}
