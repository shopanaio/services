import type { TransactionScript } from "../../kernel/types.js";

export interface FileUploadParams {
  readonly objectKey: string;
  readonly bucketId: string;
  readonly mimeType?: string;
  readonly ext?: string;
  readonly sizeBytes: number;
  readonly originalName?: string;
  readonly width?: number;
  readonly height?: number;
  readonly durationMs?: number;
  readonly altText?: string;
  readonly contentHash?: string;
  readonly etag?: string;
  readonly idempotencyKey?: string;
}

export interface FileUploadResult {
  file?: {
    id: string;
  };
  userErrors: Array<{ message: string; field?: string[]; code?: string }>;
}

export const fileUpload: TransactionScript<
  FileUploadParams,
  FileUploadResult
> = async (params, services) => {
  const { logger } = services;

  try {
    logger.info({ params }, "fileUpload: not implemented");

    return {
      file: undefined,
      userErrors: [{ message: "Not implemented", code: "NOT_IMPLEMENTED" }],
    };
  } catch (error) {
    logger.error({ error }, "fileUpload failed");
    return {
      file: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
};
