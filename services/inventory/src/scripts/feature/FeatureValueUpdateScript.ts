import { BaseScript } from "../../kernel/BaseScript.js";
import type { FeatureValueUpdateParams, FeatureValueUpdateResult } from "./dto/index.js";

export class FeatureValueUpdateScript extends BaseScript<
  FeatureValueUpdateParams,
  FeatureValueUpdateResult
> {
  protected async execute(params: FeatureValueUpdateParams): Promise<FeatureValueUpdateResult> {
    const { id, slug, name } = params;

    // 1. Check value exists
    const existingValue = await this.repository.feature.findValueById(id);
    if (!existingValue) {
      return {
        featureValue: undefined,
        userErrors: [{ message: "Feature value not found", field: ["id"], code: "NOT_FOUND" }],
      };
    }

    // 2. Update slug if provided
    if (slug !== undefined) {
      await this.repository.feature.updateValue(id, { slug });
    }

    // 3. Update translation if name provided
    if (name !== undefined) {
      await this.repository.translation.upsertFeatureValueTranslation({
        projectId: this.getProjectId(),
        featureValueId: id,
        locale: this.getLocale(),
        name,
      });
    }

    // 4. Fetch updated value
    const featureValue = await this.repository.feature.findValueById(id);

    return { featureValue: featureValue ?? undefined, userErrors: [] };
  }

  protected handleError(_error: unknown): FeatureValueUpdateResult {
    return {
      featureValue: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
