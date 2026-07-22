"use client";

import type {
  ApiLocale,
  ApiLocaleCreateInput,
  ApiLocaleDeleteInput,
  ApiLocaleSetDefaultInput,
  ApiStoreDeleteInput,
  ApiStoreUpdateInput,
  LocaleCode,
} from "@/graphql/types";
import { useCallback, useState } from "react";
import {
  addMockLocale,
  deleteMockLocale,
  deleteMockStore,
  setMockDefaultLocale,
  updateMockStore,
} from "../mock/general-settings-store";
import type {
  GeneralSettingsMutationResult,
  GeneralSettingsStore,
} from "../types";

interface GeneralSettingsStoreUpdateRequest {
  expectedRevision: number;
  operations: ApiStoreUpdateInput;
}

const useMockMutation = <TInput, TData>(
  mutation: (input: TInput) => Promise<TData>,
) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(
    async (input: TInput): Promise<GeneralSettingsMutationResult<TData>> => {
      setLoading(true);
      setError(null);

      try {
        return { data: await mutation(input), userErrors: [] };
      } catch (caughtError) {
        const nextError =
          caughtError instanceof Error
            ? caughtError
            : new Error("Unexpected settings error");
        setError(nextError);
        return { data: null, userErrors: [] };
      } finally {
        setLoading(false);
      }
    },
    [mutation],
  );

  const reset = useCallback(() => setError(null), []);

  return { mutate, loading, error, reset };
};

export const useUpdateGeneralSettings = () => {
  const mutation = useMockMutation<
    GeneralSettingsStoreUpdateRequest,
    GeneralSettingsStore
  >(updateMockStore);
  return { ...mutation, updateStore: mutation.mutate };
};

export const useAddLocale = () => {
  const mutation = useMockMutation<ApiLocaleCreateInput, ApiLocale>(
    addMockLocale,
  );
  return { ...mutation, addLocale: mutation.mutate };
};

export const useDeleteLocale = () => {
  const mutation = useMockMutation<ApiLocaleDeleteInput, LocaleCode>(
    deleteMockLocale,
  );
  return { ...mutation, deleteLocale: mutation.mutate };
};

export const useSetDefaultLocale = () => {
  const mutation = useMockMutation<ApiLocaleSetDefaultInput, boolean>(
    setMockDefaultLocale,
  );
  return { ...mutation, setDefaultLocale: mutation.mutate };
};

export const useDeleteStore = () => {
  const mutation = useMockMutation<ApiStoreDeleteInput, string>(deleteMockStore);
  return { ...mutation, deleteStore: mutation.mutate };
};
