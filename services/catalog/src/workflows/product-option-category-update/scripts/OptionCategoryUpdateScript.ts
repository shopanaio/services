import { BaseScript, Transactional } from "../../../kernel/BaseScript.js";
import { isUniqueViolation } from "../../../kernel/types.js";
import type {
  ProductOptionCategoryUpdateScriptResult,
  ProductOptionCategoryUpdateScriptParams,
} from "../dto/index.js";

export class OptionCategoryUpdateScript extends BaseScript<
  ProductOptionCategoryUpdateScriptParams,
  ProductOptionCategoryUpdateScriptResult
> {
  @Transactional()
  protected async execute(
    params: ProductOptionCategoryUpdateScriptParams,
  ): Promise<ProductOptionCategoryUpdateScriptResult> {
    const existing = await this.repository.optionCategory.findById(params.id);
    if (!existing) {
      return {
        userErrors: [{ message: "Option category not found", field: ["id"], code: "NOT_FOUND" }],
      };
    }
    const name = params.name?.trim();
    const slug = params.slug?.trim();
    if (params.name !== undefined && !name) {
      return {
        userErrors: [
          { message: "Option category name is required", field: ["name"], code: "REQUIRED" },
        ],
      };
    }
    if (params.slug !== undefined && !slug) {
      return {
        userErrors: [
          { message: "Option category slug is required", field: ["slug"], code: "REQUIRED" },
        ],
      };
    }
    if (slug && slug !== existing.slug) {
      const duplicate = await this.repository.optionCategory.findBySlug(slug);
      if (duplicate) {
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
    }
    try {
      const category = await this.repository.optionCategory.update(params.id, {
        name,
        slug,
      });
      return { category: category ?? undefined, userErrors: [] };
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

  protected handleError(): ProductOptionCategoryUpdateScriptResult {
    return { userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }] };
  }
}
