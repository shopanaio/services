"use client";

import { useMutation } from "@apollo/client/react";
import type { ApiGenericUserError, ApiLocale, LocaleCode } from "@/graphql/types";
import {
  CREATE_STORE_LANGUAGE_MUTATION,
  DELETE_STORE_LANGUAGE_MUTATION,
  SET_DEFAULT_STORE_LANGUAGE_MUTATION,
} from "../graphql";

export const useLanguageSettingsMutations = () => {
  const [createMutation, createState] = useMutation<
    {
      storeMutation: {
        localeCreate: { locale: ApiLocale | null; userErrors: ApiGenericUserError[] };
      };
    },
    { input: { code: LocaleCode; isActive: boolean } }
  >(CREATE_STORE_LANGUAGE_MUTATION);
  const [deleteMutation, deleteState] = useMutation<
    {
      storeMutation: {
        localeDelete: {
          deletedLocaleCode: LocaleCode | null;
          userErrors: ApiGenericUserError[];
        };
      };
    },
    { input: { code: LocaleCode } }
  >(DELETE_STORE_LANGUAGE_MUTATION);
  const [setDefaultMutation, setDefaultState] = useMutation<
    {
      storeMutation: {
        localeSetDefault: { success: boolean; userErrors: ApiGenericUserError[] };
      };
    },
    { input: { locale: LocaleCode } }
  >(SET_DEFAULT_STORE_LANGUAGE_MUTATION);

  return {
    createLanguage: async (code: LocaleCode) => {
      const result = await createMutation({ variables: { input: { code, isActive: false } } });
      return result.data?.storeMutation.localeCreate ?? { locale: null, userErrors: [] };
    },
    deleteLanguage: async (code: LocaleCode) => {
      const result = await deleteMutation({ variables: { input: { code } } });
      return (
        result.data?.storeMutation.localeDelete ?? {
          deletedLocaleCode: null,
          userErrors: [],
        }
      );
    },
    setDefaultLanguage: async (locale: LocaleCode) => {
      const result = await setDefaultMutation({ variables: { input: { locale } } });
      return (
        result.data?.storeMutation.localeSetDefault ?? {
          success: false,
          userErrors: [],
        }
      );
    },
    creating: createState.loading,
    deleting: deleteState.loading,
    settingDefault: setDefaultState.loading,
    error: createState.error ?? deleteState.error ?? setDefaultState.error ?? null,
  };
};
