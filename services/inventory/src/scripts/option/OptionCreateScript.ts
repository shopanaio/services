import { BaseScript } from "../../kernel/BaseScript.js";
import type { OptionCreateParams, OptionCreateResult } from "./dto/index.js";
import { OptionValueCreateScript } from "./OptionValueCreateScript.js";

export class OptionCreateScript extends BaseScript<OptionCreateParams, OptionCreateResult> {
  protected async execute(params: OptionCreateParams): Promise<OptionCreateResult> {
    const { productId, slug, name, displayType, values } = params;

    // 1. Validate: product exists
    const productExists = await this.repository.product.exists(productId);
    if (!productExists) {
      return {
        option: undefined,
        userErrors: [{ message: "Product not found", field: ["productId"], code: "NOT_FOUND" }],
      };
    }

    // 2. Validate: slug is unique
    const existingOption = await this.repository.option.findBySlug(productId, slug);
    if (existingOption) {
      return {
        option: undefined,
        userErrors: [{
          message: `Option with slug "${slug}" already exists`,
          field: ["slug"],
          code: "SLUG_ALREADY_EXISTS",
        }],
      };
    }

    // 3. Create option
    const option = await this.repository.option.create(productId, {
      slug,
      displayType,
    });

    // 4. Create option translation
    await this.repository.translation.upsertOptionTranslation({
      projectId: this.getProjectId(),
      optionId: option.id,
      locale: this.getLocale(),
      name,
    });

    // 5. Create values using OptionValueCreateScript
    for (let i = 0; i < values.length; i++) {
      const valueInput = values[i];
      const result = await this.executeScript(OptionValueCreateScript, {
        optionId: option.id,
        slug: valueInput.slug,
        name: valueInput.name,
        sortIndex: i,
        swatch: valueInput.swatch,
      });

      if (result.userErrors.length > 0) {
        return { option: undefined, userErrors: result.userErrors };
      }
    }

    this.logger.info(
      { optionId: option.id, productId, valuesCount: values.length },
      "Option created"
    );

    return { option, userErrors: [] };
  }

  protected handleError(_error: unknown): OptionCreateResult {
    return {
      option: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}

// Re-export types for backwards compatibility
export type { OptionCreateParams, OptionCreateResult, OptionValueInput } from "./dto/index.js";
