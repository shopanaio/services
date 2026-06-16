import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import type { TagDeleteParams, TagDeleteResult } from "./dto/index.js";

export class TagDeleteScript extends BaseScript<TagDeleteParams, TagDeleteResult> {
  @Transactional()
  protected async execute(params: TagDeleteParams): Promise<TagDeleteResult> {
    const { id } = params;

    // 1. Check if tag exists
    const existing = await this.repository.tag.findById(id);
    if (!existing) {
      return {
        deletedTagId: undefined,
        userErrors: [
          { message: "Tag not found", field: ["id"], code: "NOT_FOUND" },
        ],
      };
    }

    // 2. Delete tag (hard delete - tags don't have soft delete)
    const deleted = await this.repository.tag.delete(id);

    if (!deleted) {
      return {
        deletedTagId: undefined,
        userErrors: [{ message: "Failed to delete tag", code: "DELETE_FAILED" }],
      };
    }

    this.logger.info({ tagId: id }, "Tag deleted");

    return { deletedTagId: id, userErrors: [] };
  }

  protected handleError(_error: unknown): TagDeleteResult {
    return {
      deletedTagId: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
