import { BaseScript } from "../../kernel/BaseScript.js";
import type { OptionValueCreateParams, OptionValueCreateResult } from "./dto/index.js";
import { SwatchCreateScript } from "./SwatchCreateScript.js";

export class OptionValueCreateScript extends BaseScript<
  OptionValueCreateParams,
  OptionValueCreateResult
> {
  protected async execute(params: OptionValueCreateParams): Promise<OptionValueCreateResult> {
    const { optionId, slug, name, sortIndex, swatch } = params;

    // 1. Check option exists
    const option = await this.repository.option.findById(optionId);
    if (!option) {
      return {
        optionValue: undefined,
        userErrors: [{ message: "Option not found", field: ["optionId"], code: "NOT_FOUND" }],
      };
    }

    // 2. Calculate sortIndex if not provided
    let finalSortIndex = sortIndex;
    if (finalSortIndex === undefined) {
      const existingValues = await this.repository.option.findValuesByOptionId(optionId);
      finalSortIndex = existingValues.length > 0
        ? Math.max(...existingValues.map((v) => v.sortIndex)) + 1
        : 0;
    }

    // 3. Create swatch if provided
    let swatchId: string | null = null;
    if (swatch) {
      const swatchResult = await this.executeScript(SwatchCreateScript, {
        swatchType: swatch.swatchType,
        colorOne: swatch.colorOne,
        colorTwo: swatch.colorTwo,
        fileId: swatch.fileId,
        metadata: swatch.metadata,
      });

      if (swatchResult.userErrors.length > 0) {
        return { optionValue: undefined, userErrors: swatchResult.userErrors };
      }

      swatchId = swatchResult.swatch?.id ?? null;
    }

    // 4. Create option value
    const optionValue = await this.repository.option.createValue(optionId, {
      slug,
      sortIndex: finalSortIndex,
      swatchId,
    });

    // 5. Create translation
    await this.repository.translation.upsertOptionValueTranslation({
      projectId: this.getProjectId(),
      optionValueId: optionValue.id,
      locale: this.getLocale(),
      name,
    });

    return { optionValue, userErrors: [] };
  }

  protected handleError(_error: unknown): OptionValueCreateResult {
    return {
      optionValue: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}

// Re-export types for backwards compatibility
export type { OptionValueCreateParams, OptionValueCreateResult, OptionSwatchInput } from "./dto/index.js";
