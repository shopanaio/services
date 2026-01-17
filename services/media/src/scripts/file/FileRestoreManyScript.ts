import { BaseScript } from "../../kernel/BaseScript.js";
import type { FileDeletionState } from "../../repositories/models/index.js";
import type {
  FileRestoreManyParams,
  FileRestoreManyResult,
} from "./dto/FileRestoreManyDto.js";

export class FileRestoreManyScript extends BaseScript<
  FileRestoreManyParams,
  FileRestoreManyResult
> {
  protected async execute(
    params: FileRestoreManyParams
  ): Promise<FileRestoreManyResult> {
    const { ids } = params;

    const restoredIds: string[] = [];
    const errors: FileRestoreManyResult["errors"] = [];

    // Collect files and their deletion states
    const statesMap = new Map<string, FileDeletionState | null>();
    for (const id of ids) {
      const file = await this.repository.file.findAnyById(id);
      if (!file) {
        errors.push({ id, code: "FILE_NOT_FOUND" });
        continue;
      }
      const state = await this.repository.fileDeletionState.findByFileId(id);
      statesMap.set(id, state);
    }

    // Process each file
    for (const [id, state] of statesMap.entries()) {
      if (!state) {
        errors.push({ id, code: "INVALID_STATE" });
        continue;
      }

      if (state.deletionState === "DELETING") {
        errors.push({ id, code: "FILE_BEING_DELETED" });
        continue;
      }

      if (state.deletionState === "ACTIVE") {
        // Already active, consider it restored (idempotent)
        restoredIds.push(id);
        continue;
      }

      // Restore deletion state to ACTIVE
      const result = await this.repository.fileDeletionState.restore(id);
      if (!result.success) {
        errors.push({ id, code: result.error ?? "INTERNAL_ERROR" });
        continue;
      }

      // Clear deletedAt on file
      await this.repository.file.restore(id);
      restoredIds.push(id);
    }

    return { restoredIds, errors };
  }

  protected handleError(_error: unknown): FileRestoreManyResult {
    return {
      restoredIds: [],
      errors: [{ id: "", code: "INTERNAL_ERROR" }],
    };
  }
}
