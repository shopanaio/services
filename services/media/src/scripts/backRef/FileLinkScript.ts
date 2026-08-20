import { BaseScript } from "../../kernel/BaseScript.js";
import type { FileLinkParams, FileLinkResult } from "./dto/index.js";

export class FileLinkScript extends BaseScript<FileLinkParams, FileLinkResult> {
  protected async execute(params: FileLinkParams): Promise<FileLinkResult> {
    const { fileId, entityRef, owner, role } = params;

    const link = await this.repository.fileBackRef.link({
      fileId,
      service: entityRef.service,
      entityType: entityRef.entityType,
      entityId: entityRef.entityId,
      ownerType: owner.type,
      ownerId: owner.id,
      role,
    });

    if (link.code === "FILE_NOT_FOUND") {
      this.logger.info({ fileId }, "fileLink: file not found");
      return {
        success: false,
        code: link.code,
        activeRefCount: 0,
        fileExists: false,
        fileActive: false,
      };
    }

    if (link.code === "FILE_INACTIVE") {
      this.logger.info({ fileId }, "fileLink: file is soft-deleted");
      return {
        success: false,
        code: link.code,
        activeRefCount: 0,
        fileExists: true,
        fileActive: false,
      };
    }

    if (link.code === "OWNER_MISMATCH") {
      return {
        success: false,
        code: link.code,
        activeRefCount: await this.repository.fileBackRef.countByFileId(fileId),
        fileExists: true,
        fileActive: true,
      };
    }

    const activeRefCount = await this.repository.fileBackRef.countByFileId(fileId);

    return {
      success: true,
      code: "LINKED",
      activeRefCount,
      fileExists: true,
      fileActive: true,
    };
  }

  protected handleError(_error: unknown): FileLinkResult {
    return {
      success: false,
      code: "LINK_FAILED",
      activeRefCount: 0,
      fileExists: false,
      fileActive: false,
    };
  }
}
