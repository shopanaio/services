import { BaseScript } from "../../kernel/BaseScript.js";
import type { OptionValueUpdateParams, OptionValueUpdateResult } from "./dto/index.js";
import { SwatchCreateScript } from "./SwatchCreateScript.js";

export class OptionValueUpdateScript extends BaseScript<
  OptionValueUpdateParams,
  OptionValueUpdateResult
> {
  protected async execute(params: OptionValueUpdateParams): Promise<OptionValueUpdateResult> {
    const { id, slug, name, swatch } = params;

    // 1. Check value exists
    const existingValue = await this.repository.option.findValueById(id);
    if (!existingValue) {
      return {
        optionValue: undefined,
        userErrors: [{ message: "Option value not found", field: ["id"], code: "NOT_FOUND" }],
      };
    }

    // 2. Build update data
    const updateData: { slug?: string; swatchId?: string | null } = {};

    if (slug !== undefined) {
      updateData.slug = slug;
    }

    // 3. Handle swatch update
    if (swatch !== undefined) {
      if (swatch === null) {
        // Remove swatch
        updateData.swatchId = null;
      } else {
        // Create new swatch
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

        updateData.swatchId = swatchResult.swatch?.id ?? null;
      }
    }

    // 4. Update option value
    if (Object.keys(updateData).length > 0) {
      await this.repository.option.updateValue(id, updateData);
    }

    // 5. Update translation if name provided
    if (name !== undefined) {
      await this.repository.translation.upsertOptionValueTranslation({
        projectId: this.getProjectId(),
        optionValueId: id,
        locale: this.getLocale(),
        name,
      });
    }

    // 6. Fetch updated value
    const optionValue = await this.repository.option.findValueById(id);

    return { optionValue: optionValue ?? undefined, userErrors: [] };
  }

  protected handleError(_error: unknown): OptionValueUpdateResult {
    return {
      optionValue: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
