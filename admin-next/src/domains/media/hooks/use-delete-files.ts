"use client";

import { useMutation } from "@apollo/client/react";
import { useCallback } from "react";
import { FILE_DELETE_MANY_MUTATION, FILES_QUERY } from "../graphql";
import type {
  ApiFileDeleteManyInput,
  ApiFileDeleteManyPayload,
  ApiGenericUserError,
} from "@/graphql/types";

interface DeleteFilesResult {
  acceptedIds: string[];
  startedHardDeleteIds: string[];
  userErrors: ApiGenericUserError[];
}

interface UseDeleteFilesReturn {
  deleteFiles: (ids: string[], permanent?: boolean) => Promise<DeleteFilesResult>;
  loading: boolean;
  error: Error | null;
}

interface FileDeleteManyResponse {
  mediaMutation: {
    fileDeleteMany: ApiFileDeleteManyPayload;
  };
}

/**
 * Hook for deleting multiple files.
 * By default performs soft delete. Pass hardDelete=true for permanent deletion.
 */
export function useDeleteFiles(): UseDeleteFilesReturn {
  const [mutate, { loading, error }] = useMutation<
    FileDeleteManyResponse,
    { input: ApiFileDeleteManyInput }
  >(FILE_DELETE_MANY_MUTATION);

  const deleteFiles = useCallback(
    async (ids: string[], permanent = false): Promise<DeleteFilesResult> => {
      const result = await mutate({
        variables: {
          input: { ids, permanent },
        },
        refetchQueries: [FILES_QUERY],
      });

      const payload = result.data?.mediaMutation.fileDeleteMany;

      return {
        acceptedIds: payload?.acceptedIds ?? [],
        startedHardDeleteIds: payload?.startedHardDeleteIds ?? [],
        userErrors: payload?.userErrors ?? [],
      };
    },
    [mutate]
  );

  return {
    deleteFiles,
    loading,
    error: error ?? null,
  };
}
