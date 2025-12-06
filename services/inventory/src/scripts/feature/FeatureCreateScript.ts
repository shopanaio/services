import { BaseScript } from "../../kernel/BaseScript.js";
import type { FeatureCreateParams, FeatureCreateResult } from "./dto/index.js";
import { FeatureValueCreateScript } from "./FeatureValueCreateScript.js";

export class FeatureCreateScript extends BaseScript<FeatureCreateParams, FeatureCreateResult> {
  protected async execute(params: FeatureCreateParams): Promise<FeatureCreateResult> {
    const { productId, slug, name, values } = params;

    // 1. Validate: product exists
    const productExists = await this.repository.product.exists(productId);
    if (!productExists) {
      return {
        feature: undefined,
        userErrors: [{ message: "Product not found", field: ["productId"], code: "NOT_FOUND" }],
      };
    }

    // 2. Validate: slug is unique
    const existingFeature = await this.repository.feature.findBySlug(productId, slug);
    if (existingFeature) {
      return {
        feature: undefined,
        userErrors: [{
          message: `Feature with slug "${slug}" already exists`,
          field: ["slug"],
          code: "SLUG_ALREADY_EXISTS",
        }],
      };
    }

    // 3. Create feature
    const feature = await this.repository.feature.create(productId, { slug });

    // 4. Create feature translation
    await this.repository.translation.upsertFeatureTranslation({
      projectId: this.getProjectId(),
      featureId: feature.id,
      locale: this.getLocale(),
      name,
    });

    // 5. Create values using FeatureValueCreateScript
    for (let i = 0; i < values.length; i++) {
      const valueInput = values[i];
      const result = await this.executeScript(FeatureValueCreateScript, {
        featureId: feature.id,
        slug: valueInput.slug,
        name: valueInput.name,
        sortIndex: i,
      });

      if (result.userErrors.length > 0) {
        return { feature: undefined, userErrors: result.userErrors };
      }
    }

    this.logger.info(
      { featureId: feature.id, productId, valuesCount: values.length },
      "Feature created"
    );

    return { feature, userErrors: [] };
  }

  protected handleError(_error: unknown): FeatureCreateResult {
    return {
      feature: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
