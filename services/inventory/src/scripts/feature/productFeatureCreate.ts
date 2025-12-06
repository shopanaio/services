import type { TransactionScript } from "../../kernel/types.js";
import type { ProductFeature } from "../../repositories/models/index.js";
import { getContext } from "../../context/index.js";

export interface ProductFeatureValueInput {
  readonly slug: string;
  readonly name: string;
}

export interface ProductFeatureCreateParams {
  readonly productId: string;
  readonly slug: string;
  readonly name: string;
  readonly values: ProductFeatureValueInput[];
}

export interface ProductFeatureCreateResult {
  feature?: ProductFeature;
  userErrors: Array<{ message: string; field?: string[]; code?: string }>;
}

export const productFeatureCreate: TransactionScript<
  ProductFeatureCreateParams,
  ProductFeatureCreateResult
> = async (params, services) => {
  const { logger, repository } = services;

  try {
    const { productId, slug, name, values } = params;

    // 1. Check if product exists
    const productExists = await repository.product.exists(productId);
    if (!productExists) {
      return {
        feature: undefined,
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
    const existingFeature = await repository.feature.findBySlug(productId, slug);
    if (existingFeature) {
      return {
        feature: undefined,
        userErrors: [
          {
            message: `Feature with slug "${slug}" already exists for this product`,
            field: ["slug"],
            code: "SLUG_ALREADY_EXISTS",
          },
        ],
      };
    }

    // 3. Create feature
    const feature = await repository.feature.create(productId, { slug });

    // 4. Create feature translation
    const locale = getContext().locale ?? "uk";
    await repository.translation.upsertFeatureTranslation({
      projectId: getContext().project.id,
      featureId: feature.id,
      locale,
      name,
    });

    // 5. Create values
    for (let i = 0; i < values.length; i++) {
      const valueInput = values[i];

      // Create feature value
      const featureValue = await repository.feature.createValue(feature.id, {
        slug: valueInput.slug,
        sortIndex: i,
      });

      // Create feature value translation
      await repository.translation.upsertFeatureValueTranslation({
        projectId: getContext().project.id,
        featureValueId: featureValue.id,
        locale,
        name: valueInput.name,
      });
    }

    logger.info(
      { featureId: feature.id, productId, valuesCount: values.length },
      "Product feature created successfully"
    );

    return {
      feature,
      userErrors: [],
    };
  } catch (error) {
    logger.error({ error }, "productFeatureCreate failed");
    return {
      feature: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
};
