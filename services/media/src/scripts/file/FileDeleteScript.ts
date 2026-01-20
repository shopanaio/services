import { BaseScript } from "../../kernel/BaseScript.js";
import { DBOS } from "@shopana/shared-kernel";
import { FileHardDeleteWorkflow } from "../../workflows/FileHardDeleteWorkflow.js";
import type {
  FileDeleteParams,
  FileDeleteResult,
} from "./dto/FileDeleteDto.js";

export class FileDeleteScript extends BaseScript<
  FileDeleteParams,
  FileDeleteResult
> {
  protected async execute(params: FileDeleteParams): Promise<FileDeleteResult> {
    const file = await this.repository.file.findAnyById(params.id);
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
    const workflow =
      this.workflow.get<FileHardDeleteWorkflow>(
        this.services.broker.qualifyAction("fileHardDelete")
      );
    await DBOS.startWorkflow(workflow).run(fileId);
  }

  protected handleError(_error: unknown): FileDeleteResult {
    return {
      deletedFileId: null,
      userErrors: [{ message: "Failed to delete file", code: "INTERNAL_ERROR" }],
    };
  }
}
