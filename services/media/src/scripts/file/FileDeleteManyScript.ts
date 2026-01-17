import { DBOS } from "@shopana/workflows";
import { BaseScript } from "../../kernel/BaseScript.js";
import type { File } from "../../repositories/models/index.js";
import { FileHardDeleteWorkflow } from "../../workflows/FileHardDeleteWorkflow.js";
import type {
  FileDeleteManyParams,
  FileDeleteManyResult,
} from "./dto/FileDeleteManyDto.js";

export class FileDeleteManyScript extends BaseScript<
  FileDeleteManyParams,
  FileDeleteManyResult
> {
  protected async execute(
    params: FileDeleteManyParams
  ): Promise<FileDeleteManyResult> {
    const { ids, permanent = false } = params;
    const now = new Date();

    const acceptedIds: string[] = [];
    const startedHardDeleteIds: string[] = [];
    const errors: FileDeleteManyResult["errors"] = [];

    const filesMap = new Map<string, File>();
    for (const id of ids) {
      const file = await this.repository.file.findAnyById(id);
      if (!file) {
        errors.push({ id, code: "FILE_NOT_FOUND" });
        continue;
      }
      if (file.deletionState === "DELETING") {
        errors.push({ id, code: "FILE_BEING_DELETED" });
        continue;
      }
      filesMap.set(id, file);
    }

    const activeIds = [...filesMap.entries()]
      .filter(([_, file]) => file.deletionState === "ACTIVE")
      .map(([id]) => id);

    if (activeIds.length > 0) {
      const softDeleted = await this.repository.file.softDeleteManyIfEligible(
        activeIds,
        now
      );
      acceptedIds.push(...softDeleted);
    }

    const alreadySoftDeleted = [...filesMap.entries()]
      .filter(([_, file]) => file.deletionState === "SOFT_DELETED")
      .map(([id]) => id);
    acceptedIds.push(...alreadySoftDeleted);

    if (permanent) {
      for (const id of filesMap.keys()) {
        const started = await this.startHardDeleteWorkflow(id);
        if (started) {
          startedHardDeleteIds.push(id);
        }
      }
    }

    return { acceptedIds, startedHardDeleteIds, errors };
  }

  protected handleError(_error: unknown): FileDeleteManyResult {
    return {
      acceptedIds: [],
      startedHardDeleteIds: [],
      errors: [{ id: "", code: "INTERNAL_ERROR" }],
    };
  }

  private async startHardDeleteWorkflow(fileId: string): Promise<boolean> {
    try {
      const workflow =
        this.workflow.get<FileHardDeleteWorkflow>("fileHardDelete");
      await DBOS.startWorkflow(workflow).run(fileId);
      return true;
    } catch (error) {
      this.logger.error(
        { fileId, error },
        "Failed to start hard delete workflow"
      );
      return false;
    }
  }
}
