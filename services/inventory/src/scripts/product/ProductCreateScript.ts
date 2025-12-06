import { BaseScript } from "../../kernel/BaseScript.js";
import type { ProductCreateParams, ProductCreateResult } from "./dto/index.js";
import { FeatureCreateScript } from "../feature/FeatureCreateScript.js";
import { OptionCreateScript } from "../option/OptionCreateScript.js";

export class ProductCreateScript extends BaseScript<ProductCreateParams, ProductCreateResult> {
  protected async execute(params: ProductCreateParams): Promise<ProductCreateResult> {
    const {
      title,
      description,
      excerpt,
      seoTitle,
      seoDescription,
      features,
      options,
      publish,
    } = params;

    // 1. Create product
    const product = await this.repository.product.create({
      publishedAt: publish ? new Date() : null,
    });

    // 2. Create product translation if title is provided
    if (title) {
      await this.repository.translation.upsertProductTranslation({
        projectId: this.getProjectId(),
        productId: product.id,
        locale: this.getLocale(),
        title,
        descriptionText: description?.text,
        descriptionHtml: description?.html,
        descriptionJson: description?.json,
        excerpt,
        seoTitle,
        seoDescription,
      });
    }

    // 3. Create default variant
    const defaultVariant = await this.repository.variant.create(product.id, {});

    // 4. Create features using FeatureCreateScript
    if (features?.length) {
      for (const featureInput of features) {
        const result = await this.executeScript(FeatureCreateScript, {
          productId: product.id,
          slug: featureInput.slug,
          name: featureInput.name,
          values: featureInput.values,
        });

        if (result.userErrors.length > 0) {
          return { product: undefined, userErrors: result.userErrors };
        }
      }
    }

    // 5. Create options using OptionCreateScript
    if (options?.length) {
      for (const optionInput of options) {
        const result = await this.executeScript(OptionCreateScript, {
          productId: product.id,
          slug: optionInput.slug,
          name: optionInput.name,
          displayType: optionInput.displayType,
          values: optionInput.values,
        });

        if (result.userErrors.length > 0) {
          return { product: undefined, userErrors: result.userErrors };
        }
      }
    }

    this.logger.info(
      {
        productId: product.id,
        featuresCount: features?.length ?? 0,
        optionsCount: options?.length ?? 0,
      },
      "Product created"
    );

    return {
      product: { ...product, _variants: [defaultVariant] },
      userErrors: [],
    };
  }

  protected handleError(_error: unknown): ProductCreateResult {
    return {
      product: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}

// Re-export types for backwards compatibility
export type {
  ProductCreateParams,
  ProductCreateResult,
  DescriptionInput,
  FeatureInput,
  OptionInput,
  ProductWithVariants,
} from "./dto/index.js";
