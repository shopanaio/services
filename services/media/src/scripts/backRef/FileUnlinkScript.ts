import { BaseScript } from "../../kernel/BaseScript.js";
import type { FileUnlinkParams, FileUnlinkResult } from "./dto/index.js";

export class FileUnlinkScript extends BaseScript<FileUnlinkParams, FileUnlinkResult> {
  protected async execute(params: FileUnlinkParams): Promise<FileUnlinkResult> {
    const { fileId, entityRef, role } = params;

    await this.repository.fileBackRef.unlink({
      fileId,
      service: entityRef.service,
      entityType: entityRef.entityType,
      entityId: entityRef.entityId,
      role,
    });

    const file = await this.repository.file.findAnyById(fileId);
    if (!file) {
      return {
        success: true,
        activeRefCount: 0,
        fileExists: false,
        fileActive: false,
      };
    }

    if (file.deletedAt !== null) {
      return {
        success: true,
        activeRefCount: 0,
        fileExists: true,
        fileActive: false,
      };
    }

    const activeRefCount = await this.repository.fileBackRef.countByFileId(fileId);

    return {
      success: true,
      activeRefCount,
      fileExists: true,
      fileActive: true,
    };
  }

  protected handleError(_error: unknown): FileUnlinkResult {
    return {
      success: false,
      activeRefCount: 0,
      fileExists: false,
      fileActive: false,
    };
  }
}
