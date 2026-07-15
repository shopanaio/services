"use client";

import type {
  ApiAppsMutationInstallArgs,
  ApiAppsMutationUninstallArgs,
  ApiGenericUserError,
} from "@/graphql/types";
import { useCallback, useState } from "react";
import { installMockApp, uninstallMockApp } from "../mock/apps-store";

interface AppMutationResult {
  data: boolean | null;
  userErrors: ApiGenericUserError[];
}

const useMockAppMutation = <TInput,>(
  mutation: (input: TInput) => Promise<boolean>,
) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const mutate = useCallback(
    async (input: TInput): Promise<AppMutationResult> => {
      setLoading(true);
      setError(null);
      try {
        return { data: await mutation(input), userErrors: [] };
      } catch (caughtError) {
        const nextError =
          caughtError instanceof Error
            ? caughtError
            : new Error("Unexpected app error");
        setError(nextError);
        return { data: null, userErrors: [] };
      } finally {
        setLoading(false);
      }
    },
    [mutation],
  );
  return { mutate, loading, error };
};

export const useInstallApp = () => {
  const mutation = useMockAppMutation<ApiAppsMutationInstallArgs>(installMockApp);
  return { ...mutation, installApp: mutation.mutate };
};

export const useUninstallApp = () => {
  const mutation = useMockAppMutation<ApiAppsMutationUninstallArgs>(
    uninstallMockApp,
  );
  return { ...mutation, uninstallApp: mutation.mutate };
};
