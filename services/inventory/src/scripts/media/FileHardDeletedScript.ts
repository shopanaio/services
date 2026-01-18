import { BaseScript } from "../../kernel/BaseScript.js";

export interface FileHardDeletedParams {
  fileId: string;
}

export interface FileHardDeletedResult {
  deletedCount: number;
}

export class FileHardDeletedScript extends BaseScript<
  FileHardDeletedParams,
  FileHardDeletedResult
> {
  protected async execute(
    params: FileHardDeletedParams
  ): Promise<FileHardDeletedResult> {
    const deletedCount = await this.repository.media.removeByFileId(
      params.fileId
    );

    this.logger.info(
      { fileId: params.fileId, deletedCount },
      "Cleaned up variant_media for hard-deleted file"
    );

    return { deletedCount };
  }

  protected handleError(_error: unknown): FileHardDeletedResult {
    return { deletedCount: 0 };
  }
}
