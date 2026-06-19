import { BaseScript } from "../../kernel/BaseScript.js";

export interface FileHardDeletedParams {
  fileId: string;
}

export interface FileHardDeletedResult {
  deletedProductMediaCount: number;
}

export class FileHardDeletedScript extends BaseScript<
  FileHardDeletedParams,
  FileHardDeletedResult
> {
  protected async execute(
    params: FileHardDeletedParams
  ): Promise<FileHardDeletedResult> {
    const deletedProductMediaCount =
      await this.repository.media.removeProductMediaByFileId(params.fileId);

    this.logger.info(
      { fileId: params.fileId, deletedProductMediaCount },
      "Cleaned up product media registry for hard-deleted file"
    );

    return { deletedProductMediaCount };
  }

  protected handleError(_error: unknown): FileHardDeletedResult {
    return { deletedProductMediaCount: 0 };
  }
}
