import type { TransactionScript } from "../../kernel/types.js";
import { getContext } from "../../context/index.js";

export interface FileUpdateParams {
  readonly id: string;
  readonly altText?: string;
  readonly originalName?: string;
  readonly meta?: Record<string, unknown>;
}

export interface FileUpdateResult {
  file?: {
    id: string;
  };
  userErrors: Array<{ message: string; field?: string[]; code?: string }>;
}

/**
 * Updates file metadata.
 *
 * Logic:
 * 1. Find file by ID
 * 2. Check that file exists and is not deleted
 * 3. Update fields
 * 4. Return updated File
 */
export const fileUpdate: TransactionScript<
  FileUpdateParams,
  FileUpdateResult
> = async (params, services) => {
  const { logger, repository } = services;
  const ctx = getContext();
  const projectId = ctx.project.id;

  try {
    logger.info({ params, projectId }, "fileUpdate: starting");

    // 1. Find file by ID
    const existingFile = await repository.file.findById(projectId, params.id);

    // 2. Check that file exists
    if (!existingFile) {
      logger.warn({ fileId: params.id }, "fileUpdate: file not found");
      return {
        file: undefined,
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
      logger.info({ fileId: params.id }, "fileUpdate: no changes to apply");
      return {
        file: { id: existingFile.id },
        userErrors: [],
      };
    }

    // 4. Update the file
    const updatedFile = await repository.file.update(projectId, params.id, updateData);

    if (!updatedFile) {
      logger.error({ fileId: params.id }, "fileUpdate: update failed unexpectedly");
      return {
        file: undefined,
        userErrors: [
          {
            message: "Failed to update file",
            code: "INTERNAL_ERROR",
          },
        ],
      };
    }

    logger.info({ fileId: updatedFile.id }, "fileUpdate: completed successfully");

    return {
      file: { id: updatedFile.id },
      userErrors: [],
    };
  } catch (error) {
    logger.error({ error, params }, "fileUpdate failed");
    return {
      file: undefined,
      userErrors: [{ message: "Failed to update file", code: "INTERNAL_ERROR" }],
    };
  }
};
