import { BaseScript } from "../../kernel/BaseScript.js";
import type {
  FileRestoreParams,
  FileRestoreResult,
} from "./dto/FileRestoreDto.js";

export class FileRestoreScript extends BaseScript<
  FileRestoreParams,
  FileRestoreResult
> {
  protected async execute(
    params: FileRestoreParams
  ): Promise<FileRestoreResult> {
    const file = await this.repository.file.findAnyById(params.id);
    if (!file) {
      return { error: "FILE_NOT_FOUND" };
    }

    // Restore deletion state first
    const result = await this.repository.fileDeletionState.restore(params.id);
    if (!result.success) {
      return { error: result.error };
    }

    // Clear deletedAt on file
    await this.repository.file.restore(params.id);

    const restored = await this.repository.file.findById(params.id);
    if (!restored) {
      return { error: "INTERNAL_ERROR" };
    }

    return { file: restored };
  }

  protected handleError(_error: unknown): FileRestoreResult {
    return { error: "INTERNAL_ERROR" };
  }
}
