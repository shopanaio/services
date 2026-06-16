import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import type { TagCreateParams, TagCreateResult } from "./dto/index.js";

export class TagCreateScript extends BaseScript<TagCreateParams, TagCreateResult> {
  @Transactional()
  protected async execute(params: TagCreateParams): Promise<TagCreateResult> {
    const { handle, name } = params;

    // 1. Check if handle is unique
    const existing = await this.repository.tag.findByHandle(handle);
    if (existing) {
      return {
        tag: undefined,
        userErrors: [
          { message: "Tag handle already exists", field: ["handle"], code: "DUPLICATE" },
        ],
      };
    }

    // 2. Create tag
    const tag = await this.repository.tag.create({ handle });

    // 3. Create translation if name provided
    if (name) {
      await this.repository.tag.upsertTranslation({
        projectId: this.getProjectId(),
        tagId: tag.id,
        locale: this.getLocale(),
        name,
      });
    }

    this.logger.info({ tagId: tag.id, handle }, "Tag created");

    return { tag, userErrors: [] };
  }

  protected handleError(_error: unknown): TagCreateResult {
    return {
      tag: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
