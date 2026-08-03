"use client";

import { useCallback } from "react";
import { useMutation } from "@apollo/client/react";
import { FILE_CLEAR_ERROR_MUTATION } from "../graphql";
import type {
  ApiFile,
  ApiFileClearErrorInput,
  ApiFileClearErrorPayload,
  ApiGenericUserError,
} from "@/graphql/types";

interface ClearFileErrorsResult {
  files: ApiFile[];
  userErrors: ApiGenericUserError[];
}

interface FileClearErrorResponse {
  mediaMutation: {
    fileClearError: ApiFileClearErrorPayload;
  };
}

export function useClearFileErrors() {
  const [mutate, { loading, error }] = useMutation<
    FileClearErrorResponse,
    { input: ApiFileClearErrorInput }
  >(FILE_CLEAR_ERROR_MUTATION);

  const clearFileErrors = useCallback(
    async (ids: string[]): Promise<ClearFileErrorsResult> => {
      const results = await Promise.all(
        ids.map((id) => mutate({ variables: { input: { id } } })),
      );
      const payloads = results
        .map((result) => result.data?.mediaMutation.fileClearError)
        .filter((payload): payload is ApiFileClearErrorPayload => Boolean(payload));

      return {
        files: payloads.flatMap((payload) => payload.file ? [payload.file] : []),
        userErrors: payloads.flatMap((payload) => payload.userErrors),
      };
    },
    [mutate],
  );

  return { clearFileErrors, loading, error: error ?? null };
}
