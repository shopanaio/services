import { BaseScript } from "../../kernel/BaseScript.js";
import type { File, FileDeletionState } from "../../repositories/models/index.js";
import type {
  FileDeleteManyParams,
  FileDeleteManyResult,
} from "./dto/FileDeleteManyDto.js";

interface FileWithState {
  file: File;
  state: FileDeletionState | null;
}

export class FileDeleteManyScript extends BaseScript<
  FileDeleteManyParams,
  FileDeleteManyResult
> {
  protected async execute(
    params: FileDeleteManyParams
  ): Promise<FileDeleteManyResult> {
    const { ids, permanent = false } = params;

    const acceptedIds: string[] = [];
    const startedHardDeleteIds: string[] = [];
    const errors: FileDeleteManyResult["errors"] = [];

    // Collect files and their deletion states
    const filesMap = new Map<string, FileWithState>();
    for (const id of ids) {
      const file = await this.repository.file.findAnyById(id);
      if (!file) {
        errors.push({ id, code: "FILE_NOT_FOUND" });
        continue;
      }
      const state = await this.repository.fileDeletionState.findByFileId(id);
      if (state?.deletionState === "DELETING") {
        errors.push({ id, code: "FILE_BEING_DELETED" });
        continue;
      }
      filesMap.set(id, { file, state });
    }

    // Get IDs that need soft delete (ACTIVE state)
    const activeIds = [...filesMap.entries()]
      .filter(([_, { state }]) => !state || state.deletionState === "ACTIVE")
      .map(([id]) => id);

    // Soft delete: set deletedAt on files and state on deletion states
    if (activeIds.length > 0) {
      await this.repository.file.softDeleteMany(activeIds);
      const softDeleted =
        await this.repository.fileDeletionState.softDeleteManyIfEligible(
          activeIds
        );
      acceptedIds.push(...softDeleted);
    }

    // Already soft-deleted are also accepted (idempotent)
    const alreadySoftDeleted = [...filesMap.entries()]
      .filter(([_, { state }]) => state?.deletionState === "SOFT_DELETED")
      .map(([id]) => id);
    acceptedIds.push(...alreadySoftDeleted);

    // Start hard delete workflows if permanent
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
      await this.services.broker.runWorkflow(
        "media.fileHardDelete",
        fileId,
        {
          source: "workflow",
          workflowId: `fileDeleteMany:${fileId}`,
          stepId: "startHardDelete",
        }
      );
      return true;
    } catch (error) {
      this.logger.error({ fileId, error }, "Failed to start hard delete workflow");
      return false;
    }
  }
}
