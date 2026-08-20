import { BaseScript } from "../../kernel/BaseScript.js";
import type { OptionCreateParams, OptionCreateResult, OptionSwatchInput } from "./dto/index.js";
import { normalizeCollectionRuleHandleV1 } from "@shopana/broker-types";

export class OptionCreateScript extends BaseScript<OptionCreateParams, OptionCreateResult> {
  protected async execute(params: OptionCreateParams): Promise<OptionCreateResult> {
    const { productId, slug: rawSlug, name, categoryId, sortIndex } = params;
    let slug: string;
    let values: typeof params.values;
    try {
      slug = normalizeCollectionRuleHandleV1(rawSlug);
      values = params.values.map((value) => ({
        ...value,
        slug: normalizeCollectionRuleHandleV1(value.slug),
      }));
    } catch {
      return {
        option: undefined,
        userErrors: [
          {
            message: "Option or value slug format is invalid",
            field: ["slug"],
            code: "INVALID_SLUG",
          },
        ],
      };
    }

    // 1. Validate: product exists
    const productExists = await this.repository.product.exists(productId);
    if (!productExists) {
      return {
        option: undefined,
        userErrors: [{ message: "Product not found", field: ["productId"], code: "NOT_FOUND" }],
      };
    }
    if (!(await this.repository.optionCategory.findById(categoryId))) {
      return {
        option: undefined,
        userErrors: [
          { message: "Option category not found", field: ["categoryId"], code: "NOT_FOUND" },
        ],
      };
    }

    // 2. Validate: slug is unique
    const existingOption = await this.repository.option.findBySlug(productId, slug);
    if (existingOption) {
      return {
        option: undefined,
        userErrors: [
          {
            message: `Option with slug "${slug}" already exists`,
            field: ["slug"],
            code: "SLUG_ALREADY_EXISTS",
          },
        ],
      };
    }

    // 3. Create option
    const resolvedSortIndex =
      sortIndex ?? (await this.repository.option.getMaxSortIndex(productId)) + 1;
    const option = await this.repository.option.create(productId, {
      slug,
      categoryId,
      sortIndex: resolvedSortIndex,
    });

    // 4. Create option translation
    await this.repository.translation.upsertOptionTranslation({
      storeId: this.getProjectId(),
      optionId: option.id,
      locale: this.getLocale(),
      name,
    });

    // 5. Create values
    for (let i = 0; i < values.length; i++) {
      const valueInput = values[i];

      let swatchId: string | null = null;
      if (valueInput.swatch) {
        swatchId = await this.createSwatch(valueInput.swatch);
      }

      const optionValue = await this.repository.option.createValue(option.id, {
        slug: valueInput.slug,
        sortIndex: valueInput.sortIndex ?? i,
        swatchId,
      });

      await this.repository.translation.upsertOptionValueTranslation({
        storeId: this.getProjectId(),
        optionValueId: optionValue.id,
        locale: this.getLocale(),
        name: valueInput.name,
      });
    }

    this.logger.info(
      { optionId: option.id, productId, valuesCount: values.length },
      "Option created",
    );

    return {
      option,
      userErrors: [],
    };
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

  protected handleError(_error: unknown): OptionCreateResult {
    return {
      option: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
