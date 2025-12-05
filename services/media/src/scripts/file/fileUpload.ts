import type { TransactionScript } from "../../kernel/types.js";
import { getContext } from "../../context/index.js";
import { buildPublicUrl } from "../../infrastructure/s3/index.js";

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
  readonly storageClass?: string;
  readonly idempotencyKey?: string;
}

export interface FileUploadResult {
  file?: {
    id: string;
  };
  userErrors: Array<{ message: string; field?: string[]; code?: string }>;
}

/**
 * Creates a file record for an already-uploaded S3 object.
 * This is called after the file has been uploaded to S3 (e.g., via presigned URL).
 *
 * Logic:
 * 1. Check idempotency key (if exists - return existing file)
 * 2. Generate public URL for the file
 * 3. Create record in `files` table
 * 4. Create record in `s3Objects` table
 * 5. Return the created File
 */
export const fileUpload: TransactionScript<
  FileUploadParams,
  FileUploadResult
> = async (params, services) => {
  const { logger, repository } = services;
  const ctx = getContext();
  const projectId = ctx.project.id;

  try {
    logger.info({ params, projectId }, "fileUpload: starting");

    // 1. Check idempotency key
    if (params.idempotencyKey) {
      const existingFile = await repository.file.findByIdempotencyKey(
        projectId,
        params.idempotencyKey
      );

      if (existingFile) {
        logger.info(
          { fileId: existingFile.id, idempotencyKey: params.idempotencyKey },
          "fileUpload: returning existing file by idempotency key"
        );
        return {
          file: { id: existingFile.id },
          userErrors: [],
        };
      }
    }

    // 2. Generate public URL for the file
    const url = buildPublicUrl(params.objectKey);

    // 3. Create record in `files` table
    const file = await repository.file.create(projectId, {
      provider: "S3",
      url,
      mimeType: params.mimeType ?? null,
      ext: params.ext ?? null,
      sizeBytes: params.sizeBytes,
      originalName: params.originalName ?? null,
      width: params.width ?? null,
      height: params.height ?? null,
      durationMs: params.durationMs ?? null,
      altText: params.altText ?? null,
      idempotencyKey: params.idempotencyKey ?? null,
      isProcessed: false,
    });

    // 4. Create record in `s3Objects` table
    await repository.s3Object.create(projectId, {
      fileId: file.id,
      bucketId: params.bucketId,
      objectKey: params.objectKey,
      contentHash: params.contentHash ?? null,
      etag: params.etag ?? null,
      storageClass: params.storageClass ?? "STANDARD",
    });

    logger.info({ fileId: file.id }, "fileUpload: completed successfully");

    return {
      file: { id: file.id },
      userErrors: [],
    };
  } catch (error) {
    logger.error({ error, params }, "fileUpload failed");
    return {
      file: undefined,
      userErrors: [{ message: "Failed to create file record", code: "INTERNAL_ERROR" }],
    };
  }
};
