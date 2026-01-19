import { BaseScript } from "../../kernel/BaseScript.js";
import type { FeatureCreateParams, FeatureCreateResult } from "./dto/index.js";

export class FeatureCreateScript extends BaseScript<FeatureCreateParams, FeatureCreateResult> {
  protected async execute(params: FeatureCreateParams): Promise<FeatureCreateResult> {
    const { productId, name, values } = params;

    // 1. Validate: product exists
    const productExists = await this.repository.product.exists(productId);
    if (!productExists) {
      return {
        feature: undefined,
        userErrors: [{ message: "Product not found", field: ["productId"], code: "NOT_FOUND" }],
      };
    }

    // 2. Determine root-level index
    const existingFeatures = await this.repository.feature.findByProductId(productId);
    const maxRootIndex = existingFeatures
      .filter((f) => f.index.length === 1)
      .reduce((max, f) => Math.max(max, f.index[0]), -1);
    const newIndex = [maxRootIndex + 1];

    // 3. Create feature
    const feature = await this.repository.feature.create(productId, {
      isGroup: false,
      parentId: null,
      index: newIndex,
    });

    // 4. Create feature translation
    await this.repository.translation.upsertFeatureTranslation({
      projectId: this.getProjectId(),
      featureId: feature.id,
      locale: this.getLocale(),
      name,
    });

    // 5. Create values
    for (let i = 0; i < values.length; i++) {
      const valueInput = values[i];
      const featureValue = await this.repository.feature.createValue(feature.id, {
        index: i,
      });

      await this.repository.translation.upsertFeatureValueTranslation({
        projectId: this.getProjectId(),
        featureValueId: featureValue.id,
        locale: this.getLocale(),
        name: valueInput.name,
      });
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
