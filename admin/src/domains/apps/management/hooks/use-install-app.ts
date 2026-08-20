"use client";

import { useCallback } from "react";
import { useMutation } from "@apollo/client/react";
import type { ApiAppInstallInput, ApiGenericUserError } from "@/graphql/types";
import { APP_INSTALL_MUTATION, APPS_MANAGEMENT_QUERY } from "../graphql";
import type {
  AppInstallMutationData,
  AppInstallMutationVariables,
} from "../graphql/operation-types";

export const useInstallApp = () => {
  const [mutate, { loading, error, reset }] = useMutation<
    AppInstallMutationData,
    AppInstallMutationVariables
  >(APP_INSTALL_MUTATION);

  const installApp = useCallback(
    async (input: ApiAppInstallInput) => {
      try {
        const result = await mutate({
          variables: { input },
          refetchQueries: [APPS_MANAGEMENT_QUERY],
          awaitRefetchQueries: true,
        });
        const payload = result.data?.appsMutation.appInstall;

        return {
          installation: payload?.installation ?? null,
          operation: payload?.operation ?? null,
          duplicate: payload?.duplicate ?? false,
          userErrors: payload?.userErrors ?? [],
        };
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : "Unable to install app";

        return {
          installation: null,
          operation: null,
          duplicate: false,
          userErrors: [{ code: "UNEXPECTED_ERROR", message }] as ApiGenericUserError[],
        };
      }
    },
    [mutate],
  );

  return {
    installApp,
    loading,
    error: error ?? null,
    reset,
  };
};
