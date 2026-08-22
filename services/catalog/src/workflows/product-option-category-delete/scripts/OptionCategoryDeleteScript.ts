import { BaseScript, Transactional } from "../../../kernel/BaseScript.js";
import type {
  ProductOptionCategoryDeleteScriptParams,
  ProductOptionCategoryDeleteScriptResult,
} from "../dto/index.js";

export class OptionCategoryDeleteScript extends BaseScript<
  ProductOptionCategoryDeleteScriptParams,
  ProductOptionCategoryDeleteScriptResult
> {
  @Transactional()
  protected async execute(
    params: ProductOptionCategoryDeleteScriptParams,
  ): Promise<ProductOptionCategoryDeleteScriptResult> {
    const existing = await this.repository.optionCategory.findById(params.id);
    if (!existing) {
      return {
        userErrors: [{ message: "Option category not found", field: ["id"], code: "NOT_FOUND" }],
      };
    }
    if (await this.repository.optionCategory.isInUse(params.id)) {
      return {
        userErrors: [
          {
            message: "Option category is assigned to product options",
            field: ["id"],
            code: "IN_USE",
          },
        ],
      };
    }
    await this.repository.optionCategory.delete(params.id);
    return { deletedCategoryId: params.id, userErrors: [] };
  }

  protected handleError(): ProductOptionCategoryDeleteScriptResult {
    return { userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }] };
  }
}
