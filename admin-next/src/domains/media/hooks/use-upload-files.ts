"use client";

import { useCallback, useState } from "react";
import { useMutation } from "@apollo/client/react";
import {
  FILE_UPLOAD_MUTATION,
  FILE_UPLOAD_FROM_URL_MUTATION,
  FILE_CREATE_EXTERNAL_MUTATION,
} from "../graphql";
import {
  FileProvider,
  type ApiFile,
  type ApiGenericUserError,
  type ApiFileUploadMultipartInput,
  type ApiFileUploadFromUrlInput,
  type ApiFileCreateExternalInput,
} from "@/graphql/types";

// ============================================
// Types
// ============================================

export interface UploadFileResult {
  file: ApiFile | null;
  userErrors: ApiGenericUserError[];
}

export interface UploadFilesResult {
  files: ApiFile[];
  userErrors: ApiGenericUserError[];
}

export interface CreateExternalInput {
  provider: FileProvider.Youtube | FileProvider.Vimeo;
  externalId: string;
  url: string;
  thumbnailUrl?: string;
  originalName?: string;
}

interface UseUploadFilesReturn {
  uploadFile: (file: File, altText?: string) => Promise<UploadFileResult>;
  uploadFiles: (files: File[]) => Promise<UploadFilesResult>;
  uploadFromUrl: (
    sourceUrl: string,
    altText?: string
  ) => Promise<UploadFileResult>;
  createExternal: (input: CreateExternalInput) => Promise<UploadFileResult>;
  loading: boolean;
  progress: number;
  error: Error | null;
}

interface FileUploadResponse {
  mediaMutation: {
    fileUpload: {
      file: ApiFile | null;
      userErrors: ApiGenericUserError[];
    };
  };
}

interface FileUploadFromUrlResponse {
  mediaMutation: {
    fileUploadFromUrl: {
      file: ApiFile | null;
      userErrors: ApiGenericUserError[];
    };
  };
}

interface FileCreateExternalResponse {
  mediaMutation: {
    fileCreateExternal: {
      file: ApiFile | null;
      userErrors: ApiGenericUserError[];
    };
  };
}

// ============================================
// Hook
// ============================================

export function useUploadFiles(): UseUploadFilesReturn {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  const [uploadFileMutation] = useMutation<
    FileUploadResponse,
    { input: ApiFileUploadMultipartInput }
  >(FILE_UPLOAD_MUTATION);

  const [uploadFromUrlMutation] = useMutation<
    FileUploadFromUrlResponse,
    { input: ApiFileUploadFromUrlInput }
  >(FILE_UPLOAD_FROM_URL_MUTATION);

  const [createExternalMutation] = useMutation<
    FileCreateExternalResponse,
    { input: ApiFileCreateExternalInput }
  >(FILE_CREATE_EXTERNAL_MUTATION);

  const uploadFile = useCallback(
    async (file: File, altText?: string): Promise<UploadFileResult> => {
      setLoading(true);
      setError(null);
      setProgress(0);

      try {
        const result = await uploadFileMutation({
          variables: {
            input: {
              file,
              altText,
            },
          },
        });

        const payload = result.data?.mediaMutation.fileUpload;
        setProgress(100);

        return {
          file: payload?.file ?? null,
          userErrors: payload?.userErrors ?? [],
        };
      } catch (err) {
        const errorObj =
          err instanceof Error ? err : new Error("Upload failed");
        setError(errorObj);
        return {
          file: null,
          userErrors: [{ message: errorObj.message, code: "UPLOAD_FAILED" }],
        };
      } finally {
        setLoading(false);
      }
    },
    [uploadFileMutation]
  );

  const uploadFiles = useCallback(
    async (files: File[]): Promise<UploadFilesResult> => {
      if (files.length === 0) {
        return { files: [], userErrors: [] };
      }

      setLoading(true);
      setError(null);
      setProgress(0);

      const uploadedFiles: ApiFile[] = [];
      const allErrors: ApiGenericUserError[] = [];

      try {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const result = await uploadFileMutation({
            variables: {
              input: { file },
            },
          });

          const payload = result.data?.mediaMutation.fileUpload;

          if (payload?.file) {
            uploadedFiles.push(payload.file);
          }

          if (payload?.userErrors && payload.userErrors.length > 0) {
            allErrors.push(...payload.userErrors);
          }

          setProgress(Math.round(((i + 1) / files.length) * 100));
        }

        return {
          files: uploadedFiles,
          userErrors: allErrors,
        };
      } catch (err) {
        const errorObj =
          err instanceof Error ? err : new Error("Upload failed");
        setError(errorObj);
        return {
          files: uploadedFiles,
          userErrors: [
            ...allErrors,
            { message: errorObj.message, code: "UPLOAD_FAILED" },
          ],
        };
      } finally {
        setLoading(false);
      }
    },
    [uploadFileMutation]
  );

  const uploadFromUrl = useCallback(
    async (sourceUrl: string, altText?: string): Promise<UploadFileResult> => {
      setLoading(true);
      setError(null);
      setProgress(0);

      try {
        const result = await uploadFromUrlMutation({
          variables: {
            input: { sourceUrl, altText },
          },
        });

        const payload = result.data?.mediaMutation.fileUploadFromUrl;
        setProgress(100);

        return {
          file: payload?.file ?? null,
          userErrors: payload?.userErrors ?? [],
        };
      } catch (err) {
        const errorObj =
          err instanceof Error ? err : new Error("Upload from URL failed");
        setError(errorObj);
        return {
          file: null,
          userErrors: [
            { message: errorObj.message, code: "UPLOAD_FROM_URL_FAILED" },
          ],
        };
      } finally {
        setLoading(false);
      }
    },
    [uploadFromUrlMutation]
  );

  const createExternal = useCallback(
    async (input: CreateExternalInput): Promise<UploadFileResult> => {
      setLoading(true);
      setError(null);
      setProgress(0);

      try {
        const result = await createExternalMutation({
          variables: {
            input: {
              provider: input.provider,
              externalId: input.externalId,
              url: input.url,
              thumbnailUrl: input.thumbnailUrl,
              originalName: input.originalName,
            },
          },
        });

        const payload = result.data?.mediaMutation.fileCreateExternal;
        setProgress(100);

        return {
          file: payload?.file ?? null,
          userErrors: payload?.userErrors ?? [],
        };
      } catch (err) {
        const errorObj =
          err instanceof Error
            ? err
            : new Error("Failed to create external media");
        setError(errorObj);
        return {
          file: null,
          userErrors: [
            { message: errorObj.message, code: "CREATE_EXTERNAL_FAILED" },
          ],
        };
      } finally {
        setLoading(false);
      }
    },
    [createExternalMutation]
  );

  return {
    uploadFile,
    uploadFiles,
    uploadFromUrl,
    createExternal,
    loading,
    progress,
    error,
  };
}
