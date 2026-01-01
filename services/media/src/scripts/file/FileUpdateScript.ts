import { BaseScript } from "../../kernel/BaseScript.js";
import type {
  FileUpdateParams,
  FileUpdateResult,
} from "./dto/FileUpdateDto.js";

export class FileUpdateScript extends BaseScript<
  FileUpdateParams,
  FileUpdateResult
> {
  protected async execute(params: FileUpdateParams): Promise<FileUpdateResult> {
    const projectId = this.storeId;

    this.logger.info({ params, projectId }, "FileUpdateScript: starting");

    // 1. Find file by ID
    const existingFile = await this.repository.file.findById(projectId, params.id);

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

    // 3. Build update data (only include provided fields)
    const updateData: {
      altText?: string | null;
      originalName?: string | null;
      meta?: Record<string, unknown> | null;
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

    // Check if there are any updates to make
    if (Object.keys(updateData).length === 0) {
      this.logger.info({ fileId: params.id }, "FileUpdateScript: no changes to apply");
      return {
        file: { id: existingFile.id },
        userErrors: [],
      };
    }

    // 4. Update the file
    const updatedFile = await this.repository.file.update(projectId, params.id, updateData);

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

  protected handleError(_error: unknown): FileUpdateResult {
    return {
      file: null,
      userErrors: [{ message: "Failed to update file", code: "INTERNAL_ERROR" }],
    };
  }
}
