import type { TransactionScript } from "../../kernel/types.js";
import type { ProductOption } from "../../repositories/models/index.js";
import { getContext } from "../../context/index.js";

export interface ProductOptionSwatchInput {
  readonly swatchType: string;
  readonly colorOne?: string;
  readonly colorTwo?: string;
  readonly fileId?: string;
  readonly metadata?: unknown;
}

export interface ProductOptionValueInput {
  readonly slug: string;
  readonly name: string;
  readonly swatch?: ProductOptionSwatchInput;
}

export interface ProductOptionCreateParams {
  readonly productId: string;
  readonly slug: string;
  readonly name: string;
  readonly displayType: string;
  readonly values: ProductOptionValueInput[];
}

export interface ProductOptionCreateResult {
  option?: ProductOption;
  userErrors: Array<{ message: string; field?: string[]; code?: string }>;
}

export const productOptionCreate: TransactionScript<
  ProductOptionCreateParams,
  ProductOptionCreateResult
> = async (params, services) => {
  const { logger, repository } = services;

  try {
    const { productId, slug, name, displayType, values } = params;

    // 1. Check if product exists
    const productExists = await repository.product.exists(productId);
    if (!productExists) {
      return {
        option: undefined,
        userErrors: [
          {
            message: "Product not found",
            field: ["productId"],
            code: "NOT_FOUND",
          },
        ],
      };
    }

    // 2. Check if slug is unique for this product
    const existingOption = await repository.option.findBySlug(productId, slug);
    if (existingOption) {
      return {
        option: undefined,
        userErrors: [
          {
            message: `Option with slug "${slug}" already exists for this product`,
            field: ["slug"],
            code: "SLUG_ALREADY_EXISTS",
          },
        ],
      };
    }

    // 3. Create option
    const option = await repository.option.create(productId, {
      slug,
      displayType,
    });

    // 4. Create option translation
    const locale = getContext().locale ?? "uk";
    await repository.translation.upsertOptionTranslation({
      projectId: getContext().project.id,
      optionId: option.id,
      locale,
      name,
    });

    // 5. Create values
    for (let i = 0; i < values.length; i++) {
      const valueInput = values[i];
      let swatchId: string | null = null;

      // Create swatch if provided
      if (valueInput.swatch) {
        const swatch = await repository.option.createSwatch({
          swatchType: valueInput.swatch.swatchType,
          colorOne: valueInput.swatch.colorOne ?? null,
          colorTwo: valueInput.swatch.colorTwo ?? null,
          imageId: valueInput.swatch.fileId ?? null,
          metadata: valueInput.swatch.metadata ?? null,
        });
        swatchId = swatch.id;
      }

      // Create option value
      const optionValue = await repository.option.createValue(option.id, {
        slug: valueInput.slug,
        sortIndex: i,
        swatchId,
      });

      // Create option value translation
      await repository.translation.upsertOptionValueTranslation({
        projectId: getContext().project.id,
        optionValueId: optionValue.id,
        locale,
        name: valueInput.name,
      });
    }

    logger.info(
      { optionId: option.id, productId, valuesCount: values.length },
      "Product option created successfully"
    );

    return {
      option,
      userErrors: [],
    };
  } catch (error) {
    logger.error({ error }, "productOptionCreate failed");
    return {
      option: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
};
