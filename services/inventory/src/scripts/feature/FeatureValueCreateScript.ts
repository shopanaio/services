import { BaseScript } from "../../kernel/BaseScript.js";
import type { FeatureValueCreateParams, FeatureValueCreateResult } from "./dto/index.js";

export class FeatureValueCreateScript extends BaseScript<
  FeatureValueCreateParams,
  FeatureValueCreateResult
> {
  protected async execute(params: FeatureValueCreateParams): Promise<FeatureValueCreateResult> {
    const { featureId, slug, name, sortIndex } = params;

    // 1. Check feature exists
    const feature = await this.repository.feature.findById(featureId);
    if (!feature) {
      return {
        featureValue: undefined,
        userErrors: [{ message: "Feature not found", field: ["featureId"], code: "NOT_FOUND" }],
      };
    }

    // 2. Calculate sortIndex if not provided
    let finalSortIndex = sortIndex;
    if (finalSortIndex === undefined) {
      const existingValues = await this.repository.feature.findValuesByFeatureId(featureId);
      finalSortIndex = existingValues.length > 0
        ? Math.max(...existingValues.map((v) => v.sortIndex)) + 1
        : 0;
    }

    // 3. Create feature value
    const featureValue = await this.repository.feature.createValue(featureId, {
      slug,
      sortIndex: finalSortIndex,
    });

    // 4. Create translation
    await this.repository.translation.upsertFeatureValueTranslation({
      projectId: this.getProjectId(),
      featureValueId: featureValue.id,
      locale: this.getLocale(),
      name,
    });

    return { featureValue, userErrors: [] };
  }

  protected handleError(_error: unknown): FeatureValueCreateResult {
    return {
      featureValue: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}

// Re-export types for backwards compatibility
export type { FeatureValueCreateParams, FeatureValueCreateResult } from "./dto/index.js";
