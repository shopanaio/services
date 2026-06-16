"use client";

import { useCallback, useState } from "react";
import { useMutation } from "@apollo/client/react";
import { AVATAR_UPLOAD_MUTATION } from "../graphql";
import type {
  ApiFile,
  ApiGenericUserError,
  ApiAvatarUploadInput,
} from "@/graphql/types";

// ============================================
// Types
// ============================================

export interface AvatarUploadResult {
  file: ApiFile | null;
  userErrors: ApiGenericUserError[];
}

interface UseAvatarUploadReturn {
  uploadAvatar: (file: File, ownerId: string) => Promise<AvatarUploadResult>;
  loading: boolean;
  error: Error | null;
}

interface AvatarUploadResponse {
  mediaMutation: {
    avatarUpload: {
      file: ApiFile | null;
      userErrors: ApiGenericUserError[];
    };
  };
}

// ============================================
// Hook
// ============================================

/**
 * Hook for uploading avatar or logo for a user or organization.
 * Combines file upload and entity assignment in a single operation.
 */
export function useAvatarUpload(): UseAvatarUploadReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const [uploadMutation] = useMutation<
    AvatarUploadResponse,
    { input: ApiAvatarUploadInput }
  >(AVATAR_UPLOAD_MUTATION);

  const uploadAvatar = useCallback(
    async (file: File, ownerId: string): Promise<AvatarUploadResult> => {
      setLoading(true);
      setError(null);

      try {
        const result = await uploadMutation({
          variables: {
            input: {
              file,
              ownerId,
            },
          },
        });

        const payload = result.data?.mediaMutation.avatarUpload;

        return {
          file: payload?.file ?? null,
          userErrors: payload?.userErrors ?? [],
        };
      } catch (err) {
        const errorObj =
          err instanceof Error ? err : new Error("Avatar upload failed");
        setError(errorObj);
        return {
          file: null,
          userErrors: [{ message: errorObj.message, code: "UPLOAD_FAILED" }],
        };
      } finally {
        setLoading(false);
      }
    },
    [uploadMutation]
  );

  return {
    uploadAvatar,
    loading,
    error,
  };
}
