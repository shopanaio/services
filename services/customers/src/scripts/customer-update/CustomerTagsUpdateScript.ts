import { BaseScript } from "../../kernel/BaseScript.js";
import type { CustomerTagsUpdateOperation } from "../../workflows/dto/index.js";
import {
  internalSectionError,
  sectionErrors,
  sectionSuccess,
  type CustomerSectionResult,
} from "./types.js";

export interface CustomerTagsUpdateParams {
  customerId: string;
  operations: CustomerTagsUpdateOperation["params"];
}

export class CustomerTagsUpdateScript extends BaseScript<
  CustomerTagsUpdateParams,
  CustomerSectionResult
> {
  protected async execute(
    params: CustomerTagsUpdateParams
  ): Promise<CustomerSectionResult> {
    const tags = await this.repository.tag.getByIds(params.operations.tagIds);
    const existingIds = new Set(tags.map((tag) => tag.id));
    const seen = new Set<string>();
    const errors: Array<{ message: string; code: string; field: string[] }> = [];

    for (const [index, tagId] of params.operations.tagIds.entries()) {
      if (!existingIds.has(tagId)) {
        errors.push({
          message: "Customer tag not found",
          code: "NOT_FOUND",
          field: ["tagIds", String(index)],
        });
      }
      if (seen.has(tagId)) {
        errors.push({
          message: "Customer tag cannot appear more than once",
          code: "DUPLICATE_ID",
          field: ["tagIds", String(index)],
        });
      }
      seen.add(tagId);
    }
    if (errors.length > 0) return sectionErrors(errors);

    await this.repository.tag.replaceForCustomer(
      params.customerId,
      params.operations.tagIds,
      this.context.hasUser ? this.currentUser.id : null
    );
    return sectionSuccess();
  }

  protected handleError(_error: unknown): CustomerSectionResult {
    return internalSectionError();
  }
}
