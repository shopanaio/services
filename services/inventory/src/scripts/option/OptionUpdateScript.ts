import { BaseScript, type UserError } from "../../kernel/BaseScript.js";
import type { OptionUpdateParams, OptionUpdateResult, OptionValuesInput, OptionSwatchInput } from "./dto/index.js";

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
        const existingValue = await this.repository.option.findValueById(valueId);
        if (!existingValue) {
          return [{ message: "Option value not found", field: ["values", "delete"], code: "NOT_FOUND" }];
        }
        await this.repository.option.deleteValue(valueId);
      }
    }

    // Update existing values
    if (values.update?.length) {
      for (const valueUpdate of values.update) {
        const existingValue = await this.repository.option.findValueById(valueUpdate.id);
        if (!existingValue) {
          return [{ message: "Option value not found", field: ["values", "update"], code: "NOT_FOUND" }];
        }

        const updateData: { slug?: string; swatchId?: string | null } = {};

        if (valueUpdate.slug !== undefined) {
          updateData.slug = valueUpdate.slug;
        }

        if (valueUpdate.swatch !== undefined) {
          if (valueUpdate.swatch === null) {
            updateData.swatchId = null;
          } else {
            const swatchId = await this.createSwatch(valueUpdate.swatch);
            updateData.swatchId = swatchId;
          }
        }

        if (Object.keys(updateData).length > 0) {
          await this.repository.option.updateValue(valueUpdate.id, updateData);
        }

        if (valueUpdate.name !== undefined) {
          await this.repository.translation.upsertOptionValueTranslation({
            projectId: this.getProjectId(),
            optionValueId: valueUpdate.id,
            locale: this.getLocale(),
            name: valueUpdate.name,
          });
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
        let swatchId: string | null = null;
        if (valueInput.swatch) {
          swatchId = await this.createSwatch(valueInput.swatch);
        }

        const optionValue = await this.repository.option.createValue(optionId, {
          slug: valueInput.slug,
          sortIndex: sortIndex++,
          swatchId,
        });

        await this.repository.translation.upsertOptionValueTranslation({
          projectId: this.getProjectId(),
          optionValueId: optionValue.id,
          locale: this.getLocale(),
          name: valueInput.name,
        });
      }
    }

    return [];
  }

  private async createSwatch(swatch: OptionSwatchInput): Promise<string> {
    const created = await this.repository.option.createSwatch({
      swatchType: swatch.swatchType,
      colorOne: swatch.colorOne ?? null,
      colorTwo: swatch.colorTwo ?? null,
      imageId: swatch.fileId ?? null,
      metadata: swatch.metadata ?? null,
    });
    return created.id;
  }

  protected handleError(_error: unknown): OptionUpdateResult {
    return {
      option: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
