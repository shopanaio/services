import type { UserError } from "../../kernel/BaseScript.js";
import type { DiscountAggregate } from "../../repositories/DiscountRepository.js";
import type {
  DiscountUpdateTagsParams,
  DiscountUpdateTagsResult,
} from "./dto/index.js";
import { BaseDiscountUpdateScript } from "./BaseDiscountUpdateScript.js";
import { sectionErrors, sectionSuccess } from "./types.js";

export class DiscountUpdateTagsScript extends BaseDiscountUpdateScript<DiscountUpdateTagsParams> {
  protected async update(
    aggregate: DiscountAggregate,
    params: DiscountUpdateTagsParams,
  ): Promise<DiscountUpdateTagsResult> {
    const errors: UserError[] = [];
    const normalized = new Set<string>();
    const tags = params.tags.map((input, index) => {
      const tag = input.trim();
      if (!tag || tag.length > 64) {
        errors.push({
          message: "Tags must contain between 1 and 64 characters",
          code: "INVALID_TAG",
          field: [String(index)],
        });
      }
      const key = tag.toLocaleLowerCase("en-US");
      if (normalized.has(key)) {
        errors.push({
          message: "A tag may only be supplied once",
          code: "DUPLICATE_TAG",
          field: [String(index)],
        });
      }
      normalized.add(key);
      return tag;
    });
    if (errors.length > 0) return sectionErrors(errors);
    await this.repository.discount.replaceTags(aggregate.discount.id, tags);
    return sectionSuccess();
  }
}
