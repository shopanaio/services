import { BaseScript, Transactional } from "../../../kernel/BaseScript.js";
import { isUniqueViolation } from "../../../kernel/types.js";
import type {
  ProductOptionCategoryCreateScriptParams,
  ProductOptionCategoryCreateScriptResult,
} from "../dto/index.js";

export class OptionCategoryCreateScript extends BaseScript<
  ProductOptionCategoryCreateScriptParams,
  ProductOptionCategoryCreateScriptResult
> {
  @Transactional()
  protected async execute(
    params: ProductOptionCategoryCreateScriptParams,
  ): Promise<ProductOptionCategoryCreateScriptResult> {
    const name = params.name.trim();
    const slug = params.slug.trim();
    if (!name || !slug) {
      return {
        userErrors: [
          {
            message: "Option category name and slug are required",
            field: [!name ? "name" : "slug"],
            code: "REQUIRED",
          },
        ],
      };
    }
    if (await this.repository.optionCategory.findBySlug(slug)) {
      return {
        userErrors: [
          {
            message: "Option category slug already exists",
            field: ["slug"],
            code: "DUPLICATE_SLUG",
          },
        ],
      };
    }
    try {
      const category = await this.repository.optionCategory.create({ name, slug });
      return { category, userErrors: [] };
    } catch (error) {
      if (isUniqueViolation(error, "product_option_category_store_id_slug_key")) {
        return {
          userErrors: [
            {
              message: "Option category slug already exists",
              field: ["slug"],
              code: "DUPLICATE_SLUG",
            },
          ],
        };
      }
      throw error;
    }
  }

  protected handleError(): ProductOptionCategoryCreateScriptResult {
    return { userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }] };
  }
}
