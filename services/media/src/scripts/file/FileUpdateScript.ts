import { BaseScript, ZodSchema, ValidationError, toUserErrors } from "../../kernel/BaseScript.js";
import {
  fileUpdateSchema,
  type FileUpdateParams,
  type FileUpdateResult,
} from "./dto/FileUpdateDto.js";

export class FileUpdateScript extends BaseScript<FileUpdateParams, FileUpdateResult> {
  @ZodSchema(fileUpdateSchema)
  protected async execute(params: FileUpdateParams): Promise<FileUpdateResult> {
    this.logger.info({ params }, "FileUpdateScript: starting");

    // 1. Find file by ID (any state to block DELETING)
    const existingFile = await this.findStoreFile(params.id, true);

    // 2. Check that file exists
    if (!existingFile) {
      this.logger.warn({ fileId: params.id }, "FileUpdateScript: file not found");
      return {
        file: null,
        userErrors: [
          {
            message: "File not found",
            field: ["id"],
            code: "NOT_FOUND",
          },
        ],
      };
    }

    // 3. Check deletion state
    const deletionState = await this.repository.fileDeletionState.findByFileId(params.id);
    if (deletionState?.deletionState === "DELETING") {
      return {
        file: null,
        userErrors: [
          {
            message: "File is currently being deleted",
            field: ["id"],
            code: "FILE_BEING_DELETED",
          },
        ],
      };
    }
    if (deletionState && deletionState.deletionState !== "ACTIVE") {
      return {
        file: null,
        userErrors: [
          {
            message: "File not found",
            field: ["id"],
            code: "NOT_FOUND",
          },
        ],
      };
    }

    // 3. Build update data (only include provided fields)
    const updateData: {
      altText?: string | null;
      originalName?: string | null;
      meta?: Record<string, unknown> | null;
      mediaType?: typeof params.mediaType;
      previewFileId?: string | null;
      thumbhash?: string | null;
      processingStatus?: typeof params.processingStatus;
      processingError?: string | null;
    } = {};

    if (params.altText !== undefined) {
      updateData.altText = params.altText;
    }
    if (params.originalName !== undefined) {
      updateData.originalName = params.originalName;
    }
    if (params.meta !== undefined) {
      updateData.meta = params.meta;
    }
    if (params.mediaType !== undefined) {
      if (
        params.mediaType === "EXTERNAL_VIDEO" &&
        existingFile.provider !== "YOUTUBE" &&
        existingFile.provider !== "VIMEO"
      ) {
        return {
          file: null,
          userErrors: [
            {
              message: "External video media type requires a YouTube or Vimeo provider",
              field: ["mediaType"],
              code: "INVALID_MEDIA_TYPE",
            },
          ],
        };
      }
      updateData.mediaType = params.mediaType;
    }
    if (params.previewFileId !== undefined) {
      if (params.previewFileId === params.id) {
        return {
          file: null,
          userErrors: [
            {
              message: "A file cannot be its own preview",
              field: ["previewFileId"],
              code: "SELF_REFERENCE",
            },
          ],
        };
      }
      if (params.previewFileId) {
        const preview = await this.findStoreFile(params.previewFileId);
        if (!preview || preview.mediaType !== "IMAGE") {
          return {
            file: null,
            userErrors: [
              {
                message: "Preview must be an active image from the current store",
                field: ["previewFileId"],
                code: "INVALID_PREVIEW",
              },
            ],
          };
        }
      }
      updateData.previewFileId = params.previewFileId;
    }
    if (params.thumbhash !== undefined) {
      updateData.thumbhash = params.thumbhash;
    }
    if (params.processingStatus !== undefined) {
      if (params.processingError && params.processingStatus !== "FAILED") {
        return {
          file: null,
          userErrors: [
            {
              message: "processingError can only be set for a failed file",
              field: ["processingError"],
              code: "INVALID_PROCESSING_STATE",
            },
          ],
        };
      }
      updateData.processingStatus = params.processingStatus;
      if (params.processingError === undefined && params.processingStatus !== "FAILED") {
        updateData.processingError = null;
      }
    }
    if (params.processingError !== undefined) {
      if (
        params.processingError &&
        (params.processingStatus ?? existingFile.processingStatus) !== "FAILED"
      ) {
        return {
          file: null,
          userErrors: [
            {
              message: "processingError can only be set for a failed file",
              field: ["processingError"],
              code: "INVALID_PROCESSING_STATE",
            },
          ],
        };
      }
      updateData.processingError = params.processingError;
    }

    // Check if there are any updates to make
    if (Object.keys(updateData).length === 0) {
      this.logger.info({ fileId: params.id }, "FileUpdateScript: no changes to apply");
      return {
        file: { id: existingFile.id },
        userErrors: [],
      };
    }

    // 4. Update the file
    const updatedFile = await this.repository.file.update(params.id, updateData);

    if (!updatedFile) {
      this.logger.error({ fileId: params.id }, "FileUpdateScript: update failed unexpectedly");
      return {
        file: null,
        userErrors: [
          {
            message: "Failed to update file",
            code: "INTERNAL_ERROR",
          },
        ],
      };
    }

    this.logger.info({ fileId: updatedFile.id }, "FileUpdateScript: completed successfully");

    return {
      file: { id: updatedFile.id },
      userErrors: [],
    };
  }

  protected handleError(error: unknown): FileUpdateResult {
    if (error instanceof ValidationError) {
      return { file: null, userErrors: toUserErrors(error) };
    }
    return {
      file: null,
      userErrors: [{ message: "Failed to update file", code: "INTERNAL_ERROR" }],
    };
  }
}
