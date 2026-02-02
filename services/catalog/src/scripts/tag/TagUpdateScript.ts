import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import type { TagUpdateParams, TagUpdateResult } from "./dto/index.js";

export class TagUpdateScript extends BaseScript<TagUpdateParams, TagUpdateResult> {
  @Transactional()
  protected async execute(params: TagUpdateParams): Promise<TagUpdateResult> {
    const { id, handle, name } = params;

    // 1. Check if tag exists
    const existing = await this.repository.tag.findById(id);
    if (!existing) {
      return {
        tag: undefined,
        userErrors: [
          { message: "Tag not found", field: ["id"], code: "NOT_FOUND" },
        ],
      };
    }

    // 2. Check handle uniqueness if changing
    if (handle && handle !== existing.handle) {
      const duplicate = await this.repository.tag.findByHandle(handle);
      if (duplicate) {
        return {
          tag: undefined,
          userErrors: [
            { message: "Tag handle already exists", field: ["handle"], code: "DUPLICATE" },
          ],
        };
      }
    }

    // 3. Update tag handle if provided
    if (handle) {
      await this.repository.tag.update(id, { handle });
    }

    // 4. Update translation if name provided
    if (name !== undefined) {
      await this.repository.tag.upsertTranslation({
        projectId: this.getProjectId(),
        tagId: id,
        locale: this.getLocale(),
        name,
      });
    }

    // 5. Fetch updated tag
    const tag = await this.repository.tag.findById(id);

    this.logger.info({ tagId: id }, "Tag updated");

    return { tag: tag ?? undefined, userErrors: [] };
  }

  protected handleError(_error: unknown): TagUpdateResult {
    return {
      tag: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
