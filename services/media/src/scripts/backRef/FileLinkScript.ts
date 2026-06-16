import { BaseScript } from "../../kernel/BaseScript.js";
import type { FileLinkParams, FileLinkResult } from "./dto/index.js";

export class FileLinkScript extends BaseScript<FileLinkParams, FileLinkResult> {
  protected async execute(params: FileLinkParams): Promise<FileLinkResult> {
    const { fileId, entityRef, role } = params;

    // 1. Attempt to link (SQL handles soft-delete check atomically)
    await this.repository.fileBackRef.link({
      fileId,
      service: entityRef.service,
      entityType: entityRef.entityType,
      entityId: entityRef.entityId,
      role,
    });

    // 2. Check file status for response
    const file = await this.repository.file.findAnyById(fileId);

    if (!file) {
      this.logger.info({ fileId }, "fileLink: file not found");
      return {
        success: true,
        activeRefCount: 0,
        fileExists: false,
        fileActive: false,
      };
    }

    if (file.deletedAt !== null) {
      this.logger.info({ fileId }, "fileLink: file is soft-deleted");
      return {
        success: true,
        activeRefCount: 0,
        fileExists: true,
        fileActive: false,
      };
    }

    // 3. File is active, count refs
    const activeRefCount = await this.repository.fileBackRef.countByFileId(fileId);

    return {
      success: true,
      activeRefCount,
      fileExists: true,
      fileActive: true,
    };
  }

  protected handleError(_error: unknown): FileLinkResult {
    return {
      success: false,
      activeRefCount: 0,
      fileExists: false,
      fileActive: false,
    };
  }
}
