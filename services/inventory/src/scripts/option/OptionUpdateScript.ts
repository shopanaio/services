import { BaseScript, type UserError } from "../../kernel/BaseScript.js";
import type { ProductOption } from "../../repositories/models/index.js";
import { OptionValueCreateScript, type OptionSwatchInput } from "./OptionValueCreateScript.js";
import { OptionValueUpdateScript } from "./OptionValueUpdateScript.js";
import { OptionValueDeleteScript } from "./OptionValueDeleteScript.js";

export interface OptionValueInput {
  readonly slug: string;
  readonly name: string;
  readonly swatch?: OptionSwatchInput;
}

export interface OptionValueUpdateInput {
  readonly id: string;
  readonly slug?: string;
  readonly name?: string;
  readonly swatch?: OptionSwatchInput | null;
}

export interface OptionValuesInput {
  readonly create?: OptionValueInput[];
  readonly update?: OptionValueUpdateInput[];
  readonly delete?: string[];
}

export interface OptionUpdateParams {
  readonly id: string;
  readonly slug?: string;
  readonly name?: string;
  readonly displayType?: string;
  readonly values?: OptionValuesInput;
}

export interface OptionUpdateResult {
  option?: ProductOption;
  userErrors: UserError[];
}

export class OptionUpdateScript extends BaseScript<OptionUpdateParams, OptionUpdateResult> {
  protected async execute(params: OptionUpdateParams): Promise<OptionUpdateResult> {
    const { id, slug, name, displayType, values } = params;

    // 1. Check option exists
    const existingOption = await this.repository.option.findById(id);
    if (!existingOption) {
      return {
        option: undefined,
        userErrors: [{ message: "Option not found", field: ["id"], code: "NOT_FOUND" }],
      };
    }

    // 2. Check slug uniqueness if changing
    if (slug !== undefined && slug !== existingOption.slug) {
      const optionWithSlug = await this.repository.option.findBySlug(
        existingOption.productId,
        slug
      );
      if (optionWithSlug) {
        return {
          option: undefined,
          userErrors: [{
            message: `Option with slug "${slug}" already exists`,
            field: ["slug"],
            code: "SLUG_ALREADY_EXISTS",
          }],
        };
      }
    }

    // 3. Update option
    const updateData: { slug?: string; displayType?: string } = {};
    if (slug !== undefined) updateData.slug = slug;
    if (displayType !== undefined) updateData.displayType = displayType;

    if (Object.keys(updateData).length > 0) {
      await this.repository.option.update(id, updateData);
    }

    // 4. Update translation if name provided
    if (name !== undefined) {
      await this.repository.translation.upsertOptionTranslation({
        projectId: this.getProjectId(),
        optionId: id,
        locale: this.getLocale(),
        name,
      });
    }

    // 5. Handle values updates
    if (values) {
      const errors = await this.processValuesUpdate(id, values);
      if (errors.length > 0) {
        return { option: undefined, userErrors: errors };
      }
    }

    // 6. Fetch updated option
    const option = await this.repository.option.findById(id);

    this.logger.info({ optionId: id }, "Option updated");

    return { option: option ?? undefined, userErrors: [] };
  }

  private async processValuesUpdate(
    optionId: string,
    values: OptionValuesInput
  ): Promise<UserError[]> {
    // Delete values
    if (values.delete?.length) {
      for (const valueId of values.delete) {
        const result = await this.executeScript(OptionValueDeleteScript, { id: valueId });
        if (result.userErrors.length > 0) {
          return result.userErrors;
        }
      }
    }

    // Update existing values
    if (values.update?.length) {
      for (const valueUpdate of values.update) {
        const result = await this.executeScript(OptionValueUpdateScript, {
          id: valueUpdate.id,
          slug: valueUpdate.slug,
          name: valueUpdate.name,
          swatch: valueUpdate.swatch,
        });
        if (result.userErrors.length > 0) {
          return result.userErrors;
        }
      }
    }

    // Create new values
    if (values.create?.length) {
      const existingValues = await this.repository.option.findValuesByOptionId(optionId);
      let sortIndex = existingValues.length > 0
        ? Math.max(...existingValues.map((v) => v.sortIndex)) + 1
        : 0;

      for (const valueInput of values.create) {
        const result = await this.executeScript(OptionValueCreateScript, {
          optionId,
          slug: valueInput.slug,
          name: valueInput.name,
          sortIndex: sortIndex++,
          swatch: valueInput.swatch,
        });
        if (result.userErrors.length > 0) {
          return result.userErrors;
        }
      }
    }

    return [];
  }

  protected handleError(_error: unknown): OptionUpdateResult {
    return {
      option: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
