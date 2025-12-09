import type { TransactionScript } from "../../kernel/types.js";
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
  userErrors: Array<{ message: string; field?: string[]; code?: string }>;
}

export const variantCreate: TransactionScript<
  VariantCreateParams,
  VariantCreateResult
> = async (params, services) => {
  const { logger, repository } = services;

  try {
    const { productId, options, sku, externalSystem, externalId } = params;

    // 1. Check if product exists
    const productExists = await repository.product.exists(productId);
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
      const existingVariant = await repository.variant.findBySku(sku);
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
    const productOptions = await repository.option.findByProductId(productId);
    const productOptionIds = new Set(productOptions.map((o) => o.id));

    // Get all option values for the product
    const optionValuesByOptionId = await repository.option.findValuesByOptionIds(
      productOptions.map((o) => o.id)
    );

    const handleParts: string[] = [];

    for (const selectedOption of options) {
      // Validate option belongs to product
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

      // Validate option value belongs to option
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
    const variant = await repository.variant.create(productId, {
      handle,
      sku: sku ?? null,
      externalSystem: externalSystem ?? null,
      externalId: externalId ?? null,
    });

    // 6. Create option links
    for (const selectedOption of options) {
      await repository.option.linkVariant(
        variant.id,
        selectedOption.optionId,
        selectedOption.optionValueId
      );
    }

    logger.info(
      { variantId: variant.id, productId, handle },
      "Variant created successfully"
    );

    return {
      variant,
      userErrors: [],
    };
  } catch (error) {
    logger.error({ error }, "variantCreate failed");
    return {
      variant: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
};
