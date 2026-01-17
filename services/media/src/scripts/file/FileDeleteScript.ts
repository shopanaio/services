import { BaseScript } from "../../kernel/BaseScript.js";
import { DBOS } from "@shopana/workflows";
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

    if (file.deletionState === "DELETING") {
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

    if (file.deletionState === "ACTIVE") {
      await this.repository.file.softDeleteIfEligible(params.id, new Date());
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
      this.workflow.get<FileHardDeleteWorkflow>("fileHardDelete");
    await DBOS.startWorkflow(workflow).run(fileId);
  }

  protected handleError(_error: unknown): FileDeleteResult {
    return {
      deletedFileId: null,
      userErrors: [{ message: "Failed to delete file", code: "INTERNAL_ERROR" }],
    };
  }
}
