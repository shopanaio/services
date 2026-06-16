import { BaseScript } from "../../kernel/BaseScript.js";
import type {
  FileClearErrorParams,
  FileClearErrorResult,
} from "./dto/FileClearErrorDto.js";

export class FileClearErrorScript extends BaseScript<
  FileClearErrorParams,
  FileClearErrorResult
> {
  protected async execute(
    params: FileClearErrorParams
  ): Promise<FileClearErrorResult> {
    const file = await this.repository.file.findAnyById(params.id);
    if (!file) {
      return { error: "FILE_NOT_FOUND" };
    }

    const deletionState = await this.repository.fileDeletionState.findByFileId(
      params.id
    );
    if (!deletionState) {
      return { error: "INVALID_STATE" };
    }
    if (deletionState.deletionState === "DELETING") {
      return { error: "FILE_BEING_DELETED" };
    }
    if (deletionState.deletionState === "ACTIVE") {
      return { error: "INVALID_STATE" };
    }
    if (!deletionState.deletionErrorCode) {
      return { error: "INVALID_STATE" };
    }

    const success = await this.repository.fileDeletionState.clearError(
      params.id
    );
    if (!success) {
      return { error: "INVALID_STATE" };
    }

    return { file };
  }

  protected handleError(_error: unknown): FileClearErrorResult {
    return { error: "INTERNAL_ERROR" };
  }
}
