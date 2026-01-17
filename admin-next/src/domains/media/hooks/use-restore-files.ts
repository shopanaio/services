"use client";

import { useMutation } from "@apollo/client/react";
import { useCallback, useState } from "react";
import { FILE_RESTORE_MUTATION, FILES_QUERY } from "../graphql";
import type {
  ApiFileRestoreInput,
  ApiFileRestorePayload,
  ApiFile,
  ApiGenericUserError,
} from "@/graphql/types";

interface RestoreFileResult {
  file: ApiFile | null;
  userErrors: ApiGenericUserError[];
}

interface RestoreFilesResult {
  restoredFiles: ApiFile[];
  userErrors: ApiGenericUserError[];
}

interface UseRestoreFilesReturn {
  restoreFile: (id: string) => Promise<RestoreFileResult>;
  restoreFiles: (ids: string[]) => Promise<RestoreFilesResult>;
  loading: boolean;
  error: Error | null;
}

interface FileRestoreResponse {
  mediaMutation: {
    fileRestore: ApiFileRestorePayload;
  };
}

/**
 * Hook for restoring soft-deleted files.
 * Supports both single file and batch restoration.
 */
export function useRestoreFiles(): UseRestoreFilesReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const [mutate] = useMutation<
    FileRestoreResponse,
    { input: ApiFileRestoreInput }
  >(FILE_RESTORE_MUTATION);

  const restoreFile = useCallback(
    async (id: string): Promise<RestoreFileResult> => {
      const result = await mutate({
        variables: {
          input: { id },
        },
        refetchQueries: [FILES_QUERY],
      });

      const payload = result.data?.mediaMutation.fileRestore;

      return {
        file: payload?.file ?? null,
        userErrors: payload?.userErrors ?? [],
      };
    },
    [mutate]
  );

  const restoreFiles = useCallback(
    async (ids: string[]): Promise<RestoreFilesResult> => {
      if (ids.length === 0) {
        return { restoredFiles: [], userErrors: [] };
      }

      setLoading(true);
      setError(null);

      const restoredFiles: ApiFile[] = [];
      const allErrors: ApiGenericUserError[] = [];

      try {
        for (const id of ids) {
          const result = await mutate({
            variables: { input: { id } },
          });

          const payload = result.data?.mediaMutation.fileRestore;

          if (payload?.file) {
            restoredFiles.push(payload.file);
          }

          if (payload?.userErrors && payload.userErrors.length > 0) {
            allErrors.push(...payload.userErrors);
          }
        }

        return {
          restoredFiles,
          userErrors: allErrors,
        };
      } catch (err) {
        const errorObj =
          err instanceof Error ? err : new Error("Restore failed");
        setError(errorObj);
        return {
          restoredFiles,
          userErrors: [
            ...allErrors,
            { message: errorObj.message, code: "RESTORE_FAILED" },
          ],
        };
      } finally {
        setLoading(false);
      }
    },
    [mutate]
  );

  return {
    restoreFile,
    restoreFiles,
    loading,
    error,
  };
}
