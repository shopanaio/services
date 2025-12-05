import type { TransactionScript } from "../../kernel/types.js";
import { getContext } from "../../context/index.js";
import { getS3Client, getBucketName } from "../../infrastructure/s3/index.js";

export interface FileDeleteParams {
  readonly id: string;
  readonly permanent?: boolean;
}

export interface FileDeleteResult {
  deletedFileId?: string;
  userErrors: Array<{ message: string; field?: string[]; code?: string }>;
}

/**
 * Deletes a file (soft or hard delete).
 *
 * Logic:
 * 1. Find file by ID
 * 2. Check that file exists
 * 3. If permanent:
 *    - Delete from S3 (if S3 provider)
 *    - Delete from `s3Objects` or `externalMedia`
 *    - Delete from `files`
 * 4. Otherwise:
 *    - Set `deletedAt = now()`
 * 5. Return success
 */
export const fileDelete: TransactionScript<
  FileDeleteParams,
  FileDeleteResult
> = async (params, services) => {
  const { logger, repository } = services;
  const ctx = getContext();
  const projectId = ctx.project.id;

  try {
    logger.info({ params, projectId }, "fileDelete: starting");

    // 1. Find file by ID (include deleted for permanent delete check)
    const existingFile = await repository.file.findById(projectId, params.id);

    // 2. Check that file exists
    if (!existingFile) {
      // Check if it was already deleted (for permanent delete)
      if (params.permanent) {
        const deletedFile = await repository.file.findDeletedById(projectId, params.id);
        if (deletedFile) {
          // File exists but is soft-deleted, proceed with permanent delete
          return await performPermanentDelete(
            projectId,
            params.id,
            deletedFile.provider,
            repository,
            logger
          );
        }
      }

      logger.warn({ fileId: params.id }, "fileDelete: file not found");
      return {
        deletedFileId: undefined,
        userErrors: [
          {
            message: "File not found",
            field: ["id"],
            code: "NOT_FOUND",
          },
        ],
      };
    }

    // 3. Perform delete (permanent or soft)
    if (params.permanent) {
      return await performPermanentDelete(
        projectId,
        params.id,
        existingFile.provider,
        repository,
        logger
      );
    }

    // 4. Soft delete - set deletedAt
    await repository.file.softDelete(projectId, params.id);

    logger.info({ fileId: params.id }, "fileDelete: soft delete completed");

    return {
      deletedFileId: params.id,
      userErrors: [],
    };
  } catch (error) {
    logger.error({ error, params }, "fileDelete failed");
    return {
      deletedFileId: undefined,
      userErrors: [{ message: "Failed to delete file", code: "INTERNAL_ERROR" }],
    };
  }
};

/**
 * Performs permanent (hard) delete of a file and its related data
 */
async function performPermanentDelete(
  projectId: string,
  fileId: string,
  provider: string,
  repository: any,
  logger: any
): Promise<FileDeleteResult> {
  // Delete related records based on provider
  if (provider === "S3") {
    // Get S3 object info before deleting
    const s3Object = await repository.s3Object.findByFileId(projectId, fileId);

    if (s3Object) {
      // Delete from S3 storage
      try {
        const s3Client = getS3Client();
        await s3Client.removeObject(getBucketName(), s3Object.objectKey);
        logger.info(
          { fileId, objectKey: s3Object.objectKey },
          "fileDelete: deleted object from S3"
        );
      } catch (s3Error) {
        // Log but don't fail - file might already be deleted from S3
        logger.warn(
          { fileId, objectKey: s3Object.objectKey, error: s3Error },
          "fileDelete: failed to delete from S3, continuing with DB cleanup"
        );
      }

      // Delete s3Objects record
      await repository.s3Object.delete(projectId, fileId);
      logger.info({ fileId }, "fileDelete: deleted S3 object record");
    }
  } else if (["YOUTUBE", "VIMEO", "URL"].includes(provider)) {
    // Delete externalMedia record
    await repository.externalMedia.delete(projectId, fileId);
    logger.info({ fileId }, "fileDelete: deleted external media record");
  }

  // Delete the file record
  await repository.file.hardDelete(projectId, fileId);

  logger.info({ fileId }, "fileDelete: permanent delete completed");

  return {
    deletedFileId: fileId,
    userErrors: [],
  };
}
