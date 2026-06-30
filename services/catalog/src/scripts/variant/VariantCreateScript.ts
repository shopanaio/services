import {
  BaseScript,
  Transactional,
  type UserError,
} from "../../kernel/BaseScript.js";
import type { Variant } from "../../repositories/models/index.js";

export interface SelectedOptionParam {
  readonly optionId: string;
  readonly optionValueId: string;
}

export interface VariantCreateParams {
  readonly productId: string;
  readonly options: readonly SelectedOptionParam[];
  readonly sku?: string | null;
  readonly externalSystem?: string | null;
  readonly externalId?: string | null;
}

export interface VariantCreateResult {
  variant?: Variant;
  userErrors: UserError[];
}

export class VariantCreateScript extends BaseScript<VariantCreateParams, VariantCreateResult> {
  @Transactional()
  protected async execute(params: VariantCreateParams): Promise<VariantCreateResult> {
    const { productId, options, sku, externalSystem, externalId } = params;

    // 1. Check if product exists
    const productExists = await this.repository.product.exists(productId);
    if (!productExists) {
      return {
        variant: undefined,
        userErrors: [
          {
            message: "Product not found",
            field: ["productId"],
            code: "NOT_FOUND",
          },
        ],
      };
    }

    // 2. If sku provided, check uniqueness
    if (sku) {
      const existingVariant = await this.repository.variant.findBySku(sku);
      if (existingVariant) {
        return {
          variant: undefined,
          userErrors: [
            {
              message: `Variant with SKU "${sku}" already exists`,
              field: ["sku"],
              code: "SKU_ALREADY_EXISTS",
            },
          ],
        };
      }
    }

    // 3. Validate options and get option values for handle generation
    const productOptions = await this.repository.option.findByProductId(productId);
    const productOptionIds = new Set(productOptions.map((o) => o.id));

    const optionValuesByOptionId = await this.repository.option.findValuesByOptionIds(
      productOptions.map((o) => o.id)
    );

    const handleParts: string[] = [];

    for (const selectedOption of options) {
      if (!productOptionIds.has(selectedOption.optionId)) {
        return {
          variant: undefined,
          userErrors: [
            {
              message: `Option ${selectedOption.optionId} does not belong to this product`,
              field: ["options", "optionId"],
              code: "INVALID_OPTION",
            },
          ],
        };
      }

      const optionValues = optionValuesByOptionId.get(selectedOption.optionId) ?? [];
      const selectedValue = optionValues.find(
        (v) => v.id === selectedOption.optionValueId
      );

      if (!selectedValue) {
        return {
          variant: undefined,
          userErrors: [
            {
              message: `Option value ${selectedOption.optionValueId} does not belong to option ${selectedOption.optionId}`,
              field: ["options", "optionValueId"],
              code: "INVALID_OPTION_VALUE",
            },
          ],
        };
      }

      handleParts.push(selectedValue.slug);
    }

    // 4. Generate handle from option value slugs
    const handle = handleParts.join("-") || "default";

    // 5. Create variant
    const variant = await this.repository.variant.create(productId, {
      handle,
      sku: sku ?? null,
      externalSystem: externalSystem ?? null,
      externalId: externalId ?? null,
    });

    // 6. Create option links
    for (const selectedOption of options) {
      await this.repository.option.linkVariant(
        variant.id,
        selectedOption.optionId,
        selectedOption.optionValueId
      );
    }

    this.logger.info(
      { variantId: variant.id, productId, handle },
      "Variant created successfully"
    );

    return { variant, userErrors: [] };
  }

  protected handleError(_error: unknown): VariantCreateResult {
    return {
      variant: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
