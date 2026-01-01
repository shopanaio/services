import { BaseScript } from "../../kernel/BaseScript.js";
import { getS3Client, getBucketName } from "../../infrastructure/s3/index.js";
import type {
  FileDeleteParams,
  FileDeleteResult,
} from "./dto/FileDeleteDto.js";

export class FileDeleteScript extends BaseScript<
  FileDeleteParams,
  FileDeleteResult
> {
  protected async execute(params: FileDeleteParams): Promise<FileDeleteResult> {
    const projectId = this.storeId;

    this.logger.info({ params, projectId }, "FileDeleteScript: starting");

    // 1. Find file by ID (include deleted for permanent delete check)
    const existingFile = await this.repository.file.findById(projectId, params.id);

    // 2. Check that file exists
    if (!existingFile) {
      // Check if it was already deleted (for permanent delete)
      if (params.permanent) {
        const deletedFile = await this.repository.file.findDeletedById(projectId, params.id);
        if (deletedFile) {
          // File exists but is soft-deleted, proceed with permanent delete
          return await this.performPermanentDelete(
            projectId,
            params.id,
            deletedFile.provider
          );
        }
      }

      this.logger.warn({ fileId: params.id }, "FileDeleteScript: file not found");
      return {
        deletedFileId: null,
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
      return await this.performPermanentDelete(
        projectId,
        params.id,
        existingFile.provider
      );
    }

    // 4. Soft delete - set deletedAt
    await this.repository.file.softDelete(projectId, params.id);

    this.logger.info({ fileId: params.id }, "FileDeleteScript: soft delete completed");

    return {
      deletedFileId: params.id,
      userErrors: [],
    };
  }

  private async performPermanentDelete(
    projectId: string,
    fileId: string,
    provider: string
  ): Promise<FileDeleteResult> {
    // Delete related records based on provider
    if (provider === "S3") {
      // Get S3 object info before deleting
      const s3Object = await this.repository.s3Object.findByFileId(projectId, fileId);

      if (s3Object) {
        // Delete from S3 storage
        try {
          const s3Client = getS3Client();
          await s3Client.removeObject(getBucketName(), s3Object.objectKey);
          this.logger.info(
            { fileId, objectKey: s3Object.objectKey },
            "FileDeleteScript: deleted object from S3"
          );
        } catch (s3Error) {
          // Log but don't fail - file might already be deleted from S3
          this.logger.warn(
            { fileId, objectKey: s3Object.objectKey, error: s3Error },
            "FileDeleteScript: failed to delete from S3, continuing with DB cleanup"
          );
        }

        // Delete s3Objects record
        await this.repository.s3Object.delete(projectId, fileId);
        this.logger.info({ fileId }, "FileDeleteScript: deleted S3 object record");
      }
    } else if (["YOUTUBE", "VIMEO", "URL"].includes(provider)) {
      // Delete externalMedia record
      await this.repository.externalMedia.delete(projectId, fileId);
      this.logger.info({ fileId }, "FileDeleteScript: deleted external media record");
    }

    // Delete the file record
    await this.repository.file.hardDelete(projectId, fileId);

    this.logger.info({ fileId }, "FileDeleteScript: permanent delete completed");

    return {
      deletedFileId: fileId,
      userErrors: [],
    };
  }

  protected handleError(_error: unknown): FileDeleteResult {
    return {
      deletedFileId: null,
      userErrors: [{ message: "Failed to delete file", code: "INTERNAL_ERROR" }],
    };
  }
}
