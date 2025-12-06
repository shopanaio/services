import { BaseScript } from "../../kernel/BaseScript.js";
import type { FeatureValueDeleteParams, FeatureValueDeleteResult } from "./dto/index.js";

export class FeatureValueDeleteScript extends BaseScript<
  FeatureValueDeleteParams,
  FeatureValueDeleteResult
> {
  protected async execute(params: FeatureValueDeleteParams): Promise<FeatureValueDeleteResult> {
    const { id } = params;

    // 1. Check value exists
    const existingValue = await this.repository.feature.findValueById(id);
    if (!existingValue) {
      return {
        deletedId: undefined,
        userErrors: [{ message: "Feature value not found", field: ["id"], code: "NOT_FOUND" }],
      };
    }

    // 2. Delete value
    await this.repository.feature.deleteValue(id);

    return { deletedId: id, userErrors: [] };
  }

  protected handleError(_error: unknown): FeatureValueDeleteResult {
    return {
      deletedId: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}

// Re-export types for backwards compatibility
export type { FeatureValueDeleteParams, FeatureValueDeleteResult } from "./dto/index.js";
