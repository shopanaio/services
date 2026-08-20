"use client";

import { useCallback } from "react";
import { useMutation } from "@apollo/client/react";
import type { ApiGenericUserError } from "@/graphql/types";
import {
  APP_RESUME_MUTATION,
  APP_SUSPEND_MUTATION,
  APP_UNINSTALL_MUTATION,
  APPS_MANAGEMENT_QUERY,
} from "../graphql";
import type {
  AppLifecycleActionMutationData,
  AppLifecycleActionMutationVariables,
  AppLifecycleMutationPayload,
} from "../graphql/operation-types";

type AppLifecycleAction = "resume" | "suspend" | "uninstall";

const unexpectedPayload = (cause: unknown): AppLifecycleMutationPayload => ({
  installation: null,
  operation: null,
  duplicate: false,
  userErrors: [
    {
      code: "UNEXPECTED_ERROR",
      message: cause instanceof Error ? cause.message : "Unable to update the app",
    },
  ] as ApiGenericUserError[],
});

export const useAppLifecycleActions = () => {
  const [suspendMutation, suspendState] = useMutation<
    AppLifecycleActionMutationData,
    AppLifecycleActionMutationVariables
  >(APP_SUSPEND_MUTATION);
  const [resumeMutation, resumeState] = useMutation<
    AppLifecycleActionMutationData,
    AppLifecycleActionMutationVariables
  >(APP_RESUME_MUTATION);
  const [uninstallMutation, uninstallState] = useMutation<
    AppLifecycleActionMutationData,
    AppLifecycleActionMutationVariables
  >(APP_UNINSTALL_MUTATION);

  const runAction = useCallback(
    async (action: AppLifecycleAction, installationId: string) => {
      const mutation =
        action === "suspend"
          ? suspendMutation
          : action === "resume"
            ? resumeMutation
            : uninstallMutation;

      try {
        const result = await mutation({
          variables: {
            input: {
              installationId,
              clientMutationId: crypto.randomUUID(),
            },
          },
          refetchQueries: [APPS_MANAGEMENT_QUERY],
          awaitRefetchQueries: true,
        });
        const payload =
          action === "suspend"
            ? result.data?.appsMutation.appSuspend
            : action === "resume"
              ? result.data?.appsMutation.appResume
              : result.data?.appsMutation.appUninstall;

        return payload ?? unexpectedPayload("Missing lifecycle response");
      } catch (cause) {
        return unexpectedPayload(cause);
      }
    },
    [resumeMutation, suspendMutation, uninstallMutation],
  );

  return {
    runAction,
    loading: suspendState.loading || resumeState.loading || uninstallState.loading,
    error: suspendState.error ?? resumeState.error ?? uninstallState.error ?? null,
    reset: () => {
      suspendState.reset();
      resumeState.reset();
      uninstallState.reset();
    },
  };
};
