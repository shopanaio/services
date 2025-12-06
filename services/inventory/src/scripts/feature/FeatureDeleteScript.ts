import { BaseScript } from "../../kernel/BaseScript.js";
import type { FeatureDeleteParams, FeatureDeleteResult } from "./dto/index.js";

export class FeatureDeleteScript extends BaseScript<FeatureDeleteParams, FeatureDeleteResult> {
  protected async execute(params: FeatureDeleteParams): Promise<FeatureDeleteResult> {
    const { id } = params;

    // 1. Check if feature exists
    const existingFeature = await this.repository.feature.findById(id);
    if (!existingFeature) {
      return {
        deletedFeatureId: undefined,
        userErrors: [{ message: "Feature not found", field: ["id"], code: "NOT_FOUND" }],
      };
    }

    // 2. Delete feature (CASCADE will delete values and translations)
    const deleted = await this.repository.feature.delete(id);
    if (!deleted) {
      return {
        deletedFeatureId: undefined,
        userErrors: [{ message: "Failed to delete feature", code: "DELETE_FAILED" }],
      };
    }

    this.logger.info({ featureId: id }, "Feature deleted");

    return { deletedFeatureId: id, userErrors: [] };
  }

  protected handleError(_error: unknown): FeatureDeleteResult {
    return {
      deletedFeatureId: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
