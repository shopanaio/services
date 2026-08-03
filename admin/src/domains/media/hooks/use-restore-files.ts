"use client";

import { useCallback } from "react";
import { useMutation } from "@apollo/client/react";
import { FILE_RESTORE_MANY_MUTATION, FILES_QUERY } from "../graphql";
import type {
  ApiFileRestoreManyInput,
  ApiFileRestoreManyPayload,
  ApiGenericUserError,
} from "@/graphql/types";

interface RestoreFilesResult {
  restoredIds: string[];
  userErrors: ApiGenericUserError[];
}

interface FileRestoreManyResponse {
  mediaMutation: {
    fileRestoreMany: ApiFileRestoreManyPayload;
  };
}

export function useRestoreFiles() {
  const [mutate, { loading, error }] = useMutation<
    FileRestoreManyResponse,
    { input: ApiFileRestoreManyInput }
  >(FILE_RESTORE_MANY_MUTATION);

  const restoreFiles = useCallback(
    async (ids: string[]): Promise<RestoreFilesResult> => {
      const result = await mutate({
        variables: { input: { ids } },
        refetchQueries: [FILES_QUERY],
      });
      const payload = result.data?.mediaMutation.fileRestoreMany;

      return {
        restoredIds: payload?.restoredIds ?? [],
        userErrors: payload?.userErrors ?? [],
      };
    },
    [mutate],
  );

  return { restoreFiles, loading, error: error ?? null };
}
