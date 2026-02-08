import { BaseScript } from "../../kernel/BaseScript.js";
import type { FeatureCreateParams, FeatureCreateResult } from "./dto/index.js";
import { isValidSlug } from "../shared/slug.js";

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

    if (!isValidSlug(slug)) {
      return {
        feature: undefined,
        userErrors: [{ message: "Feature slug format is invalid", field: ["slug"], code: "INVALID_SLUG" }],
      };
    }

    const existingWithSlug = await this.repository.feature.findBySlug(productId, slug);
    if (existingWithSlug) {
      return {
        feature: undefined,
        userErrors: [{ message: `Feature with slug "${slug}" already exists`, field: ["slug"], code: "DUPLICATE" }],
      };
    }

    const valueSlugs = new Set<string>();
    for (let i = 0; i < values.length; i++) {
      const valueSlug = values[i].slug;
      if (!isValidSlug(valueSlug)) {
        return {
          feature: undefined,
          userErrors: [
            {
              message: "Feature value slug format is invalid",
              field: ["values", String(i), "slug"],
              code: "INVALID_SLUG",
            },
          ],
        };
      }
      if (valueSlugs.has(valueSlug)) {
        return {
          feature: undefined,
          userErrors: [
            {
              message: `Feature value slug "${valueSlug}" is duplicated`,
              field: ["values", String(i), "slug"],
              code: "DUPLICATE",
            },
          ],
        };
      }
      valueSlugs.add(valueSlug);
    }

    // 2. Determine root-level index
    const existingFeatures = await this.repository.feature.findByProductId(productId);
    const maxRootIndex = existingFeatures
      .filter((f) => f.index.length === 1)
      .reduce((max, f) => Math.max(max, f.index[0]), -1);
    const newIndex = [maxRootIndex + 1];

    // 3. Create feature
    const feature = await this.repository.feature.create(productId, {
      slug,
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
        slug: valueInput.slug,
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
