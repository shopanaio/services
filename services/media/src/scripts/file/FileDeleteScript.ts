import { BaseScript } from "../../kernel/BaseScript.js";
import { DBOS } from "@shopana/shared-kernel";
import { FileHardDeleteSaga } from "../../sagas/index.js";
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
      await this.startHardDeleteSaga(params.id);
    }

    return {
      deletedFileId: file.id,
      userErrors: [],
    };
  }

  private async startHardDeleteSaga(fileId: string): Promise<void> {
    const saga = this.workflow.get<FileHardDeleteSaga>(
      this.services.broker.qualifyAction("fileHardDelete")
    );
    await DBOS.startWorkflow(saga).run(fileId);
  }

  protected handleError(_error: unknown): FileDeleteResult {
    return {
      deletedFileId: null,
      userErrors: [{ message: "Failed to delete file", code: "INTERNAL_ERROR" }],
    };
  }
}
