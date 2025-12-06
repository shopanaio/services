import type { TransactionScript } from "../../kernel/types.js";
import type { Product, Variant } from "../../repositories/models/index.js";
import { getContext } from "../../context/index.js";

export interface DescriptionInput {
  readonly text: string;
  readonly html: string;
  readonly json: Record<string, unknown>;
}

export interface FeatureValueInput {
  readonly slug: string;
  readonly name: string;
}

export interface FeatureInput {
  readonly slug: string;
  readonly name: string;
  readonly values: FeatureValueInput[];
}

export interface ProductCreateParams {
  readonly title?: string;
  readonly description?: DescriptionInput;
  readonly excerpt?: string;
  readonly seoTitle?: string;
  readonly seoDescription?: string;
  readonly features?: FeatureInput[];
  readonly publish?: boolean;
}

export interface ProductWithVariants extends Product {
  _variants?: Variant[];
}

export interface ProductCreateResult {
  product?: ProductWithVariants;
  userErrors: Array<{ message: string; field?: string[]; code?: string }>;
}

export const productCreate: TransactionScript<
  ProductCreateParams,
  ProductCreateResult
> = async (params, services) => {
  const { logger, repository } = services;

  try {
    const {
      title,
      description,
      excerpt,
      seoTitle,
      seoDescription,
      features,
      publish,
    } = params;

    // 1. Create product
    const product = await repository.product.create({
      publishedAt: publish ? new Date() : null,
    });

    // 2. Create product translation if title is provided
    if (title) {
      const locale = getContext().locale ?? "uk";
      await repository.translation.upsertProductTranslation({
        projectId: getContext().project.id,
        productId: product.id,
        locale,
        title,
        description: description ?? undefined,
        excerpt: excerpt ?? undefined,
        seoTitle: seoTitle ?? undefined,
        seoDescription: seoDescription ?? undefined,
      });
    }

    // 3. Create default variant
    const defaultVariant = await repository.variant.create(product.id, {});

    // 4. Create features if provided
    if (features && features.length > 0) {
      const locale = getContext().locale ?? "uk";
      const projectId = getContext().project.id;

      for (const featureInput of features) {
        // Create feature
        const feature = await repository.feature.create(product.id, {
          slug: featureInput.slug,
        });

        // Create feature translation
        await repository.translation.upsertFeatureTranslation({
          projectId,
          featureId: feature.id,
          locale,
          name: featureInput.name,
        });

        // Create values
        for (let i = 0; i < featureInput.values.length; i++) {
          const valueInput = featureInput.values[i];

          // Create feature value
          const featureValue = await repository.feature.createValue(
            feature.id,
            {
              slug: valueInput.slug,
              sortIndex: i,
            }
          );

          // Create feature value translation
          await repository.translation.upsertFeatureValueTranslation({
            projectId,
            featureValueId: featureValue.id,
            locale,
            name: valueInput.name,
          });
        }
      }
    }

    logger.info(
      { productId: product.id, featuresCount: features?.length ?? 0 },
      "Product created successfully"
    );

    // Return product with _variants for resolver
    const productWithVariants: ProductWithVariants = {
      ...product,
      _variants: [defaultVariant],
    };

    return {
      product: productWithVariants,
      userErrors: [],
    };
  } catch (error) {
    logger.error({ error }, "productCreate failed");
    return {
      product: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
};
