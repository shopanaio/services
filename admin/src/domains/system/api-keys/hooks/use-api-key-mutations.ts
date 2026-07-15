"use client";

import type {
  ApiApiKey,
  ApiApiKeyCreateInput,
  ApiApiKeyDeleteInput,
  ApiApiKeyRevokeInput,
  ApiGenericUserError,
} from "@/graphql/types";
import { useCallback, useState } from "react";
import {
  createMockApiKey,
  deleteMockApiKey,
  revokeMockApiKey,
} from "../mock/api-keys-store";

interface MutationResult<TData> {
  data: TData | null;
  userErrors: ApiGenericUserError[];
}

const useMockApiKeyMutation = <TInput, TData>(
  mutation: (input: TInput) => Promise<TData>,
) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const mutate = useCallback(
    async (input: TInput): Promise<MutationResult<TData>> => {
      setLoading(true);
      setError(null);
      try {
        return { data: await mutation(input), userErrors: [] };
      } catch (caughtError) {
        const nextError =
          caughtError instanceof Error
            ? caughtError
            : new Error("Unexpected API key error");
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

export const useCreateApiKey = () => {
  const mutation = useMockApiKeyMutation<ApiApiKeyCreateInput, ApiApiKey>(
    createMockApiKey,
  );
  return { ...mutation, createApiKey: mutation.mutate };
};

export const useRevokeApiKey = () => {
  const mutation = useMockApiKeyMutation<ApiApiKeyRevokeInput, boolean>(
    revokeMockApiKey,
  );
  return { ...mutation, revokeApiKey: mutation.mutate };
};

export const useDeleteApiKey = () => {
  const mutation = useMockApiKeyMutation<ApiApiKeyDeleteInput, string>(
    deleteMockApiKey,
  );
  return { ...mutation, deleteApiKey: mutation.mutate };
};
