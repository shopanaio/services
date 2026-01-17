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
    if (file.deletionState === "DELETING") {
      return { error: "FILE_BEING_DELETED" };
    }
    if (file.deletionState === "ACTIVE") {
      return { error: "INVALID_STATE" };
    }
    if (!file.deletionErrorCode) {
      return { error: "INVALID_STATE" };
    }

    const success = await this.repository.file.clearError(params.id);
    if (!success) {
      return { error: "INVALID_STATE" };
    }

    const updated = await this.repository.file.findAnyById(params.id);
    if (!updated) {
      return { error: "INTERNAL_ERROR" };
    }

    return { file: updated };
  }

  protected handleError(_error: unknown): FileClearErrorResult {
    return { error: "INTERNAL_ERROR" };
  }
}
