import { BaseScript, Transactional } from "../../../kernel/BaseScript.js";
import type { TagDeleteScriptParams, TagDeleteScriptResult } from "../dto/index.js";

export class TagDeleteScript extends BaseScript<TagDeleteScriptParams, TagDeleteScriptResult> {
  @Transactional()
  protected async execute(params: TagDeleteScriptParams): Promise<TagDeleteScriptResult> {
    const { id } = params;

    // 1. Check if tag exists
    const existing = await this.repository.tag.findById(id);
    if (!existing) {
      return {
        deletedTagId: undefined,
        affectedProductIds: [],
        userErrors: [{ message: "Tag not found", field: ["id"], code: "NOT_FOUND" }],
      };
    }

    const affectedProductIds = (await this.repository.tag.getTagProductLinks([id])).map(
      (link) => link.productId,
    );

    // 2. Delete tag (hard delete - tags don't have soft delete)
    const deleted = await this.repository.tag.delete(id);

    if (!deleted) {
      return {
        deletedTagId: undefined,
        affectedProductIds: [],
        userErrors: [{ message: "Failed to delete tag", code: "DELETE_FAILED" }],
      };
    }

    this.logger.info({ tagId: id }, "Tag deleted");

    return {
      deletedTagId: id,
      affectedProductIds,
      userErrors: [],
    };
  }

  protected handleError(_error: unknown): TagDeleteScriptResult {
    return {
      deletedTagId: undefined,
      affectedProductIds: [],
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
