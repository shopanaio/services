import { BaseScript, ZodSchema, ValidationError } from "../../kernel/BaseScript.js";
import {
  fileRestoreSchema,
  type FileRestoreParams,
  type FileRestoreResult,
} from "./dto/FileRestoreDto.js";

export class FileRestoreScript extends BaseScript<FileRestoreParams, FileRestoreResult> {
  @ZodSchema(fileRestoreSchema)
  protected async execute(params: FileRestoreParams): Promise<FileRestoreResult> {
    const file = await this.findStoreFile(params.id, true);
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

    const restored = await this.findStoreFile(params.id);
    if (!restored) {
      return { error: "INTERNAL_ERROR" };
    }

    return { file: restored };
  }

  protected handleError(error: unknown): FileRestoreResult {
    if (error instanceof ValidationError) {
      return { error: "VALIDATION_ERROR" };
    }
    return { error: "INTERNAL_ERROR" };
  }
}
