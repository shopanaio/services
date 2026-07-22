"use client";

import { useMutation } from "@apollo/client/react";
import type {
  ApiGenericUserError,
  ApiStore,
  ApiStoreUpdateInput,
  ApiStoreUpdateOperationResult,
} from "@/graphql/types";
import { useCallback } from "react";
import { UPDATE_GENERAL_SETTINGS_MUTATION } from "../graphql";

export const useUpdateGeneralSettings = () => {
  const [mutate, { loading, error, reset }] = useMutation<
    {
      storeMutation: {
        storeUpdate: {
          store: ApiStore | null;
          operationResults: ApiStoreUpdateOperationResult[];
          userErrors: ApiGenericUserError[];
        };
      };
    },
    {
      storeId: string;
      clientMutationId: string;
      expectedRevision: number;
      operations: ApiStoreUpdateInput;
    }
  >(UPDATE_GENERAL_SETTINGS_MUTATION);

  const updateStore = useCallback(
    async (input: {
      storeId: string;
      expectedRevision: number;
      operations: ApiStoreUpdateInput;
    }) => {
      const result = await mutate({
        variables: {
          ...input,
          clientMutationId: crypto.randomUUID(),
        },
      });
      const payload = result.data?.storeMutation.storeUpdate;

      return {
        data: payload?.store ?? null,
        operationResults: payload?.operationResults ?? [],
        userErrors: payload?.userErrors ?? [],
      };
    },
    [mutate],
  );

  return { updateStore, loading, error: error ?? null, reset };
};
