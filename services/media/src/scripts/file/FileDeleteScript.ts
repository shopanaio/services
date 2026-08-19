import { BaseScript, ZodSchema, ValidationError, toUserErrors } from "../../kernel/BaseScript.js";
import {
  fileDeleteSchema,
  type FileDeleteParams,
  type FileDeleteResult,
} from "./dto/FileDeleteDto.js";

export class FileDeleteScript extends BaseScript<
  FileDeleteParams,
  FileDeleteResult
> {
  @ZodSchema(fileDeleteSchema)
  protected async execute(params: FileDeleteParams): Promise<FileDeleteResult> {
    const file = await this.findStoreFile(params.id, true);
    if (!file) {
      return {
        deletedFileId: null,
        userErrors: [
          {
            message: "File not found",
            field: ["id"],
            code: "FILE_NOT_FOUND",
          },
        ],
      };
    }

    const deletionState = await this.repository.fileDeletionState.findByFileId(
      params.id
    );

    if (deletionState?.deletionState === "DELETING") {
      return {
        deletedFileId: null,
        userErrors: [
          {
            message: "File is currently being deleted",
            field: ["id"],
            code: "FILE_BEING_DELETED",
          },
        ],
      };
    }

    // Soft delete: set deletedAt on file and state on deletion state
    if (!deletionState || deletionState.deletionState === "ACTIVE") {
      await this.repository.file.softDelete(params.id);
      await this.repository.fileDeletionState.softDeleteIfEligible(params.id);
    }

    if (params.permanent) {
      await this.startHardDeleteWorkflow(params.id);
    }

    return {
      deletedFileId: file.id,
      userErrors: [],
    };
  }

  private async startHardDeleteWorkflow(fileId: string): Promise<void> {
    await this.services.broker.runWorkflow(
      "media.fileHardDelete",
      fileId,
      {
        source: "workflow",
        workflowId: `fileDelete:${fileId}`,
        stepId: "startHardDelete",
      }
    );
  }

  protected handleError(error: unknown): FileDeleteResult {
    if (error instanceof ValidationError) {
      return { deletedFileId: null, userErrors: toUserErrors(error) };
    }
    return {
      deletedFileId: null,
      userErrors: [{ message: "Failed to delete file", code: "INTERNAL_ERROR" }],
    };
  }
}
